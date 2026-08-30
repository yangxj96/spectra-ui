<script setup lang="ts">
import { onMounted, ref } from "vue";

import { FileApi } from "@/api/system/file-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const loading = ref(false);
const detailLoading = ref(false);
const tableData = ref<FileUploadAdminTask[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(15);
const query = ref<FileUploadAdminPageParams>({
    page_num: 1,
    page_size: 15,
    original_name: "",
    status: undefined
});
const detailVisible = ref(false);
const detail = ref<FileUploadAdminDetail>();

const statusLabels: Record<string, string> = {
    UPLOADING: "上传中",
    VERIFYING: "校验中",
    READY: "已完成",
    FAILED: "失败",
    CANCELED: "已取消",
    EXPIRED: "已过期",
    CLEANED: "已清理"
};

function statusLabel(status: string): string {
    return statusLabels[status] ?? status;
}

function statusType(status: string): "success" | "warning" | "danger" | "info" {
    if (status === "READY") return "success";
    if (["UPLOADING", "VERIFYING"].includes(status)) return "warning";
    if (["FAILED", "EXPIRED"].includes(status)) return "danger";
    return "info";
}

function formatSize(bytes?: number): string {
    if (!bytes || bytes < 0) return "0 B";
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(2)} ${units[index]}`;
}

function formatOptional(value?: string): string {
    return value ? formatDateTime(value) : "—";
}

function operationKey(prefix: string): string {
    return `${prefix}:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

async function loadData(): Promise<void> {
    loading.value = true;
    try {
        const result = await FileApi.uploadTasksPage({
            ...query.value,
            page_num: page.value,
            page_size: pageSize.value,
            original_name: query.value.original_name || undefined
        });
        tableData.value = result.records ?? [];
        total.value = result.total ?? 0;
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "上传任务加载失败");
    } finally {
        loading.value = false;
    }
}

function search(): void {
    page.value = 1;
    void loadData();
}

function reset(): void {
    query.value = { page_num: 1, page_size: 15, original_name: "", status: undefined };
    search();
}

async function openDetail(row: FileUploadAdminTask): Promise<void> {
    detailLoading.value = true;
    detailVisible.value = true;
    try {
        detail.value = await FileApi.uploadTaskDetail(row.upload_id);
    } catch (error) {
        detailVisible.value = false;
        MessageUtils.error(error instanceof Error ? error.message : "上传任务详情加载失败");
    } finally {
        detailLoading.value = false;
    }
}

async function cancelTask(row: FileUploadAdminTask): Promise<void> {
    try {
        const result = await MessageUtils.box.prompt("请输入取消原因。", "取消上传任务", {
            inputPlaceholder: "例如：任务长时间无进展",
            inputValidator: value => (value?.trim() ? true : "取消原因不能为空")
        });
        await FileApi.adminCancelUpload(row.upload_id, {
            idempotency_key: operationKey("file-upload-cancel"),
            reason: result.value.trim()
        });
        MessageUtils.success("上传任务已进入清理流程");
        await loadData();
    } catch (error) {
        if (error instanceof Error && error.message) MessageUtils.error(error.message);
    }
}

function canCancel(status: string): boolean {
    return status === "UPLOADING";
}

onMounted(() => {
    void loadData();
});
</script>

