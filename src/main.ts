import { loadSlim } from "@tsparticles/slim";
import Particles from "@tsparticles/vue3";
import ElementPlus from "element-plus";
import { createApp } from "vue";

import { initBootstrap } from "@/api/system/bootstrap-api.ts";
import { registerDirectives } from "@/directive";
import router from "@/plugin/router";
import createStore from "@/plugin/store";
import { registerClientSessionReset } from "@/plugin/store/session-scope";
import { CommonUtils } from "@/utils/common-utils";

import App from "./App.vue";

import "@/plugin/element/index.scss";

CommonUtils.hasReload();

// 创建APP
const app = createApp(App);

app.use(ElementPlus);

app.use(Particles, {
    init: async engine => {
        await loadSlim(engine);
    }
});

// 注册自定义指令
registerDirectives(app);

// 注册 store + router
app.use(createStore());

// 会话失效时统一清理各 Store，必须在 bootstrap 和路由前完成注册
registerClientSessionReset();

// 启动配置初始化必须在路由之前，避免被 beforeEach 的 cancelAllRequests 误杀
await initBootstrap();

app.use(router);

// 挂载
app.mount("#app");
