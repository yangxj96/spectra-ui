# spectra-ui Agent 指令

## 项目边界

- 工程主标准见 `../docs/开发指南/04-工作区工程标准.md`；当前实现和待落实检查以治理台账区分。
- Vue 3、TypeScript、Vite、Element Plus、Pinia、Vue Router Web 管理后台。
- 后端定义及实际序列化是 API 契约事实源；目标为 OpenAPI 导出、TypeScript 类型生成及漂移检查，薄 API 与页面模型手写。修改契约时完整分析并同步仓库内受影响调用方和测试。

## 实现约束

- 使用项目自定义请求客户端 `src/plugin/request/`，不要新增 Axios 或直接使用 fetch。
- 遵循现有 API、Store、Hook、组件和类型结构；不要为局部需求引入平行抽象。
- SFC 遵循项目 lint 规定的块顺序；类型保持严格，不用 `any` 绕过约束。
- 页面/组件目录 PascalCase，入口 index.vue，独立组件 PascalCase.vue；普通 TS/API/Store/Hook 文件 kebab-case。简单状态留局部，按实际职责提取 Hook，Pinia 承载生命周期明确的共享状态。
- 局部 loading 与用例反馈默认，请求层统一分类错误和处理会话；同一失败提示一次，防止旧结果覆盖，写入重试须证明安全。现有请求默认行为的迁移在治理台账中跟踪。
- `pnpm start` 已通过 `prestart` 执行启动前检查，不要重复串联格式化、lint 和类型检查。
- 修改 `logicflow-plugin-flowable` 后，先构建或监听构建插件，再验证 Web。

## 验证

- 开发中优先执行目标测试和类型检查；交付前按常见命令文档执行完整门禁。
- 前端环境与项目说明见 `docs/前端/01-前端管理后台.md`。
