<template>
  <div class="markdown-editor">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-group">
        <button
          v-for="tool in toolbarTools"
          :key="tool.action"
          class="toolbar-btn"
          :title="tool.title + (tool.shortcut ? ` (${tool.shortcut})` : '')"
          @click="applyFormatting(tool.action)"
        >
          <span v-html="tool.icon"></span>
        </button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-info">
        <span class="word-count">{{ wordCount }} words</span>
        <span class="save-status" :class="{ 'saving': isSaving, 'saved': lastSaved && !isSaving }">
          <span v-if="isSaving" class="save-indicator">
            <span class="spinner"></span> Saving...
          </span>
          <span v-else-if="lastSaved" class="save-indicator">
            ✓ Saved {{ formatTime(lastSaved) }}
          </span>
          <span v-else class="save-indicator">Unsaved</span>
        </span>
      </div>
    </div>

    <!-- View Mode Tabs -->
    <div class="view-tabs">
      <button
        class="tab-btn"
        :class="{ active: viewMode === 'split' }"
        @click="viewMode = 'split'"
      >
        Split View
      </button>
      <button
        class="tab-btn"
        :class="{ active: viewMode === 'edit' }"
        @click="viewMode = 'edit'"
      >
        Edit
      </button>
      <button
        class="tab-btn"
        :class="{ active: viewMode === 'preview' }"
        @click="viewMode = 'preview'"
      >
        Preview
      </button>
    </div>

    <!-- Editor Content -->
    <div class="editor-container" :class="`view-${viewMode}`">
      <!-- Edit Area -->
      <div v-show="viewMode !== 'preview'" class="edit-pane">
        <textarea
          ref="textareaRef"
          v-model="content"
          class="markdown-textarea"
          placeholder="Start writing in Markdown..."
          @keydown="handleKeydown"
          @input="handleInput"
          spellcheck="false"
        ></textarea>
      </div>

      <!-- Preview Area -->
      <div v-show="viewMode !== 'edit'" class="preview-pane">
        <div class="preview-content" v-html="renderedHtml"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// Props and Emits
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  autoSaveDelay: {
    type: Number,
    default: 2000
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

// Refs
const content = ref(props.modelValue)
const textareaRef = ref(null)
const viewMode = ref('split') // 'split', 'edit', 'preview'
const isSaving = ref(false)
const lastSaved = ref(null)
let saveTimeout = null

// Toolbar configuration
const toolbarTools = [
  {
    action: 'bold',
    icon: '<b>B</b>',
    title: 'Bold',
    shortcut: 'Ctrl+B'
  },
  {
    action: 'italic',
    icon: '<i>I</i>',
    title: 'Italic',
    shortcut: 'Ctrl+I'
  },
  {
    action: 'h1',
    icon: 'H1',
    title: 'Heading 1',
    shortcut: 'Ctrl+1'
  },
  {
    action: 'h2',
    icon: 'H2',
    title: 'Heading 2',
    shortcut: 'Ctrl+2'
  },
  {
    action: 'list',
    icon: '• List',
    title: 'Bullet List',
    shortcut: 'Ctrl+L'
  },
  {
    action: 'code',
    icon: '&lt;/&gt;',
    title: 'Code Block',
    shortcut: 'Ctrl+K'
  },
  {
    action: 'link',
    icon: '🔗',
    title: 'Link',
    shortcut: 'Ctrl+Shift+L'
  }
]

// Sync with v-model
watch(content, (newValue) => {
  emit('update:modelValue', newValue)
  triggerAutoSave()
})

watch(() => props.modelValue, (newValue) => {
  if (newValue !== content.value) {
    content.value = newValue
  }
})

// Word count
const wordCount = computed(() => {
  if (!content.value) return 0
  const text = content.value.replace(/[#*`\[\]()\-_>]/g, ' ')
  const words = text.trim().split(/\s+/).filter(w => w.length > 0)
  return words.length
})

// Simple markdown renderer
const renderedHtml = computed(() => {
  if (!content.value) return '<p class="placeholder">Preview will appear here...</p>'
  
  let html = content.value
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold and Italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/___(.*?)___/g, '<strong><em>$1</em></strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Lists
    .replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>')
    // Blockquotes
    .replace(/^>\s+(.*$)/gim, '<blockquote>$1</blockquote>')
    // Line breaks
    .replace(/\n/g, '<br>')
    // Wrap consecutive list items in ul
    .replace(/(<li>.*<\/li>)(?![\s\S]*<li>)/g, '<ul>$1</ul>')
    .replace(/<\/ul><br><ul>/g, '')
    // Paragraphs
    .replace(/([^>])<br><br>/g, '$1</p><p>')
    .replace(/^(.+)$/gm, (match) => {
      if (!match.startsWith('<')) return '<p>' + match + '</p>'
      return match
    })
    // Clean up empty paragraphs
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[1-6]>)/g, '$1')
    .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')
    .replace(/<p>(<blockquote>)/g, '$1')
    .replace(/(<\/blockquote>)<\/p>/g, '$1')
    .replace(/<p>(<pre>)/g, '$1')
    .replace(/(<\/pre>)<\/p>/g, '$1')

  return html
})

// Formatting functions
function applyFormatting(action) {
  const textarea = textareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = content.value.substring(start, end)
  let replacement = ''
  let cursorOffset = 0

  switch (action) {
    case 'bold':
      replacement = `**${selectedText || 'bold text'}**`
      cursorOffset = selectedText ? 0 : -2
      break
    case 'italic':
      replacement = `*${selectedText || 'italic text'}*`
      cursorOffset = selectedText ? 0 : -1
      break
    case 'h1':
      replacement = `# ${selectedText || 'Heading 1'}`
      cursorOffset = selectedText ? 0 : 0
      break
    case 'h2':
      replacement = `## ${selectedText || 'Heading 2'}`
      cursorOffset = selectedText ? 0 : 0
      break
    case 'list':
      if (selectedText) {
        replacement = selectedText.split('\n').map(line => `- ${line}`).join('\n')
      } else {
        replacement = '- List item'
      }
      break
    case 'code':
      if (selectedText.includes('\n')) {
        replacement = `\`\`\`\n${selectedText || 'code block'}\n\`\`\``
        cursorOffset = selectedText ? 0 : -4
      } else {
        replacement = `\`${selectedText || 'code'}\``
        cursorOffset = selectedText ? 0 : -1
      }
      break
    case 'link':
      replacement = `[${selectedText || 'link text'}](url)`
      cursorOffset = selectedText ? -1 : -5
      break
  }

  const newContent = content.value.substring(0, start) + replacement + content.value.substring(end)
  content.value = newContent

  // Restore focus and set cursor position
  nextTick(() => {
    textarea.focus()
    const newCursorPos = start + replacement.length + cursorOffset
    textarea.setSelectionRange(newCursorPos, newCursorPos)
  })
}

// Keyboard shortcuts
function handleKeydown(event) {
  const isCtrl = event.ctrlKey || event.metaKey

  if (isCtrl) {
    switch (event.key.toLowerCase()) {
      case 'b':
        event.preventDefault()
        applyFormatting('bold')
        break
      case 'i':
        event.preventDefault()
        applyFormatting('italic')
        break
      case '1':
        event.preventDefault()
        applyFormatting('h1')
        break
      case '2':
        event.preventDefault()
        applyFormatting('h2')
        break
      case 'l':
        event.preventDefault()
        applyFormatting('list')
        break
      case 'k':
        event.preventDefault()
        applyFormatting('code')
        break
    }

    if (event.shiftKey && event.key.toLowerCase() === 'l') {
      event.preventDefault()
      applyFormatting('link')
    }
  }
}

// Auto-save
function handleInput() {
  triggerAutoSave()
}

function triggerAutoSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  isSaving.value = true
  saveTimeout = setTimeout(() => {
    performSave()
  }, props.autoSaveDelay)
}

