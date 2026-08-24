<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { RoleApi } from "@/api/auth/role-api.ts";
import { NotificationControlledSendApi } from "@/api/notification/notification-controlled-send-api.ts";
import { NotificationTemplateApi } from "@/api/notification/notification-template-api.ts";
import { DepartmentApi } from "@/api/user/department-api.ts";
import { UserApi } from "@/api/user/user-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { treeDefaultProps } from "@/utils/default-config.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const channelOptions: Array<{ label: string; value: NotificationAdminChannel }> = [
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

const channelLabels: Record<NotificationAdminChannel, string> = {
    IN_APP: "站内信",
    SMS: "短信",
    EMAIL: "邮件"
};

interface SendForm {
    idempotency_key: string;
    purpose: string;
    channels: NotificationAdminChannel[];
    template_version_ids: Record<NotificationAdminChannel, string>;
    audience: NotificationControlledSendAudience;
    parameters: Record<string, string | number | boolean | null>;
    business_type: string;
    business_id: string;
    link: string;
}

interface TemplateParameterField {
    name: string;
    label: string;
    type: string;
    description: string;
    required: boolean;
    enumValues: Array<string | number | boolean>;
    defaultValue?: string | number | boolean | null;
}

function createIdempotencyKey(): string {
    const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `notification-admin-${suffix}`;
}

const form = reactive<SendForm>({
    idempotency_key: createIdempotencyKey(),
    purpose: "SYSTEM_NOTICE",
    channels: ["IN_APP"],
    template_version_ids: {} as Record<NotificationAdminChannel, string>,
    audience: {
        user_ids: [],
        department_ids: [],
        role_ids: []
    },
    parameters: {},
    business_type: "",
    business_id: "",
    link: ""
});

const router = useRouter();
const templates = ref<NotificationTemplateVO[]>([]);
const departmentTree = ref<DepartmentTreeVO[]>([]);
const roles = ref<RolePageVO[]>([]);
const userOptions = ref<UserPageVO[]>([]);
const templateLoading = ref(false);
const lookupLoading = ref(false);
const userLoading = ref(false);
const previewLoading = ref(false);
const applyLoading = ref(false);
const validationMessage = ref("");
const previewResult = ref<NotificationControlledSendPreviewVO>();
const applyResult = ref<NotificationControlledSendApplyVO>();
const previewDialogVisible = ref(false);
let templateRequestSequence = 0;
let userRequestSequence = 0;

const selectedTemplates = computed(() =>
    form.channels.map(channel => ({
        channel,
        options: templates.value.filter(template => template.channel === channel)
    }))
);

const previewTemplates = computed(() =>
    form.channels
        .map(channel => previewResult.value?.templates[channel])
        .filter((template): template is NotificationControlledSendTemplateVO => Boolean(template))
);

function selectedTemplate(channel: NotificationAdminChannel): NotificationTemplateVO | undefined {
    const templateId = form.template_version_ids[channel];
    return templates.value.find(template => template.channel === channel && template.id === templateId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isParameterValue(value: unknown): value is string | number | boolean {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

const parameterFields = computed<TemplateParameterField[]>(() => {
    const fields = new Map<string, TemplateParameterField>();
    form.channels
        .map(channel => selectedTemplate(channel))
        .filter((template): template is NotificationTemplateVO => Boolean(template))
        .forEach(template => {
            const schema = template.parameter_schema;
            if (!isRecord(schema) || !isRecord(schema.properties)) return;
            Object.entries(schema.properties).forEach(([name, rawDefinition]) => {
                if (!isRecord(rawDefinition) || fields.has(name)) return;
                const enumValues = Array.isArray(rawDefinition.enum) ? rawDefinition.enum.filter(isParameterValue) : [];
                const defaultValue = rawDefinition.default;
                fields.set(name, {
                    name,
                    label: typeof rawDefinition.title === "string" ? rawDefinition.title : name,
                    type: typeof rawDefinition.type === "string" ? rawDefinition.type : "string",
                    description: typeof rawDefinition.description === "string" ? rawDefinition.description : "",
                    required: true,
                    enumValues,
                    ...(defaultValue === null || isParameterValue(defaultValue) ? { defaultValue } : {})
                });
            });
        });
    return [...fields.values()];
});

const previewAvailability = computed(() =>
    form.channels
        .map(channel => previewResult.value?.channel_availability[channel])
        .filter((availability): availability is NotificationControlledSendChannelAvailability => Boolean(availability))
);

const skippedRows = computed(() =>
    Object.entries(previewResult.value?.skipped_counts ?? {}).map(([reason, count]) => ({ reason, count }))
);

const canApply = computed(() => {
    const result = previewResult.value;
    return Boolean(
        result &&
        result.eligible_task_count > 0 &&
        form.channels.every(channel => result.channel_availability[channel]?.available === true)
    );
});

function defaultParameterValue(field: TemplateParameterField): string | number | boolean | null {
    if (field.defaultValue !== undefined) return field.defaultValue;
    if (field.type === "boolean") return false;
    if (field.type === "number" || field.type === "integer") return null;
    return "";
}

function syncParameterValues(fields: TemplateParameterField[]): void {
    const names = new Set(fields.map(field => field.name));
    Object.keys(form.parameters).forEach(name => {
        if (!names.has(name)) delete form.parameters[name];
    });
    fields.forEach(field => {
        if (!(field.name in form.parameters)) form.parameters[field.name] = defaultParameterValue(field);
    });
}

function parameterTextValue(name: string): string {
    const value = form.parameters[name];
    return value === null || value === undefined ? "" : String(value);
}

function parameterValue(name: string): string | number | boolean | null {
    return form.parameters[name] ?? null;
}

function parameterNumberValue(name: string): number | null {
    const value = form.parameters[name];
    return typeof value === "number" ? value : null;
}

function parameterBooleanValue(name: string): boolean {
    return form.parameters[name] === true;
}

function setParameterValue(name: string, value: unknown): void {
    if (value === null || isParameterValue(value)) form.parameters[name] = value;
}

function validateParameterValues(): boolean {
    for (const field of parameterFields.value) {
        const value = form.parameters[field.name];
        if (value === null || value === undefined || (typeof value === "string" && !value.trim())) {
            validationMessage.value = `请填写模板参数“${field.label}”`;
            MessageUtils.error(validationMessage.value);
            return false;
        }
    }
    return true;
}

function prepareParameters(): Record<string, unknown> | undefined {
    if (!validateParameterValues()) return undefined;
    const parameters: Record<string, unknown> = {};
    for (const field of parameterFields.value) {
        const value = form.parameters[field.name];
        if ((field.type === "array" || field.type === "object") && typeof value === "string" && value.trim()) {
            try {
                const parsed = JSON.parse(value) as unknown;
                if (field.type === "array" && !Array.isArray(parsed)) {
                    throw new Error("模板参数必须是 JSON 数组");
                }
                if (field.type === "object" && !isRecord(parsed)) {
                    throw new Error("模板参数必须是 JSON 对象");
                }
                parameters[field.name] = parsed;
            } catch {
                validationMessage.value = `模板参数“${field.label}”格式不正确`;
                MessageUtils.error(validationMessage.value);
                return undefined;
            }
        } else {
            parameters[field.name] = value;
        }
    }
    return parameters;
}

function channelLabel(channel: NotificationAdminChannel): string {
    return channelLabels[channel] ?? channel;
}

function purposeLabel(purpose: string): string {
    return purposeOptions.find(item => item.value === purpose)?.label ?? purpose;
}

function availabilityReason(reason: string | null | undefined): string {
    if (!reason) return "可用";
    const labels: Record<string, string> = {
        AVAILABLE: "可用",
        PROVIDER_NOT_CONFIGURED: "尚未配置渠道服务",
        HEALTH_CHECK_REQUIRED: "需要重新执行健康检查",
        DISABLED_BY_CONFIGURATION: "已被配置为禁用",
        PROVIDER_NOT_REGISTERED: "当前运行环境未注册渠道服务",
        MODULE_DISABLED: "通知模块已关闭"
    };
    return labels[reason] ?? reason;
}

function availabilityTagType(available: boolean): "success" | "danger" {
    return available ? "success" : "danger";
}

function clearPreview(): void {
    previewResult.value = undefined;
    applyResult.value = undefined;
    previewDialogVisible.value = false;
}

function syncTemplateSelections(): void {
    for (const channel of form.channels) {
        const channelTemplates = templates.value.filter(template => template.channel === channel);
        const selectedId = form.template_version_ids[channel];
        if (!selectedId || !channelTemplates.some(template => template.id === selectedId)) {
            form.template_version_ids[channel] = channelTemplates[0]?.id ?? "";
        }
    }
}

async function loadTemplates(): Promise<void> {
    const sequence = ++templateRequestSequence;
    templateLoading.value = true;
    try {
        const result = await NotificationTemplateApi.page({
            page_num: 1,
            page_size: 100,
            purpose: form.purpose,
            state: "PUBLISHED"
        });
        if (sequence === templateRequestSequence) {
            templates.value = result.records ?? [];
            syncTemplateSelections();
        }
    } catch {
        if (sequence === templateRequestSequence) {
            templates.value = [];
            MessageUtils.error("已发布通知模板加载失败，请稍后重试");
        }
    } finally {
        if (sequence === templateRequestSequence) templateLoading.value = false;
    }
}

async function loadLookups(): Promise<void> {
    lookupLoading.value = true;
    try {
        const [departments, roleList] = await Promise.all([DepartmentApi.tree(), RoleApi.list()]);
        departmentTree.value = departments ?? [];
        roles.value = (roleList ?? []).filter(role => role.state);
    } catch {
        MessageUtils.error("组织和角色数据加载失败，请稍后重试");
    } finally {
        lookupLoading.value = false;
    }
}

async function searchUsers(keyword: string): Promise<void> {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
        userOptions.value = userOptions.value.filter(user => form.audience.user_ids.includes(user.id));
        return;
    }
    const sequence = ++userRequestSequence;
    userLoading.value = true;
    try {
        const result = await UserApi.page(
            { page_num: 1, page_size: 50, real_name: normalizedKeyword },
            { loading: false }
        );
        if (sequence !== userRequestSequence) return;
        const selected = userOptions.value.filter(user => form.audience.user_ids.includes(user.id));
        const merged = [...selected, ...(result.records ?? [])];
        userOptions.value = merged.filter((user, index) => merged.findIndex(item => item.id === user.id) === index);
    } catch {
        if (sequence === userRequestSequence) MessageUtils.error("用户搜索失败，请稍后重试");
    } finally {
        if (sequence === userRequestSequence) userLoading.value = false;
    }
}

function onChannelsChange(): void {
    syncTemplateSelections();
}

function buildRequest(): NotificationControlledSendParams | undefined {
    if (!form.idempotency_key.trim()) {
        validationMessage.value = "业务幂等键不能为空";
        MessageUtils.error(validationMessage.value);
        return undefined;
    }
    if (!form.channels.length) {
        validationMessage.value = "至少选择一个发送渠道";
        MessageUtils.error(validationMessage.value);
        return undefined;
    }
    const templateVersionIds = {} as Record<NotificationAdminChannel, string>;
    for (const channel of form.channels) {
        const templateId = form.template_version_ids[channel];
        if (!templateId) {
            validationMessage.value = `请选择${channelLabel(channel)}的已发布模板版本`;
            MessageUtils.error(validationMessage.value);
            return undefined;
        }
        templateVersionIds[channel] = templateId;
    }
    const selectedAudienceCount =
        form.audience.user_ids.length + form.audience.department_ids.length + form.audience.role_ids.length;
    if (!selectedAudienceCount) {
        validationMessage.value = "至少选择一个用户、部门或角色作为受众";
        MessageUtils.error(validationMessage.value);
        return undefined;
    }
    const parameters = prepareParameters();
    if (!parameters) return undefined;
    return {
        idempotency_key: form.idempotency_key.trim(),
        purpose: form.purpose,
        channels: [...form.channels],
        template_version_ids: templateVersionIds,
        audience: {
            user_ids: [...form.audience.user_ids],
            department_ids: [...form.audience.department_ids],
            role_ids: [...form.audience.role_ids]
        },
        parameters,
        business_type: form.business_type.trim() || undefined,
        business_id: form.business_id.trim() || undefined,
        link: form.link.trim() || undefined
    };
}

async function preview(): Promise<void> {
    validationMessage.value = "";
    const request = buildRequest();
    if (!request) return;
    previewLoading.value = true;
    clearPreview();
    try {
        previewResult.value = await NotificationControlledSendApi.preview(request);
        previewDialogVisible.value = true;
        MessageUtils.success("发送预览已生成，请核对受众和渠道结果");
    } catch {
        validationMessage.value = "发送预览生成失败，请检查模板、受众和渠道状态后重试。";
    } finally {
        previewLoading.value = false;
    }
}

async function apply(): Promise<void> {
    const preview = previewResult.value;
    if (!preview || !canApply.value) return;
    try {
        await MessageUtils.box.confirm(
            `将按当前预览创建 ${preview.eligible_task_count} 条投递任务，预览有效期至 ${formatDateTime(preview.expires_at)}。确认继续发送吗？`,
            "确认受控发送"
        );
    } catch {
        return;
    }
    applyLoading.value = true;
    try {
        applyResult.value = await NotificationControlledSendApi.apply({
            preview_id: preview.preview_id,
            preview_token: preview.preview_token,
            request_hash: preview.request_hash
        });
        MessageUtils.success("通知发送请求已提交");
    } catch {
        // 请求客户端已展示后端业务错误。
    } finally {
        applyLoading.value = false;
    }
}

function openRequest(): void {
    if (applyResult.value?.request_id) {
        void router.push({ name: "DevopsNotificationRequest", query: { request_id: applyResult.value.request_id } });
    }
}

watch(
    () => form.purpose,
    () => {
        form.template_version_ids = {} as Record<NotificationAdminChannel, string>;
        void loadTemplates();
    }
);

watch(
    parameterFields,
    fields => {
        syncParameterValues(fields);
    },
    { immediate: true }
);

watch(
    form,
    () => {
        clearPreview();
        validationMessage.value = "";
    },
    { deep: true }
);

onMounted(() => {
    void loadLookups();
    void loadTemplates();
});
</script>

<template>
    <div class="notification-send-page">
        <div class="page-header">
            <div class="page-header__summary">
                <span class="page-header__title">快捷发送</span>
                <span class="page-header__hint">预览、校验并提交通知发送请求</span>
            </div>
            <el-tag type="warning">仅限运维操作</el-tag>
        </div>

        <el-alert
            title="预览只保存 10 分钟的非敏感快照；确认发送时会重新校验受众、数据范围、用户偏好和渠道健康状态。"
            type="info"
            :closable="false"
            show-icon />

        <el-row :gutter="12" class="send-layout">
            <el-col :xs="24" :lg="11">
                <el-card shadow="never" class="section-card">
                    <template #header>
                        <div class="section-header">
                            <span>发送内容与受众</span>
                            <el-tag v-if="lookupLoading || templateLoading" type="info" size="small">加载中</el-tag>
                        </div>
                    </template>
                    <el-form label-position="top" class="send-form">
                        <el-form-item label="通知用途" required>
                            <el-select v-model="form.purpose" filterable style="width: 100%">
                                <el-option
                                    v-for="item in purposeOptions"
                                    :key="item.value"
                                    :label="item.label"
                                    :value="item.value" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="发送渠道" required>
                            <el-checkbox-group v-model="form.channels" @change="onChannelsChange">
                                <el-checkbox v-for="item in channelOptions" :key="item.value" :value="item.value">
                                    {{ item.label }}
                                </el-checkbox>
                            </el-checkbox-group>
                        </el-form-item>

                        <div class="subsection-title">模板版本</div>
                        <div class="form-hint template-hint">
                            各渠道需选择同一模板组下的已发布版本；只有一个可用版本时会自动选择。
                        </div>
                        <div class="template-selector-list">
                            <div v-for="item in selectedTemplates" :key="item.channel" class="template-selector">
                                <div class="template-selector__label">{{ channelLabel(item.channel) }}</div>
                                <div v-if="item.options.length === 1" class="template-selector__selected">
                                    <span>
                                        {{ item.options[0]?.template_group_code }} · v{{ item.options[0]?.version_no }}
                                    </span>
                                    <el-tag type="success" size="small">自动选择</el-tag>
                                </div>
                                <el-select
                                    v-else-if="item.options.length > 1"
                                    v-model="form.template_version_ids[item.channel]"
                                    :loading="templateLoading"
                                    filterable
                                    placeholder="选择已发布模板"
                                    style="width: 100%">
                                    <el-option
                                        v-for="template in item.options"
                                        :key="template.id"
                                        :label="`${template.template_group_code} · v${template.version_no}`"
                                        :value="template.id">
                                        <span>{{ template.template_group_code }} · v{{ template.version_no }}</span>
                                        <small>{{ template.content_template }}</small>
                                    </el-option>
                                </el-select>
                                <el-empty
                                    v-if="!item.options.length && !templateLoading"
                                    description="暂无已发布模板"
                                    :image-size="45" />
                                <div v-if="selectedTemplate(item.channel)" class="template-selector__content">
                                    <div class="template-selector__content-label">模板内容</div>
                                    <div v-if="selectedTemplate(item.channel)?.title_template">
                                        标题：{{ selectedTemplate(item.channel)?.title_template }}
                                    </div>
                                    <div>正文：{{ selectedTemplate(item.channel)?.content_template }}</div>
                                </div>
                            </div>
                        </div>

                        <div class="subsection-title">模板参数</div>
                        <div v-if="parameterFields.length" class="parameter-form">
                            <el-form-item
                                v-for="field in parameterFields"
                                :key="field.name"
                                :label="field.label"
                                :required="field.required">
                                <el-select
                                    v-if="field.enumValues.length"
                                    :model-value="parameterValue(field.name)"
                                    filterable
                                    clearable
                                    placeholder="请选择"
                                    style="width: 100%"
                                    @update:model-value="setParameterValue(field.name, $event)">
                                    <el-option
                                        v-for="option in field.enumValues"
                                        :key="String(option)"
                                        :label="String(option)"
                                        :value="option" />
                                </el-select>
                                <el-input-number
                                    v-else-if="field.type === 'number' || field.type === 'integer'"
                                    :model-value="parameterNumberValue(field.name)"
                                    :precision="field.type === 'integer' ? 0 : 2"
                                    controls-position="right"
                                    style="width: 100%"
                                    @update:model-value="setParameterValue(field.name, $event)" />
                                <el-switch
                                    v-else-if="field.type === 'boolean'"
                                    :model-value="parameterBooleanValue(field.name)"
                                    @update:model-value="setParameterValue(field.name, $event)" />
                                <el-input
                                    v-else
                                    :model-value="parameterTextValue(field.name)"
                                    :type="field.type === 'array' || field.type === 'object' ? 'textarea' : 'text'"
                                    :rows="field.type === 'array' || field.type === 'object' ? 3 : 1"
                                    :placeholder="
                                        field.type === 'array' || field.type === 'object' ? '请输入参数值' : '请输入'
                                    "
                                    @update:model-value="setParameterValue(field.name, $event)" />
                                <div v-if="field.description" class="form-hint">{{ field.description }}</div>
                            </el-form-item>
                        </div>
                        <div v-else class="form-hint parameter-empty-hint">当前模板不需要填写参数。</div>
                    </el-form>
                </el-card>
            </el-col>

            <el-col :xs="24" :lg="13">
                <el-card shadow="never" class="section-card target-card">
                    <template #header>
                        <div class="section-header">
                            <span>发送对象与业务信息</span>
                            <el-tag type="info" size="small">可选补充</el-tag>
                        </div>
                    </template>
                    <el-form label-position="top" class="send-form">
                        <div class="subsection-title">发送给</div>
                        <el-form-item label="明确用户">
                            <el-select
                                v-model="form.audience.user_ids"
                                multiple
                                filterable
                                remote
                                reserve-keyword
                                :remote-method="searchUsers"
                                :loading="userLoading"
                                collapse-tags
                                collapse-tags-tooltip
                                placeholder="输入姓名搜索并选择用户"
                                style="width: 100%">
                                <el-option
                                    v-for="user in userOptions"
                                    :key="user.id"
                                    :label="`${user.real_name}（${user.employee_no}）`"
                                    :value="user.id" />
                            </el-select>
                            <div class="form-hint">用户搜索只展示姓名和工号，发送时由后端重新解析当前有效地址。</div>
                        </el-form-item>

                        <div class="subsection-title">扩展受众范围</div>
                        <el-row :gutter="12">
                            <el-col :span="12">
                                <el-form-item label="部门范围（包含下级部门）">
                                    <el-tree-select
                                        v-model="form.audience.department_ids"
                                        :data="departmentTree"
                                        node-key="id"
                                        multiple
                                        check-strictly
                                        default-expand-all
                                        :props="treeDefaultProps"
                                        placeholder="选择部门范围"
                                        style="width: 100%" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item label="角色范围">
                                    <el-select
                                        v-model="form.audience.role_ids"
                                        multiple
                                        filterable
                                        collapse-tags
                                        collapse-tags-tooltip
                                        placeholder="选择角色范围"
                                        style="width: 100%">
                                        <el-option
                                            v-for="role in roles"
                                            :key="role.id"
                                            :label="role.name"
                                            :value="role.id" />
                                    </el-select>
                                </el-form-item>
                            </el-col>
                        </el-row>

                        <div class="subsection-title">业务关联</div>
                        <el-row :gutter="12">
                            <el-col :span="8">
                                <el-form-item label="业务类型">
                                    <el-input v-model="form.business_type" maxlength="100" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="8">
                                <el-form-item label="业务编号">
                                    <el-input v-model="form.business_id" maxlength="200" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="8">
                                <el-form-item label="站内跳转链接">
                                    <el-input v-model="form.link" maxlength="500" />
                                </el-form-item>
                            </el-col>
                        </el-row>

                        <div class="subsection-title">重复发送控制</div>
                        <el-form-item label="业务幂等键">
                            <el-input v-model="form.idempotency_key" maxlength="200" show-word-limit />
                            <div class="form-hint">系统已自动生成；相同幂等键重复确认时不会重复创建通知请求。</div>
                        </el-form-item>
                        <div class="target-card__actions">
                            <el-button text type="primary" @click="form.idempotency_key = createIdempotencyKey()">
                                重新生成幂等键
                            </el-button>
                        </div>
                        <el-alert
                            v-if="validationMessage"
                            :title="validationMessage"
                            type="warning"
                            show-icon
                            :closable="false"
                            class="form-validation-alert" />
                        <div class="form-actions">
                            <el-button type="primary" :loading="previewLoading" @click="void preview()">
                                生成预览并校验
                            </el-button>
                        </div>
                    </el-form>
                </el-card>
            </el-col>
        </el-row>

        <el-dialog
            v-model="previewDialogVisible"
            title="发送预览"
            width="min(960px, calc(100vw - 32px))"
            class="preview-dialog"
            :close-on-click-modal="false">
            <template v-if="previewResult">
                <el-alert
                    title="修改任一发送条件后，当前预览会立即失效，需要重新生成。"
                    type="warning"
                    :closable="false"
                    show-icon />
                <div class="metric-grid">
                    <div class="metric-item">
                        <span>候选用户</span>
                        <strong>{{ previewResult.candidate_user_count }}</strong>
                    </div>
                    <div class="metric-item metric-item--success">
                        <span>可创建任务</span>
                        <strong>{{ previewResult.eligible_task_count }}</strong>
                    </div>
                    <div class="metric-item metric-item--warning">
                        <span>跳过任务</span>
                        <strong>{{ previewResult.skipped_task_count }}</strong>
                    </div>
                </div>
                <div class="preview-meta">
                    <span>用途：{{ purposeLabel(form.purpose) }}</span>
                    <span>有效期至：{{ formatDateTime(previewResult.expires_at) }}</span>
                </div>

                <div class="preview-section">
                    <div class="preview-section__title">渠道状态</div>
                    <el-table :data="previewAvailability" stripe size="small">
                        <el-table-column label="渠道" width="90">
                            <template #default="scope">{{ channelLabel(scope.row.channel) }}</template>
                        </el-table-column>
                        <el-table-column label="状态" width="95">
                            <template #default="scope">
                                <el-tag :type="availabilityTagType(scope.row.available)" size="small">
                                    {{ scope.row.available ? "可用" : "不可用" }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="说明" min-width="160" show-overflow-tooltip>
                            <template #default="scope">{{ availabilityReason(scope.row.reason) }}</template>
                        </el-table-column>
                    </el-table>
                </div>

                <div class="preview-section">
                    <div class="preview-section__title">模板渲染样例</div>
                    <el-table :data="previewTemplates" stripe size="small">
                        <el-table-column label="渠道" width="85">
                            <template #default="scope">{{ channelLabel(scope.row.channel) }}</template>
                        </el-table-column>
                        <el-table-column label="版本" width="75">
                            <template #default="scope">v{{ scope.row.version_no }}</template>
                        </el-table-column>
                        <el-table-column label="标题" min-width="130" show-overflow-tooltip>
                            <template #default="scope">{{ scope.row.title || "—" }}</template>
                        </el-table-column>
                        <el-table-column label="内容" min-width="180" show-overflow-tooltip prop="content" />
                    </el-table>
                </div>

                <el-row :gutter="12" class="preview-section">
                    <el-col :xs="24" :md="12">
                        <div class="preview-section__title">跳过原因</div>
                        <el-table :data="skippedRows" stripe size="small">
                            <el-table-column label="原因" prop="reason" min-width="180" />
                            <el-table-column label="数量" prop="count" width="75" align="right" />
                        </el-table>
                        <el-empty v-if="!skippedRows.length" description="没有跳过项" :image-size="45" />
                    </el-col>
                    <el-col :xs="24" :md="12">
                        <div class="preview-section__title">脱敏受众样例</div>
                        <el-table :data="previewResult.samples" stripe size="small">
                            <el-table-column label="渠道" width="85">
                                <template #default="scope">{{ channelLabel(scope.row.channel) }}</template>
                            </el-table-column>
                            <el-table-column label="接收地址" prop="recipient_masked" min-width="130" />
                        </el-table>
                    </el-col>
                </el-row>

                <div class="apply-actions">
                    <span v-if="!canApply" class="form-hint">当前没有满足条件的可发送任务，不能确认发送。</span>
                    <el-button type="danger" :loading="applyLoading" :disabled="!canApply" @click="void apply()">
                        确认发送
                    </el-button>
                </div>
            </template>
            <el-empty v-else description="填写发送条件后生成预览" />

            <el-result
                v-if="applyResult"
                icon="success"
                title="通知请求已提交"
                :sub-title="`请求编号：${applyResult.request_id}；任务数：${applyResult.task_count}`">
                <template #extra>
                    <el-button type="primary" @click="openRequest">查看通知请求</el-button>
                </template>
            </el-result>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.notification-send-page {
    display: flex;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    padding: 12px;
    overflow-x: hidden;
    overflow-y: auto;
    box-sizing: border-box;
    background: var(--el-bg-color-page);
}

.notification-send-page > :deep(.el-alert) {
    flex: 0 0 auto;
    margin-bottom: 10px;
}

.page-header,
.section-header,
.preview-meta,
.form-actions,
.apply-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.page-header {
    margin-bottom: 10px;
    padding: 10px 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    background: var(--el-fill-color-blank);
}

.page-header__summary {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 4px;
}

.page-header__title {
    color: var(--el-text-color-primary);
    font-size: 14px;
    font-weight: 500;
}

.page-header__hint {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.send-layout {
    margin-top: 10px;
}

.section-card {
    height: auto;
    width: 100%;
}

.send-layout .el-col {
    display: flex;
}

.section-card :deep(.el-card__header) {
    padding: 14px 16px;
}

.section-card :deep(.el-card__body) {
    padding: 0 16px 14px;
}

.send-form :deep(.el-form-item) {
    margin-bottom: 12px;
}

.form-hint {
    margin-top: 4px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 18px;
}

.template-hint {
    margin: -2px 0 8px;
}

.form-validation-alert {
    margin-top: 12px;
}

.subsection-title,
.preview-section__title {
    margin: 14px 0 8px;
    color: var(--el-text-color-primary);
    font-size: 14px;
    font-weight: 600;
}

.template-selector-list {
    display: grid;
    gap: 8px;
}

.template-selector {
    padding: 8px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    background: var(--el-fill-color-lighter);
}

.template-selector__label {
    margin-bottom: 6px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.template-selector__selected {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
    background: var(--el-fill-color-blank);
    color: var(--el-text-color-primary);
    font-size: 13px;
}

.template-selector__content {
    display: grid;
    gap: 4px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--el-border-color-lighter);
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 18px;
    overflow-wrap: anywhere;
}

.template-selector__content-label {
    color: var(--el-text-color-primary);
    font-weight: 500;
}

.parameter-empty-hint {
    margin: -2px 0 8px;
}

.template-selector :deep(.el-option) small {
    display: block;
    overflow: hidden;
    color: var(--el-text-color-secondary);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.target-card__actions {
    display: flex;
    justify-content: flex-end;
    margin-top: -4px;
}

.send-form :deep(textarea) {
    font-family: var(--el-font-family);
}

.form-actions {
    justify-content: flex-start;
    margin-top: 6px;
}

.preview-dialog :deep(.el-dialog__body) {
    max-height: calc(100vh - 160px);
    padding-top: 0;
    overflow-y: auto;
}

.metric-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-top: 12px;
}

.metric-item {
    padding: 10px;
    border-radius: 6px;
    background: var(--el-fill-color-light);
}

.metric-item span,
.metric-item strong {
    display: block;
}

.metric-item span {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.metric-item strong {
    margin-top: 4px;
    color: var(--el-text-color-primary);
    font-size: 24px;
}

.metric-item--success strong {
    color: var(--el-color-success);
}

.metric-item--warning strong {
    color: var(--el-color-warning);
}

.preview-meta {
    justify-content: flex-start;
    margin-top: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.preview-section {
    margin-top: 12px;
}

.preview-section__title {
    margin-top: 0;
    font-size: 13px;
}

.apply-actions {
    justify-content: flex-end;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--el-border-color-lighter);
}

@media (max-width: 900px) {
    .target-card {
        margin-top: 12px;
    }
}

@media (max-width: 600px) {
    .page-header,
    .preview-meta,
    .apply-actions {
        align-items: flex-start;
        flex-direction: column;
    }

    .page-header__summary {
        width: 100%;
    }

    .send-form .el-row .el-col {
        max-width: 100%;
        flex: 0 0 100%;
    }

    .metric-grid {
        grid-template-columns: 1fr;
    }
}
</style>
