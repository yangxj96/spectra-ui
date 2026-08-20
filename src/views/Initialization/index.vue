<script setup lang="ts">
import { ElForm, type FormRules } from "element-plus";
import QRCode from "qrcode";
import { computed, nextTick, onMounted, reactive, ref, useTemplateRef } from "vue";
import { useRouter } from "vue-router";

import { SystemInitializationApi } from "@/api/system/initialization-api.ts";
import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const router = useRouter();
const appStore = useAppStore();
const accountFormRef = useTemplateRef<InstanceType<typeof ElForm>>("accountForm");
const qrCodeRef = useTemplateRef<HTMLCanvasElement>("qrCode");

const checking = ref(!appStore.bootstrap_loaded);
const statusError = ref("");
const currentStep = ref(0);
const recoveryCodesSaved = ref(false);
const submitting = ref(false);
const initialized = ref(appStore.initialization.initialized);
const initializationState = ref<SystemInitializationStatus["state"]>(appStore.initialization.state);

const accountForm = reactive({
    username: "devops00.com",
    real_name: "DEV_OPS",
    password: "",
    verify_password: "",
    initialization_token: "",
    system_name: "Spectra",
    system_short_name: "Spectra",
    system_logo: "",
    default_locale: "zh-CN" as "zh-CN" | "en-US",
    default_timezone: "Asia/Shanghai",
    security_profile: "STANDARD" as "STANDARD" | "STRICT"
});

const initialization = reactive({
    initialization_id: "",
    enrollment_id: "",
    provisioning_uri: "",
    secret: "",
    expires_at: 0,
    code: "",
    recovery_codes: [] as string[]
});

const accountRules: FormRules = {
    system_name: [
        { required: true, message: "请输入系统名称", trigger: "blur" },
        { max: 100, message: "系统名称长度不能超过 100 个字符", trigger: "blur" }
    ],
    system_short_name: [{ max: 50, message: "系统简称长度不能超过 50 个字符", trigger: "blur" }],
    system_logo: [{ max: 512, message: "系统 Logo 地址长度不能超过 512 个字符", trigger: "blur" }],
    default_locale: [{ required: true, message: "请选择默认语言", trigger: "change" }],
    default_timezone: [{ required: true, message: "请输入默认时区", trigger: "blur" }],
    security_profile: [{ required: true, message: "请选择安全策略", trigger: "change" }],
    username: [{ required: true, message: "请输入 DEV_OPS 用户账号", trigger: "blur" }],
    real_name: [{ required: true, message: "请输入真实姓名", trigger: "blur" }],
    password: [
        { required: true, message: "请输入密码", trigger: "blur" },
        { min: 12, max: 128, message: "密码长度必须为 12-128 位", trigger: "blur" }
    ],
    verify_password: [{ required: true, message: "请再次输入密码", trigger: "blur" }],
    initialization_token: [{ required: true, message: "请输入系统初始化令牌", trigger: "blur" }]
};

const expirationText = computed(() => {
    if (!initialization.expires_at) return "";
    return new Date(initialization.expires_at).toLocaleString();
});

const stepTitle = computed(() => {
    return ["创建 DEV_OPS 账号", "绑定 MFA", "保存 Recovery Code"][currentStep.value] ?? "系统初始化";
});

const loadStatus = async () => {
    checking.value = true;
    statusError.value = "";
    try {
        const status = await SystemInitializationApi.status();
        appStore.setInitializationStatus(status);
        initializationState.value = status.state;
        initialized.value = status.initialized;
    } catch (error) {
        statusError.value = "无法读取系统初始化状态，请确认后端已经启动。";
        console.error("读取系统初始化状态失败:", error);
    } finally {
        checking.value = false;
    }
};

const applyBootstrapStatus = () => {
    initializationState.value = appStore.initialization.state;
    initialized.value = appStore.initialization.initialized;
    checking.value = false;
};

const renderQrCode = async () => {
    await nextTick();
    const canvas = qrCodeRef.value;
    if (!canvas || !initialization.provisioning_uri) return;

    try {
        await QRCode.toCanvas(canvas, initialization.provisioning_uri, {
            errorCorrectionLevel: "M",
            margin: 2,
            width: 240,
            color: {
                dark: "#111827",
                light: "#ffffff"
            }
        });
    } catch (error) {
        console.error("MFA 二维码生成失败:", error);
        MessageUtils.error("MFA 二维码生成失败，请重试");
    }
};

