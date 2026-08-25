# spectra-ui Agent 指令

## 项目边界

- Vue 3、TypeScript、Vite、Element Plus、Pinia、Vue Router Web 管理后台。
- 修改 Web 代码时使用 `$spectra-ui-spec`。
- 后端 API 契约由 `spectra-admin` 定义；修改端点、字段或响应时同步更新 `src/api/` 和相关测试。

## 实现约束

- 使用项目自定义请求客户端 `src/plugin/request/`，不要新增 Axios 或直接使用 fetch。
- 遵循现有 API、Store、Hook、组件和类型结构；不要为局部需求引入平行抽象。
- SFC 遵循项目 lint 规定的块顺序；类型保持严格，不用 `any` 绕过约束。
- `pnpm start` 已通过 `prestart` 执行启动前检查，不要重复串联格式化、lint 和类型检查。
- 修改 `logicflow-plugin-flowable` 后，先构建或监听构建插件，再验证 Web。

## 验证

- 开发中优先执行目标测试或 `pnpm run type-check`。
- 交付前按需执行 `pnpm run format:check`、`pnpm run lint`、`pnpm run type-check`、`pnpm run test`、`pnpm run build`。
- 完整命令和环境说明见 `docs/50-开发指南/20-常见命令.md` 与 `docs/20-前端/10-spectra-ui.md`。
