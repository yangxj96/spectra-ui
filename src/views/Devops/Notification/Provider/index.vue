<script setup lang="ts">
import { Refresh } from "@element-plus/icons-vue";
import { computed, onMounted, reactive, ref } from "vue";

import { NotificationAdminApi } from "@/api/notification/notification-admin-api.ts";
import { NotificationProviderApi } from "@/api/notification/notification-provider-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

type ExternalChannel = Exclude<NotificationAdminChannel, "IN_APP">;

interface ProviderEditor {
    provider_type: Exclude<NotificationProviderType, "IN_APP">;
    enabled: boolean;
    endpoint: string;
    port: number;
    region: string;
    credential_id: string;
    app_id: string;
    sign_name: string;
    sender_address: string;
    sender_name: string;
    ssl_enabled: boolean;
    starttls_enabled: boolean;
    timeout_ms: number;
    rate_limit_per_second: number;
    max_attempts: number;
    template_code: string;
    template_parameter_order: string;
    secret: string;
    clear_secret: boolean;
}

const channelLabels: Record<NotificationAdminChannel, string> = {
    IN_APP: "站内信",
    SMS: "短信",
    EMAIL: "邮件"
};

const stateLabels: Record<NotificationProviderState, string> = {
    NOT_CONFIGURED: "未配置",
    DISABLED: "已禁用",
    HEALTHY: "健康",
    UNHEALTHY: "未健康检查",
    BLOCKED: "已阻断"
};

const providerTypeLabels: Record<string, string> = {
    IN_APP: "系统内置收件箱",
    ALIYUN_SMS: "阿里云短信",
    TENCENT_SMS: "腾讯云短信",
    SMTP: "SMTP 邮件",
    HTTP_JSON: "通用 HTTP JSON",
    MOCK: "模拟服务（仅测试）"
};

const smsProviderTypes = ["ALIYUN_SMS", "TENCENT_SMS", "HTTP_JSON", "MOCK"] as const;
const emailProviderTypes = ["SMTP", "HTTP_JSON", "MOCK"] as const;

const testStatusLabels: Record<string, string> = {
    SENT: "已发送",
    FAILED: "失败",
    BLOCKED: "已阻断",
    UNKNOWN: "未知"
};

const reasonLabels: Record<string, string> = {
    IN_APP_READY: "站内信由系统内置投递",
    PROVIDER_NOT_CONFIGURED: "尚未选择外部渠道服务",
    DISABLED_BY_CONFIGURATION: "已被配置为禁用",
    HEALTH_CHECK_REQUIRED: "保存配置后需要执行健康检查",
    SECRET_NOT_CONFIGURED: "尚未配置密钥",
    SECRET_UNAVAILABLE: "密钥无法解密，已阻断",
    PROVIDER_CONFIGURATION_INVALID: "渠道服务配置不完整或不合法",
    PROVIDER_NOT_REGISTERED: "当前运行环境未注册该渠道服务",
    HEALTH_CHECK_OK: "健康检查通过",
    HEALTH_CHECK_UNAVAILABLE: "渠道服务地址不可达",
    HEALTH_CHECK_HTTP_400: "渠道服务健康检查返回 HTTP 400",
    HEALTH_CHECK_HTTP_401: "渠道服务健康检查返回 HTTP 401",
    HEALTH_CHECK_HTTP_403: "渠道服务健康检查返回 HTTP 403",
    HEALTH_CHECK_INVALID_RESPONSE: "渠道服务返回了无效响应",
    MODULE_DISABLED: "通知模块已关闭",
    MOCK_PROVIDER_READY: "内置模拟服务已就绪",
    HEALTH_CHECK_PROVIDER_REJECTED: "供应商拒绝健康检查请求"
};

const providers = ref<NotificationProviderVO[]>([]);
const overview = ref<NotificationOverviewVO>();
const providerColumns = computed<NotificationProviderVO[][]>(() => {
    const columns: NotificationProviderVO[][] = [[], []];
    providers.value.forEach((provider, index) => {
        columns[index % 2]!.push(provider);
    });
    return columns.filter(column => column.length > 0);
});
const loading = ref(false);
const savingChannel = ref<ExternalChannel>();
const healthChannel = ref<ExternalChannel>();
const testChannel = ref<ExternalChannel>();
const testSending = ref(false);
const testDialogVisible = ref(false);
const testResult = ref<NotificationProviderTestVO>();
const errorMessage = ref("");
const lastHealthAt = reactive<Partial<Record<ExternalChannel, string>>>({});
const testForm = reactive<NotificationProviderTestParams>({
    recipient_address: "",
    title: "Spectra 渠道测试消息",
    content: "这是一条通知渠道测试消息，请确认渠道配置和投递结果。",
    confirmation: ""
});
const editors = reactive<Record<ExternalChannel, ProviderEditor>>({
    SMS: createEditor(),
    EMAIL: createEditor()
});