const validateAccount = async () => {
    const valid = await accountFormRef.value?.validate();
    if (!valid) return false;
    if (accountForm.password !== accountForm.verify_password) {
        MessageUtils.error("两次输入的密码不一致");
        return false;
    }
    return true;
};

const startInitialization = async () => {
    if (!(await validateAccount())) return;

    submitting.value = true;
    try {
        const result = await SystemInitializationApi.start(
            {
                username: accountForm.username.trim(),
                real_name: accountForm.real_name.trim(),
                password: accountForm.password,
                system_name: accountForm.system_name.trim(),
                system_short_name: accountForm.system_short_name.trim(),
                system_logo: accountForm.system_logo.trim(),
                default_locale: accountForm.default_locale,
                default_timezone: accountForm.default_timezone.trim(),
                security_profile: accountForm.security_profile
            },
            accountForm.initialization_token.trim()
        );
        initialization.initialization_id = result.initialization_id;
        initialization.enrollment_id = result.enrollment_id;
        initialization.provisioning_uri = result.provisioning_uri;
        initialization.secret = result.secret;
        initialization.expires_at = result.expires_at;
        currentStep.value = 1;
        await renderQrCode();
    } catch (error) {
        console.error("开始系统初始化失败:", error);
    } finally {
        submitting.value = false;
    }
};

const confirmMfa = async () => {
    if (!/^\d{6}$/.test(initialization.code.trim())) {
        MessageUtils.error("请输入 6 位 MFA 验证码");
        return;
    }

    submitting.value = true;
    try {
        const result = await SystemInitializationApi.confirmMfa({
            initialization_id: initialization.initialization_id,
            enrollment_id: initialization.enrollment_id,
            code: initialization.code.trim()
        });
        initialization.recovery_codes = result.recovery_codes;
        initialization.code = "";
        currentStep.value = 2;
    } catch (error) {
        console.error("确认 MFA 失败:", error);
    } finally {
        submitting.value = false;
    }
};

const copyRecoveryCodes = async () => {
    try {
        await navigator.clipboard.writeText(initialization.recovery_codes.join("\n"));
        MessageUtils.success("Recovery Code 已复制，请继续离线保存");
    } catch (error) {
        console.error("复制 Recovery Code 失败:", error);
        MessageUtils.error("复制失败，请手工保存页面中的 Recovery Code");
    }
};

const copySecret = async () => {
    try {
        await navigator.clipboard.writeText(initialization.secret);
        MessageUtils.success("MFA 密钥已复制");
    } catch (error) {
        console.error("复制 MFA 密钥失败:", error);
        MessageUtils.error("复制失败，请手工记录 MFA 密钥");
    }
};

const completeInitialization = async () => {
    if (!recoveryCodesSaved.value) {
        MessageUtils.error("请先确认已经离线保存 Recovery Code");
        return;
    }

    submitting.value = true;
    try {
        await SystemInitializationApi.complete({
            initialization_id: initialization.initialization_id
        });
        appStore.setInitializationStatus({
            state: "INITIALIZED",
            initialized: true,
            initialization_required: false
        });
        initializationState.value = "INITIALIZED";
        initialized.value = true;
        MessageUtils.success("系统初始化完成，请重新登录");
        await router.replace("/login");
    } catch (error) {
        console.error("完成系统初始化失败:", error);
    } finally {
        submitting.value = false;
    }
};

onMounted(() => {
    if (appStore.bootstrap_loaded) applyBootstrapStatus();
    else void loadStatus();
});
</script>

