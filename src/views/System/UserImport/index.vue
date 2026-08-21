<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";

import { AuthorizationApi } from "@/api/auth/authorization-api.ts";
import { DepartmentApi } from "@/api/user/department-api.ts";
import { UserImportApi } from "@/api/user/user-import-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import {
    calculateUserImportProgress,
    classifyUserImportError,
    createUserImportIdempotencyKey,
    MAX_USER_IMPORT_FILE_SIZE,
    localizeUserImportError,
    parseUserImportFile,
    serializeUserImportRows,
    serializeUserImportErrors,
    sha256Text,
    USER_IMPORT_ERROR_CATEGORY_LABELS,
    USER_IMPORT_HEADERS,
    USER_IMPORT_HEADER_LABELS,
    USER_IMPORT_TEMPLATE_HEADERS,
    type UserImportErrorCategory,
    type UserImportHeader
} from "@/utils/user-import.ts";

import type { UploadFile } from "element-plus";

const router = useRouter();
const activeStep = ref(0);
const importSteps = [
    { title: "准备导入数据", description: "上传模板并整理用户信息" },
    { title: "数据校验", description: "检查数据和授权影响" },
    { title: "导入结果", description: "查看处理进度和结果" }
] as const;
const loading = ref(false);
const templateLoading = ref(false);
const selectedFile = ref<File | null>(null);
const fileName = ref("");
const rows = ref<UserImportRow[]>([]);
const task = ref<UserImportTask | null>(null);
const errorRows = ref<UserImportRowResult[]>([]);
const parseError = ref("");
const idempotencyKey = ref("");
const skipExisting = ref(true);
const errorCategory = ref<"ALL" | UserImportErrorCategory>("ALL");
let pollingTimer: ReturnType<typeof setInterval> | null = null;
let refreshInFlight = false;

const activeStepMeta = computed(() => importSteps[activeStep.value] ?? importSteps[0]);
const canViewApplyResult = computed(() =>
    ["APPLYING", "SUCCEEDED", "PARTIAL_FAILED", "FAILED", "EXPIRED"].includes(task.value?.status ?? "")
);

const previewReady = computed(
    () => task.value?.status === "PREVIEWED" && Boolean(task.value.preview_token) && task.value.error_rows === 0
);
const filteredErrorRows = computed(() => {
    if (errorCategory.value === "ALL") return errorRows.value;
    return errorRows.value.filter(row =>
        row.errors?.some(error => classifyUserImportError(error) === errorCategory.value)
    );
});
const errorCategoryOptions = computed(() => {
    const categories = new Set(
        errorRows.value.flatMap(row => (row.errors ?? []).map(error => classifyUserImportError(error)))
    );
    return Object.entries(USER_IMPORT_ERROR_CATEGORY_LABELS)
        .filter(([category]) => categories.has(category as UserImportErrorCategory))
        .map(([value, label]) => ({ value: value as UserImportErrorCategory, label }));
});
const resultTitle = computed(() => {
    if (task.value?.status === "APPLYING") return "正在应用批量导入";
    if (task.value?.status === "SUCCEEDED") return "批量导入已完成";
    if (task.value?.status === "PARTIAL_FAILED") return "批量导入部分完成";
    return "批量导入未完成";
});
const resultDescription = computed(() => {
    if (task.value?.status === "APPLYING") return "用户和授权方案正在后台处理，可以留在当前页面查看进度。";
    if (task.value?.status === "SUCCEEDED") return "用户和授权方案已经按预览结果完成处理。";
    if (task.value?.status === "PARTIAL_FAILED") return "部分行处理失败，请查看失败明细并修正后重新导入。";
    return "导入任务没有完成，请查看明细或重新开始。";
});
const progressPercentage = computed(() => {
    return task.value ? calculateUserImportProgress(task.value.completed_rows, task.value.total_rows) : 0;
});

function handleBack(): void {
    stopPolling();
    router.push({ name: "SystemUser" });
}

