<script setup lang="ts">
import { CopyDocument, Lock, Plus } from "@element-plus/icons-vue";
import QRCode from "qrcode";
import { nextTick, onMounted, ref, useTemplateRef } from "vue";

import { AuthApi } from "@/api/auth/auth-api";
import { MessageUtils } from "@/utils/message-utils";

import ProfileBinding from "../ProfileBinding/index.vue";

defineOptions({
    name: "ProfileSecuritySettings"
});

const securitySettings = ref({ login_notification: true });

const mfaStatus = ref<MfaStatus>({ enabled: false });
const mfaLoading = ref(false);
const mfaSetupLoading = ref(false);
const mfaDialogVisible = ref(false);
const mfaSetupCompleted = ref(false);
const mfaEnrollment = ref<MfaEnrollment>();
const mfaCode = ref("");
const mfaRecoveryCodes = ref<string[]>([]);
const mfaQrCode = useTemplateRef<HTMLCanvasElement>("mfaQrCode");
const mfaDisableDialogVisible = ref(false);
const mfaDisableLoading = ref(false);
const mfaDisableCode = ref("");

async function loadMfaStatus() {
    mfaLoading.value = true;
    try {
        mfaStatus.value = await AuthApi.mfaStatus({ loading: false });
    } catch (error: unknown) {
        MessageUtils.error(error instanceof Error ? error.message : "MFA 状态加载失败");
    } finally {
        mfaLoading.value = false;
    }
}

async function renderMfaQrCode(provisioningUri: string) {
    await nextTick();
    const canvas = mfaQrCode.value;
    if (!canvas) return;
    await QRCode.toCanvas(canvas, provisioningUri, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 220,
        color: { dark: "#111827", light: "#ffffff" }
    });
}

async function handleEnableMfa() {
    mfaLoading.value = true;
    try {
        mfaEnrollment.value = await AuthApi.beginAuthenticatedMfaEnrollment();
        mfaCode.value = "";
        mfaRecoveryCodes.value = [];
        mfaSetupCompleted.value = false;
        mfaDialogVisible.value = true;
        await renderMfaQrCode(mfaEnrollment.value.provisioning_uri);
    } catch (error: unknown) {
        MessageUtils.error(error instanceof Error ? error.message : "MFA 登记启动失败");
    } finally {
        mfaLoading.value = false;
    }
}

async function handleConfirmMfa() {
    const code = mfaCode.value.trim();
    if (!/^\d{6}$/.test(code)) {
        MessageUtils.warning("请输入身份验证器中的 6 位验证码");
        return;
    }
    if (!mfaEnrollment.value) return;

    mfaSetupLoading.value = true;
    try {
        mfaRecoveryCodes.value = await AuthApi.confirmAuthenticatedMfaEnrollment(
            mfaEnrollment.value.enrollment_id,
            code
        );
        mfaStatus.value = { enabled: true, factor_type: "TOTP" };
        mfaSetupCompleted.value = true;
        mfaCode.value = "";
        MessageUtils.success("两步验证已启用");
    } catch (error: unknown) {
        MessageUtils.error(error instanceof Error ? error.message : "MFA 验证失败");
    } finally {
        mfaSetupLoading.value = false;
    }
}

function handleMfaDialogClosed() {
    mfaEnrollment.value = undefined;
    mfaCode.value = "";
    mfaRecoveryCodes.value = [];
    mfaSetupCompleted.value = false;
}

async function handleCopyRecoveryCodes() {
    try {
        await navigator.clipboard.writeText(mfaRecoveryCodes.value.join("\n"));
        MessageUtils.success("Recovery Code 已复制");
    } catch {
        MessageUtils.error("复制失败，请手工保存 Recovery Code");
    }
}

function handleOpenDisableMfa() {
    mfaDisableCode.value = "";
    mfaDisableDialogVisible.value = true;
}

async function handleDisableMfa() {
    const code = mfaDisableCode.value.trim();
    if (!code) {
        MessageUtils.warning("请输入当前 MFA 验证码或恢复码");
        return;
    }

    mfaDisableLoading.value = true;
    try {
        await AuthApi.disableMfa(code);
        mfaStatus.value = { enabled: false };
        mfaDisableDialogVisible.value = false;
        MessageUtils.success("两步验证已停用");
    } catch (error: unknown) {
        MessageUtils.error(error instanceof Error ? error.message : "MFA 停用失败");
    } finally {
        mfaDisableLoading.value = false;
    }
}

onMounted(() => {
    loadMfaStatus();
});
</script>

