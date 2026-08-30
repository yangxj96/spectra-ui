<script setup lang="ts">
import { onMounted, ref } from "vue";

import { FileApi } from "@/api/system/file-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const loading = ref(false);
const tableData = ref<FileReferenceAdmin[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(15);
const query = ref<FileReferencePageParams>({
    page_num: 1,
    page_size: 15,
    file_asset_id: "",
    reference_type: "",
    purpose: ""
});

function formatOptional(value?: string): string {
    return value ? formatDateTime(value) : "—";
}

async function loadData(): Promise<void> {
    loading.value = true;
    try {
        const result = await FileApi.referencesPage({
            ...query.value,
            page_num: page.value,
            page_size: pageSize.value,
            file_asset_id: query.value.file_asset_id || undefined,
            reference_type: query.value.reference_type || undefined,
            purpose: query.value.purpose || undefined
        });
        tableData.value = result.records ?? [];
        total.value = result.total ?? 0;
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "文件引用加载失败");
    } finally {
        loading.value = false;
    }
}

function search(): void {
    page.value = 1;
    void loadData();
}

function reset(): void {
    query.value = { page_num: 1, page_size: 15, file_asset_id: "", reference_type: "", purpose: "" };
    search();
}

function formatSize(bytes?: number): string {
    if (!bytes || bytes < 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(2)} ${units[index]}`;
}

onMounted(() => {
    void loadData();
});
</script>

<template>
    <div v-loading="loading" class="file-reference-page">
        <el-row class="box__search">
            <el-form :inline="true">
                <el-form-item label="资产 ID">
                    <el-input v-model="query.file_asset_id" clearable placeholder="按资产 ID 搜索" />
                </el-form-item>
                <el-form-item label="引用类型">
                    <el-input v-model="query.reference_type" clearable placeholder="例如 DOCUMENT_VERSION" />
                </el-form-item>
                <el-form-item label="用途">
                    <el-input v-model="query.purpose" clearable placeholder="例如 CONTENT" />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="search">查询</el-button>
                    <el-button @click="reset">重置</el-button>
                </el-form-item>
            </el-form>
        </el-row>

        <el-row class="box__body">
            <el-alert
                title="文件引用是业务访问权限的事实记录，本页面只读，不提供绕过业务权限的删除操作。"
                type="info"
                show-icon />
            <el-table :data="tableData" height="calc(100% - 90px)" border stripe empty-text="暂无文件引用">
                <el-table-column prop="asset_original_name" label="文件名" min-width="180" show-overflow-tooltip />
                <el-table-column prop="file_asset_id" label="文件资产 ID" width="280" show-overflow-tooltip />
                <el-table-column label="文件大小" width="110" align="center">
                    <template #default="scope">{{ formatSize(scope.row.asset_size) }}</template>
                </el-table-column>
                <el-table-column prop="reference_type" label="引用类型" width="170" show-overflow-tooltip />
                <el-table-column prop="business_reference_id" label="业务对象 ID" width="280" show-overflow-tooltip />
                <el-table-column prop="purpose" label="用途" width="120" align="center" />
                <el-table-column prop="display_name" label="显示名称" min-width="150" show-overflow-tooltip />
                <el-table-column label="创建时间" width="175">
                    <template #default="scope">{{ formatOptional(scope.row.created_at) }}</template>
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
    </div>
</template>

<style scoped lang="scss">
.file-reference-page {
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

.box__body :deep(.el-alert) {
    margin-bottom: 8px;
}

.box__body :deep(.el-table) {
    width: 100%;
}

.box__body :deep(.el-pagination) {
    justify-content: flex-end;
    margin-top: 4px;
}
</style>
