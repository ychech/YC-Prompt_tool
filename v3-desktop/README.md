# YC 提示词工具 v3 - 桌面版

基于 Tauri + Vue 3 的跨平台桌面应用。

## 技术栈

- **前端框架**: Vue 3 + Vite
- **后端**: Rust (Tauri)
- **UI**: 原生 CSS (无 UI 库依赖)
- **打包**: Tauri CLI

## 功能特性

- ✅ **完全离线** - 无需网络，本地文件存储
- ✅ **跨平台** - Windows / macOS / Linux
- ✅ **原生体验** - 系统级快捷键、菜单、托盘
- ✅ **文件关联** - 双击 .json 文件打开
- ✅ **自动保存** - Ctrl+S 直接保存
- ✅ **深色模式** - 支持亮色/暗色主题

## 项目结构

```
v3-desktop/
├── src/                    # 前端代码
│   ├── main.js            # 入口
│   └── components/        # Vue 组件
├── src-tauri/             # Rust 后端
│   ├── src/
│   │   └── main.rs        # 主程序
│   ├── Cargo.toml         # Rust 依赖
│   └── tauri.conf.json    # Tauri 配置
├── index.html             # 前端入口
├── package.json           # Node 依赖
├── vite.config.js         # Vite 配置
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 Node 依赖
npm install
```

### 2. 开发模式

```bash
# 同时启动前端和后端
npm run tauri:dev
```

### 3. 构建发布

```bash
# 构建所有平台
npm run tauri:build

# 构建特定平台
npm run tauri:build -- --target x86_64-pc-windows-msvc
npm run tauri:build -- --target x86_64-apple-darwin
npm run tauri:build -- --target x86_64-unknown-linux-gnu
```

## 系统快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+S | 保存 |
| Ctrl+O | 打开文件 |
| Ctrl+N | 新建提示词 |
| Ctrl+F | 搜索 |
| Ctrl+Shift+N | 新建窗口 |

## 数据存储

- **Windows**: `%APPDATA%/com.ychech.prompt-tool/`
- **macOS**: `~/Library/Application Support/com.ychech.prompt-tool/`
- **Linux**: `~/.config/com.ychech.prompt-tool/`

## 开发计划

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 基础框架 + 文件操作 | ✅ 完成 |
| Phase 2 | UI 界面 + 编辑器 | 📝 待开发 |
| Phase 3 | 高级功能（版本历史、搜索） | 📝 待开发 |
| Phase 4 | 打包发布 | 📝 待开发 |

## 与 v1/v2 的区别

| 特性 | v1 轻版 | v2 数据库版 | v3 桌面版 |
|------|---------|------------|----------|
| 网络依赖 | ❌ 不需要 | ✅ 需要 | ❌ 不需要 |
| 浏览器限制 | ✅ Chrome/Edge only | ✅ 所有浏览器 | ✅ 原生应用 |
| 数据存储 | 本地文件 | 云端数据库 | 本地文件 |
| 多设备同步 | ❌ | ✅ | ❌ |
| 启动速度 | 快 | 依赖网络 | 极快 |
| 系统集成 | ❌ | ❌ | ✅ |

## 许可证

MIT License