<template>
    <div v-loading="loading" class="file-upload-task-page">
        <el-row class="box__search">
            <el-form :inline="true">
                <el-form-item label="文件名">
                    <el-input
                        v-model="query.original_name"
                        clearable
                        placeholder="按文件名搜索"
                        @keyup.enter="search" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 150px">
                        <el-option v-for="(label, value) in statusLabels" :key="value" :label="label" :value="value" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="search">查询</el-button>
                    <el-button @click="reset">重置</el-button>
                </el-form-item>
            </el-form>
        </el-row>

        <el-row class="box__body">
            <el-table :data="tableData" height="92%" border stripe empty-text="暂无上传任务">
                <el-table-column type="index" label="序号" width="70" align="center" />
                <el-table-column prop="original_name" label="文件名" min-width="190" show-overflow-tooltip />
                <el-table-column prop="owner_user_id" label="上传者" width="280" show-overflow-tooltip />
                <el-table-column label="状态" width="100" align="center">
                    <template #default="scope">
                        <el-tag size="small" :type="statusType(scope.row.status)">
                            {{ statusLabel(scope.row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="进度" width="150" align="center">
                    <template #default="scope">
                        {{ scope.row.completed_parts ?? 0 }} / {{ scope.row.total_parts ?? 0 }} 分片
                        <br />
                        {{ formatSize(scope.row.uploaded_bytes) }} / {{ formatSize(scope.row.size) }}
                    </template>
                </el-table-column>
                <el-table-column label="存储" width="110" align="center">
                    <template #default="scope">
                        {{ scope.row.storage_provider }} / {{ scope.row.transport_mode }}
                    </template>
                </el-table-column>
                <el-table-column label="最后活动" width="175">
                    <template #default="scope">{{ formatOptional(scope.row.last_activity_at) }}</template>
                </el-table-column>
                <el-table-column label="过期时间" width="175">
                    <template #default="scope">{{ formatOptional(scope.row.expires_at) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="170" fixed="right">
                    <template #default="scope">
                        <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
                        <el-button
                            v-if="canCancel(scope.row.status)"
                            v-permission="'file:admin:manage'"
                            link
                            type="danger"
                            @click="cancelTask(scope.row)">
                            取消
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-pagination
                v-model:current-page="page"
                v-model:page-size="pageSize"
                :page-sizes="[15, 50, 100]"
                layout="total, sizes, prev, pager, next"
                :total="total"
                style="padding: 0 10px; margin-left: auto"
                @change="loadData" />
        </el-row>

        <el-dialog v-model="detailVisible" title="上传任务详情" width="900px" destroy-on-close>
            <el-skeleton v-if="detailLoading" :rows="8" animated />
            <template v-else-if="detail">
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="任务 ID">{{ detail.upload_id }}</el-descriptions-item>
                    <el-descriptions-item label="上传者">{{ detail.owner_user_id }}</el-descriptions-item>
                    <el-descriptions-item label="文件名">{{ detail.original_name }}</el-descriptions-item>
                    <el-descriptions-item label="状态">{{ statusLabel(detail.status) }}</el-descriptions-item>
                    <el-descriptions-item label="SHA-256" :span="2">{{ detail.content_sha256 }}</el-descriptions-item>
                    <el-descriptions-item label="已上传">{{ formatSize(detail.uploaded_bytes) }}</el-descriptions-item>
                    <el-descriptions-item label="文件大小">{{ formatSize(detail.size) }}</el-descriptions-item>
                    <el-descriptions-item label="失败原因">{{ detail.failure_code || "—" }}</el-descriptions-item>
                    <el-descriptions-item label="清理次数">{{ detail.cleanup_attempts }}</el-descriptions-item>
                </el-descriptions>
                <el-table :data="detail.parts" max-height="360" border stripe style="margin-top: 16px">
                    <el-table-column prop="part_number" label="分片" width="80" align="center" />
                    <el-table-column label="状态" width="110" align="center">
                        <template #default="scope">{{ scope.row.status }}</template>
                    </el-table-column>
                    <el-table-column label="大小" min-width="150">
                        <template #default="scope">
                            {{ formatSize(scope.row.uploaded_size) }} / {{ formatSize(scope.row.expected_size) }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="upload_attempt" label="尝试次数" width="100" align="center" />
                    <el-table-column label="上传时间" width="175">
                        <template #default="scope">{{ formatOptional(scope.row.uploaded_at) }}</template>
                    </el-table-column>
                </el-table>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.file-upload-task-page {
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: var(--el-bg-color);
}

.box__search {
    display: flex;
    height: 10%;
    align-items: center;
    padding-left: 20px;
}

.box__search :deep(.el-form-item) {
    margin-bottom: 0;
}

.box__body {
    display: block;
    height: 90%;
    padding: 0 20px;
}

.box__body :deep(.el-table) {
    width: 100%;
}

.box__body :deep(.el-pagination) {
    justify-content: flex-end;
    margin-top: 4px;
}
</style>
