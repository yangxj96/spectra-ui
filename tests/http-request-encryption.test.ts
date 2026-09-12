import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { request } from "@/plugin/request/http";
import { useCryptoStore } from "@/plugin/store/modules/use-crypto-store";

const { decryptMock, encryptMock, verifySignatureMock } = vi.hoisted(() => ({
    decryptMock: vi.fn(),
    encryptMock: vi.fn(),
    verifySignatureMock: vi.fn()
}));

vi.mock("@/utils/crypto/crypto-utils", () => ({
    decrypt: decryptMock,
    encrypt: encryptMock,
    generateIv: vi.fn().mockReturnValue("0".repeat(24)),
    sign: vi.fn(),
    verifySignature: verifySignatureMock
}));

describe("HTTP 请求加密", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        useCryptoStore().setConfig({ enabled: true, server_public_key: "server-public-key" });
        encryptMock.mockResolvedValue({ encryptedData: "encrypted-data", encryptedKey: "encrypted-key" });
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ code: 200, msg: "OK", data: { accepted: true } }), {
                    status: 200,
                    headers: { "content-type": "application/json" }
                })
            )
        );
    });

    it("登录前未获取客户端私钥时应生成无填充 Base64URL nonce", async () => {
        await request("/api/security/authentication/login", {
            method: "POST",
            body: JSON.stringify({ username: "probe", password: "probe" }),
            loading: false
        });

        const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
        const envelope = JSON.parse(String(options.body)) as { nonce: string };
        expect(envelope.nonce).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(envelope.nonce).not.toContain("=");
    });

    it("所有 Web 请求都应声明大写客户端类型", async () => {
        await request("/api/audit/page", { loading: false });

        const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
        expect(options.headers).toMatchObject({ "X-Client-Type": "WEB" });
    });
});
