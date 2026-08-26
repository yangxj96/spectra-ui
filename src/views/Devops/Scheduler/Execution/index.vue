<script setup lang="ts">
import { onMounted, ref } from "vue";

import { SchedulerAdminApi } from "@/api/system/scheduler-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const loading = ref(false);
const records = ref<SchedulerExecutionVO[]>([]);
const selected = ref<SchedulerExecutionVO>();
const detailVisible = ref(false);
const status = ref<SchedulerExecutionStatus | undefined>();
const jobId = ref("");
const page = ref(1);
const size = ref(15);
const total = ref(0);

const statusLabels: Record<SchedulerExecutionStatus, string> = {
    QUEUED: "排队中",
    RUNNING: "运行中",
    RETRY_WAIT: "等待重试",
    SUCCEEDED: "成功",
    FAILED: "失败",
    UNKNOWN: "未知",
    SKIPPED: "已跳过",
    CANCELLED: "已取消"
};
const triggerLabels: Record<SchedulerTriggerType, string> = {
    SCHEDULE: "计划",
    MANUAL: "手工",
    RETRY: "重试"
};
const effectLabels: Record<SchedulerEffectType, string> = {
    DB_ONLY: "仅数据库",
    OUTBOX: "事务发件箱",
    EXTERNAL_IDEMPOTENT: "外部幂等",
    EXTERNAL_UNKNOWN: "外部结果未知"
};
const resolutionLabels: Record<SchedulerResolutionStatus, string> = {
    UNRESOLVED: "未解决",
    CONFIRMED_SUCCESS: "已确认成功",
    CONFIRMED_FAILED: "已确认失败",
    RETRIED: "已重试"
};
const errorCodeLabels: Record<string, string> = {
    WORKER_LEASE_EXPIRED: "执行租约已过期",
    HANDLER_UNAVAILABLE: "处理器不可用",
    NULL_HANDLER_RESULT: "处理器未返回结果",
    HANDLER_EXCEPTION: "处理器执行异常",
    SCHEDULER_HANDLER_ERROR: "调度处理器错误",
    NULL_LOOP_RESULT: "循环处理器未返回结果",
    LOOP_HANDLER_EXCEPTION: "循环处理器执行异常",
    LOOP_CYCLE_FAILED: "循环周期执行失败"
};
const errorMessageLabels: Record<string, string> = {
    WORKER_LEASE_EXPIRED: "执行租约已过期，结果无法确认",
    HANDLER_UNAVAILABLE: "调度处理器不可用，执行结果无法确认",
    NULL_HANDLER_RESULT: "处理器未返回可确认结果",
    HANDLER_EXCEPTION: "处理器异常，外部副作用无法确认",
    SCHEDULER_HANDLER_ERROR: "调度处理器返回错误",
    NULL_LOOP_RESULT: "循环处理器未返回周期结果",
    LOOP_HANDLER_EXCEPTION: "循环处理器异常",
    LOOP_CYCLE_FAILED: "循环周期执行失败"
};

async function load(): Promise<void> {
    loading.value = true;
    try {
        const result = await SchedulerAdminApi.executions({
            page_num: page.value,
            page_size: size.value,
            status: status.value,
            job_id: jobId.value || undefined
        });
        records.value = result.records ?? [];
        total.value = result.total ?? 0;
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "执行记录加载失败");
    } finally {
        loading.value = false;
    }
}

function search(): void {
    page.value = 1;
    void load();
}

function reset(): void {
    status.value = undefined;
    jobId.value = "";
    search();
}

function openDetail(row: SchedulerExecutionVO): void {
    selected.value = row;
    detailVisible.value = true;
}

function date(value: string | null): string {
    return value ? formatDateTime(value) : "—";
}

function statusLabel(value: SchedulerExecutionStatus): string {
    return statusLabels[value] ?? value;
}

function triggerLabel(value: SchedulerTriggerType): string {
    return triggerLabels[value] ?? value;
}

function effectLabel(value: SchedulerEffectType | null | undefined): string {
    return value ? (effectLabels[value] ?? value) : "—";
}

