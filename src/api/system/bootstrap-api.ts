import { request } from "@/plugin/request/http.ts";
import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";
import { useCryptoStore } from "@/plugin/store/modules/use-crypto-store.ts";

/**
 * 初始化 Web 端启动配置。
 * 系统公开信息、通信加密配置和初始化状态在此处一次获取。
 */
export async function initBootstrap(): Promise<void> {
    try {
        const data = await request<SystemBootstrap, "/api/system/bootstrap">("/api/system/bootstrap", {
            method: "GET",
            loading: false
        });
        useCryptoStore().setConfig(data.crypto);
        useAppStore().setBootstrap(data);
        console.log(
            `[Bootstrap] 初始化完成: system=${data.system.name}, initialized=${data.initialization.initialized}`
        );
    } catch (error) {
        console.warn("[Bootstrap] 初始化失败，将由页面按需回退请求:", error);
        useCryptoStore().setConfig({ enabled: false, server_public_key: null });
        useAppStore().markBootstrapUnavailable();
    }
}
