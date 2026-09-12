import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
    return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("统一审计日志页面与路由契约", () => {
    it("应该注册审计日志列表路由和独立详情路由", () => {
        const router = source("src/plugin/router/modules/devops.ts");

        expect(router).toContain('name: "DevopsAuditLog"');
        expect(router).toContain('path: "audit-log"');
        expect(router).toContain('name: "DevopsAuditLogDetail"');
        expect(router).toContain('path: "audit-log/detail"');
        expect(router).toContain("@/views/Devops/AuditLog/Detail/index.vue");
        expect(router).toContain('name: "DevopsSecurityOnline"');
        expect(router).not.toContain('name: "DevopsSecurityEvent"');
        expect(router).not.toContain('name: "DevopsSessionKick"');
        expect(router).not.toContain("DevopsSecurityAudit");
        expect(router).not.toContain("DevopsOperationLog");
    });

    it("页面应该筛选分类并用 event_id 与 occurred_at 打开详情", () => {
        const page = source("src/views/Devops/AuditLog/index.vue");

        expect(page).toContain("category");
        expect(page).toContain("OPERATION");
        expect(page).toContain("SECURITY");
        expect(page).toContain("row.occurred_at");
        expect(page).toContain("formatDateTime(scope.row.occurred_at)");
        expect(page).toContain("DevopsAuditLogDetail");
        expect(page).toContain("failure_reason");
        expect(page).not.toContain("retention");
    });

    it("列表应该将分类与结果枚举显示为中文", () => {
        const page = source("src/views/Devops/AuditLog/index.vue");

        expect(page).toContain('OPERATION: "普通操作"');
        expect(page).toContain('SECURITY: "安全操作"');
        expect(page).toContain('STARTED: "开始"');
        expect(page).toContain('SUCCEEDED: "成功"');
        expect(page).toContain('FAILED: "失败"');
        expect(page).toContain('DENIED: "拒绝"');
        expect(page).toContain("formatCategory(scope.row.category)");
        expect(page).toContain("formatResult(scope.row.result)");
        expect(page).toContain('STARTED: "info"');
        expect(page).toContain('SUCCEEDED: "success"');
        expect(page).toContain('FAILED: "danger"');
        expect(page).toContain('DENIED: "warning"');
        expect(page).toContain('<el-tag :type="resultTagType(scope.row.result)" size="small">');
    });

    it("详情页应该用只读 JSON 编辑器展示未映射的变更前后快照", () => {
        const detailPath = "src/views/Devops/AuditLog/Detail/index.vue";
        expect(existsSync(resolve(process.cwd(), detailPath))).toBe(true);
        const detailPage = source(detailPath);

        expect(detailPage).toContain('import JsonEditor from "@/components/JsonEditor/index.vue";');
        expect(detailPage).toContain("detail.value?.before");
        expect(detailPage).toContain("detail.value?.after");
        expect(detailPage).not.toContain("snapshotFieldLabels");
        expect(detailPage).toContain('<el-divider content-position="left">操作信息</el-divider>');
        expect(detailPage).toContain('<el-divider content-position="left">变更前后快照对比</el-divider>');
        expect(detailPage).not.toContain("<el-card");
        expect(detailPage.match(/<JsonEditor\b/g)).toHaveLength(2);
        expect(detailPage.match(/:read-only="true"/g)).toHaveLength(2);
        expect(detailPage.match(/:expand-all="true"/g)).toHaveLength(2);
        expect(detailPage).toContain("变更前");
        expect(detailPage).toContain("变更后");
    });
});
