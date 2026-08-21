<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import { UserImportApi } from "@/api/user/user-import-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import {
    createUserImportIdempotencyKey,
    parseUserImportCsv,
    serializeUserImportRows,
    sha256Text,
    USER_IMPORT_HEADERS,
    USER_IMPORT_HEADER_LABELS,
    type UserImportHeader
} from "@/utils/user-import.ts";

import type { UploadFile } from "element-plus";

const router = useRouter();
const activeStep = ref(0);
const loading = ref(false);
const sourceText = ref("");
const fileName = ref("");
const rows = ref<UserImportRow[]>([]);
const task = ref<UserImportTask | null>(null);
const errorRows = ref<UserImportRowResult[]>([]);
const parseError = ref("");
const idempotencyKey = ref("");
const skipExisting = ref(true);

const previewReady = computed(
    () => task.value?.status === "PREVIEWED" && Boolean(task.value.preview_token) && task.value.error_rows === 0
);
const resultTitle = computed(() => {
    if (task.value?.status === "SUCCEEDED") return "批量导入已完成";
    if (task.value?.status === "PARTIAL_FAILED") return "批量导入部分完成";
    return "批量导入未完成";
});
const resultDescription = computed(() => {
    if (task.value?.status === "SUCCEEDED") return "用户和授权方案已经按预览结果完成处理。";
    if (task.value?.status === "PARTIAL_FAILED") return "部分行处理失败，请查看失败明细并修正后重新导入。";
    return "导入任务没有完成，请查看明细或重新开始。";
});

function handleBack(): void {
    router.push({ name: "SystemUser" });
}

function emptyRow(): UserImportRow {
    return {
        username: "",
        real_name: "",
        phone: "",
        email: "",
        department_code: "",
        language: "",
        timezone: "",
        authorization_profile_code: ""
    };
}

async function handleFileChange(file: UploadFile): Promise<void> {
    if (!file.raw) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
        MessageUtils.warning("当前仅支持 CSV 或 TXT 文件，Excel 解析将在后续版本接入");
        return;
    }

    try {
        fileName.value = file.name;
        sourceText.value = await file.raw.text();
        parseSource();
    } catch (error: unknown) {
        parseError.value = error instanceof Error ? error.message : "读取文件失败";
    }
}

function parseSource(): void {
    parseError.value = "";
    try {
        rows.value = parseUserImportCsv(sourceText.value);
        task.value = null;
        errorRows.value = [];
        activeStep.value = 0;
        MessageUtils.success(`已解析 ${rows.value.length} 行用户数据`);
    } catch (error: unknown) {
        rows.value = [];
        parseError.value = error instanceof Error ? error.message : "文件解析失败";
    }
}

function addRow(): void {
    rows.value.push(emptyRow());
}

function removeRow(index: number): void {
    rows.value.splice(index, 1);
}

