<script setup lang="ts">
import { ElMessage } from "element-plus";
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { NotificationTemplateApi } from "@/api/notification/notification-template-api.ts";
import StepNavigation from "@/components/StepNavigation/index.vue";
import type { StepNavigationItem } from "@/components/StepNavigation/types.ts";

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

const editor = ref<TemplateEditorForm>(createEditorForm());
const loading = ref(false);
const submitting = ref(false);
const previewLoading = ref(false);
const previewVisible = ref(false);
const previewResult = ref<NotificationTemplatePreviewVO>();
const activeStep = ref(0);

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
const showInAppTitleTemplate = computed(() => editor.value.channel === "IN_APP");
const showEmailTitleTemplate = computed(() => editor.value.channel === "EMAIL");
const channelFieldHint = computed(() => {
    if (editor.value.channel === "SMS") {
        return "短信渠道使用纯文本正文和供应商模板编码，不需要标题或 HTML 模板。";
    }
    if (editor.value.channel === "EMAIL") {
        return "邮件渠道支持邮件主题、纯文本正文、HTML 正文和供应商模板编码。";
    }
    return "站内信使用标题和纯文本正文，不配置 HTML 模板或供应商模板编码。";
});
const secondStepTitle = computed(() => {
    if (editor.value.channel === "SMS") return "短信扩展信息";
    if (editor.value.channel === "EMAIL") return "邮件扩展信息";
    return "预览示例";
});
const secondStepDescription = computed(() => {
    if (editor.value.channel === "SMS") return "配置短信供应商模板编码并准备预览参数";
    if (editor.value.channel === "EMAIL") return "配置邮件主题、HTML 正文和供应商模板编码";
    return "填写示例参数并预览站内信效果";
});
const stepTipTitle = computed(() => (activeStep.value === 0 ? "基础信息提示" : `${secondStepTitle.value}提示`));
const editorSteps = computed<StepNavigationItem[]>(() => [
    { key: "0", title: "基础信息", description: "填写模板基本资料", complete: activeStep.value > 0 },
    { key: "1", title: secondStepTitle.value, description: secondStepDescription.value }
]);
const formRef = useTemplateRef<FormInstance>("formRef");

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

async function validateBasicForm(): Promise<boolean> {
    if (!formRef.value) return false;
    try {
        await formRef.value.validateField([
            "template_group_code",
            "template_name",
            "channel",
            "purpose",
            "content_template",
            "parameter_schema_text"
        ]);
        return true;
    } catch {
        return false;
    }
}

async function handleStepChange(step: number): Promise<void> {
    if (step > 0 && !(await validateBasicForm())) return;
    activeStep.value = step;
}