<template>
    <div class="initialization-page">
        <el-card class="initialization-card" shadow="always">
            <template #header>
                <div class="card-header">
                    <div>
                        <h1>系统首次初始化</h1>
                        <p>完成必要的 DEV_OPS 账号和 MFA 配置后，才能进入管理后台。</p>
                    </div>
                    <el-button link type="primary" @click="router.push('/login')">返回登录</el-button>
                </div>
            </template>

            <el-alert
                v-if="initialized"
                title="系统已经完成初始化"
                description="当前数据库已有初始化账号，请返回登录页面。"
                type="success"
                show-icon
                :closable="false" />
            <el-alert
                v-else-if="initializationState === 'INITIALIZING'"
                title="系统已有初始化流程进行中"
                description="请继续完成已经打开的初始化窗口；如果窗口已丢失，请在开发数据库中重新开始初始化。"
                type="warning"
                show-icon
                :closable="false" />
            <el-alert v-else-if="statusError" :title="statusError" type="error" show-icon :closable="false" />

            <template v-if="!checking && !initialized && initializationState !== 'INITIALIZING' && !statusError">
                <el-steps :active="currentStep" finish-status="success" class="steps">
                    <el-step title="系统与账号" description="设置系统信息和 DEV_OPS" />
                    <el-step title="绑定 MFA" description="登记身份验证器" />
                    <el-step title="保存恢复码" description="完成首次登录" />
                </el-steps>

                <h2>{{ stepTitle }}</h2>

                <div v-if="currentStep === 0" class="step-content">
                    <el-alert
                        title="初始化令牌不会保存到浏览器"
                        description="启动后从后端控制台日志获取初始化令牌，仅在本次初始化请求中使用；请勿将令牌写入共享日志或工单。"
                        type="info"
                        show-icon
                        :closable="false" />
                    <ElForm
                        ref="accountForm"
                        class="initialization-form"
                        label-position="top"
                        :model="accountForm"
                        :rules="accountRules">
                        <el-divider content-position="left">系统信息</el-divider>
                        <el-form-item label="系统名称" prop="system_name">
                            <el-input v-model="accountForm.system_name" clearable />
                        </el-form-item>
                        <el-form-item label="系统简称" prop="system_short_name">
                            <el-input v-model="accountForm.system_short_name" clearable />
                        </el-form-item>
                        <el-form-item label="系统 Logo 地址或文件标识" prop="system_logo">
                            <el-input v-model="accountForm.system_logo" clearable placeholder="可选" />
                        </el-form-item>
                        <el-form-item label="默认语言" prop="default_locale">
                            <el-select v-model="accountForm.default_locale" style="width: 100%">
                                <el-option label="简体中文" value="zh-CN" />
                                <el-option label="English" value="en-US" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="默认时区" prop="default_timezone">
                            <el-select
                                v-model="accountForm.default_timezone"
                                filterable
                                allow-create
                                style="width: 100%">
                                <el-option label="中国/上海（Asia/Shanghai）" value="Asia/Shanghai" />
                                <el-option label="协调世界时（UTC）" value="UTC" />
                                <el-option label="美国/洛杉矶（America/Los_Angeles）" value="America/Los_Angeles" />
                                <el-option label="欧洲/伦敦（Europe/London）" value="Europe/London" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="安全策略" prop="security_profile">
                            <el-select v-model="accountForm.security_profile" style="width: 100%">
                                <el-option label="标准（STANDARD）" value="STANDARD" />
                                <el-option label="严格（STRICT）" value="STRICT" />
                            </el-select>
                        </el-form-item>
                        <el-divider content-position="left">DEV_OPS 账号</el-divider>
                        <el-form-item label="DEV_OPS 用户账号" prop="username">
                            <el-input v-model="accountForm.username" autocomplete="username" clearable />
                        </el-form-item>
                        <el-form-item label="真实姓名" prop="real_name">
                            <el-input v-model="accountForm.real_name" autocomplete="name" clearable />
                        </el-form-item>
                        <el-form-item label="登录密码" prop="password">
                            <el-input
                                v-model="accountForm.password"
                                type="password"
                                autocomplete="new-password"
                                show-password />
                        </el-form-item>
                        <el-form-item label="确认密码" prop="verify_password">
                            <el-input
                                v-model="accountForm.verify_password"
                                type="password"
                                autocomplete="new-password"
                                show-password />
                        </el-form-item>
                        <el-form-item label="系统初始化令牌" prop="initialization_token">
                            <el-input
                                v-model="accountForm.initialization_token"
                                type="password"
                                autocomplete="off"
                                show-password />
                        </el-form-item>
                        <el-button type="primary" :loading="submitting" @click="startInitialization">
                            开始初始化
                        </el-button>
                    </ElForm>
                </div>

                <div v-else-if="currentStep === 1" class="step-content mfa-content">
                    <el-alert
                        title="请使用身份验证器扫描二维码"
                        description="推荐使用 Microsoft Authenticator、Google Authenticator 或其他兼容 TOTP 的身份验证器。"
                        type="info"
                        show-icon
                        :closable="false" />
                    <div class="qr-panel">
                        <canvas ref="qrCode" role="img" aria-label="DEV_OPS MFA 配置二维码" />
                        <p v-if="expirationText">挑战有效期至：{{ expirationText }}</p>
                    </div>
                    <div class="secret-panel">
                        <span>MFA 密钥</span>
                        <el-input v-model="initialization.secret" readonly>
                            <template #append><el-button @click="copySecret">复制</el-button></template>
                        </el-input>
                    </div>
                    <ElForm class="code-form" label-position="top">
                        <el-form-item label="身份验证器验证码">
                            <el-input
                                v-model="initialization.code"
                                maxlength="6"
                                inputmode="numeric"
                                autocomplete="one-time-code"
                                placeholder="请输入 6 位验证码"
                                @keyup.enter="confirmMfa" />
                        </el-form-item>
                    </ElForm>
                    <el-button type="primary" :loading="submitting" @click="confirmMfa">确认 MFA</el-button>
                </div>

                <div v-else class="step-content recovery-content">
                    <el-alert
                        title="Recovery Code 只显示这一次"
                        description="请复制并离线保存。每个 Recovery Code 只能使用一次。"
                        type="warning"
                        show-icon
                        :closable="false" />
                    <div class="recovery-codes">
                        <code v-for="code in initialization.recovery_codes" :key="code">{{ code }}</code>
                    </div>
                    <el-button plain type="primary" @click="copyRecoveryCodes">复制全部 Recovery Code</el-button>
                    <el-checkbox v-model="recoveryCodesSaved">我已将 Recovery Code 保存到安全位置</el-checkbox>
                    <el-button type="primary" :loading="submitting" @click="completeInitialization">
                        完成初始化，返回登录
                    </el-button>
                </div>
            </template>

            <el-button v-if="statusError" class="retry-button" type="primary" @click="loadStatus">重新检查</el-button>
            <el-button v-if="initialized" class="retry-button" type="primary" @click="router.push('/login')">
                前往登录
            </el-button>
        </el-card>
    </div>
