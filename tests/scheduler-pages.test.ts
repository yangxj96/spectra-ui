import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
    return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("调度管理页面契约", () => {
    it("任务编辑器不应暴露 Bean、Method、SQL 或动态执行字段", () => {
        const text = source("src/views/Devops/Scheduler/Task/components/TaskEdit/index.vue");
        expect(text).toContain("注册处理器");
        expect(text).toContain("parameter_schema");
        expect(text).not.toContain("BEAN名称");
        expect(text).not.toContain("执行方法");
        expect(text).not.toContain("SQL");
    });

    it("任务页面按类型区分 OPS、SYSTEM 和 LOOP 操作", () => {
        const text = source("src/views/Devops/Scheduler/Task/index.vue");
        expect(text).toContain("scope.row.job_type === 'LOOP'");
        expect(text).toContain("scope.row.job_type === 'OPS'");
        expect(text).toContain("scope.row.job_type !== 'LOOP'");
        expect(source("src/plugin/router/modules/devops.ts")).toContain("@/views/Devops/Scheduler/Execution/index.vue");
    });

    it("任务页沿用用户管理页布局并使用纯中文类型和范围标签", () => {
        const text = source("src/views/Devops/Scheduler/Task/index.vue");
        const nameColumn = text.indexOf('<el-table-column label="名称" prop="name"');
        const jobKeyColumn = text.indexOf('<el-table-column label="任务键" prop="job_key"');

        expect(text).toContain('class="box__search"');
        expect(text).toContain('class="box__body"');
        expect(text).toContain('OPS: "运维"');
        expect(text).toContain('SYSTEM: "系统"');
        expect(text).toContain('LOOP: "循环"');
        expect(text).toContain('PER_INSTANCE: "每实例"');
        expect(text).toContain('SINGLETON: "单实例"');
        expect(text).not.toContain("OPS 运维");
        expect(text).not.toContain("SYSTEM 系统");
        expect(text).not.toContain("LOOP 循环");
        expect(nameColumn).toBeGreaterThan(-1);
        expect(jobKeyColumn).toBeGreaterThan(nameColumn);
    });

    it("任务页移除执行记录入口并使用运维任务抽屉", () => {
        const taskText = source("src/views/Devops/Scheduler/Task/index.vue");
        const editText = source("src/views/Devops/Scheduler/Task/components/TaskEdit/index.vue");

        expect(taskText).toContain("新增运维任务");
        expect(taskText).not.toContain("执行记录");
        expect(taskText).not.toContain("DevopsSchedulerExecution");
        expect(editText).toContain("<el-drawer");
        expect(editText).toContain('direction="rtl"');
        expect(editText).toContain("新增运维任务");
        expect(editText).toContain("修改运维任务");
        expect(editText).not.toContain("<el-dialog");
        expect(editText).not.toContain("OPS 调度任务");
    });

    it("归档运维任务提供重新注册，且不允许直接编辑归档定义", () => {
        const text = source("src/views/Devops/Scheduler/Task/index.vue");

        expect(text).toContain("scope.row.job_type === 'OPS' && scope.row.definition_status === 'ARCHIVED'");
        expect(text).toContain("重新注册");
        expect(text).toContain("scope.row.job_type === 'OPS' && scope.row.definition_status === 'REGISTERED'");
    });

    it("运维任务表单统一输入宽度并使用项目级 JSON 编辑器", () => {
        const text = source("src/views/Devops/Scheduler/Task/components/TaskEdit/index.vue");

        expect(text).toContain('import JsonEditor from "@/components/JsonEditor/index.vue";');
        expect(text).toContain('<JsonEditor v-model="parameterValue"');
        expect(text).toContain('class="form-control"');
        expect(text).toContain('label="错过策略"');
        expect(text).toContain('placeholder="请选择错过策略"');
        expect(text).toContain('label="并发策略"');
        expect(text).toContain('placeholder="请选择并发策略"');
        expect(text).not.toContain('v-model="parameterText"');
    });

    it("执行策略和任务参数使用紧凑的 JSON 编辑器字段", () => {
        const text = source("src/views/Devops/Scheduler/Task/components/TaskEdit/index.vue");

        expect(text).toContain("const policyValue = ref<JsonValue>({});");
        expect(text).toContain('<JsonEditor v-model="policyValue"');
        expect(text).toContain('<JsonEditor v-model="parameterValue"');
        expect(text).toContain('class="json-editor-field"');
        expect(text).toContain('class="hint json-editor-hint"');
        expect(text).not.toContain("const policyText = ref");
        expect(text).not.toContain('v-model="policyText"');
    });

    it("JSON 编辑器字段不使用固定高度撑开提示间距", () => {
        const text = source("src/views/Devops/Scheduler/Task/components/TaskEdit/index.vue");

        expect(text).not.toContain("height: 180px");
        expect(text).toContain("height: auto");
    });

    it("任务编辑抽屉收紧表单项间距避免多余滚动", () => {
        const text = source("src/views/Devops/Scheduler/Task/components/TaskEdit/index.vue");

        expect(text).toContain(".task-edit-form");
        expect(text).toContain("margin-bottom: 14px");
    });

    it("LOOP 运行会话将运行状态和错误状态显示为中文", () => {
        const text = source("src/views/Devops/Scheduler/components/LoopRuntimePanel.vue");

        expect(text).toContain('STARTING: "启动中"');
        expect(text).toContain('RUNNING: "运行中"');
        expect(text).toContain('DEGRADED: "降级"');
        expect(text).toContain('DRAINING: "排空中"');
        expect(text).toContain('CRASHED: "已崩溃"');
        expect(text).toContain('OPEN: "未解决"');
        expect(text).toContain('RESOLVED: "已解决"');
        expect(text).toContain("runtimeStatusLabel(scope.row.status)");
        expect(text).toContain("errorStatusLabel(scope.row.status)");
        expect(text).not.toContain("{{ scope.row.status }}</el-tag>");
    });

    it("任务页通过独立弹窗展示三类任务的统一操作记录", () => {
        const taskText = source("src/views/Devops/Scheduler/Task/index.vue");
        const historyText = source("src/views/Devops/Scheduler/components/SchedulerOperationHistory.vue");

        expect(taskText).toContain("操作记录");
        expect(taskText).toContain("SchedulerOperationHistory");
        expect(taskText).toContain("调度操作记录");
        expect(historyText).toContain("SchedulerAdminApi.operations");
        expect(historyText).toContain('label="控制原因"');
        expect(historyText).toContain('label="操作结果"');
        expect(historyText).toContain("操作来源");
    });

    it("LOOP 运行面板保留控制入口但不再内嵌控制命令记录", () => {
        const panelText = source("src/views/Devops/Scheduler/components/LoopRuntimePanel.vue");
        const apiText = source("src/api/system/scheduler-api.ts");

        expect(apiText).toContain("commands(jobId: string");
        expect(apiText).toContain("/loops/${jobId}/commands");
        expect(panelText).toContain("SchedulerAdminApi.command");
        expect(panelText).not.toContain("SchedulerAdminApi.commands");
        expect(panelText).not.toContain("控制命令记录");
    });

    it("执行记录将触发类型和触发键显示为中文并保持状态标签不折行", () => {
        const text = source("src/views/Devops/Scheduler/Execution/index.vue");

        expect(text).toContain('SCHEDULE: "计划"');
        expect(text).toContain('MANUAL: "手工"');
        expect(text).toContain('RETRY: "重试"');
        expect(text).toContain("triggerLabel(scope.row.trigger_type)");
        expect(text).toContain('label="触发键"');
        expect(text).toContain('width="120"');
        expect(text).toContain('class="status-tag"');
        expect(text).toContain("white-space: nowrap");
        expect(text).toContain('<el-descriptions v-if="selected" :column="2" border label-width="96px"');
        expect(text).toContain(".execution-detail :deep(.el-descriptions__label)");
        expect(text).toContain(".execution-detail :deep(.el-descriptions__content)");
        expect(text).toContain("overflow-wrap: anywhere");
        expect(text).toContain("word-break: break-all");
    });

    it("执行详情将副作用、解决状态和错误诊断显示为中文", () => {
        const text = source("src/views/Devops/Scheduler/Execution/index.vue");

        expect(text).toContain('DB_ONLY: "仅数据库"');
        expect(text).toContain('OUTBOX: "事务发件箱"');
        expect(text).toContain('EXTERNAL_IDEMPOTENT: "外部幂等"');
        expect(text).toContain('EXTERNAL_UNKNOWN: "外部结果未知"');
        expect(text).toContain('UNRESOLVED: "未解决"');
        expect(text).toContain('CONFIRMED_SUCCESS: "已确认成功"');
        expect(text).toContain('CONFIRMED_FAILED: "已确认失败"');
        expect(text).toContain('RETRIED: "已重试"');
        expect(text).toContain("effectLabel(selected.effect_type)");
        expect(text).toContain("resolutionLabel(selected.resolution_status)");
        expect(text).toContain("errorCodeLabel(selected.last_error_code)");
        expect(text).toContain("errorCodeLabel(scope.row.last_error_code)");
        expect(text).toContain("errorMessage(selected.last_error_code, selected.last_error_message)");
        expect(text).toContain('WORKER_LEASE_EXPIRED: "执行租约已过期"');
        expect(text).toContain('HANDLER_UNAVAILABLE: "处理器不可用"');
        expect(text).toContain('NULL_LOOP_RESULT: "循环处理器未返回结果"');
        expect(text).toContain('LOOP_HANDLER_EXCEPTION: "循环处理器执行异常"');
        expect(text).toContain('HANDLER_EXCEPTION: "处理器执行异常"');
        expect(text).toContain('HANDLER_UNAVAILABLE: "调度处理器不可用，执行结果无法确认"');
        expect(text).toContain("未知错误（${value}）");
        expect(text).toContain('selected.locked_by ?? "—"');
        expect(text).toContain("未知结果已登记为独立解决状态");
        expect(text).not.toContain("UNKNOWN 结果");
    });
});
