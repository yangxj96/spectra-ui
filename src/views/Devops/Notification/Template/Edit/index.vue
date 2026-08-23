<script setup lang="ts">
import { ElMessage } from "element-plus";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { NotificationTemplateApi } from "@/api/notification/notification-template-api.ts";

import type { FormInstance, FormRules } from "element-plus";

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
    state?: NotificationTemplateState;
}

const route = useRoute();
const router = useRouter();
const editingId = computed(() => String(route.query.id ?? ""));

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

const verificationPurposes = new Set(["LOGIN_CODE", "BIND_PHONE_CODE", "BIND_EMAIL_CODE", "RESET_PASSWORD_CODE"]);
const templateVariablePattern = /\{\{\s*([A-Za-z0-9_.-]+)\s*}}/g;
const invalidVariablePattern = /\{\{|}}/s;
const directVariableTemplatePattern = /^\s*\{\{\s*[A-Za-z0-9_.-]+\s*}}\s*$/;

const editorFormRef = ref<FormInstance>();
const editor = ref<TemplateEditorForm>(createEditorForm());
const loading = ref(false);
const submitting = ref(false);
const previewLoading = ref(false);
const previewVisible = ref(false);
const previewResult = ref<NotificationTemplatePreviewVO>();

const editorRules: FormRules = {
    template_group_code: [{ required: true, message: "请输入模板组编码", trigger: "blur" }],
    template_name: [{ required: true, message: "请输入模板名称", trigger: "blur" }],
    channel: [{ required: true, message: "请选择通知渠道", trigger: "change" }],
    purpose: [{ required: true, message: "请选择通知用途", trigger: "change" }],
    content_template: [{ required: true, message: "请输入有明确语义的正文模板", trigger: "blur" }],
    parameter_schema_text: [{ required: true, message: "请输入参数 Schema", trigger: "blur" }]
};

const editorChannelOptions = computed(() => {
    if (editor.value.purpose === "BIND_PHONE_CODE") return channelOptions.filter(item => item.value === "SMS");
    if (editor.value.purpose === "BIND_EMAIL_CODE") return channelOptions.filter(item => item.value === "EMAIL");
    if (verificationPurposes.has(editor.value.purpose)) {
        return channelOptions.filter(item => item.value === "SMS" || item.value === "EMAIL");
    }
    return channelOptions;
});

const showTitleTemplate = computed(() => editor.value.channel !== "SMS");
const showHtmlTemplate = computed(() => editor.value.channel === "EMAIL");
const showProviderTemplateCode = computed(() => editor.value.channel !== "IN_APP");
const titleTemplateLabel = computed(() => (editor.value.channel === "EMAIL" ? "邮件主题模板" : "标题模板"));
const channelFieldHint = computed(() => {
    if (editor.value.channel === "SMS") {
        return "短信渠道使用纯文本正文和供应商模板编码，不需要标题或 HTML 模板。";
    }
    if (editor.value.channel === "EMAIL") {
        return "邮件渠道支持邮件主题、纯文本正文、HTML 正文和供应商模板编码。";
    }
    return "站内信使用标题和纯文本正文，不配置 HTML 模板或供应商模板编码。";
});

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

function sensitiveParameterNames(parameterSchema: Record<string, unknown>): string[] {
    const properties = parameterSchema.properties;
    if (!isObjectRecord(properties)) return [];
    return Object.entries(properties)
        .filter(([, definition]) => isObjectRecord(definition) && definition.sensitive === true)
        .map(([name]) => name);
}

