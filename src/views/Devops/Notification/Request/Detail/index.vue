<script setup lang="ts">
import { ElMessageBox } from "element-plus";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { NotificationAdminApi } from "@/api/notification/notification-admin-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import { notificationResponseSummaryLabel } from "@/utils/notification-labels.ts";

type StepKey = "request" | "tasks" | "delivery" | "complete";
type StepStatus = "wait" | "process" | "finish" | "error" | "success";

interface RequestStep {
    key: StepKey;
    title: string;
    description: string;
    status: StepStatus;
}

const route = useRoute();
const router = useRouter();

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

const requestStatusOptions = [
    { label: "已接受", value: "ACCEPTED" },
    { label: "分发中", value: "DISPATCHING" },
    { label: "已成功", value: "SUCCEEDED" },
    { label: "部分成功", value: "PARTIAL" },
    { label: "失败", value: "FAILED" },
    { label: "已取消", value: "CANCELLED" },
    { label: "已过期", value: "EXPIRED" }
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

const channelOptions: Array<{ label: string; value: NotificationAdminChannel }> = [
    { label: "站内信", value: "IN_APP" },
    { label: "短信", value: "SMS" },
    { label: "邮件", value: "EMAIL" }
];

const retryableStatuses = new Set(["FAILED", "BLOCKED", "UNKNOWN"]);
const cancellableStatuses = new Set(["PENDING", "RETRYING", "PROCESSING"]);
const terminalRequestStatuses = new Set(["SUCCEEDED", "PARTIAL", "FAILED", "CANCELLED", "EXPIRED"]);

const requestId = computed(() => {
    const value = route.query.id;
    return typeof value === "string" ? value : "";
});

const detailLoading = ref(false);
const detail = ref<NotificationRequestAdminVO>();
const detailTasks = ref<NotificationTaskAdminVO[]>([]);
const detailTasksLoading = ref(false);
const detailTaskTotal = ref(0);
const detailTaskPage = ref(1);
const detailTaskPageSize = ref(10);
const expandedTaskIds = ref<string[]>([]);
const activeTaskId = ref<string>();
const taskDeliveryLoading = ref(false);
const taskDeliveries = ref<NotificationDeliveryAdminVO[]>([]);
const taskDeliveryTotal = ref(0);
const taskDeliveryPage = ref(1);
const taskDeliveryPageSize = 10;
const actionLoading = ref<string>();

const stepDetailVisible = ref(false);
const selectedStepKey = ref<StepKey>();
const deliveryDetailVisible = ref(false);
const deliveryDetailLoading = ref(false);
const deliveryDetail = ref<NotificationDeliveryAdminVO>();

function purposeLabel(purpose: string): string {
    return purposeOptions.find(item => item.value === purpose)?.label ?? purpose;
}

function requestStatusLabel(status: string): string {
    return requestStatusOptions.find(item => item.value === status)?.label ?? status;
}

function taskStatusLabel(status: string): string {
    return taskStatusOptions.find(item => item.value === status)?.label ?? status;
}

function deliveryStatusLabel(status: string): string {
    return deliveryStatusOptions.find(item => item.value === status)?.label ?? status;
}

function channelLabel(channel: NotificationAdminChannel): string {
    return channelOptions.find(item => item.value === channel)?.label ?? channel;
}

function statusTagType(status: string): "success" | "warning" | "danger" | "info" {
    if (["SUCCEEDED", "SENT", "ACCEPTED"].includes(status)) return "success";
    if (["FAILED", "BLOCKED", "EXPIRED"].includes(status)) return "danger";
    if (["PARTIAL", "DISPATCHING", "PROCESSING", "RETRYING", "UNKNOWN"].includes(status)) return "warning";
    return "info";
}

function formatOptionalDate(value: string | null | undefined): string {
    return value ? formatDateTime(value) : "—";
}

function requestStepStatus(status: string | undefined): StepStatus {
    if (!status) return "wait";
    if (status === "FAILED" || status === "EXPIRED" || status === "CANCELLED") return "error";
    return "success";
}

function tasksStepStatus(request: NotificationRequestAdminVO | undefined): StepStatus {
    if (!request) return "wait";
    if (request.task_count > 0) return "success";
    if (request.status === "FAILED") return "error";
    return "process";
}

function deliveryStepStatus(status: string | undefined): StepStatus {
    if (!status || status === "ACCEPTED") return "wait";
    if (status === "DISPATCHING") return "process";
    if (status === "SUCCEEDED") return "success";
    return "error";
}

function completeStepStatus(status: string | undefined): StepStatus {
    if (!status || status === "ACCEPTED" || status === "DISPATCHING") return "wait";
    if (status === "SUCCEEDED") return "success";
    if (terminalRequestStatuses.has(status)) return "error";
    return "process";
}

const requestSteps = computed<RequestStep[]>(() => {
    const request = detail.value;
    const status = request?.status;
    return [
        {
            key: "request",
            title: "请求已接收",
            description: request
                ? `${requestStatusLabel(request.status)} · ${formatOptionalDate(request.created_at)}`
                : "等待加载",
            status: requestStepStatus(status)
        },
        {
            key: "tasks",
            title: "任务已拆分",
            description: request ? `已生成 ${request.task_count} 条投递任务` : "等待加载",
            status: tasksStepStatus(request)
        },
        {
            key: "delivery",
            title: "渠道投递",
            description: request ? `当前状态：${requestStatusLabel(request.status)}` : "等待加载",
            status: deliveryStepStatus(status)
        },
        {
            key: "complete",
            title: "处理完成",
            description: request ? requestStatusLabel(request.status) : "等待加载",
            status: completeStepStatus(status)
        }
    ];
});

const selectedStep = computed(() => requestSteps.value.find(step => step.key === selectedStepKey.value));

const taskChannelSummary = computed(() => {
    const counts = new Map<NotificationAdminChannel, number>();
    for (const task of detailTasks.value) counts.set(task.channel, (counts.get(task.channel) ?? 0) + 1);
    return (
        channelOptions
            .filter(item => counts.has(item.value))
            .map(item => `${item.label} ${counts.get(item.value)}`)
            .join(" · ") || "暂无已加载任务"
    );
});

const taskStatusSummary = computed(() => {
    const counts = new Map<string, number>();
    for (const task of detailTasks.value) counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
    return (
        [...counts.entries()].map(([status, count]) => `${taskStatusLabel(status)} ${count}`).join(" · ") ||
        "暂无已加载任务"
    );
});

async function loadTasks(requestKey: string, page = 1): Promise<void> {
    detailTasksLoading.value = true;
    try {
        const tasks = await NotificationAdminApi.pageTasks({
            request_id: requestKey,
            page_num: page,
            page_size: detailTaskPageSize.value
        });
        detailTasks.value = tasks.records ?? [];
        detailTaskTotal.value = tasks.total ?? detailTasks.value.length;
        detailTaskPage.value = page;
        expandedTaskIds.value = [];
        activeTaskId.value = undefined;
        taskDeliveries.value = [];
        taskDeliveryTotal.value = 0;
    } catch {
        MessageUtils.error("投递任务加载失败，请稍后重试");
    } finally {
        detailTasksLoading.value = false;
    }
}

async function loadRequest(requestKey: string): Promise<void> {
    detailLoading.value = true;
    detail.value = undefined;
    try {
        const [request, tasks] = await Promise.all([
            NotificationAdminApi.requestDetail(requestKey),
            NotificationAdminApi.pageTasks({ request_id: requestKey, page_num: 1, page_size: detailTaskPageSize.value })
        ]);
        detail.value = request;
        detailTasks.value = tasks.records ?? [];
        detailTaskTotal.value = tasks.total ?? detailTasks.value.length;
        detailTaskPage.value = 1;
        expandedTaskIds.value = [];
        activeTaskId.value = undefined;
        taskDeliveries.value = [];
        taskDeliveryTotal.value = 0;
    } catch {
        MessageUtils.error("通知请求详情加载失败，请稍后重试");
    } finally {
        detailLoading.value = false;
    }
}

async function loadTaskDeliveries(taskId: string, page = 1): Promise<void> {
    taskDeliveryLoading.value = true;
    try {
        const deliveries = await NotificationAdminApi.pageDeliveries({
            task_id: taskId,
            page_num: page,
            page_size: taskDeliveryPageSize
        });
        if (activeTaskId.value !== taskId) return;
        taskDeliveries.value = deliveries.records ?? [];
        taskDeliveryTotal.value = deliveries.total ?? taskDeliveries.value.length;
        taskDeliveryPage.value = page;
    } catch {
        if (activeTaskId.value === taskId) MessageUtils.error("投递记录加载失败，请稍后重试");
    } finally {
        if (activeTaskId.value === taskId) taskDeliveryLoading.value = false;
    }
}

function handleTaskExpand(row: NotificationTaskAdminVO, expandedRows: NotificationTaskAdminVO[]): void {
    if (!expandedRows.some(item => item.id === row.id)) {
        if (activeTaskId.value === row.id) {
            activeTaskId.value = undefined;
            taskDeliveries.value = [];
            taskDeliveryTotal.value = 0;
        }
        return;
    }

    expandedTaskIds.value = [row.id];
    activeTaskId.value = row.id;
    taskDeliveryPage.value = 1;
    taskDeliveries.value = [];
    taskDeliveryTotal.value = 0;
    void loadTaskDeliveries(row.id);
}

function handleTaskPageChange(page: number): void {
    if (requestId.value) void loadTasks(requestId.value, page);
}

function handleTaskPageSizeChange(size: number): void {
    detailTaskPageSize.value = size;
    handleTaskPageChange(1);
}

function handleTaskDeliveryPageChange(page: number): void {
    if (activeTaskId.value) void loadTaskDeliveries(activeTaskId.value, page);
}

function openStepDetail(key: StepKey): void {
    selectedStepKey.value = key;
    stepDetailVisible.value = true;
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
        MessageUtils.success("通知任务已重新排队");
        if (requestId.value) await loadRequest(requestId.value);
    } catch {
        MessageUtils.error("通知任务重试失败，请稍后重试");
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
        MessageUtils.success("通知任务已取消");
        if (requestId.value) await loadRequest(requestId.value);
    } catch {
        MessageUtils.error("通知任务取消失败，请稍后重试");
    } finally {
        actionLoading.value = undefined;
    }
}

