<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { CacheManagementApi } from "@/api/system/cache-management-api.ts";
import { useUserStore } from "@/plugin/store/modules/use-user-store.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const route = useRoute();
const userStore = useUserStore();
const activeTab = ref<"business" | "security">("business");
const securityActiveTab = ref<"session" | "verification" | "login-failure" | "nonce">("session");
const regions = ref<CacheRegion[]>([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const preview = ref<CacheOperation>();
const operation = ref<CacheOperation>();
let operationTimer: ReturnType<typeof setInterval> | undefined;

const businessForm = reactive<CacheBusinessClearRequest>({
    region_codes: [],
    all_regions: false,
    all_instances: false,
    reason: "",
    confirmation: ""
});
const sessionForm = reactive({ user_id: "", client_type: "WEB", reason: "", confirmed: false });
const verificationForm = reactive<SecurityVerificationClearRequest>({
    type: "LOGIN_SMS",
    target: "",
    clear_attempts: true,
    reason: "",
    confirmed: false
});
const loginFailureForm = reactive({ username: "", reason: "", confirmed: false });
const nonceForm = reactive({ nonce: "", reason: "", confirmed: false });
const globalNonceForm = reactive({ reason: "", confirmation_phrase: "" });

function createRemoteSearch<T>(load: (keyword: string) => Promise<T[]>) {
    const options = ref<T[]>([]);
    const loading = ref(false);
    let requestSequence = 0;

    async function search(keyword?: string): Promise<void> {
        const sequence = ++requestSequence;
        const normalizedKeyword = keyword?.trim() ?? "";
        if (!normalizedKeyword) {
            options.value = [];
            loading.value = false;
            return;
        }
        loading.value = true;
        try {
            const nextOptions = await load(normalizedKeyword);
            if (sequence === requestSequence) options.value = nextOptions;
        } catch {
            if (sequence === requestSequence) {
                options.value = [];
                MessageUtils.error("候选查询失败，请稍后重试。");
            }
        } finally {
            if (sequence === requestSequence) loading.value = false;
        }
    }

    function clear(): void {
        requestSequence += 1;
        options.value = [];
        loading.value = false;
    }

    return { options, loading, search, clear };
}

const sessionUserSearch = createRemoteSearch(keyword => CacheManagementApi.searchSessionCandidates({ keyword }));
const verificationTargetSearch = createRemoteSearch(keyword =>
    CacheManagementApi.searchVerificationCandidates({ type: verificationForm.type, keyword })
);
const loginFailureUserSearch = createRemoteSearch(keyword =>
    CacheManagementApi.searchLoginFailureCandidates({ keyword })
);

const verificationTargetPlaceholder = computed(() =>
    verificationForm.type === "KAPTCHA" ? "当前类型无候选，请输入会话句柄" : "输入手机号或邮箱关键字搜索"
);

const statusLabels: Record<string, string> = {
    AVAILABLE: "正常",
    ACCEPTED: "已受理",
    SUCCEEDED: "已完成",
    PARTIAL: "部分完成",
    FAILED: "失败",
    UNAVAILABLE: "不可用",
    UNKNOWN: "未知",
    UNSUPPORTED: "暂不支持"
};

const operationTypeLabels: Record<string, string> = {
    BUSINESS_PREVIEW: "普通缓存清理预览",
    BUSINESS_CLEAR: "普通缓存清理",
    SESSION_CLIENT: "撤销指定客户端会话",
    SESSION_ALL: "撤销用户全部会话",
    VERIFICATION: "清理验证码状态",
    LOGIN_FAILURE: "清理登录失败计数",
    NONCE_TARGET: "定向失效防重放随机数",
    NONCE_ALL: "全局失效防重放随机数"
};

const canManageNonce = computed(() => userStore.hasPermission("security:replay:manage"));
const selectedRegionNames = computed(() =>
    regions.value.filter(region => businessForm.region_codes.includes(region.code)).map(region => region.display_name)
);

function statusType(status: string | undefined): "success" | "warning" | "danger" | "info" {
    switch (status) {
        case "SUCCEEDED":
        case "AVAILABLE":
            return "success";
        case "PARTIAL":
        case "ACCEPTED":
            return "warning";
        case "FAILED":
        case "UNAVAILABLE":
            return "danger";
        default:
            return "info";
    }
}

function statusLabel(status: string | undefined): string {
    return statusLabels[status ?? "UNKNOWN"] ?? "未知";
}

function operationTypeLabel(operationType: string | undefined): string {
    return operationTypeLabels[operationType ?? ""] ?? "其他维护操作";
}

function userCandidateLabel(candidate: SecurityUserCandidate): string {
    const name = candidate.real_name || candidate.username || candidate.id;
    const identities = [candidate.username, candidate.employee_no].filter(Boolean).join(" / ");
    return identities ? `${name}（${identities}）` : `${name}（${candidate.id}）`;
}

function verificationCandidateLabel(candidate: SecurityVerificationCandidate): string {
    const owner = candidate.real_name || candidate.username || "未关联用户";
    return `${candidate.masked_target}（${owner}）`;
}

async function searchSessionUsers(keyword?: string): Promise<void> {
    await sessionUserSearch.search(keyword);
}

async function searchVerificationTargets(keyword?: string): Promise<void> {
    if (verificationForm.type === "KAPTCHA") {
        verificationTargetSearch.clear();
        return;
    }
    await verificationTargetSearch.search(keyword);
}

async function searchLoginFailureUsers(keyword?: string): Promise<void> {
    await loginFailureUserSearch.search(keyword);
}

function handleVerificationTypeChange(): void {
    verificationForm.target = "";
    verificationTargetSearch.clear();
}

async function loadRegions(): Promise<void> {
    loading.value = true;
    try {
        const nextRegions = await CacheManagementApi.getRegions({ loading: false });
        regions.value = nextRegions;
        const queryRegion = typeof route.query.region_code === "string" ? route.query.region_code : "";
        if (queryRegion && nextRegions.some(region => region.code === queryRegion)) {
            businessForm.region_codes = [queryRegion];
        } else if (!businessForm.all_regions && businessForm.region_codes.length === 0 && nextRegions[0]?.code) {
            businessForm.region_codes = [nextRegions[0].code];
        }
    } catch {
        errorMessage.value = "普通缓存区域加载失败，请稍后重试。";
        MessageUtils.error(errorMessage.value);
    } finally {
        loading.value = false;
    }
}

function clearPreview(): void {
    preview.value = undefined;
    operation.value = undefined;
}

function validateSecurityForm(target: string, targetLabel: string, reason: string, confirmed: boolean): boolean {
    if (!target.trim()) {
        MessageUtils.warning(`请输入${targetLabel}。`);
        return false;
    }
    if (!reason.trim()) {
        MessageUtils.warning("请输入操作理由。");
        return false;
    }
    if (!confirmed) {
        MessageUtils.warning("请勾选确认项后再提交。");
        return false;
    }
    return true;
}

function validateGlobalNonceForm(): boolean {
    if (!globalNonceForm.reason.trim()) {
        MessageUtils.warning("请输入操作理由。");
        return false;
    }
    if (globalNonceForm.confirmation_phrase !== "INVALIDATE-NONCES") {
        MessageUtils.warning("请输入确认短语 INVALIDATE-NONCES。");
        return false;
    }
    return true;
}

async function previewBusinessClear(): Promise<void> {
    if (!businessForm.all_regions && businessForm.region_codes.length === 0) {
        MessageUtils.warning("请选择已登记缓存区域，或选择全部普通缓存。");
        return;
    }
    try {
        preview.value = await CacheManagementApi.previewBusinessClear({
            region_codes: businessForm.region_codes,
            all_regions: businessForm.all_regions,
            all_instances: businessForm.all_instances
        });
        operation.value = undefined;
    } catch {
        MessageUtils.error("普通缓存清理预览失败。");
    }
}

async function clearBusiness(): Promise<void> {
    if (preview.value?.status !== "ACCEPTED") {
        MessageUtils.warning("请先完成普通缓存清理预览。");
        return;
    }
    if (!businessForm.reason.trim() || businessForm.confirmation !== "CLEAR-CACHE") {
        MessageUtils.warning("请输入清理理由，并填写确认短语 CLEAR-CACHE。");
        return;
    }
    await execute(() =>
        CacheManagementApi.clearBusiness({
            ...businessForm,
            operation_id: globalThis.crypto.randomUUID()
        })
    );
}

async function revokeSession(): Promise<void> {
    if (!validateSecurityForm(sessionForm.user_id, "用户编号", sessionForm.reason, sessionForm.confirmed)) return;
    await execute(() => CacheManagementApi.revokeSession({ ...sessionForm }));
}

async function revokeAllSessions(): Promise<void> {
    if (!validateSecurityForm(sessionForm.user_id, "用户编号", sessionForm.reason, sessionForm.confirmed)) return;
    await execute(() =>
        CacheManagementApi.revokeAllSessions({
            user_id: sessionForm.user_id,
            reason: sessionForm.reason,
            confirmed: sessionForm.confirmed
        })
    );
}

async function clearVerification(): Promise<void> {
    if (
        !validateSecurityForm(
            verificationForm.target,
            "验证码目标",
            verificationForm.reason,
            verificationForm.confirmed
        )
    ) {
        return;
    }
    await execute(() => CacheManagementApi.clearVerification({ ...verificationForm }));
}

async function clearLoginFailure(): Promise<void> {
    if (
        !validateSecurityForm(
            loginFailureForm.username,
            "登录账号",
            loginFailureForm.reason,
            loginFailureForm.confirmed
        )
    ) {
        return;
    }
    await execute(() => CacheManagementApi.clearLoginFailure({ ...loginFailureForm }));
}

async function invalidateNonce(): Promise<void> {
    if (!canManageNonce.value) {
        MessageUtils.error("当前账号没有 security:replay:manage 权限，且后端只允许 ROLE_DEV_OPS。");
        return;
    }
    if (!validateSecurityForm(nonceForm.nonce, "防重放随机数", nonceForm.reason, nonceForm.confirmed)) return;
    await execute(() => CacheManagementApi.invalidateNonce({ ...nonceForm }));
}

async function invalidateAllNonces(): Promise<void> {
    if (!canManageNonce.value) {
        MessageUtils.error("当前账号没有 security:replay:manage 权限，且后端只允许 ROLE_DEV_OPS。");
        return;
    }
    if (!validateGlobalNonceForm()) return;
    await execute(() => CacheManagementApi.invalidateAllNonces({ ...globalNonceForm }));
}

async function execute(action: () => Promise<CacheOperation>): Promise<void> {
    if (saving.value) return;
    saving.value = true;
    try {
        operation.value = await action();
        if (operation.value.status === "ACCEPTED" && operation.value.operation_id) {
            startOperationPolling(operation.value.operation_id);
        }
    } catch {
        MessageUtils.error("维护操作失败，请检查权限和安全 Redis 状态。");
    } finally {
        saving.value = false;
    }
}

function startOperationPolling(operationId: string): void {
    stopOperationPolling();
    operationTimer = globalThis.setInterval(() => void pollOperation(operationId), 1000);
}

async function pollOperation(operationId: string): Promise<void> {
    try {
        const next = await CacheManagementApi.getOperation(operationId, { loading: false });
        operation.value = next;
        if (next.status !== "ACCEPTED") stopOperationPolling();
    } catch {
        stopOperationPolling();
        MessageUtils.error("缓存清理操作状态暂时无法确认。");
    }
}

function stopOperationPolling(): void {
    if (operationTimer) {
        globalThis.clearInterval(operationTimer);
        operationTimer = undefined;
    }
}

onMounted(() => void loadRegions());
onUnmounted(stopOperationPolling);
</script>

<template>
    <div class="cache-clear page-container">
        <div class="page-header">
            <div>
                <h2>缓存清理</h2>
                <p>普通业务缓存与安全运行态分开处理。页面不提供任意 Redis 键、访问令牌或刷新令牌操作。</p>
            </div>
        </div>

        <el-alert v-if="errorMessage" :title="errorMessage" type="warning" show-icon :closable="false" />
        <el-alert
            title="安全 Redis 是会话、访问令牌、验证码、登录锁定和防重放状态的事实源；无法确认时操作会失败并保持安全拒绝。"
            type="info"
            show-icon
            :closable="false" />

        <el-tabs v-model="activeTab" class="maintenance-tabs">
            <el-tab-pane label="普通缓存" name="business">
                <el-card shadow="never">
                    <template #header>普通业务缓存清理</template>
                    <el-form label-width="140px">
                        <el-form-item label="缓存区域" required>
                            <el-select
                                v-model="businessForm.region_codes"
                                multiple
                                clearable
                                :loading="loading"
                                placeholder="选择已登记区域"
                                @change="clearPreview">
                                <el-option
                                    v-for="region in regions"
                                    :key="region.code"
                                    :label="`${region.display_name} (${region.code})`"
                                    :value="region.code" />
                            </el-select>
                            <el-checkbox v-model="businessForm.all_regions" class="check-gap" @change="clearPreview">
                                全部已登记普通缓存
                            </el-checkbox>
                        </el-form-item>
                        <el-form-item label="实例范围">
                            <el-checkbox v-model="businessForm.all_instances" @change="clearPreview">
                                广播到全部实例
                            </el-checkbox>
                        </el-form-item>
                        <el-form-item label="清理理由" required>
                            <el-input
                                v-model="businessForm.reason"
                                maxlength="200"
                                show-word-limit
                                placeholder="说明故障或维护原因" />
                        </el-form-item>
                        <el-form-item label="确认短语" required>
                            <el-input v-model="businessForm.confirmation" placeholder="CLEAR-CACHE" />
                        </el-form-item>
                        <el-form-item>
                            <el-button :loading="saving" @click="previewBusinessClear">预览影响</el-button>
                            <el-button type="danger" :loading="saving" @click="clearBusiness">执行清理</el-button>
                        </el-form-item>
                    </el-form>
                    <el-descriptions v-if="preview" title="预览结果" :column="2" border>
                        <el-descriptions-item label="区域数量">{{ preview.affected_count }}</el-descriptions-item>
                        <el-descriptions-item label="区域">
                            {{ selectedRegionNames.join("、") || "全部已登记区域" }}
                        </el-descriptions-item>
                        <el-descriptions-item label="状态">
                            <el-tag :type="statusType(preview.status)">{{ statusLabel(preview.status) }}</el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="说明">{{ preview.message }}</el-descriptions-item>
                    </el-descriptions>
                </el-card>
            </el-tab-pane>

            <el-tab-pane label="安全运行态" name="security">
                <el-tabs v-model="securityActiveTab" tab-position="left" class="security-tabs">
                    <el-tab-pane label="会话 / 令牌" name="session">
                        <h3 class="security-section-title">会话 / 令牌</h3>
                        <el-form label-width="140px">
                            <el-form-item label="用户编号" required>
                                <el-select
                                    v-model="sessionForm.user_id"
                                    filterable
                                    remote
                                    clearable
                                    allow-create
                                    default-first-option
                                    reserve-keyword
                                    :remote-method="searchSessionUsers"
                                    :loading="sessionUserSearch.loading"
                                    placeholder="输入用户编号、用户名、姓名或工号搜索"
                                    style="width: 100%">
                                    <el-option
                                        v-for="candidate in sessionUserSearch.options"
                                        :key="candidate.id"
                                        :label="userCandidateLabel(candidate)"
                                        :value="candidate.id" />
                                </el-select>
                            </el-form-item>
                            <el-form-item label="客户端">
                                <el-select v-model="sessionForm.client_type">
                                    <el-option label="网页端" value="WEB" />
                                    <el-option label="移动端" value="APP" />
                                    <el-option label="小程序" value="MINI" />
                                </el-select>
                            </el-form-item>
                            <el-form-item label="理由" required>
                                <el-input v-model="sessionForm.reason" maxlength="200" />
                            </el-form-item>
                            <el-form-item label="操作确认" required>
                                <el-checkbox v-model="sessionForm.confirmed">我确认撤销目标会话</el-checkbox>
                            </el-form-item>
                            <el-form-item>
                                <el-button :loading="saving" @click="revokeSession">撤销客户端会话</el-button>
                                <el-button type="danger" :loading="saving" @click="revokeAllSessions">
                                    撤销用户全部会话
                                </el-button>
                            </el-form-item>
                        </el-form>
                    </el-tab-pane>

                    <el-tab-pane label="验证码" name="verification">
                        <h3 class="security-section-title">验证码</h3>
                        <el-form label-width="140px">
                            <el-form-item label="验证码类型" required>
                                <el-select v-model="verificationForm.type" @change="handleVerificationTypeChange">
                                    <el-option label="登录短信" value="LOGIN_SMS" />
                                    <el-option label="登录邮箱" value="LOGIN_EMAIL" />
                                    <el-option label="绑定手机" value="BIND_PHONE" />
                                    <el-option label="绑定邮箱" value="BIND_EMAIL" />
                                    <el-option label="图形验证码会话" value="KAPTCHA" />
                                </el-select>
                            </el-form-item>
                            <el-form-item label="账号或会话句柄" required>
                                <el-select
                                    v-model="verificationForm.target"
                                    filterable
                                    remote
                                    clearable
                                    allow-create
                                    default-first-option
                                    reserve-keyword
                                    :remote-method="searchVerificationTargets"
                                    :loading="verificationTargetSearch.loading"
                                    :placeholder="verificationTargetPlaceholder"
                                    style="width: 100%">
                                    <el-option
                                        v-for="candidate in verificationTargetSearch.options"
                                        :key="`${candidate.target}-${candidate.user_id}`"
                                        :label="verificationCandidateLabel(candidate)"
                                        :value="candidate.target" />
                                </el-select>
                                <div class="hint">短信和邮箱可按关键字查询候选；图形验证码会话句柄请直接输入。</div>
                            </el-form-item>
                            <el-form-item label="验证码选项">
                                <el-checkbox v-model="verificationForm.clear_attempts">
                                    同时清理验证码失败计数
                                </el-checkbox>
                            </el-form-item>
                            <el-form-item label="操作确认" required>
                                <el-checkbox v-model="verificationForm.confirmed">我确认清理验证码状态</el-checkbox>
                            </el-form-item>
                            <el-form-item label="理由" required>
                                <el-input v-model="verificationForm.reason" maxlength="200" />
                            </el-form-item>
                            <el-form-item>
                                <el-button :loading="saving" @click="clearVerification">清理验证码</el-button>
                            </el-form-item>
                        </el-form>
                    </el-tab-pane>

                    <el-tab-pane label="登录失败锁定" name="login-failure">
                        <h3 class="security-section-title">登录失败锁定</h3>
                        <el-form label-width="140px">
                            <el-form-item label="登录账号" required>
                                <el-select
                                    v-model="loginFailureForm.username"
                                    filterable
                                    remote
                                    clearable
                                    allow-create
                                    default-first-option
                                    reserve-keyword
                                    :remote-method="searchLoginFailureUsers"
                                    :loading="loginFailureUserSearch.loading"
                                    placeholder="输入账号、姓名或工号搜索"
                                    style="width: 100%">
                                    <el-option
                                        v-for="candidate in loginFailureUserSearch.options"
                                        :key="candidate.id"
                                        :label="userCandidateLabel(candidate)"
                                        :value="candidate.username || ''" />
                                </el-select>
                            </el-form-item>
                            <el-form-item label="理由" required>
                                <el-input v-model="loginFailureForm.reason" maxlength="200" />
                            </el-form-item>
                            <el-form-item label="操作确认" required>
                                <el-checkbox v-model="loginFailureForm.confirmed">我确认解除登录失败计数</el-checkbox>
                            </el-form-item>
                            <el-form-item>
                                <el-button :loading="saving" @click="clearLoginFailure">清理登录锁定计数</el-button>
                            </el-form-item>
                            <p class="hint">此操作只清理登录失败计数，不改变用户的锁定、停用等生命周期状态。</p>
                        </el-form>
                    </el-tab-pane>

                    <el-tab-pane label="防重放随机数" name="nonce">
                        <h3 class="security-section-title">网页端加密防重放随机数</h3>
                        <p class="hint">
                            随机数只在后端计算摘要；定向失效和全局当前窗口失效均由后端按 ROLE_DEV_OPS 校验。
                        </p>
                        <template v-if="canManageNonce">
                            <el-form label-width="140px">
                                <el-form-item label="定向随机数" required>
                                    <el-input v-model="nonceForm.nonce" placeholder="输入需要失效的随机数" />
                                </el-form-item>
                                <el-form-item label="理由" required>
                                    <el-input v-model="nonceForm.reason" maxlength="200" />
                                </el-form-item>
                                <el-form-item label="操作确认" required>
                                    <el-checkbox v-model="nonceForm.confirmed">我确认定向失效该随机数</el-checkbox>
                                </el-form-item>
                                <el-form-item>
                                    <el-button :loading="saving" @click="invalidateNonce">定向失效</el-button>
                                </el-form-item>
                                <el-divider />
                                <el-form-item label="全局失效理由" required>
                                    <el-input v-model="globalNonceForm.reason" maxlength="200" />
                                </el-form-item>
                                <el-form-item label="确认短语" required>
                                    <el-input
                                        v-model="globalNonceForm.confirmation_phrase"
                                        placeholder="INVALIDATE-NONCES" />
                                </el-form-item>
                                <el-form-item>
                                    <el-button type="danger" :loading="saving" @click="invalidateAllNonces">
                                        失效当前窗口全部随机数
                                    </el-button>
                                </el-form-item>
                            </el-form>
                        </template>
                        <el-alert
                            v-else
                            title="需要 security:replay:manage 权限；后端还会额外要求 ROLE_DEV_OPS。"
                            type="warning"
                            :closable="false" />
                    </el-tab-pane>
                </el-tabs>
            </el-tab-pane>
        </el-tabs>

        <el-card v-if="operation" shadow="never" class="result-card">
            <template #header>最近操作结果</template>
            <el-descriptions :column="2" border>
                <el-descriptions-item label="操作类型">
                    {{ operationTypeLabel(operation.operation_type) }}
                </el-descriptions-item>
                <el-descriptions-item label="状态">
                    <el-tag :type="statusType(operation.status)">{{ statusLabel(operation.status) }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="影响数量">{{ operation.affected_count }}</el-descriptions-item>
                <el-descriptions-item label="说明">{{ operation.message }}</el-descriptions-item>
            </el-descriptions>
            <el-alert
                v-if="operation.status === 'PARTIAL'"
                title="操作只完成了部分范围，请不要将其视为全部成功，并根据回执继续处理。"
                type="warning"
                show-icon
                :closable="false" />
        </el-card>
    </div>
</template>

<style scoped lang="scss">
.cache-clear {
    padding: 20px;
}

.page-header h2 {
    margin: 0 0 8px;
}

.page-header p {
    margin: 0;
    color: var(--el-text-color-secondary);
}

.maintenance-tabs {
    margin-top: 16px;
}

.security-tabs {
    margin-top: 16px;
}

.result-card {
    margin-top: 16px;
}

.security-section-title {
    margin: 0 0 16px;
    font-size: 16px;
    font-weight: 600;
}

.check-gap {
    margin-left: 16px;
}

.hint {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.result-card .el-alert {
    margin-top: 16px;
}
</style>