function createEditor(): ProviderEditor {
    return {
        provider_type: "MOCK",
        enabled: false,
        endpoint: "",
        port: 587,
        region: "",
        credential_id: "",
        app_id: "",
        sign_name: "",
        sender_address: "",
        sender_name: "",
        ssl_enabled: false,
        starttls_enabled: true,
        timeout_ms: 5000,
        rate_limit_per_second: 10,
        max_attempts: 3,
        template_code: "",
        template_parameter_order: "",
        secret: "",
        clear_secret: false
    };
}

function channelLabel(channel: NotificationAdminChannel): string {
    return channelLabels[channel] ?? channel;
}

function stateLabel(state: NotificationProviderState): string {
    return stateLabels[state] ?? state;
}

function providerTypeLabel(providerType: string | null | undefined): string {
    return providerTypeLabels[providerType ?? ""] ?? providerType ?? "尚未选择渠道服务";
}

function testStatusLabel(status: string): string {
    return testStatusLabels[status] ?? status;
}

function stateTagType(state: NotificationProviderState): "success" | "warning" | "danger" | "info" {
    if (state === "HEALTHY") return "success";
    if (state === "UNHEALTHY") return "warning";
    if (state === "BLOCKED") return "danger";
    return "info";
}

function reasonLabel(reason: string | null | undefined): string {
    if (!reason) return "—";
    return reasonLabels[reason] ?? reason;
}

function providerEditorDirty(provider: NotificationProviderVO): boolean {
    if (provider.channel === "IN_APP") return false;
    const form = editor(provider.channel);
    if (provider.state === "NOT_CONFIGURED") return true;
    return (
        form.provider_type !== (provider.provider_type ?? "MOCK") ||
        form.enabled !== provider.enabled ||
        form.endpoint !== (provider.endpoint ?? "") ||
        form.port !== provider.port ||
        form.region !== (provider.region ?? "") ||
        form.credential_id !== (provider.credential_id ?? "") ||
        form.app_id !== (provider.app_id ?? "") ||
        form.sign_name !== (provider.sign_name ?? "") ||
        form.sender_address !== (provider.sender_address ?? "") ||
        form.sender_name !== (provider.sender_name ?? "") ||
        form.ssl_enabled !== provider.ssl_enabled ||
        form.starttls_enabled !== provider.starttls_enabled ||
        form.timeout_ms !== provider.timeout_ms ||
        form.rate_limit_per_second !== provider.rate_limit_per_second ||
        form.max_attempts !== provider.max_attempts ||
        form.template_code !== (provider.template_code ?? "") ||
        form.template_parameter_order !== (provider.template_parameter_order ?? "") ||
        form.secret.trim() !== "" ||
        form.clear_secret
    );
}

function displayedProviderType(provider: NotificationProviderVO): string | null | undefined {
    if (provider.channel === "IN_APP") return provider.provider_type;
    return providerEditorDirty(provider) ? editor(provider.channel).provider_type : provider.provider_type;
}

function editor(channel: ExternalChannel): ProviderEditor {
    return editors[channel];
}

function providerOptions(channel: ExternalChannel): readonly string[] {
    return channel === "SMS" ? smsProviderTypes : emailProviderTypes;
}

function isSmsProvider(form: ProviderEditor): boolean {
    return form.provider_type === "ALIYUN_SMS" || form.provider_type === "TENCENT_SMS";
}

function isSmtpProvider(form: ProviderEditor): boolean {
    return form.provider_type === "SMTP";
}

function isHttpProvider(form: ProviderEditor): boolean {
    return form.provider_type === "HTTP_JSON";
}

function isMockProvider(form: ProviderEditor): boolean {
    return form.provider_type === "MOCK";
}

function credentialLabel(form: ProviderEditor): string {
    if (form.provider_type === "ALIYUN_SMS") return "AccessKey ID";
    if (form.provider_type === "TENCENT_SMS") return "SecretId";
    if (form.provider_type === "SMTP") return "SMTP 用户名";
    return "接入凭据标识（可选）";
}

function secretLabel(form: ProviderEditor): string {
    if (form.provider_type === "ALIYUN_SMS") return "AccessKey Secret";
    if (form.provider_type === "TENCENT_SMS") return "SecretKey";
    if (form.provider_type === "SMTP") return "SMTP 密码或应用专用密码";
    return "访问密钥（只覆盖更新，不回显）";
}

