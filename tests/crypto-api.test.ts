import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchClientPrivateKey, initCrypto } from "@/api/system/crypto-api";
import { useCryptoStore } from "@/plugin/store/modules/use-crypto-store";

const { requestMock } = vi.hoisted(() => ({
    requestMock: vi.fn()
}));

vi.mock("@/plugin/request/http.ts", () => ({
    request: requestMock
}));

describe("crypto-api", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        requestMock.mockReset();
    });

    it("启用加密后应立即获取客户端私钥", async () => {
        requestMock
            .mockResolvedValueOnce({ enabled: true, server_public_key: "server-public-key" })
            .mockResolvedValueOnce({ private_key: "client-private-key" });

        await initCrypto();

        expect(requestMock).toHaveBeenCalledTimes(2);
        expect(requestMock.mock.calls[1]?.[0]).toBe("/api/system/crypto/keypair/client-private");
        expect(useCryptoStore().client_private_key).toBe("client-private-key");
    });

    it("加密未启用时不请求客户端私钥", async () => {
        useCryptoStore().setConfig({ enabled: false, server_public_key: null });

        await fetchClientPrivateKey();

        expect(requestMock).not.toHaveBeenCalled();
    });
});
