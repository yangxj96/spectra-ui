<script setup lang="ts">
import { Refresh } from "@element-plus/icons-vue";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref } from "vue";

import { ServiceMonitorApi } from "@/api/system/service-monitor-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

import type { EChartsOption } from "echarts";

const VChart = defineAsyncComponent(() => import("vue-echarts"));
use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent]);

const overview = ref<ServiceMonitorOverview>();
const loading = ref(true);
const refreshing = ref(false);
const errorMessage = ref("");
const refreshSeconds = ref(10);
const historyRange = ref<ServiceMonitorHistoryRange>("30m");
const historical = ref<ServiceMonitorHistory>();
const historyLoading = ref(false);
let pollingTimer: ReturnType<typeof setInterval> | undefined;
let requestInFlight = false;

const summary = computed(() => overview.value?.summary);
const history = computed(() => {
    if (historyRange.value === "30m") {
        return overview.value?.history?.length ? overview.value.history : (historical.value?.points ?? []);
    }
    return historical.value?.points ?? [];
});
const cpuEquivalentCores = computed(() => {
    const usage = toNumber(summary.value?.cpu_usage);
    const logicalCores = toNumber(summary.value?.cpu_logical_cores);
    return (usage / 100) * logicalCores;
});
const statusTagType = computed<"success" | "warning" | "danger" | "info">(() => {
    switch (overview.value?.status) {
        case "HEALTHY":
            return "success";
        case "WARNING":
            return "warning";
        case "DEGRADED":
        case "DOWN":
            return "danger";
        default:
            return "info";
    }
});
const freshnessTagType = computed<"success" | "warning" | "danger" | "info">(() => {
    switch (overview.value?.data_freshness) {
        case "CURRENT":
            return "success";
        case "DELAYED":
            return "warning";
        case "STALE":
            return "danger";
        default:
            return "info";
    }
});

const resourceChartOption = computed<EChartsOption>(() => {
    const points = history.value;
    return {
        tooltip: { trigger: "axis" },
        legend: { data: ["CPU", "系统内存", "JVM 堆"] },
        grid: { left: 48, right: 20, top: 38, bottom: 30 },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: points.map(point => chartTime(point.collected_at))
        },
        yAxis: { type: "value", min: 0, max: 100, name: "%" },
        series: [
            lineSeries(
                "CPU",
                points.map(point => point.cpu_usage),
                "#409eff"
            ),
            lineSeries(
                "系统内存",
                points.map(point => point.system_memory_usage),
                "#67c23a"
            ),
            lineSeries(
                "JVM 堆",
                points.map(point => point.jvm_heap_usage),
                "#e6a23c"
            )
        ]
    };
});

const requestChartOption = computed<EChartsOption>(() => {
    const points = history.value;
    return {
        tooltip: { trigger: "axis" },
        legend: { data: ["QPS", "错误率"] },
        grid: { left: 48, right: 20, top: 38, bottom: 30 },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: points.map(point => chartTime(point.collected_at))
        },
        yAxis: { type: "value", min: 0, name: "数值" },
        series: [
            lineSeries(
                "QPS",
                points.map(point => point.qps),
                "#8e44ad"
            ),
            lineSeries(
                "错误率",
                points.map(point => point.error_rate),
                "#f56c6c"
            )
        ]
    };
});

async function loadData(showLoading = false, loadHistoryData = false) {
    if (requestInFlight) return;
    requestInFlight = true;
    if (showLoading) loading.value = true;
    else refreshing.value = true;
    try {
        overview.value = await ServiceMonitorApi.getOverview({ loading: showLoading });
        if (loadHistoryData) await loadHistory();
        errorMessage.value = "";
    } catch {
        errorMessage.value = "服务监控数据加载失败，请稍后重试。";
        if (!overview.value) MessageUtils.error(errorMessage.value);
    } finally {
        loading.value = false;
        refreshing.value = false;
        requestInFlight = false;
    }
}

async function loadHistory() {
    historyLoading.value = true;
    try {
        historical.value = await ServiceMonitorApi.getHistory(historyRange.value, { loading: false });
    } catch {
        if (historical.value) {
            errorMessage.value = "历史趋势加载失败，当前保留上一次数据。";
        }
    } finally {
        historyLoading.value = false;
    }
}

