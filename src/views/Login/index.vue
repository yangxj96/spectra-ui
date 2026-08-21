<script setup lang="ts">
import { ElForm, type FormRules } from "element-plus";
import QRCode from "qrcode";
import { nextTick, onMounted, reactive, ref, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AuthApi } from "@/api/auth/auth-api.ts";
import { fetchClientPrivateKey } from "@/api/system/crypto-api";
import { SystemInitializationApi } from "@/api/system/initialization-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";
import { useUserStore } from "@/plugin/store/modules/use-user-store.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import { loginParticles } from "@/views/Login/Config/login-particles.ts";

const particlesOptions = loginParticles;
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const loginRef = useTemplateRef<InstanceType<typeof ElForm>>("loginForm");
const mfaQrCode = useTemplateRef<HTMLCanvasElement>("mfaQrCode");
const kaptchaUrl = ref(import.meta.env.VITE_API_URL + "api/common/kaptcha?_t=" + Date.now());
const redirect = ref<string>(route.query.redirect as string | "/");
const mfaVisible = ref(false);
const mfaEnrollmentCompleted = ref(false);
const login = reactive({
    form: {
        type: "PASSWORD",
        username: "",
        password: "",
        captcha: ""
    } as LoginForm,
    rules: {
        username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
        password: [{ required: true, message: "请输入密码", trigger: "blur" }],
        captcha: [{ required: true, message: "请输入验证码", trigger: "blur" }]
    } as FormRules
});
const mfa = reactive({
    challengeId: "",
    enrollmentId: "",
    code: "",
    enrollmentRequired: false,
    recoveryCodes: [] as string[]
});

// 刷新验证码
const refreshKaptcha = () => {
    kaptchaUrl.value = import.meta.env.VITE_API_URL + "api/common/kaptcha?_t=" + Date.now();
};

/** 将后端返回的 TOTP provisioning URI 渲染为本地二维码。 */
const renderMfaQrCode = async (provisioningUri: string) => {
    await nextTick();
    const canvas = mfaQrCode.value;
    if (!canvas || !provisioningUri) return;

    try {
        await QRCode.toCanvas(canvas, provisioningUri, {
            errorCorrectionLevel: "M",
            margin: 2,
            width: 220,
            color: {
                dark: "#111827",
                light: "#ffffff"
            }
        });
    } catch (error) {
        console.error("MFA 二维码生成失败:", error);
        MessageUtils.error("MFA 二维码生成失败，请刷新后重试");
    }
};

const finishLogin = async (token: Token) => {
    useUserStore().token = token;
    useUserStore().isLoggedIn = true;
    await fetchClientPrivateKey();
    const requiresPasswordChange = token.password_change_required === true;
    MessageUtils[requiresPasswordChange ? "warning" : "success"](
        requiresPasswordChange ? "这是临时密码，请先修改密码" : "登录成功"
    );
    const path = requiresPasswordChange ? "/profile?tab=password" : "/redirect" + (redirect.value ?? "");
    await router.push({ path });
};

const openMfaChallenge = async (token: Token) => {
    if (!token.mfa_required || !token.mfa_challenge_id) {
        await finishLogin(token);
        return;
    }
    mfa.challengeId = token.mfa_challenge_id;
    mfa.enrollmentRequired = token.mfa_enrollment_required === true;
    mfaVisible.value = true;
    if (mfa.enrollmentRequired) {
        const enrollment = await AuthApi.beginMfaEnrollment(mfa.challengeId);
        mfa.enrollmentId = enrollment.enrollment_id;
        await renderMfaQrCode(enrollment.provisioning_uri);
    }
};

// 登录
const handleLogin = async () => {
    // 没获取到表单对象
    if (!loginRef) {
        return;
    }

    // 开始验证
    const valid = await loginRef.value?.validate();
    if (!valid) {
        MessageUtils.error("请检查表单");
        console.log("验证未通过");
        return;
    }

    try {
        await openMfaChallenge(await AuthApi.login(login.form));
    } catch (error) {
        // 登录失败，刷新验证码
        refreshKaptcha();
        console.error("登录请求失败:", error);
    }
};

const handleMfa = async () => {
    try {
        if (mfaEnrollmentCompleted.value) {
            await finishLogin(await AuthApi.completeMfaEnrollment(mfa.challengeId));
            return;
        }
        if (!mfa.code.trim()) {
            MessageUtils.error("请输入 MFA 验证码");
            return;
        }

        if (mfa.enrollmentRequired) {
            mfa.recoveryCodes = await AuthApi.confirmMfaEnrollment(mfa.challengeId, mfa.enrollmentId, mfa.code.trim());
            mfa.code = "";
            mfaEnrollmentCompleted.value = true;
            return;
        }

        await finishLogin(await AuthApi.verifyMfa(mfa.challengeId, mfa.code.trim()));
    } catch (error) {
        console.error("MFA 验证失败:", error);
    }
};

const resetMfa = () => {
    mfaVisible.value = false;
    mfaEnrollmentCompleted.value = false;
    mfa.challengeId = "";
    mfa.enrollmentId = "";
    mfa.code = "";
    mfa.enrollmentRequired = false;
    mfa.recoveryCodes = [];
};

onMounted(async () => {
    if (appStore.bootstrap_loaded) {
        if (appStore.initialization.initialization_required) {
            await router.replace("/initialization");
        }
        return;
    }

    try {
        const status = await SystemInitializationApi.status();
        appStore.setInitializationStatus(status);
        if (status.initialization_required) {
            await router.replace("/initialization");
        }
    } catch (error) {
        // 启动聚合接口不可用时保留登录页，让统一请求错误处理显示具体错误。
        console.debug("检查系统初始化状态失败:", error);
    }
});
</script>