function handleStepChange(step: number): void {
    if (step === activeStep.value) return;
    if (step === 0) {
        activeStep.value = 0;
        return;
    }
    if (step === 1) {
        if (!task.value) {
            MessageUtils.warning("请先准备导入数据并完成数据校验");
            return;
        }
        activeStep.value = 1;
        return;
    }
    if (!canViewApplyResult.value) {
        MessageUtils.warning("请先确认应用，再查看应用结果");
        return;
    }
    activeStep.value = 2;
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
    if (file.raw.size > MAX_USER_IMPORT_FILE_SIZE) {
        selectedFile.value = null;
        fileName.value = "";
        MessageUtils.warning("导入文件不能超过 5 MB");
        return;
    }
    if (!/\.(csv|txt|xlsx|xls)$/i.test(file.name)) {
        selectedFile.value = null;
        fileName.value = "";
        MessageUtils.warning("当前仅支持 CSV、TXT 或 Excel 文件");
        return;
    }

    parseError.value = "";
    selectedFile.value = file.raw;
    fileName.value = file.name;
    rows.value = [];
    task.value = null;
    errorRows.value = [];
    activeStep.value = 0;
    await parseSelectedFile();
}

async function parseSelectedFile(): Promise<void> {
    if (!selectedFile.value) {
        MessageUtils.warning("请先选择导入文件");
        return;
    }

    loading.value = true;
    parseError.value = "";
    try {
        rows.value = await parseUserImportFile(selectedFile.value);
        task.value = null;
        errorRows.value = [];
        activeStep.value = 0;
        MessageUtils.success(`已解析 ${rows.value.length} 行用户数据`);
    } catch (error: unknown) {
        rows.value = [];
        parseError.value = error instanceof Error ? error.message : "读取文件失败";
    } finally {
        loading.value = false;
    }
}

function addRow(): void {
    rows.value.push(emptyRow());
}

function removeRow(index: number): void {
    rows.value.splice(index, 1);
}

function flattenDepartments(nodes: DepartmentTreeVO[]): DepartmentTreeVO[] {
    return nodes.flatMap(node => [node, ...flattenDepartments(node.children ?? [])]);
}

function formatReferenceOption(code: string, name?: string): string {
    const displayName = name?.trim();
    return displayName ? `${displayName}｜${code}` : code;
}

