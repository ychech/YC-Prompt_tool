// YC Prompt Tool v2 - Database Version
// Vue 3 style vanilla JS implementation with real API integration

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
    isLoading: false
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

// ============ Initialize ============

function init() {
    appEl = document.getElementById('app');
    
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
        <div class="login-page">
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
        <div class="app" data-theme="${state.isDarkMode ? 'dark' : ''}">
            <header class="header">
                <div class="logo">
                    <i class="fas fa-feather-alt"></i> YC提示词工具 v2
                </div>
                <div class="header-actions">
                    <button class="btn btn-ghost" onclick="toggleDarkMode()">
                        <i class="fas ${state.isDarkMode ? 'fa-sun' : 'fa-moon'}"></i>
                    </button>
                    <button class="btn btn-primary" onclick="showAddModal()">
                        <i class="fas fa-plus"></i> 新建
                    </button>
                    <div class="user-info">
                        <img src="${state.user?.avatar || 'https://github.com/github.png'}" class="user-avatar" alt="avatar">
                        <span>${state.user?.username || 'User'}</span>
                        <button class="btn btn-ghost" onclick="logout()" style="padding: 4px 8px;">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </div>
            </header>
            
            <div class="main">
                <aside class="sidebar">
                    <div class="sidebar-section">
                        <div class="sidebar-title">分类</div>
                        <ul class="category-list">
                            ${state.categories.map(cat => `
                                <li class="category-item ${state.currentCategory === cat.id ? 'active' : ''}" 
                                    onclick="setCategory('${cat.id}')">
                                    <span><i class="fas ${cat.icon}"></i> ${cat.name}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <div class="sidebar-section">
                        <div class="sidebar-title">标签</div>
                        <ul class="tag-list">
                            ${state.tags.map(tag => `
                                <li class="tag-item ${state.currentTag === tag ? 'active' : ''}"
                                    onclick="setTag('${tag}')">
                                    <span><i class="fas fa-tag"></i> ${tag}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </aside>
                
                <main class="content">
                    <div class="toolbar">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="搜索提示词..." 
                                   value="${state.searchQuery}" 
                                   oninput="setSearch(this.value)">
                        </div>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">
                            共 ${filteredPrompts.length} 个提示词
                        </div>
                    </div>
                    
                    <div class="prompt-grid">
                        ${filteredPrompts.map(prompt => `
                            <div class="prompt-card" onclick="editPrompt('${prompt.id}')">
                                <div class="prompt-title">
                                    ${escapeHtml(prompt.title)}
                                    <i class="fas fa-star" style="color: ${prompt.is_featured ? 'var(--warning)' : 'transparent'};"></i>
                                </div>
                                <div class="prompt-content">${escapeHtml(prompt.content)}</div>
                                <div class="prompt-meta">
                                    <span><i class="fas fa-folder"></i> ${getCategoryName(prompt.category)}</span>
                                    <span><i class="fas fa-clock"></i> ${formatDate(prompt.updated_at)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </main>
            </div>
        </div>
        
        ${renderModal()}
        ${renderLoadingSpinner()}
        ${renderToastContainer()}
    `;
}

// Render Modal
function renderModal() {
    return `
        <div class="modal-overlay" id="promptModal">
            <div class="modal">
                <div class="modal-header">
                    <h3 id="modalTitle">新建提示词</h3>
                    <button class="btn btn-ghost" onclick="closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="promptId">
                    <div class="form-group">
                        <label class="form-label">标题</label>
                        <input type="text" class="form-input" id="promptTitle" placeholder="输入标题">
                    </div>
                    <div class="form-group">
                        <label class="form-label">分类</label>
                        <select class="form-select" id="promptCategory">
                            ${state.categories.filter(c => c.id !== 'all').map(cat => `
                                <option value="${cat.id}">${cat.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">内容</label>
                        <textarea class="form-textarea" id="promptContent" placeholder="输入提示词内容..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">标签（用逗号分隔）</label>
                        <input type="text" class="form-input" id="promptTags" placeholder="标签1, 标签2, 标签3">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick="closeModal()">取消</button>
                    <button class="btn btn-danger" id="deleteBtn" onclick="handleDelete()" style="display: none; margin-right: auto;">删除</button>
                    <button class="btn btn-primary" onclick="savePrompt()">保存</button>
                </div>
            </div>
        </div>
    `;
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
    renderApp();
}

function toggleDarkMode() {
    state.isDarkMode = !state.isDarkMode;
    renderApp();
}

function showAddModal() {
    document.getElementById('promptId').value = '';
    document.getElementById('promptTitle').value = '';
    document.getElementById('promptContent').value = '';
    document.getElementById('promptTags').value = '';
    document.getElementById('modalTitle').textContent = '新建提示词';
    document.getElementById('deleteBtn').style.display = 'none';
    document.getElementById('promptModal').classList.add('active');
}

function editPrompt(id) {
    const prompt = state.prompts.find(p => p.id === id);
    if (!prompt) return;
    
    document.getElementById('promptId').value = prompt.id;
    document.getElementById('promptTitle').value = prompt.title;
    document.getElementById('promptContent').value = prompt.content;
    document.getElementById('promptCategory').value = prompt.category;
    document.getElementById('promptTags').value = prompt.tags?.join(', ') || '';
    document.getElementById('modalTitle').textContent = '编辑提示词';
    document.getElementById('deleteBtn').style.display = 'inline-block';
    document.getElementById('promptModal').classList.add('active');
}

function closeModal() {
    document.getElementById('promptModal').classList.remove('active');
}

async function savePrompt() {
    const id = document.getElementById('promptId').value;
    const title = document.getElementById('promptTitle').value.trim();
    const content = document.getElementById('promptContent').value.trim();
    const category = document.getElementById('promptCategory').value;
    const tagsStr = document.getElementById('promptTags').value;
    
    if (!title || !content) {
        showToast('请填写标题和内容', 'error');
        return;
    }
    
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    
    const promptData = { title, content, category, tags };
    
    try {
        if (id) {
            // Update existing prompt
            await updatePrompt(id, promptData);
            showToast('提示词已更新');
        } else {
            // Create new prompt
            await createPrompt(promptData);
            showToast('提示词已创建');
        }
        
        closeModal();
        await loadPrompts();
    } catch (error) {
        // Error already handled by apiRequest
        console.error('Save prompt failed:', error);
    }
}

async function handleDelete() {
    const id = document.getElementById('promptId').value;
    if (!id) return;
    
    if (!confirm('确定要删除这个提示词吗？')) {
        return;
    }
    
    try {
        await deletePrompt(id);
        showToast('提示词已删除');
        closeModal();
        await loadPrompts();
    } catch (error) {
        console.error('Delete prompt failed:', error);
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
    await Promise.all([
        loadPrompts(),
        loadCategories(),
        loadTags()
    ]);
    
    renderApp();
}

async function loadPrompts() {
    try {
        const prompts = await fetchPrompts();
        state.prompts = prompts || [];
    } catch (error) {
        state.prompts = [];
        console.error('Failed to load prompts:', error);
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
    localStorage.removeItem('auth_token');
    state.user = null;
    state.prompts = [];
    renderLogin();
}

// ============ Utility Functions ============

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
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

function escapeHtml(text) {
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
    return date.toLocaleDateString('zh-CN');
}

// ============ Auto Save ============

let autoSaveTimer = null;
let lastSavedContent = '';

/**
 * Enable auto-save for a textarea
 */
function enableAutoSave(textareaId, saveCallback, delay = 3000) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    
    // Store initial content
    lastSavedContent = textarea.value;
    
    textarea.addEventListener('input', () => {
        // Clear existing timer
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }
        
        // Show saving indicator
        showSaveStatus('saving');
        
        // Set new timer
        autoSaveTimer = setTimeout(async () => {
            const currentContent = textarea.value;
            
            // Only save if content changed
            if (currentContent !== lastSavedContent) {
                try {
                    await saveCallback(currentContent);
                    lastSavedContent = currentContent;
                    showSaveStatus('saved');
                } catch (e) {
                    showSaveStatus('error');
                }
            }
        }, delay);
    });
    
    // Save on blur
    textarea.addEventListener('blur', async () => {
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }
        
        const currentContent = textarea.value;
        if (currentContent !== lastSavedContent) {
            try {
                await saveCallback(currentContent);
                lastSavedContent = currentContent;
                showSaveStatus('saved');
            } catch (e) {
                showSaveStatus('error');
            }
        }
    });
}

/**
 * Show save status indicator
 */
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
    
    indicator.innerHTML = `${icons[status]} ${texts[status]}`;
    indicator.className = `save-status ${status}`;
    indicator.style.display = 'inline-flex';
    
    // Hide after 3 seconds if saved
    if (status === 'saved') {
        setTimeout(() => {
            indicator.style.display = 'none';
        }, 3000);
    }
}

// ============ Start Application ============

init();

// Expose functions to window for onclick handlers
Object.assign(window, {
    toggleDarkMode,
    showAddModal,
    editPrompt,
    closeModal,
    savePrompt,
    handleDelete,
    setCategory,
    setTag,
    setSearch,
    loginWithGitHub,
    logout,
    enableAutoSave
});
