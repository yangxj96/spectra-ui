<script setup lang="ts">
import { ElMessage } from "element-plus";
import { computed, ref } from "vue";

import { NotificationAdminApi } from "@/api/notification/notification-admin-api.ts";
import useTable from "@/hooks/use-table.ts";
import { formatDateTime } from "@/utils/date-utils.ts";

import type { DateModelType } from "element-plus";

const purposeOptions = [
    { label: "登录验证码", value: "LOGIN_CODE" },
    { label: "绑定手机验证码", value: "BIND_PHONE_CODE" },
    { label: "绑定邮箱验证码", value: "BIND_EMAIL_CODE" },
    { label: "重置密码验证码", value: "RESET_PASSWORD_CODE" },
    { label: "安全告警", value: "SECURITY_ALERT" },
    { label: "系统通知", value: "SYSTEM_NOTICE" },
    { label: "流程待办", value: "WORKFLOW_TODO" },
    { label: "流程结果", value: "WORKFLOW_RESULT" },
    { label: "OA 通知", value: "OA_NOTICE" },
    { label: "OA 提醒", value: "OA_REMINDER" },
    { label: "内部消息", value: "INNER_MESSAGE" }
];

const statusOptions = [
    { label: "已接受", value: "ACCEPTED" },
    { label: "分发中", value: "DISPATCHING" },
    { label: "已成功", value: "SUCCEEDED" },
    { label: "部分成功", value: "PARTIAL" },
    { label: "失败", value: "FAILED" },
    { label: "已取消", value: "CANCELLED" },
    { label: "已过期", value: "EXPIRED" }
];

const condition = ref<NotificationAdminRequestQuery>({ page_num: 1, page_size: 15 });
const dateRange = ref<[DateModelType, DateModelType] | undefined>();
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable(
    NotificationAdminApi.pageRequests,
    condition.value
);

const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<NotificationRequestAdminVO>();
const detailTasks = ref<NotificationTaskAdminVO[]>([]);
const detailTaskTotal = ref(0);

const detailTaskSummary = computed(() => {
    if (!detail.value) return "";
    return `任务 ${detail.value.task_count} 条 · 已加载关联任务 ${detailTasks.value.length} 条`;
});

function purposeLabel(purpose: string): string {
    return purposeOptions.find(item => item.value === purpose)?.label ?? purpose;
}

function statusLabel(status: string): string {
    return statusOptions.find(item => item.value === status)?.label ?? status;
}

function statusTagType(status: string): "success" | "warning" | "danger" | "info" {
    if (status === "SUCCEEDED") return "success";
    if (status === "FAILED" || status === "EXPIRED") return "danger";
    if (status === "PARTIAL" || status === "DISPATCHING") return "warning";
    return "info";
}

function channelLabel(channel: NotificationAdminChannel): string {
    return { IN_APP: "站内信", SMS: "短信", EMAIL: "邮件" }[channel] ?? channel;
}

function formatOptionalDate(value: string | null | undefined): string {
    return value ? formatDateTime(value) : "—";
}

function toIso(value: DateModelType): string | undefined {
    if (!value) return undefined;
    return new Date(value).toISOString();
}

function applyDateRange(): void {
    condition.value.start_time = toIso(dateRange.value?.[0]);
    condition.value.end_time = toIso(dateRange.value?.[1]);
}

function search(): void {
    applyDateRange();
    condition.value.page_num = 1;
    void handlerConditionQuery();
}

function reset(): void {
    dateRange.value = undefined;
    Object.assign(condition.value, {
        status: undefined,
        purpose: undefined,
        source_module: undefined,
        business_type: undefined,
        business_id: undefined,
        start_time: undefined,
        end_time: undefined,
        page_num: 1
    });
    void handlerConditionQuery();
}

async function openDetail(row: NotificationRequestAdminVO): Promise<void> {
    detailVisible.value = true;
    detailLoading.value = true;
    detail.value = undefined;
    detailTasks.value = [];
    detailTaskTotal.value = 0;
    try {
        const [request, tasks] = await Promise.all([
            NotificationAdminApi.requestDetail(row.id),
            NotificationAdminApi.pageTasks({ request_id: row.id, page_num: 1, page_size: 100 })
        ]);
        detail.value = request;
        detailTasks.value = tasks.records ?? [];
        detailTaskTotal.value = tasks.total ?? detailTasks.value.length;
    } catch {
        ElMessage.error("通知请求详情加载失败，请稍后重试");
    } finally {
        detailLoading.value = false;
    }
}
</script>

