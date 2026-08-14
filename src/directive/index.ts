import { permission } from "./permission";

import type { App } from "vue";

/**
 * 注册所有自定义指令到 Vue 应用实例
 * @param Vue Vue 应用实例
 */
export function registerDirectives(Vue: App) {
    Vue.directive("permission", permission);
}