function performSave() {
  isSaving.value = false
  lastSaved.value = new Date()
  emit('save', content.value)
}

function formatTime(date) {
  if (!date) return ''
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// Update time display periodically
let timeUpdateInterval
onMounted(() => {
  timeUpdateInterval = setInterval(() => {
    // Force re-render of time display
    lastSaved.value = lastSaved.value
  }, 60000)
})

onUnmounted(() => {
  if (saveTimeout) clearTimeout(saveTimeout)
  if (timeUpdateInterval) clearInterval(timeUpdateInterval)
})

// Helper for nextTick
import { nextTick } from 'vue'
</script>

<style scoped>
.markdown-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  gap: 4px;
}

.toolbar-btn {
  padding: 6px 12px;
  background: #3c3c3c;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  color: #cccccc;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  min-width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toolbar-btn:hover {
  background: #4c4c4c;
  border-color: #5a5a5a;
}

.toolbar-btn:active {
  background: #094771;
  border-color: #007acc;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #3e3e42;
  margin: 0 4px;
}

.toolbar-info {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
  font-size: 12px;
}

.word-count {
  color: #858585;
}

.save-status {
  color: #858585;
}

.save-status.saved {
  color: #4ec9b0;
}

.save-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #3e3e42;
  border-top-color: #007acc;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* View Tabs */
