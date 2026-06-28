# 光谱前端管理系统（Spectra UI）

> Spectra 后台管理系统的前端部分，基于 Vue 3 + TypeScript + Element Plus 构建。

[![Vue](https://img.shields.io/badge/Vue-3.5.28-green)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-purple)](https://vitejs.dev/)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.13.2-blue)](https://element-plus.org/)
[![License](https://img.shields.io/github/license/yangxj96/spectra-ui)](LICENSE)

---

## 项目说明

本项目是 [spectra-admin](https://github.com/yangxj96/spectra-admin) 的前端部分，原项目采用前后端一体的仓库结构。为降低复杂度、提升开发体验，现将前后端拆分为独立仓库：

| 仓库 | 说明 |
|------|------|
| [spectra-admin](https://github.com/yangxj96/spectra-admin) | 后端（Spring Boot 4 + Java 25） |
| **spectra-ui**（本仓库） | 前端（Vue 3 + Vite） |

---

## 技术栈

| 包名 | 版本 | 用途 |
|------|------|------|
| Vue | 3.5.28 | 渐进式前端框架 |
| Vue Router | 5.0.2 | 路由管理 |
| Pinia | 3.0.4 | 状态管理 |
| @vueuse/core | 14.2.0 | Composition API 工具库 |
| Vite | 8.0.11 | 构建工具 |
| Element Plus | 2.13.2 | UI 组件库 |
| ECharts | 6.0.0 | 数据可视化 |
| vue-echarts | 8.0.1 | Vue 封装的 ECharts 组件 |
| TypeScript | 5.9.3 | 类型系统 |
| ESLint | 9.39.2 | 代码质量检查 |
| Prettier | 3.8.1 | 代码格式化 |

---

## 开发环境

- **Node.js**: 24.14.0（通过 [mise](https://mise.jdx.dev/) 管理）
- **pnpm**: 11.0.9（通过 mise 管理）
- **npm 镜像**: [npmmirror](https://npmmirror.com/)（淘宝镜像源，配置于 `.npmrc`）

安装 mise 后，在项目根目录执行 `mise install` 即可自动安装正确的 Node 和 pnpm 版本。

---

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/yangxj96/spectra-ui.git
cd spectra-ui

# 安装依赖
pnpm install

# 启动开发服务器（自动执行 format → lint → type-check）
pnpm start
```

开发服务器默认运行在 `http://localhost:5173/`，后端 API 默认连接 `https://127.0.0.1:4004/`。

---

## 可用命令

| 命令 | 说明 |
|------|------|
| `pnpm start` | 启动开发服务器（自动执行 format + lint:fix + type-check） |
| `pnpm run build` | 生产环境构建 |
| `pnpm run preview` | 预览生产构建 |
| `pnpm run lint` | ESLint 检查 |
| `pnpm run lint:fix` | ESLint 自动修复 |
| `pnpm run format` | Prettier 格式化 |
| `pnpm run type-check` | TypeScript 类型检查 |
| `pnpm run test` | 运行测试（Vitest） |
| `pnpm run test:watch` | 监听模式运行测试 |

---

## 环境变量

在项目根目录创建 `.env` 文件（不提交至 Git）：

| 变量 | 说明 | 示例 |
|------|------|------|
| `VITE_API_URL` | 后端 API 基础地址（末尾需带 `/`） | `https://127.0.0.1:4004/` |
| `VITE_WEB_TITLE` | 网站标题 | `光谱平台` |

支持 `.env.development`、`.env.production` 等多环境配置文件。

---

## 项目结构

```
src/
  api/            # API 模块（auth/, common/, system/, user/）
  assets/         # 静态资源
  components/     # 公共组件（DictSelect, FileUpload, IconPicker 等）
  converter/      # 数据转换器（实体 → 展示格式）
  directive/      # 自定义指令（v-owner）
  hooks/          # 组合式函数（useTable, useFileUpload）
  plugin/
    element/      # Element Plus 主题/SCSS 覆盖
    request/      # HTTP 客户端（http.ts, api.ts, auth.ts, cache.ts）
    router/       # Vue Router 配置
    store/        # Pinia 状态管理（app, dict, props, user）
  utils/          # 工具函数（common, crypto, message, route, verify）
  views/          # 页面组件（Dashboard, Login, Monitor, System, Example, Common）
types/            # 全局类型声明
tests/            # 测试文件
```

---

## 特性

- **自定义 HTTP 客户端**：支持请求优先级队列、自动去重、Token 自动刷新、缓存、重试
- **RBAC 权限模型**：用户、角色、菜单、按钮级权限控制
- **字典组件**：通用字典选择器，支持远程加载
- **暗色模式**：基于 @vueuse/core 的响应式暗色模式切换
- **粒子动画登录页**：使用 tsparticles 实现的登录页背景效果
- **PDF 查看器**：集成 @embedpdf 的 PDF 在线预览
- **流程设计器**：集成 LogicFlow 的流程图编辑能力
- **表单设计器**：集成 form-create 的可视化表单设计

---

## 相关项目

- [spectra-admin](https://github.com/yangxj96/spectra-admin) — 后端服务（Spring Boot 4 + Java 25 + PostgreSQL）

---

## 许可证

本项目基于 [Apache-2.0](LICENSE) 开源协议。

---

> **Spectra** —— 简洁有力，照亮你的开发之路