async function downloadTemplate(): Promise<void> {
    templateLoading.value = true;
    try {
        const [departmentTree, profiles] = await Promise.all([DepartmentApi.tree(), AuthorizationApi.profiles()]);
        const departments = flattenDepartments(departmentTree ?? []).filter(department => department.code);
        const activeProfiles = (profiles ?? []).filter(profile => profile.state === "ACTIVE" && profile.code);
        if (!departments.length || !activeProfiles.length) {
            MessageUtils.warning("当前没有可用于导入的部门或启用授权方案");
            return;
        }

        const { default: ExcelJS } = await import("exceljs");
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("用户导入");
        const optionsSheet = workbook.addWorksheet("下拉选项");
        const templateHeaders = [...USER_IMPORT_TEMPLATE_HEADERS];
        const templateRows = 2000;

        sheet.addRow(templateHeaders);
        sheet.views = [{ state: "frozen", ySplit: 1 }];
        sheet.columns = [
            { key: "username", width: 20 },
            { key: "real_name", width: 18 },
            { key: "phone", width: 18 },
            { key: "email", width: 28 },
            { key: "department_code", width: 22 },
            { key: "language", width: 14 },
            { key: "timezone", width: 24 },
            { key: "authorization_profile_code", width: 26 }
        ];

        const headerRow = sheet.getRow(1);
        headerRow.height = 24;
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF409EFF" } };
        });

        optionsSheet.addRow(["部门选项", "部门编码", "部门名称"]);
        departments.forEach(department =>
            optionsSheet.addRow([
                formatReferenceOption(department.code, department.name),
                department.code,
                department.name
            ])
        );
        optionsSheet.getCell("E1").value = "授权方案选项";
        optionsSheet.getCell("F1").value = "授权方案编码";
        optionsSheet.getCell("G1").value = "授权方案名称";
        activeProfiles.forEach((profile, index) => {
            optionsSheet.getCell(index + 2, 5).value = formatReferenceOption(profile.code, profile.name);
            optionsSheet.getCell(index + 2, 6).value = profile.code;
            optionsSheet.getCell(index + 2, 7).value = profile.name;
        });
        optionsSheet.columns = [
            { width: 42 },
            { width: 24 },
            { width: 28 },
            { width: 4 },
            { width: 42 },
            { width: 28 },
            { width: 32 }
        ];
        optionsSheet.views = [{ state: "frozen", ySplit: 1 }];
        optionsSheet.getRow(1).eachCell(cell => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF409EFF" } };
        });

        const departmentEndRow = departments.length + 1;
        const profileEndRow = activeProfiles.length + 1;
        workbook.definedNames.add(`'下拉选项'!$A$2:$A$${departmentEndRow}`, "部门编码选项");
        workbook.definedNames.add(`'下拉选项'!$E$2:$E$${profileEndRow}`, "授权方案编码选项");

        for (let row = 2; row <= templateRows + 1; row++) {
            sheet.getCell(row, 5).dataValidation = {
                type: "list",
                allowBlank: false,
                formulae: ["=部门编码选项"],
                showErrorMessage: true,
                errorTitle: "部门编码无效",
                error: "请从下拉列表中选择系统中已有的部门编码。"
            };
            sheet.getCell(row, 8).dataValidation = {
                type: "list",
                allowBlank: false,
                formulae: ["=授权方案编码选项"],
                showErrorMessage: true,
                errorTitle: "授权方案编码无效",
                error: "请从下拉列表中选择启用状态的授权方案编码。"
            };
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "用户批量导入模板.xlsx";
        link.click();
        URL.revokeObjectURL(url);
    } catch (error: unknown) {
        MessageUtils.error(error);
    } finally {
        templateLoading.value = false;
    }
}