function endpointLabel(form: ProviderEditor): string {
    if (isSmtpProvider(form)) return "SMTP 主机";
    if (isHttpProvider(form)) return "HTTP 端点";
    return "API 端点（可选）";
}

function endpointPlaceholder(form: ProviderEditor): string {
    if (form.provider_type === "ALIYUN_SMS") return "留空使用 dysmsapi.aliyuncs.com";
    if (form.provider_type === "TENCENT_SMS") return "留空使用 sms.tencentcloudapi.com";
    if (form.provider_type === "SMTP") return "smtp.example.com";
    return "https://provider.example/api/send";
}

function providerDescription(form: ProviderEditor): string {
    if (form.provider_type === "ALIYUN_SMS") {
        return "需要阿里云 AccessKey、已审核短信签名和 TemplateCode；模板参数按名称发送。";
    }
    if (form.provider_type === "TENCENT_SMS") {
        return "需要腾讯云 SecretId/SecretKey、SmsSdkAppId、已审核签名和 TemplateId；参数按下方顺序发送。";
    }
    if (form.provider_type === "SMTP") {
        return "邮件通过 SMTP 投递，465 通常使用隐式 SSL，587 通常使用 STARTTLS。密码不会回显。";
    }
    if (form.provider_type === "HTTP_JSON") {
        return "适合接入内部短信/邮件网关；服务端会发送标准 JSON，不建议把第三方密钥直接放在浏览器。";
    }
    return "内置模拟服务不访问第三方，只在服务端日志输出脱敏发送信息，并继续写入真实投递结果。";
}

function providerTypeChanged(channel: ExternalChannel): void {
    const form = editor(channel);
    form.endpoint = "";
    form.port = form.provider_type === "SMTP" ? 587 : 0;
    form.region = "";
    form.credential_id = "";
    form.app_id = "";
    form.sign_name = "";
    form.sender_address = "";
    form.sender_name = "";
    form.ssl_enabled = false;
    form.starttls_enabled = form.provider_type === "SMTP";
    form.template_code = "";
    form.template_parameter_order = "";
    form.secret = "";
    form.clear_secret = false;
}

function overviewChannel(channel: NotificationAdminChannel): NotificationOverviewChannelSummary | undefined {
    return overview.value?.channels.find(item => item.availability.channel === channel);
}

function syncEditor(provider: NotificationProviderVO): void {
    if (provider.channel === "IN_APP") return;
    const isMockProviderType = provider.provider_type === "MOCK";
    editors[provider.channel] = {
        provider_type: providerOptions(provider.channel).includes(provider.provider_type as never)
            ? (provider.provider_type as ProviderEditor["provider_type"])
            : "MOCK",
        enabled: provider.enabled,
        endpoint: provider.endpoint ?? "",
        port: provider.port || (provider.provider_type === "SMTP" ? 587 : 0),
        region: provider.region ?? "",
        credential_id: provider.credential_id ?? "",
        app_id: provider.app_id ?? "",
        sign_name: provider.sign_name ?? "",
        sender_address: provider.sender_address ?? "",
        sender_name: provider.sender_name ?? "",
        ssl_enabled: provider.ssl_enabled ?? false,
        starttls_enabled: provider.starttls_enabled ?? false,
        timeout_ms: isMockProviderType ? 0 : provider.timeout_ms || 5000,
        rate_limit_per_second: isMockProviderType ? 0 : provider.rate_limit_per_second || 10,
        max_attempts: isMockProviderType ? 1 : provider.max_attempts || 3,
        template_code: provider.template_code ?? "",
        template_parameter_order: provider.template_parameter_order ?? "",
        secret: "",
        clear_secret: false
    };
}

async function loadData(): Promise<void> {
    loading.value = true;
    try {
        const [providerData, overviewData] = await Promise.all([
            NotificationProviderApi.list(),
            NotificationAdminApi.overview(24, { loading: false })
        ]);
        providers.value = providerData;
        overview.value = overviewData;
        providerData.forEach(provider => {
            syncEditor(provider);
            if (provider.channel === "SMS" || provider.channel === "EMAIL") {
                if (provider.checked_at) {
                    lastHealthAt[provider.channel] = provider.checked_at;
                } else {
                    delete lastHealthAt[provider.channel];
                }
            }
        });
        errorMessage.value = "";
    } catch {
        errorMessage.value = "通知渠道配置加载失败，当前保留上一次成功数据。";
        if (providers.value.length === 0) MessageUtils.error(errorMessage.value);
    } finally {
        loading.value = false;
    }
}

