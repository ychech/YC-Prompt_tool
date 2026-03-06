/**
 * Version History Component
 * Display and manage prompt version history
 */

class VersionHistory {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      versions: [],
      onRestore: null,
      onPreview: null,
      onDelete: null,
      ...options
    };
    
    this.currentVersion = null;
    this.init();
  }
  
  init() {
    this.render();
    this.attachEventListeners();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="version-history">
        <div class="version-header">
          <h3><i class="fas fa-history"></i> 版本历史</h3>
          <span class="version-count">${this.options.versions.length} 个版本</span>
        </div>
        
        <div class="version-list">
          ${this.options.versions.length === 0 ? `
            <div class="version-empty">
              <i class="fas fa-inbox"></i>
              <p>暂无历史版本</p>
            </div>
          ` : this.options.versions.map((v, index) => this.renderVersionItem(v, index)).join('')}
        </div>
        
        <div class="version-preview" style="display: none;">
          <div class="preview-header">
            <h4>版本预览</h4>
            <button class="btn-close-preview" title="关闭预览">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="preview-content">
            <pre><code class="preview-code"></code></pre>
          </div>
          <div class="preview-actions">
            <button class="btn btn-ghost btn-close">关闭</button>
            <button class="btn btn-primary btn-restore">
              <i class="fas fa-undo"></i> 恢复此版本
            </button>
          </div>
        </div>
      </div>
    `;
    
    this.addStyles();
  }
  
  renderVersionItem(version, index) {
    const date = new Date(version.created_at).toLocaleString('zh-CN');
    const isLatest = index === 0;
    const versionNumber = this.options.versions.length - index;
    
    return `
      <div class="version-item ${isLatest ? 'latest' : ''}" data-id="${version.id}">
        <div class="version-info">
          <div class="version-number">
            ${isLatest ? '<span class="badge-latest">最新</span>' : ''}
            <span>版本 ${versionNumber}</span>
          </div>
          <div class="version-date">
            <i class="fas fa-clock"></i> ${date}
          </div>
        </div>
        <div class="version-actions">
          <button class="btn-icon btn-preview" title="预览" data-id="${version.id}">
            <i class="fas fa-eye"></i>
          </button>
          ${!isLatest ? `
            <button class="btn-icon btn-restore" title="恢复" data-id="${version.id}">
              <i class="fas fa-undo"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  attachEventListeners() {
    // Preview buttons
    this.container.querySelectorAll('.btn-preview').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.previewVersion(id);
      });
    });
    
    // Restore buttons
    this.container.querySelectorAll('.version-item .btn-restore').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.restoreVersion(id);
      });
    });
    
    // Close preview
    this.container.querySelector('.btn-close-preview')?.addEventListener('click', () => {
      this.closePreview();
    });
    
    this.container.querySelector('.preview-actions .btn-close')?.addEventListener('click', () => {
      this.closePreview();
    });
    
    // Restore from preview
    this.container.querySelector('.preview-actions .btn-restore')?.addEventListener('click', () => {
      if (this.currentVersion && this.options.onRestore) {
        this.options.onRestore(this.currentVersion);
      }
    });
  }
  
  previewVersion(id) {
    const version = this.options.versions.find(v => v.id === id);
    if (!version) return;
    
    this.currentVersion = version;
    
    const previewEl = this.container.querySelector('.version-preview');
    const codeEl = previewEl.querySelector('.preview-code');
    
    codeEl.textContent = version.content;
    previewEl.style.display = 'block';
    
    // Scroll to preview
    previewEl.scrollIntoView({ behavior: 'smooth' });
  }
  
  closePreview() {
    const previewEl = this.container.querySelector('.version-preview');
    previewEl.style.display = 'none';
    this.currentVersion = null;
  }
  
  restoreVersion(id) {
    const version = this.options.versions.find(v => v.id === id);
    if (!version) return;
    
    if (confirm('确定要恢复到此版本吗？当前内容将被覆盖。')) {
      if (this.options.onRestore) {
        this.options.onRestore(version);
      }
    }
  }
  
  updateVersions(versions) {
    this.options.versions = versions;
    this.render();
    this.attachEventListeners();
  }
  
  addStyles() {
    if (document.getElementById('version-history-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'version-history-styles';
    style.textContent = `
      .version-history {
        background: var(--bg-card);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        overflow: hidden;
      }
      
      .version-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border);
        background: var(--bg);
      }
      
      .version-header h3 {
        font-size: 1rem;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .version-count {
        font-size: 0.85rem;
        color: var(--text-muted);
      }
      
      .version-list {
        max-height: 300px;
        overflow-y: auto;
      }
      
      .version-empty {
        padding: 40px;
        text-align: center;
        color: var(--text-muted);
      }
      
      .version-empty i {
        font-size: 2rem;
        margin-bottom: 12px;
        opacity: 0.5;
      }
      
      .version-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 20px;
        border-bottom: 1px solid var(--border);
        transition: background 0.2s;
      }
      
      .version-item:hover {
        background: var(--bg);
      }
      
      .version-item.latest {
        background: rgba(74, 144, 217, 0.05);
      }
      
      .version-number {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        margin-bottom: 4px;
      }
      
      .badge-latest {
        background: var(--accent);
        color: white;
        font-size: 0.7rem;
        padding: 2px 6px;
        border-radius: 4px;
      }
      
      .version-date {
        font-size: 0.8rem;
        color: var(--text-muted);
      }
      
      .version-actions {
        display: flex;
        gap: 8px;
      }
      
      .btn-icon {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        color: var(--text-secondary);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .btn-icon:hover {
        background: var(--bg);
        color: var(--accent);
      }
      
      .version-preview {
        border-top: 1px solid var(--border);
        background: var(--bg);
      }
      
      .preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 20px;
        border-bottom: 1px solid var(--border);
      }
      
      .preview-header h4 {
        margin: 0;
        font-size: 0.95rem;
      }
      
      .preview-content {
        padding: 16px 20px;
        max-height: 300px;
        overflow: auto;
      }
      
      .preview-content pre {
        margin: 0;
        background: var(--bg-card);
        padding: 16px;
        border-radius: 8px;
        border: 1px solid var(--border);
      }
      
      .preview-content code {
        font-family: 'Fira Code', monospace;
        font-size: 0.85rem;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
      }
      
      .preview-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 12px 20px;
        border-top: 1px solid var(--border);
      }
    `;
    
    document.head.appendChild(style);
  }
  
  destroy() {
    const styles = document.getElementById('version-history-styles');
    if (styles) styles.remove();
    this.container.innerHTML = '';
  }
}

// Export for ES modules
export { VersionHistory };

// Also expose to window for non-module usage
if (typeof window !== 'undefined') {
  window.VersionHistory = VersionHistory;
}
