<script setup lang="ts">
import { Refresh } from "@element-plus/icons-vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";

import { CacheManagementApi } from "@/api/system/cache-management-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const router = useRouter();
const overview = ref<CacheMonitorOverview>();
const regions = ref<CacheRegion[]>([]);
const security = ref<SecurityRuntime>();
const loading = ref(true);
const refreshing = ref(false);
const errorMessage = ref("");
let pollingTimer: ReturnType<typeof setInterval> | undefined;
let requestInFlight = false;

const statusLabels: Record<string, string> = {
    AVAILABLE: "正常",
    PARTIAL: "部分可用",
    UNAVAILABLE: "不可用",
    UNKNOWN: "未知",
    UNSUPPORTED: "暂不支持"
};

const modeLabels: Record<string, string> = {
    LOCAL: "本地缓存",
    REMOTE: "远程缓存"
};

const providerLabels: Record<string, string> = {
    RedisCacheManager: "Redis 缓存管理器"
};

const statusType = computed<"success" | "warning" | "danger" | "info">(() => {
    switch (overview.value?.status ?? security.value?.status) {
        case "AVAILABLE":
            return "success";
        case "PARTIAL":
            return "warning";
        case "UNAVAILABLE":
            return "danger";
        default:
            return "info";
    }
});

function statusTagType(status: string | undefined): "success" | "warning" | "danger" | "info" {
    switch (status) {
        case "AVAILABLE":
            return "success";
        case "PARTIAL":
            return "warning";
        case "UNAVAILABLE":
            return "danger";
        default:
            return "info";
    }
}

function statusLabel(status: string | undefined): string {
    return statusLabels[status ?? "UNKNOWN"] ?? "未知";
}

function modeLabel(mode: string | undefined): string {
    return modeLabels[mode ?? ""] ?? "未知模式";
}

function providerLabel(provider: string | undefined): string {
    return providerLabels[provider ?? ""] ?? "未知提供方";
}

function metric(value: number | null | undefined): string {
    return value === null || value === undefined ? "暂不支持" : String(value);
}

async function loadData(showLoading = false): Promise<void> {
    if (requestInFlight) return;
    requestInFlight = true;
    if (showLoading) loading.value = true;
    else refreshing.value = true;
    try {
        const [nextOverview, nextRegions, nextSecurity] = await Promise.all([
            CacheManagementApi.getOverview({ loading: showLoading }),
            CacheManagementApi.getRegions({ loading: false }),
            CacheManagementApi.getSecurity({ loading: false })
        ]);
        overview.value = nextOverview;
        regions.value = nextRegions;
        security.value = nextSecurity;
        errorMessage.value = "";
    } catch {
        errorMessage.value = "缓存监控数据加载失败，当前保留上一次成功数据。";
        if (!overview.value) MessageUtils.error(errorMessage.value);
    } finally {
        loading.value = false;
        refreshing.value = false;
        requestInFlight = false;
    }
}

function startPolling(): void {
    stopPolling();
    pollingTimer = globalThis.setInterval(() => void loadData(), 15_000);
}

function stopPolling(): void {
    if (pollingTimer) {
        globalThis.clearInterval(pollingTimer);
        pollingTimer = undefined;
    }
}

function goToClear(regionCode?: string): void {
    if (regionCode && !regions.value.some(region => region.code === regionCode)) return;
    void router.push({
        name: "DevopsCacheClear",
        query: regionCode ? { region_code: regionCode } : undefined
    });
}

onMounted(() => {
    void loadData(true);
    startPolling();
});

onUnmounted(stopPolling);
</script>