function downloadErrors(): void {
    if (!filteredErrorRows.value.length) {
        MessageUtils.warning("当前筛选条件下没有错误明细");
        return;
    }
    const blob = new Blob(["\uFEFF", serializeUserImportErrors(filteredErrorRows.value)], {
        type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "用户批量导入错误明细.csv";
    link.click();
    URL.revokeObjectURL(url);
}

async function handlePreview(): Promise<void> {
    if (!rows.value.length) {
        MessageUtils.warning("请先选择文件并解析数据");
        return;
    }

    loading.value = true;
    parseError.value = "";
    try {
        const normalizedText = serializeUserImportRows(rows.value);
        const nextTask = await UserImportApi.preview({
            idempotency_key: idempotencyKey.value || (idempotencyKey.value = createUserImportIdempotencyKey()),
            file_name: fileName.value || "用户批量导入.csv",
            file_hash: await sha256Text(normalizedText),
            skip_existing: skipExisting.value,
            rows: rows.value
        });
        task.value = nextTask;
        errorRows.value = await UserImportApi.errors(nextTask.id);
        errorCategory.value = "ALL";
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
        task.value = await UserImportApi.apply(task.value.id, { preview_token: task.value.preview_token });
        activeStep.value = 2;
        await refreshTask();
        startPolling();
    } catch (error: unknown) {
        MessageUtils.error(error);
    } finally {
        loading.value = false;
    }
}

function isTerminal(status: UserImportTaskStatus): boolean {
    return ["SUCCEEDED", "PARTIAL_FAILED", "FAILED", "EXPIRED"].includes(status);
}

async function refreshTask(): Promise<void> {
    if (!task.value || refreshInFlight) return;
    const taskId = task.value.id;
    refreshInFlight = true;
    try {
        const latestTask = await UserImportApi.detail(taskId);
        if (task.value?.id !== taskId) return;
        task.value = latestTask;
        if (isTerminal(latestTask.status)) {
            errorRows.value = await UserImportApi.errors(taskId);
            stopPolling();
        }
    } catch (error: unknown) {
        stopPolling();
        MessageUtils.error(error);
    } finally {
        refreshInFlight = false;
    }
}

function startPolling(): void {
    stopPolling();
    if (!task.value || isTerminal(task.value.status)) return;
    pollingTimer = setInterval(() => void refreshTask(), 1000);
}

function stopPolling(): void {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = null;
}

function startOver(): void {
    stopPolling();
    activeStep.value = 0;
    selectedFile.value = null;
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
    return row.errors?.map(localizeUserImportError).join("；") || "处理失败，请查看服务端日志或重新校验";
}

function errorTypeLabel(row: UserImportRowResult): string {
    const categories = new Set((row.errors ?? []).map(error => classifyUserImportError(error)));
    return [...categories].map(category => USER_IMPORT_ERROR_CATEGORY_LABELS[category]).join("、") || "其他错误";
}

function headerLabel(header: UserImportHeader): string {
    return USER_IMPORT_HEADER_LABELS[header];
}

onUnmounted(stopPolling);
</script>

<template>
    <div v-loading="loading" class="user-import-page">
        <div class="user-import-shell">
            <div class="user-import-workspace">
                <aside class="user-import-side user-import-side-left">
                    <nav class="user-import-step-nav" aria-label="用户批量导入步骤">
                        <button
                            v-for="(step, index) in importSteps"
                            :key="step.title"
                            class="user-import-step"
                            :class="{
                                'is-active': activeStep === index,
                                'is-complete': activeStep > index,
                                'is-disabled': (index === 1 && !task) || (index === 2 && !canViewApplyResult)
                            }"
                            type="button"
                            :aria-current="activeStep === index ? 'step' : undefined"
                            :aria-disabled="(index === 1 && !task) || (index === 2 && !canViewApplyResult)"
                            @click="handleStepChange(index)">
                            <span class="user-import-step-index">{{ String(index + 1).padStart(2, "0") }}</span>
                            <span class="user-import-step-content">
                                <strong>{{ step.title }}</strong>
                                <small>{{ step.description }}</small>
                            </span>
                        </button>
                    </nav>
                </aside>

                <section class="user-import-section">
                    <div class="user-step-header">
                        <div class="user-step-section-title">
                            <div>
                                <span>{{ activeStepMeta.title }}</span>
                                <small>{{ activeStepMeta.description }}</small>
                            </div>
                            <el-button
                                v-if="activeStep === 0"
                                plain
                                :loading="templateLoading"
                                @click="downloadTemplate">
                                下载 Excel 模板
                            </el-button>
                        </div>
                    </div>

                    <div class="user-import-content">
                        <section v-if="activeStep === 0" class="import-section">
                            <div class="import-file-toolbar">
                                <div class="import-file-actions">
                                    <el-upload
                                        class="upload-control"
                                        accept=".csv,.txt,.xlsx,.xls"
                                        :auto-upload="false"
                                        :show-file-list="false"
                                        :on-change="handleFileChange">
                                        <el-button plain>选择文件</el-button>
                                    </el-upload>
                                    <el-checkbox v-model="skipExisting">用户名存在时跳过</el-checkbox>
                                </div>
                                <span v-if="fileName" class="file-name">当前文件：{{ fileName }}</span>
                            </div>

                            <el-alert v-if="parseError" :title="parseError" type="error" :closable="false" show-icon />

                            <div class="data-toolbar">
                                <div>
                                    <strong>数据预览</strong>
                                    <span>共 {{ rows.length }} 行，可在校验前直接修正。</span>
                                </div>
                                <el-button plain @click="addRow">新增一行</el-button>
                            </div>

                            <el-table v-if="rows.length" :data="rows" border height="420" class="import-table">
                                <el-table-column type="index" label="#" width="56" align="center" />
                                <el-table-column
                                    v-for="header in USER_IMPORT_HEADERS"
                                    :key="header"
                                    :label="headerLabel(header)"
                                    :min-width="header === 'authorization_profile_code' ? 190 : 150">
                                    <template #default="scope">
                                        <el-input
                                            v-model="scope.row[header]"
                                            size="small"
                                            :placeholder="headerLabel(header)" />
                                    </template>
                                </el-table-column>
                                <el-table-column label="操作" width="80" fixed="right">
                                    <template #default="scope">
                                        <el-button link type="danger" @click="removeRow(scope.$index)">删除</el-button>
                                    </template>
                                </el-table-column>
                            </el-table>
                            <el-empty v-else description="暂无数据，请选择文件并解析" />
                        </section>

                        <section v-else-if="activeStep === 1 && task" class="import-section">
                            <div class="section-heading">
                                <div>
                                    <strong>校验摘要</strong>
                                    <span>
                                        后端已完成字段、重复数据、组织、字典和授权方案校验，确认应用前不会写入用户数据。
                                    </span>
                                </div>
                                <el-tag :type="task.error_rows ? 'danger' : 'success'">
                                    {{ task.error_rows ? `${task.error_rows} 行需要修正` : "校验通过" }}
                                </el-tag>
                            </div>

                            <el-alert
                                v-if="task.error_rows"
                                title="存在错误行，当前不能应用。请返回修改数据后重新校验。"
                                type="warning"
                                :closable="false"
                                show-icon />

                            <div class="stats-grid">
                                <el-statistic title="总行数" :value="task.total_rows" />
                                <el-statistic title="可处理" :value="task.valid_rows" />
                                <el-statistic title="跳过" :value="task.skipped_rows" />
                                <el-statistic title="授权实例" :value="task.assignment_count" />
                                <el-statistic title="访问边界" :value="task.access_boundary_count" />
                                <el-statistic title="授权边界" :value="task.grant_boundary_count" />
                            </div>

                            <div class="preview-note">
                                <span>文件：{{ task.file_name }}</span>
                                <span>已存在用户：{{ task.skip_existing ? "跳过" : "报错" }}</span>
                                <span>校验有效期：{{ task.preview_expires_at }}</span>
                            </div>

                            <div v-if="errorRows.length" class="error-section">
                                <div class="subsection-title">
                                    <div class="error-toolbar-title">
                                        <strong>错误明细</strong>
                                        <span>返回上一步后，可按行号修正本地数据。</span>
                                    </div>
                                    <div class="error-toolbar-actions">
                                        <el-select v-model="errorCategory" size="small" placeholder="筛选错误类型">
                                            <el-option label="全部错误" value="ALL" />
                                            <el-option
                                                v-for="option in errorCategoryOptions"
                                                :key="option.value"
                                                :label="option.label"
                                                :value="option.value" />
                                        </el-select>
                                        <el-button size="small" plain @click="downloadErrors">下载错误明细</el-button>
                                    </div>
                                </div>
                                <el-table :data="filteredErrorRows" border stripe>
                                    <el-table-column prop="row_number" label="行号" width="90" align="center" />
                                    <el-table-column prop="row_key" label="行标识" width="180" show-overflow-tooltip />
                                    <el-table-column label="状态" width="100" align="center">
                                        <template #default="scope">
                                            <el-tag type="danger">{{ stateLabel(scope.row.state) }}</el-tag>
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="类型" width="130" align="center">
                                        <template #default="scope">
                                            {{ errorTypeLabel(scope.row) }}
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
                        </section>

                        <section v-else class="import-section result-section">
                            <div class="result-heading">
                                <div class="result-icon" :class="{ success: task?.status === 'SUCCEEDED' }">✓</div>
                                <div>
                                    <strong>{{ resultTitle }}</strong>
                                    <p>{{ resultDescription }}</p>
                                </div>
                            </div>

                            <div v-if="task" class="stats-grid result-stats">
                                <el-statistic title="已完成" :value="task.completed_rows" />
                                <el-statistic title="成功创建" :value="task.applied_rows" />
                                <el-statistic title="跳过" :value="task.skipped_rows" />
                                <el-statistic title="失败" :value="task.error_rows" />
                            </div>

                            <div v-if="task?.status === 'APPLYING'" class="progress-section">
                                <div class="progress-heading">
                                    <strong>正在处理</strong>
                                    <span>{{ task.completed_rows }} / {{ task.total_rows }} 行</span>
                                </div>
                                <el-progress :percentage="progressPercentage" :stroke-width="10" />
                            </div>

                            <div v-if="errorRows.length" class="error-section">
                                <div class="subsection-title">
                                    <div class="error-toolbar-title">
                                        <strong>失败明细</strong>
                                        <span>修正失败行后可以重新发起一次导入。</span>
                                    </div>
                                    <div class="error-toolbar-actions">
                                        <el-select v-model="errorCategory" size="small" placeholder="筛选错误类型">
                                            <el-option label="全部错误" value="ALL" />
                                            <el-option
                                                v-for="option in errorCategoryOptions"
                                                :key="option.value"
                                                :label="option.label"
                                                :value="option.value" />
                                        </el-select>
                                        <el-button size="small" plain @click="downloadErrors">下载错误明细</el-button>
                                    </div>
                                </div>
                                <el-table :data="filteredErrorRows" border stripe>
                                    <el-table-column prop="row_number" label="行号" width="90" align="center" />
                                    <el-table-column prop="row_key" label="行标识" width="180" show-overflow-tooltip />
                                    <el-table-column label="状态" width="100" align="center">
                                        <template #default="scope">
                                            <el-tag type="danger">{{ stateLabel(scope.row.state) }}</el-tag>
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="类型" width="130" align="center">
                                        <template #default="scope">
                                            {{ errorTypeLabel(scope.row) }}
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="错误信息" min-width="420">
                                        <template #default="scope">
                                            {{ errorSummary(scope.row) }}
                                        </template>
                                    </el-table-column>
                                </el-table>
                            </div>
                            <el-empty v-else-if="task?.status !== 'APPLYING'" description="没有失败明细" />
                        </section>
                    </div>
                </section>

                <aside class="user-import-side user-import-side-right">
                    <div class="section-title user-heading">
                        <div>
                            <span>批量导入用户</span>
                            <small>一次完成用户资料、组织归属和授权方案配置</small>
                        </div>
                        <el-text type="info">共 3 个步骤</el-text>
                    </div>
                    <el-alert class="user-tip" title="导入提示" type="info" :closable="false" show-icon>
                        <template #default>
                            <div class="user-tip-content">
                                <p><strong>准备导入数据</strong></p>
                                <p>支持固定 CSV、TXT 和 Excel 模板；Excel 文件默认读取第一个工作表。</p>
                                <p>必填字段：用户名、真实姓名、手机号码、邮箱、部门编码、语言、时区和授权方案编码。</p>
                                <p>下载 Excel 模板后直接填写中文表头，部门编码和授权方案编码可从下拉列表中选择。</p>
                                <p>
                                    授权方案编码必须是启用状态的方案；一个方案可以包含多个角色，导入时会为每个用户一次应用方案中的全部角色。
                                </p>
                                <p>校验步骤只做数据和影响预览，确认应用后才会创建用户并写入授权。</p>
                            </div>
                        </template>
                    </el-alert>
                </aside>
            </div>

            <div class="user-import-actions">
                <el-button @click="handleBack">取消</el-button>
                <template v-if="activeStep === 0">
                    <el-button type="primary" :disabled="!rows.length" @click="handlePreview">
                        下一步：数据校验
                    </el-button>
                </template>
                <template v-else-if="activeStep === 1">
                    <el-button @click="handleBackToEdit">上一步</el-button>
                    <el-button type="primary" :disabled="!previewReady" @click="handleApply">确认应用</el-button>
                </template>
                <template v-else>
                    <el-button @click="handleBack">返回用户列表</el-button>
                    <el-button type="primary" @click="startOver">继续导入</el-button>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.user-import-page {
    height: 100%;
    min-height: 0;
    padding: 20px 32px 24px;
    overflow: hidden;
    background: var(--el-bg-color);
    box-sizing: border-box;
}

.user-import-shell {
    display: flex;
    flex-direction: column;
    width: min(1600px, 100%);
    height: 100%;
    min-height: 0;
    margin: 0 auto;
}

.user-import-workspace {
    display: grid;
    flex: 1 1 auto;
    grid-template-columns: max-content minmax(0, 1fr) minmax(220px, 280px);
    min-height: 0;
    gap: 24px;
}

.user-import-side {
    min-width: 0;
    padding-top: 4px;
}

.user-import-side-left {
    grid-column: 1;
    width: max-content;
    max-width: 240px;
}

.user-import-side-right {
    grid-column: 3;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.user-import-section {
    grid-column: 2;
    grid-row: 1;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    background: var(--el-bg-color);
}

.user-step-header {
    flex: 0 0 auto;
    min-height: 0;
}

.user-import-content {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0 4px 12px;
    overflow-y: auto;
    scrollbar-gutter: stable;
}

.user-import-step-nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 1px solid var(--el-border-color-extra-light);
    border-radius: 12px;
    background: var(--el-fill-color-lighter);
}

.user-import-step {
    display: flex;
    align-items: flex-start;
    width: 100%;
    gap: 12px;
    padding: 12px;
    border: 0;
    border-radius: 8px;
    outline: none;
    background: transparent;
    color: var(--el-text-color-secondary);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
        background-color 0.2s ease,
        color 0.2s ease,
        box-shadow 0.2s ease;
}

.user-import-step:hover {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
}

.user-import-step:focus-visible {
    box-shadow: 0 0 0 2px var(--el-color-primary-light-5);
}

.user-import-step.is-active {
    background: var(--el-bg-color);
    color: var(--el-text-color-primary);
    box-shadow: 0 4px 12px rgb(15 23 42 / 6%);
}

.user-import-step.is-disabled {
    color: var(--el-text-color-placeholder);
}

.user-import-step.is-disabled:hover {
    background: transparent;
    color: var(--el-text-color-placeholder);
}

.user-import-step-index {
    display: inline-flex;
    flex: 0 0 30px;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    line-height: 1;
}

.user-import-step.is-active .user-import-step-index,
.user-import-step.is-complete .user-import-step-index {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
}

.user-import-step-content {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
    padding-top: 1px;
}

.user-import-step-content strong {
    color: inherit;
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
}

.user-import-step-content small {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 18px;
}

.section-title,
.user-import-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.section-title {
    justify-content: space-between;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.section-title > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.section-title span {
    color: var(--el-text-color-primary);
    font-size: 16px;
    font-weight: 600;
}

.section-title small {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    font-weight: 400;
}

.user-step-section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.user-step-section-title > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.user-step-section-title span {
    color: var(--el-text-color-primary);
    font-size: 16px;
    font-weight: 600;
}

.user-step-section-title small {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.user-heading {
    align-items: flex-start;
    flex-direction: column;
    margin: 0;
    padding: 14px 16px;
    border: 1px solid var(--el-border-color-extra-light);
    border-left: 3px solid var(--el-color-primary-light-5);
    border-radius: 0 10px 10px 0;
    background: var(--el-fill-color-light);
}

.user-tip {
    flex: 0 0 auto;
    align-items: flex-start;
    padding: 14px 16px;
    border: 1px solid var(--el-color-info-light-7);
    border-radius: 10px;
    background: var(--el-color-info-light-9);
}

.user-tip :deep(.el-alert__icon) {
    flex: 0 0 auto;
    margin-top: 2px;
}

.user-tip :deep(.el-alert__content) {
    min-width: 0;
    gap: 4px;
}

.user-tip :deep(.el-alert__title) {
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
}

.user-tip-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--el-text-color-regular);
    font-size: 12px;
    line-height: 1.7;
}

.user-tip-content p {
    margin: 0;
}

.user-tip-content strong {
    color: var(--el-text-color-primary);
    font-weight: 600;
}

.import-section {
    padding-bottom: 20px;
}

.section-heading,
.data-toolbar,
.preview-note,
.subsection-title,
.result-heading {
    display: flex;
    align-items: center;
}

.section-heading,
.data-toolbar,
.subsection-title {
    justify-content: space-between;
    gap: 16px;
}

.section-heading {
    margin-bottom: 22px;
}

.section-heading > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 5px;
}