<template>
    <div class="notification-request-page">
        <el-card shadow="never" class="search-card">
            <el-form :inline="true" :model="condition">
                <el-form-item label="状态">
                    <el-select v-model="condition.status" clearable placeholder="全部状态" style="width: 130px">
                        <el-option
                            v-for="item in statusOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value" />
                    </el-select>
                </el-form-item>
                <el-form-item label="用途">
                    <el-select
                        v-model="condition.purpose"
                        clearable
                        filterable
                        placeholder="全部用途"
                        style="width: 160px">
                        <el-option
                            v-for="item in purposeOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value" />
                    </el-select>
                </el-form-item>
                <el-form-item label="来源模块">
                    <el-input
                        v-model="condition.source_module"
                        clearable
                        placeholder="请输入来源模块"
                        style="width: 150px" />
                </el-form-item>
                <el-form-item label="业务类型">
                    <el-input
                        v-model="condition.business_type"
                        clearable
                        placeholder="请输入业务类型"
                        style="width: 150px" />
                </el-form-item>
                <el-form-item label="业务 ID">
                    <el-input
                        v-model="condition.business_id"
                        clearable
                        placeholder="请输入业务 ID"
                        style="width: 180px" />
                </el-form-item>
                <el-form-item label="创建时间">
                    <el-date-picker
                        v-model="dateRange"
                        type="datetimerange"
                        range-separator="至"
                        start-placeholder="开始时间"
                        end-placeholder="结束时间"
                        :default-time="[new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]"
                        style="width: 340px" />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="search">查询</el-button>
                    <el-button @click="reset">重置</el-button>
                </el-form-item>
            </el-form>
            <el-alert
                title="未指定时间时默认查询最近 31 天；精确关联任务由 Request ID 定位，不受时间窗口影响。"
                type="info"
                :closable="false"
                show-icon />
        </el-card>

        <el-card shadow="never" class="table-card">
            <el-table v-loading="false" :data="table_data" stripe>
                <el-table-column type="index" label="序号" width="65" align="center" />
                <el-table-column label="Request ID" prop="id" min-width="245" show-overflow-tooltip />
                <el-table-column label="用途" min-width="120">
                    <template #default="scope">{{ purposeLabel(scope.row.purpose) }}</template>
                </el-table-column>
                <el-table-column label="来源模块" prop="source_module" min-width="120" show-overflow-tooltip />
                <el-table-column label="业务对象" min-width="170" show-overflow-tooltip>
                    <template #default="scope">
                        {{ scope.row.business_type || "—" }} / {{ scope.row.business_id || "—" }}
                    </template>
                </el-table-column>
                <el-table-column label="任务" width="80" align="center" prop="task_count" />
                <el-table-column label="状态" width="100" align="center">
                    <template #default="scope">
                        <el-tag :type="statusTagType(scope.row.status)" size="small">
                            {{ statusLabel(scope.row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="创建时间" prop="created_at" width="170" show-overflow-tooltip />
                <el-table-column label="操作" width="90" fixed="right">
                    <template #default="scope">
                        <el-button link type="primary" @click="void openDetail(scope.row)">详情</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-empty v-if="table_data.length === 0" description="暂无通知请求" />
            <el-pagination
                layout="total, sizes, prev, pager, next"
                :page-size="pagination.size"
                :page-sizes="pagination.page_sizes"
                :total="pagination.total"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange" />
        </el-card>

        <el-dialog v-model="detailVisible" title="通知请求详情" width="1100px" destroy-on-close>
            <div v-loading="detailLoading" class="detail-container">
                <template v-if="detail">
                    <el-descriptions :column="3" border>
                        <el-descriptions-item label="Request ID">{{ detail.id }}</el-descriptions-item>
                        <el-descriptions-item label="状态">
                            <el-tag :type="statusTagType(detail.status)" size="small">
                                {{ statusLabel(detail.status) }}
                            </el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="用途">{{ purposeLabel(detail.purpose) }}</el-descriptions-item>
                        <el-descriptions-item label="模板组">{{ detail.template_code }}</el-descriptions-item>
                        <el-descriptions-item label="来源模块">{{ detail.source_module || "—" }}</el-descriptions-item>
                        <el-descriptions-item label="优先级">{{ detail.priority ?? "—" }}</el-descriptions-item>
                        <el-descriptions-item label="业务类型">{{ detail.business_type || "—" }}</el-descriptions-item>
                        <el-descriptions-item label="业务 ID">{{ detail.business_id || "—" }}</el-descriptions-item>
                        <el-descriptions-item label="接收人数">{{ detail.recipient_count }}</el-descriptions-item>
                        <el-descriptions-item label="任务数">{{ detail.task_count }}</el-descriptions-item>
                        <el-descriptions-item label="计划时间">
                            {{ formatOptionalDate(detail.scheduled_at) }}
                        </el-descriptions-item>
                        <el-descriptions-item label="过期时间">
                            {{ formatOptionalDate(detail.expires_at) }}
                        </el-descriptions-item>
                    </el-descriptions>

                    <div class="detail-section__header">
                        <h3>关联投递任务</h3>
                        <span>
                            {{ detailTaskSummary }}
                            <template v-if="detailTaskTotal > detailTasks.length">，请转到任务页查看全部</template>
                        </span>
                    </div>
                    <el-table :data="detailTasks" stripe>
                        <el-table-column label="Task ID" prop="id" min-width="230" show-overflow-tooltip />
                        <el-table-column label="渠道" width="90">
                            <template #default="scope">{{ channelLabel(scope.row.channel) }}</template>
                        </el-table-column>
                        <el-table-column
                            label="收件地址"
                            prop="recipient_address"
                            min-width="135"
                            show-overflow-tooltip />
                        <el-table-column label="状态" width="100">
                            <template #default="scope">
                                <el-tag :type="statusTagType(scope.row.status)" size="small">
                                    {{ scope.row.status }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="重试次数" width="90" prop="retry_count" />
                        <el-table-column label="最近错误" min-width="140" prop="last_error" show-overflow-tooltip />
                        <el-table-column label="创建时间" width="170" prop="created_at" />
                    </el-table>
                    <el-empty v-if="detailTasks.length === 0" description="该请求暂无关联任务" :image-size="70" />
                </template>
                <el-empty v-else-if="!detailLoading" description="暂无详情" />
            </div>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.notification-request-page {
    min-height: 100%;
    padding: 14px;
    overflow: auto;
    background: var(--el-bg-color-page);
}

.search-card,
.table-card {
    margin-bottom: 12px;
}

.search-card :deep(.el-form-item) {
    margin-bottom: 12px;
}

.table-card :deep(.el-pagination) {
    justify-content: flex-end;
    margin-top: 12px;
}

.detail-container {
    min-height: 220px;
}

.detail-section__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 20px 0 10px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.detail-section__header h3 {
    margin: 0;
    color: var(--el-text-color-primary);
    font-size: 15px;
}
</style>
