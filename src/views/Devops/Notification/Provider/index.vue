<script setup lang="ts">
import { Refresh } from "@element-plus/icons-vue";
import { onMounted, reactive, ref } from "vue";

import { NotificationAdminApi } from "@/api/notification/notification-admin-api.ts";
import { NotificationProviderApi } from "@/api/notification/notification-provider-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

type ExternalChannel = Exclude<NotificationAdminChannel, "IN_APP">;

interface ProviderEditor {
    provider_type: "HTTP_JSON" | "MOCK";
    enabled: boolean;
    endpoint: string;
    timeout_ms: number;
    rate_limit_per_second: number;
    max_attempts: number;
    template_code: string;
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
    HTTP_JSON: "通用 HTTP JSON",
    MOCK: "模拟服务（仅测试）"
};

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
    MODULE_DISABLED: "通知模块已关闭"
};

const providers = ref<NotificationProviderVO[]>([]);
const overview = ref<NotificationOverviewVO>();
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
        provider_type: "HTTP_JSON",
        enabled: false,
        endpoint: "",
        timeout_ms: 5000,
        rate_limit_per_second: 10,
        max_attempts: 3,
        template_code: "",
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

function editor(channel: ExternalChannel): ProviderEditor {
    return editors[channel];
}

function overviewChannel(channel: NotificationAdminChannel): NotificationOverviewChannelSummary | undefined {
    return overview.value?.channels.find(item => item.availability.channel === channel);
}

function syncEditor(provider: NotificationProviderVO): void {
    if (provider.channel === "IN_APP") return;
    editors[provider.channel] = {
        provider_type: provider.provider_type === "MOCK" ? "MOCK" : "HTTP_JSON",
        enabled: provider.enabled,
        endpoint: provider.endpoint ?? "",
        timeout_ms: provider.timeout_ms || 5000,
        rate_limit_per_second: provider.rate_limit_per_second || 10,
        max_attempts: provider.max_attempts || 3,
        template_code: provider.template_code ?? "",
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
        providerData.forEach(syncEditor);
        errorMessage.value = "";
    } catch {
        errorMessage.value = "通知渠道配置加载失败，当前保留上一次成功数据。";
        if (providers.value.length === 0) MessageUtils.error(errorMessage.value);
    } finally {
        loading.value = false;
    }
}

function validateEditor(channel: ExternalChannel, form: ProviderEditor): boolean {
    if (form.provider_type === "HTTP_JSON" && !form.endpoint.trim()) {
        MessageUtils.error(`${channelLabel(channel)} 渠道服务地址不能为空。`);
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
            timeout_ms: form.timeout_ms,
            rate_limit_per_second: form.rate_limit_per_second,
            max_attempts: form.max_attempts,
            template_code: form.template_code.trim(),
            secret: form.secret.trim() || undefined,
            clear_secret: form.clear_secret
        });
        const index = providers.value.findIndex(item => item.channel === channel);
        if (index >= 0) providers.value[index] = result;
        syncEditor(result);
        MessageUtils.success(`${channelLabel(channel)}渠道服务配置已保存，请执行健康检查后再发送。`);
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "渠道服务配置保存失败");
    } finally {
        savingChannel.value = undefined;
    }
}

async function checkHealth(channel: ExternalChannel): Promise<void> {
    healthChannel.value = channel;
    try {
        const result = await NotificationProviderApi.health(channel);
        const provider = providers.value.find(item => item.channel === channel);
        if (provider) {
            provider.state = result.state;
            provider.reason = result.reason;
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
        <div class="page-toolbar">
            <div>
                <h2>通知渠道配置</h2>
                <p>渠道服务配置属于单体系统全局配置；密钥不回显，渠道健康检查通过后才允许投递。</p>
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

        <el-row v-if="providers.length" :gutter="12" class="provider-grid">
            <el-col v-for="provider in providers" :key="provider.channel" :xs="24" :lg="12">
                <el-card shadow="never" class="provider-card">
                    <template #header>
                        <div class="provider-card__header">
                            <div>
                                <h3>{{ channelLabel(provider.channel) }}</h3>
                                <p>{{ providerTypeLabel(provider.provider_type) }}</p>
                            </div>
                            <el-tag :type="stateTagType(provider.state)">{{ stateLabel(provider.state) }}</el-tag>
                        </div>
                    </template>

                    <el-alert
                        :title="reasonLabel(provider.reason)"
                        :type="
                            provider.state === 'HEALTHY'
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
                                        <el-select v-model="editor(provider.channel).provider_type" style="width: 100%">
                                            <el-option label="通用 HTTP JSON" value="HTTP_JSON" />
                                            <el-option label="模拟服务（仅测试）" value="MOCK" />
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
                            <el-form-item label="HTTP 端点">
                                <el-input
                                    v-model="editor(provider.channel).endpoint"
                                    placeholder="https://provider.example/api/send"
                                    :disabled="editor(provider.channel).provider_type === 'MOCK'" />
                            </el-form-item>
                            <el-row :gutter="12">
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
                            <el-form-item label="供应商模板编码">
                                <el-input v-model="editor(provider.channel).template_code" placeholder="可选" />
                            </el-form-item>
                            <el-form-item label="密钥（只覆盖更新，不回显）">
                                <el-input
                                    v-model="editor(provider.channel).secret"
                                    type="password"
                                    show-password
                                    autocomplete="new-password"
                                    placeholder="留空表示保持当前密钥" />
                            </el-form-item>
                            <div class="secret-status">
                                <span>
                                    密钥：{{ provider.secret_configured ? "已配置" : "未配置" }}
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
            </el-col>
        </el-row>
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
    min-height: 100%;
    padding: 14px;
    overflow: auto;
    background: var(--el-bg-color-page);
}

.page-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
}

.page-toolbar h2,
.provider-card h3 {
    margin: 0;
    color: var(--el-text-color-primary);
}

.page-toolbar p,
.provider-card__header p {
    margin: 6px 0 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 12px;
}

.summary-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.summary-card span,
.summary-card small {
    color: var(--el-text-color-secondary);
}

.summary-card strong {
    color: var(--el-text-color-primary);
    font-size: 26px;
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
    margin-bottom: 12px;
}

.provider-card {
    height: 100%;
    margin-bottom: 12px;
}

.provider-card__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.provider-form {
    margin-top: 16px;
}

.provider-form :deep(.el-input-number) {
    width: 100%;
}

.readonly-descriptions {
    margin-top: 16px;
}

.secret-status,
.provider-actions,
.channel-summary {
    display: flex;
    align-items: center;
    gap: 12px;
}

.secret-status {
    justify-content: space-between;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.provider-actions {
    justify-content: flex-end;
    margin-top: 14px;
}

.health-time {
    margin-top: 10px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    text-align: right;
}

.test-alert,
.test-form {
    margin-bottom: 16px;
}

.channel-summary {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--el-border-color-lighter);
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

@media (max-width: 900px) {
    .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 600px) {
    .page-toolbar {
        align-items: flex-start;
        flex-direction: column;
    }

    .summary-grid {
        grid-template-columns: 1fr;
    }
}
</style>
