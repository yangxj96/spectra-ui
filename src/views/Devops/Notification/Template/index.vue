<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, ref } from "vue";

import { NotificationTemplateApi } from "@/api/notification/notification-template-api.ts";
import useTable from "@/hooks/use-table.ts";

import type { FormInstance, FormRules } from "element-plus";

type EditorMode = "create" | "edit";

interface TemplateEditorForm {
    id?: string;
    template_group_code: string;
    template_name: string;
    channel: NotificationTemplateChannel;
    purpose: string;
    title_template: string;
    content_template: string;
    html_template: string;
    parameter_schema_text: string;
    provider_template_code: string;
    sample_parameters_text: string;
    sample_sensitive_parameters_text: string;
    version?: number;
}

const channelOptions: Array<{ label: string; value: NotificationTemplateChannel }> = [
    { label: "站内信", value: "IN_APP" },
    { label: "短信", value: "SMS" },
    { label: "邮件", value: "EMAIL" }
];

const purposeOptions = [
    { label: "登录验证码", value: "LOGIN_CODE" },
    { label: "绑定手机验证码", value: "BIND_PHONE_CODE" },
    { label: "绑定邮箱验证码", value: "BIND_EMAIL_CODE" },
    { label: "重置密码验证码", value: "RESET_PASSWORD_CODE" },
    { label: "安全告警", value: "SECURITY_ALERT" },
    { label: "系统通知", value: "SYSTEM_NOTICE" },
    { label: "流程待办", value: "WORKFLOW_TODO" },
    { label: "流程结果", value: "WORKFLOW_RESULT" },
    { label: "OA 通知", value: "OA_NOTICE" },
    { label: "OA 提醒", value: "OA_REMINDER" },
    { label: "内部消息", value: "INNER_MESSAGE" }
];

const stateOptions: Array<{ label: string; value: NotificationTemplateState }> = [
    { label: "草稿", value: "DRAFT" },
    { label: "已发布", value: "PUBLISHED" },
    { label: "已停用", value: "DISABLED" },
    { label: "已归档", value: "ARCHIVED" }
];

const condition = ref<NotificationTemplatePageParams>({
    page_num: 1,
    page_size: 15
});

const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable(
    NotificationTemplateApi.page,
    condition.value
);

const editorFormRef = ref<FormInstance>();
const editorVisible = ref(false);
const editorLoading = ref(false);
const editorSubmitting = ref(false);
const editorMode = ref<EditorMode>("create");
const editor = ref<TemplateEditorForm>(createEditorForm());

const versionVisible = ref(false);
const versionLoading = ref(false);
const versionData = ref<NotificationTemplateVO[]>([]);
const versionTemplateName = ref("");
const compareVisible = ref(false);
const compareFromId = ref("");
const compareToId = ref("");

const compareFrom = computed(() => versionData.value.find(item => item.id === compareFromId.value));
const compareTo = computed(() => versionData.value.find(item => item.id === compareToId.value));

const previewVisible = ref(false);
const previewLoading = ref(false);
const previewResult = ref<NotificationTemplatePreviewVO>();

const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*([A-Za-z0-9_.-]+)\s*}}/g;
const INVALID_VARIABLE_PATTERN = /\{\{|}}/s;
const VERIFICATION_CODE_PURPOSES = new Set(["LOGIN_CODE", "BIND_PHONE_CODE", "BIND_EMAIL_CODE", "RESET_PASSWORD_CODE"]);

const editorChannelOptions = computed(() => {
    if (editor.value.purpose === "BIND_PHONE_CODE") {
        return channelOptions.filter(item => item.value === "SMS");
    }
    if (editor.value.purpose === "BIND_EMAIL_CODE") {
        return channelOptions.filter(item => item.value === "EMAIL");
    }
    if (VERIFICATION_CODE_PURPOSES.has(editor.value.purpose)) {
        return channelOptions.filter(item => item.value === "SMS" || item.value === "EMAIL");
    }
    return channelOptions;
});

const editorRules: FormRules = {
    template_group_code: [{ required: true, message: "请输入模板组编码", trigger: "blur" }],
    template_name: [{ required: true, message: "请输入模板名称", trigger: "blur" }],
    channel: [{ required: true, message: "请选择通知渠道", trigger: "change" }],
    purpose: [{ required: true, message: "请选择通知用途", trigger: "change" }],
    content_template: [{ required: true, message: "请输入纯文本正文模板", trigger: "blur" }],
    parameter_schema_text: [{ required: true, message: "请输入参数 Schema", trigger: "blur" }]
};

