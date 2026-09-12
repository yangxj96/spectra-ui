import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
    return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("统一审计日志页面与路由契约", () => {
    it("应该只有一个审计日志运维路由", () => {
        const router = source("src/plugin/router/modules/devops.ts");

        expect(router).toContain('name: "DevopsAuditLog"');
        expect(router).toContain('path: "audit-log"');
        expect(router).not.toContain("DevopsSecurityAudit");
        expect(router).not.toContain("DevopsOperationLog");
    });

    it("页面应该筛选分类并用 event_id 与 occurred_at 打开详情", () => {
        const page = source("src/views/Devops/AuditLog/index.vue");

        expect(page).toContain("category");
        expect(page).toContain("OPERATION");
        expect(page).toContain("SECURITY");
        expect(page).toContain("row.occurred_at");
        expect(page).toContain("failure_reason");
        expect(page).not.toContain("retention");
    });
});