function validateEditor(channel: ExternalChannel, form: ProviderEditor): boolean {
    if (isHttpProvider(form) && !form.endpoint.trim()) {
        MessageUtils.error(`${channelLabel(channel)} 的 HTTP 端点不能为空。`);
        return false;
    }
    if (isSmsProvider(form) && !form.credential_id.trim()) {
        MessageUtils.error(`${providerTypeLabel(form.provider_type)}必须填写凭据标识。`);
        return false;
    }
    if (form.provider_type === "ALIYUN_SMS" && (!form.sign_name.trim() || !form.template_code.trim())) {
        MessageUtils.error("阿里云短信必须填写已审核的短信签名和 TemplateCode。 ");
        return false;
    }
    if (
        form.provider_type === "TENCENT_SMS" &&
        (!form.app_id.trim() || !form.sign_name.trim() || !form.template_code.trim())
    ) {
        MessageUtils.error("腾讯云短信必须填写 SmsSdkAppId、已审核签名和 TemplateId。 ");
        return false;
    }
    if (isSmtpProvider(form) && (!form.endpoint.trim() || !form.credential_id.trim() || !form.sender_address.trim())) {
        MessageUtils.error("SMTP 必须填写主机、用户名和发件地址。 ");
        return false;
    }
    if (isSmtpProvider(form) && form.ssl_enabled && form.starttls_enabled) {
        MessageUtils.error("SMTP 不能同时启用隐式 SSL 和 STARTTLS。 ");
        return false;
    }
    if (form.clear_secret && form.secret.trim()) {
        MessageUtils.error("清除密钥时不能同时填写新的密钥。");
        return false;
    }
    return true;
}

async function saveProvider(channel: ExternalChannel): Promise<void> {
    const form = editor(channel);
    if (!validateEditor(channel, form)) return;
    try {
        await MessageUtils.box.confirm(
            `确定保存${channelLabel(channel)}渠道服务配置吗？密钥只会覆盖或清除，不会回显旧值。`,
            "保存渠道配置"
        );
    } catch {
        return;
    }
    savingChannel.value = channel;
    try {
        const result = await NotificationProviderApi.save(channel, {
            provider_type: form.provider_type,
            enabled: form.enabled,
            endpoint: form.endpoint.trim(),
            port: form.port,
            region: form.region.trim(),
            credential_id: form.credential_id.trim(),
            app_id: form.app_id.trim(),
            sign_name: form.sign_name.trim(),
            sender_address: form.sender_address.trim(),
            sender_name: form.sender_name.trim(),
            ssl_enabled: form.ssl_enabled,
            starttls_enabled: form.starttls_enabled,
            timeout_ms: form.timeout_ms,
            rate_limit_per_second: form.rate_limit_per_second,
            max_attempts: form.max_attempts,
            template_code: form.template_code.trim(),
            template_parameter_order: form.template_parameter_order.trim(),
            secret: form.secret.trim() || undefined,
            clear_secret: form.clear_secret
        });
        const index = providers.value.findIndex(item => item.channel === channel);
        if (index >= 0) providers.value[index] = result;
        syncEditor(result);
        if (result.checked_at) {
            lastHealthAt[channel] = result.checked_at;
        } else {
            delete lastHealthAt[channel];
        }
        MessageUtils.success(`${channelLabel(channel)}渠道服务配置已保存，请执行健康检查后再发送。`);
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "渠道服务配置保存失败");
    } finally {
        savingChannel.value = undefined;
    }
}

async function checkHealth(channel: ExternalChannel): Promise<void> {
    const provider = providers.value.find(item => item.channel === channel);
    if (provider && providerEditorDirty(provider)) {
        MessageUtils.warning("当前渠道服务配置尚未保存，请先点击“保存配置”，再执行健康检查。 ");
        return;
    }
    healthChannel.value = channel;
    try {
        const result = await NotificationProviderApi.health(channel);
        const provider = providers.value.find(item => item.channel === channel);
        if (provider) {
            provider.state = result.state;
            provider.reason = result.reason;
            provider.checked_at = result.checked_at;
        }
        lastHealthAt[channel] = result.checked_at;
        if (result.state === "HEALTHY") {
            MessageUtils.success(`${channelLabel(channel)} 健康检查通过。`);
        } else {
            MessageUtils.warning(`${channelLabel(channel)} 未通过健康检查：${reasonLabel(result.reason)}`);
        }
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "渠道服务健康检查失败");
    } finally {
        healthChannel.value = undefined;
    }
}

