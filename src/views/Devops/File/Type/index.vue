<script setup lang="ts">
import { onMounted, ref } from "vue";

import { FileApi } from "@/api/system/file-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

type PolicyForm = FileTypePolicySaveParams & {
    extensionsText: string;
    contentTypesText: string;
    magicRulesText: string;
};

const loading = ref(false);
const saving = ref(false);
const tableData = ref<FileTypePolicy[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(15);
const editVisible = ref(false);
const editingId = ref<string>();
const form = ref<PolicyForm>(emptyForm());

function emptyForm(): PolicyForm {
    return {
        code: "",
        display_name: "",
        allowed_extensions: [],
        allowed_content_types: [],
        magic_rules: [],
        max_size: 104857600,
        preview_enabled: false,
        download_enabled: true,
        upload_enabled: true,
        dangerous: false,
        enabled: true,
        extensionsText: "",
        contentTypesText: "",
        magicRulesText: "[]"
    };
}

function formatSize(bytes: number): string {
    if (!bytes || bytes < 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(2)} ${units[index]}`;
}

function formatOptional(value?: string): string {
    return value ? formatDateTime(value) : "—";
}

function listText(value: string[]): string {
    return value.join(", ");
}

function statusType(enabled: boolean): "success" | "info" {
    return enabled ? "success" : "info";
}

async function loadData(): Promise<void> {
    loading.value = true;
    try {
        const result = await FileApi.fileTypesPage({ page_num: page.value, page_size: pageSize.value });
        tableData.value = result.records ?? [];
        total.value = result.total ?? 0;
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "文件类型策略加载失败");
    } finally {
        loading.value = false;
    }
}

function openCreate(): void {
    editingId.value = undefined;
    form.value = emptyForm();
    editVisible.value = true;
}

function openEdit(row: FileTypePolicy): void {
    editingId.value = row.id;
    form.value = {
        code: row.code,
        display_name: row.display_name,
        allowed_extensions: [...row.allowed_extensions],
        allowed_content_types: [...row.allowed_content_types],
        magic_rules: [...row.magic_rules],
        max_size: row.max_size,
        preview_enabled: row.preview_enabled,
        download_enabled: row.download_enabled,
        upload_enabled: row.upload_enabled,
        dangerous: row.dangerous,
        enabled: row.enabled,
        version: row.version,
        extensionsText: row.allowed_extensions.join("\n"),
        contentTypesText: row.allowed_content_types.join("\n"),
        magicRulesText: JSON.stringify(row.magic_rules, null, 2)
    };
    editVisible.value = true;
}

function lines(value: string): string[] {
    return value
        .split(/[,\n]/)
        .map(item => item.trim())
        .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMagicRules(value: string): FileMagicRule[] {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error("魔数规则必须是 JSON 数组");
    return parsed.map((item, index) => {
        if (!isRecord(item) || typeof item.bytes !== "string") {
            throw new Error(`第 ${index + 1} 条魔数规则缺少 bytes`);
        }
        if (item.offset !== undefined && typeof item.offset !== "number") {
            throw new Error(`第 ${index + 1} 条魔数规则 offset 必须是数字`);
        }
        if (item.description !== undefined && typeof item.description !== "string") {
            throw new Error(`第 ${index + 1} 条魔数规则 description 必须是文本`);
        }
        return {
            bytes: item.bytes,
            offset: item.offset as number | undefined,
            description: item.description as string | undefined
        };
    });
}

async function save(): Promise<void> {
    saving.value = true;
    try {
        const magicRules = parseMagicRules(form.value.magicRulesText);
        const payload: FileTypePolicySaveParams = {
            code: form.value.code.trim(),
            display_name: form.value.display_name.trim(),
            allowed_extensions: lines(form.value.extensionsText),
            allowed_content_types: lines(form.value.contentTypesText),
            magic_rules: magicRules,
            max_size: form.value.max_size,
            preview_enabled: form.value.preview_enabled,
            download_enabled: form.value.download_enabled,
            upload_enabled: form.value.upload_enabled,
            dangerous: form.value.dangerous,
            enabled: form.value.enabled,
            version: form.value.version
        };
        if (editingId.value) {
            await FileApi.updateFileType(editingId.value, payload);
        } else {
            await FileApi.createFileType(payload);
        }
        MessageUtils.success("文件类型策略已保存");
        editVisible.value = false;
        await loadData();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "文件类型策略保存失败");
    } finally {
        saving.value = false;
    }
}

async function changeEnabled(row: FileTypePolicy): Promise<void> {
    try {
        if (row.enabled) await FileApi.disableFileType(row.id);
        else await FileApi.enableFileType(row.id);
        MessageUtils.success(row.enabled ? "策略已停用" : "策略已启用");
        await loadData();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "文件类型策略状态更新失败");
    }
}

onMounted(() => {
    void loadData();
});
</script>

<template>
    <div v-loading="loading" class="file-type-page">
        <el-row class="toolbar">
            <el-alert
                title="策略只允许扩展名、媒体类型和结构化魔数规则；保存前后端都会校验规则形状。"
                type="info"
                show-icon />
            <el-button v-permission="'file:admin:manage'" type="primary" @click="openCreate">新增策略</el-button>
        </el-row>
        <el-table :data="tableData" height="calc(100% - 125px)" border stripe empty-text="暂无文件类型策略">
            <el-table-column prop="code" label="编码" width="110" />
            <el-table-column prop="display_name" label="名称" width="150" />
            <el-table-column label="扩展名" min-width="180" show-overflow-tooltip>
                <template #default="scope">{{ listText(scope.row.allowed_extensions) }}</template>
            </el-table-column>
            <el-table-column label="媒体类型" min-width="220" show-overflow-tooltip>
                <template #default="scope">{{ listText(scope.row.allowed_content_types) }}</template>
            </el-table-column>
            <el-table-column label="大小上限" width="120" align="center">
                <template #default="scope">{{ formatSize(scope.row.max_size) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
                <template #default="scope">
                    <el-tag size="small" :type="statusType(scope.row.enabled)">
                        {{ scope.row.enabled ? "已启用" : "已停用" }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column label="更新时间" width="175">
                <template #default="scope">{{ formatOptional(scope.row.updated_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="170" fixed="right">
                <template #default="scope">
                    <el-button v-permission="'file:admin:manage'" link type="primary" @click="openEdit(scope.row)">
                        编辑
                    </el-button>
                    <el-button v-permission="'file:admin:manage'" link type="warning" @click="changeEnabled(scope.row)">
                        {{ scope.row.enabled ? "停用" : "启用" }}
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
            style="padding: 0 20px; justify-content: flex-end"
            @change="loadData" />

        <el-dialog
            v-model="editVisible"
            :title="editingId ? '编辑文件类型策略' : '新增文件类型策略'"
            width="760px"
            destroy-on-close>
            <el-form label-width="130px">
                <el-form-item label="编码">
                    <el-input
                        v-model="form.code"
                        :disabled="Boolean(editingId)"
                        maxlength="80"
                        placeholder="例如 PDF" />
                </el-form-item>
                <el-form-item label="名称">
                    <el-input v-model="form.display_name" maxlength="120" placeholder="例如 PDF 文档" />
                </el-form-item>
                <el-form-item label="允许扩展名">
                    <el-input
                        v-model="form.extensionsText"
                        type="textarea"
                        :rows="2"
                        placeholder="每行一个，例如：pdf" />
                </el-form-item>
                <el-form-item label="允许媒体类型">
                    <el-input
                        v-model="form.contentTypesText"
                        type="textarea"
                        :rows="3"
                        placeholder="每行一个，例如：application/pdf" />
                </el-form-item>
                <el-form-item label="魔数规则 JSON">
                    <el-input
                        v-model="form.magicRulesText"
                        type="textarea"
                        :rows="6"
                        placeholder='例如：[{"bytes":"25504446","offset":0}]' />
                </el-form-item>
                <el-form-item label="大小上限（字节）">
                    <el-input-number v-model="form.max_size" :min="1" :step="1048576" controls-position="right" />
                </el-form-item>
                <el-form-item label="功能开关">
                    <el-checkbox v-model="form.upload_enabled">允许上传</el-checkbox>
                    <el-checkbox v-model="form.download_enabled">允许下载</el-checkbox>
                    <el-checkbox v-model="form.preview_enabled">允许预览</el-checkbox>
                    <el-checkbox v-model="form.dangerous">危险类型</el-checkbox>
                    <el-checkbox v-model="form.enabled">立即启用</el-checkbox>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="editVisible = false">取消</el-button>
                <el-button type="primary" :loading="saving" @click="save">保存</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.file-type-page {
    height: 100%;
    min-height: 0;
    overflow: hidden;
    padding: 20px;
    box-sizing: border-box;
    background: var(--el-bg-color);
}

.toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.toolbar :deep(.el-alert) {
    flex: 1;
}

.file-type-page :deep(.el-table) {
    width: 100%;
}

.file-type-page :deep(.el-pagination) {
    display: flex;
    margin-top: 8px;
}
</style>