function handleStepNavigation(key: string): void {
    void handleStepChange(Number(key));
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
    const valid = await formRef.value?.validate().catch(() => false);
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
    <div v-loading="loading" class="notification-template-edit-page">
        <div class="notification-template-edit-shell">
            <div class="notification-template-edit-workspace">
                <aside class="notification-template-edit-side notification-template-edit-side-left">
                    <StepNavigation
                        :items="editorSteps"
                        :active-key="String(activeStep)"
                        aria-label="通知模板编辑步骤"
                        @select="handleStepNavigation" />
                </aside>

                <section class="notification-template-edit-section">
                    <div class="template-step-header">
                        <div class="template-step-section-title">
                            <div>
                                <span>{{ activeStep === 0 ? "基础信息" : secondStepTitle }}</span>
                                <small>
                                    {{
                                        activeStep === 0
                                            ? "填写模板编码、名称、用途、渠道和正文等基础资料"
                                            : secondStepDescription
                                    }}
                                </small>
                            </div>
                        </div>
                    </div>

                    <div class="notification-template-edit-content">
                        <el-form ref="formRef" :model="editor" :rules="editorRules" label-position="top" status-icon>
                            <div v-show="activeStep === 0" class="template-step-panel">
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

                                <el-form-item v-if="showInAppTitleTemplate" label="标题模板">
                                    <el-input v-model="editor.title_template" placeholder="支持 {{变量名}} 占位符" />
                                </el-form-item>
                                <el-form-item label="正文模板" prop="content_template">
                                    <el-input
                                        v-model="editor.content_template"
                                        type="textarea"
                                        :rows="5"
                                        placeholder="请填写有明确通知语义的正文，例如：公告《{{title}}》已发布，请及时查看。" />
                                </el-form-item>
                                <el-form-item label="参数 Schema" prop="parameter_schema_text">
                                    <el-input
                                        v-model="editor.parameter_schema_text"
                                        type="textarea"
                                        :rows="8"
                                        placeholder='JSON Schema，例如 { "properties": { "code": { "type": "string", "sensitive": true } } }' />
                                </el-form-item>
                            </div>

                            <div v-show="activeStep === 1" class="template-step-panel">
                                <template v-if="editor.channel === 'SMS'">
                                    <el-form-item label="短信供应商模板编码">
                                        <el-input
                                            v-model="editor.provider_template_code"
                                            placeholder="请输入短信供应商模板编码，可选" />
                                    </el-form-item>
                                </template>

                                <template v-if="showEmailTitleTemplate">
                                    <el-row :gutter="18">
                                        <el-col :span="12">
                                            <el-form-item label="邮件主题模板">
                                                <el-input
                                                    v-model="editor.title_template"
                                                    placeholder="支持 {{变量名}} 占位符" />
                                            </el-form-item>
                                        </el-col>
                                        <el-col :span="12">
                                            <el-form-item label="邮件供应商模板编码">
                                                <el-input
                                                    v-model="editor.provider_template_code"
                                                    placeholder="请输入邮件供应商模板编码，可选" />
                                            </el-form-item>
                                        </el-col>
                                    </el-row>
                                    <el-form-item label="邮件 HTML 模板">
                                        <el-input
                                            v-model="editor.html_template"
                                            type="textarea"
                                            :rows="6"
                                            placeholder="可选；禁止 script、事件属性和 javascript: 链接" />
                                    </el-form-item>
                                </template>

                                <el-divider content-position="left">预览示例参数</el-divider>
                                <el-row :gutter="18">
                                    <el-col :span="12">
                                        <el-form-item label="普通示例参数">
                                            <el-input
                                                v-model="editor.sample_parameters_text"
                                                type="textarea"
                                                :rows="6"
                                                placeholder='JSON 对象，例如 { "name": "张三" }' />
                                        </el-form-item>
                                    </el-col>
                                    <el-col :span="12">
                                        <el-form-item label="敏感示例参数">
                                            <el-input
                                                v-model="editor.sample_sensitive_parameters_text"
                                                type="textarea"
                                                :rows="6"
                                                placeholder='JSON 对象，例如 { "code": "123456" }；只填写 Schema 中 sensitive 为 true 的参数' />
                                        </el-form-item>
                                    </el-col>
                                </el-row>
                            </div>
                        </el-form>
                    </div>
                </section>

                <aside class="notification-template-edit-side notification-template-edit-side-right">
                    <div class="section-title template-heading">
                        <div>
                            <span>{{ editingId ? "编辑通知模板" : "新增通知模板" }}</span>
                            <small>完成基础信息和扩展信息后保存草稿</small>
                        </div>
                        <el-text type="info">带 * 的字段为必填项</el-text>
                    </div>
                    <el-alert class="template-tip" :title="stepTipTitle" type="info" :closable="false" show-icon>
                        <template #default>
                            <div class="template-tip-content">
                                <template v-if="activeStep === 0">
                                    <p>
                                        <strong>模板组编码</strong>
                                        用于业务调用，
                                        <strong>模板名称</strong>
                                        用于管理端识别，请填写清晰的业务含义。
                                    </p>
                                    <p>
                                        <strong>通知用途和渠道</strong>
                                        会共同决定模板是否可用，验证码用途不能配置为站内信。
                                    </p>
                                    <p>
                                        <strong>{{ channelFieldHint }}</strong>
                                    </p>
                                    <p>
                                        <strong>正文必须包含明确通知语义</strong>
                                        ，不能直接使用单个占位符。
                                    </p>
                                    <p>
                                        <strong>正文不能只填写单个变量占位符</strong>
                                        ；请补充通知对象、事件或处理提示等业务语义。
                                    </p>
                                    <p>
                                        参数 Schema 中的
                                        <strong>sensitive: true</strong>
                                        表示该参数必须从敏感参数通道传入。
                                    </p>
                                </template>
                                <template v-else-if="editor.channel === 'SMS'">
                                    <p>
                                        <strong>{{ channelFieldHint }}</strong>
                                    </p>
                                    <p>
                                        <strong>短信只使用纯文本正文</strong>
                                        ，标题和 HTML 模板不会参与发送。
                                    </p>
                                    <p>
                                        <strong>供应商模板编码</strong>
                                        仅在供应商要求使用已审核短信模板时填写。
                                    </p>
                                    <p>如果短信供应商要求使用已审核模板，请填写供应商分配的模板编码。</p>
                                    <p>
                                        <strong>示例参数仅用于预览</strong>
                                        ，不会保存到模板或业务通知数据中。
                                    </p>
                                    <p>
                                        <strong>普通参数和敏感参数需要分别填写</strong>
                                        ，发布前系统会重新校验参数分区。
                                    </p>
                                </template>
                                <template v-else-if="editor.channel === 'EMAIL'">
                                    <p>
                                        <strong>{{ channelFieldHint }}</strong>
                                    </p>
                                    <p>
                                        <strong>邮件主题对应邮件标题</strong>
                                        ，HTML 正文可选，纯文本正文用于兼容不支持 HTML 的客户端。
                                    </p>
                                    <p><strong>HTML 模板禁止脚本、事件属性和危险 URL 协议。</strong></p>
                                    <p>
                                        <strong>示例参数仅用于预览</strong>
                                        ，不会保存到模板或业务通知数据中。
                                    </p>
                                    <p>
                                        <strong>普通参数和敏感参数需要分别填写</strong>
                                        ，发布前系统会重新校验参数分区。
                                    </p>
                                </template>
                                <template v-else>
                                    <p>
                                        <strong>{{ channelFieldHint }}</strong>
                                    </p>
                                    <p>
                                        <strong>站内信使用标题和纯文本正文</strong>
                                        ，当前步骤用于确认实际渲染结果。
                                    </p>
                                    <p>
                                        <strong>敏感参数必须填写在敏感示例参数中</strong>
                                        ，不能放入普通示例参数。
                                    </p>
                                    <p>
                                        <strong>预览成功后仍需保存草稿</strong>
                                        ，发布前系统会再次执行完整校验。
                                    </p>
                                </template>
                            </div>
                        </template>
                    </el-alert>
                </aside>
            </div>

            <div class="editor-actions">
                <el-button @click="backToList">取消</el-button>
                <template v-if="activeStep === 0">
                    <el-button type="primary" @click="void handleStepChange(1)">下一步</el-button>
                </template>
                <template v-else>
                    <el-button @click="void handleStepChange(0)">上一步</el-button>
                    <el-button :loading="previewLoading" @click="void preview">预览</el-button>
                    <el-button type="primary" :loading="submitting" @click="void save">保存草稿</el-button>
                </template>
            </div>
        </div>

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
    padding: 20px 32px 24px;
    overflow: hidden;
    box-sizing: border-box;
    background: var(--el-bg-color);
}