function healthTime(channel: ExternalChannel): string {
    return lastHealthAt[channel] ? formatDateTime(lastHealthAt[channel]) : "尚未检查";
}

function clearTestForm(): void {
    testForm.recipient_address = "";
    testForm.title = "Spectra 渠道测试消息";
    testForm.content = "这是一条通知渠道测试消息，请确认渠道配置和投递结果。";
    testForm.confirmation = "";
    testResult.value = undefined;
    testChannel.value = undefined;
}

function openTestDialog(channel: ExternalChannel): void {
    testChannel.value = channel;
    testResult.value = undefined;
    testForm.recipient_address = "";
    testForm.confirmation = "";
    testDialogVisible.value = true;
}

async function submitTest(): Promise<void> {
    const channel = testChannel.value;
    if (!channel) return;
    if (!testForm.recipient_address.trim()) {
        MessageUtils.notify.error("请输入明确的测试收件地址。", "测试发送");
        return;
    }
    if (!testForm.title.trim() || !testForm.content.trim()) {
        MessageUtils.notify.error("测试标题和正文不能为空。", "测试发送");
        return;
    }
    if (testForm.confirmation !== "SEND_TEST") {
        MessageUtils.notify.error("请输入确认词 SEND_TEST 后再发送。", "测试发送");
        return;
    }
    try {
        await MessageUtils.box.confirm(
            `将向你填写的${channelLabel(channel)}测试地址发送一条真实渠道测试消息，继续吗？`,
            "确认测试发送"
        );
    } catch {
        return;
    }
    testSending.value = true;
    try {
        testResult.value = await NotificationProviderApi.test(channel, {
            recipient_address: testForm.recipient_address.trim(),
            title: testForm.title.trim(),
            content: testForm.content.trim(),
            confirmation: testForm.confirmation
        });
        if (testResult.value.status === "SENT") {
            MessageUtils.notify.success("渠道测试发送已返回成功结果。", "测试发送");
        } else {
            MessageUtils.notify.warning(`渠道测试发送结果：${testStatusLabel(testResult.value.status)}`, "测试发送");
        }
    } catch (error) {
        MessageUtils.notify.error(error instanceof Error ? error.message : "渠道测试发送失败", "测试发送");
    } finally {
        testSending.value = false;
        testForm.recipient_address = "";
        testForm.confirmation = "";
    }
}

onMounted(() => {
    void loadData();
});
</script>

