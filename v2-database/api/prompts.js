// Prompts CRUD Operations

// Get all prompts for user
export async function getPrompts(db, userId) {
    const { results } = await db.prepare(`
        SELECT 
            p.*,
            GROUP_CONCAT(t.name) as tag_names,
            GROUP_CONCAT(t.color) as tag_colors
        FROM prompts p
        LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.user_id = ? AND p.is_archived = 0
        GROUP BY p.id
        ORDER BY p.is_featured DESC, p.updated_at DESC
    `).bind(userId).all();
    
    return results.map(row => ({
        ...row,
        tags: row.tag_names ? row.tag_names.split(',') : [],
        tag_colors: row.tag_colors ? row.tag_colors.split(',') : []
    }));
}

// Get single prompt
export async function getPrompt(db, promptId, userId) {
    const prompt = await db.prepare(`
        SELECT p.*, 
               GROUP_CONCAT(t.name) as tag_names,
               GROUP_CONCAT(t.id) as tag_ids
        FROM prompts p
        LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.id = ? AND p.user_id = ?
        GROUP BY p.id
    `).bind(promptId, userId).first();
    
    if (!prompt) return null;
    
    // Increment view count
    await db.prepare(
        'UPDATE prompts SET view_count = view_count + 1 WHERE id = ?'
    ).bind(promptId).run();
    
    return {
        ...prompt,
        tags: prompt.tag_names ? prompt.tag_names.split(',') : [],
        tag_ids: prompt.tag_ids ? prompt.tag_ids.split(',') : []
    };
}

// Create prompt
export async function createPrompt(db, userId, data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // Insert prompt
    await db.prepare(`
        INSERT INTO prompts (id, user_id, title, content, category_id, notes, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        id,
        userId,
        data.title,
        data.content,
        data.category_id || 'other',
        data.notes || '',
        data.version || '',
        now,
        now
    ).run();
    
    // Handle tags
    if (data.tags && data.tags.length > 0) {
        await addTagsToPrompt(db, id, userId, data.tags);
    }
    
    // Save initial version
    await savePromptVersion(db, id, data.content, 1);
    
    return { id, ...data, created_at: now, updated_at: now };
}

// Update prompt
export async function updatePrompt(db, promptId, userId, data) {
    const prompt = await getPrompt(db, promptId, userId);
    if (!prompt) throw new Error('Prompt not found');
    
    const now = new Date().toISOString();
    
    // Check if content changed
    const contentChanged = prompt.content !== data.content;
    
    // Update prompt
    await db.prepare(`
        UPDATE prompts 
        SET title = ?, content = ?, category_id = ?, notes = ?, version = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
    `).bind(
        data.title,
        data.content,
        data.category_id || prompt.category_id,
        data.notes || prompt.notes,
        data.version || prompt.version,
        now,
        promptId,
        userId
    ).run();
    
    // Update tags
    await db.prepare('DELETE FROM prompt_tags WHERE prompt_id = ?').bind(promptId).run();
    if (data.tags && data.tags.length > 0) {
        await addTagsToPrompt(db, promptId, userId, data.tags);
    }
    
    // Save new version if content changed
    if (contentChanged) {
        const versionCount = await db.prepare(
            'SELECT COUNT(*) as count FROM prompt_versions WHERE prompt_id = ?'
        ).bind(promptId).first();
        
        await savePromptVersion(db, promptId, data.content, versionCount.count + 1);
    }
    
    return { id: promptId, ...data, updated_at: now };
}

// Delete prompt (soft delete)
export async function deletePrompt(db, promptId, userId) {
    await db.prepare(`
        UPDATE prompts SET is_archived = 1, updated_at = ?
        WHERE id = ? AND user_id = ?
    `).bind(new Date().toISOString(), promptId, userId).run();
    
    return { success: true };
}

// Toggle featured status
export async function toggleFeatured(db, promptId, userId) {
    const prompt = await db.prepare(
        'SELECT is_featured FROM prompts WHERE id = ? AND user_id = ?'
    ).bind(promptId, userId).first();
    
    if (!prompt) throw new Error('Prompt not found');
    
    const newStatus = prompt.is_featured ? 0 : 1;
    
    await db.prepare(`
        UPDATE prompts SET is_featured = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
    `).bind(newStatus, new Date().toISOString(), promptId, userId).run();
    
    return { is_featured: newStatus };
}

// Helper: Add tags to prompt
async function addTagsToPrompt(db, promptId, userId, tagNames) {
    for (const tagName of tagNames) {
        // Find or create tag
        let tag = await db.prepare(
            'SELECT id FROM tags WHERE user_id = ? AND name = ?'
        ).bind(userId, tagName).first();
        
        if (!tag) {
            const tagId = crypto.randomUUID();
            await db.prepare(
                'INSERT INTO tags (id, user_id, name) VALUES (?, ?, ?)'
            ).bind(tagId, userId, tagName).run();
            tag = { id: tagId };
        }
        
        // Link tag to prompt
        await db.prepare(
            'INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)'
        ).bind(promptId, tag.id).run();
    }
}

// Helper: Save prompt version
async function savePromptVersion(db, promptId, content, versionNumber) {
    const id = crypto.randomUUID();
    await db.prepare(`
        INSERT INTO prompt_versions (id, prompt_id, content, version_number, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).bind(id, promptId, content, versionNumber, new Date().toISOString()).run();
    
    // Keep only last 10 versions
    await db.prepare(`
        DELETE FROM prompt_versions 
        WHERE prompt_id = ? 
        AND id NOT IN (
            SELECT id FROM prompt_versions 
            WHERE prompt_id = ? 
            ORDER BY version_number DESC 
            LIMIT 10
        )
    `).bind(promptId, promptId).run();
}

// Get prompt versions
export async function getPromptVersions(db, promptId, userId) {
    // Verify ownership
    const prompt = await db.prepare(
        'SELECT id FROM prompts WHERE id = ? AND user_id = ?'
    ).bind(promptId, userId).first();
    
    if (!prompt) throw new Error('Prompt not found');
    
    const { results } = await db.prepare(`
        SELECT id, version_number, content, created_at
        FROM prompt_versions
        WHERE prompt_id = ?
        ORDER BY version_number DESC
    `).bind(promptId).all();
    
    return results;
}

// Restore version
export async function restoreVersion(db, promptId, versionId, userId) {
    const version = await db.prepare(`
        SELECT v.* FROM prompt_versions v
        JOIN prompts p ON v.prompt_id = p.id
        WHERE v.id = ? AND p.id = ? AND p.user_id = ?
    `).bind(versionId, promptId, userId).first();
    
    if (!version) throw new Error('Version not found');
    
    // Update prompt with version content
    await db.prepare(`
        UPDATE prompts SET content = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
    `).bind(version.content, new Date().toISOString(), promptId, userId).run();
    
    return { success: true };
}
