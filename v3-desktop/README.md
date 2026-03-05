# YC 提示词工具 v3 - 桌面版

原生桌面应用，完全离线使用。

## 技术方案对比

| 方案 | 优点 | 缺点 | 推荐 |
|------|------|------|------|
| **Tauri** | 体积小、性能好、安全 | Rust 学习成本 | ⭐ 首选 |
| **Electron** | 生态成熟、文档丰富 | 体积大、内存占用高 | 备选 |
| **Flutter** | 跨平台、UI 统一 | 需要重写 UI | 备选 |

## 推荐方案：Tauri

```
前端: Vue/React + TypeScript
后端: Rust
打包: Tauri
```

## 功能特性

- [ ] Windows/Mac/Linux 三平台支持
- [ ] 完全离线，无需网络
- [ ] 系统级文件关联（双击 .json 打开）
- [ ] 原生菜单和快捷键
- [ ] 自动更新
- [ ] 系统托盘

## 开发计划

| 阶段 | 内容 | 时间 |
|------|------|------|
| Phase 1 | 基础框架搭建 | 2周 |
| Phase 2 | 文件读写功能 | 2周 |
| Phase 3 | UI 移植优化 | 2周 |
| Phase 4 | 打包发布 | 1周 |

## 项目结构

```
v3-desktop/
├── src/           # 前端代码
├── src-tauri/     # Rust 后端
├── dist/          # 构建输出
└── package.json
```

## 快速开始

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 Tauri
npm install -g @tauri-apps/cli

# 开发模式
cargo tauri dev

# 构建
cargo tauri build
```