.section-heading strong {
    color: var(--el-text-color-primary);
    font-size: 14px;
    font-weight: 600;
}

.section-heading span,
.subsection-title span,
.data-toolbar span {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.import-file-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 24px;
    padding: 12px 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    background: var(--el-fill-color-blank);
}

.import-file-actions {
    display: flex;
    align-items: center;
    gap: 14px;
}

.upload-control {
    display: inline-flex;
}

.file-name {
    overflow: hidden;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.data-toolbar {
    margin: 26px 0 14px;
}

.data-toolbar > div:first-child {
    display: flex;
    align-items: baseline;
    gap: 12px;
}

.import-table {
    width: 100%;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
    margin: 24px 0;
}

.stats-grid :deep(.el-statistic) {
    padding: 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    background: var(--el-fill-color-blank);
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

.error-toolbar-title,
.error-toolbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.error-toolbar-actions .el-select {
    width: 140px;
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

.result-heading strong {
    color: var(--el-text-color-primary);
    font-size: 18px;
}

.result-heading p {
    margin: 6px 0 0;
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

.progress-section {
    width: min(760px, 100%);
    margin: 0 auto 28px;
}

.progress-heading {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.user-import-actions {
    flex: 0 0 auto;
    width: 100%;
    margin: 0 auto;
    justify-content: flex-end;
    padding: 16px 0 4px;
    border-top: 1px solid var(--el-border-color-lighter);
}

.user-import-actions .el-button {
    min-width: 88px;
}

@media (max-width: 1200px) {
    .user-import-workspace {
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow: hidden;
    }

    .user-import-side {
        flex: 0 0 auto;
        padding-top: 0;
    }

    .user-import-side-left {
        order: 0;
    }

    .user-import-step-nav {
        flex-direction: row;
    }

    .user-import-step {
        flex: 1;
    }

    .user-import-section {
        order: 1;
        min-height: 0;
    }

    .user-import-side-right {
        order: 2;
    }

    .stats-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 900px) {
    .result-stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 768px) {
    .user-import-page {
        padding: 20px 16px 24px;
    }

    .section-title {
        align-items: flex-start;
        flex-direction: column;
    }

    .user-import-step-nav {
        padding: 6px;
    }

    .user-import-step {
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 8px;
    }

    .user-import-step-content small {
        display: none;
    }

    .section-heading,
    .data-toolbar,
    .subsection-title {
        align-items: stretch;
        flex-direction: column;
    }

    .import-file-toolbar {
        align-items: flex-start;
        flex-direction: column;
    }

    .import-file-actions {
        width: 100%;
        align-items: flex-start;
        flex-wrap: wrap;
    }

    .error-toolbar-title,
    .error-toolbar-actions {
        align-items: flex-start;
        flex-wrap: wrap;
    }

    .data-toolbar > div:first-child {
        align-items: flex-start;
        flex-direction: column;
    }

    .stats-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .user-import-actions {
        flex-wrap: wrap;
    }
}
</style>