</template>

<style scoped>
.initialization-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 32px 16px;
    background: linear-gradient(135deg, #eef4ff 0%, #f8fafc 55%, #ecfdf5 100%);
}

.initialization-card {
    width: min(680px, 100%);
    border: 0;
    border-radius: 18px;
}

.card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
}

h1,
h2 {
    margin: 0;
    color: #172033;
}

h1 {
    font-size: 24px;
}

h2 {
    margin-top: 32px;
    font-size: 20px;
    text-align: center;
}

.card-header p {
    margin: 8px 0 0;
    color: #64748b;
}

.steps {
    margin-top: 32px;
}

.step-content {
    margin-top: 24px;
}

.initialization-form {
    margin-top: 20px;
}

.initialization-form :deep(.el-button),
.code-form + .el-button,
.recovery-content > .el-button:last-child {
    width: 100%;
}

.mfa-content,
.recovery-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.qr-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.qr-panel canvas {
    padding: 12px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
}

.qr-panel p {
    margin: 0;
    color: #64748b;
    font-size: 13px;
}

.secret-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: #475569;
    font-size: 13px;
}

.code-form {
    margin-top: 4px;
}

.recovery-codes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    padding: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
}

.recovery-codes code {
    padding: 8px;
    color: #0f172a;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    text-align: center;
    background: #fff;
    border-radius: 6px;
}

.retry-button {
    display: block;
    margin: 24px auto 0;
}

@media (max-width: 560px) {
    .initialization-page {
        padding: 12px;
    }

    .initialization-card {
        border-radius: 12px;
    }

    .card-header {
        flex-direction: column;
    }

    .recovery-codes {
        grid-template-columns: 1fr;
    }
}
</style>
