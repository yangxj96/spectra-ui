# Spectra UI

> Spectra 后台管理系统的 Web 前端，基于 Vue 3 + Element Plus + Vite 8。

## 技术栈

| 技术         | 版本   | 说明       |
| ------------ | ------ | ---------- |
| Vue          | 3.5.28 | 前端框架   |
| Vite         | 8.0.11 | 构建工具   |
| Element Plus | 2.13.2 | UI 组件库  |
| TypeScript   | 5.9.3  | 类型系统   |
| Pinia        | 3.0.4  | 状态管理   |
| ECharts      | 6.0.0  | 数据可视化 |
| ESLint       | 9.39.2 | 代码检查   |
| Prettier     | 3.8.1  | 格式化     |

## 开发环境

- Node.js: 24.14.0（mise 管理）
- pnpm: 11.0.9（mise 管理）

## 常用命令

| 命令                  | 说明                                             |
| --------------------- | ------------------------------------------------ |
| `pnpm start`          | 启动开发服务器（自动 format + lint + typecheck） |
| `pnpm run build`      | 生产环境构建                                     |
| `pnpm run lint`       | ESLint 检查                                      |
| `pnpm run format`     | Prettier 格式化                                  |
| `pnpm run type-check` | TypeScript 类型检查                              |
| `pnpm run test`       | 运行测试（Vitest）                               |

## 项目结构

```
src/
├── api/            # API 模块
├── components/     # 公共组件（DictSelect, FileUpload, IconPicker 等）
├── hooks/          # 组合式函数（useTable, useFileUpload）
├── plugin/
│   ├── element/    # Element Plus 主题覆盖
│   ├── request/    # HTTP 客户端（优先级队列/去重/Token 刷新/缓存/重试）
│   ├── router/     # Vue Router 配置
│   └── store/      # Pinia 状态管理
├── utils/          # 工具函数
└── views/          # 页面组件
```

## 特性

- 自定义 HTTP 客户端（优先级队列、请求去重、Token 自动刷新）
- RBAC 权限模型
- 通用字典选择器（支持远程加载）
- 暗色模式
- 粒子动画登录页
- PDF 查看器
- 流程设计器（LogicFlow）
- 表单设计器（form-create）

## 配置

创建 `.env` 文件，设置 API 地址：

```
VITE_API_URL=https://127.0.0.1:4004/
```

## 文档

项目文档统一维护在根仓库 [spectra-docs](https://github.com/yangxj96/spectra-docs)：

| 文档            | 路径                                              |
| --------------- | ------------------------------------------------- |
| 前端概述        | `docs/20-前端/00-前端总览.md`                     |
| spectra-ui 详情 | `docs/20-前端/10-spectra-ui.md`                   |
| 命名规范        | `docs/20-知识库/50-规范与参考/20-前端命名规范.md` |

## 许可证

Apache-2.0