function collectTemplateVariables(...templates: Array<string | null | undefined>): Set<string> {
    const variables = new Set<string>();
    for (const template of templates) {
        if (!template) continue;
        for (const match of template.matchAll(templateVariablePattern)) variables.add(match[1]);
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
    if (verificationPurposes.has(purpose) && channel === "IN_APP") {
        ElMessage.error("验证码模板只能使用短信或邮件渠道");
        return false;
    }
    return true;
}

function normalizeChannelFields(): void {
    if (!showTitleTemplate.value) editor.value.title_template = "";
    if (!showHtmlTemplate.value) editor.value.html_template = "";
    if (!showProviderTemplateCode.value) editor.value.provider_template_code = "";
}

function handleChannelChange(): void {
    normalizeChannelFields();
}

function handlePurposeChange(): void {
    if (!editorChannelOptions.value.some(item => item.value === editor.value.channel)) {
        editor.value.channel = editor.value.purpose === "BIND_EMAIL_CODE" ? "EMAIL" : "SMS";
        ElMessage.info(`模板渠道已切换为${channelLabel(editor.value.channel)}`);
    }
    normalizeChannelFields();
}

function activeTemplateFields(): { title: string; html: string } {
    return {
        title: showTitleTemplate.value ? editor.value.title_template : "",
        html: showHtmlTemplate.value ? editor.value.html_template : ""
    };
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
        ([, definition]) => definition.sensitive !== undefined && typeof definition.sensitive !== "boolean"
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
    if (content && directVariableTemplatePattern.test(content)) {
        ElMessage.error("模板正文不能只有一个占位符，请补充通知语义");
        return undefined;
    }
    const hasIllegalPlaceholder = [title, content, html].some(template => {
        if (!template) return false;
        const remainder = template.replace(templateVariablePattern, "");
        return invalidVariablePattern.test(remainder);
    });
    if (hasIllegalPlaceholder) {
        ElMessage.error("模板包含非法占位符，只允许 {{变量名}} 格式");
        return undefined;
    }
    const unsafeHtml = (html ?? "").toLowerCase();
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

function channelLabel(channel: NotificationTemplateChannel): string {
    return channelOptions.find(item => item.value === channel)?.label ?? channel;
}

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

async function load(): Promise<void> {
    if (!editingId.value) return;
    loading.value = true;
    try {
        const detail = await NotificationTemplateApi.detail(editingId.value);
        if (detail.state !== "DRAFT") {
            ElMessage.warning("只有草稿模板可以编辑，请从列表复制为新草稿");
            await router.push({ name: "DevopsNotificationTemplate" });
            return;
        }
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
            version: detail.version,
            state: detail.state
        };
        normalizeChannelFields();
    } catch (error: unknown) {
        ElMessage.error(errorMessage(error, "加载模板详情失败"));
        await router.push({ name: "DevopsNotificationTemplate" });
    } finally {
        loading.value = false;
    }
}

async function save(): Promise<void> {
    const valid = await editorFormRef.value?.validate().catch(() => false);
    if (!valid) return;

    const parameterSchema = parseJsonObject(editor.value.parameter_schema_text, "参数 Schema");
    if (!parameterSchema || !validateTemplatePurposeChannel(editor.value.purpose, editor.value.channel)) return;
    const templateFields = activeTemplateFields();
    if (
        !validateTemplateDefinition(
            parameterSchema,
            templateFields.title,
            editor.value.content_template,
            templateFields.html
        )
    ) {
        return;
    }

    const payload: NotificationTemplateSaveParams = {
        template_group_code: editor.value.template_group_code.trim(),
        template_name: editor.value.template_name.trim(),
        channel: editor.value.channel,
        purpose: editor.value.purpose,
        title_template: templateFields.title,
        content_template: editor.value.content_template,
        html_template: templateFields.html,
        parameter_schema: parameterSchema,
        provider_template_code: showProviderTemplateCode.value ? editor.value.provider_template_code.trim() : ""
    };
    if (editor.value.id) {
        payload.id = editor.value.id;
        payload.version = editor.value.version;
    }

    submitting.value = true;
    try {
        if (editor.value.id) {
            await NotificationTemplateApi.update(editor.value.id, payload);
            ElMessage.success("模板草稿已保存");
        } else {
            await NotificationTemplateApi.create(payload);
            ElMessage.success("模板草稿已创建");
        }
        await router.push({ name: "DevopsNotificationTemplate" });
    } catch (error: unknown) {
        ElMessage.error(errorMessage(error, "保存模板失败，可能是版本已变化"));
    } finally {
        submitting.value = false;
    }
}

async function preview(): Promise<void> {
    const parameterSchema = parseJsonObject(editor.value.parameter_schema_text, "参数 Schema");
    if (!parameterSchema || !validateTemplatePurposeChannel(editor.value.purpose, editor.value.channel)) return;
    const templateFields = activeTemplateFields();
    const variables = validateTemplateDefinition(
        parameterSchema,
        templateFields.title,
        editor.value.content_template,
        templateFields.html
    );
    if (!variables) return;
    const parameters = parseJsonObject(editor.value.sample_parameters_text, "示例参数");
    const sensitiveParameters = parseJsonObject(editor.value.sample_sensitive_parameters_text, "敏感示例参数");
    if (!parameters || !sensitiveParameters) return;

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
            title_template: templateFields.title,
            content_template: editor.value.content_template,
            html_template: templateFields.html,
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

function backToList(): void {
    void router.push({ name: "DevopsNotificationTemplate" });
}

onMounted(() => {
    void load();
});
</script>

<template>
    <div class="notification-template-edit-page">
        <div class="page-header">
            <div>
                <h2>{{ editingId ? "编辑通知模板草稿" : "新增通知模板" }}</h2>
                <p>
                    {{
                        editingId
                            ? "修改草稿后可返回列表发布；已发布版本不能直接修改。"
                            : "创建草稿后可返回列表继续预览和发布。"
                    }}
                </p>
            </div>
            <el-button @click="backToList">返回模板列表</el-button>
        </div>

        <el-card v-loading="loading" shadow="never" class="editor-card">
            <el-form ref="editorFormRef" :model="editor" :rules="editorRules" label-position="top" status-icon>
                <el-row :gutter="18">
                    <el-col :span="12">
                        <el-form-item label="模板组编码" prop="template_group_code">
                            <el-input
                                v-model="editor.template_group_code"
                                :disabled="Boolean(editingId)"
                                placeholder="例如 workflow.todo" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="渠道" prop="channel">
                            <el-select
                                v-model="editor.channel"
                                :disabled="Boolean(editingId)"
                                style="width: 100%"
                                @change="handleChannelChange">
                                <el-option
                                    v-for="item in editorChannelOptions"
                                    :key="item.value"
                                    :label="item.label"
                                    :value="item.value" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                </el-row>

                <el-row :gutter="18">
                    <el-col :span="12">
                        <el-form-item label="模板名称" prop="template_name">
                            <el-input v-model="editor.template_name" placeholder="例如 登录验证码" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="通知用途" prop="purpose">
                            <el-select
                                v-model="editor.purpose"
                                filterable
                                style="width: 100%"
                                @change="handlePurposeChange">
                                <el-option
                                    v-for="item in purposeOptions"
                                    :key="item.value"
                                    :label="item.label"
                                    :value="item.value" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                </el-row>

                <el-alert
                    :title="channelFieldHint"
                    type="info"
                    :closable="false"
                    show-icon
                    class="channel-field-alert" />

                <el-form-item v-if="showTitleTemplate" :label="titleTemplateLabel">
                    <el-input v-model="editor.title_template" placeholder="支持 {{变量名}} 占位符" />
                </el-form-item>
                <el-form-item label="正文模板" prop="content_template">
                    <el-input
                        v-model="editor.content_template"
                        type="textarea"
                        :rows="5"
                        placeholder="请填写有明确通知语义的正文，例如：公告《{{title}}》已发布，请及时查看。" />
                </el-form-item>
                <el-alert
                    title="正文不能直接等于 {{变量名}}；请补充通知对象、事件或处理提示等业务语义。"
                    type="warning"
                    :closable="false"
                    show-icon
                    class="content-alert" />

                <el-divider content-position="left">高级模板设置</el-divider>
                <el-form-item v-if="showHtmlTemplate" label="邮件 HTML 模板">
                    <el-input
                        v-model="editor.html_template"
                        type="textarea"
                        :rows="5"
                        placeholder="可选；禁止 script、事件属性和 javascript: 链接" />
                </el-form-item>
                <el-form-item label="参数 Schema" prop="parameter_schema_text">
                    <el-input
                        v-model="editor.parameter_schema_text"
                        type="textarea"
                        :rows="8"
                        placeholder='JSON Schema，例如 { "properties": { "code": { "type": "string", "sensitive": true } } }' />
                    <div class="form-help">properties 中的 sensitive: true 表示该参数必须从敏感参数通道传入。</div>
                </el-form-item>
                <el-form-item v-if="showProviderTemplateCode" label="供应商模板编码">
                    <el-input v-model="editor.provider_template_code" placeholder="短信或邮件供应商模板编码，可选" />
                </el-form-item>

                <el-divider content-position="left">预览示例参数</el-divider>
                <el-row :gutter="18">
                    <el-col :span="12">
                        <el-form-item label="普通示例参数">
                            <el-input
                                v-model="editor.sample_parameters_text"
                                type="textarea"
                                :rows="5"
                                placeholder='JSON 对象，例如 { "name": "张三" }' />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="敏感示例参数">
                            <el-input
                                v-model="editor.sample_sensitive_parameters_text"
                                type="textarea"
                                :rows="5"
                                placeholder='JSON 对象，例如 { "code": "123456" }；只填写 Schema 中 sensitive 为 true 的参数' />
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-alert
                    title="预览示例参数仅用于本次预览，不会写入数据库；发布前会重新校验变量声明、敏感参数分区和 HTML 安全规则。"
                    type="info"
                    :closable="false"
                    show-icon />
            </el-form>

            <div class="editor-actions">
                <el-button @click="backToList">取消</el-button>
                <el-button :loading="previewLoading" @click="void preview">预览</el-button>
                <el-button type="primary" :loading="submitting" @click="void save">保存草稿</el-button>
            </div>
        </el-card>

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
                    <el-descriptions-item label="用途">{{ previewResult.purpose || "-" }}</el-descriptions-item>
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
    </div>
</template>

<style scoped lang="scss">
.notification-template-edit-page {
    height: 100%;
    min-height: 0;
    padding: 18px;
    overflow: auto;
    box-sizing: border-box;
    background: var(--el-bg-color-page);
}

.page-header,
.editor-card {
    width: min(1080px, 100%);
    margin: 0 auto;
}

.page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 14px;
}

h2 {
    margin: 0;
    color: var(--el-text-color-primary);
    font-size: 20px;
}

.page-header p {
    margin: 8px 0 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.editor-card :deep(.el-form-item__content > .el-input),
.editor-card :deep(.el-form-item__content > .el-select) {
    width: 100%;
}

.content-alert,
.channel-field-alert,
.form-help {
    margin-bottom: 18px;
}

.form-help {
    width: 100%;
    margin-top: 6px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 1.5;
}

.editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 22px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-lighter);
}

.preview-text,
.preview-source {
    padding: 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    white-space: pre-wrap;
    word-break: break-word;
}

.preview-source {
    max-height: 240px;
    margin: 0;
    overflow: auto;
    background: var(--el-fill-color-light);
}

h4 {
    margin: 18px 0 8px;
}

@media (max-width: 720px) {
    .page-header {
        flex-direction: column;
    }

    .editor-card :deep(.el-col) {
        max-width: 100%;
        flex: 0 0 100%;
    }
}
</style>
