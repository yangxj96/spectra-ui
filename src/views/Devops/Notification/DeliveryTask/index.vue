<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { ref } from "vue";

import { NotificationAdminApi } from "@/api/notification/notification-admin-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
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

const channelOptions: Array<{ label: string; value: NotificationAdminChannel }> = [
    { label: "站内信", value: "IN_APP" },
    { label: "短信", value: "SMS" },
    { label: "邮件", value: "EMAIL" }
];

const taskStatusOptions = [
    { label: "待处理", value: "PENDING" },
    { label: "处理中", value: "PROCESSING" },
    { label: "重试中", value: "RETRYING" },
    { label: "已发送", value: "SENT" },
    { label: "失败", value: "FAILED" },
    { label: "已阻断", value: "BLOCKED" },
    { label: "未知", value: "UNKNOWN" },
    { label: "已过期", value: "EXPIRED" },
    { label: "已取消", value: "CANCELLED" }
];

const deliveryStatusOptions = [
    { label: "已接受", value: "ACCEPTED" },
    { label: "已发送", value: "SENT" },
    { label: "失败", value: "FAILED" },
    { label: "已阻断", value: "BLOCKED" },
    { label: "未知", value: "UNKNOWN" }
];

const retryableStatuses = new Set(["FAILED", "BLOCKED", "UNKNOWN"]);
const cancellableStatuses = new Set(["PENDING", "RETRYING", "PROCESSING"]);

const condition = ref<NotificationAdminTaskQuery>({ page_num: 1, page_size: 15 });
const dateRange = ref<[DateModelType, DateModelType] | undefined>();
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable(
    NotificationAdminApi.pageTasks,
    condition.value
);

const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<NotificationTaskAdminVO>();
const detailDeliveries = ref<NotificationDeliveryAdminVO[]>([]);
const detailDeliveryTotal = ref(0);
const actionLoading = ref<string>();

function purposeLabel(purpose: string): string {
    return purposeOptions.find(item => item.value === purpose)?.label ?? purpose;
}

function channelLabel(channel: NotificationAdminChannel): string {
    return channelOptions.find(item => item.value === channel)?.label ?? channel;
}

function taskStatusLabel(status: string): string {
    return taskStatusOptions.find(item => item.value === status)?.label ?? status;
}

function deliveryStatusLabel(status: string): string {
    return deliveryStatusOptions.find(item => item.value === status)?.label ?? status;
}

function statusTagType(status: string): "success" | "warning" | "danger" | "info" {
    if (status === "SENT" || status === "ACCEPTED") return "success";
    if (["FAILED", "BLOCKED", "EXPIRED"].includes(status)) return "danger";
    if (["PROCESSING", "RETRYING", "UNKNOWN"].includes(status)) return "warning";
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
        recipient_user_id: undefined,
        status: undefined,
        channel: undefined,
        purpose: undefined,
        start_time: undefined,
        end_time: undefined,
        page_num: 1
    });
    void handlerConditionQuery();
}

async function openDetail(row: NotificationTaskAdminVO): Promise<void> {
    detailVisible.value = true;
    detailLoading.value = true;
    detail.value = undefined;
    detailDeliveries.value = [];
    detailDeliveryTotal.value = 0;
    try {
        const [task, deliveries] = await Promise.all([
            NotificationAdminApi.taskDetail(row.id),
            NotificationAdminApi.pageDeliveries({ task_id: row.id, page_num: 1, page_size: 100 })
        ]);
        detail.value = task;
        detailDeliveries.value = deliveries.records ?? [];
        detailDeliveryTotal.value = deliveries.total ?? detailDeliveries.value.length;
    } catch {
        ElMessage.error("通知任务详情加载失败，请稍后重试");
    } finally {
        detailLoading.value = false;
    }
}

async function retryTask(row: NotificationTaskAdminVO): Promise<void> {
    try {
        await ElMessageBox.confirm("确认重新排队该通知任务吗？", "重试确认", { type: "warning" });
    } catch {
        return;
    }

    actionLoading.value = row.id;
    try {
        await NotificationAdminApi.retryTask(row.id);
        ElMessage.success("通知任务已重新排队");
        await handlerConditionQuery();
        if (detailVisible.value && detail.value?.id === row.id) await openDetail(row);
    } catch {
        ElMessage.error("通知任务重试失败，请稍后重试");
    } finally {
        actionLoading.value = undefined;
    }
}

