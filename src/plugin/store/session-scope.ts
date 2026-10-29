import { registerSessionInvalidationHandler } from "@/plugin/request/request-lifecycle";

import { useAppStore } from "./modules/use-app-store";
import { useCryptoStore } from "./modules/use-crypto-store";
import { useDictStore } from "./modules/use-dict-store";
import { useNotificationStore } from "./modules/use-notification-store";
import { useUserStore } from "./modules/use-user-store";

let registered = false;

/**
 * 注册会话范围清理入口。
 *
 * 请求层只负责判定会话失效，本模块集中清理各 Store 的身份范围数据，
 * 避免请求层反向依赖业务 Store 造成循环引用。
 */
export function registerClientSessionReset(): void {
    if (registered) return;
    registered = true;
    registerSessionInvalidationHandler(() => {
        useUserStore().clearSession();
        useAppStore().resetSessionScope();
        useNotificationStore().resetSessionScope();
        useDictStore().resetSessionScope();
        useCryptoStore().resetSessionScope();
    });
}
