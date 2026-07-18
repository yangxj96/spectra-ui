# AGENTS.md

## 项目概述

Vue 3 SPA 管理后台（光谱后端管理系统）— `spectra-admin` 的 **Web 前端**。TypeScript, Vite, Element Plus, Pinia, Vue Router。

- 后端 API：`spectra-admin`（Spring Boot，端口 4004）
- 开发服务器：端口 5173
- 所有 API 调用指向 `VITE_API_URL`（默认 `https://127.0.0.1:4004/`）

编码规范由 `spectra/spectra-ui-spec` skill 控制（修改前端代码时自动加载）。

## 常用命令

- `pnpm start` — 开发服务器（**先执行 format + lint:fix + type-check**，通过 `prestart` 钩子）
- `pnpm run build` — 生产构建
- `pnpm run lint` — ESLint（带缓存）
- `pnpm run lint:fix` — ESLint + 自动修复
- `pnpm run format` — Prettier
- `pnpm run type-check` — vue-tsc（composite: false）
- `pnpm run test` — Vitest 单次运行
- `pnpm run test:watch` — Vitest 监视模式

验证顺序：`format → lint:fix → type-check → test`

## 工具链

- Vite 8, Vue 3.5, TypeScript 5.9, ESLint 9, Prettier 3
- 测试：Vitest 4 + happy-dom + @vue/test-utils + @pinia/testing
- Node/pnpm 版本及 npm 镜像配置见根 `AGENTS.md`

## 项目结构

```
src/
  api/            # API 模块（auth/, common/, system/, user/）
  assets/         # 静态资源
  components/     # 共享组件（DictSelect, FileUpload, IconPicker 等）
  converter/      # 数据转换器（实体 → 显示格式）
  directive/      # 自定义 Vue 指令（v-owner）
  hooks/          # 组合式函数（useTable, useFileUpload）
  plugin/
    element/      # Element Plus 主题/scss 覆盖
    request/      # HTTP 客户端（http.ts, api.ts, auth.ts, cache.ts）
    router/       # Vue Router 配置
    store/        # Pinia stores（模块：app, dict, props, user）
  utils/          # 工具函数（common, crypto, message, route, verify）
  views/          # 页面组件（Dashboard, Login, Monitor, System, Example, Common）
types/            # 全局 .d.ts 类型声明
tests/            # 测试文件（扁平结构，无子目录）
```

## HTTP 客户端

自定义 `request()` 在 `src/plugin/request/http.ts` 中——非 Axios。核心特性：

- Token 401 自动刷新
- 请求去重（进行中映射表）和重复请求时中止上一个
- 优先级队列：`high`(10) / `normal`(6) / `low`(2) 并发限制
- 可选缓存和重试
- 路径参数通过模板字面量：`request("/api/users/{id}", { pathParams: { id } })`
- FormData 上传自动将 snake_case 键转为 camelCase

API 辅助函数：`get()`, `post()`, `put()`, `del()`, `upload()`, `download()` 在 `src/plugin/request/api.ts`。

## 测试

- 测试文件位于 `tests/`（扁平结构），命名格式 `*.test.ts`
- 设置文件：`tests/setup.ts` — 全局 stub `RouterLink`
- 测试使用 `createTestingPinia`、`@vue/test-utils` mount 和 `vi.mock` 处理 stores
- 运行单个测试：`pnpm run test -- DictSelect`（vitest name filter）

## 环境变量

- `VITE_API_URL` — 后端 API 基础 URL（指向 `spectra-admin`）
- `VITE_WEB_TITLE` — 页面标题
- 开发默认值在 `.env`（https://127.0.0.1:4004/），生产覆盖在 `.env.production`

## 注意事项

- `pnpm start` 会在启动开发服务器前自动执行 format、lint 和 type-check（通过 `prestart` 脚本）。不要手动串联这些命令。
- `pnpm-workspace.yaml` 存在但仅配置了 `allowBuilds`——本项目不是 monorepo。
- 视图使用 `vue/block-order` 规则：SFC 中 script 必须在 template 之前。
- `RequestOptions` 类型使用模板字面量类型实现类型安全的路径参数——添加新 API 函数时请遵循该模式。
- `RequestOptions` 的泛型 `U extends string` 将 URL 字符串传入以实现路径参数类型推断。
- API 端点和响应格式由 `spectra-admin` 定义——若后端更改端点，需同步更新此处的 `src/api/` 模块。
