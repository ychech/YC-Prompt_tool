# YC 提示词工具 v2 - 数据库版

支持所有浏览器的云端版本。

## 技术栈

- **前端**: Vue 3 + Vite
- **后端**: Cloudflare Workers
- **数据库**: Cloudflare D1 (SQLite)
- **认证**: GitHub OAuth
- **部署**: Cloudflare Pages

## 功能特性

- [x] GitHub 账号登录
- [x] 数据云端同步
- [x] 所有浏览器支持（Safari/Firefox/Chrome/Edge）
- [x] 实时自动保存
- [x] 多设备同步

## 开发计划

| 功能 | 状态 |
|------|------|
| 基础 API | ✅ 完成 |
| 数据库设计 | ✅ 完成 |
| 前端界面 | 📝 待开发 |
| GitHub 登录 | 📝 待开发 |
| 部署配置 | 📝 待开发 |

## 本地开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 部署
npm run deploy
```

## 数据库初始化

```bash
wrangler d1 create yc-prompt-tool-db
wrangler d1 execute yc-prompt-tool-db --file=./schema.sql
```
