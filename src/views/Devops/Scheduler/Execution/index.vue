<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { QuartzSchedulerApi } from "@/api/system/scheduler-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const route = useRoute();
const loading = ref(false);
const records = ref<QuartzExecutionHistoryVO[]>([]);
const jobTypes = ref<QuartzJobTypeVO[]>([]);
const selected = ref<QuartzExecutionHistoryVO>();
const detailVisible = ref(false);
const status = ref<QuartzExecutionHistoryStatus>();
const jobKey = ref(typeof route.query.job_key === "string" ? route.query.job_key : "");
const triggerKey = ref("");
const timeRange = ref<[string, string]>();
const page = ref(1);
const size = ref(15);
const total = ref(0);

const statusLabels: Record<QuartzExecutionHistoryStatus, string> = {
    RUNNING: "运行中",
    SUCCEEDED: "成功",
    FAILED: "失败",
    VETOED: "已否决",
    ABANDONED: "已放弃"
};

const triggerLabels: Record<string, string> = {
    CRON: "Cron",
    SIMPLE: "Simple",
    MANUAL: "手动"
};

const jobTypeIndex = computed(() => new Map(jobTypes.value.map(item => [item.type_key, item])));

function jobTypeLabel(typeKey: string): string {
    return jobTypeIndex.value.get(typeKey)?.display_name ?? typeKey;
}

async function loadJobTypes(): Promise<void> {
    try {
        jobTypes.value = await QuartzSchedulerApi.jobTypes();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "任务类型目录加载失败");
    }
}

async function load(): Promise<void> {
    loading.value = true;
    try {
        const result = await QuartzSchedulerApi.executionHistory({
            page_num: page.value,
            page_size: size.value,
            job_key: jobKey.value.trim() || undefined,
            trigger_key: triggerKey.value.trim() || undefined,
            status: status.value,
            from: timeRange.value?.[0],
            to: timeRange.value?.[1]
        });
        records.value = result.records ?? [];
        total.value = result.total ?? 0;
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "执行历史加载失败");
    } finally {
        loading.value = false;
    }
}

function search(): void {
    page.value = 1;
    void load();
}

function reset(): void {
    jobKey.value = "";
    triggerKey.value = "";
    status.value = undefined;
    timeRange.value = undefined;
    search();
}

function changePage(value: number): void {
    page.value = value;
    void load();
}

function changePageSize(value: number): void {
    size.value = value;
    page.value = 1;
    void load();
}

async function openDetail(row: QuartzExecutionHistoryVO): Promise<void> {
    try {
        selected.value = await QuartzSchedulerApi.executionHistoryDetail(row.id);
    } catch {
        selected.value = row;
    }
    detailVisible.value = true;
}

function date(value: string | null): string {
    return value ? formatDateTime(value) : "—";
}

function statusLabel(value: QuartzExecutionHistoryStatus): string {
    return statusLabels[value] ?? value;
}

function triggerLabel(value: string): string {
    return triggerLabels[value] ?? value;
}

function tag(value: QuartzExecutionHistoryStatus): "success" | "warning" | "danger" | "info" {
    if (value === "SUCCEEDED") return "success";
    if (value === "FAILED") return "danger";
    if (value === "RUNNING") return "warning";
    return "info";
}

function resultSummary(value: string | null): string {
    return value || "—";
}

onMounted(() => {
    void Promise.all([load(), loadJobTypes()]);
});
</script>