function createEditorForm(): TemplateEditorForm {
    return {
        template_group_code: "",
        template_name: "",
        channel: "IN_APP",
        purpose: "SYSTEM_NOTICE",
        title_template: "",
        content_template: "",
        html_template: "",
        parameter_schema_text: JSON.stringify({ properties: {} }, null, 2),
        provider_template_code: "",
        sample_parameters_text: "{}",
        sample_sensitive_parameters_text: "{}"
    };
}

function formatJson(value: Record<string, unknown> | null | undefined): string {
    return JSON.stringify(value ?? { properties: {} }, null, 2);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonObject(value: string, label: string): Record<string, unknown> | undefined {
    try {
        const parsed: unknown = JSON.parse(value);
        if (!isObjectRecord(parsed)) {
            ElMessage.error(`${label}必须是 JSON 对象`);
            return undefined;
        }
        return parsed;
    } catch {
        ElMessage.error(`${label}不是合法的 JSON`);
        return undefined;
    }
}

function sensitiveParameterNames(parameterSchema: Record<string, unknown> | null | undefined): string[] {
    const properties = parameterSchema?.properties;
    if (!isObjectRecord(properties)) {
        return [];
    }
    return Object.entries(properties)
        .filter(([, definition]) => isObjectRecord(definition) && definition.sensitive === true)
        .map(([name]) => name);
}

function collectTemplateVariables(...templates: Array<string | null | undefined>): Set<string> {
    const variables = new Set<string>();
    for (const template of templates) {
        if (!template) continue;
        for (const match of template.matchAll(TEMPLATE_VARIABLE_PATTERN)) {
            variables.add(match[1]);
        }
    }
    return variables;
}

function validateTemplatePurposeChannel(purpose: string, channel: NotificationTemplateChannel): boolean {
    if (purpose === "BIND_PHONE_CODE" && channel !== "SMS") {
        ElMessage.error("绑定手机号验证码模板只能使用短信渠道");
        return false;
    }
    if (purpose === "BIND_EMAIL_CODE" && channel !== "EMAIL") {
        ElMessage.error("绑定邮箱验证码模板只能使用邮件渠道");
        return false;
    }
    if (VERIFICATION_CODE_PURPOSES.has(purpose) && channel === "IN_APP") {
        ElMessage.error("验证码模板只能使用短信或邮件渠道");
        return false;
    }
    return true;
}

function handleEditorPurposeChange(): void {
    if (!editorChannelOptions.value.some(item => item.value === editor.value.channel)) {
        editor.value.channel = editor.value.purpose === "BIND_EMAIL_CODE" ? "EMAIL" : "SMS";
        ElMessage.info(`模板渠道已切换为${channelLabel(editor.value.channel)}`);
    }
}

function validateTemplateDefinition(
    schema: Record<string, unknown>,
    title: string | null | undefined,
    content: string | null | undefined,
    html: string | null | undefined
): string[] | undefined {
    const properties = schema.properties;
    if (!isObjectRecord(properties)) {
        ElMessage.error("参数 Schema 必须包含 properties 对象");
        return undefined;
    }
    const invalidDefinitions = Object.entries(properties).filter(([, definition]) => !isObjectRecord(definition));
    if (invalidDefinitions.length) {
        ElMessage.error(`参数定义必须是 JSON 对象：${invalidDefinitions.map(([name]) => name).join(", ")}`);
        return undefined;
    }
    const invalidSensitiveDefinitions = Object.entries(properties).filter(
        ([, definition]) =>
            isObjectRecord(definition) &&
            definition.sensitive !== undefined &&
            typeof definition.sensitive !== "boolean"
    );
    if (invalidSensitiveDefinitions.length) {
        ElMessage.error(`参数敏感标识必须是布尔值：${invalidSensitiveDefinitions.map(([name]) => name).join(", ")}`);
        return undefined;
    }
    const declared = new Set(Object.keys(properties));
    const referenced = collectTemplateVariables(title, content, html);
    const missing = [...referenced].filter(item => !declared.has(item));
    const unused = [...declared].filter(item => !referenced.has(item));
    if (missing.length || unused.length) {
        const details = [
            missing.length ? `模板未声明：${missing.join(", ")}` : "",
            unused.length ? `Schema 多余：${unused.join(", ")}` : ""
        ]
            .filter(Boolean)
            .join("；");
        ElMessage.error(`变量声明与模板占位符不一致：${details}`);
        return undefined;
    }
    const unsafeHtml = (html ?? "").toLowerCase();
    const hasIllegalPlaceholder = [title, content, html].some(template => {
        if (!template) return false;
        const remainder = template.replace(TEMPLATE_VARIABLE_PATTERN, "");
        return INVALID_VARIABLE_PATTERN.test(remainder);
    });
    if (hasIllegalPlaceholder) {
        ElMessage.error("模板包含非法占位符，只允许 {{变量名}} 格式");
        return undefined;
    }
    if (
        unsafeHtml.includes("<script") ||
        /\bon[a-z]+\s*=/.test(unsafeHtml) ||
        /\b(?:javascript|vbscript|data|file):/.test(unsafeHtml)
    ) {
        ElMessage.error("HTML 模板包含 script、事件属性或危险 URL 链接");
        return undefined;
    }
    return [...referenced];
}

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

function stateLabel(state: NotificationTemplateState): string {
    return stateOptions.find(item => item.value === state)?.label ?? state;
}

function stateTagType(state: NotificationTemplateState): "success" | "warning" | "danger" | "info" {
    if (state === "PUBLISHED") {
        return "success";
    }
    if (state === "DRAFT") {
        return "warning";
    }
    if (state === "DISABLED") {
        return "danger";
    }
    return "info";
}

function channelLabel(channel: NotificationTemplateChannel): string {
    return channelOptions.find(item => item.value === channel)?.label ?? channel;
}

function purposeLabel(purpose: string): string {
    return purposeOptions.find(item => item.value === purpose)?.label ?? purpose;
}

function digestLabel(digest: string | null | undefined): string {
    if (!digest) {
        return "-";
    }
    return `${digest.slice(0, 12)}…`;
}

function resetCondition(): void {
    Object.assign(condition.value, {
        template_group_code: undefined,
        channel: undefined,
        purpose: undefined,
        state: undefined,
        page_num: 1
    });
    void handlerConditionQuery();
}

function openCreate(): void {
    editorMode.value = "create";
    editor.value = createEditorForm();
    editorVisible.value = true;
    previewResult.value = undefined;
}

async function openEdit(row: NotificationTemplateVO): Promise<void> {
    editorVisible.value = true;
    editorLoading.value = true;
    editorMode.value = "edit";
    previewResult.value = undefined;
    try {
        const detail = await NotificationTemplateApi.detail(row.id);
        editor.value = {
            id: detail.id,
            template_group_code: detail.template_group_code,
            template_name: detail.template_name,
            channel: detail.channel,
            purpose: detail.purpose,
            title_template: detail.title_template ?? "",
            content_template: detail.content_template,
            html_template: detail.html_template ?? "",
            parameter_schema_text: formatJson(detail.parameter_schema),
            provider_template_code: detail.provider_template_code ?? "",
            sample_parameters_text: "{}",
            sample_sensitive_parameters_text: "{}",
            version: detail.version
        };
    } catch (error: unknown) {
        editorVisible.value = false;
        ElMessage.error(errorMessage(error, "加载模板详情失败"));
    } finally {
        editorLoading.value = false;
    }
}

async function saveEditor(): Promise<void> {
    const valid = await editorFormRef.value?.validate().catch(() => false);
    if (!valid) {
        return;
    }

    const parameterSchema = parseJsonObject(editor.value.parameter_schema_text, "参数 Schema");
    if (!parameterSchema) {
        return;
    }
    if (!validateTemplatePurposeChannel(editor.value.purpose, editor.value.channel)) {
        return;
    }
    if (
        !validateTemplateDefinition(
            parameterSchema,
            editor.value.title_template,
            editor.value.content_template,
            editor.value.html_template
        )
    ) {
        return;
    }

    const payload: NotificationTemplateSaveParams = {
        template_group_code: editor.value.template_group_code.trim(),
        template_name: editor.value.template_name.trim(),
        channel: editor.value.channel,
        purpose: editor.value.purpose,
        title_template: editor.value.title_template,
        content_template: editor.value.content_template,
        html_template: editor.value.html_template,
        parameter_schema: parameterSchema,
        provider_template_code: editor.value.provider_template_code.trim()
    };
    if (editor.value.id) {
        payload.id = editor.value.id;
        payload.version = editor.value.version;
    }

    editorSubmitting.value = true;
    try {
        if (editorMode.value === "create") {
            await NotificationTemplateApi.create(payload);
            ElMessage.success("模板草稿已创建");
        } else if (editor.value.id) {
            await NotificationTemplateApi.update(editor.value.id, payload);
            ElMessage.success("模板草稿已保存");
        }
        editorVisible.value = false;
        await handlerConditionQuery();
    } catch (error: unknown) {
        ElMessage.error(errorMessage(error, "保存模板失败，可能是版本已变化"));
    } finally {
        editorSubmitting.value = false;
    }
}

async function previewEditor(): Promise<void> {
    const parameterSchema = parseJsonObject(editor.value.parameter_schema_text, "参数 Schema");
    if (!parameterSchema) {
        return;
    }
    if (!validateTemplatePurposeChannel(editor.value.purpose, editor.value.channel)) {
        return;
    }
    const variables = validateTemplateDefinition(
        parameterSchema,
        editor.value.title_template,
        editor.value.content_template,
        editor.value.html_template
    );
    if (!variables) {
        return;
    }
    const parameters = parseJsonObject(editor.value.sample_parameters_text, "示例参数");
    if (!parameters) {
        return;
    }
    const sensitiveParameters = parseJsonObject(editor.value.sample_sensitive_parameters_text, "敏感示例参数");
    if (!sensitiveParameters) {
        return;
    }
    const sensitiveVariables = sensitiveParameterNames(parameterSchema);
    if (sensitiveVariables.some(variable => variable in parameters)) {
        ElMessage.error("敏感模板参数不能放在普通示例参数中");
        return;
    }
    if (variables.some(variable => !(variable in parameters) && !(variable in sensitiveParameters))) {
        ElMessage.error("示例参数未覆盖全部模板变量");
        return;
    }
    if (sensitiveVariables.some(variable => !(variable in sensitiveParameters))) {
        ElMessage.error("敏感示例参数未覆盖全部敏感模板变量");
        return;
    }
    if (Object.keys(sensitiveParameters).some(variable => !sensitiveVariables.includes(variable))) {
        ElMessage.error("敏感示例参数中包含未声明为敏感的字段");
        return;
    }

    previewLoading.value = true;
    try {
        previewResult.value = await NotificationTemplateApi.preview({
            channel: editor.value.channel,
            purpose: editor.value.purpose,
            title_template: editor.value.title_template,
            content_template: editor.value.content_template,
            html_template: editor.value.html_template,
            parameter_schema: parameterSchema,
            parameters,
            sensitive_parameters: sensitiveParameters
        });
        previewVisible.value = true;
    } catch (error: unknown) {
        ElMessage.error(errorMessage(error, "模板预览失败，请检查变量和 HTML 安全规则"));
    } finally {
        previewLoading.value = false;
    }
}

async function confirmAction(
    row: NotificationTemplateVO,
    message: string,
    action: (id: string, version: number) => Promise<void>,
    successMessage: string
): Promise<void> {
    try {
        await ElMessageBox.confirm(message, "确认操作", {
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            type: "warning"
        });
        await action(row.id, row.version);
        ElMessage.success(successMessage);
        await handlerConditionQuery();
    } catch (error: unknown) {
        if (error !== "cancel") {
            ElMessage.error(errorMessage(error, "操作失败，可能是版本已变化"));
        }
    }
}

async function publish(row: NotificationTemplateVO): Promise<void> {
    if (!validateTemplatePurposeChannel(row.purpose, row.channel)) {
        return;
    }
    const variables = validateTemplateDefinition(
        row.parameter_schema,
        row.title_template,
        row.content_template,
        row.html_template
    );
    if (!variables) {
        return;
    }
    return confirmAction(
        row,
        `确定发布模板「${row.template_group_code}」吗？发布后将成为${channelLabel(row.channel)}当前生效版本；版本 ${row.version_no}，${variables.length} 个模板变量。`,
        NotificationTemplateApi.publish,
        "模板已发布"
    );
}

function disable(row: NotificationTemplateVO): Promise<void> {
    return confirmAction(
        row,
        `确定停用模板「${row.template_group_code}」吗？停用后将不再用于发送。`,
        NotificationTemplateApi.disable,
        "模板已停用"
    );
}

function archive(row: NotificationTemplateVO): Promise<void> {
    return confirmAction(
        row,
        `确定归档模板「${row.template_group_code}」吗？归档后只能查看历史。`,
        NotificationTemplateApi.archive,
        "模板已归档"
    );
}

async function copyTemplate(row: NotificationTemplateVO): Promise<void> {
    try {
        await ElMessageBox.confirm(
            `确定复制模板「${row.template_group_code}」为新的草稿吗？原版本不会被修改。`,
            "复制模板草稿",
            { confirmButtonText: "复制", cancelButtonText: "取消", type: "info" }
        );
        await NotificationTemplateApi.copy(row.id);
        ElMessage.success("模板草稿已复制");
        await handlerConditionQuery();
    } catch (error: unknown) {
        if (error !== "cancel") {
            ElMessage.error(errorMessage(error, "复制模板失败"));
        }
    }
}

async function openVersions(row: NotificationTemplateVO): Promise<void> {
    versionVisible.value = true;
    versionLoading.value = true;
    versionTemplateName.value = `${row.template_name}（${row.template_group_code}） / ${channelLabel(row.channel)}`;
    try {
        versionData.value = await NotificationTemplateApi.versions(row.id);
        compareFromId.value = versionData.value[1]?.id ?? "";
        compareToId.value = versionData.value[0]?.id ?? "";
    } catch (error: unknown) {
        versionVisible.value = false;
        ElMessage.error(errorMessage(error, "加载版本历史失败"));
    } finally {
        versionLoading.value = false;
    }
}

function openCompare(): void {
    if (!compareFrom.value || !compareTo.value || compareFrom.value.id === compareTo.value.id) {
        ElMessage.warning("请选择两个不同的模板版本进行对比");
        return;
    }
    compareVisible.value = true;
}

async function rollback(row: NotificationTemplateVO): Promise<void> {
    try {
        await ElMessageBox.confirm(
            `确定从版本 ${row.version_no} 创建新的回滚草稿吗？历史版本不会被修改。`,
            "创建回滚草稿",
            { confirmButtonText: "创建草稿", cancelButtonText: "取消", type: "warning" }
        );
        await NotificationTemplateApi.rollback(row.id);
        ElMessage.success("回滚草稿已创建");
        await handlerConditionQuery();
        versionVisible.value = false;
    } catch (error: unknown) {
        if (error !== "cancel") {
            ElMessage.error(errorMessage(error, "创建回滚草稿失败"));
        }
    }
}
</script>

<template>
    <div class="notification-template-page">
        <el-card shadow="never" class="search-card">
            <el-form :inline="true" :model="condition">
                <el-form-item label="模板组编码">
                    <el-input v-model="condition.template_group_code" clearable placeholder="请输入模板组编码" />
                </el-form-item>
                <el-form-item label="渠道">
                    <el-select v-model="condition.channel" clearable placeholder="请选择渠道" style="width: 130px">
                        <el-option
                            v-for="item in channelOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value" />
                    </el-select>
                </el-form-item>
                <el-form-item label="用途">
                    <el-select
                        v-model="condition.purpose"
                        clearable
                        filterable
                        placeholder="请选择用途"
                        style="width: 170px">
                        <el-option
                            v-for="item in purposeOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value" />
                    </el-select>
                </el-form-item>
                <el-form-item label="状态">
                    <el-select v-model="condition.state" clearable placeholder="请选择状态" style="width: 130px">
                        <el-option
                            v-for="item in stateOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                    <el-button @click="resetCondition">重置</el-button>
                    <el-button v-permission="'notification:template:write'" type="success" @click="openCreate">
                        新增模板
                    </el-button>
                </el-form-item>
            </el-form>
        </el-card>

        <el-card shadow="never" class="table-card">
            <el-table :data="table_data" class="notification-data-table" stripe>
                <el-table-column align="center" type="index" label="序号" width="70" />
                <el-table-column
                    align="center"
                    prop="template_group_code"
                    label="模板组编码"
                    min-width="150"
                    show-overflow-tooltip />
                <el-table-column prop="template_name" label="模板名称" min-width="160" show-overflow-tooltip />
                <el-table-column align="center" label="渠道" width="100">
                    <template #default="scope">
                        {{ channelLabel(scope.row.channel) }}
                    </template>
                </el-table-column>
                <el-table-column align="center" label="用途" min-width="130" show-overflow-tooltip>
                    <template #default="scope">
                        {{ purposeLabel(scope.row.purpose) }}
                    </template>
                </el-table-column>
                <el-table-column prop="content_template" label="模板正文" min-width="240" show-overflow-tooltip />
                <el-table-column label="敏感参数" min-width="150">
                    <template #default="scope">
                        <template v-if="sensitiveParameterNames(scope.row.parameter_schema).length">
                            <el-tag
                                v-for="name in sensitiveParameterNames(scope.row.parameter_schema)"
                                :key="name"
                                type="warning"
                                size="small">
                                {{ name }}
                            </el-tag>
                        </template>
                        <span v-else>无</span>
                    </template>
                </el-table-column>
                <el-table-column align="center" label="版本" prop="version_no" width="75" />
                <el-table-column align="center" label="版本摘要" width="135" show-overflow-tooltip>
                    <template #default="scope">
                        {{ digestLabel(scope.row.version_digest) }}
                    </template>
                </el-table-column>
                <el-table-column align="center" label="状态" width="90">
                    <template #default="scope">
                        <el-tag :type="stateTagType(scope.row.state)" size="small">
                            {{ stateLabel(scope.row.state) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column align="center" label="更新时间" prop="updated_at" width="170" show-overflow-tooltip />
                <el-table-column align="center" label="操作" width="410" fixed="right">
                    <template #default="scope">
                        <el-button
                            v-permission="'notification:template:read'"
                            link
                            type="info"
                            size="small"
                            @click="openVersions(scope.row)">
                            版本历史
                        </el-button>
                        <el-button
                            v-permission="'notification:template:write'"
                            link
                            type="info"
                            size="small"
                            @click="copyTemplate(scope.row)">
                            复制草稿
                        </el-button>
                        <el-button
                            v-if="scope.row.state === 'DRAFT'"
                            v-permission="'notification:template:write'"
                            link
                            type="primary"
                            size="small"
                            @click="openEdit(scope.row)">
                            编辑
                        </el-button>
                        <el-button
                            v-if="scope.row.state === 'DRAFT'"
                            v-permission="'notification:template:publish'"
                            link
                            type="success"
                            size="small"
                            @click="publish(scope.row)">
                            发布
                        </el-button>
                        <el-button
                            v-if="scope.row.state === 'PUBLISHED'"
                            v-permission="'notification:template:write'"
                            link
                            type="warning"
                            size="small"
                            @click="disable(scope.row)">
                            停用
                        </el-button>
                        <el-button
                            v-if="scope.row.state === 'DRAFT' || scope.row.state === 'DISABLED'"
                            v-permission="'notification:template:write'"
                            link
                            type="danger"
                            size="small"
                            @click="archive(scope.row)">
                            归档
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-pagination
                layout="total, sizes, prev, pager, next"
                :current-page="pagination.page"
                :page-size="pagination.size"
                :page-sizes="pagination.page_sizes"
                :total="pagination.total"
                background
                size="small"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange" />
        </el-card>

        <el-dialog
            v-model="editorVisible"
            :title="editorMode === 'create' ? '新增通知模板' : '编辑通知模板草稿'"
            width="900px"
            destroy-on-close>
            <div v-loading="editorLoading">
                <el-form ref="editorFormRef" :model="editor" :rules="editorRules" label-width="125px" status-icon>
                    <el-row :gutter="18">
                        <el-col :span="12">
                            <el-form-item label="模板组编码" prop="template_group_code">
                                <el-input
                                    v-model="editor.template_group_code"
                                    :disabled="editorMode === 'edit'"
                                    placeholder="例如 workflow.todo" />
                            </el-form-item>
                        </el-col>
                        <el-col :span="12">
                            <el-form-item label="渠道" prop="channel">
                                <el-select
                                    v-model="editor.channel"
                                    :disabled="editorMode === 'edit'"
                                    style="width: 100%">
                                    <el-option
                                        v-for="item in editorChannelOptions"
                                        :key="item.value"
                                        :label="item.label"
                                        :value="item.value" />
                                </el-select>
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-form-item label="模板名称" prop="template_name">
                        <el-input v-model="editor.template_name" placeholder="例如 登录验证码" />
                    </el-form-item>
                    <el-form-item label="通知用途" prop="purpose">
                        <el-select
                            v-model="editor.purpose"
                            filterable
                            style="width: 100%"
                            @change="handleEditorPurposeChange">
                            <el-option
                                v-for="item in purposeOptions"
                                :key="item.value"
                                :label="item.label"
                                :value="item.value" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="标题模板">
                        <el-input v-model="editor.title_template" placeholder="支持 {{变量名}} 占位符" />
                    </el-form-item>
                    <el-form-item label="正文模板" prop="content_template">
                        <el-input
                            v-model="editor.content_template"
                            type="textarea"
                            :rows="4"
                            placeholder="纯文本正文，支持 {{变量名}} 占位符" />
                    </el-form-item>
                    <el-form-item label="HTML 模板">
                        <el-input
                            v-model="editor.html_template"
                            type="textarea"
                            :rows="4"
                            placeholder="可选；禁止 script、事件属性和 javascript: 链接" />
                    </el-form-item>
                    <el-form-item label="参数 Schema" prop="parameter_schema_text">
                        <el-input
                            v-model="editor.parameter_schema_text"
                            type="textarea"
                            :rows="6"
                            placeholder='JSON Schema，例如 { "properties": { "code": { "type": "string", "sensitive": true } } }' />
                    </el-form-item>
                    <el-form-item label="供应商模板编码">
                        <el-input v-model="editor.provider_template_code" placeholder="短信/邮件供应商模板编码，可选" />
                    </el-form-item>
                    <el-form-item label="预览示例参数">
                        <el-input
                            v-model="editor.sample_parameters_text"
                            type="textarea"
                            :rows="4"
                            placeholder='JSON 对象，例如 { "name": "张三" }' />
                    </el-form-item>
                    <el-form-item label="敏感示例参数">
                        <el-input
                            v-model="editor.sample_sensitive_parameters_text"
                            type="textarea"
                            :rows="4"
                            placeholder='JSON 对象，例如 { "code": "123456" }；只填写 Schema 中 sensitive 为 true 的参数' />
                    </el-form-item>
                </el-form>
                <el-alert
                    title="发布前会重新校验变量声明、敏感参数分区、HTML 安全规则和当前乐观锁版本；预览示例参数不会写入数据库。"
                    type="info"
                    :closable="false"
                    show-icon />
            </div>
            <template #footer>
                <el-button @click="editorVisible = false">取消</el-button>
                <el-button :loading="previewLoading" @click="previewEditor">预览</el-button>
                <el-button
                    v-permission="'notification:template:write'"
                    type="primary"
                    :loading="editorSubmitting"
                    @click="saveEditor">
                    保存草稿
                </el-button>
            </template>
        </el-dialog>

        <el-dialog v-model="previewVisible" title="模板预览" width="760px" destroy-on-close>
            <template v-if="previewResult">
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="模板组">
                        {{ previewResult.template_group_code || "未保存草稿" }}
                    </el-descriptions-item>
                    <el-descriptions-item label="渠道">
                        {{
                            previewResult.channel
                                ? channelLabel(previewResult.channel as NotificationTemplateChannel)
                                : "-"
                        }}
                    </el-descriptions-item>
                    <el-descriptions-item label="用途">
                        {{ purposeLabel(previewResult.purpose ?? "") }}
                    </el-descriptions-item>
                    <el-descriptions-item label="预览时间">{{ previewResult.previewed_at }}</el-descriptions-item>
                </el-descriptions>
                <h4>标题</h4>
                <div class="preview-text">{{ previewResult.title || "（无标题）" }}</div>
                <h4>纯文本正文</h4>
                <pre class="preview-source">{{ previewResult.content }}</pre>
                <template v-if="previewResult.html">
                    <h4>HTML 渲染源</h4>
                    <pre class="preview-source">{{ previewResult.html }}</pre>
                </template>
            </template>
            <el-empty v-else description="暂无预览结果" />
        </el-dialog>

        <el-dialog v-model="versionVisible" :title="`版本历史 - ${versionTemplateName}`" width="900px" destroy-on-close>
            <div v-loading="versionLoading" class="version-container">
                <el-alert
                    title="版本摘要用于确认当前版本内容；对比只在浏览器展示模板快照，不会修改任何版本。"
                    type="info"
                    :closable="false"
                    show-icon />
                <div class="compare-toolbar">
                    <el-select v-model="compareFromId" placeholder="选择基准版本" style="width: 220px">
                        <el-option
                            v-for="item in versionData"
                            :key="`from-${item.id}`"
                            :label="`版本 ${item.version_no} · ${stateLabel(item.state)}`"
                            :value="item.id" />
                    </el-select>
                    <span>对比</span>
                    <el-select v-model="compareToId" placeholder="选择目标版本" style="width: 220px">
                        <el-option
                            v-for="item in versionData"
                            :key="`to-${item.id}`"
                            :label="`版本 ${item.version_no} · ${stateLabel(item.state)}`"
                            :value="item.id" />
                    </el-select>
                    <el-button type="primary" :disabled="!compareFrom || !compareTo" @click="openCompare">
                        对比版本
                    </el-button>
                </div>
                <el-table :data="versionData" stripe>
                    <el-table-column align="center" label="版本号" prop="version_no" width="80" />
                    <el-table-column align="center" label="状态" width="90">
                        <template #default="scope">
                            <el-tag :type="stateTagType(scope.row.state)" size="small">
                                {{ stateLabel(scope.row.state) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column align="center" label="用途" min-width="120">
                        <template #default="scope">
                            {{ purposeLabel(scope.row.purpose) }}
                        </template>
                    </el-table-column>
                    <el-table-column align="center" label="版本摘要" width="145" show-overflow-tooltip>
                        <template #default="scope">
                            {{ digestLabel(scope.row.version_digest) }}
                        </template>
                    </el-table-column>
                    <el-table-column align="center" label="更新时间" prop="updated_at" width="170" />
                    <el-table-column align="center" label="操作" width="150">
                        <template #default="scope">
                            <el-button
                                v-if="scope.row.state !== 'DRAFT'"
                                v-permission="'notification:template:publish'"
                                link
                                type="primary"
                                size="small"
                                @click="rollback(scope.row)">
                                回滚为草稿
                            </el-button>
                        </template>
                    </el-table-column>
                </el-table>
                <el-empty v-if="!versionLoading && versionData.length === 0" description="暂无版本记录" />
            </div>
        </el-dialog>

        <el-dialog v-model="compareVisible" title="模板版本对比" width="1100px" destroy-on-close>
            <el-empty v-if="!compareFrom || !compareTo" description="请选择两个版本" />
            <el-row v-else :gutter="18">
                <el-col :span="12">
                    <el-card shadow="never">
                        <template #header>
                            版本 {{ compareFrom.version_no }} · {{ stateLabel(compareFrom.state) }}
                        </template>
                        <el-descriptions :column="1" border>
                            <el-descriptions-item label="版本摘要">
                                {{ compareFrom.version_digest }}
                            </el-descriptions-item>
                            <el-descriptions-item label="用途">
                                {{ purposeLabel(compareFrom.purpose) }}
                            </el-descriptions-item>
                            <el-descriptions-item label="更新时间">{{ compareFrom.updated_at }}</el-descriptions-item>
                        </el-descriptions>
                        <h4>标题模板</h4>
                        <pre class="preview-source">{{ compareFrom.title_template || "（无标题）" }}</pre>
                        <h4>正文模板</h4>
                        <pre class="preview-source">{{ compareFrom.content_template }}</pre>
                    </el-card>
                </el-col>
                <el-col :span="12">
                    <el-card shadow="never">
                        <template #header>版本 {{ compareTo.version_no }} · {{ stateLabel(compareTo.state) }}</template>
                        <el-descriptions :column="1" border>
                            <el-descriptions-item label="版本摘要">
                                {{ compareTo.version_digest }}
                            </el-descriptions-item>
                            <el-descriptions-item label="用途">
                                {{ purposeLabel(compareTo.purpose) }}
                            </el-descriptions-item>
                            <el-descriptions-item label="更新时间">{{ compareTo.updated_at }}</el-descriptions-item>
                        </el-descriptions>
                        <h4>标题模板</h4>
                        <pre class="preview-source">{{ compareTo.title_template || "（无标题）" }}</pre>
                        <h4>正文模板</h4>
                        <pre class="preview-source">{{ compareTo.content_template }}</pre>
                    </el-card>
                </el-col>
            </el-row>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.notification-template-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    min-height: 0;
    padding: 14px;
    overflow-x: hidden;
    overflow-y: auto;
    box-sizing: border-box;
    background: var(--el-bg-color-page);
}

.search-card {
    flex: 0 0 auto;
}

.search-card :deep(.el-form-item) {
    margin-bottom: 12px;
}

.table-card {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 320px;
}

.table-card :deep(.el-card__body) {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
}

.notification-data-table {
    flex: 1 1 auto;
    min-height: 0;
}

.table-card :deep(.el-pagination) {
    justify-content: flex-end;
    margin-top: 12px;
}

.version-container {
    min-height: 240px;

    .compare-toolbar {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 14px 0;
    }
}

.preview-text {
    padding: 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    white-space: pre-wrap;
    word-break: break-word;
}

.preview-source {
    max-height: 240px;
    margin: 0;
    padding: 12px;
    overflow: auto;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    white-space: pre-wrap;
    word-break: break-word;
}

h4 {
    margin: 18px 0 8px;
}
</style>