async function openDeliveryDetail(row: NotificationDeliveryAdminVO): Promise<void> {
    deliveryDetailVisible.value = true;
    deliveryDetailLoading.value = true;
    deliveryDetail.value = undefined;
    try {
        deliveryDetail.value = await NotificationAdminApi.deliveryDetail(row.id);
    } catch {
        MessageUtils.error("投递记录详情加载失败，请稍后重试");
    } finally {
        deliveryDetailLoading.value = false;
    }
}

function goBack(): void {
    void router.push({ name: "DevopsNotificationRequest" });
}

watch(
    requestId,
    value => {
        if (!value) {
            goBack();
            return;
        }
        void loadRequest(value);
    },
    { immediate: true }
);
</script>

<template>
    <div class="notification-request-detail-page">
        <div class="detail-toolbar">
            <el-button link type="primary" @click="goBack">
                <ComponentsIcons name="icon-arrow-left" style="width: 1.2em; height: 1.2em" />
                返回通知投递
            </el-button>
            <span v-if="detail" class="detail-toolbar__title">请求执行详情</span>
        </div>

        <div v-loading="detailLoading" class="detail-content">
            <template v-if="detail">
                <el-card class="detail-card" shadow="never">
                    <template #header>
                        <div class="card-header">
                            <span>请求概况</span>
                            <el-tag :type="statusTagType(detail.status)" size="small">
                                {{ requestStatusLabel(detail.status) }}
                            </el-tag>
                        </div>
                    </template>
                    <el-descriptions :column="4" border>
                        <el-descriptions-item label="请求编号" :span="2">
                            <span class="detail-id">{{ detail.id }}</span>
                        </el-descriptions-item>
                        <el-descriptions-item label="用途">{{ purposeLabel(detail.purpose) }}</el-descriptions-item>
                        <el-descriptions-item label="模板组">{{ detail.template_code }}</el-descriptions-item>
                        <el-descriptions-item label="来源模块">{{ detail.source_module || "—" }}</el-descriptions-item>
                        <el-descriptions-item label="优先级">{{ detail.priority ?? "—" }}</el-descriptions-item>
                        <el-descriptions-item label="业务类型">{{ detail.business_type || "—" }}</el-descriptions-item>
                        <el-descriptions-item label="业务编号">{{ detail.business_id || "—" }}</el-descriptions-item>
                        <el-descriptions-item label="接收人数">{{ detail.recipient_count }}</el-descriptions-item>
                        <el-descriptions-item label="任务数">{{ detail.task_count }}</el-descriptions-item>
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
                    </el-descriptions>
                </el-card>

                <el-card class="detail-card" shadow="never">
                    <template #header>
                        <div class="card-header">
                            <span>执行链路</span>
                            <span class="card-header__hint">点击步骤查看步骤详情</span>
                        </div>
                    </template>
                    <el-steps class="execution-steps" align-center>
                        <el-step
                            v-for="step in requestSteps"
                            :key="step.key"
                            class="execution-step"
                            :title="step.title"
                            :description="step.description"
                            :status="step.status"
                            @click="openStepDetail(step.key)" />
                    </el-steps>
                </el-card>

                <el-card class="detail-card task-card" shadow="never">
                    <template #header>
                        <div class="card-header">
                            <span>投递任务</span>
                            <span class="card-header__hint">
                                共 {{ detailTaskTotal }} 条，当前加载 {{ detailTasks.length }} 条
                            </span>
                        </div>
                    </template>
                    <el-table
                        v-loading="detailTasksLoading"
                        :data="detailTasks"
                        row-key="id"
                        :expand-row-keys="expandedTaskIds"
                        stripe
                        empty-text="该请求暂无关联任务"
                        @expand-change="handleTaskExpand">
                        <el-table-column type="expand">
                            <template #default="scope">
                                <div class="task-expanded">
                                    <div class="task-expanded__header">
                                        <span>任务详情</span>
                                        <div class="task-expanded__actions">
                                            <el-button
                                                v-permission="'notification:admin:retry'"
                                                size="small"
                                                type="warning"
                                                :disabled="!retryableStatuses.has(scope.row.status)"
                                                :loading="actionLoading === scope.row.id"
                                                @click="void retryTask(scope.row)">
                                                重试任务
                                            </el-button>
                                            <el-button
                                                v-permission="'notification:admin:cancel'"
                                                size="small"
                                                type="danger"
                                                :disabled="!cancellableStatuses.has(scope.row.status)"
                                                :loading="actionLoading === scope.row.id"
                                                @click="void cancelTask(scope.row)">
                                                取消任务
                                            </el-button>
                                        </div>
                                    </div>
                                    <el-descriptions :column="4" border>
                                        <el-descriptions-item label="任务编号" :span="2">
                                            <span class="detail-id">{{ scope.row.id }}</span>
                                        </el-descriptions-item>
                                        <el-descriptions-item label="请求编号" :span="2">
                                            <span class="detail-id">{{ scope.row.request_id }}</span>
                                        </el-descriptions-item>
                                        <el-descriptions-item label="渠道">
                                            {{ channelLabel(scope.row.channel) }}
                                        </el-descriptions-item>
                                        <el-descriptions-item label="状态">
                                            <el-tag :type="statusTagType(scope.row.status)" size="small">
                                                {{ taskStatusLabel(scope.row.status) }}
                                            </el-tag>
                                        </el-descriptions-item>
                                        <el-descriptions-item label="收件用户编号">
                                            {{ scope.row.recipient_user_id || "—" }}
                                        </el-descriptions-item>
                                        <el-descriptions-item label="收件地址">
                                            {{ scope.row.recipient_address || "—" }}
                                        </el-descriptions-item>
                                        <el-descriptions-item label="模板版本">
                                            {{ scope.row.template_version_no ?? "—" }}
                                        </el-descriptions-item>
                                        <el-descriptions-item label="重试次数">
                                            {{ scope.row.retry_count }}
                                        </el-descriptions-item>
                                        <el-descriptions-item label="最近错误" :span="2">
                                            {{ scope.row.last_error || "—" }}
                                        </el-descriptions-item>
                                    </el-descriptions>

                                    <div class="task-expanded__section-header">
                                        <span>投递尝试记录</span>
                                        <span class="card-header__hint">
                                            {{
                                                activeTaskId === scope.row.id
                                                    ? `共 ${taskDeliveryTotal} 条`
                                                    : "展开后加载"
                                            }}
                                        </span>
                                    </div>
                                    <el-table
                                        v-loading="activeTaskId === scope.row.id && taskDeliveryLoading"
                                        :data="activeTaskId === scope.row.id ? taskDeliveries : []"
                                        stripe
                                        empty-text="暂无投递尝试记录">
                                        <el-table-column
                                            label="投递编号"
                                            prop="id"
                                            min-width="230"
                                            show-overflow-tooltip />
                                        <el-table-column
                                            label="供应商"
                                            prop="provider_code"
                                            width="130"
                                            show-overflow-tooltip />
                                        <el-table-column label="状态" width="100">
                                            <template #default="deliveryScope">
                                                <el-tag :type="statusTagType(deliveryScope.row.status)" size="small">
                                                    {{ deliveryStatusLabel(deliveryScope.row.status) }}
                                                </el-tag>
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="响应摘要" min-width="190" show-overflow-tooltip>
                                            <template #default="deliveryScope">
                                                {{
                                                    notificationResponseSummaryLabel(deliveryScope.row.response_summary)
                                                }}
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="发送时间" width="170">
                                            <template #default="deliveryScope">
                                                {{ formatOptionalDate(deliveryScope.row.sent_at) }}
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="操作" width="70" fixed="right">
                                            <template #default="deliveryScope">
                                                <el-tooltip content="查看记录详情" placement="top">
                                                    <el-button
                                                        link
                                                        type="primary"
                                                        @click="void openDeliveryDetail(deliveryScope.row)">
                                                        <ComponentsIcons
                                                            name="icon-eye"
                                                            style="width: 1.4em; height: 1.4em" />
                                                    </el-button>
                                                </el-tooltip>
                                            </template>
                                        </el-table-column>
                                    </el-table>
                                    <el-pagination
                                        v-if="activeTaskId === scope.row.id && taskDeliveryTotal > taskDeliveryPageSize"
                                        class="task-delivery-pagination"
                                        layout="total, prev, pager, next"
                                        :current-page="taskDeliveryPage"
                                        :page-size="taskDeliveryPageSize"
                                        :total="taskDeliveryTotal"
                                        @current-change="handleTaskDeliveryPageChange" />
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column label="任务编号" prop="id" min-width="245" show-overflow-tooltip />
                        <el-table-column label="渠道" width="90">
                            <template #default="scope">{{ channelLabel(scope.row.channel) }}</template>
                        </el-table-column>
                        <el-table-column
                            label="收件地址"
                            prop="recipient_address"
                            min-width="150"
                            show-overflow-tooltip />
                        <el-table-column label="状态" width="100" align="center">
                            <template #default="scope">
                                <el-tag :type="statusTagType(scope.row.status)" size="small">
                                    {{ taskStatusLabel(scope.row.status) }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="重试次数" width="90" align="center" prop="retry_count" />
                        <el-table-column label="最近错误" min-width="180" prop="last_error" show-overflow-tooltip />
                        <el-table-column label="创建时间" width="170" prop="created_at" />
                    </el-table>
                    <el-pagination
                        layout="total, sizes, prev, pager, next"
                        :current-page="detailTaskPage"
                        :page-size="detailTaskPageSize"
                        :page-sizes="[10, 20, 50]"
                        :total="detailTaskTotal"
                        @size-change="handleTaskPageSizeChange"
                        @current-change="handleTaskPageChange" />
                </el-card>
            </template>
            <el-empty v-else-if="!detailLoading" description="暂无通知请求详情" />
        </div>

        <el-dialog
            v-model="stepDetailVisible"
            :title="`${selectedStep?.title ?? '执行步骤'}详情`"
            width="760px"
            append-to-body
            destroy-on-close>
            <template v-if="detail && selectedStep">
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="步骤">{{ selectedStep.title }}</el-descriptions-item>
                    <el-descriptions-item label="状态">
                        <el-tag :type="statusTagType(detail.status)" size="small">
                            {{ requestStatusLabel(detail.status) }}
                        </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="请求编号" :span="2">
                        <span class="detail-id">{{ detail.id }}</span>
                    </el-descriptions-item>
                    <template v-if="selectedStepKey === 'request'">
                        <el-descriptions-item label="用途">{{ purposeLabel(detail.purpose) }}</el-descriptions-item>
                        <el-descriptions-item label="模板组">{{ detail.template_code }}</el-descriptions-item>
                        <el-descriptions-item label="来源模块">{{ detail.source_module || "—" }}</el-descriptions-item>
                        <el-descriptions-item label="创建时间">
                            {{ formatOptionalDate(detail.created_at) }}
                        </el-descriptions-item>
                    </template>
                    <template v-else-if="selectedStepKey === 'tasks'">
                        <el-descriptions-item label="任务总数">{{ detail.task_count }}</el-descriptions-item>
                        <el-descriptions-item label="当前加载">{{ detailTasks.length }} 条</el-descriptions-item>
                        <el-descriptions-item label="渠道分布" :span="2">{{ taskChannelSummary }}</el-descriptions-item>
                    </template>
                    <template v-else-if="selectedStepKey === 'delivery'">
                        <el-descriptions-item label="当前状态">
                            {{ requestStatusLabel(detail.status) }}
                        </el-descriptions-item>
                        <el-descriptions-item label="任务总数">{{ detail.task_count }}</el-descriptions-item>
                        <el-descriptions-item label="当前页任务状态" :span="2">
                            {{ taskStatusSummary }}
                        </el-descriptions-item>
                    </template>
                    <template v-else>
                        <el-descriptions-item label="最终结果">
                            {{ requestStatusLabel(detail.status) }}
                        </el-descriptions-item>
                        <el-descriptions-item label="接收人数">{{ detail.recipient_count }}</el-descriptions-item>
                        <el-descriptions-item label="任务数">{{ detail.task_count }}</el-descriptions-item>
                        <el-descriptions-item label="更新时间">
                            {{ formatOptionalDate(detail.updated_at) }}
                        </el-descriptions-item>
                    </template>
                </el-descriptions>
            </template>
        </el-dialog>

        <el-dialog v-model="deliveryDetailVisible" title="投递记录详情" width="720px" append-to-body destroy-on-close>
            <div v-loading="deliveryDetailLoading" class="delivery-detail-container">
                <template v-if="deliveryDetail">
                    <el-descriptions :column="2" border>
                        <el-descriptions-item label="投递编号" :span="2">
                            <span class="detail-id">{{ deliveryDetail.id }}</span>
                        </el-descriptions-item>
                        <el-descriptions-item label="任务编号" :span="2">
                            <span class="detail-id">{{ deliveryDetail.task_id }}</span>
                        </el-descriptions-item>
                        <el-descriptions-item label="渠道">
                            {{ channelLabel(deliveryDetail.channel) }}
                        </el-descriptions-item>
                        <el-descriptions-item label="供应商">
                            {{ deliveryDetail.provider_code || "—" }}
                        </el-descriptions-item>
                        <el-descriptions-item label="状态">
                            <el-tag :type="statusTagType(deliveryDetail.status)" size="small">
                                {{ deliveryStatusLabel(deliveryDetail.status) }}
                            </el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="供应商消息编号">
                            <span class="detail-id">{{ deliveryDetail.provider_message_id || "—" }}</span>
                        </el-descriptions-item>
                        <el-descriptions-item label="模板版本">
                            {{ deliveryDetail.template_version_no ?? "—" }}
                        </el-descriptions-item>
                        <el-descriptions-item label="错误码">
                            {{ deliveryDetail.error_code || "—" }}
                        </el-descriptions-item>
                        <el-descriptions-item label="发送时间">
                            {{ formatOptionalDate(deliveryDetail.sent_at) }}
                        </el-descriptions-item>
                        <el-descriptions-item label="创建时间">
                            {{ formatOptionalDate(deliveryDetail.created_at) }}
                        </el-descriptions-item>
                        <el-descriptions-item label="模板摘要" :span="2">
                            {{ deliveryDetail.template_version_digest || "—" }}
                        </el-descriptions-item>
                        <el-descriptions-item label="脱敏错误" :span="2">
                            {{ deliveryDetail.error_message || "—" }}
                        </el-descriptions-item>
                        <el-descriptions-item label="响应摘要" :span="2">
                            {{ notificationResponseSummaryLabel(deliveryDetail.response_summary) }}
                        </el-descriptions-item>
                    </el-descriptions>
                </template>
                <el-empty v-else-if="!deliveryDetailLoading" description="暂无投递记录详情" />
            </div>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.notification-request-detail-page {
    display: flex;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
    box-sizing: border-box;
    background: var(--el-bg-color);
}

.detail-toolbar {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 14px;
    padding: 0 4px;
}

.detail-toolbar__title {
    color: var(--el-text-color-primary);
    font-size: 18px;
    font-weight: 600;
}

.detail-content {
    min-height: 0;
    flex: 1;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0 4px 12px;
}

.detail-card {
    margin-bottom: 12px;
}

.card-header,
.task-expanded__header,
.task-expanded__section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.card-header__hint {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.execution-steps {
    padding: 8px 18px 4px;
}

.execution-step {
    cursor: pointer;
}

.task-card {
    overflow: hidden;
}

.task-expanded {
    padding: 8px 16px 14px;
    background: var(--el-fill-color-light);
}

.task-expanded__header {
    margin-bottom: 10px;
    color: var(--el-text-color-primary);
    font-size: 14px;
    font-weight: 600;
}

.task-expanded__actions {
    display: flex;
    gap: 8px;
}

.task-expanded__section-header {
    margin: 16px 0 8px;
    color: var(--el-text-color-primary);
    font-size: 14px;
    font-weight: 600;
}

.task-delivery-pagination {
    justify-content: flex-end;
    padding: 10px 0 0;
}

.detail-id {
    overflow-wrap: anywhere;
    word-break: break-all;
}

.detail-content :deep(.el-pagination) {
    justify-content: flex-end;
    padding: 12px 0 0;
}

.delivery-detail-container {
    min-height: 220px;
}
</style>