function resolutionLabel(value: SchedulerResolutionStatus | null | undefined): string {
    return value ? (resolutionLabels[value] ?? value) : "—";
}

function errorCodeLabel(value: string | null): string {
    if (!value) return "—";
    const label = errorCodeLabels[value];
    return label ? `${label}（${value}）` : `未知错误（${value}）`;
}

function errorMessage(errorCode: string | null, value: string | null): string {
    if (!value) return "—";
    return (errorCode && errorMessageLabels[errorCode]) || value;
}

function tag(value: SchedulerExecutionStatus): "success" | "warning" | "danger" | "info" {
    if (value === "SUCCEEDED") return "success";
    if (value === "FAILED" || value === "UNKNOWN") return "danger";
    if (value === "RUNNING" || value === "RETRY_WAIT") return "warning";
    return "info";
}

function key(prefix: string): string {
    return `${prefix}:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

async function reason(title: string): Promise<string | undefined> {
    try {
        const result = await MessageUtils.box.prompt("请输入操作原因。", title, {
            inputValidator: value => (value?.trim() ? true : "原因不能为空")
        });
        return result.value.trim();
    } catch {
        return undefined;
    }
}

async function retry(): Promise<void> {
    if (!selected.value) return;
    const text = await reason("人工重试");
    if (!text) return;
    try {
        const next = await SchedulerAdminApi.retryExecution(selected.value.id, {
            version: selected.value.version,
            idempotency_key: key("retry"),
            reason: text
        });
        selected.value = next;
        MessageUtils.success("已创建新的重试执行，原记录保持不变");
        await load();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "人工重试失败");
    }
}

async function cancel(): Promise<void> {
    if (!selected.value) return;
    const text = await reason("取消执行");
    if (!text) return;
    try {
        selected.value = await SchedulerAdminApi.cancelExecution(selected.value.id, {
            version: selected.value.version,
            idempotency_key: key("cancel"),
            reason: text
        });
        MessageUtils.success("执行已取消");
        await load();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "取消执行失败");
    }
}

async function resolve(value: "CONFIRMED_SUCCESS" | "CONFIRMED_FAILED"): Promise<void> {
    if (!selected.value) return;
    const text = await reason(value === "CONFIRMED_SUCCESS" ? "确认执行成功" : "确认执行失败");
    if (!text) return;
    try {
        selected.value = await SchedulerAdminApi.resolveExecution(selected.value.id, {
            version: selected.value.version,
            idempotency_key: key("resolve"),
            reason: text,
            resolution_status: value
        });
        MessageUtils.success("未知结果已登记为独立解决状态");
        await load();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "未知结果解决失败");
    }
}

onMounted(() => void load());
</script>

<template>
    <div v-loading="loading" class="scheduler-execution-page">
        <el-card shadow="never" class="toolbar">
            <el-form :inline="true" @submit.prevent="search">
                <el-form-item label="任务 ID">
                    <el-input v-model="jobId" clearable placeholder="可从任务页复制" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-select v-model="status" clearable placeholder="全部状态" style="width: 150px">
                        <el-option v-for="(label, value) in statusLabels" :key="value" :label="label" :value="value" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="search">查询</el-button>
                    <el-button @click="reset">重置</el-button>
                </el-form-item>
            </el-form>
        </el-card>
        <el-card shadow="never" class="table-card">
            <el-table :data="records" border stripe height="100%" empty-text="暂无执行记录">
                <el-table-column label="执行 ID" prop="id" min-width="235" show-overflow-tooltip />
                <el-table-column label="任务 ID" prop="job_id" min-width="235" show-overflow-tooltip />
                <el-table-column label="触发" width="90" align="center">
                    <template #default="scope">{{ triggerLabel(scope.row.trigger_type) }}</template>
                </el-table-column>
                <el-table-column label="状态" width="120" align="center">
                    <template #default="scope">
                        <el-tag class="status-tag" :type="tag(scope.row.status)" size="small">
                            {{ statusLabel(scope.row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="尝试" width="75" align="center">
                    <template #default="scope">{{ scope.row.attempt_no }} / {{ scope.row.max_attempts }}</template>
                </el-table-column>
                <el-table-column label="计划时间" width="175">
                    <template #default="scope">{{ date(scope.row.scheduled_at) }}</template>
                </el-table-column>
                <el-table-column label="完成时间" width="175">
                    <template #default="scope">{{ date(scope.row.finished_at) }}</template>
                </el-table-column>
                <el-table-column label="错误" min-width="190" show-overflow-tooltip>
                    <template #default="scope">{{ errorCodeLabel(scope.row.last_error_code) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="90" fixed="right">
                    <template #default="scope">
                        <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-pagination
                v-model:current-page="page"
                v-model:page-size="size"
                :page-sizes="[15, 50, 100]"
                layout="total, sizes, prev, pager, next"
                :total="total"
                @current-change="load"
                @size-change="search" />
        </el-card>
        <el-dialog v-model="detailVisible" title="调度执行详情" width="720px">
            <el-descriptions v-if="selected" :column="2" border label-width="96px" class="execution-detail">
                <el-descriptions-item label="执行 ID" :span="2">{{ selected.id }}</el-descriptions-item>
                <el-descriptions-item label="触发键" :span="2">{{ selected.fire_key }}</el-descriptions-item>
                <el-descriptions-item label="状态">{{ statusLabel(selected.status) }}</el-descriptions-item>
                <el-descriptions-item label="副作用">{{ effectLabel(selected.effect_type) }}</el-descriptions-item>
                <el-descriptions-item label="租约持有者">{{ selected.locked_by ?? "—" }}</el-descriptions-item>
                <el-descriptions-item label="租约到期">{{ date(selected.lease_expires_at) }}</el-descriptions-item>
                <el-descriptions-item label="错误码">
                    {{ errorCodeLabel(selected.last_error_code) }}
                </el-descriptions-item>
                <el-descriptions-item label="解决状态">
                    {{ resolutionLabel(selected.resolution_status) }}
                </el-descriptions-item>
                <el-descriptions-item label="错误信息" :span="2">
                    {{ errorMessage(selected.last_error_code, selected.last_error_message) }}
                </el-descriptions-item>
                <el-descriptions-item label="结果摘要" :span="2">
                    <pre>{{ JSON.stringify(selected.result_summary, null, 2) }}</pre>
                </el-descriptions-item>
            </el-descriptions>
            <template #footer>
                <el-button
                    v-if="selected?.status === 'QUEUED' || selected?.status === 'RETRY_WAIT'"
                    type="warning"
                    @click="cancel">
                    取消
                </el-button>
                <el-button
                    v-if="selected?.status === 'FAILED' || selected?.status === 'UNKNOWN'"
                    type="primary"
                    @click="retry">
                    人工重试
                </el-button>
                <el-button v-if="selected?.status === 'UNKNOWN'" type="success" @click="resolve('CONFIRMED_SUCCESS')">
                    确认成功
                </el-button>
                <el-button v-if="selected?.status === 'UNKNOWN'" type="danger" @click="resolve('CONFIRMED_FAILED')">
                    确认失败
                </el-button>
                <el-button @click="detailVisible = false">关闭</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.scheduler-execution-page {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 12px;
    height: 100%;
    min-height: 0;
    padding: 12px;
    box-sizing: border-box;
}
.toolbar :deep(.el-form-item) {
    margin-bottom: 0;
}
.table-card {
    min-height: 0;
}
.table-card :deep(.el-card__body) {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 8px;
    height: 100%;
    box-sizing: border-box;
}
.table-card :deep(.el-pagination) {
    justify-content: flex-end;
}
pre {
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
}
.table-card :deep(.status-tag) {
    white-space: nowrap;
}
.execution-detail :deep(.el-descriptions__label) {
    white-space: nowrap;
}
.execution-detail :deep(.el-descriptions__table) {
    table-layout: fixed;
}
.execution-detail :deep(.el-descriptions__content) {
    overflow-wrap: anywhere;
    word-break: break-all;
}
</style>
