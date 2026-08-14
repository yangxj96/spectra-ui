import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { refreshToken } from "@/plugin/request/auth";
import { useUserStore } from "@/plugin/store/modules/use-user-store";

const { refreshMock } = vi.hoisted(() => ({
    refreshMock: vi.fn()
}));

vi.mock("@/api/auth/auth-api", () => ({
    AuthApi: {
        refresh: refreshMock
    }
}));

const token = {
    access_token: "access-2",
    refresh_token: "refresh-2",
    expires_in: 300,
    roles: [],
    authorities: []
} as Token;

describe("Web Refresh Token single-flight", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        refreshMock.mockReset();
    });

    it("并发请求只发起一次刷新并共享新 Token", async () => {
        const store = useUserStore();
        store.token = { access_token: "access-1", refresh_token: "refresh-1" } as Token;
        refreshMock.mockResolvedValue(token);

        const [first, second] = await Promise.all([refreshToken(), refreshToken()]);

        expect(refreshMock).toHaveBeenCalledTimes(1);
        expect(refreshMock).toHaveBeenCalledWith("refresh-1");
        expect(first).toBe(token);
        expect(second).toBe(token);
        expect(store.token).toEqual(token);
    });

    it("刷新失败时所有等待者都收到 null，不会悬挂", async () => {
        const store = useUserStore();
        store.token = { access_token: "access-1", refresh_token: "refresh-1" } as Token;
        refreshMock.mockRejectedValue(new Error("expired"));

        await expect(Promise.all([refreshToken(), refreshToken()])).resolves.toEqual([null, null]);
        expect(refreshMock).toHaveBeenCalledTimes(1);
    });

    it("没有 Refresh Token 时不调用后端", async () => {
        useUserStore().token = {} as Token;

        await expect(refreshToken()).resolves.toBeNull();
        expect(refreshMock).not.toHaveBeenCalled();
    });
});