.view-tabs {
  display: flex;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
  padding: 0 12px;
}

.tab-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #969696;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #cccccc;
  background: #2a2d2e;
}

.tab-btn.active {
  color: #ffffff;
  border-bottom-color: #007acc;
}

/* Editor Container */
.editor-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-container.view-split {
  flex-direction: row;
}

.editor-container.view-edit,
.editor-container.view-preview {
  flex-direction: column;
}

/* Edit Pane */
.edit-pane {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.view-split .edit-pane {
  border-right: 1px solid #3e3e42;
}

.markdown-textarea {
  flex: 1;
  width: 100%;
  padding: 16px;
  background: #1e1e1e;
  color: #d4d4d4;
  border: none;
  resize: none;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  outline: none;
}

.markdown-textarea::placeholder {
  color: #6e6e6e;
}

/* Preview Pane */
.preview-pane {
  flex: 1;
  overflow: auto;
  background: #1e1e1e;
}

.preview-content {
  padding: 16px;
  line-height: 1.6;
}

.preview-content :deep(*) {
  margin: 0 0 16px 0;
}

.preview-content :deep(*:last-child) {
  margin-bottom: 0;
}

.preview-content :deep(h1) {
  font-size: 28px;
  font-weight: 600;
  color: #4ec9b0;
  border-bottom: 1px solid #3e3e42;
  padding-bottom: 8px;
}

.preview-content :deep(h2) {
  font-size: 24px;
  font-weight: 600;
  color: #4ec9b0;
  border-bottom: 1px solid #3e3e42;
  padding-bottom: 6px;
}

.preview-content :deep(h3) {
  font-size: 20px;
  font-weight: 600;
  color: #4ec9b0;
}

.preview-content :deep(p) {
  color: #d4d4d4;
}

.preview-content :deep(strong) {
  color: #ce9178;
  font-weight: 600;
}

.preview-content :deep(em) {
  color: #9cdcfe;
  font-style: italic;
}

.preview-content :deep(code) {
  background: #2d2d2d;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #ce9178;
}

.preview-content :deep(pre) {
  background: #2d2d2d;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
}

.preview-content :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #d4d4d4;
}

.preview-content :deep(ul) {
  padding-left: 24px;
}

.preview-content :deep(li) {
  color: #d4d4d4;
  margin-bottom: 4px;
}

.preview-content :deep(blockquote) {
  border-left: 4px solid #007acc;
  padding-left: 16px;
  margin-left: 0;
  color: #858585;
  font-style: italic;
}

.preview-content :deep(a) {
  color: #4ec9b0;
  text-decoration: none;
}

.preview-content :deep(a:hover) {
  text-decoration: underline;
}

.preview-content :deep(.placeholder) {
  color: #6e6e6e;
  font-style: italic;
  text-align: center;
  padding: 40px 0;
}

/* Scrollbar Styling */
.preview-pane::-webkit-scrollbar,
.markdown-textarea::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.preview-pane::-webkit-scrollbar-track,
.markdown-textarea::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.preview-pane::-webkit-scrollbar-thumb,
.markdown-textarea::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.preview-pane::-webkit-scrollbar-thumb:hover,
.markdown-textarea::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
}

/* Responsive */
@media (max-width: 768px) {
  .view-split {
    flex-direction: column !important;
  }

  .view-split .edit-pane {
    border-right: none;
    border-bottom: 1px solid #3e3e42;
  }

  .toolbar {
    padding: 6px 8px;
  }

  .toolbar-btn {
    padding: 4px 8px;
    font-size: 12px;
    min-width: 32px;
  }

  .toolbar-info {
    gap: 8px;
    font-size: 11px;
  }
}
</style>
