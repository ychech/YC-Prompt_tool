# YC 提示词工具 v3 - 桌面版

基于 Tauri 的跨平台桌面应用，一套代码同时支持 Windows、macOS、Linux。

## 跨平台特性

| 平台 | 支持状态 | 安装包格式 |
|------|---------|-----------|
| **Windows** | ✅ 完整支持 | `.msi` (安装版), `.exe` (便携版) |
| **macOS** | ✅ 完整支持 | `.dmg` (Intel + Apple Silicon) |
| **Linux** | ✅ 完整支持 | `.deb` (Debian/Ubuntu), `.AppImage` (通用) |

## 界面一致性

**相同点（所有平台）：**
- ✅ 完全相同的 UI 界面（HTML/CSS 渲染）
- ✅ 相同的功能和快捷键
- ✅ 相同的数据格式和存储方式

**平台差异（自动适配）：**

| 特性 | Windows | macOS | Linux |
|------|---------|-------|-------|
| 窗口控制按钮 | 右上角 | 左上角 | 右上角 |
| 系统菜单 | 窗口内菜单栏 | 顶部全局菜单栏 | 窗口内菜单栏 |
| 快捷键 | Ctrl+S | ⌘+S | Ctrl+S |
| 文件路径 | `C:\Users\...` | `/Users/...` | `/home/...` |
| 字体渲染 | DirectWrite | CoreText | FreeType |

## 技术栈

```
前端: Vue 3 + Vite + 原生 CSS
后端: Rust (Tauri)
渲染: WebView2 (Win) / WebKit (Mac) / WebKitGTK (Linux)
打包: Tauri CLI
```

## 项目结构

```
v3-desktop/
├── src/                          # 前端代码（跨平台共享）
│   ├── main.js                  # 入口（Vue 3）
│   ├── components/              # Vue 组件
│   │   ├── Editor.vue          # Markdown 编辑器
│   │   ├── Sidebar.vue         # 侧边栏
│   │   └── PromptCard.vue      # 提示词卡片
│   └── styles/                  # 共享样式
│       └── global.css
├── src-tauri/                    # Rust 后端（跨平台共享）
│   ├── src/
│   │   └── main.rs             # 主程序 + 文件操作
│   ├── Cargo.toml              # Rust 依赖
│   └── tauri.conf.json         # 打包配置
├── icons/                        # 应用图标（各平台）
│   ├── icon.ico               # Windows
│   ├── icon.icns              # macOS
│   └── 32x32.png, 128x128.png # Linux
└── package.json
```

## 平台特定的代码处理

### Rust 后端（自动处理）

```rust
// src-tauri/src/main.rs

// 文件路径自动适配各平台
#[command]
fn get_data_dir() -> PathBuf {
    // Windows: %APPDATA%\com.ychech.prompt-tool\
    // macOS: ~/Library/Application Support/com.ychech.prompt-tool/
    // Linux: ~/.config/com.ychech.prompt-tool/
    app_dirs::app_dir(AppDataType::UserData, "com.ychech", "prompt-tool")
}

// 快捷键自动适配
#[cfg(target_os = "macos")]
const SAVE_SHORTCUT: &str = "Cmd+S";

#[cfg(not(target_os = "macos"))]
const SAVE_SHORTCUT: &str = "Ctrl+S";
```

### 前端（运行时检测）

```javascript
// 检测平台
const platform = await invoke('get_platform'); // 'win32' | 'darwin' | 'linux'

// 适配快捷键显示
const saveShortcut = platform === 'darwin' ? '⌘+S' : 'Ctrl+S';

// 适配标题栏
const showTitlebar = platform !== 'darwin'; // macOS 使用全局菜单
```

## 构建命令

```bash
# 开发模式（自动检测平台）
npm run tauri:dev

# 构建当前平台
npm run tauri:build

# 构建特定平台（需要交叉编译环境）
# Windows
npm run tauri:build -- --target x86_64-pc-windows-msvc

# macOS Intel
npm run tauri:build -- --target x86_64-apple-darwin

# macOS Apple Silicon
npm run tauri:build -- --target aarch64-apple-darwin

# Linux
npm run tauri:build -- --target x86_64-unknown-linux-gnu
```

## 数据存储位置

| 平台 | 路径 |
|------|------|
| Windows | `%APPDATA%\com.ychech.prompt-tool\prompts_data.json` |
| macOS | `~/Library/Application Support/com.ychech.prompt-tool/prompts_data.json` |
| Linux | `~/.config/com.ychech.prompt-tool/prompts_data.json` |

## 与 v1/v2 的区别

| 特性 | v1 轻版 | v2 数据库版 | v3 桌面版 |
|------|---------|------------|----------|
| 运行环境 | 浏览器 | 浏览器+云端 | 原生应用 |
| 网络依赖 | ❌ 不需要 | ✅ 需要 | ❌ 不需要 |
| 跨平台 | ⚠️ 仅 Chrome/Edge | ✅ 所有浏览器 | ✅ 三平台原生 |
| 数据存储 | 本地文件 | 云端数据库 | 本地文件 |
| 启动速度 | 快 | 依赖网络 | 极快 |
| 系统集成 | ❌ | ❌ | ✅ 文件关联、快捷键 |
| 离线使用 | ✅ | ⚠️ 需先登录 | ✅ 完全离线 |

## 界面预览

```
┌─────────────────────────────────────────┐
│  ○ ○ ○  YC 提示词工具 v3          ─ □ ✕ │  ← macOS 标题栏在左上角
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────────────┐  │
│  │ 分类     │  │ 搜索框...    [+新建]│  │
│  │ ├── 全部 │  ├─────────────────────┤  │
│  │ ├── 写作 │  │ ┌─────────────────┐ │  │
│  │ ├── 编程 │  │ │ 提示词卡片 1    │ │  │
│  │ └── ...  │  │ └─────────────────┘ │  │
│  │          │  │ ┌─────────────────┐ │  │
│  │ 标签     │  │ │ 提示词卡片 2    │ │  │
│  │ └── ...  │  │ └─────────────────┘ │  │
│  └──────────┘  └─────────────────────┘  │
└─────────────────────────────────────────┘
```

## 开发计划

| 阶段 | 内容 | 预计时间 |
|------|------|---------|
| Phase 1 | 基础框架 + 文件操作 | ✅ 完成 |
| Phase 2 | UI 组件 + 编辑器 | 📝 进行中 |
| Phase 3 | 平台优化 + 打包 | 待开始 |
| Phase 4 | 发布到各平台应用商店 | 待开始 |

## 许可证

MIT License
