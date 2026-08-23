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
        <div class="page-toolbar">
            <div>
                <h2>投递记录</h2>
                <p>查看各通知渠道的投递结果、供应商回执和脱敏错误信息。</p>
            </div>
        </div>
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
                <el-form-item label="请求编号">
                    <el-input
                        v-model="condition.request_id"
                        clearable
                        placeholder="请输入请求编号"
                        style="width: 245px" />
                </el-form-item>
                <el-form-item label="任务编号">
                    <el-input v-model="condition.task_id" clearable placeholder="请输入任务编号" style="width: 245px" />
                </el-form-item>
                <el-form-item label="收件用户编号">
                    <el-input
                        v-model="condition.recipient_user_id"
                        clearable
                        placeholder="请输入用户编号"
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
                title="未指定时间时默认查询最近 31 天；按请求编号或任务编号精确定位时不受默认时间窗口影响。"
                type="info"
                :closable="false"
                show-icon />
        </el-card>

        <el-card shadow="never" class="table-card">
            <el-table :data="table_data" class="notification-data-table" stripe>
                <el-table-column type="index" label="序号" width="65" align="center" />
                <el-table-column label="投递编号" prop="id" min-width="235" show-overflow-tooltip />
                <el-table-column label="任务编号" prop="task_id" min-width="235" show-overflow-tooltip />
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
                    label="供应商消息编号"
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
                :current-page="pagination.page"
                :page-size="pagination.size"
                :page-sizes="pagination.page_sizes"
                :total="pagination.total"
                background
                size="small"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange" />
        </el-card>

        <el-dialog v-model="detailVisible" title="通知投递记录详情" width="1050px" destroy-on-close>
            <div v-loading="detailLoading" class="detail-container">
                <template v-if="detail">
                    <el-descriptions :column="3" border>
                        <el-descriptions-item label="投递编号">{{ detail.id }}</el-descriptions-item>
                        <el-descriptions-item label="任务编号">{{ detail.task_id }}</el-descriptions-item>
                        <el-descriptions-item label="渠道">{{ channelLabel(detail.channel) }}</el-descriptions-item>
                        <el-descriptions-item label="供应商">{{ detail.provider_code || "—" }}</el-descriptions-item>
                        <el-descriptions-item label="状态">
                            <el-tag :type="statusTagType(detail.status)" size="small">
                                {{ statusLabel(detail.status) }}
                            </el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="供应商消息编号">
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
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    min-height: 0;
    padding: 14px;
    overflow-x: hidden;
    overflow-y: auto;
    box-sizing: border-box;
    background: var(--el-bg-color-page);
}

.page-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex: 0 0 auto;
}

.page-toolbar h2 {
    margin: 0;
    color: var(--el-text-color-primary);
    font-size: 20px;
}

.page-toolbar p {
    margin: 6px 0 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.search-card {
    flex: 0 0 auto;
}

.search-card :deep(.el-form-item) {
    margin-bottom: 12px;
}

.table-card {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 320px;
}

.table-card :deep(.el-card__body) {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
}

.notification-data-table {
    flex: 1 1 auto;
    min-height: 0;
}

.table-card :deep(.el-pagination) {
    justify-content: flex-end;
    margin-top: 12px;
}

.detail-container {
    min-height: 220px;
}
</style>
