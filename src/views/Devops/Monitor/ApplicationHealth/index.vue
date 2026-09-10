<script setup lang="ts">
import { Refresh } from "@element-plus/icons-vue";
import { computed, onMounted, onUnmounted, ref } from "vue";

import { ServiceMonitorApi } from "@/api/system/service-monitor-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const overview = ref<ServiceMonitorOverview>();
const loading = ref(true);
const refreshing = ref(false);
const errorMessage = ref("");
const refreshSeconds = ref(10);
let pollingTimer: ReturnType<typeof setInterval> | undefined;
let requestInFlight = false;

const healthComponents = computed(() => overview.value?.health_components ?? []);
const dependencies = computed(() => overview.value?.dependencies ?? []);
const healthyComponentCount = computed(
    () => healthComponents.value.filter(component => component.status === "UP").length
);
const healthyDependencyCount = computed(
    () => dependencies.value.filter(dependency => dependency.status === "UP").length
);
const overallStatusText = computed(() => statusText(overview.value?.status));
const statusTagType = computed(() => overallStatusTagType(overview.value?.status));
const freshnessTagType = computed(() => freshnessType(overview.value?.data_freshness));

async function loadData(showLoading = false): Promise<void> {
    if (requestInFlight) return;
    requestInFlight = true;
    if (showLoading) loading.value = true;
    else refreshing.value = true;
    try {
        overview.value = await ServiceMonitorApi.getOverview({ loading: showLoading });
        errorMessage.value = "";
    } catch {
        errorMessage.value = "应用健康检查加载失败，当前保留上一次成功数据。";
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

function changeRefreshInterval(): void {
    startPolling();
}

function statusText(status: ServiceMonitorStatus | undefined): string {
    return (
        {
            HEALTHY: "正常",
            WARNING: "警告",
            DEGRADED: "降级",
            DOWN: "不可用"
        }[status ?? "DOWN"] ?? "未知"
    );
}

function overallStatusTagType(status: ServiceMonitorStatus | undefined): "success" | "warning" | "danger" | "info" {
    if (status === "HEALTHY") return "success";
    if (status === "WARNING") return "warning";
    if (status === "DEGRADED" || status === "DOWN") return "danger";
    return "info";
}

function freshnessText(value: ServiceMonitorDataFreshness | undefined): string {
    return (
        {
            CURRENT: "数据正常",
            DELAYED: "数据延迟",
            STALE: "数据过期",
            UNAVAILABLE: "数据不可用"
        }[value ?? "UNAVAILABLE"] ?? "数据不可用"
    );
}

function freshnessType(value: ServiceMonitorDataFreshness | undefined): "success" | "warning" | "danger" | "info" {
    if (value === "CURRENT") return "success";
    if (value === "DELAYED") return "warning";
    if (value === "STALE") return "danger";
    return "info";
}

function healthTagType(status: ServiceMonitorHealthComponent["status"] | ServiceMonitorDependency["status"]) {
    if (status === "UP") return "success";
    if (status === "DEGRADED" || status === "OUT_OF_SERVICE") return "warning";
    if (status === "DOWN") return "danger";
    return "info";
}

function healthStatusText(
    status: ServiceMonitorHealthComponent["status"] | ServiceMonitorDependency["status"]
): string {
    return (
        {
            UP: "正常",
            DEGRADED: "降级",
            DOWN: "不可用",
            OUT_OF_SERVICE: "已下线",
            UNKNOWN: "未知"
        }[status] ?? "未知"
    );
}

function formatUptime(seconds: number | undefined): string {
    const value = Math.max(Number(seconds ?? 0), 0);
    const days = Math.floor(value / 86_400);
    const hours = Math.floor((value % 86_400) / 3_600);
    const minutes = Math.floor((value % 3_600) / 60);
    if (days > 0) return `${days} 天 ${hours} 小时`;
    return `${hours} 小时 ${minutes} 分钟`;
}

function formatLatency(value: number | undefined): string {
    return value === undefined || value === null ? "—" : `${value} ms`;
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
    <div v-loading="loading" class="health-page">
        <div class="health-toolbar">
            <div class="page-actions">
                <span class="last-checked">最近检查：{{ overview ? formatDateTime(overview.collected_at) : "—" }}</span>
                <el-select v-model="refreshSeconds" class="refresh-select" @change="changeRefreshInterval">
                    <el-option :value="5" label="5 秒刷新" />
                    <el-option :value="10" label="10 秒刷新" />
                    <el-option :value="30" label="30 秒刷新" />
                </el-select>
                <el-button :loading="refreshing" @click="void loadData(false)">
                    <el-icon><Refresh /></el-icon>
                    刷新
                </el-button>
            </div>
        </div>

        <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

        <template v-if="overview">
            <div class="health-body">
                <div class="status-banner">
                    <div class="status-banner__main">
                        <el-tag :type="statusTagType" size="large">{{ overallStatusText }}</el-tag>
                        <div>
                            <strong>应用当前{{ overallStatusText }}</strong>
                            <p>{{ overview.status_message || "暂无状态说明" }}</p>
                        </div>
                    </div>
                    <div class="status-banner__freshness">
                        <span>监控数据</span>
                        <el-tag :type="freshnessTagType" effect="plain">
                            {{ freshnessText(overview.data_freshness) }}
                        </el-tag>
                        <small>距现在 {{ overview.data_age_seconds }} 秒</small>
                    </div>
                </div>

                <div class="summary-grid">
                    <div class="summary-item">
                        <span>应用健康组件</span>
                        <strong>{{ healthyComponentCount }} / {{ healthComponents.length }}</strong>
                        <small>存活状态</small>
                    </div>
                    <div class="summary-item">
                        <span>关键依赖</span>
                        <strong>{{ healthyDependencyCount }} / {{ dependencies.length }}</strong>
                        <small>就绪状态</small>
                    </div>
                    <div class="summary-item">
                        <span>健康检查耗时</span>
                        <strong>{{ formatLatency(overview.health_check_latency_ms) }}</strong>
                        <small>最近一次聚合检查</small>
                    </div>
                    <div class="summary-item">
                        <span>应用运行时长</span>
                        <strong>{{ formatUptime(overview.uptime_seconds) }}</strong>
                        <small>当前实例</small>
                    </div>
                </div>

                <div class="health-content">
                    <section class="health-section">
                        <div class="section-heading">
                            <div>
                                <h3>应用存活状态</h3>
                                <p>用于判断当前应用实例是否仍在正常运行。</p>
                            </div>
                            <el-tag type="success" effect="plain">{{ healthComponents.length }} 项检查</el-tag>
                        </div>
                        <div class="health-table-wrapper">
                            <el-table :data="healthComponents" stripe>
                                <el-table-column prop="name" label="检查项" min-width="180" />
                                <el-table-column label="状态" width="120">
                                    <template #default="scope">
                                        <el-tag :type="healthTagType(scope.row.status)" size="small">
                                            {{ healthStatusText(scope.row.status) }}
                                        </el-tag>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="message" label="说明" min-width="260" show-overflow-tooltip />
                                <el-table-column label="最近检查" width="180">
                                    <template #default="scope">{{ formatDateTime(scope.row.checked_at) }}</template>
                                </el-table-column>
                            </el-table>
                            <el-empty
                                v-if="!healthComponents.length"
                                description="暂无应用健康组件数据"
                                :image-size="72" />
                        </div>
                    </section>

                    <section class="health-section">
                        <div class="section-heading">
                            <div>
                                <h3>依赖就绪状态</h3>
                                <p>用于判断业务请求依赖的基础设施是否可用。</p>
                            </div>
                            <el-tag type="success" effect="plain">{{ dependencies.length }} 项检查</el-tag>
                        </div>
                        <div class="health-table-wrapper">
                            <el-table :data="dependencies" stripe>
                                <el-table-column prop="name" label="依赖组件" min-width="180" />
                                <el-table-column label="状态" width="120">
                                    <template #default="scope">
                                        <el-tag :type="healthTagType(scope.row.status)" size="small">
                                            {{ healthStatusText(scope.row.status) }}
                                        </el-tag>
                                    </template>
                                </el-table-column>
                                <el-table-column label="检查耗时" width="120">
                                    <template #default="scope">{{ formatLatency(scope.row.latency_ms) }}</template>
                                </el-table-column>
                                <el-table-column prop="message" label="说明" min-width="260" show-overflow-tooltip />
                            </el-table>
                            <el-empty v-if="!dependencies.length" description="暂无依赖健康数据" :image-size="72" />
                        </div>
                    </section>
                </div>

                <section class="health-section runtime-section">
                    <div class="section-heading">
                        <div>
                            <h3>应用运行信息</h3>
                            <p>只读展示当前实例信息，不展示连接串、凭据或安全数据原文。</p>
                        </div>
                    </div>
                    <div class="runtime-grid">
                        <span>服务名称</span>
                        <strong>{{ overview.service_name || "—" }}</strong>
                        <span>主机名称</span>
                        <strong>{{ overview.host_name || "—" }}</strong>
                        <span>操作系统</span>
                        <strong>{{ overview.os_name || "—" }}</strong>
                        <span>最近采集</span>
                        <strong>{{ formatDateTime(overview.collected_at) }}</strong>
                        <span>监控数据年龄</span>
                        <strong>{{ overview.data_age_seconds }} 秒</strong>
                        <span>健康检查耗时</span>
                        <strong>{{ formatLatency(overview.health_check_latency_ms) }}</strong>
                    </div>
                </section>

                <el-alert
                    title="本页面只展示健康状态、检查耗时和脱敏说明；Session、Token、验证码、防重放随机数等安全数据请在缓存清理的安全运行态中处理。"
                    type="info"
                    show-icon
                    :closable="false" />
            </div>
        </template>
    </div>
</template>

<style scoped lang="scss">
.health-page {
    box-sizing: border-box;
    display: flex;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    gap: 8px;
    overflow-x: hidden;
    overflow-y: hidden;
    padding: 12px;
    background: var(--el-bg-color-page);
}

.health-toolbar,
.status-banner,
.section-heading,
.page-actions,
.status-banner__main,
.status-banner__freshness {
    display: flex;
    align-items: center;
}

.health-toolbar,
.status-banner,
.section-heading {
    justify-content: space-between;
    gap: 16px;
}

.section-heading h3 {
    margin: 0;
    color: var(--el-text-color-primary);
}

.health-toolbar {
    min-height: 32px;
    justify-content: flex-end;
    flex-shrink: 0;
}

.section-heading h3 {
    font-size: 15px;
    font-weight: 600;
}

.section-heading p {
    margin: 6px 0 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.page-actions,
.status-banner__main,
.status-banner__freshness {
    flex-shrink: 0;
    gap: 12px;
}

.last-checked,
.status-banner__freshness,
.status-banner__freshness small {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.refresh-select {
    width: 120px;
}

.status-banner,
.health-section,
.summary-item {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    background: var(--el-fill-color-blank);
}

.status-banner {
    padding: 12px 14px;
}

.status-banner__main strong {
    color: var(--el-text-color-primary);
    font-size: 16px;
}

.status-banner__main p {
    margin: 5px 0 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
}

.summary-item {
    display: flex;
    min-height: 78px;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    padding: 10px 14px;
}

.summary-item span,
.summary-item small {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.summary-item strong {
    color: var(--el-text-color-primary);
    font-size: 21px;
}

.health-body {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
}

.health-content {
    display: grid;
    min-height: 0;
    flex: 1;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    overflow: hidden;
}

.health-section {
    display: flex;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
    overflow: hidden;
    padding: 12px;
}

.health-section :deep(.el-table) {
    margin-top: 10px;
}

.health-table-wrapper {
    min-height: 0;
    flex: 1;
    overflow: auto;
}

.runtime-section {
    flex-shrink: 0;
}

.runtime-grid {
    display: grid;
    grid-template-columns: 100px minmax(0, 1fr) 100px minmax(0, 1fr);
    gap: 10px 12px;
    margin-top: 10px;
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

.health-page > :deep(.el-alert),
.health-body > :deep(.el-alert) {
    flex-shrink: 0;
}

@media (max-width: 1100px) {
    .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .health-content {
        grid-template-columns: minmax(0, 1fr);
    }
}

@media (max-width: 760px) {
    .health-toolbar,
    .status-banner,
    .section-heading {
        align-items: flex-start;
        flex-direction: column;
    }

    .page-actions {
        width: 100%;
        flex-wrap: wrap;
    }

    .status-banner__freshness {
        flex-wrap: wrap;
    }

    .summary-grid {
        grid-template-columns: minmax(0, 1fr);
    }

    .runtime-grid {
        grid-template-columns: 90px minmax(0, 1fr);
    }

    .health-page,
    .health-body {
        overflow-y: auto;
    }
}
</style>