<template>
    <div v-loading="loading" class="provider-page">
        <div class="provider-toolbar">
            <div class="provider-toolbar__summary">
                <span class="provider-toolbar__title">渠道配置</span>
                <span class="provider-toolbar__hint">配置外部通知渠道并执行健康检查</span>
            </div>
            <el-button :loading="loading" @click="void loadData()">
                <el-icon><Refresh /></el-icon>
                刷新
            </el-button>
        </div>

        <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

        <div v-if="overview" class="summary-grid">
            <el-card shadow="never" class="summary-card">
                <span>窗口成功投递</span>
                <strong class="summary-card__success">{{ overview.successful_delivery_count }}</strong>
                <small>最近 24 小时</small>
            </el-card>
            <el-card shadow="never" class="summary-card">
                <span>窗口失败投递</span>
                <strong class="summary-card__danger">{{ overview.failed_delivery_count }}</strong>
                <small>失败与阻断结果</small>
            </el-card>
            <el-card shadow="never" class="summary-card">
                <span>窗口未知状态</span>
                <strong class="summary-card__warning">{{ overview.unknown_delivery_count }}</strong>
                <small>需要人工确认</small>
            </el-card>
            <el-card shadow="never" class="summary-card">
                <span>当前待处理</span>
                <strong>{{ overview.pending_task_count }}</strong>
                <small>所有通知渠道</small>
            </el-card>
        </div>

        <div v-if="providers.length" class="provider-grid">
            <div
                v-for="(column, columnIndex) in providerColumns"
                :key="`provider-column-${columnIndex}`"
                class="provider-column">
                <el-card v-for="provider in column" :key="provider.channel" shadow="never" class="provider-card">
                    <template #header>
                        <div class="provider-card__header">
                            <div>
                                <h3>{{ channelLabel(provider.channel) }}</h3>
                                <p>{{ providerTypeLabel(displayedProviderType(provider)) }}</p>
                            </div>
                            <el-tag :type="stateTagType(provider.state)">{{ stateLabel(provider.state) }}</el-tag>
                        </div>
                    </template>

                    <el-alert
                        :title="
                            providerEditorDirty(provider)
                                ? '当前渠道服务配置尚未保存，请先点击保存配置。'
                                : reasonLabel(provider.reason)
                        "
                        :type="
                            providerEditorDirty(provider)
                                ? 'warning'
                                : provider.state === 'HEALTHY'
                                  ? 'success'
                                  : provider.state === 'BLOCKED'
                                    ? 'error'
                                    : 'warning'
                        "
                        show-icon
                        :closable="false" />

                    <template v-if="provider.channel === 'IN_APP'">
                        <el-descriptions :column="1" border class="readonly-descriptions">
                            <el-descriptions-item label="投递方式">系统内置收件箱</el-descriptions-item>
                            <el-descriptions-item label="运行状态">由通知 Worker 负责幂等写入</el-descriptions-item>
                            <el-descriptions-item label="当前积压">
                                {{ overviewChannel(provider.channel)?.pending_task_count ?? 0 }}
                            </el-descriptions-item>
                        </el-descriptions>
                    </template>

                    <template v-else>
                        <el-form :model="editor(provider.channel)" label-position="top" class="provider-form">
                            <el-row :gutter="12">
                                <el-col :span="12">
                                    <el-form-item label="渠道服务类型">
                                        <el-select
                                            v-model="editor(provider.channel).provider_type"
                                            style="width: 100%"
                                            @change="providerTypeChanged(provider.channel)">
                                            <el-option
                                                v-for="type in providerOptions(provider.channel)"
                                                :key="type"
                                                :label="providerTypeLabel(type)"
                                                :value="type" />
                                        </el-select>
                                    </el-form-item>
                                </el-col>
                                <el-col :span="12">
                                    <el-form-item label="启用状态">
                                        <el-switch
                                            v-model="editor(provider.channel).enabled"
                                            active-text="启用"
                                            inactive-text="停用" />
                                    </el-form-item>
                                </el-col>
                            </el-row>
                            <el-alert
                                :title="providerDescription(editor(provider.channel))"
                                type="info"
                                show-icon
                                :closable="false"
                                class="provider-description" />
                            <el-form-item
                                v-if="!isMockProvider(editor(provider.channel))"
                                :label="endpointLabel(editor(provider.channel))">
                                <el-input
                                    v-model="editor(provider.channel).endpoint"
                                    :placeholder="endpointPlaceholder(editor(provider.channel))" />
                            </el-form-item>
                            <el-row
                                v-if="
                                    !isMockProvider(editor(provider.channel)) &&
                                    !isHttpProvider(editor(provider.channel))
                                "
                                :gutter="12">
                                <el-col :span="12">
                                    <el-form-item v-if="isSmtpProvider(editor(provider.channel))" label="SMTP 端口">
                                        <el-input-number
                                            v-model="editor(provider.channel).port"
                                            :min="1"
                                            :max="65535"
                                            style="width: 100%" />
                                    </el-form-item>
                                    <el-form-item v-else label="云服务地域">
                                        <el-input
                                            v-model="editor(provider.channel).region"
                                            placeholder="例如 cn-hangzhou / ap-guangzhou" />
                                    </el-form-item>
                                </el-col>
                                <el-col :span="12">
                                    <el-form-item :label="credentialLabel(editor(provider.channel))">
                                        <el-input
                                            v-model="editor(provider.channel).credential_id"
                                            autocomplete="off"
                                            :placeholder="
                                                isSmtpProvider(editor(provider.channel))
                                                    ? 'SMTP 登录用户名'
                                                    : '仅填写标识，不要填写 Secret'
                                            " />
                                    </el-form-item>
                                </el-col>
                            </el-row>
                            <el-row v-if="isSmsProvider(editor(provider.channel))" :gutter="12">
                                <el-col :span="12">
                                    <el-form-item label="已审核短信签名">
                                        <el-input
                                            v-model="editor(provider.channel).sign_name"
                                            placeholder="例如 Spectra" />
                                    </el-form-item>
                                </el-col>
                                <el-col :span="12">
                                    <el-form-item
                                        :label="
                                            editor(provider.channel).provider_type === 'TENCENT_SMS'
                                                ? 'TemplateId'
                                                : 'TemplateCode'
                                        ">
                                        <el-input
                                            v-model="editor(provider.channel).template_code"
                                            placeholder="供应商控制台已审核模板编码" />
                                    </el-form-item>
                                </el-col>
                            </el-row>
                            <el-form-item
                                v-if="editor(provider.channel).provider_type === 'TENCENT_SMS'"
                                label="SmsSdkAppId">
                                <el-input
                                    v-model="editor(provider.channel).app_id"
                                    placeholder="腾讯云短信应用的 SDK AppID" />
                            </el-form-item>
                            <el-form-item
                                v-if="editor(provider.channel).provider_type === 'TENCENT_SMS'"
                                label="模板参数顺序">
                                <el-input
                                    v-model="editor(provider.channel).template_parameter_order"
                                    placeholder="按腾讯模板占位参数顺序填写，例如 code,userName" />
                            </el-form-item>
                            <template v-if="isSmtpProvider(editor(provider.channel))">
                                <el-row :gutter="12">
                                    <el-col :span="12">
                                        <el-form-item label="发件地址">
                                            <el-input
                                                v-model="editor(provider.channel).sender_address"
                                                placeholder="no-reply@example.com" />
                                        </el-form-item>
                                    </el-col>
                                    <el-col :span="12">
                                        <el-form-item label="发件人名称">
                                            <el-input
                                                v-model="editor(provider.channel).sender_name"
                                                placeholder="Spectra 通知中心" />
                                        </el-form-item>
                                    </el-col>
                                </el-row>
                                <div class="smtp-options">
                                    <el-checkbox v-model="editor(provider.channel).ssl_enabled">
                                        隐式 SSL（通常 465）
                                    </el-checkbox>
                                    <el-checkbox v-model="editor(provider.channel).starttls_enabled">
                                        STARTTLS（通常 587）
                                    </el-checkbox>
                                </div>
                            </template>
                            <el-row v-if="!isMockProvider(editor(provider.channel))" :gutter="12">
                                <el-col :span="8">
                                    <el-form-item label="超时（毫秒）">
                                        <el-input-number
                                            v-model="editor(provider.channel).timeout_ms"
                                            :min="100"
                                            :max="30000" />
                                    </el-form-item>
                                </el-col>
                                <el-col :span="8">
                                    <el-form-item label="每秒限流">
                                        <el-input-number
                                            v-model="editor(provider.channel).rate_limit_per_second"
                                            :min="1"
                                            :max="10000" />
                                    </el-form-item>
                                </el-col>
                                <el-col :span="8">
                                    <el-form-item label="最大尝试次数">
                                        <el-input-number
                                            v-model="editor(provider.channel).max_attempts"
                                            :min="1"
                                            :max="5" />
                                    </el-form-item>
                                </el-col>
                            </el-row>
                            <el-form-item
                                v-if="!isMockProvider(editor(provider.channel))"
                                :label="secretLabel(editor(provider.channel))">
                                <el-input
                                    v-model="editor(provider.channel).secret"
                                    type="password"
                                    show-password
                                    autocomplete="new-password"
                                    placeholder="留空表示保持当前凭据" />
                            </el-form-item>
                            <div v-if="!isMockProvider(editor(provider.channel))" class="secret-status">
                                <span>
                                    凭据：{{ provider.secret_configured ? "已配置" : "未配置" }}
                                    <template v-if="provider.secret_key_id">（{{ provider.secret_key_id }}）</template>
                                </span>
                                <el-checkbox v-model="editor(provider.channel).clear_secret">清除当前密钥</el-checkbox>
                            </div>
                            <div class="provider-actions">
                                <el-button
                                    v-permission="'notification:provider:configure'"
                                    :loading="healthChannel === provider.channel"
                                    @click="void checkHealth(provider.channel)">
                                    健康检查
                                </el-button>
                                <el-button
                                    v-permission="'notification:provider:configure'"
                                    :disabled="provider.state !== 'HEALTHY'"
                                    @click="openTestDialog(provider.channel)">
                                    测试发送
                                </el-button>
                                <el-button
                                    v-permission="'notification:provider:configure'"
                                    type="primary"
                                    :loading="savingChannel === provider.channel"
                                    @click="void saveProvider(provider.channel)">
                                    保存配置
                                </el-button>
                            </div>
                            <div class="health-time">最近健康检查：{{ healthTime(provider.channel) }}</div>
                        </el-form>
                    </template>

                    <div v-if="overviewChannel(provider.channel)" class="channel-summary">
                        <span>待处理 {{ overviewChannel(provider.channel)?.pending_task_count ?? 0 }}</span>
                        <span>失败 {{ overviewChannel(provider.channel)?.failed_task_count ?? 0 }}</span>
                        <span>未知状态 {{ overviewChannel(provider.channel)?.unknown_task_count ?? 0 }}</span>
                    </div>
                </el-card>
            </div>
        </div>
        <el-empty v-else-if="!loading" description="暂无渠道配置" />

        <el-dialog
            v-model="testDialogVisible"
            :title="`${testChannel ? channelLabel(testChannel) : ''} 渠道测试发送`"
            width="560px"
            destroy-on-close
            @closed="clearTestForm">
            <el-alert
                title="仅填写你明确控制的测试地址；测试地址不会从用户数据中推导，也不会写入业务通知记录。"
                type="warning"
                show-icon
                :closable="false"
                class="test-alert" />
            <el-form :model="testForm" label-position="top" class="test-form">
                <el-form-item label="测试收件地址">
                    <el-input
                        v-model="testForm.recipient_address"
                        :placeholder="testChannel === 'SMS' ? '+8613800138000' : 'test@example.com'"
                        autocomplete="off" />
                </el-form-item>
                <el-form-item label="测试标题">
                    <el-input v-model="testForm.title" maxlength="200" show-word-limit />
                </el-form-item>
                <el-form-item label="测试正文">
                    <el-input v-model="testForm.content" type="textarea" :rows="4" maxlength="2000" show-word-limit />
                </el-form-item>
                <el-form-item label="确认词">
                    <el-input v-model="testForm.confirmation" placeholder="请输入 SEND_TEST" autocomplete="off" />
                </el-form-item>
            </el-form>
            <el-alert
                v-if="testResult"
                :title="`结果：${testStatusLabel(testResult.status)}`"
                :type="testResult.status === 'SENT' ? 'success' : 'error'"
                show-icon
                :closable="false">
                <template #default>
                    <div>渠道服务：{{ testResult.provider_code }}</div>
                    <div v-if="testResult.provider_message_id">消息编号：{{ testResult.provider_message_id }}</div>
                    <div v-if="testResult.summary">摘要：{{ testResult.summary }}</div>
                </template>
            </el-alert>
            <template #footer>
                <el-button @click="testDialogVisible = false">关闭</el-button>
                <el-button type="primary" :loading="testSending" @click="void submitTest()">发送测试消息</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.provider-page {
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

.provider-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-bottom: 10px;
    padding: 10px 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    background: var(--el-fill-color-blank);
}

