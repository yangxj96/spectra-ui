<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

import { SchedulerAdminApi } from "@/api/system/scheduler-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const props = defineProps<{ jobId: string }>();

const records = ref<SchedulerOperationVO[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(15);
const loading = ref(false);

const operationLabels: Record<SchedulerOperationType, string> = {
    CREATE: "创建",
    UPDATE: "修改",
    ENABLE: "启用",
    DISABLE: "停用",
    ARCHIVE: "归档",
    REREGISTER: "重新注册",
    TRIGGER: "手工触发",
    RETRY: "重试",
    CANCEL: "取消",
    RESOLVE: "解决未知结果",
    START: "启动",
    DRAIN_STOP: "排空停止",
    RESTART: "重启",
    FORCE_STOP: "强制停止",
    FORCE_RECLAIM: "强制回收租约"
};
const sourceLabels: Record<SchedulerOperationSource, string> = {
    TASK: "任务操作",
    LOOP_COMMAND: "循环控制"
};
const statusLabels: Record<SchedulerOperationStatus, string> = {
    REQUESTED: "待应用",
    APPLYING: "应用中",
    APPLIED: "已应用",
    SUCCEEDED: "已成功",
    FAILED: "失败",
    TIMEOUT: "超时"
};

async function load(): Promise<void> {
    loading.value = true;
    try {
        const result = await SchedulerAdminApi.operations(props.jobId, {
            page_num: page.value,
            page_size: pageSize.value
        });
        records.value = result.records ?? [];
        total.value = result.total ?? 0;
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "调度操作记录加载失败");
    } finally {
        loading.value = false;
    }
}

function operationLabel(value: SchedulerOperationType): string {
    return operationLabels[value] ?? value;
}
function sourceLabel(value: SchedulerOperationSource): string {
    return sourceLabels[value] ?? value;
}
function statusLabel(value: SchedulerOperationStatus): string {
    return statusLabels[value] ?? value;
}
function statusTag(value: SchedulerOperationStatus): "success" | "warning" | "danger" | "info" {
    if (value === "SUCCEEDED" || value === "APPLIED") return "success";
    if (value === "REQUESTED" || value === "APPLYING") return "warning";
    if (value === "FAILED" || value === "TIMEOUT") return "danger";
    return "info";
}
function date(value: string | null): string {
    return value ? formatDateTime(value) : "—";
}
function user(value: string | null): string {
    return value || "—";
}
async function changePage(value: number): Promise<void> {
    page.value = value;
    await load();
}
async function changePageSize(value: number): Promise<void> {
    pageSize.value = value;
    page.value = 1;
    await load();
}

watch(
    () => props.jobId,
    () => {
        page.value = 1;
        void load();
    }
);

onMounted(() => void load());
</script>

<template>
    <div v-loading="loading" class="scheduler-operation-history">
        <el-table :data="records" border stripe empty-text="暂无调度操作记录">
            <el-table-column label="操作" width="120" align="center">
                <template #default="scope">{{ operationLabel(scope.row.operation_type) }}</template>
            </el-table-column>
            <el-table-column label="操作来源" width="110" align="center">
                <template #default="scope">{{ sourceLabel(scope.row.source) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
                <template #default="scope">
                    <el-tag :type="statusTag(scope.row.status)" size="small">
                        {{ statusLabel(scope.row.status) }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column label="控制原因" min-width="220" show-overflow-tooltip prop="reason" />
            <el-table-column label="操作人" min-width="180" show-overflow-tooltip>
                <template #default="scope">{{ user(scope.row.requested_by) }}</template>
            </el-table-column>
            <el-table-column label="请求时间" width="175">
                <template #default="scope">{{ date(scope.row.requested_at) }}</template>
            </el-table-column>
            <el-table-column label="完成时间" width="175">
                <template #default="scope">{{ date(scope.row.finished_at) }}</template>
            </el-table-column>
            <el-table-column label="操作结果" min-width="220" show-overflow-tooltip>
                <template #default="scope">{{ scope.row.result_message || scope.row.result_code || "—" }}</template>
            </el-table-column>
        </el-table>
        <el-pagination
            :current-page="page"
            :page-size="pageSize"
            :page-sizes="[15, 50, 100]"
            layout="total, sizes, prev, pager, next"
            :total="total"
            @current-change="changePage"
            @size-change="changePageSize" />
    </div>
</template>

<style scoped lang="scss">
.scheduler-operation-history {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
}

.scheduler-operation-history :deep(.el-table) {
    width: 100%;
}

.scheduler-operation-history :deep(.el-pagination) {
    justify-content: flex-end;
    padding: 0;
}
</style>
