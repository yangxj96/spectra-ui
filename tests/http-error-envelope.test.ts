import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { request } from "@/plugin/request/http";
import { useCryptoStore } from "@/plugin/store/modules/use-crypto-store";

const { decryptMock, verifySignatureMock } = vi.hoisted(() => ({
    decryptMock: vi.fn(),
    verifySignatureMock: vi.fn()
}));

vi.mock("@/utils/crypto/crypto-utils", () => ({
    decrypt: decryptMock,
    encrypt: vi.fn(),
    generateIv: vi.fn(),
    sign: vi.fn(),
    verifySignature: verifySignatureMock
}));

describe("HTTP 加密错误响应", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        useCryptoStore().setConfig({ enabled: true, server_public_key: "server-public-key" });
        useCryptoStore().setClientPrivateKey("client-private-key");
        decryptMock.mockResolvedValue(
            JSON.stringify({ code: 400, msg: "FILE_PART_INVALID: file extension is not allowed" })
        );
        verifySignatureMock.mockResolvedValue(true);
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        code: 200,
                        msg: "OK",
                        data: {
                            data: "encrypted-data",
                            key: "encrypted-key",
                            iv: "encrypted-iv",
                            nonce: "nonce",
                            timestamp: 1,
                            signature: "signature"
                        }
                    }),
                    { status: 200, headers: { "content-type": "application/json" } }
                )
            )
        );
    });

    it("解密后的嵌套失败响应应作为请求错误抛出", async () => {
        await expect(request("/api/file/uploads", { method: "GET", loading: false })).rejects.toMatchObject({
            code: "FILE_PART_INVALID",
            message: "FILE_PART_INVALID: file extension is not allowed"
        });
    });
});
