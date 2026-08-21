import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { request } from "@/plugin/request/http";

describe("HTTP 空响应处理", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("成功的空响应不调用 Response.json", async () => {
        const response = new Response(null, { status: 200 });
        const fetchMock = vi.fn().mockResolvedValue(response);
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            request<void>("/api/security/authentication/logout", {
                method: "POST",
                loading: false,
                noBody: true
            })
        ).resolves.toBeUndefined();

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