<template>
    <div class="box">
        <vue-particles id="particles" :options="particlesOptions" />

        <el-dialog
            :model-value="true"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            :show-close="false"
            class="dialog-login"
            width="20%">
            <template #header>
                <p>
                    <ComponentsIcons name="icon-login" style="color: #9b9b9b" />
                    用户登录
                </p>
            </template>
            <div v-if="!mfaVisible">
                <ElForm ref="loginForm" label-width="70px" :model="login.form" :rules="login.rules">
                    <el-form-item label="账号" prop="username">
                        <el-input v-model="login.form.username" placeholder="请输入账号" />
                    </el-form-item>
                    <el-form-item label="密码" prop="password">
                        <el-input v-model="login.form.password" placeholder="请输入密码" show-password />
                    </el-form-item>
                    <el-form-item label="验证码" prop="captcha">
                        <el-row style="width: 100%">
                            <el-col :span="12">
                                <el-input v-model="login.form.captcha" placeholder="请输入验证码" />
                            </el-col>
                            <el-col :span="12">
                                <el-image :src="kaptchaUrl" class="v-code" @click="refreshKaptcha">
                                    <template v-slot:placeholder>
                                        <div class="el-image__error" style="">
                                            <ComponentsIcons name="icon-loading" class-name="v-code__ico" />
                                            加载中...
                                        </div>
                                    </template>
                                </el-image>
                            </el-col>
                        </el-row>
                    </el-form-item>
                </ElForm>
            </div>
            <div v-else class="mfa-panel">
                <el-alert
                    v-if="mfa.enrollmentRequired && !mfaEnrollmentCompleted"
                    title="首次登录需要绑定 MFA"
                    description="请用身份验证器扫描下方二维码，然后输入生成的 6 位验证码。"
                    type="warning"
                    :closable="false" />
                <el-alert
                    v-else-if="mfaEnrollmentCompleted"
                    title="MFA 已绑定"
                    description="请妥善保存 Recovery Code，然后点击完成登录。"
                    type="success"
                    :closable="false" />
                <el-alert
                    v-else
                    title="请输入 MFA 验证码"
                    description="请输入身份验证器当前显示的 6 位验证码。"
                    type="info"
                    :closable="false" />

                <template v-if="mfa.enrollmentRequired && !mfaEnrollmentCompleted">
                    <div class="mfa-qr-panel">
                        <div class="mfa-qr-code">
                            <canvas ref="mfaQrCode" role="img" aria-label="MFA 配置二维码" />
                        </div>
                        <p class="mfa-qr-hint">
                            使用 Microsoft Authenticator 或其他身份验证器扫描二维码，然后输入生成的 6 位验证码。
                        </p>
                    </div>
                    <ElForm label-width="70px" class="mfa-form">
                        <el-form-item label="验证码">
                            <el-input
                                v-model="mfa.code"
                                maxlength="6"
                                inputmode="numeric"
                                placeholder="请输入 6 位验证码" />
                        </el-form-item>
                    </ElForm>
                </template>
                <template v-else-if="mfaEnrollmentCompleted">
                    <el-input :model-value="mfa.recoveryCodes.join('\n')" type="textarea" :rows="6" readonly />
                </template>
                <ElForm v-else class="mfa-form">
                    <el-form-item label="验证码">
                        <el-input
                            v-model="mfa.code"
                            maxlength="6"
                            inputmode="numeric"
                            placeholder="请输入 6 位验证码" />
                    </el-form-item>
                </ElForm>
            </div>
            <template #footer>
                <el-button v-if="mfaVisible" text @click="resetMfa">返回登录</el-button>
                <el-button type="primary" @click="mfaVisible ? handleMfa() : handleLogin()">
                    <ComponentsIcons name="icon-login" />
                    <span>&nbsp;{{ mfaEnrollmentCompleted ? "完成登录" : mfaVisible ? "验证并继续" : "登录" }}</span>
                </el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.box {
    height: 100vh;
    background:
        radial-gradient(circle at 20% 80%, var(--el-color-page-background) 0%, transparent 40%),
        radial-gradient(circle at 80% 20%, var(--el-color-page-background) 0%, transparent 40%),
        radial-gradient(circle at 50% 50%, #020617 0%, #000000 100%);
}

:deep(.dialog-login) {
    left: 30%;
    top: 30vh;
}

:deep(.el-dialog__body) {
    padding-bottom: 0;
}

:deep(.el-dialog__footer) {
    padding-top: 0;
}

.mfa-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.mfa-form {
    margin-top: 4px;
}

.mfa-qr-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.mfa-qr-code {
    display: flex;
    padding: 12px;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgb(0 0 0 / 12%);
}

.mfa-qr-code canvas {
    display: block;
    width: 220px;
    height: 220px;
}

.mfa-qr-hint {
    margin: 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
    line-height: 1.5;
    text-align: center;
}

.v-code {
    height: calc(var(--el-input-height, 32px) - 2px);
    width: 100%;
    margin: 4px;
    //border-radius: 10px;
    cursor: pointer;
}

.v-code__ico {
    color: var(--el-text-color-placeholder);
    animation: v-code__ico-rotate 2s linear infinite;
}

@keyframes v-code__ico-rotate {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

.v-code:hover {
    opacity: 0.8;
    transform: scale(1.02);
    transition: all 0.2s ease;
}

#particles {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
}
</style>
