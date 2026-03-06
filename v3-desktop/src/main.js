// YC Prompt Tool v3 - Desktop Version
// Vue 3 + Tauri

import { createApp } from 'vue'
import { invoke } from '@tauri-apps/api/tauri'
import { open, save } from '@tauri-apps/api/dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/api/fs'

const app = createApp({
    data() {
        return {
            // Data
            prompts: [],
            categories: [
                { id: 'all', name: '全部', icon: 'fa-th-large' },
                { id: 'featured', name: '精选', icon: 'fa-star' },
                { id: 'writing', name: '写作', icon: 'fa-pen-nib' },
                { id: 'coding', name: '编程', icon: 'fa-code' },
                { id: 'analysis', name: '分析', icon: 'fa-chart-pie' },
                { id: 'creative', name: '创意', icon: 'fa-lightbulb' },
                { id: 'translation', name: '翻译', icon: 'fa-language' },
                { id: 'other', name: '其他', icon: 'fa-ellipsis-h' }
            ],
            tags: [],
            
            // UI State
            currentCategory: 'all',
            currentTag: null,
            searchQuery: '',
            isDarkMode: false,
            currentFile: null,
            
            // Platform
            platform: 'win32', // win32 | darwin | linux
            shortcuts: {
                save: 'Ctrl+S',
                open: 'Ctrl+O',
                new: 'Ctrl+N'
            },
            
            // Modal
            showModal: false,
            editingPrompt: null,
            form: {
                title: '',
                content: '',
                category: 'writing',
                tags: '',
                notes: '',
                version: ''
            }
        }
    },
    
    computed: {
        filteredPrompts() {
            return this.prompts.filter(p => {
                if (this.currentCategory === 'featured') {
                    if (!p.is_featured) return false
                } else if (this.currentCategory !== 'all') {
                    if (p.category !== this.currentCategory) return false
                }
                
                if (this.searchQuery) {
                    const q = this.searchQuery.toLowerCase()
                    return p.title.toLowerCase().includes(q) ||
                           p.content.toLowerCase().includes(q)
                }
                
                return true
            })
        }
    },
    
    async mounted() {
        // Detect platform
        this.platform = await invoke('get_platform')
        
        // Load shortcuts for current platform
        this.shortcuts.save = await invoke('get_shortcut_display', { action: 'save' })
        this.shortcuts.open = await invoke('get_shortcut_display', { action: 'open' })
        this.shortcuts.new = await invoke('get_shortcut_display', { action: 'new' })
        
        // Load data on startup
        await this.loadData()
        
        // Setup keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const isMod = this.platform === 'darwin' ? e.metaKey : e.ctrlKey
            
            if (isMod && e.key === 's') {
                e.preventDefault()
                this.saveData()
            }
            if (isMod && e.key === 'o') {
                e.preventDefault()
                this.openFile()
            }
            if (isMod && e.key === 'n') {
                e.preventDefault()
                this.showAddModal()
            }
        })
    },
    
    methods: {
        // Data Operations
        async loadData() {
            try {
                const data = await invoke('load_prompts')
                this.prompts = data.prompts || []
                this.tags = data.custom_tags || []
            } catch (e) {
                console.error('Failed to load data:', e)
                this.showToast('加载数据失败', 'error')
            }
        },
        
        async saveData() {
            try {
                const data = {
                    prompts: this.prompts,
                    custom_categories: [],
                    custom_tags: this.tags,
                    featured_prompts: []
                }
                await invoke('save_prompts', { data })
                this.showToast('已保存到文件')
            } catch (e) {
                console.error('Failed to save:', e)
                this.showToast('保存失败', 'error')
            }
        },
        
        async openFile() {
            try {
                const content = await invoke('open_file_dialog')
                if (content) {
                    const data = JSON.parse(content)
                    this.prompts = data.prompts || []
                    this.tags = data.custom_tags || []
                    this.showToast('文件已打开')
                }
            } catch (e) {
                console.error('Failed to open file:', e)
                this.showToast('打开文件失败', 'error')
            }
        },
        
        async exportFile() {
            try {
                const data = {
                    prompts: this.prompts,
                    custom_categories: [],
                    custom_tags: this.tags,
                    featured_prompts: []
                }
                const saved = await invoke('save_file_dialog', {
                    data: JSON.stringify(data, null, 2)
                })
                if (saved) {
                    this.showToast('文件已导出')
                }
            } catch (e) {
                console.error('Failed to export:', e)
                this.showToast('导出失败', 'error')
            }
        },
        
        // Prompt CRUD
        showAddModal() {
            this.editingPrompt = null
            this.form = {
                title: '',
                content: '',
                category: 'writing',
                tags: '',
                notes: '',
                version: ''
            }
            this.showModal = true
        },
        
        editPrompt(prompt) {
            this.editingPrompt = prompt
            this.form = {
                title: prompt.title,
                content: prompt.content,
                category: prompt.category,
                tags: prompt.tags?.join(', ') || '',
                notes: prompt.notes || '',
                version: prompt.version || ''
            }
            this.showModal = true
        },
        
        async savePrompt() {
            if (!this.form.title || !this.form.content) {
                this.showToast('请填写标题和内容', 'error')
                return
            }
            
            const promptData = {
                title: this.form.title,
                content: this.form.content,
                category: this.form.category,
                tags: this.form.tags.split(',').map(t => t.trim()).filter(Boolean),
                notes: this.form.notes,
                version: this.form.version,
                updated_at: Date.now()
            }
            
            if (this.editingPrompt) {
                // Update
                const index = this.prompts.findIndex(p => p.id === this.editingPrompt.id)
                if (index !== -1) {
                    this.prompts[index] = { ...this.prompts[index], ...promptData }
                    this.showToast('提示词已更新')
                }
            } else {
                // Create
                const newPrompt = {
                    id: crypto.randomUUID(),
                    ...promptData,
                    is_featured: false,
                    created_at: Date.now()
                }
                this.prompts.push(newPrompt)
                this.showToast('提示词已创建')
            }
            
            this.showModal = false
            await this.saveData()
        },
        
        async deletePrompt(prompt) {
            if (!confirm('确定要删除这个提示词吗？')) return
            
            const index = this.prompts.findIndex(p => p.id === prompt.id)
            if (index !== -1) {
                this.prompts.splice(index, 1)
                await this.saveData()
                this.showToast('已删除')
            }
        },
        
        async toggleFeatured(prompt) {
            prompt.is_featured = !prompt.is_featured
            await this.saveData()
        },
        
        // UI
        setCategory(id) {
            this.currentCategory = id
            this.currentTag = null
        },
        
        toggleDarkMode() {
            this.isDarkMode = !this.isDarkMode
        },
        
        showToast(message, type = 'success') {
            // Simple toast implementation
            const toast = document.createElement('div')
            toast.style.cssText = `
                position: fixed;
                bottom: 40px;
                right: 20px;
                padding: 10px 20px;
                background: ${type === 'error' ? '#f5222d' : '#52c41a'};
                color: white;
                border-radius: 4px;
                z-index: 1000;
                animation: slideIn 0.3s ease;
            `
            toast.textContent = message
            document.body.appendChild(toast)
            setTimeout(() => toast.remove(), 3000)
        },
        
        formatDate(timestamp) {
            return new Date(timestamp).toLocaleDateString('zh-CN')
        },
        
        escapeHtml(text) {
            const div = document.createElement('div')
            div.textContent = text
            return div.innerHTML
        }
    }
})

app.mount('#app')
