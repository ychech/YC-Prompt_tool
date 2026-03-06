// YC Prompt Tool v2 - Database Version
// Vue 3 style vanilla JS implementation with real API integration

// Import components
import { Editor } from './components/Editor.js';
import { VersionHistory } from './components/VersionHistory.js';

const API_BASE = '/api';

// State
const state = {
    user: null,
    prompts: [],
    categories: [
        { id: 'all', name: '全部', icon: 'fa-th-large' },
        { id: 'writing', name: '写作', icon: 'fa-pen-nib' },
        { id: 'coding', name: '编程', icon: 'fa-code' },
        { id: 'analysis', name: '分析', icon: 'fa-chart-pie' },
        { id: 'creative', name: '创意', icon: 'fa-lightbulb' },
        { id: 'translation', name: '翻译', icon: 'fa-language' },
        { id: 'other', name: '其他', icon: 'fa-ellipsis-h' }
    ],
    tags: [],
    currentCategory: 'all',
    currentTag: null,
    searchQuery: '',
    isDarkMode: false,
    isLoading: false,
    isVersionPanelOpen: false,
    currentEditingPrompt: null,
    currentPromptVersions: [],
    toasts: [],
    editorInstance: null,
    versionHistoryInstance: null
};

// DOM Elements
let appEl;

// ============ API Interceptors ============

/**
 * Get auth headers with token from localStorage
 */
function getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

/**
 * Generic API request with auth, loading state, and error handling
 */
async function apiRequest(url, options = {}) {
    // Show loading spinner
    setLoading(true);
    
    try {
        const headers = getAuthHeaders();
        
        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        });
        
        // Handle auth errors
        if (response.status === 401) {
            localStorage.removeItem('auth_token');
            state.user = null;
            renderLogin();
            throw new Error('登录已过期，请重新登录');
        }
        
        // Handle other errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `请求失败: ${response.status}`);
        }
        
        // Parse JSON response
        const data = await response.json();
        return data;
        
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    } finally {
        // Hide loading spinner
        setLoading(false);
    }
}

/**
 * Set loading state
 */
function setLoading(isLoading) {
    state.isLoading = isLoading;
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = isLoading ? 'flex' : 'none';
    }
}

// ============ API Functions ============

/**
 * GET /api/prompts - List all prompts
 */
async function fetchPrompts() {
    return apiRequest(`${API_BASE}/prompts`);
}

/**
 * POST /api/prompts - Create new prompt
 */
async function createPrompt(promptData) {
    return apiRequest(`${API_BASE}/prompts`, {
        method: 'POST',
        body: JSON.stringify(promptData)
    });
}

/**
 * PUT /api/prompts/:id - Update prompt
 */
