import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { request } from "@/plugin/request/http";
import { useCryptoStore } from "@/plugin/store/modules/use-crypto-store";

describe("HTTP 加密响应状态", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        useCryptoStore().setConfig({ enabled: true, server_public_key: "server-public-key" });
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        code: 200,
                        msg: "",
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

    it("加密响应到达但客户端私钥未就绪时应明确失败", async () => {
        await expect(request("/api/file/uploads", { method: "GET", loading: false })).rejects.toThrow(
            "客户端解密密钥未就绪"
        );
    });
});
