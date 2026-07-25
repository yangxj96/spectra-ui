import { createPinia } from "pinia";
import { createPersistedState } from "pinia-plugin-persistedstate";

/**
 * 创建并配置 Pinia 实例
 * 启用 localStorage 持久化
 * @returns 配置好持久化插件的 Pinia 实例
 */
export default function createStore() {
    const pinia = createPinia();
    pinia.use(createPersistedState({ storage: localStorage }));
    return pinia;
}
