import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
    return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Quartz 调度页面契约", () => {
    it("任务页面应该展示 Job、触发配置和执行历史入口", () => {
        const text = source("src/views/Devops/Scheduler/Task/index.vue");

        expect(text).toContain("任务键");
        expect(text).toContain("触发类型");
        expect(text).toContain("下次触发时间");
        expect(text).toContain("执行历史");
        expect(text).toContain("新增任务");
        expect(text).not.toContain("新增 Job");
        expect(text).not.toContain("LOOP");
        expect(text).not.toContain("OPS");
        expect(text).not.toContain("SYSTEM");
        expect(text).not.toContain("SchedulerOperationHistory");
        expect(text).not.toContain("LoopRuntimePanel");
    });

    it("任务页面应该将触发类型和调度配置分列展示", () => {
        const text = source("src/views/Devops/Scheduler/Task/index.vue");

        expect(text).toContain('<el-table-column label="触发类型"');
        expect(text).toContain('<el-table-column label="调度配置" min-width="130"');
        expect(text).toContain('<el-tag size="small"');
        expect(text).toContain("{{ triggerSchedule(scope.row.trigger) }}");
        expect(text).not.toContain('<el-table-column label="Trigger"');
    });

    it("任务页面应该用任务键和类型键区分任务名称与任务类型", () => {
        const text = source("src/views/Devops/Scheduler/Task/index.vue");

        expect(text).toContain('<el-table-column label="任务名称" prop="display_name"');
        expect(text).toContain('<el-table-column label="任务键" prop="job_key"');
        expect(text).toContain('<el-table-column label="任务类型"');
        expect(text).toContain('prop="type_key"');
        expect(text).not.toContain('<el-table-column label="JobKey"');
    });

    it("任务编辑器只能选择白名单 Job 和受约束的 JSON 参数", () => {
        const text = source("src/views/Devops/Scheduler/Task/components/TaskEdit/index.vue");

        expect(text).toContain("type_key");
        expect(text).toContain("parameter_fields");
        expect(text).toContain("misfire");
        expect(text).not.toContain("BEAN");
        expect(text).not.toContain("Bean");
        expect(text).not.toContain("Method");
        expect(text).not.toContain("SQL");
        expect(text).not.toContain("script_content");
        expect(text).not.toContain("class_name");
    });

    it("执行历史页面应该移除 UNKNOWN 解决和自动重试操作", () => {
        const text = source("src/views/Devops/Scheduler/Execution/index.vue");

        expect(text).toContain("执行历史");
        expect(text).toContain('<el-form-item label="任务键">');
        expect(text).toContain('<el-form-item label="触发器键">');
        expect(text).toContain('<el-table-column label="触发器"');
        expect(text).toContain('<el-descriptions-item label="任务类型">');
        expect(text).not.toContain('<el-form-item label="JobKey">');
        expect(text).not.toContain('<el-form-item label="TriggerKey">');
        expect(text).not.toContain('<el-table-column label="Trigger"');
        expect(text).not.toContain('<el-table-column label="fire_instance_id"');
        expect(text).not.toContain('<el-descriptions-item label="fire_instance_id"');
        expect(text).not.toContain('<el-table-column label="耗时(ms)"');
        expect(text).toContain("fire_instance_id");
        expect(text).toContain("result_summary");
        expect(text).not.toContain("UNKNOWN");
        expect(text).not.toContain("resolve");
        expect(text).not.toContain("retry");
        expect(text).not.toContain("cancel");
    });
});