.notification-template-edit-shell {
    display: flex;
    flex-direction: column;
    width: min(1600px, 100%);
    height: 100%;
    min-height: 0;
    margin: 0 auto;
}

.notification-template-edit-workspace {
    display: grid;
    flex: 1 1 auto;
    grid-template-columns: max-content minmax(0, 1fr) minmax(220px, 280px);
    min-height: 0;
    gap: 24px;
}

.notification-template-edit-side {
    min-width: 0;
    padding-top: 4px;
}

.notification-template-edit-side-left {
    grid-column: 1;
    width: max-content;
    max-width: 240px;
}

.notification-template-edit-side-right {
    display: flex;
    grid-column: 3;
    min-width: 0;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    scrollbar-gutter: stable;
}

.notification-template-edit-section {
    display: flex;
    grid-column: 2;
    grid-row: 1;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
}

.template-step-header {
    flex: 0 0 auto;
    min-height: 0;
}

.template-step-section-title {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.template-step-section-title > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.template-step-section-title span {
    color: var(--el-text-color-primary);
    font-size: 16px;
    font-weight: 600;
}

.template-step-section-title small {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.notification-template-edit-content {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0 4px 12px;
    overflow-y: auto;
    scrollbar-gutter: stable;
}

.template-step-panel {
    min-height: 100%;
}

.section-title,
.editor-actions {
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

.template-heading {
    align-items: flex-start;
    flex-direction: column;
    margin: 0;
    padding: 14px 16px;
    border: 1px solid var(--el-border-color-extra-light);
    border-left: 3px solid var(--el-color-primary-light-5);
    border-radius: 0 10px 10px 0;
    background: var(--el-fill-color-light);
}

.template-tip {
    flex: 0 0 auto;
    align-items: flex-start;
    padding: 14px 16px;
    border: 1px solid var(--el-color-info-light-7);
    border-radius: 10px;
    background: var(--el-color-info-light-9);
}

.template-tip :deep(.el-alert__icon) {
    flex: 0 0 auto;
    margin-top: 2px;
}

.template-tip :deep(.el-alert__content) {
    min-width: 0;
    gap: 4px;

    .el-alert__title {
        color: var(--el-text-color-primary);
        font-size: 13px;
        font-weight: 600;
        line-height: 20px;
    }
}

.template-tip-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--el-text-color-regular);
    font-size: 12px;
    line-height: 1.7;
}

.template-tip-content p {
    margin: 0;
}

.template-tip-content strong {
    color: var(--el-text-color-primary);
    font-weight: 700;
}

.editor-actions {
    flex: 0 0 auto;
    width: 100%;
    margin: 0 auto;
    justify-content: flex-end;
    padding: 16px 0 4px;
    border-top: 1px solid var(--el-border-color-lighter);
}

.editor-actions .el-button {
    min-width: 88px;
}

:deep(.el-form-item) {
    margin-bottom: 22px;
}

:deep(.el-input),
:deep(.el-select) {
    width: 100%;
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

@media (max-width: 1200px) {
    .notification-template-edit-workspace {
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow: hidden;
    }

    .notification-template-edit-side {
        flex: 0 0 auto;
        padding-top: 0;
    }

    .notification-template-edit-side-left {
        order: 0;
    }

    .notification-template-edit-section {
        order: 1;
        min-height: 0;
    }

    .notification-template-edit-side-right {
        order: 2;
    }
}

@media (max-width: 768px) {
    .notification-template-edit-page {
        padding: 20px 16px 24px;
    }

    .section-title {
        align-items: flex-start;
        flex-direction: column;
    }

    :deep(.el-col) {
        width: 100%;
        max-width: 100%;
        flex: 0 0 100%;
    }
}
</style>
