<script setup lang="ts">
import { Refresh } from "@element-plus/icons-vue";
import { BarChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref } from "vue";

import { NotificationAdminApi } from "@/api/notification/notification-admin-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

import type { EChartsOption } from "echarts";

const VChart = defineAsyncComponent(() => import("vue-echarts"));
use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent]);

const overview = ref<NotificationOverviewVO>();
const loading = ref(true);
const refreshing = ref(false);
const errorMessage = ref("");
const rangeHours = ref(24);
const refreshSeconds = ref(15);
let pollingTimer: ReturnType<typeof setInterval> | undefined;
let requestInFlight = false;

const rangeOptions = [
    { label: "最近 24 小时", value: 24 },
    { label: "最近 72 小时", value: 72 },
    { label: "最近 7 天", value: 168 }
];

const channelLabels: Record<NotificationAdminChannel, string> = {
    IN_APP: "站内信",
    SMS: "短信",
    EMAIL: "邮件"
};

const statusLabels: Record<string, string> = {
    FAILED: "失败",
    BLOCKED: "已阻断",
    UNKNOWN: "未知"
};

const trendOption = computed<EChartsOption>(() => ({
    tooltip: { trigger: "axis" },
    legend: { data: ["成功", "失败/阻断", "未知"] },
    grid: { left: 42, right: 20, top: 38, bottom: 32 },
    xAxis: {
        type: "category",
        data: (overview.value?.trend ?? []).map(item => formatTrendTime(item.bucket_at)),
        axisLabel: { hideOverlap: true }
    },
    yAxis: { type: "value", minInterval: 1 },
    series: [
        trendSeries(
            "成功",
            (overview.value?.trend ?? []).map(item => item.success_count),
            "#67c23a"
        ),
        trendSeries(
            "失败/阻断",
            (overview.value?.trend ?? []).map(item => item.failed_count),
            "#f56c6c"
        ),
        trendSeries(
            "未知",
            (overview.value?.trend ?? []).map(item => item.unknown_count),
            "#e6a23c"
        )
    ]
}));

async function loadData(showLoading = false): Promise<void> {
    if (requestInFlight) return;
    requestInFlight = true;
    if (showLoading) loading.value = true;
    else refreshing.value = true;
    try {
        overview.value = await NotificationAdminApi.overview(rangeHours.value, { loading: showLoading });
        errorMessage.value = "";
    } catch {
        errorMessage.value = "通知运行概览加载失败，当前保留上一次成功数据。";
        if (!overview.value) MessageUtils.error(errorMessage.value);
    } finally {
        loading.value = false;
        refreshing.value = false;
        requestInFlight = false;
    }
}

function startPolling(): void {
    stopPolling();
    pollingTimer = globalThis.setInterval(() => void loadData(), refreshSeconds.value * 1000);
}

function stopPolling(): void {
    if (pollingTimer) {
        globalThis.clearInterval(pollingTimer);
        pollingTimer = undefined;
    }
}

function changeRange(): void {
    void loadData(false);
}

function changeRefreshInterval(): void {
    startPolling();
}

function channelLabel(channel: NotificationAdminChannel): string {
    return channelLabels[channel] ?? channel;
}

function statusLabel(status: string): string {
    return statusLabels[status] ?? status;
}

function availabilityTagType(available: boolean): "success" | "danger" {
    return available ? "success" : "danger";
}

function availabilityText(available: boolean): string {
    return available ? "可用" : "不可用";
}

function availabilityReason(reason: string | null | undefined): string {
    if (!reason) return "可用";
    const labels: Record<string, string> = {
        AVAILABLE: "可用",
        PROVIDER_NOT_CONFIGURED: "尚未配置渠道服务",
        HEALTH_CHECK_REQUIRED: "需要重新执行健康检查",
        DISABLED_BY_CONFIGURATION: "已被配置为禁用",
        PROVIDER_NOT_REGISTERED: "当前运行环境未注册渠道服务",
        MODULE_DISABLED: "通知模块已关闭"
    };
    return labels[reason] ?? reason;
}

function formatTrendTime(value: string): string {
    const text = formatDateTime(value);
    return text === "—" ? text : text.slice(5, 16);
}

function formatPercent(value: number | undefined): string {
    return `${Number(value ?? 0).toFixed(1)}%`;
}

function formatOptionalDate(value: string | null | undefined): string {
    return value ? formatDateTime(value) : "—";
}

function trendSeries(name: string, data: number[], color: string) {
    return {
        name,
        type: "bar" as const,
        stack: "total",
        barMaxWidth: 22,
        itemStyle: { color },
        data
    };
}

onMounted(() => {
    void loadData(true);
    startPolling();
});

onUnmounted(() => {
    stopPolling();
});
</script>

