import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
    return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("缓存监控与维护 API 契约", () => {
    it("应该使用固定 API 路径和自定义 request client", () => {
        const text = source("src/api/system/cache-management-api.ts");

        expect(text).toContain("/api/cache/monitor/overview");
        expect(text).toContain("/api/cache/monitor/regions");
        expect(text).toContain("/api/cache/monitor/security");
        expect(text).toContain("/api/cache/admin/business/clear/preview");
        expect(text).toContain("/api/cache/admin/security/session/candidates");
        expect(text).toContain("/api/cache/admin/security/verification/candidates");
        expect(text).toContain("/api/cache/admin/security/login-failure/candidates");
        expect(text).toContain("/api/cache/admin/security/nonce/invalidate-all");
        expect(text).toContain('import { get, post } from "@/plugin/request/api.ts"');
        expect(text).not.toContain("redis");
        expect(text).not.toContain("raw_key");
        expect(text).not.toContain("flushdb");
    });

    it("应该让路径参数使用 pathParams，并以 snake_case 发送维护请求", () => {
        const text = source("src/api/system/cache-management-api.ts");

        expect(text).toContain("pathParams: { operationId }");
        expect(text).toContain("region_codes");
        expect(text).toContain("all_regions");
        expect(text).toContain("confirmation_phrase");
        expect(text).toContain("invalidateNonce");
        expect(text).toContain("invalidateAllNonces");
        expect(text).toContain("searchSessionCandidates");
        expect(text).toContain("searchVerificationCandidates");
        expect(text).toContain("searchLoginFailureCandidates");
        expect(text).toContain("keyword");
        expect(text).toContain("type");
    });

    it("应该把缓存清理路由指向真实页面", () => {
        const text = source("src/plugin/router/modules/devops.ts");

        expect(text).toContain("@/views/Devops/SystemMaintenance/CacheClear/index.vue");
    });
});
