import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
    return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("统一审计日志 API 契约", () => {
    it("应该使用统一查询端点并支持分类筛选", () => {
        const text = source("src/api/system/audit-log-api.ts");
        const types = source("types/system/audit-log.d.ts");

        expect(text).toContain("/api/audit/page");
        expect(types).toContain('category?: "OPERATION" | "SECURITY"');
        expect(text).not.toContain("/api/security/audit");
    });

    it("详情必须同时传递分区键，导出必须复用查询过滤条件", () => {
        const text = source("src/api/system/audit-log-api.ts");

        expect(text).toContain("occurred_at");
        expect(text).toContain("/api/audit/export");
        expect(text).not.toContain("retention");
        expect(text).not.toContain("archive");
    });
});