<template>
    <div class="cache-monitor page-container">
        <div class="page-header">
            <div>
                <h2>缓存监控</h2>
                <p>普通业务缓存与安全运行态只读总览；不展示安全键或敏感值。</p>
            </div>
            <el-button :loading="refreshing" :icon="Refresh" @click="loadData()">刷新</el-button>
        </div>

        <el-alert v-if="errorMessage" :title="errorMessage" type="warning" show-icon :closable="false" />

        <el-skeleton v-if="loading" :rows="6" animated />
        <template v-else>
            <div class="summary-grid">
                <el-card shadow="never">
                    <span class="summary-label">普通缓存状态</span>
                    <el-tag :type="statusType">{{ statusLabel(overview?.status) }}</el-tag>
                </el-card>
                <el-card shadow="never">
                    <span class="summary-label">安全 Redis</span>
                    <el-tag :type="statusTagType(overview?.security_redis_status)">
                        {{ statusLabel(overview?.security_redis_status) }}
                    </el-tag>
                </el-card>
                <el-card shadow="never">
                    <span class="summary-label">已登记区域</span>
                    <strong>{{ overview?.region_count ?? 0 }}</strong>
                </el-card>
                <el-card shadow="never">
                    <span class="summary-label">在线会话</span>
                    <strong>{{ metric(overview?.online_session_count) }}</strong>
                </el-card>
            </div>

            <el-card shadow="never" class="section-card">
                <template #header>
                    <div class="section-header">
                        <span>普通业务缓存区域</span>
                        <el-button link type="primary" @click="goToClear()">前往缓存清理</el-button>
                    </div>
                </template>
                <el-table :data="regions" stripe>
                    <el-table-column prop="display_name" label="区域" min-width="180">
                        <template #default="scope">
                            <div>{{ scope.row.display_name }}</div>
                            <small>{{ scope.row.code }}</small>
                        </template>
                    </el-table-column>
                    <el-table-column prop="provider" label="提供方" min-width="150">
                        <template #default="scope">{{ providerLabel(scope.row.provider) }}</template>
                    </el-table-column>
                    <el-table-column prop="mode" label="模式" width="100">
                        <template #default="scope">{{ modeLabel(scope.row.mode) }}</template>
                    </el-table-column>
                    <el-table-column label="键数量" width="110">
                        <template #default="scope">{{ metric(scope.row.statistics?.key_count) }}</template>
                    </el-table-column>
                    <el-table-column label="命中率" width="110">
                        <template #default="scope">
                            {{
                                scope.row.statistics?.hit_rate == null
                                    ? "暂不支持"
                                    : `${scope.row.statistics.hit_rate}%`
                            }}
                        </template>
                    </el-table-column>
                    <el-table-column label="状态" width="120">
                        <template #default="scope">
                            <el-tag :type="statusTagType(scope.row.statistics?.status)">
                                {{ statusLabel(scope.row.statistics?.status) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="130" fixed="right">
                        <template #default="scope">
                            <el-button link type="primary" @click="goToClear(scope.row.code)">去清理</el-button>
                        </template>
                    </el-table-column>
                </el-table>
                <el-empty v-if="regions.length === 0" description="暂无已登记普通缓存区域" />
            </el-card>

            <el-card shadow="never" class="section-card">
                <template #header>安全运行态</template>
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="会话 / 令牌">
                        <el-tag :type="statusTagType(security?.session_status)">
                            {{ statusLabel(security?.session_status) }}
                        </el-tag>
                        <span class="inline-metric">在线 {{ metric(security?.online_session_count) }}</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="验证码">
                        <el-tag :type="statusTagType(security?.verification_status)">
                            {{ statusLabel(security?.verification_status) }}
                        </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="登录失败锁定">
                        <el-tag :type="statusTagType(security?.login_failure_status)">
                            {{ statusLabel(security?.login_failure_status) }}
                        </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="网页端防重放随机数">
                        <el-tag :type="statusTagType(security?.nonce_status)">
                            {{ statusLabel(security?.nonce_status) }}
                        </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="刷新令牌防重放">
                        <el-tag :type="statusTagType(security?.refresh_replay_status)">
                            {{ statusLabel(security?.refresh_replay_status) }}
                        </el-tag>
                    </el-descriptions-item>
                </el-descriptions>
                <p class="security-note">安全数据只能在缓存清理页通过对应安全用例处理，不能按 Redis 键通用删除。</p>
            </el-card>
        </template>
    </div>
</template>

<style scoped lang="scss">
.cache-monitor {
    padding: 20px;
}

.page-header,
.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.page-header h2 {
    margin: 0 0 8px;
}

.page-header p,
.security-note {
    margin: 0;
    color: var(--el-text-color-secondary);
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin: 16px 0;
}

.summary-grid .el-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.summary-label {
    color: var(--el-text-color-secondary);
}

.section-card {
    margin-top: 16px;
}

small {
    color: var(--el-text-color-secondary);
}

.inline-metric {
    margin-left: 8px;
    color: var(--el-text-color-secondary);
}

.security-note {
    margin-top: 16px;
    font-size: 13px;
}

@media (max-width: 1100px) {
    .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
</style>