async function cancelTask(row: NotificationTaskAdminVO): Promise<void> {
    try {
        await ElMessageBox.confirm("确认取消该通知任务吗？取消后将不再投递。", "取消确认", { type: "warning" });
    } catch {
        return;
    }

    actionLoading.value = row.id;
    try {
        await NotificationAdminApi.cancelTask(row.id);
        ElMessage.success("通知任务已取消");
        await handlerConditionQuery();
        if (detailVisible.value && detail.value?.id === row.id) await openDetail(row);
    } catch {
        ElMessage.error("通知任务取消失败，请稍后重试");
    } finally {
        actionLoading.value = undefined;
    }
}
</script>

<template>
    <div class="notification-task-page">
        <el-row class="box__search">
            <el-form :inline="true" :model="condition">
                <el-form-item label="状态">
                    <el-select v-model="condition.status" clearable placeholder="全部状态" style="width: 130px">
                        <el-option
                            v-for="item in taskStatusOptions"
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
                <el-form-item label="请求编号">
                    <el-input
                        v-model="condition.request_id"
                        clearable
                        placeholder="请输入请求编号"
                        style="width: 245px" />
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
                title="未指定时间时默认查询最近 31 天；从请求详情进入任务时按请求编号精确定位。"
                type="info"
                :closable="false"
                show-icon />
        </el-row>

        <el-row class="box__body">
            <el-table :data="table_data" height="92%" stripe empty-text="暂无通知投递任务">
                <el-table-column type="index" label="序号" width="65" align="center" />
                <el-table-column label="任务编号" prop="id" min-width="245" show-overflow-tooltip />
                <el-table-column label="请求编号" prop="request_id" min-width="245" show-overflow-tooltip />
                <el-table-column label="渠道" width="90">
                    <template #default="scope">{{ channelLabel(scope.row.channel) }}</template>
                </el-table-column>
                <el-table-column label="用途" min-width="120">
                    <template #default="scope">{{ purposeLabel(scope.row.purpose) }}</template>
                </el-table-column>
                <el-table-column label="收件地址" prop="recipient_address" min-width="135" show-overflow-tooltip />
                <el-table-column label="状态" width="100" align="center">
                    <template #default="scope">
                        <el-tag :type="statusTagType(scope.row.status)" size="small">
                            {{ taskStatusLabel(scope.row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="重试" width="70" align="center" prop="retry_count" />
                <el-table-column label="创建时间" prop="created_at" width="170" show-overflow-tooltip />
                <el-table-column label="操作" width="150" fixed="right">
                    <template #default="scope">
                        <el-tooltip content="查看详情" placement="top">
                            <el-button link type="primary" @click="void openDetail(scope.row)">
                                <ComponentsIcons name="icon-eye" style="width: 1.4em; height: 1.4em" />
                            </el-button>
                        </el-tooltip>
                        <el-tooltip content="重试任务" placement="top">
                            <el-button
                                v-permission="'notification:admin:retry'"
                                link
                                type="warning"
                                :disabled="!retryableStatuses.has(scope.row.status)"
                                :loading="actionLoading === scope.row.id"
                                @click="void retryTask(scope.row)">
                                <ComponentsIcons name="icon-enable" style="width: 1.4em; height: 1.4em" />
                            </el-button>
                        </el-tooltip>
                        <el-tooltip content="取消任务" placement="top">
                            <el-button
                                v-permission="'notification:admin:cancel'"
                                link
                                type="danger"
                                :disabled="!cancellableStatuses.has(scope.row.status)"
                                :loading="actionLoading === scope.row.id"
                                @click="void cancelTask(scope.row)">
                                <ComponentsIcons name="icon-disable" style="width: 1.4em; height: 1.4em" />
                            </el-button>
                        </el-tooltip>
                    </template>
                </el-table-column>
            </el-table>
            <el-pagination
                layout="total, sizes, prev, pager, next"
                :current-page="pagination.page"
                :page-size="pagination.size"
                :page-sizes="pagination.page_sizes"
                :total="pagination.total"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange" />
        </el-row>

        <el-dialog v-model="detailVisible" title="通知投递任务详情" width="1180px" destroy-on-close>
            <div v-loading="detailLoading" class="detail-container">
                <template v-if="detail">
                    <el-descriptions :column="3" border>
                        <el-descriptions-item label="任务编号">{{ detail.id }}</el-descriptions-item>
                        <el-descriptions-item label="请求编号">{{ detail.request_id }}</el-descriptions-item>
                        <el-descriptions-item label="状态">
                            <el-tag :type="statusTagType(detail.status)" size="small">
                                {{ taskStatusLabel(detail.status) }}
                            </el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="渠道">{{ channelLabel(detail.channel) }}</el-descriptions-item>
                        <el-descriptions-item label="用途">{{ purposeLabel(detail.purpose) }}</el-descriptions-item>
                        <el-descriptions-item label="收件用户编号">
                            {{ detail.recipient_user_id || "—" }}
                        </el-descriptions-item>
                        <el-descriptions-item label="收件地址">
                            {{ detail.recipient_address || "—" }}
                        </el-descriptions-item>
                        <el-descriptions-item label="模板版本">
                            {{ detail.template_version_no ?? "—" }}
                        </el-descriptions-item>
                        <el-descriptions-item label="重试次数">{{ detail.retry_count }}</el-descriptions-item>
                        <el-descriptions-item label="最近错误" :span="3">
                            {{ detail.last_error || "—" }}
                        </el-descriptions-item>
                        <el-descriptions-item label="计划时间">
                            {{ formatOptionalDate(detail.scheduled_at) }}
                        </el-descriptions-item>
                        <el-descriptions-item label="过期时间">
                            {{ formatOptionalDate(detail.expires_at) }}
                        </el-descriptions-item>
                        <el-descriptions-item label="创建时间">
                            {{ formatOptionalDate(detail.created_at) }}
                        </el-descriptions-item>
                        <el-descriptions-item label="更新时间">
                            {{ formatOptionalDate(detail.updated_at) }}
                        </el-descriptions-item>
                        <el-descriptions-item label="模板摘要" :span="2">
                            {{ detail.template_version_digest || "—" }}
                        </el-descriptions-item>
                    </el-descriptions>

                    <div class="detail-section__header">
                        <h3>供应商投递记录</h3>
                        <span>
                            已加载 {{ detailDeliveries.length }} 条
                            <template v-if="detailDeliveryTotal > detailDeliveries.length">
                                ，请转到投递记录页查看全部
                            </template>
                        </span>
                    </div>
                    <el-table :data="detailDeliveries" stripe>
                        <el-table-column label="投递编号" prop="id" min-width="230" show-overflow-tooltip />
                        <el-table-column label="供应商" prop="provider_code" width="130" show-overflow-tooltip />
                        <el-table-column
                            label="供应商消息编号"
                            prop="provider_message_id"
                            min-width="180"
                            show-overflow-tooltip />
                        <el-table-column label="状态" width="100">
                            <template #default="scope">
                                <el-tag :type="statusTagType(scope.row.status)" size="small">
                                    {{ deliveryStatusLabel(scope.row.status) }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column
                            label="响应摘要"
                            prop="response_summary"
                            min-width="190"
                            show-overflow-tooltip />
                        <el-table-column label="发送时间" width="170">
                            <template #default="scope">{{ formatOptionalDate(scope.row.sent_at) }}</template>
                        </el-table-column>
                        <el-table-column label="创建时间" width="170">
                            <template #default="scope">{{ formatOptionalDate(scope.row.created_at) }}</template>
                        </el-table-column>
                    </el-table>
                    <el-empty
                        v-if="detailDeliveries.length === 0"
                        description="该任务暂无供应商投递记录"
                        :image-size="70" />
                </template>
                <el-empty v-else-if="!detailLoading" description="暂无详情" />
            </div>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.notification-task-page {
    height: 100%;
    min-height: 0;
    overflow: hidden;
    box-sizing: border-box;
    background: var(--el-bg-color);
}

.box__search {
    display: flex;
    height: 14%;
    min-height: 116px;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    padding: 8px 20px;
    box-sizing: border-box;
    overflow-x: hidden;
    overflow-y: auto;
}

.box__search :deep(.el-form) {
    display: flex;
    width: 100%;
    min-width: 0;
    flex-wrap: wrap;
    align-items: center;
}

.box__search :deep(.el-form-item) {
    margin-bottom: 0;
    margin-right: 16px;
    min-width: 0;
}

.box__search :deep(.el-form-item .el-input),
.box__search :deep(.el-form-item .el-select),
.box__search :deep(.el-form-item .el-date-editor) {
    max-width: 100%;
}

.box__search :deep(.el-alert) {
    margin-top: 6px;
}

.box__body {
    display: block;
    height: 86%;
    min-height: 0;
    padding: 0 20px;
    box-sizing: border-box;
}

.box__body :deep(.el-table) {
    width: 100%;
}

.box__body :deep(.el-pagination) {
    justify-content: flex-end;
    padding: 0 10px;
    margin-top: 4px;
    margin-left: auto;
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