function downloadTemplate(): void {
    const template = `${USER_IMPORT_HEADERS.join(",")}\n${USER_IMPORT_HEADERS.map(() => '""').join(",")}\n`;
    const blob = new Blob(["\uFEFF", template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "用户批量导入模板.csv";
    link.click();
    URL.revokeObjectURL(url);
}

async function handlePreview(): Promise<void> {
    if (!rows.value.length) {
        MessageUtils.warning("请先上传文件或解析粘贴的数据");
        return;
    }

    loading.value = true;
    parseError.value = "";
    try {
        const normalizedText = serializeUserImportRows(rows.value);
        const nextTask = await UserImportApi.preview({
            idempotency_key: idempotencyKey.value || (idempotencyKey.value = createUserImportIdempotencyKey()),
            file_name: fileName.value || "手工录入.csv",
            file_hash: await sha256Text(normalizedText),
            skip_existing: skipExisting.value,
            rows: rows.value
        });
        task.value = nextTask;
        errorRows.value = await UserImportApi.errors(nextTask.id);
        activeStep.value = 1;
    } catch (error: unknown) {
        MessageUtils.error(error);
    } finally {
        loading.value = false;
    }
}

function handleBackToEdit(): void {
    activeStep.value = 0;
    idempotencyKey.value = createUserImportIdempotencyKey();
    task.value = null;
}

async function handleApply(): Promise<void> {
    if (!task.value || !previewReady.value || !task.value.preview_token) return;

    try {
        await MessageUtils.box.confirm(
            `将创建 ${task.value.valid_rows} 个用户，并按授权方案写入 ${task.value.assignment_count} 个授权实例。确定继续吗？`,
            "确认批量应用"
        );
    } catch {
        return;
    }

    loading.value = true;
    try {
        await UserImportApi.apply(task.value.id, { preview_token: task.value.preview_token });
        task.value = await UserImportApi.detail(task.value.id);
        errorRows.value = await UserImportApi.errors(task.value.id);
        activeStep.value = 2;
    } catch (error: unknown) {
        MessageUtils.error(error);
    } finally {
        loading.value = false;
    }
}

function startOver(): void {
    activeStep.value = 0;
    sourceText.value = "";
    fileName.value = "";
    rows.value = [];
    task.value = null;
    errorRows.value = [];
    parseError.value = "";
    idempotencyKey.value = "";
}

function stateLabel(state: string): string {
    return (
        {
            APPLIED: "已应用",
            SKIPPED: "已跳过",
            ERROR: "失败"
        }[state] ?? state
    );
}

function errorSummary(row: UserImportRowResult): string {
    return row.errors?.join("；") || "处理失败，请查看服务端日志或重新 Preview";
}

function headerLabel(header: UserImportHeader): string {
    return USER_IMPORT_HEADER_LABELS[header];
}
</script>

<template>
    <div v-loading="loading" class="user-import-page">
        <div class="import-content">
            <header class="page-header">
                <div>
                    <button class="breadcrumb" type="button" @click="handleBack">用户管理</button>
                    <h1>批量导入用户</h1>
                    <p>一次完成用户资料、组织归属和授权方案配置，应用前会先进行完整校验。</p>
                </div>
                <el-button text @click="handleBack">返回用户列表</el-button>
            </header>

            <el-steps class="import-steps" :active="activeStep" align-center finish-status="success">
                <el-step title="准备数据" description="上传模板或粘贴结构化数据" />
                <el-step title="Preview 校验" description="查看错误和授权影响" />
                <el-step title="Apply 结果" description="查看成功、跳过和失败明细" />
            </el-steps>

            <section v-if="activeStep === 0" class="import-section">
                <div class="section-heading">
                    <div>
                        <h2>准备导入数据</h2>
                        <p>当前支持固定 CSV/TXT 模板；Excel 文件解析将在后续版本接入。</p>
                    </div>
                    <el-button plain @click="downloadTemplate">下载导入模板</el-button>
                </div>

                <el-alert
                    title="必填字段：用户名、真实姓名、手机号码、邮箱、部门编码、语言、时区和授权方案编码。"
                    type="info"
                    :closable="false"
                    show-icon />

                <div class="source-grid">
                    <div class="source-panel">
                        <div class="panel-title">上传或粘贴</div>
                        <el-upload
                            class="upload-area"
                            drag
                            accept=".csv,.txt"
                            :auto-upload="false"
                            :show-file-list="false"
                            :on-change="handleFileChange">
                            <div class="upload-title">拖拽 CSV/TXT 文件到这里</div>
                            <div class="upload-hint">或点击选择文件，文件不会在 Preview 前写入用户数据</div>
                        </el-upload>
                        <el-input
                            v-model="sourceText"
                            class="source-input"
                            type="textarea"
                            :rows="7"
                            resize="none"
                            placeholder="也可以直接粘贴 CSV 内容" />
                        <div class="source-actions">
                            <span v-if="fileName" class="file-name">当前文件：{{ fileName }}</span>
                            <el-button type="primary" plain @click="parseSource">解析数据</el-button>
                        </div>
                        <el-alert v-if="parseError" :title="parseError" type="error" :closable="false" show-icon />
                    </div>

                    <div class="template-panel">
                        <div class="panel-title">字段说明</div>
                        <div class="field-list">
                            <div v-for="header in USER_IMPORT_HEADERS" :key="header" class="field-item">
                                <span>{{ headerLabel(header) }}</span>
                                <code>{{ header }}</code>
                            </div>
                        </div>
                        <p class="template-note">
                            部门编码必须是系统中已存在的部门编码；授权方案编码必须是启用状态的方案。语言和时区请填写系统字典值。
                        </p>
                    </div>
                </div>

                <div class="data-toolbar">
                    <div>
                        <strong>数据预览</strong>
                        <span>共 {{ rows.length }} 行，可在 Preview 前直接修正。</span>
                    </div>
                    <div class="toolbar-actions">
                        <el-checkbox v-model="skipExisting">用户名已存在时跳过</el-checkbox>
                        <el-button plain @click="addRow">新增一行</el-button>
                    </div>
                </div>

                <el-table v-if="rows.length" :data="rows" border height="420" class="import-table">
                    <el-table-column type="index" label="#" width="56" align="center" />
                    <el-table-column
                        v-for="header in USER_IMPORT_HEADERS"
                        :key="header"
                        :label="headerLabel(header)"
                        :min-width="header === 'authorization_profile_code' ? 190 : 150">
                        <template #default="scope">
                            <el-input v-model="scope.row[header]" size="small" :placeholder="header" />
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="80" fixed="right">
                        <template #default="scope">
                            <el-button link type="danger" @click="removeRow(scope.$index)">删除</el-button>
                        </template>
                    </el-table-column>
                </el-table>
                <el-empty v-else description="暂无数据，请上传模板或粘贴 CSV 内容" />

                <div class="action-bar">
                    <el-button @click="handleBack">取消</el-button>
                    <el-button type="primary" :disabled="!rows.length" @click="handlePreview">
                        下一步：Preview 校验
                    </el-button>
                </div>
            </section>

            <section v-else-if="activeStep === 1 && task" class="import-section">
                <div class="section-heading">
                    <div>
                        <h2>Preview 校验</h2>
                        <p>后端已完成字段、重复数据、组织、字典和授权方案校验，Apply 前不会写入用户数据。</p>
                    </div>
                    <el-tag :type="task.error_rows ? 'danger' : 'success'">
                        {{ task.error_rows ? `${task.error_rows} 行需要修正` : "校验通过" }}
                    </el-tag>
                </div>

                <el-alert
                    v-if="task.error_rows"
                    title="存在错误行，当前不能 Apply。请返回修改数据后重新 Preview。"
                    type="warning"
                    :closable="false"
                    show-icon />

                <div class="stats-grid">
                    <el-statistic title="总行数" :value="task.total_rows" />
                    <el-statistic title="可处理" :value="task.valid_rows" />
                    <el-statistic title="跳过" :value="task.skipped_rows" />
                    <el-statistic title="授权实例" :value="task.assignment_count" />
                    <el-statistic title="Access Boundary" :value="task.access_boundary_count" />
                    <el-statistic title="Grant Boundary" :value="task.grant_boundary_count" />
                </div>

                <div class="preview-note">
                    <span>文件：{{ task.file_name }}</span>
                    <span>已存在用户：{{ task.skip_existing ? "跳过" : "报错" }}</span>
                    <span>Preview 有效期：{{ task.preview_expires_at }}</span>
                </div>

                <div v-if="errorRows.length" class="error-section">
                    <div class="subsection-title">
                        <strong>错误明细</strong>
                        <span>返回上一步后，可按行号修正本地数据。</span>
                    </div>
                    <el-table :data="errorRows" border stripe>
                        <el-table-column prop="row_number" label="行号" width="90" align="center" />
                        <el-table-column prop="row_key" label="行标识" width="180" show-overflow-tooltip />
                        <el-table-column label="状态" width="100" align="center">
                            <template #default="scope">
                                <el-tag type="danger">{{ stateLabel(scope.row.state) }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="错误信息" min-width="420">
                            <template #default="scope">
                                {{ errorSummary(scope.row) }}
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
                <el-empty v-else description="没有错误行" />

                <div class="action-bar">
                    <el-button @click="handleBackToEdit">返回修改</el-button>
                    <el-button type="primary" :disabled="!previewReady" @click="handleApply">确认 Apply</el-button>
                </div>
            </section>

            <section v-else class="import-section result-section">
                <div class="result-heading">
                    <div class="result-icon" :class="{ success: task?.status === 'SUCCEEDED' }">✓</div>
                    <div>
                        <h2>{{ resultTitle }}</h2>
                        <p>{{ resultDescription }}</p>
                    </div>
                </div>

                <div v-if="task" class="stats-grid result-stats">
                    <el-statistic title="成功创建" :value="task.applied_rows" />
                    <el-statistic title="跳过" :value="task.skipped_rows" />
                    <el-statistic title="失败" :value="task.error_rows" />
                    <el-statistic title="总行数" :value="task.total_rows" />
                </div>

                <div v-if="errorRows.length" class="error-section">
                    <div class="subsection-title">
                        <strong>失败明细</strong>
                        <span>修正失败行后可以重新发起一次导入。</span>
                    </div>
                    <el-table :data="errorRows" border stripe>
                        <el-table-column prop="row_number" label="行号" width="90" align="center" />
                        <el-table-column prop="row_key" label="行标识" width="180" show-overflow-tooltip />
                        <el-table-column label="状态" width="100" align="center">
                            <template #default="scope">
                                <el-tag type="danger">{{ stateLabel(scope.row.state) }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="错误信息" min-width="420">
                            <template #default="scope">
                                {{ errorSummary(scope.row) }}
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
                <el-empty v-else description="没有失败明细" />

                <div class="action-bar">
                    <el-button @click="handleBack">返回用户列表</el-button>
                    <el-button type="primary" @click="startOver">继续导入</el-button>
                </div>
            </section>
        </div>
    </div>
</template>

<style scoped lang="scss">
.user-import-page {
    min-height: 100%;
    height: 100%;
    overflow-y: auto;
    padding: 28px 32px 36px;
    background: var(--el-bg-color);
}

.import-content {
    width: min(1280px, 100%);
    margin: 0 auto;
}

.page-header,
.section-heading,
.data-toolbar,
.source-actions,
.action-bar,
.preview-note,
.subsection-title,
.result-heading {
    display: flex;
    align-items: center;
}

.page-header,
.section-heading,
.data-toolbar,
.source-actions,
.action-bar,
.subsection-title {
    justify-content: space-between;
    gap: 16px;
}

.page-header {
    margin-bottom: 20px;
}

.breadcrumb {
    padding: 0;
    border: 0;
    color: var(--el-color-primary);
    background: transparent;
    cursor: pointer;
    font-size: 13px;
}

.page-header h1 {
    margin: 8px 0 4px;
    color: var(--el-text-color-primary);
    font-size: 24px;
}

.page-header p,
.section-heading p,
.subsection-title span,
.data-toolbar span {
    margin: 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.import-steps {
    width: min(900px, 100%);
    margin: 28px auto 32px;
    padding: 0 24px;
}

.import-section {
    padding-bottom: 20px;
}

.section-heading {
    margin-bottom: 22px;
}

.section-heading h2,
.result-heading h2 {
    margin: 0 0 6px;
    color: var(--el-text-color-primary);
    font-size: 18px;
}

.source-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
    gap: 24px;
    margin-top: 20px;
}

.source-panel,
.template-panel {
    padding: 20px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
}

.panel-title {
    margin-bottom: 14px;
    color: var(--el-text-color-primary);
    font-weight: 600;
}

.upload-area {
    width: 100%;
}

.upload-area :deep(.el-upload),
.upload-area :deep(.el-upload-dragger) {
    width: 100%;
}

.upload-area :deep(.el-upload-dragger) {
    padding: 26px 20px;
}

.upload-title {
    color: var(--el-text-color-primary);
    font-size: 14px;
}

.upload-hint,
.template-note {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.source-input {
    margin-top: 14px;
}

.source-actions {
    min-height: 42px;
    margin-top: 8px;
}

.file-name {
    overflow: hidden;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.field-list {
    display: grid;
    gap: 10px;
}

.field-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--el-border-color-extra-light);
}

.field-item span {
    color: var(--el-text-color-regular);
    font-size: 13px;
}

.field-item code {
    color: var(--el-color-primary);
    font-size: 12px;
}

.template-note {
    margin: 18px 0 0;
    line-height: 1.7;
}

.data-toolbar {
    margin: 26px 0 14px;
}

.data-toolbar > div:first-child {
    display: flex;
    align-items: baseline;
    gap: 12px;
}

.toolbar-actions {
    display: flex;
    align-items: center;
    gap: 16px;
}

.import-table {
    width: 100%;
}

.action-bar {
    margin-top: 24px;
    padding-top: 18px;
    border-top: 1px solid var(--el-border-color-lighter);
}

.action-bar .el-button {
    min-width: 100px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 16px;
    margin: 24px 0;
}

.stats-grid :deep(.el-statistic) {
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    background: var(--el-bg-color);
}

.preview-note {
    flex-wrap: wrap;
    gap: 12px 28px;
    padding: 14px 16px;
    color: var(--el-text-color-secondary);
    border-radius: 8px;
    background: var(--el-fill-color-light);
    font-size: 12px;
}

.error-section {
    margin-top: 24px;
}

.subsection-title {
    margin-bottom: 12px;
}

.result-section {
    min-height: 420px;
}

.result-heading {
    justify-content: center;
    gap: 16px;
    margin: 46px 0 28px;
    text-align: left;
}

.result-heading p {
    margin: 0;
    color: var(--el-text-color-secondary);
}

.result-icon {
    display: grid;
    width: 48px;
    height: 48px;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: var(--el-color-warning);
    font-size: 28px;
}

.result-icon.success {
    background: var(--el-color-success);
}

.result-stats {
    width: min(760px, 100%);
    margin: 0 auto 28px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
}

@media (max-width: 900px) {
    .source-grid,
    .stats-grid {
        grid-template-columns: 1fr;
    }

    .result-stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 768px) {
    .user-import-page {
        padding: 20px 16px 28px;
    }

    .page-header,
    .section-heading,
    .data-toolbar,
    .source-actions,
    .action-bar {
        align-items: stretch;
        flex-direction: column;
    }

    .data-toolbar > div:first-child,
    .toolbar-actions {
        align-items: flex-start;
        flex-direction: column;
    }

    .import-steps {
        padding: 0;
    }
}
</style>
