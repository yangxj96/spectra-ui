<script setup lang="ts">
import { ElMessage } from "element-plus";
import { ref } from "vue";

import { NotificationAdminApi } from "@/api/notification/notification-admin-api.ts";
import useTable from "@/hooks/use-table.ts";
import { formatDateTime } from "@/utils/date-utils.ts";

import type { DateModelType } from "element-plus";

const channelOptions: Array<{ label: string; value: NotificationAdminChannel }> = [
    { label: "站内信", value: "IN_APP" },
    { label: "短信", value: "SMS" },
    { label: "邮件", value: "EMAIL" }
];

const statusOptions = [
    { label: "已接受", value: "ACCEPTED" },
    { label: "已发送", value: "SENT" },
    { label: "失败", value: "FAILED" },
    { label: "已阻断", value: "BLOCKED" },
    { label: "未知", value: "UNKNOWN" }
];

const condition = ref<NotificationAdminDeliveryQuery>({ page_num: 1, page_size: 15 });
const dateRange = ref<[DateModelType, DateModelType] | undefined>();
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable(
    NotificationAdminApi.pageDeliveries,
    condition.value
);

const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<NotificationDeliveryAdminVO>();

function channelLabel(channel: NotificationAdminChannel): string {
    return channelOptions.find(item => item.value === channel)?.label ?? channel;
}

function statusLabel(status: string): string {
    return statusOptions.find(item => item.value === status)?.label ?? status;
}

function statusTagType(status: string): "success" | "warning" | "danger" | "info" {
    if (status === "SENT" || status === "ACCEPTED") return "success";
    if (["FAILED", "BLOCKED"].includes(status)) return "danger";
    if (status === "UNKNOWN") return "warning";
    return "info";
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
        request_id: undefined,
        task_id: undefined,
        recipient_user_id: undefined,
        status: undefined,
        channel: undefined,
        start_time: undefined,
        end_time: undefined,
        page_num: 1
    });
    void handlerConditionQuery();
}

async function openDetail(row: NotificationDeliveryAdminVO): Promise<void> {
    detailVisible.value = true;
    detailLoading.value = true;
    detail.value = undefined;
    try {
        detail.value = await NotificationAdminApi.deliveryDetail(row.id);
    } catch {
        ElMessage.error("通知投递详情加载失败，请稍后重试");
    } finally {
        detailLoading.value = false;
    }
}
</script>

<template>
    <div class="notification-delivery-page">
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
                <el-form-item label="渠道">
                    <el-select v-model="condition.channel" clearable placeholder="全部渠道" style="width: 120px">
                        <el-option
                            v-for="item in channelOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value" />
                    </el-select>
                </el-form-item>
                <el-form-item label="Request ID">
                    <el-input
                        v-model="condition.request_id"
                        clearable
                        placeholder="请输入 Request ID"
                        style="width: 245px" />
                </el-form-item>
                <el-form-item label="Task ID">
                    <el-input v-model="condition.task_id" clearable placeholder="请输入 Task ID" style="width: 245px" />
                </el-form-item>
                <el-form-item label="收件用户 ID">
                    <el-input
                        v-model="condition.recipient_user_id"
                        clearable
                        placeholder="请输入用户 ID"
                        style="width: 245px" />
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
                title="未指定时间时默认查询最近 31 天；按 Request 或 Task 精确定位时不受默认时间窗口影响。"
                type="info"
                :closable="false"
                show-icon />
        </el-card>

        <el-card shadow="never" class="table-card">
            <el-table :data="table_data" stripe>
                <el-table-column type="index" label="序号" width="65" align="center" />
                <el-table-column label="Delivery ID" prop="id" min-width="235" show-overflow-tooltip />
                <el-table-column label="Task ID" prop="task_id" min-width="235" show-overflow-tooltip />
                <el-table-column label="渠道" width="90">
                    <template #default="scope">{{ channelLabel(scope.row.channel) }}</template>
                </el-table-column>
                <el-table-column label="供应商" prop="provider_code" width="130" show-overflow-tooltip />
                <el-table-column label="状态" width="100" align="center">
                    <template #default="scope">
                        <el-tag :type="statusTagType(scope.row.status)" size="small">
                            {{ statusLabel(scope.row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column
                    label="供应商消息 ID"
                    prop="provider_message_id"
                    min-width="180"
                    show-overflow-tooltip />
                <el-table-column label="响应摘要" prop="response_summary" min-width="190" show-overflow-tooltip />
                <el-table-column label="发送时间" width="170">
                    <template #default="scope">{{ formatOptionalDate(scope.row.sent_at) }}</template>
                </el-table-column>
                <el-table-column label="创建时间" width="170">
                    <template #default="scope">{{ formatOptionalDate(scope.row.created_at) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="80" fixed="right">
                    <template #default="scope">
                        <el-button
                            v-permission="'notification:admin:read'"
                            link
                            type="primary"
                            @click="void openDetail(scope.row)">
                            详情
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-empty v-if="table_data.length === 0" description="暂无通知投递记录" />
            <el-pagination
                layout="total, sizes, prev, pager, next"
                :page-size="pagination.size"
                :page-sizes="pagination.page_sizes"
                :total="pagination.total"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange" />
        </el-card>

        <el-dialog v-model="detailVisible" title="通知投递记录详情" width="1050px" destroy-on-close>
            <div v-loading="detailLoading" class="detail-container">
                <template v-if="detail">
                    <el-descriptions :column="3" border>
                        <el-descriptions-item label="Delivery ID">{{ detail.id }}</el-descriptions-item>
                        <el-descriptions-item label="Task ID">{{ detail.task_id }}</el-descriptions-item>
                        <el-descriptions-item label="渠道">{{ channelLabel(detail.channel) }}</el-descriptions-item>
                        <el-descriptions-item label="供应商">{{ detail.provider_code || "—" }}</el-descriptions-item>
                        <el-descriptions-item label="状态">
                            <el-tag :type="statusTagType(detail.status)" size="small">
                                {{ statusLabel(detail.status) }}
                            </el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="供应商消息 ID">
                            {{ detail.provider_message_id || "—" }}
                        </el-descriptions-item>
                        <el-descriptions-item label="模板版本">
                            {{ detail.template_version_no ?? "—" }}
                        </el-descriptions-item>
                        <el-descriptions-item label="模板摘要" :span="2">
                            {{ detail.template_version_digest || "—" }}
                        </el-descriptions-item>
                        <el-descriptions-item label="错误码">{{ detail.error_code || "—" }}</el-descriptions-item>
                        <el-descriptions-item label="发送时间">
                            {{ formatOptionalDate(detail.sent_at) }}
                        </el-descriptions-item>
                        <el-descriptions-item label="创建时间">
                            {{ formatOptionalDate(detail.created_at) }}
                        </el-descriptions-item>
                        <el-descriptions-item label="脱敏错误" :span="3">
                            {{ detail.error_message || "—" }}
                        </el-descriptions-item>
                        <el-descriptions-item label="供应商响应摘要" :span="3">
                            {{ detail.response_summary || "—" }}
                        </el-descriptions-item>
                    </el-descriptions>
                </template>
                <el-empty v-else-if="!detailLoading" description="暂无详情" />
            </div>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.notification-delivery-page {
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
</style>