<template>
    <div v-loading="loading" class="notification-overview-page">
        <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

        <div class="overview-toolbar">
            <div class="overview-toolbar__actions">
                <el-select v-model="rangeHours" style="width: 150px" @change="changeRange">
                    <el-option v-for="item in rangeOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
                <el-select v-model="refreshSeconds" style="width: 120px" @change="changeRefreshInterval">
                    <el-option :value="15" label="15 秒刷新" />
                    <el-option :value="30" label="30 秒刷新" />
                    <el-option :value="60" label="60 秒刷新" />
                </el-select>
                <el-button :loading="refreshing" @click="void loadData(false)">
                    <el-icon><Refresh /></el-icon>
                    刷新
                </el-button>
            </div>
        </div>

        <template v-if="overview">
            <div class="metric-grid">
                <el-card shadow="never" class="metric-card">
                    <div class="metric-card__label">待处理任务</div>
                    <div class="metric-card__value">{{ overview.pending_task_count }}</div>
                    <div class="metric-card__detail">
                        处理中 {{ overview.processing_task_count }} · 最早计划
                        {{ formatOptionalDate(overview.oldest_pending_task_at) }}
                    </div>
                </el-card>
                <el-card shadow="never" class="metric-card">
                    <div class="metric-card__label">失败任务</div>
                    <div class="metric-card__value metric-card__value--danger">{{ overview.failed_task_count }}</div>
                    <div class="metric-card__detail">当前失败或阻断任务</div>
                </el-card>
                <el-card shadow="never" class="metric-card">
                    <div class="metric-card__label">未知状态任务</div>
                    <div class="metric-card__value metric-card__value--warning">{{ overview.unknown_task_count }}</div>
                    <div class="metric-card__detail">需要人工确认或受控重试</div>
                </el-card>
                <el-card shadow="never" class="metric-card">
                    <div class="metric-card__label">窗口失败率</div>
                    <div class="metric-card__value">{{ formatPercent(overview.failure_rate) }}</div>
                    <div class="metric-card__detail">
                        {{ overview.failed_delivery_count }} / {{ overview.delivery_count }} 次投递尝试
                    </div>
                </el-card>
            </div>

            <el-row :gutter="12" class="overview-row">
                <el-col :span="12">
                    <el-card shadow="never" class="section-card">
                        <template #header>
                            <div class="section-card__header">
                                <span>渠道状态</span>
                                <span class="section-card__hint">
                                    最近生成 {{ formatDateTime(overview.generated_at) }}
                                </span>
                            </div>
                        </template>
                        <el-table :data="overview.channels" stripe>
                            <el-table-column label="渠道" min-width="100">
                                <template #default="scope">{{ channelLabel(scope.row.availability.channel) }}</template>
                            </el-table-column>
                            <el-table-column label="状态" width="100">
                                <template #default="scope">
                                    <el-tag :type="availabilityTagType(scope.row.availability.available)" size="small">
                                        {{ availabilityText(scope.row.availability.available) }}
                                    </el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column label="说明" min-width="150" show-overflow-tooltip>
                                <template #default="scope">
                                    {{ availabilityReason(scope.row.availability.reason) }}
                                </template>
                            </el-table-column>
                            <el-table-column label="待处理" prop="pending_task_count" width="90" />
                            <el-table-column label="失败" prop="failed_task_count" width="75" />
                            <el-table-column label="未知" prop="unknown_task_count" width="90" />
                        </el-table>
                    </el-card>
                </el-col>
                <el-col :span="12">
                    <el-card shadow="never" class="section-card">
                        <template #header>
                            <div class="section-card__header">
                                <span>最近错误</span>
                                <span class="section-card__hint">最多展示 10 条</span>
                            </div>
                        </template>
                        <el-table :data="overview.recent_errors" empty-text="暂无错误" stripe>
                            <el-table-column label="时间" width="155">
                                <template #default="scope">{{ formatDateTime(scope.row.occurred_at) }}</template>
                            </el-table-column>
                            <el-table-column label="渠道" width="85">
                                <template #default="scope">{{ channelLabel(scope.row.channel) }}</template>
                            </el-table-column>
                            <el-table-column label="状态" width="95">
                                <template #default="scope">
                                    <el-tag type="danger" size="small">{{ statusLabel(scope.row.status) }}</el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column label="错误" min-width="150" show-overflow-tooltip>
                                <template #default="scope">
                                    {{ scope.row.error_code || scope.row.message || "—" }}
                                </template>
                            </el-table-column>
                        </el-table>
                    </el-card>
                </el-col>
            </el-row>

            <el-card shadow="never" class="section-card trend-card">
                <template #header>
                    <div class="section-card__header">
                        <span>投递结果趋势</span>
                        <span class="section-card__hint">
                            成功：{{ overview.successful_delivery_count }} · 未知：{{ overview.unknown_delivery_count }}
                        </span>
                    </div>
                </template>
                <VChart v-if="overview.trend.length" class="trend-chart" :option="trendOption" autoresize />
                <el-empty v-else description="窗口内暂无投递趋势" />
            </el-card>
        </template>
        <el-empty v-else-if="!loading" description="暂无通知运行数据" />
    </div>
</template>

<style scoped lang="scss">
.notification-overview-page {
    height: 100%;
    min-height: 0;
    padding: 14px;
    overflow-x: hidden;
    overflow-y: auto;
    box-sizing: border-box;
    background: var(--el-bg-color-page);
}

.overview-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    margin-bottom: 14px;
}

.overview-toolbar__actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.metric-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
}

.metric-card__label {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.metric-card__value {
    margin: 8px 0;
    color: var(--el-text-color-primary);
    font-size: 26px;
    font-weight: 600;
}

.metric-card__value--danger {
    color: var(--el-color-danger);
}

.metric-card__value--warning {
    color: var(--el-color-warning);
}

.metric-card__detail {
    min-height: 18px;
    overflow: hidden;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.overview-row,
.trend-card {
    margin-top: 12px;
}

.section-card {
    height: auto;
}

.section-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.section-card__hint {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    font-weight: 400;
}

.trend-chart {
    width: 100%;
    height: 300px;
}

@media (max-width: 1100px) {
    .metric-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .overview-row {
        display: block;
    }

    .overview-row .el-col {
        max-width: 100%;
        margin-top: 12px;
    }
}

@media (max-width: 700px) {
    .overview-toolbar {
        align-items: flex-start;
        flex-direction: column;
    }

    .overview-toolbar__actions {
        width: 100%;
        flex-wrap: wrap;
    }

    .metric-grid {
        grid-template-columns: 1fr;
    }
}
</style>