.provider-page > :deep(.el-alert) {
    flex: 0 0 auto;
    margin-bottom: 10px;
}

.provider-toolbar__summary {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 4px;
}

.provider-toolbar__title {
    color: var(--el-text-color-primary);
    font-size: 14px;
    font-weight: 500;
}

.provider-toolbar__hint {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.provider-card h3 {
    margin: 0;
    color: var(--el-text-color-primary);
}

.provider-card__header p {
    margin: 6px 0 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 10px;
}

.summary-card {
    min-height: 100px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.summary-card :deep(.el-card__body) {
    padding: 14px;
}

.summary-card span,
.summary-card small {
    color: var(--el-text-color-secondary);
}

.summary-card strong {
    color: var(--el-text-color-primary);
    font-size: 24px;
}

.summary-card__success {
    color: var(--el-color-success) !important;
}

.summary-card__danger {
    color: var(--el-color-danger) !important;
}

.summary-card__warning {
    color: var(--el-color-warning) !important;
}

.provider-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 10px;
}

.provider-column {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 10px;
}

.provider-card {
    height: auto;
    width: 100%;
}

.provider-card :deep(.el-card__header) {
    padding: 14px 16px;
}

.provider-card :deep(.el-card__body) {
    padding: 0 16px 14px;
}

.provider-card__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.provider-form {
    margin-top: 12px;
}

.provider-description {
    margin-bottom: 12px;
}

.provider-form :deep(.el-form-item) {
    margin-bottom: 12px;
}

.provider-form :deep(.el-input-number) {
    width: 100%;
}

.readonly-descriptions {
    margin-top: 12px;
}

.secret-status,
.smtp-options,
.provider-actions,
.channel-summary {
    display: flex;
    align-items: center;
    gap: 12px;
}

.smtp-options {
    flex-wrap: wrap;
    margin: -2px 0 12px;
}

.secret-status {
    justify-content: space-between;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.provider-actions {
    justify-content: flex-end;
    margin-top: 12px;
}

.health-time {
    margin-top: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    text-align: right;
}

.test-alert,
.test-form {
    margin-bottom: 12px;
}

.channel-summary {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--el-border-color-lighter);
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

@media (max-width: 900px) {
    .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .provider-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 600px) {
    .provider-toolbar {
        align-items: flex-start;
        flex-direction: column;
    }

    .provider-toolbar__summary {
        width: 100%;
    }

    .summary-grid {
        grid-template-columns: 1fr;
    }
}
</style>
