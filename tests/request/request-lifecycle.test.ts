import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RequestCancelledError } from "@/plugin/request/error";
import { request } from "@/plugin/request/fetch-client";
import { getSessionEpoch, invalidateSessionScope } from "@/plugin/request/request-lifecycle";
import { useAppStore } from "@/plugin/store/modules/use-app-store";
import { useCryptoStore } from "@/plugin/store/modules/use-crypto-store";
import { useDictStore } from "@/plugin/store/modules/use-dict-store";
import { useNotificationStore } from "@/plugin/store/modules/use-notification-store";
import { useUserStore } from "@/plugin/store/modules/use-user-store";
import { registerClientSessionReset } from "@/plugin/store/session-scope";

vi.mock("@/utils/global-utils", () => ({
    GlobalUtils: {
        toLogin: vi.fn(),
        exit: vi.fn()
    }
}));

vi.mock("@/utils/message-utils", () => ({
    MessageUtils: {
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        info: vi.fn()
    }
}));

function jsonResponse<T>(data: T, status = 200): Response {
    return new Response(JSON.stringify({ code: 200, msg: "ok", data }), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}

function errorResponse(status: number, message: string, errorCode?: string): Response {
    return new Response(JSON.stringify({ code: status, msg: message, error_code: errorCode }), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}

describe("请求会话生命周期", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        registerClientSessionReset();
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("会话切换后缓存和去重登记不跨身份复用", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(jsonResponse("A")).mockResolvedValueOnce(jsonResponse("B"));

        await expect(request<string, string>("/api/demo", { cache: true, auth: "skip" })).resolves.toBe("A");
        const before = getSessionEpoch();
        invalidateSessionScope();
        expect(getSessionEpoch()).toBe(before + 1);
        await expect(request<string, string>("/api/demo", { cache: true, auth: "skip" })).resolves.toBe("B");
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("去重请求在重试后仍能完成，不会等待自身", async () => {
        vi.useFakeTimers();
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockRejectedValueOnce(new TypeError("network")).mockResolvedValueOnce(jsonResponse("ok"));

        const first = request<string, string>("/api/retry", { retry: 1, auth: "skip" });
        const second = request<string, string>("/api/retry", { retry: 1, auth: "skip" });
        await vi.advanceTimersByTimeAsync(1000);

        await expect(first).resolves.toBe("ok");
        await expect(second).resolves.toBe("ok");
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("写入未声明幂等时不在服务端错误上重试", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValue(errorResponse(503, "服务暂不可用", "SYSTEM_UNAVAILABLE"));

        await expect(request("/api/write", { method: "POST", body: JSON.stringify({}), retry: 2 })).rejects.toThrow(
            "服务暂不可用"
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("旧会话的 401 不能清理新登录身份", async () => {
        const fetchMock = vi.mocked(fetch);
        let resolveResponse!: (response: Response) => void;
        fetchMock.mockImplementation(
            () =>
                new Promise<Response>(resolve => {
                    resolveResponse = resolve;
                })
        );

        const pending = request("/api/stale", { retryOnAuth: false });
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        const oldEpoch = getSessionEpoch();
        invalidateSessionScope();
        expect(getSessionEpoch()).toBe(oldEpoch + 1);
        useUserStore().setToken({ access_token: "new-token" } as Token);

        resolveResponse(errorResponse(401, "登录已过期", "UNAUTHENTICATED"));

        await expect(pending).rejects.toBeInstanceOf(RequestCancelledError);
        expect(useUserStore().token.access_token).toBe("new-token");
    });

    it("会话失效统一清理各 Store 的身份范围数据", () => {
        useUserStore().setToken({ access_token: "token" } as Token);
        const appStore = useAppStore();
        appStore.menus = [{ id: "menu" } as Menu];
        appStore.authorizedRouteNames = new Set(["Dashboard"]);
        appStore.menusLoaded = true;

        const notificationStore = useNotificationStore();
        notificationStore.notifications = [{ id: "notice" } as Notification];
        notificationStore.unreadCount = 2;

        const dictStore = useDictStore();
        dictStore.dicts.sys_language = [{ value: "zh-CN", label: "简体中文" }] as DictItem[];

        const cryptoStore = useCryptoStore();
        cryptoStore.setConfig({ enabled: true, server_public_key: "public" });
        cryptoStore.setClientPrivateKey("private");

        invalidateSessionScope();

        expect(useUserStore().isLoggedIn).toBe(false);
        expect(appStore.menus).toHaveLength(0);
        expect(appStore.authorizedRouteNames.size).toBe(0);
        expect(appStore.menusLoaded).toBe(false);
        expect(notificationStore.notifications).toHaveLength(0);
        expect(notificationStore.unreadCount).toBe(0);
        expect(dictStore.dicts).toEqual({});
        expect(cryptoStore.enabled).toBe(false);
        expect(cryptoStore.server_public_key).toBeNull();
        expect(cryptoStore.client_private_key).toBeNull();
    });
});