function startPolling() {
    stopPolling();
    pollingTimer = globalThis.setInterval(() => void loadData(), refreshSeconds.value * 1000);
}

function stopPolling() {
    if (pollingTimer) {
        globalThis.clearInterval(pollingTimer);
        pollingTimer = undefined;
    }
}

function changeRefreshInterval() {
    startPolling();
}

function changeHistoryRange() {
    void loadHistory();
}

function lineSeries(name: string, data: number[], color: string) {
    return {
        name,
        type: "line" as const,
        smooth: true,
        showSymbol: false,
        data,
        itemStyle: { color },
        lineStyle: { color },
        areaStyle: { opacity: 0.08, color }
    };
}

function chartTime(value: string) {
    const text = formatDateTime(value);
    return text === "—" ? text : text.slice(11);
}

type NumericValue = number | string | null | undefined;

function toNumber(value: NumericValue) {
    const numberValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatPercent(value: NumericValue) {
    return `${toNumber(value).toFixed(1)}%`;
}

function formatNumber(value: NumericValue, fractionDigits = 1) {
    return toNumber(value).toFixed(fractionDigits);
}

function formatBytes(value: NumericValue) {
    const bytes = toNumber(value);
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let amount = bytes;
    let unitIndex = -1;
    while (amount >= 1024 && unitIndex < units.length - 1) {
        amount /= 1024;
        unitIndex += 1;
    }
    return `${amount.toFixed(1)} ${units[unitIndex]}`;
}

function progressColor(value: NumericValue) {
    const usage = toNumber(value);
    if (usage >= 90) return "#f56c6c";
    if (usage >= 75) return "#e6a23c";
    return "#409eff";
}

function dependencyTagType(status: ServiceMonitorDependency["status"]) {
    return status === "UP" ? "success" : "danger";
}

function dependencyStatusText(status: ServiceMonitorDependency["status"]) {
    return status === "UP" ? "正常" : "不可用";
}

function freshnessText(value: ServiceMonitorDataFreshness | undefined) {
    return {
        CURRENT: "数据正常",
        DELAYED: "数据延迟",
        STALE: "数据过期",
        UNAVAILABLE: "数据不可用"
    }[value ?? "UNAVAILABLE"];
}

function healthTagType(status: ServiceMonitorHealthComponent["status"]) {
    if (status === "UP") return "success";
    if (status === "DOWN") return "danger";
    if (status === "OUT_OF_SERVICE") return "warning";
    return "info";
}

function healthStatusText(status: ServiceMonitorHealthComponent["status"]) {
    return {
        UP: "正常",
        DOWN: "异常",
        OUT_OF_SERVICE: "不可用",
        UNKNOWN: "未知"
    }[status];
}

function formatUptime(seconds: NumericValue) {
    const value = Math.max(toNumber(seconds), 0);
    const days = Math.floor(value / 86_400);
    const hours = Math.floor((value % 86_400) / 3_600);
    const minutes = Math.floor((value % 3_600) / 60);
    return days > 0 ? `${days}天 ${hours}小时` : `${hours}小时 ${minutes}分钟`;
}

onMounted(() => {
    void loadData(true, true);
    startPolling();
});

onUnmounted(stopPolling);
</script>

<template>
    <div v-loading="loading" class="monitor-page">
        <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

        <template v-if="overview">
            <div class="status-notice">
                <div class="status-notice__summary">
                    <el-tag :type="statusTagType">{{ overview.status }}</el-tag>
                    <span class="status-notice__message">{{ overview.status_message }}</span>
                    <span class="status-notice__time">（运行 {{ formatUptime(overview.uptime_seconds) }}）</span>
                </div>
                <div class="status-notice__freshness">
                    <span class="status-notice__label">数据新鲜度</span>
                    <el-tag :type="freshnessTagType" effect="plain">
                        {{ freshnessText(overview.data_freshness) }}
                    </el-tag>
                    <span class="status-notice__freshness-age">距现在 {{ overview.data_age_seconds }} 秒</span>
                </div>
                <div class="status-notice__actions">
                    <span class="last-collected">最近采集：{{ formatDateTime(overview.collected_at) }}</span>
                    <el-select v-model="refreshSeconds" class="refresh-select" @change="changeRefreshInterval">
                        <el-option :value="5" label="5 秒刷新" />
                        <el-option :value="10" label="10 秒刷新" />
                        <el-option :value="30" label="30 秒刷新" />
                    </el-select>
                    <el-button :loading="refreshing" @click="void loadData(false, true)">
                        <el-icon><Refresh /></el-icon>
                        刷新
                    </el-button>
                </div>
            </div>

            <div class="metric-grid">
                <el-card shadow="never" class="metric-card">
                    <div class="metric-card__label">CPU 使用率</div>
                    <div class="metric-card__value">{{ formatPercent(summary?.cpu_usage) }}</div>
                    <div class="metric-card__detail">
                        折算 {{ formatNumber(cpuEquivalentCores, 1) }} /
                        {{ toNumber(summary?.cpu_logical_cores) }} 逻辑核
                    </div>
                    <el-progress
                        :percentage="summary?.cpu_usage ?? 0"
                        :show-text="false"
                        :stroke-width="7"
                        :color="progressColor(summary?.cpu_usage)" />
                </el-card>
                <el-card shadow="never" class="metric-card">
                    <div class="metric-card__label">系统内存</div>
                    <div class="metric-card__value">{{ formatPercent(summary?.system_memory_usage) }}</div>
                    <div class="metric-card__detail">
                        {{ formatBytes(summary?.system_memory_used_bytes) }} /
                        {{ formatBytes(summary?.system_memory_total_bytes) }}
                    </div>
                    <el-progress
                        :percentage="summary?.system_memory_usage ?? 0"
                        :show-text="false"
                        :stroke-width="7"
                        :color="progressColor(summary?.system_memory_usage)" />
                </el-card>
                <el-card shadow="never" class="metric-card">
                    <div class="metric-card__label">JVM 堆内存</div>
                    <div class="metric-card__value">{{ formatPercent(summary?.jvm_heap_usage) }}</div>
                    <div class="metric-card__detail">
                        {{ formatBytes(summary?.jvm_heap_used_bytes) }} /
                        {{ formatBytes(summary?.jvm_heap_max_bytes) }}
                    </div>
                    <el-progress
                        :percentage="summary?.jvm_heap_usage ?? 0"
                        :show-text="false"
                        :stroke-width="7"
                        :color="progressColor(summary?.jvm_heap_usage)" />
                </el-card>
                <el-card shadow="never" class="metric-card metric-card--plain">
                    <div class="metric-card__label">请求速率</div>
                    <div v-if="summary?.request_metrics_available" class="metric-card__value">
                        {{ formatNumber(summary.qps, 2) }}
                        <small>QPS</small>
                    </div>
                    <div v-else class="metric-card__empty">暂无请求指标</div>
                    <div class="metric-card__detail">最近采样周期</div>
                </el-card>
                <el-card shadow="never" class="metric-card metric-card--plain">
                    <div class="metric-card__label">错误率</div>
                    <div v-if="summary?.request_metrics_available" class="metric-card__value">
                        {{ formatPercent(summary.error_rate) }}
                    </div>
                    <div v-else class="metric-card__empty">暂无请求指标</div>
                    <div class="metric-card__detail">HTTP 5xx 占比</div>
                </el-card>
                <el-card shadow="never" class="metric-card metric-card--plain">
                    <div class="metric-card__label">响应时间 P95</div>
                    <div v-if="summary?.request_metrics_available" class="metric-card__value">
                        {{ formatNumber(summary.p95_response_ms, 0) }}
                        <small>ms</small>
                    </div>
                    <div v-else class="metric-card__empty">暂无请求指标</div>
                    <div class="metric-card__detail">最近采样周期</div>
                </el-card>
                <el-card shadow="never" class="metric-card metric-card--plain">
                    <div class="metric-card__label">活动线程</div>
                    <div class="metric-card__value">{{ summary?.live_thread_count ?? 0 }}</div>
                    <div class="metric-card__detail">峰值 {{ summary?.peak_thread_count ?? 0 }}</div>
                </el-card>
            </div>

            <div class="monitor-scroll">
                <div class="trend-toolbar">
                    <div>
                        <div class="trend-toolbar__title">监控趋势</div>
                        <div class="trend-toolbar__subtitle">查看资源使用和请求指标的历史变化</div>
                    </div>
                    <div class="trend-toolbar__control">
                        <span class="trend-toolbar__label">趋势时间范围</span>
                        <el-radio-group
                            v-model="historyRange"
                            class="trend-range-group"
                            size="small"
                            :disabled="historyLoading"
                            @change="changeHistoryRange">
                            <el-radio-button value="30m">30 分钟</el-radio-button>
                            <el-radio-button value="6h">6 小时</el-radio-button>
                            <el-radio-button value="24h">24 小时</el-radio-button>
                        </el-radio-group>
                    </div>
                </div>
                <el-row :gutter="16" class="chart-row">
                    <el-col :span="14">
                        <el-card shadow="never" class="chart-card">
                            <template #header>
                                <div class="card-header"><span>资源使用趋势</span></div>
                            </template>
                            <div v-loading="historyLoading">
                                <VChart :option="resourceChartOption" autoresize class="monitor-chart" />
                            </div>
                        </el-card>
                    </el-col>
                    <el-col :span="10">
                        <el-card shadow="never" class="chart-card">
                            <template #header>
                                <div class="card-header">
                                    <span>请求趋势</span>
                                    <span class="card-header__hint">QPS / 错误率</span>
                                </div>
                            </template>
                            <VChart
                                v-if="summary?.request_metrics_available"
                                :option="requestChartOption"
                                autoresize
                                class="monitor-chart" />
                            <el-empty v-else description="当前未采集到 HTTP 请求指标" :image-size="80" />
                        </el-card>
                    </el-col>
                </el-row>

                <el-row :gutter="16" class="detail-row">
                    <el-col :span="14">
                        <el-card shadow="never" class="dependency-card">
                            <template #header>
                                <div class="card-header">
                                    <span>关键依赖</span>
                                    <span class="card-header__hint">仅展示连通性与耗时</span>
                                </div>
                            </template>
                            <el-table :data="overview.dependencies" stripe>
                                <el-table-column prop="name" label="依赖" min-width="160" />
                                <el-table-column label="状态" width="120">
                                    <template #default="scope">
                                        <el-tag :type="dependencyTagType(scope.row.status)">
                                            {{ dependencyStatusText(scope.row.status) }}
                                        </el-tag>
                                    </template>
                                </el-table-column>
                                <el-table-column label="耗时" width="120">
                                    <template #default="scope">{{ scope.row.latency_ms }} ms</template>
                                </el-table-column>
                                <el-table-column prop="message" label="说明" />
                            </el-table>
                        </el-card>
                    </el-col>
                    <el-col :span="10">
                        <el-card shadow="never" class="runtime-card">
                            <template #header>
                                <div class="card-header">
                                    <span>运行时信息</span>
                                    <span class="card-header__hint">只读概览</span>
                                </div>
                            </template>
                            <div class="health-section">
                                <div class="health-section__header">
                                    <span>应用健康组件</span>
                                    <span class="card-header__hint">
                                        检查耗时 {{ overview.health_check_latency_ms }} ms
                                    </span>
                                </div>
                                <div v-if="overview.health_components.length" class="health-list">
                                    <div
                                        v-for="component in overview.health_components"
                                        :key="component.name"
                                        class="health-item">
                                        <span class="health-item__name">{{ component.name }}</span>
                                        <el-tag :type="healthTagType(component.status)" size="small">
                                            {{ healthStatusText(component.status) }}
                                        </el-tag>
                                        <span class="health-item__message">
                                            {{ component.message }} · 最近检查
                                            {{ formatDateTime(component.checked_at) }}
                                        </span>
                                    </div>
                                </div>
                                <el-empty v-else description="暂无健康组件数据" :image-size="48" />
                            </div>
                            <el-divider />
                            <div class="runtime-grid">
                                <span>服务名称</span>
                                <strong>{{ overview.service_name }}</strong>
                                <span>主机</span>
                                <strong>{{ overview.host_name }}</strong>
                                <span>操作系统</span>
                                <strong>{{ overview.os_name }}</strong>
                                <span>JVM 非堆内存</span>
                                <strong>{{ formatBytes(summary?.jvm_non_heap_used_bytes) }}</strong>
                                <span>GC 次数</span>
                                <strong>{{ summary?.gc_count ?? 0 }}</strong>
                                <span>最后采集</span>
                                <strong>{{ formatDateTime(overview.collected_at) }}</strong>
                            </div>
                        </el-card>
                    </el-col>
                </el-row>
            </div>
        </template>
    </div>
</template>

<style scoped lang="scss">
.monitor-page {
    box-sizing: border-box;
    display: flex;
    height: 100%;
    flex-direction: column;
    overflow: hidden;
    min-height: 100%;
    padding: 16px;
    background: var(--el-bg-color-page);
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.last-collected,
.card-header__hint,
.metric-card__detail,
.status-notice__time {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.status-notice__summary,
.status-notice__freshness,
.status-notice__actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.refresh-select {
    width: 120px;
}

.status-notice {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 16px;
    margin-top: 16px;
    padding: 12px 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    background: var(--el-fill-color-blank);
}

.status-notice__summary {
    min-width: 0;
    flex-wrap: wrap;
}

.status-notice__message {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.status-notice__freshness {
    flex-shrink: 0;
    padding: 6px 10px;
    border-radius: 4px;
    background: var(--el-fill-color-light);
    white-space: nowrap;
}

.status-notice__label,
.status-notice__freshness-age {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.status-notice__time {
    white-space: nowrap;
}

.status-notice__actions {
    flex-shrink: 0;
}

.metric-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 12px;
    margin-top: 16px;
}

.metric-card {
    min-height: 126px;
}

.metric-card :deep(.el-card__body) {
    padding: 16px;
}

.metric-card__label {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.metric-card__value {
    margin: 8px 0 10px;
    color: var(--el-text-color-primary);
    font-size: 25px;
    font-weight: 600;
}

.metric-card__value small {
    font-size: 13px;
    font-weight: 400;
}

.metric-card__detail {
    min-height: 18px;
    line-height: 18px;
    white-space: nowrap;
}

.metric-card__empty {
    margin: 15px 0 13px;
    color: var(--el-text-color-placeholder);
    font-size: 15px;
}

.monitor-scroll {
    min-height: 0;
    flex: 1;
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-gutter: stable;
    padding-right: 4px;
}

.trend-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 16px;
    padding: 12px 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    background: var(--el-fill-color-blank);
}

.trend-toolbar__title {
    color: var(--el-text-color-primary);
    font-size: 14px;
    font-weight: 500;
}

.trend-toolbar__subtitle {
    margin-top: 4px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.trend-toolbar__control {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 8px;
}

.trend-range-group {
    display: flex;
    flex-wrap: wrap;
}

.trend-toolbar__label {
    color: var(--el-text-color-secondary);
    font-size: 13px;
    white-space: nowrap;
}

.chart-row,
.detail-row {
    margin-top: 12px;
}

.chart-card,
.dependency-card,
.runtime-card {
    height: 100%;
}

.monitor-chart {
    width: 100%;
    height: 280px;
}

.runtime-grid {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    gap: 16px 12px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.runtime-grid strong {
    overflow: hidden;
    color: var(--el-text-color-primary);
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.health-section__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-weight: 500;
}

.health-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.health-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
}

.health-item__name {
    overflow: hidden;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.health-item__message {
    grid-column: 1 / -1;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

@media (max-width: 1400px) {
    .metric-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media (max-width: 900px) {
    .status-notice {
        display: flex;
        align-items: flex-start;
        flex-direction: column;
        gap: 12px;
    }

    .status-notice__summary,
    .status-notice__freshness,
    .status-notice__actions {
        width: 100%;
        flex-wrap: wrap;
    }

    .status-notice__freshness {
        white-space: normal;
    }

    .trend-toolbar {
        align-items: flex-start;
        flex-direction: column;
    }

    .trend-toolbar__control {
        width: 100%;
    }

    .metric-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 1200px) and (min-width: 901px) {
    .status-notice {
        grid-template-columns: minmax(0, 1fr) auto;
    }

    .status-notice__freshness {
        grid-column: 1 / -1;
        grid-row: 2;
        justify-self: start;
    }
}
</style>
