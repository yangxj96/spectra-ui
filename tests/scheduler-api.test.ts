import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
    return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Quartz 调度管理 API 契约", () => {
    it("应该只暴露 Quartz 原生资源端点", () => {
        const text = source("src/api/system/scheduler-api.ts");

        expect(text).toContain("/api/scheduler/quartz");
        expect(text).toContain("/job-types");
        expect(text).toContain("/jobs");
        expect(text).toContain("/triggers");
        expect(text).toContain("/execution-history");
        expect(text).not.toContain("/api/scheduler/admin");
    });

    it("应该移除旧 LOOP 和执行状态机管理端点", () => {
        const text = source("src/api/system/scheduler-api.ts");

        expect(text).not.toContain("/loops");
        expect(text).not.toContain("/commands");
        expect(text).not.toContain("/errors");
        expect(text).not.toContain("/operations");
        expect(text).not.toContain("retryExecution");
        expect(text).not.toContain("resolveExecution");
    });
});