async function updatePrompt(id, promptData) {
    return apiRequest(`${API_BASE}/prompts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(promptData)
    });
}

/**
 * DELETE /api/prompts/:id - Delete prompt
 */
async function deletePrompt(id) {
    return apiRequest(`${API_BASE}/prompts/${id}`, {
        method: 'DELETE'
    });
}

/**
 * GET /api/categories - List categories
 */
async function fetchCategories() {
    return apiRequest(`${API_BASE}/categories`);
}

/**
 * GET /api/tags - List tags
 */
async function fetchTags() {
    return apiRequest(`${API_BASE}/tags`);
}

/**
 * GET /api/prompts/:id/versions - Get prompt versions
 */
async function fetchPromptVersions(promptId) {
    return apiRequest(`${API_BASE}/prompts/${promptId}/versions`);
}

/**
 * POST /api/prompts/:id/versions/:versionId/restore - Restore version
 */
async function restorePromptVersion(promptId, versionId) {
    return apiRequest(`${API_BASE}/prompts/${promptId}/versions/${versionId}/restore`, {
        method: 'POST'
    });
}

/**
 * POST /api/prompts/:id/toggle-featured - Toggle featured status
 */
async function togglePromptFeatured(id) {
    return apiRequest(`${API_BASE}/prompts/${id}/toggle-featured`, {
        method: 'POST'
    });
}

// ============ Initialize ============

function init() {
    appEl = document.getElementById('app');
    
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('dark_mode');
    if (savedDarkMode !== null) {
        state.isDarkMode = savedDarkMode === 'true';
    } else {
        // Check system preference
        state.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Check auth
    const token = localStorage.getItem('auth_token');
    if (token) {
        loadUser();
    } else {
        renderLogin();
    }
}

// ============ Render Functions ============

// Render Login Page
function renderLogin() {
    appEl.innerHTML = `
        <div class="login-page" data-theme="${state.isDarkMode ? 'dark' : ''}">
            <div class="login-box">
                <h1><i class="fas fa-feather-alt" style="color: var(--accent);"></i> YC 提示词工具</h1>
                <p>v2.0 数据库版 - 支持所有浏览器</p>
                <div style="margin: 24px 0; padding: 16px; background: var(--bg); border-radius: 8px; text-align: left;">
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
                        <strong style="color: var(--text);">特性：</strong>
                    </div>
                    <ul style="font-size: 0.8rem; color: var(--text-secondary); padding-left: 18px; margin: 0;">
                        <li>✅ 支持 Safari、Firefox、Chrome、Edge</li>
                        <li>✅ 数据云端同步，多设备互通</li>
                        <li>✅ 实时自动保存</li>
                        <li>✅ 版本历史管理</li>
                        <li>✅ 团队协作（即将推出）</li>
                    </ul>
                </div>
                <button class="github-login" onclick="loginWithGitHub()">
                    <i class="fab fa-github"></i>
                    使用 GitHub 登录
                </button>
                <div style="margin-top: 16px; font-size: 0.8rem; color: var(--text-muted);">
                    轻版用户？<a href="../index.html" style="color: var(--accent);">返回 v1 版本</a>
                </div>
            </div>
        </div>
        ${renderLoadingSpinner()}
        ${renderToastContainer()}
    `;
}

// Render Loading Spinner
function renderLoadingSpinner() {
    return `
        <div id="loadingSpinner" class="loading-spinner" style="display: none;">
            <div class="spinner-overlay">
                <div class="spinner"></div>
                <span>加载中...</span>
            </div>
        </div>
    `;
}

// Render Toast Container
function renderToastContainer() {
    return `<div class="toast-container" id="toastContainer"></div>`;
}

// Render Main App
function renderApp() {
    const filteredPrompts = filterPrompts();
    
    appEl.innerHTML = `
        <div class="app-container" data-theme="${state.isDarkMode ? 'dark' : ''}">
            <header class="header" data-theme="${state.isDarkMode ? 'dark' : ''}">
                <div class="logo">
                    <i class="fas fa-feather-alt"></i> YC提示词工具 v2
                </div>
                <div class="header-actions">
                    <button class="btn btn-ghost" onclick="toggleDarkMode()" title="切换主题">
                        <i class="fas ${state.isDarkMode ? 'fa-sun' : 'fa-moon'}"></i>
                    </button>
                    <button class="btn btn-primary" onclick="showAddModal()">
                        <i class="fas fa-plus"></i> 新建
                    </button>
                    <div class="user-info">
                        <img src="${state.user?.avatar || 'https://github.com/github.png'}" class="user-avatar" alt="avatar">
                        <span>${state.user?.username || 'User'}</span>
                        <button class="btn btn-ghost" onclick="logout()" style="padding: 4px 8px;" title="退出登录">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </div>
            </header>
            
            <div class="main-layout ${state.isVersionPanelOpen ? 'has-version-panel' : ''}">
                <aside class="sidebar">
                    <div class="sidebar-section">
                        <div class="sidebar-title">分类</div>
                        <ul class="category-list">
                            ${state.categories.map(cat => `
                                <li class="category-item ${state.currentCategory === cat.id ? 'active' : ''}" 
                                    onclick="setCategory('${cat.id}')">
                                    <span><i class="fas ${cat.icon}"></i> ${cat.name}</span>
                                    ${cat.id !== 'all' ? `<span class="category-count">${getCategoryCount(cat.id)}</span>` : ''}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <div class="sidebar-section">
                        <div class="sidebar-title">标签</div>
                        <div class="tag-cloud">
                            ${state.tags.map(tag => `
                                <span class="tag-chip ${state.currentTag === tag ? 'active' : ''}"
                                      onclick="setTag('${escapeHtml(tag)}')">
                                    ${escapeHtml(tag)}
                                </span>
                            `).join('')}
                        </div>
                        ${state.tags.length === 0 ? '<p class="empty-tags">暂无标签</p>' : ''}
                    </div>
                </aside>
                
                <main class="content-area">
                    <div class="toolbar">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="搜索提示词..." 
                                   value="${escapeHtml(state.searchQuery)}" 
                                   oninput="setSearch(this.value)">
                        </div>
                        <div class="toolbar-info">
                            共 <strong>${filteredPrompts.length}</strong> 个提示词
                        </div>
                    </div>
                    
                    ${filteredPrompts.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>暂无提示词</p>
                            <button class="btn btn-primary" onclick="showAddModal()">
                                <i class="fas fa-plus"></i> 创建第一个提示词
                            </button>
                        </div>
                    ` : `
                        <div class="prompt-grid">
                            ${filteredPrompts.map(prompt => renderPromptCard(prompt)).join('')}
                        </div>
                    `}
                </main>
                
                ${state.isVersionPanelOpen ? renderVersionPanel() : ''}
            </div>
        </div>
        
        ${renderEditorModal()}
        ${renderLoadingSpinner()}
        ${renderToastContainer()}
    `;
    
    // Initialize version history panel if open
    if (state.isVersionPanelOpen && state.currentEditingPrompt) {
        initVersionHistory();
    }
}

// Render Prompt Card
function renderPromptCard(prompt) {
    const tagsHtml = prompt.tags?.map(tag => 
        `<span class="card-tag">${escapeHtml(tag)}</span>`
    ).join('') || '';
    
    return `
        <div class="prompt-card" data-id="${prompt.id}">
            <div class="prompt-card-header">
                <h3 class="prompt-title" onclick="editPrompt('${prompt.id}')">
                    ${escapeHtml(prompt.title)}
                </h3>
                <div class="prompt-actions">
                    <button class="btn-icon btn-star ${prompt.is_featured ? 'active' : ''}" 
                            onclick="toggleFeatured('${prompt.id}', event)"
                            title="${prompt.is_featured ? '取消收藏' : '收藏'}">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="btn-icon" onclick="showVersionHistory('${prompt.id}', event)" title="版本历史">
                        <i class="fas fa-history"></i>
                    </button>
                </div>
            </div>
            <div class="prompt-content" onclick="editPrompt('${prompt.id}')">
                ${escapeHtml(prompt.content.substring(0, 150))}${prompt.content.length > 150 ? '...' : ''}
            </div>
            <div class="prompt-card-footer">
                <div class="prompt-meta">
                    <span class="meta-item"><i class="fas fa-folder"></i> ${getCategoryName(prompt.category)}</span>
                    <span class="meta-item"><i class="fas fa-clock"></i> ${formatDate(prompt.updated_at)}</span>
                </div>
                ${tagsHtml ? `<div class="prompt-tags">${tagsHtml}</div>` : ''}
            </div>
        </div>
    `;
}

// Render Editor Modal
function renderEditorModal() {
    return `
        <div class="modal-overlay" id="editorModal" onclick="closeModalOnBackdrop(event)">
            <div class="modal modal-editor" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3 id="modalTitle">新建提示词</h3>
                    <div class="modal-header-actions">
                        <span id="saveStatus" class="save-status" style="display: none;"></span>
                        <button class="btn btn-ghost" onclick="closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="promptId">
                    <div class="form-row">
                        <div class="form-group form-group-title">
                            <label class="form-label">标题 <span class="required">*</span></label>
                            <input type="text" class="form-input" id="promptTitle" placeholder="输入提示词标题">
                        </div>
                        <div class="form-group form-group-category">
                            <label class="form-label">分类</label>
                            <select class="form-select" id="promptCategory">
                                ${state.categories.filter(c => c.id !== 'all').map(cat => `
                                    <option value="${cat.id}">${cat.name}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">内容 <span class="required">*</span></label>
                        <div id="editorContainer" class="editor-container"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group form-group-tags">
                            <label class="form-label">标签</label>
                            <input type="text" class="form-input" id="promptTags" placeholder="用逗号分隔多个标签">
                        </div>
                        <div class="form-group form-group-version">
                            <label class="form-label">版本号</label>
                            <input type="text" class="form-input" id="promptVersion" placeholder="例如：v1.0">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">备注</label>
                        <textarea class="form-textarea" id="promptNotes" placeholder="添加备注信息..." rows="2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick="closeModal()">取消</button>
                    <button class="btn btn-danger" id="deleteBtn" onclick="handleDelete()" style="display: none;">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                    <button class="btn btn-secondary" onclick="showVersionHistoryFromModal()">
                        <i class="fas fa-history"></i> 版本历史
                    </button>
                    <button class="btn btn-primary" onclick="savePrompt()">
                        <i class="fas fa-save"></i> 保存
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Render Version Panel
function renderVersionPanel() {
    return `
        <aside class="version-panel" id="versionPanel">
            <div class="version-panel-header">
                <h3><i class="fas fa-history"></i> 版本历史</h3>
                <button class="btn-icon" onclick="closeVersionPanel()" title="关闭">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="versionHistoryContainer" class="version-history-container"></div>
        </aside>
    `;
}

// ============ Component Initialization ============

function initEditor(content = '') {
    const container = document.getElementById('editorContainer');
    if (!container) return;
    
    // Destroy existing instance if any
    if (state.editorInstance) {
        state.editorInstance.destroy();
    }
    
    state.editorInstance = new Editor(container, {
        value: content,
        onChange: (value) => {
            // Trigger auto-save indicator
            showSaveStatus('saving');
        },
        onSave: (value) => {
            savePrompt();
        }
    });
}

function initVersionHistory() {
    const container = document.getElementById('versionHistoryContainer');
    if (!container) return;
    
    // Destroy existing instance if any
    if (state.versionHistoryInstance) {
        state.versionHistoryInstance.destroy();
    }
    
    state.versionHistoryInstance = new VersionHistory(container, {
        versions: state.currentPromptVersions,
        onRestore: async (version) => {
            try {
                if (state.currentEditingPrompt) {
                    await restorePromptVersion(state.currentEditingPrompt.id, version.id);
                    showToast('版本已恢复', 'success');
                    // Reload and refresh
                    await loadPrompts();
                    if (state.editorInstance) {
                        state.editorInstance.setValue(version.content);
                    }
                    // Refresh version list
                    await loadPromptVersions(state.currentEditingPrompt.id);
                }
            } catch (error) {
                console.error('Restore version failed:', error);
            }
        },
        onPreview: (version) => {
            // Preview is handled internally by VersionHistory component
        }
    });
}

// ============ Filter Functions ============

function filterPrompts() {
    return state.prompts.filter(p => {
        if (state.currentCategory !== 'all' && p.category !== state.currentCategory) return false;
        if (state.currentTag && !p.tags?.includes(state.currentTag)) return false;
        if (state.searchQuery) {
            const q = state.searchQuery.toLowerCase();
            return p.title.toLowerCase().includes(q) || 
                   p.content.toLowerCase().includes(q);
        }
        return true;
    });
}

function getCategoryCount(categoryId) {
    return state.prompts.filter(p => p.category === categoryId).length;
}

// ============ Action Functions ============

function setCategory(id) {
    state.currentCategory = id;
    state.currentTag = null;
    renderApp();
}

function setTag(tag) {
    state.currentTag = state.currentTag === tag ? null : tag;
    renderApp();
}

function setSearch(value) {
    state.searchQuery = value;
    // Debounce re-render
    clearTimeout(window.searchDebounce);
    window.searchDebounce = setTimeout(() => {
        renderApp();
    }, 300);
}

function toggleDarkMode() {
    state.isDarkMode = !state.isDarkMode;
    localStorage.setItem('dark_mode', state.isDarkMode);
    renderApp();
}

function showAddModal() {
    state.currentEditingPrompt = null;
    state.currentPromptVersions = [];
    
    document.getElementById('promptId').value = '';
    document.getElementById('promptTitle').value = '';
    document.getElementById('promptCategory').value = 'other';
    document.getElementById('promptTags').value = '';
    document.getElementById('promptVersion').value = '';
    document.getElementById('promptNotes').value = '';
    document.getElementById('modalTitle').textContent = '新建提示词';
    document.getElementById('deleteBtn').style.display = 'none';
    
    // Initialize editor
    initEditor('');
    
    document.getElementById('editorModal').classList.add('active');
}

async function editPrompt(id) {
    const prompt = state.prompts.find(p => p.id === id);
    if (!prompt) {
        showToast('提示词不存在', 'error');
        return;
    }
    
    state.currentEditingPrompt = prompt;
    
    document.getElementById('promptId').value = prompt.id;
    document.getElementById('promptTitle').value = prompt.title;
    document.getElementById('promptCategory').value = prompt.category || 'other';
    document.getElementById('promptTags').value = prompt.tags?.join(', ') || '';
    document.getElementById('promptVersion').value = prompt.version || '';
    document.getElementById('promptNotes').value = prompt.notes || '';
    document.getElementById('modalTitle').textContent = '编辑提示词';
    document.getElementById('deleteBtn').style.display = 'inline-flex';
    
    // Initialize editor with content
    initEditor(prompt.content);
    
    document.getElementById('editorModal').classList.add('active');
    
    // Load versions in background
    await loadPromptVersions(id);
}

async function loadPromptVersions(promptId) {
    try {
        const versions = await fetchPromptVersions(promptId);
        state.currentPromptVersions = versions || [];
        
        // Update version history if panel is open
        if (state.isVersionPanelOpen && state.versionHistoryInstance) {
            state.versionHistoryInstance.updateVersions(state.currentPromptVersions);
        }
    } catch (error) {
        console.error('Failed to load versions:', error);
        state.currentPromptVersions = [];
    }
}

function showVersionHistory(promptId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const prompt = state.prompts.find(p => p.id === promptId);
    if (prompt) {
        state.currentEditingPrompt = prompt;
        state.isVersionPanelOpen = true;
        renderApp();
        loadPromptVersions(promptId);
    }
}

function showVersionHistoryFromModal() {
    const promptId = document.getElementById('promptId').value;
    if (promptId) {
        state.isVersionPanelOpen = true;
        renderApp();
        loadPromptVersions(promptId);
    } else {
        showToast('请先保存提示词', 'warning');
    }
}

function closeVersionPanel() {
    state.isVersionPanelOpen = false;
    renderApp();
}

function closeModal() {
    document.getElementById('editorModal').classList.remove('active');
    
    // Clean up editor instance
    if (state.editorInstance) {
        state.editorInstance.destroy();
        state.editorInstance = null;
    }
    
    state.currentEditingPrompt = null;
    state.currentPromptVersions = [];
}

function closeModalOnBackdrop(event) {
    if (event.target === event.currentTarget) {
        closeModal();
    }
}

async function savePrompt() {
    const id = document.getElementById('promptId').value;
    const title = document.getElementById('promptTitle').value.trim();
    const category = document.getElementById('promptCategory').value;
    const tagsStr = document.getElementById('promptTags').value;
    const version = document.getElementById('promptVersion').value.trim();
    const notes = document.getElementById('promptNotes').value.trim();
    
    // Get content from editor
    const content = state.editorInstance ? state.editorInstance.getValue().trim() : '';
    
    if (!title) {
        showToast('请填写标题', 'error');
        document.getElementById('promptTitle').focus();
        return;
    }
    
    if (!content) {
        showToast('请填写内容', 'error');
        if (state.editorInstance) {
            state.editorInstance.focus();
        }
        return;
    }
    
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    
    const promptData = { 
        title, 
        content, 
        category, 
        tags,
        version,
        notes
    };
    
    try {
        showSaveStatus('saving');
        
        if (id) {
            // Update existing prompt
            await updatePrompt(id, promptData);
            showToast('提示词已更新', 'success');
        } else {
            // Create new prompt
            const result = await createPrompt(promptData);
            state.currentEditingPrompt = result;
            document.getElementById('promptId').value = result.id;
            document.getElementById('modalTitle').textContent = '编辑提示词';
            document.getElementById('deleteBtn').style.display = 'inline-flex';
            showToast('提示词已创建', 'success');
        }
        
        showSaveStatus('saved');
        await loadPrompts();
        renderApp();
        
    } catch (error) {
        showSaveStatus('error');
        console.error('Save prompt failed:', error);
    }
}

async function handleDelete() {
    const id = document.getElementById('promptId').value;
    if (!id) return;
    
    if (!confirm('确定要删除这个提示词吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        await deletePrompt(id);
        showToast('提示词已删除', 'success');
        closeModal();
        await loadPrompts();
        renderApp();
    } catch (error) {
        console.error('Delete prompt failed:', error);
    }
}

async function toggleFeatured(id, event) {
    if (event) {
        event.stopPropagation();
    }
    
    try {
        const result = await togglePromptFeatured(id);
        showToast(result.is_featured ? '已收藏' : '已取消收藏', 'success');
        await loadPrompts();
        renderApp();
    } catch (error) {
        console.error('Toggle featured failed:', error);
    }
}

// ============ Data Loading Functions ============

async function loadUser() {
    // For now, use mock user data
    // In production, this should fetch from /api/user
    state.user = {
        username: 'Demo User',
        avatar: 'https://github.com/github.png'
    };
    
    // Load all data from real API
    try {
        await Promise.all([
            loadPrompts(),
            loadCategories(),
            loadTags()
        ]);
        
        renderApp();
    } catch (error) {
        console.error('Failed to load initial data:', error);
        showToast('加载数据失败，请刷新重试', 'error');
    }
}

async function loadPrompts() {
    try {
        const prompts = await fetchPrompts();
        state.prompts = prompts || [];
    } catch (error) {
        state.prompts = [];
        console.error('Failed to load prompts:', error);
        throw error;
    }
}

async function loadCategories() {
    try {
        const categories = await fetchCategories();
        if (categories && categories.length > 0) {
            // Merge with default categories, keeping 'all' at the beginning
            const apiCategories = categories.map(c => ({
                id: c.id,
                name: c.name,
                icon: c.icon || 'fa-folder'
            }));
            state.categories = [
                state.categories[0], // Keep 'all'
                ...apiCategories
            ];
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
        // Keep default categories on error
    }
}

async function loadTags() {
    try {
        const tags = await fetchTags();
        state.tags = tags || [];
    } catch (error) {
        state.tags = [];
        console.error('Failed to load tags:', error);
    }
}

// ============ Auth Functions ============

function loginWithGitHub() {
    // Mock login - in production, redirect to GitHub OAuth
    localStorage.setItem('auth_token', 'mock_token');
    loadUser();
}

function logout() {
    if (!confirm('确定要退出登录吗？')) {
        return;
    }
    localStorage.removeItem('auth_token');
    state.user = null;
    state.prompts = [];
    renderLogin();
    showToast('已退出登录', 'success');
}

// ============ Utility Functions ============

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showSaveStatus(status) {
    const indicator = document.getElementById('saveStatus');
    if (!indicator) return;
    
    const icons = {
        saving: '<i class="fas fa-spinner fa-spin"></i>',
        saved: '<i class="fas fa-check"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>'
    };
    
    const texts = {
        saving: '保存中...',
        saved: '已保存',
        error: '保存失败'
    };
    
    const colors = {
        saving: 'var(--text-muted)',
        saved: 'var(--success)',
        error: 'var(--error)'
    };
    
    indicator.innerHTML = `${icons[status]} ${texts[status]}`;
    indicator.style.color = colors[status];
    indicator.style.display = 'inline-flex';
    
    // Hide after 3 seconds if saved
    if (status === 'saved') {
        setTimeout(() => {
            indicator.style.display = 'none';
        }, 3000);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCategoryName(id) {
    return state.categories.find(c => c.id === id)?.name || id;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        if (hours < 1) {
            const minutes = Math.floor(diff / (60 * 1000));
            return minutes < 1 ? '刚刚' : `${minutes}分钟前`;
        }
        return `${hours}小时前`;
    }
    
    // Less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        return `${days}天前`;
    }
    
    return date.toLocaleDateString('zh-CN');
}

// ============ Keyboard Shortcuts ============

document.addEventListener('keydown', (e) => {
    // Close modal on Escape
    if (e.key === 'Escape') {
        const modal = document.getElementById('editorModal');
        if (modal && modal.classList.contains('active')) {
            closeModal();
        }
        
        if (state.isVersionPanelOpen) {
            closeVersionPanel();
        }
    }
    
    // New prompt on Ctrl/Cmd + N
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (state.user) {
            showAddModal();
        }
    }
    
    // Focus search on Ctrl/Cmd + K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) {
            searchInput.focus();
        }
    }
});

// ============ Start Application ============

init();

// Expose functions to window for onclick handlers
Object.assign(window, {
    toggleDarkMode,
    showAddModal,
    editPrompt,
    closeModal,
    closeModalOnBackdrop,
    savePrompt,
    handleDelete,
    setCategory,
    setTag,
    setSearch,
    loginWithGitHub,
    logout,
    toggleFeatured,
    showVersionHistory,
    showVersionHistoryFromModal,
    closeVersionPanel
});
