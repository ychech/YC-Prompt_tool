/**
 * Markdown Editor Component
 * A vanilla JavaScript markdown editor with toolbar and preview functionality
 */
class Editor {
  /**
   * @param {HTMLElement} container - The container element to render the editor
   * @param {Object} options - Configuration options
   * @param {string} options.value - Initial markdown content
   * @param {Function} options.onChange - Callback when content changes
   * @param {Function} options.onSave - Callback when content is saved (Ctrl+S)
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      value: '',
      onChange: null,
      onSave: null,
      ...options
    };
    
    this.value = this.options.value;
    this.activeTab = 'edit'; // 'edit' or 'preview'
    
    this.init();
  }

  /**
   * Initialize the editor
   */
  init() {
    this.render();
    this.attachEventListeners();
    this.autoResize();
  }

  /**
   * Render the editor HTML structure
   */
  render() {
    this.container.innerHTML = `
      <div class="markdown-editor">
        <div class="editor-toolbar">
          <div class="toolbar-group">
            <button type="button" class="toolbar-btn" data-action="bold" title="Bold (Ctrl+B)">
              <strong>B</strong>
            </button>
            <button type="button" class="toolbar-btn" data-action="italic" title="Italic (Ctrl+I)">
              <em>I</em>
            </button>
            <button type="button" class="toolbar-btn" data-action="heading" title="Heading (Ctrl+H)">
              H
            </button>
          </div>
          <div class="toolbar-group">
            <button type="button" class="toolbar-btn" data-action="list" title="List (Ctrl+L)">
              ☰
            </button>
            <button type="button" class="toolbar-btn" data-action="code" title="Code (Ctrl+K)">
              &lt;/&gt;
            </button>
            <button type="button" class="toolbar-btn" data-action="link" title="Link (Ctrl+U)">
              🔗
            </button>
          </div>
          <div class="toolbar-tabs">
            <button type="button" class="tab-btn ${this.activeTab === 'edit' ? 'active' : ''}" data-tab="edit">
              Edit
            </button>
            <button type="button" class="tab-btn ${this.activeTab === 'preview' ? 'active' : ''}" data-tab="preview">
              Preview
            </button>
          </div>
        </div>
        <div class="editor-content">
          <div class="editor-panel ${this.activeTab === 'edit' ? 'active' : ''}" data-panel="edit">
            <textarea 
              class="editor-textarea" 
              placeholder="Enter markdown here..."
              spellcheck="false"
            >${this.escapeHtml(this.value)}</textarea>
          </div>
          <div class="editor-panel ${this.activeTab === 'preview' ? 'active' : ''}" data-panel="preview">
            <div class="editor-preview"></div>
          </div>
        </div>
      </div>
    `;

    this.textarea = this.container.querySelector('.editor-textarea');
    this.previewPanel = this.container.querySelector('.editor-preview');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Toolbar buttons
    const toolbarButtons = this.container.querySelectorAll('.toolbar-btn[data-action]');
    toolbarButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleToolbarAction(action);
      });
    });

    // Tab buttons
    const tabButtons = this.container.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Textarea events
    this.textarea.addEventListener('input', () => {
      this.value = this.textarea.value;
      this.autoResize();
      this.triggerOnChange();
    });

    this.textarea.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });

    // Sync scroll position
    this.textarea.addEventListener('scroll', () => {
      if (this.previewPanel) {
        const percentage = this.textarea.scrollTop / (this.textarea.scrollHeight - this.textarea.clientHeight);
        this.previewPanel.scrollTop = percentage * (this.previewPanel.scrollHeight - this.previewPanel.clientHeight);
      }
    });
  }

  /**
   * Handle toolbar button actions
   * @param {string} action - The action to perform
   */
  handleToolbarAction(action) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const selectedText = this.textarea.value.substring(start, end);
    let replacement = '';
    let cursorOffset = 0;

    switch (action) {
      case 'bold':
        if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
          replacement = selectedText.slice(2, -2);
          cursorOffset = 0;
        } else {
          replacement = `**${selectedText || 'bold text'}**`;
          cursorOffset = selectedText ? 0 : -11;
        }
        break;

      case 'italic':
        if (selectedText.startsWith('*') && selectedText.endsWith('*') && 
            !selectedText.startsWith('**')) {
          replacement = selectedText.slice(1, -1);
          cursorOffset = 0;
        } else {
          replacement = `*${selectedText || 'italic text'}*`;
          cursorOffset = selectedText ? 0 : -12;
        }
        break;

      case 'heading':
        replacement = `\n### ${selectedText || 'Heading'}\n`;
        cursorOffset = selectedText ? 0 : -1;
        break;

      case 'list':
        if (selectedText) {
          replacement = selectedText.split('\n').map(line => `- ${line}`).join('\n');
        } else {
          replacement = '- List item\n';
          cursorOffset = -1;
        }
        break;

      case 'code':
        if (selectedText.includes('\n')) {
          replacement = `\n\`\`\`\n${selectedText || 'code block'}\n\`\`\`\n`;
          cursorOffset = selectedText ? 0 : -12;
        } else {
          replacement = `\`${selectedText || 'code'}\``;
          cursorOffset = selectedText ? 0 : -1;
        }
        break;

      case 'link':
        replacement = `[${selectedText || 'link text'}](https://example.com)`;
        cursorOffset = selectedText ? 0 : -20;
        break;
    }

    this.insertText(replacement, cursorOffset);
  }

  /**
   * Insert text at cursor position
   * @param {string} text - The text to insert
   * @param {number} cursorOffset - Offset to adjust cursor position after insertion
   */
  insertText(text, cursorOffset = 0) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const value = this.textarea.value;

    this.textarea.value = value.substring(0, start) + text + value.substring(end);
    this.value = this.textarea.value;

    // Set cursor position
    const newCursorPos = start + text.length + cursorOffset;
    this.textarea.setSelectionRange(newCursorPos, newCursorPos);
    this.textarea.focus();

    this.autoResize();
    this.triggerOnChange();
  }

  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} e - The keyboard event
   */
  handleKeydown(e) {
    // Ctrl/Cmd + key shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          this.handleToolbarAction('bold');
          break;
        case 'i':
          e.preventDefault();
          this.handleToolbarAction('italic');
          break;
        case 'h':
          e.preventDefault();
          this.handleToolbarAction('heading');
          break;
        case 'l':
          e.preventDefault();
          this.handleToolbarAction('list');
          break;
        case 'k':
          e.preventDefault();
          this.handleToolbarAction('code');
          break;
        case 'u':
          e.preventDefault();
          this.handleToolbarAction('link');
          break;
        case 's':
          e.preventDefault();
          if (this.options.onSave) {
            this.options.onSave(this.value);
          }
          break;
      }
    }

    // Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      this.insertText('  ');
    }
  }

  /**
   * Switch between edit and preview tabs
   * @param {string} tab - The tab to switch to ('edit' or 'preview')
   */
  switchTab(tab) {
    this.activeTab = tab;

    // Update tab buttons
    const tabButtons = this.container.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update panels
    const panels = this.container.querySelectorAll('.editor-panel');
    panels.forEach(panel => {
      panel.classList.toggle('active', panel.dataset.panel === tab);
    });

    // Update preview if switching to preview
    if (tab === 'preview') {
      this.updatePreview();
    }
  }

  /**
   * Update the preview panel with rendered markdown
   */
  updatePreview() {
    this.previewPanel.innerHTML = this.renderMarkdown(this.value);
  }

  /**
   * Simple markdown to HTML renderer
   * @param {string} markdown - The markdown text
   * @returns {string} - The rendered HTML
   */
  renderMarkdown(markdown) {
    if (!markdown) return '<p class="empty-preview">Nothing to preview</p>';

    let html = markdown;

    // Escape HTML tags first (but allow our generated HTML)
    html = this.escapeHtml(html);

    // Code blocks (must be before inline code)
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Headers
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');

    // Lists
    html = html.replace(/^\s*- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^\s*\d+\. (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    html = html.replace(/<ul>(<li>.*<\/li>\n?)+<\/ul>/g, match => {
      return match.replace(/<\/li>\n<li>/g, '</li><li>');
    });

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');

    // Horizontal rule
    html = html.replace(/^---$/gim, '<hr>');
    html = html.replace(/^\*\*\*$/gim, '<hr>');

    // Line breaks and paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<[^>]+>)/g, '$1');
    html = html.replace(/(<\/[^>]+>)<\/p>/g, '$1');

    return html;
  }

  /**
   * Escape HTML special characters
   * @param {string} text - The text to escape
   * @returns {string} - The escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Auto-resize the textarea based on content
   */
  autoResize() {
    this.textarea.style.height = 'auto';
    this.textarea.style.height = this.textarea.scrollHeight + 'px';
  }

  /**
   * Trigger the onChange callback
   */
  triggerOnChange() {
    if (this.options.onChange) {
      this.options.onChange(this.value);
    }
  }

  /**
   * Get the current value
   * @returns {string} - The current markdown content
   */
  getValue() {
    return this.value;
  }

  /**
   * Set the editor value
   * @param {string} value - The new value
   */
  setValue(value) {
    this.value = value;
    this.textarea.value = value;
    this.autoResize();
    this.triggerOnChange();
  }

  /**
   * Focus the editor
   */
  focus() {
    this.textarea.focus();
  }

  /**
   * Get the selected text
   * @returns {string} - The selected text
   */
  getSelection() {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    return this.textarea.value.substring(start, end);
  }

  /**
   * Set the selection range
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  setSelection(start, end) {
    this.textarea.setSelectionRange(start, end);
  }

  /**
   * Insert text at a specific position
   * @param {number} position - The position to insert at
   * @param {string} text - The text to insert
   */
  insertTextAt(position, text) {
    const value = this.textarea.value;
    this.textarea.value = value.substring(0, position) + text + value.substring(position);
    this.value = this.textarea.value;
    this.textarea.setSelectionRange(position + text.length, position + text.length);
    this.autoResize();
    this.triggerOnChange();
  }

  /**
   * Destroy the editor and clean up
   */
  destroy() {
    this.container.innerHTML = '';
  }
}

// Export for ES modules
export { Editor };

// Also expose to window for non-module usage
if (typeof window !== 'undefined') {
  window.Editor = Editor;
}