<template>
    <div v-loading="loading" class="scheduler-history-page">
        <el-row class="box__search">
            <el-form :inline="true" @submit.prevent="search">
                <el-form-item label="任务键">
                    <el-input v-model="jobKey" class="search-field" clearable placeholder="支持完整或简写任务键" />
                </el-form-item>
                <el-form-item label="触发器键">
                    <el-input
                        v-model="triggerKey"
                        class="search-field"
                        clearable
                        placeholder="支持完整或简写触发器键" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-select v-model="status" class="search-field" clearable placeholder="全部状态">
                        <el-option v-for="(label, value) in statusLabels" :key="value" :label="label" :value="value" />
                    </el-select>
                </el-form-item>
                <el-form-item label="执行时间">
                    <el-date-picker
                        v-model="timeRange"
                        class="search-field search-range"
                        type="datetimerange"
                        value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
                        start-placeholder="开始"
                        end-placeholder="结束"
                        range-separator="至"
                        clearable />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="search">查询</el-button>
                    <el-button @click="reset">重置</el-button>
                </el-form-item>
            </el-form>
        </el-row>

        <el-row class="box__body">
            <el-col :span="24">
                <el-table :data="records" stripe height="92%" empty-text="暂无执行历史">
                    <el-table-column label="执行 ID" prop="id" min-width="235" align="center" show-overflow-tooltip />
                    <el-table-column
                        label="触发实例标识"
                        prop="fire_instance_id"
                        min-width="220"
                        align="center"
                        show-overflow-tooltip />
                    <el-table-column
                        label="任务键"
                        prop="job_key"
                        min-width="220"
                        align="center"
                        show-overflow-tooltip />
                    <el-table-column label="触发器" min-width="180" align="center" show-overflow-tooltip>
                        <template #default="scope">
                            <el-tag size="small" type="info">{{ triggerLabel(scope.row.trigger_type) }}</el-tag>
                            <small>{{ scope.row.trigger_key }}</small>
                        </template>
                    </el-table-column>
                    <el-table-column label="状态" width="100" align="center">
                        <template #default="scope">
                            <el-tag :type="tag(scope.row.status)" size="small">
                                {{ statusLabel(scope.row.status) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="开始时间" width="175" align="center">
                        <template #default="scope">{{ date(scope.row.started_at) }}</template>
                    </el-table-column>
                    <el-table-column label="结束时间" width="175" align="center">
                        <template #default="scope">{{ date(scope.row.finished_at) }}</template>
                    </el-table-column>
                    <el-table-column label="耗时" width="100" align="center">
                        <template #default="scope">{{ scope.row.duration_ms ?? "—" }} ms</template>
                    </el-table-column>
                    <el-table-column label="错误" min-width="190" align="center" show-overflow-tooltip>
                        <template #default="scope">{{ scope.row.error_code ?? "—" }}</template>
                    </el-table-column>
                    <el-table-column label="操作" width="80" fixed="right" align="center">
                        <template #default="scope">
                            <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
                        </template>
                    </el-table-column>
                </el-table>
                <el-pagination
                    :current-page="page"
                    :page-size="size"
                    :page-sizes="[15, 50, 100]"
                    layout="total, sizes, prev, pager, next"
                    :total="total"
                    @current-change="changePage"
                    @size-change="changePageSize" />
            </el-col>
        </el-row>

        <el-dialog v-model="detailVisible" title="执行历史详情" width="760px">
            <el-descriptions v-if="selected" :column="2" border label-width="110px" class="history-detail">
                <el-descriptions-item label="执行 ID" :span="2">{{ selected.id }}</el-descriptions-item>
                <el-descriptions-item label="触发实例标识" :span="2">
                    {{ selected.fire_instance_id }}
                </el-descriptions-item>
                <el-descriptions-item label="任务键">{{ selected.job_key }}</el-descriptions-item>
                <el-descriptions-item label="触发器键">{{ selected.trigger_key }}</el-descriptions-item>
                <el-descriptions-item label="任务类型">{{ jobTypeLabel(selected.job_type) }}</el-descriptions-item>
                <el-descriptions-item label="触发类型">{{ triggerLabel(selected.trigger_type) }}</el-descriptions-item>
                <el-descriptions-item label="状态">
                    <el-tag :type="tag(selected.status)" size="small">{{ statusLabel(selected.status) }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="耗时">{{ selected.duration_ms ?? "—" }} ms</el-descriptions-item>
                <el-descriptions-item label="计划时间">{{ date(selected.scheduled_fire_at) }}</el-descriptions-item>
                <el-descriptions-item label="实际触发">{{ date(selected.actual_fire_at) }}</el-descriptions-item>
                <el-descriptions-item label="开始时间">{{ date(selected.started_at) }}</el-descriptions-item>
                <el-descriptions-item label="结束时间">{{ date(selected.finished_at) }}</el-descriptions-item>
                <el-descriptions-item label="参数版本">{{ selected.parameter_version ?? "—" }}</el-descriptions-item>
                <el-descriptions-item label="参数摘要">{{ selected.parameter_sha256 ?? "—" }}</el-descriptions-item>
                <el-descriptions-item label="错误编码">{{ selected.error_code ?? "—" }}</el-descriptions-item>
                <el-descriptions-item label="错误说明" :span="2">
                    {{ selected.error_message ?? "—" }}
                </el-descriptions-item>
                <el-descriptions-item label="结果摘要" :span="2">
                    <pre>{{ resultSummary(selected.result_summary) }}</pre>
                </el-descriptions-item>
            </el-descriptions>
            <template #footer>
                <el-button @click="detailVisible = false">关闭</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.scheduler-history-page {
    height: 100%;
    min-height: 0;
    overflow: hidden;
}

.box__search {
    height: 10%;
    display: flex;
    align-items: center;
    overflow-x: auto;
    padding: 0 20px;
}

.box__search :deep(.el-form--inline) {
    display: flex;
    flex-wrap: nowrap;
    flex: 0 0 max-content;
    width: max-content;
    min-width: max-content;
    align-items: center;
}

.box__search :deep(.el-form-item) {
    flex: 0 0 auto;
    margin-right: 12px;
    margin-bottom: 0;
}

.box__search :deep(.search-field) {
    flex: 0 0 150px;
    width: 150px;
    min-width: 150px;
    max-width: 150px;
}

.box__search :deep(.search-range) {
    flex-basis: 300px;
    width: 300px;
    min-width: 300px;
    max-width: 300px;
}

.box__body {
    display: block;
    height: 90%;
    padding: 0 20px;
}

.box__body :deep(.el-col) {
    height: 100%;
}

.box__body :deep(.el-table) {
    width: 100%;
}

.box__body :deep(.el-pagination) {
    justify-content: flex-end;
    margin-top: 4px;
}

.history-detail :deep(.el-descriptions__content) {
    overflow-wrap: anywhere;
    word-break: break-all;
}

pre {
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
}
</style>
