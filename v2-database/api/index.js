// Cloudflare Workers API
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }
    
    try {
      // Auth: GitHub OAuth
      if (path === '/api/auth/github') {
        return handleGitHubAuth(request);
      }
      
      // Prompts CRUD
      if (path === '/api/prompts') {
        if (request.method === 'GET') {
          return getPrompts(env.DB, headers);
        }
        if (request.method === 'POST') {
          return createPrompt(env.DB, request, headers);
        }
      }
      
      if (path.startsWith('/api/prompts/')) {
        const id = path.split('/')[3];
        if (request.method === 'PUT') {
          return updatePrompt(env.DB, id, request, headers);
        }
        if (request.method === 'DELETE') {
          return deletePrompt(env.DB, id, headers);
        }
      }
      
      // Categories & Tags
      if (path === '/api/categories') {
        return getCategories(env.DB, headers);
      }
      
      if (path === '/api/tags') {
        return getTags(env.DB, headers);
      }
      
      return new Response(JSON.stringify({ error: 'Not found' }), { 
        status: 404, 
        headers 
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }
};

// Database schema initialization
export async function initializeDatabase(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      github_id TEXT UNIQUE,
      username TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      tags TEXT, -- JSON array
      notes TEXT,
      version TEXT,
      is_featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS prompt_versions (
      id TEXT PRIMARY KEY,
      prompt_id TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_prompts_user ON prompts(user_id);
    CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
  `);
}

// Handler functions
async function handleGitHubAuth(request) {
  // GitHub OAuth implementation
  return new Response(JSON.stringify({ message: 'GitHub auth' }));
}

async function getPrompts(db, headers) {
  const { results } = await db.prepare(
    'SELECT * FROM prompts ORDER BY updated_at DESC'
  ).all();
  return new Response(JSON.stringify(results), { headers });
}

async function createPrompt(db, request, headers) {
  const body = await request.json();
  const id = crypto.randomUUID();
  
  await db.prepare(`
    INSERT INTO prompts (id, title, content, category, tags, notes, version)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, 
    body.title, 
    body.content, 
    body.category,
    JSON.stringify(body.tags || []),
    body.notes,
    body.version
  ).run();
  
  return new Response(JSON.stringify({ id, ...body }), { headers });
}

async function updatePrompt(db, id, request, headers) {
  const body = await request.json();
  
  await db.prepare(`
    UPDATE prompts 
    SET title = ?, content = ?, category = ?, tags = ?, notes = ?, version = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    body.title,
    body.content,
    body.category,
    JSON.stringify(body.tags || []),
    body.notes,
    body.version,
    id
  ).run();
  
  return new Response(JSON.stringify({ id, ...body }), { headers });
}

async function deletePrompt(db, id, headers) {
  await db.prepare('DELETE FROM prompts WHERE id = ?').bind(id).run();
  return new Response(JSON.stringify({ success: true }), { headers });
}

async function getCategories(db, headers) {
  const { results } = await db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  return new Response(JSON.stringify(results), { headers });
}

async function getTags(db, headers) {
  // Get unique tags from all prompts
  const { results } = await db.prepare('SELECT tags FROM prompts').all();
  const allTags = new Set();
  results.forEach(r => {
    try {
      const tags = JSON.parse(r.tags || '[]');
      tags.forEach(t => allTags.add(t));
    } catch (e) {}
  });
  return new Response(JSON.stringify([...allTags]), { headers });
}
