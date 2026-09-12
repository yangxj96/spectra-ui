<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AuditLogApi } from "@/api/system/audit-log-api.ts";
import JsonEditor from "@/components/JsonEditor/index.vue";
import { formatDateTime } from "@/utils/date-utils.ts";

const route = useRoute();
const router = useRouter();
const detail = ref<AuditLogVO>();
const loading = ref(false);
const loadError = ref("");
let requestSequence = 0;
const beforeSnapshot = computed<JsonValue>(() => (detail.value?.before ?? {}) as JsonValue);
const afterSnapshot = computed<JsonValue>(() => (detail.value?.after ?? {}) as JsonValue);

const categoryLabels: Record<AuditLogVO["category"], string> = {
    OPERATION: "普通操作",
    SECURITY: "安全操作"
};
const resultLabels: Record<AuditLogVO["result"], string> = {
    STARTED: "开始",
    SUCCEEDED: "成功",
    FAILED: "失败",
    DENIED: "拒绝"
};
const resultTagTypes: Record<AuditLogVO["result"], "success" | "danger" | "warning" | "info"> = {
    STARTED: "info",
    SUCCEEDED: "success",
    FAILED: "danger",
    DENIED: "warning"
};

const formatCategory = (category: AuditLogVO["category"]) => categoryLabels[category];
const formatResult = (result: AuditLogVO["result"]) => resultLabels[result];
const resultTagType = (result: AuditLogVO["result"]) => resultTagTypes[result];
const formatEventType = (row: AuditLogVO) => {
    const description = row.reason?.trim();
    if (!description) return row.event_type;
    const unquotedDescription =
        description.startsWith("'") && description.endsWith("'") ? description.slice(1, -1).trim() : description;
    return unquotedDescription || row.event_type;
};

function backToList(): void {
    void router.push({ name: "DevopsAuditLog" });
}

watch(
    () => [route.query.event_id, route.query.occurred_at] as const,
    async ([eventId, occurredAt]) => {
        const currentSequence = ++requestSequence;
        if (typeof eventId !== "string" || typeof occurredAt !== "string") {
            detail.value = undefined;
            loading.value = false;
            loadError.value = "审计日志定位参数不完整";
            return;
        }

        detail.value = undefined;
        loadError.value = "";
        loading.value = true;
        try {
            const result = await AuditLogApi.detail(eventId, occurredAt);
            if (currentSequence === requestSequence) detail.value = result;
        } catch (error) {
            if (currentSequence === requestSequence) {
                loadError.value = error instanceof Error ? error.message : "审计日志详情加载失败";
            }
        } finally {
            if (currentSequence === requestSequence) loading.value = false;
        }
    },
    { immediate: true }
);
</script>

<template>
    <div class="audit-log-detail-page audit-log-detail-page--scrollable" v-loading="loading">
        <div class="audit-log-detail-page__actions">
            <el-button link type="primary" @click="backToList">返回审计日志</el-button>
        </div>
        <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon />
        <template v-else-if="detail">
            <el-divider content-position="left">操作信息</el-divider>
            <el-descriptions :column="3" label-width="110px" border>
                <el-descriptions-item label="事件 ID">{{ detail.event_id }}</el-descriptions-item>
                <el-descriptions-item label="发生时间">
                    {{ formatDateTime(detail.occurred_at) }}
                </el-descriptions-item>
                <el-descriptions-item label="分类">{{ formatCategory(detail.category) }}</el-descriptions-item>
                <el-descriptions-item label="操作结果">
                    <el-tag :type="resultTagType(detail.result)" size="small">
                        {{ formatResult(detail.result) }}
                    </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="操作人">{{ detail.operator_id || "-" }}</el-descriptions-item>
                <el-descriptions-item label="姓名">{{ detail.operator_name || "-" }}</el-descriptions-item>
                <el-descriptions-item label="目标">{{ detail.target_id || "-" }}</el-descriptions-item>
                <el-descriptions-item label="客户端">{{ detail.client || "-" }}</el-descriptions-item>
                <el-descriptions-item label="IP 地址">{{ detail.ip || "-" }}</el-descriptions-item>
                <el-descriptions-item label="请求方法">{{ detail.http_method || "-" }}</el-descriptions-item>
                <el-descriptions-item label="请求地址" :span="2">
                    <div class="audit-log-detail-page__long-value">{{ detail.request_url || "-" }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="HTTP 状态码">{{ detail.http_status ?? "-" }}</el-descriptions-item>
                <el-descriptions-item label="耗时（毫秒）">{{ detail.duration_ms ?? "-" }}</el-descriptions-item>
                <el-descriptions-item label="失败码">{{ detail.failure_code || "-" }}</el-descriptions-item>
                <el-descriptions-item label="异常类型">{{ detail.failure_type || "-" }}</el-descriptions-item>
                <el-descriptions-item label="关联 ID">{{ detail.correlation_id || "-" }}</el-descriptions-item>
                <el-descriptions-item label="事件类型" :span="3">
                    <div class="audit-log-detail-page__long-value">{{ formatEventType(detail) }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="事件类型代码" :span="3">
                    <div class="audit-log-detail-page__long-value">{{ detail.event_type }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="用户代理" :span="3">
                    <div class="audit-log-detail-page__long-value">{{ detail.user_agent || "-" }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="原因" :span="3">
                    <div class="audit-log-detail-page__long-value">{{ detail.reason || "-" }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="失败原因" :span="3">
                    <div class="audit-log-detail-page__long-value">{{ detail.failure_reason || "-" }}</div>
                </el-descriptions-item>
            </el-descriptions>

            <el-divider content-position="left">变更前后快照对比</el-divider>
            <el-row :gutter="16" class="audit-log-detail-page__snapshot-editors">
                <el-col :xs="24" :md="12">
                    <div class="audit-log-detail-page__snapshot-label">变更前</div>
                    <JsonEditor
                        class="audit-log-detail-page__json-editor"
                        :model-value="beforeSnapshot"
                        :expand-all="true"
                        :read-only="true" />
                </el-col>
                <el-col :xs="24" :md="12">
                    <div class="audit-log-detail-page__snapshot-label">变更后</div>
                    <JsonEditor
                        class="audit-log-detail-page__json-editor"
                        :model-value="afterSnapshot"
                        :expand-all="true"
                        :read-only="true" />
                </el-col>
            </el-row>
        </template>
        <el-empty v-else-if="!loading" description="暂无审计日志详情" />
    </div>
</template>

<style scoped lang="scss">
.audit-log-detail-page {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.audit-log-detail-page--scrollable {
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
}

.audit-log-detail-page__actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
}

.audit-log-detail-page > :deep(.el-divider) {
    margin: 16px 0;
}

.audit-log-detail-page__snapshot-editors {
    row-gap: 16px;
}

.audit-log-detail-page__snapshot-label {
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 500;
}

.audit-log-detail-page__json-editor {
    box-sizing: border-box;
    height: 420px;
    min-width: 0;
    border: 1px solid var(--el-border-color);
    border-radius: var(--el-border-radius-base);
}

:deep(.audit-log-detail-page__json-editor .jsoneditor) {
    height: 100%;
}
</style>