<template>
    <div class="settings-content">
        <div class="settings-section">
            <h4 class="section-title">安全设置</h4>
            <div class="setting-item mfa-setting-item">
                <div class="setting-info">
                    <h5>两步验证（MFA）</h5>
                    <p>启用后，密码、短信或邮箱登录完成后还需要验证身份验证器</p>
                </div>
                <div class="mfa-state">
                    <el-tag :type="mfaStatus.enabled ? 'success' : 'info'" effect="plain">
                        {{ mfaStatus.enabled ? "已启用" : "未启用" }}
                    </el-tag>
                    <el-button v-if="!mfaStatus.enabled" type="primary" :loading="mfaLoading" @click="handleEnableMfa">
                        <el-icon><Plus /></el-icon>
                        启用
                    </el-button>
                    <el-button v-else type="danger" plain :loading="mfaLoading" @click="handleOpenDisableMfa">
                        停用
                    </el-button>
                </div>
            </div>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>登录通知</h5>
                    <p>新设备登录时发送通知，当前功能暂未实现</p>
                </div>
                <el-switch v-model="securitySettings.login_notification" />
            </div>
        </div>
        <el-divider />

        <div class="binding-section">
            <h4 class="section-title">账号绑定与登录方式</h4>
            <p class="section-description">管理可用于登录和身份验证的手机号、邮箱等账号。</p>
            <ProfileBinding />
        </div>
    </div>

    <el-dialog
        v-model="mfaDialogVisible"
        title="启用两步验证"
        width="520px"
        :close-on-click-modal="false"
        @closed="handleMfaDialogClosed">
        <template v-if="!mfaSetupCompleted">
            <div class="mfa-enrollment">
                <p class="mfa-dialog-description">
                    使用 Microsoft Authenticator、Google Authenticator 或其他兼容 TOTP
                    的身份验证器扫描二维码，然后输入应用生成的 6 位验证码。
                </p>
                <canvas ref="mfaQrCode" class="mfa-qr-code" aria-label="MFA 配置二维码" />
                <el-input v-model="mfaCode" maxlength="6" placeholder="请输入 6 位验证码" autocomplete="one-time-code">
                    <template #prefix>
                        <el-icon><Lock /></el-icon>
                    </template>
                </el-input>
            </div>
        </template>
        <template v-else>
            <el-alert
                title="请立即保存 Recovery Code"
                description="Recovery Code 只会显示这一次，可在无法使用身份验证器时恢复登录。"
                type="warning"
                :closable="false"
                show-icon />
            <div class="mfa-recovery-codes">
                <code v-for="code in mfaRecoveryCodes" :key="code">{{ code }}</code>
            </div>
            <el-button type="primary" plain @click="handleCopyRecoveryCodes">
                <el-icon><CopyDocument /></el-icon>
                复制全部 Recovery Code
            </el-button>
        </template>
        <template #footer>
            <el-button @click="mfaDialogVisible = false">{{ mfaSetupCompleted ? "关闭" : "取消" }}</el-button>
            <el-button v-if="!mfaSetupCompleted" type="primary" :loading="mfaSetupLoading" @click="handleConfirmMfa">
                确认启用
            </el-button>
        </template>
    </el-dialog>

    <el-dialog v-model="mfaDisableDialogVisible" title="停用两步验证" width="420px" :close-on-click-modal="false">
        <el-alert
            title="停用后，后续登录不再要求 MFA 验证"
            description="请输入当前身份验证器生成的验证码，或输入一个未使用的 Recovery Code。"
            type="warning"
            :closable="false"
            show-icon />
        <el-input
            v-model="mfaDisableCode"
            class="mfa-disable-input"
            placeholder="请输入 MFA 验证码或 Recovery Code"
            autocomplete="one-time-code" />
        <template #footer>
            <el-button @click="mfaDisableDialogVisible = false">取消</el-button>
            <el-button type="danger" :loading="mfaDisableLoading" @click="handleDisableMfa">确认停用</el-button>
        </template>
    </el-dialog>
</template>

<style scoped lang="scss">
.settings-content {
    padding: 8px 0;
}

.settings-section {
    padding: 8px 0;
}

.section-title {
    margin: 0 0 12px 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);

    &:last-of-type {
        border-bottom: none;
    }
}

.mfa-setting-item {
    align-items: flex-start;
}

.mfa-state {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.setting-info {
    h5 {
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: 500;
        color: var(--el-text-color-primary);
    }

    p {
        margin: 0;
        font-size: 12px;
        color: var(--el-text-color-secondary);
    }
}

.binding-section {
    padding: 8px 0;
}

.section-description {
    margin: -4px 0 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.mfa-enrollment {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.mfa-dialog-description {
    align-self: stretch;
    margin: 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
    line-height: 1.6;
}

.mfa-qr-code {
    width: 220px;
    height: 220px;
    padding: 8px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
}

.mfa-enrollment :deep(.el-input) {
    width: 260px;
}

.mfa-recovery-codes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin: 16px 0;
    padding: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 6px;

    code {
        padding: 6px 8px;
        color: var(--el-text-color-primary);
        font-family: var(--el-font-family);
        text-align: center;
    }
}

.mfa-disable-input {
    margin-top: 16px;
}
</style>
