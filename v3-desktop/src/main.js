// YC Prompt Tool v3 - Desktop Version
// Vue 3 + Tauri

import { createApp, ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/tauri'
import { appWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import Editor from './components/Editor.vue'

const app = createApp({
    components: {
        Editor
    },
    
    setup() {
        // ==================== Data ====================
        const prompts = ref([])
        const categories = ref([
            { id: 'all', name: '全部', icon: 'fa-th-large' },
            { id: 'featured', name: '精选', icon: 'fa-star' },
            { id: 'writing', name: '写作', icon: 'fa-pen-nib' },
            { id: 'coding', name: '编程', icon: 'fa-code' },
            { id: 'analysis', name: '分析', icon: 'fa-chart-pie' },
            { id: 'creative', name: '创意', icon: 'fa-lightbulb' },
            { id: 'translation', name: '翻译', icon: 'fa-language' },
            { id: 'other', name: '其他', icon: 'fa-ellipsis-h' }
        ])
        const tags = ref([])
        
        // ==================== UI State ====================
        const currentCategory = ref('all')
        const currentTag = ref(null)
        const searchQuery = ref('')
        const isDarkMode = ref(false)
        const currentFile = ref(null)
        const isLoading = ref(false)
        
        // ==================== Platform ====================
        const platform = ref('win32')
        const isMaximized = ref(false)
        const shortcuts = ref({
            save: 'Ctrl+S',
            open: 'Ctrl+O',
            new: 'Ctrl+N',
            search: 'Ctrl+F'
        })
        
        // ==================== Modal State ====================
        const showModal = ref(false)
        const editingPrompt = ref(null)
        const form = ref({
            title: '',
            content: '',
            category: 'writing',
            tags: '',
            notes: '',
            version: ''
        })
        
        // ==================== Toast Notifications ====================
        const toasts = ref([])
        
        // ==================== Computed ====================
        const filteredPrompts = computed(() => {
            return prompts.value.filter(p => {
                if (currentCategory.value === 'featured') {
                    if (!p.is_featured) return false
                } else if (currentCategory.value !== 'all') {
                    if (p.category !== currentCategory.value) return false
                }
                
                if (searchQuery.value) {
                    const q = searchQuery.value.toLowerCase()
                    return p.title.toLowerCase().includes(q) ||
                           p.content.toLowerCase().includes(q) ||
                           (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
                }
                
                return true
            })
        })
        
        const filteredTags = computed(() => {
            const allTags = new Set()
            prompts.value.forEach(p => {
                if (p.tags) {
                    p.tags.forEach(t => allTags.add(t))
                }
            })
            return Array.from(allTags).sort()
        })
        
        const promptsCount = computed(() => filteredPrompts.value.length)
        
        const categoryCount = computed(() => {
            const counts = {}
            prompts.value.forEach(p => {
                counts[p.category] = (counts[p.category] || 0) + 1
            })
            return counts
        })
        
        // ==================== Methods ====================
        
        // Toast Notifications
        const showToast = (message, type = 'success') => {
            const id = Date.now()
            toasts.value.push({ id, message, type })
            setTimeout(() => {
                const index = toasts.value.findIndex(t => t.id === id)
                if (index !== -1) {
                    toasts.value.splice(index, 1)
                }
            }, 3000)
        }
        
        // Data Operations
        const loadData = async () => {
            isLoading.value = true
            try {
                const data = await invoke('load_prompts')
                prompts.value = data.prompts || []
                tags.value = data.custom_tags || []
                showToast('数据加载成功')
            } catch (e) {
                console.error('Failed to load data:', e)
                showToast('加载数据失败', 'error')
            } finally {
                isLoading.value = false
            }
        }
        
        const saveData = async () => {
            try {
                const data = {
                    prompts: prompts.value,
                    custom_categories: [],
                    custom_tags: tags.value,
                    featured_prompts: []
                }
                await invoke('save_prompts', { data })
                showToast('已保存到文件')
            } catch (e) {
                console.error('Failed to save:', e)
                showToast('保存失败', 'error')
            }
        }
        
        const openFile = async () => {
            try {
                const content = await invoke('open_file_dialog')
                if (content) {
                    const data = JSON.parse(content)
                    prompts.value = data.prompts || []
                    tags.value = data.custom_tags || []
                    showToast('文件已打开')
                }
            } catch (e) {
                console.error('Failed to open file:', e)
                showToast('打开文件失败', 'error')
            }
        }
        
        const exportFile = async () => {
            try {
                const data = {
                    prompts: prompts.value,
                    custom_categories: [],
                    custom_tags: tags.value,
                    featured_prompts: []
                }
                const saved = await invoke('save_file_dialog', {
                    data: JSON.stringify(data, null, 2)
                })
                if (saved) {
                    showToast('文件已导出')
                }
            } catch (e) {
                console.error('Failed to export:', e)
                showToast('导出失败', 'error')
            }
        }
        
        // Prompt CRUD
        const showAddModal = () => {
            editingPrompt.value = null
            form.value = {
                title: '',
                content: '',
                category: 'writing',
                tags: '',
                notes: '',
                version: ''
            }
            showModal.value = true
        }
        
        const editPrompt = (prompt) => {
            editingPrompt.value = prompt
            form.value = {
                title: prompt.title,
                content: prompt.content,
                category: prompt.category,
                tags: prompt.tags?.join(', ') || '',
                notes: prompt.notes || '',
                version: prompt.version || ''
            }
            showModal.value = true
        }
        
        const savePrompt = async () => {
            if (!form.value.title || !form.value.content) {
                showToast('请填写标题和内容', 'error')
                return
            }
            
            const promptData = {
                title: form.value.title,
                content: form.value.content,
                category: form.value.category,
                tags: form.value.tags.split(',').map(t => t.trim()).filter(Boolean),
                notes: form.value.notes,
                version: form.value.version,
                updated_at: Date.now()
            }
            
            if (editingPrompt.value) {
                const index = prompts.value.findIndex(p => p.id === editingPrompt.value.id)
                if (index !== -1) {
                    prompts.value[index] = { ...prompts.value[index], ...promptData }
                    showToast('提示词已更新')
                }
            } else {
                const newPrompt = {
                    id: crypto.randomUUID(),
                    ...promptData,
                    is_featured: false,
                    created_at: Date.now()
                }
                prompts.value.push(newPrompt)
                showToast('提示词已创建')
            }
            
            showModal.value = false
            await saveData()
        }
        
        const deletePrompt = async (prompt) => {
            if (!confirm('确定要删除这个提示词吗？')) return
            
            const index = prompts.value.findIndex(p => p.id === prompt.id)
            if (index !== -1) {
                prompts.value.splice(index, 1)
                await saveData()
                showToast('已删除')
            }
        }
        
        const toggleFeatured = async (prompt) => {
            prompt.is_featured = !prompt.is_featured
            await saveData()
        }
        
        const duplicatePrompt = async (prompt) => {
            const newPrompt = {
                ...prompt,
                id: crypto.randomUUID(),
                title: `${prompt.title} (复制)`,
                is_featured: false,
                created_at: Date.now(),
                updated_at: Date.now()
            }
            prompts.value.push(newPrompt)
            await saveData()
            showToast('已复制提示词')
        }
        
        const copyToClipboard = async (text) => {
            try {
                await navigator.clipboard.writeText(text)
                showToast('已复制到剪贴板')
            } catch (e) {
                console.error('Failed to copy:', e)
                showToast('复制失败', 'error')
            }
        }
        
        // UI Methods
        const setCategory = (id) => {
            currentCategory.value = id
            currentTag.value = null
        }
        
        const setTag = (tag) => {
            currentTag.value = tag
            currentCategory.value = 'all'
        }
        
        const toggleDarkMode = () => {
            isDarkMode.value = !isDarkMode.value
        }
        
        // Window Controls
        const minimizeWindow = async () => {
            try {
                await appWindow.minimize()
            } catch (e) {
                console.error('Failed to minimize:', e)
            }
        }
        
        const maximizeWindow = async () => {
            try {
                await appWindow.toggleMaximize()
                isMaximized.value = !isMaximized.value
            } catch (e) {
                console.error('Failed to maximize:', e)
            }
        }
        
        const closeWindow = async () => {
            try {
                await appWindow.close()
            } catch (e) {
                console.error('Failed to close:', e)
            }
        }
        
        // Formatting
        const formatDate = (timestamp) => {
            if (!timestamp) return ''
            const date = new Date(timestamp)
            const now = new Date()
            const diff = now - date
            
            if (diff < 60000) return '刚刚'
            if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
            if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
            
            return date.toLocaleDateString('zh-CN')
        }
        
        const escapeHtml = (text) => {
            const div = document.createElement('div')
            div.textContent = text
            return div.innerHTML
        }
        
        const truncateText = (text, maxLength = 100) => {
            if (!text || text.length <= maxLength) return text
            return text.substring(0, maxLength) + '...'
        }
        
        const getCategoryName = (categoryId) => {
            const cat = categories.value.find(c => c.id === categoryId)
            return cat ? cat.name : categoryId
        }
        
        const getCategoryIcon = (categoryId) => {
            const cat = categories.value.find(c => c.id === categoryId)
            return cat ? cat.icon : 'fa-folder'
        }
        
        // ==================== Lifecycle ====================
        onMounted(async () => {
            // Detect platform
            try {
                platform.value = await invoke('get_platform')
                
                // Load shortcuts for current platform
                shortcuts.value.save = await invoke('get_shortcut_display', { action: 'save' })
                shortcuts.value.open = await invoke('get_shortcut_display', { action: 'open' })
                shortcuts.value.new = await invoke('get_shortcut_display', { action: 'new' })
                shortcuts.value.search = await invoke('get_shortcut_display', { action: 'search' })
            } catch (e) {
                console.error('Failed to get platform info:', e)
            }
            
            // Load data on startup
            await loadData()
            
            // Setup keyboard shortcuts
            document.addEventListener('keydown', handleKeydown)
            
            // Listen for system tray events
            try {
                await listen('new-prompt', () => {
                    showAddModal()
                })
            } catch (e) {
                console.error('Failed to setup event listener:', e)
            }
            
            // Check if window is maximized
            try {
                isMaximized.value = await appWindow.isMaximized()
            } catch (e) {
                console.error('Failed to check window state:', e)
            }
        })
        
        onUnmounted(() => {
            document.removeEventListener('keydown', handleKeydown)
        })
        
        const handleKeydown = (e) => {
            const isMod = platform.value === 'darwin' ? e.metaKey : e.ctrlKey
            
            if (isMod && e.key === 's') {
                e.preventDefault()
                saveData()
            }
            if (isMod && e.key === 'o') {
                e.preventDefault()
                openFile()
            }
            if (isMod && e.key === 'n') {
                e.preventDefault()
                showAddModal()
            }
            if (isMod && e.key === 'f') {
                e.preventDefault()
                document.querySelector('.search-box input')?.focus()
            }
            if (e.key === 'Escape') {
                if (showModal.value) {
                    showModal.value = false
                }
            }
        }
        
        return {
            // Data
            prompts,
            categories,
            tags,
            filteredTags,
            
            // UI State
            currentCategory,
            currentTag,
            searchQuery,
            isDarkMode,
            currentFile,
            isLoading,
            
            // Platform
            platform,
            isMaximized,
            shortcuts,
            
            // Modal
            showModal,
            editingPrompt,
            form,
            
            // Toast
            toasts,
            
            // Computed
            filteredPrompts,
            promptsCount,
            categoryCount,
            
            // Methods
            showToast,
            loadData,
            saveData,
            openFile,
            exportFile,
            showAddModal,
            editPrompt,
            savePrompt,
            deletePrompt,
            toggleFeatured,
            duplicatePrompt,
            copyToClipboard,
            setCategory,
            setTag,
            toggleDarkMode,
            minimizeWindow,
            maximizeWindow,
            closeWindow,
            formatDate,
            escapeHtml,
            truncateText,
            getCategoryName,
            getCategoryIcon
        }
    },
    
    template: `
        <div class="app" :data-theme="isDarkMode ? 'dark' : 'light'">
            <!-- Sidebar -->
            <aside class="sidebar">
                <div class="sidebar-header">
                    <div class="logo">
                        <i class="fas fa-feather-alt"></i>
                        <span>YC 提示词工具</span>
                    </div>
                </div>
                
                <div class="sidebar-content">
                    <!-- Categories Section -->
                    <div class="sidebar-section">
                        <div class="sidebar-title">分类</div>
                        <div 
                            v-for="cat in categories" 
                            :key="cat.id"
                            class="nav-item"
                            :class="{ active: currentCategory === cat.id }"
                            @click="setCategory(cat.id)"
                        >
                            <i :class="'fas ' + cat.icon"></i>
                            <span>{{ cat.name }}</span>
                            <span v-if="cat.id !== 'all' && cat.id !== 'featured'" class="nav-count">
                                {{ categoryCount[cat.id] || 0 }}
                            </span>
                            <span v-else-if="cat.id === 'featured'" class="nav-count">
                                {{ prompts.filter(p => p.is_featured).length }}
                            </span>
                            <span v-else class="nav-count">{{ prompts.length }}</span>
                        </div>
                    </div>
                    
                    <!-- Tags Section -->
                    <div class="sidebar-section" v-if="filteredTags.length > 0">
                        <div class="sidebar-title">标签</div>
                        <div 
                            v-for="tag in filteredTags.slice(0, 20)" 
                            :key="tag"
                            class="nav-item"
                            :class="{ active: currentTag === tag }"
                            @click="setTag(tag)"
                        >
                            <i class="fas fa-tag"></i>
                            <span>{{ tag }}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Sidebar Footer -->
                <div class="sidebar-footer">
                    <button class="sidebar-btn" @click="toggleDarkMode" :title="isDarkMode ? '切换亮色模式' : '切换暗色模式'">
                        <i :class="isDarkMode ? 'fas fa-sun' : 'fas fa-moon'"></i>
                    </button>
                    <button class="sidebar-btn" @click="exportFile" title="导出数据">
                        <i class="fas fa-file-export"></i>
                    </button>
                </div>
            </aside>
            
            <!-- Main Content -->
            <main class="main">
                <!-- Custom Titlebar (Windows/Linux only) -->
                <div v-if="platform !== 'darwin'" class="titlebar">
                    <div class="titlebar-drag-area">
                        <span class="titlebar-title">YC Prompt Tool v3.0.0</span>
                    </div>
                    <div class="titlebar-actions">
                        <button class="titlebar-btn minimize" @click="minimizeWindow" title="最小化">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="titlebar-btn maximize" @click="maximizeWindow" title="最大化">
                            <i :class="isMaximized ? 'fas fa-compress' : 'fas fa-expand'"></i>
                        </button>
                        <button class="titlebar-btn close" @click="closeWindow" title="关闭">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Toolbar -->
                <div class="toolbar">
                    <div class="toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input 
                                type="text" 
                                v-model="searchQuery"
                                placeholder="搜索提示词..."
                            >
                            <span class="search-shortcut">{{ shortcuts.search }}</span>
                        </div>
                    </div>
                    
                    <div class="toolbar-right">
                        <button class="btn btn-ghost" @click="openFile" :title="'打开文件 (' + shortcuts.open + ')'">
                            <i class="fas fa-folder-open"></i>
                            <span>打开</span>
                        </button>
                        <button class="btn btn-ghost" @click="saveData" :title="'保存 (' + shortcuts.save + ')'">
                            <i class="fas fa-save"></i>
                            <span>保存</span>
                        </button>
                        <button class="btn btn-primary" @click="showAddModal" :title="'新建提示词 (' + shortcuts.new + ')'">
                            <i class="fas fa-plus"></i>
                            <span>新建</span>
                        </button>
                    </div>
                </div>
                
                <!-- Content Area -->
                <div class="content">
                    <!-- Loading State -->
                    <div v-if="isLoading" class="loading-state">
                        <div class="spinner"></div>
                        <p>加载中...</p>
                    </div>
                    
                    <!-- Empty State -->
                    <div v-else-if="filteredPrompts.length === 0" class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p v-if="searchQuery">没有找到匹配的提示词</p>
                        <p v-else>还没有提示词，点击"新建"创建一个吧</p>
                        <button v-if="!searchQuery" class="btn btn-primary" @click="showAddModal">
                            <i class="fas fa-plus"></i> 创建第一个提示词
                        </button>
                    </div>
                    
                    <!-- Prompt Grid -->
                    <div v-else class="prompt-grid">
                        <div 
                            v-for="prompt in filteredPrompts" 
                            :key="prompt.id"
                            class="prompt-card"
                            :class="{ featured: prompt.is_featured }"
                        >
                            <div class="prompt-card-header">
                                <div class="prompt-title">{{ prompt.title }}</div>
                                <div class="prompt-actions">
                                    <button 
                                        class="action-btn" 
                                        :class="{ active: prompt.is_featured }"
                                        @click.stop="toggleFeatured(prompt)"
                                        title="收藏"
                                    >
                                        <i :class="prompt.is_featured ? 'fas fa-star' : 'far fa-star'"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="prompt-content" @click="editPrompt(prompt)">
                                {{ truncateText(prompt.content, 150) }}
                            </div>
                            
                            <div class="prompt-tags" v-if="prompt.tags && prompt.tags.length > 0">
                                <span v-for="tag in prompt.tags.slice(0, 3)" :key="tag" class="tag">
                                    {{ tag }}
                                </span>
                            </div>
                            
                            <div class="prompt-card-footer">
                                <div class="prompt-meta">
                                    <span :class="'category-badge ' + prompt.category">
                                        <i :class="'fas ' + getCategoryIcon(prompt.category)"></i>
                                        {{ getCategoryName(prompt.category) }}
                                    </span>
                                    <span class="date" :title="new Date(prompt.updated_at).toLocaleString()">
                                        <i class="far fa-clock"></i>
                                        {{ formatDate(prompt.updated_at) }}
                                    </span>
                                </div>
                                
                                <div class="prompt-actions-row">
                                    <button class="action-btn" @click="copyToClipboard(prompt.content)" title="复制内容">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                    <button class="action-btn" @click="duplicatePrompt(prompt)" title="复制">
                                        <i class="fas fa-clone"></i>
                                    </button>
                                    <button class="action-btn" @click="editPrompt(prompt)" title="编辑">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="action-btn danger" @click="deletePrompt(prompt)" title="删除">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Status Bar -->
                <div class="statusbar">
                    <div class="statusbar-left">
                        <span v-if="currentCategory === 'all'">全部提示词</span>
                        <span v-else-if="currentCategory === 'featured'">精选提示词</span>
                        <span v-else>{{ getCategoryName(currentCategory) }}分类</span>
                        <span class="separator">|</span>
                        <span>共 {{ promptsCount }} 个</span>
                    </div>
                    <div class="statusbar-right">
                        <span v-if="currentFile">{{ currentFile }}</span>
                        <span v-else>已准备好</span>
                    </div>
                </div>
            </main>
            
            <!-- Editor Modal -->
            <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
                <div class="modal">
                    <div class="modal-header">
                        <h3>{{ editingPrompt ? '编辑提示词' : '新建提示词' }}</h3>
                        <button class="modal-close" @click="showModal = false">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="form-group">
                            <label>标题 <span class="required">*</span></label>
                            <input 
                                type="text" 
                                v-model="form.title"
                                placeholder="输入提示词标题"
                                class="form-input"
                            >
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>分类</label>
                                <select v-model="form.category" class="form-select">
                                    <option v-for="cat in categories.filter(c => c.id !== 'all' && c.id !== 'featured')" 
                                            :key="cat.id" 
                                            :value="cat.id">
                                        {{ cat.name }}
                                    </option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>版本</label>
                                <input 
                                    type="text" 
                                    v-model="form.version"
                                    placeholder="例如: 1.0"
                                    class="form-input"
                                >
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>标签 (用逗号分隔)</label>
                            <input 
                                type="text" 
                                v-model="form.tags"
                                placeholder="例如: AI, 写作, 创意"
                                class="form-input"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label>内容 <span class="required">*</span></label>
                            <Editor 
                                v-model="form.content"
                                :auto-save-delay="3000"
                                class="editor-wrapper"
                            />
                        </div>
                        
                        <div class="form-group">
                            <label>备注</label>
                            <textarea 
                                v-model="form.notes"
                                placeholder="添加备注信息..."
                                class="form-textarea"
                                rows="3"
                            ></textarea>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn btn-ghost" @click="showModal = false">取消</button>
                        <button class="btn btn-primary" @click="savePrompt">
                            <i class="fas fa-save"></i> 保存
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Toast Notifications -->
            <div class="toast-container">
                <transition-group name="toast">
                    <div 
                        v-for="toast in toasts" 
                        :key="toast.id"
                        class="toast"
                        :class="toast.type"
                    >
                        <i :class="toast.type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'"></i>
                        <span>{{ toast.message }}</span>
                    </div>
                </transition-group>
            </div>
        </div>
    `
})

app.mount('#app')
