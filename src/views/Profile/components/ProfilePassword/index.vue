<script setup lang="ts">
import { CircleCheck, CircleClose, Lock } from "@element-plus/icons-vue";
import { computed, onMounted, ref } from "vue";

import { AuthApi } from "@/api/auth/auth-api";
import { SecurityPolicyApi } from "@/api/auth/security-policy-api.ts";
import { UserApi } from "@/api/user/user-api";
import { cancelAllRequests } from "@/plugin/request/http.ts";
import { GlobalUtils } from "@/utils/global-utils";
import { MessageUtils } from "@/utils/message-utils";

import type { FormInstance } from "element-plus";

defineOptions({
    name: "ProfilePassword"
});

const formRef = ref<FormInstance>();
const loading = ref(false);
const policyLoading = ref(true);
const securityPasswordPolicy = ref<SecurityPasswordPolicyVO>();

const passwordForm = ref<ChangePasswordFrom>({
    old_password: "",
    new_password: "",
    verify_password: ""
});

type PasswordRule = { key: string; label: string; message: string; met: boolean };

function evaluatePasswordRules(password: string, policy: SecurityPasswordPolicyVO): PasswordRule[] {
    const rules: PasswordRule[] = [
        {
            key: "length",
            label: `密码长度 ${policy.min_length}-${policy.max_length} 位`,
            message: `密码长度必须在 ${policy.min_length}-${policy.max_length} 位之间`,
            met: password.length >= policy.min_length && password.length <= policy.max_length
        }
    ];
    if (policy.require_uppercase) {
        rules.push({
            key: "uppercase",
            label: "包含大写字母",
            message: "密码必须包含大写字母",
            met: /\p{Uppercase}/u.test(password)
        });
    }
    if (policy.require_lowercase) {
        rules.push({
            key: "lowercase",
            label: "包含小写字母",
            message: "密码必须包含小写字母",
            met: /\p{Lowercase}/u.test(password)
        });
    }
    if (policy.require_digit) {
        rules.push({
            key: "digit",
            label: "包含数字",
            message: "密码必须包含数字",
            met: /\p{Nd}/u.test(password)
        });
    }
    if (policy.require_special) {
        rules.push({
            key: "special",
            label: "包含特殊字符",
            message: "密码必须包含特殊字符",
            met: Array.from(password).some(character => !/[\p{L}\p{Nd}]/u.test(character))
        });
    }
    return rules;
}

// 密码规则实时检查
const passwordRules = computed(() => {
    const policy = securityPasswordPolicy.value;
    if (!policy) return [];
    return evaluatePasswordRules(passwordForm.value.new_password, policy);
});

// 密码强度根据当前生效策略计算，避免页面规则关闭后仍按旧固定要求打分。
const passwordStrength = computed(() => {
    if (!passwordForm.value.new_password) {
        return { level: "empty" as const, percent: 0, text: "", color: "" };
    }
    if (!securityPasswordPolicy.value) {
        return { level: "empty" as const, percent: 0, text: "", color: "" };
    }

    const ratio = passwordRules.value.filter(rule => rule.met).length / passwordRules.value.length;
    if (ratio === 1) {
        return { level: "strong" as const, percent: 100, text: "强", color: "var(--el-color-success)" };
    }
    if (ratio >= 0.5) {
        return { level: "medium" as const, percent: 66, text: "中", color: "var(--el-color-warning)" };
    }
    return { level: "weak" as const, percent: 33, text: "弱", color: "var(--el-color-danger)" };
});

async function loadPasswordPolicy(): Promise<void> {
    policyLoading.value = true;
    try {
        securityPasswordPolicy.value = await SecurityPolicyApi.passwordPolicy();
    } catch {
        securityPasswordPolicy.value = undefined;
        MessageUtils.error("当前密码规则暂不可用，请刷新后重试");
    } finally {
        policyLoading.value = false;
    }
}

function passwordPolicyViolation(value: string): string | undefined {
    const policy = securityPasswordPolicy.value;
    if (!value) return "请输入新密码";
    if (!policy) return "当前密码规则暂不可用，请刷新后重试";

    const missingRule = evaluatePasswordRules(value, policy).find(rule => !rule.met);
    if (missingRule?.key === "length") {
        return missingRule.message;
    }
    if (missingRule) return missingRule.message;
}

// 密码强度验证
const validatePassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
    const violation = passwordPolicyViolation(value);
    callback(violation ? new Error(violation) : undefined);
};

// 确认密码验证
const validateVerifyPassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
    if (!value) {
        callback(new Error("请再次输入新密码"));
    } else if (value !== passwordForm.value.new_password) {
        callback(new Error("两次输入的密码不一致"));
    } else {
        callback();
    }
};

const rules = {
    old_password: [{ required: true, message: "请输入旧密码", trigger: "blur" }],
    new_password: [{ required: true, validator: validatePassword, trigger: "blur" }],
    verify_password: [{ required: true, validator: validateVerifyPassword, trigger: "blur" }]
};

async function handleChangePassword() {
    if (!formRef.value || !securityPasswordPolicy.value) return;
    const policyViolation = passwordPolicyViolation(passwordForm.value.new_password);
    if (policyViolation) {
        MessageUtils.error(policyViolation);
        return;
    }
    await formRef.value.validate(async valid => {
        if (!valid) return;
        loading.value = true;
        try {
            await UserApi.changePassword(passwordForm.value);

            // 与头部退出使用相同的逻辑
            cancelAllRequests();
            AuthApi.logout();
            MessageUtils.success("密码修改成功，请重新登录", () => {
                GlobalUtils.exit();
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "修改密码失败";
            MessageUtils.error(message);
        } finally {
            loading.value = false;
        }
    });
}

onMounted(() => {
    void loadPasswordPolicy();
});
</script>

<template>
    <div class="password-container">
        <el-form ref="formRef" :model="passwordForm" :rules="rules" label-width="100px" class="info-form">
            <el-form-item label="旧密码" prop="old_password">
                <el-input
                    v-model="passwordForm.old_password"
                    type="password"
                    show-password
                    placeholder="请输入旧密码" />
            </el-form-item>
            <el-form-item label="新密码" prop="new_password">
                <el-input
                    v-model="passwordForm.new_password"
                    type="password"
                    show-password
                    :maxlength="securityPasswordPolicy?.max_length ?? 20"
                    placeholder="请输入新密码" />
                <!-- 密码强度显示 -->
                <div v-if="passwordForm.new_password" class="password-strength">
                    <div class="strength-bar">
                        <div
                            class="strength-bar-fill"
                            :style="{
                                width: passwordStrength.percent + '%',
                                backgroundColor: passwordStrength.color
                            }" />
                    </div>
                    <span class="strength-text" :style="{ color: passwordStrength.color }">
                        密码强度：{{ passwordStrength.text }}
                    </span>
                </div>
            </el-form-item>
            <el-form-item label="确认密码" prop="verify_password">
                <el-input
                    v-model="passwordForm.verify_password"
                    type="password"
                    show-password
                    placeholder="请再次输入新密码" />
            </el-form-item>
            <el-form-item>
                <el-button
                    type="primary"
                    :loading="loading"
                    :disabled="policyLoading || !securityPasswordPolicy"
                    @click="handleChangePassword">
                    <el-icon><Lock /></el-icon>
                    修改密码
                </el-button>
            </el-form-item>
        </el-form>

        <!-- 密码规则说明 -->
        <div v-if="securityPasswordPolicy" class="password-rules">
            <h4 class="rules-title">密码规则</h4>
            <ul class="rules-list">
                <li v-for="rule in passwordRules" :key="rule.label" :class="{ 'is-met': rule.met }">
                    <el-icon>
                        <CircleCheck v-if="rule.met" />
                        <CircleClose v-else />
                    </el-icon>
                    {{ rule.label }}
                </li>
            </ul>
        </div>
        <div v-else class="password-rules">
            {{ policyLoading ? "正在读取当前密码规则…" : "当前密码规则暂不可用，请刷新后重试" }}
        </div>
    </div>
</template>

<style scoped lang="scss">
.password-container {
    max-width: 480px;
    padding: 8px 0;
}

.info-form {
    padding: 0;
}

.password-strength {
    margin-top: 8px;
    width: 100%;

    .strength-bar {
        height: 4px;
        background-color: var(--el-fill-color-darker);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 4px;

        .strength-bar-fill {
            height: 100%;
            border-radius: 2px;
            transition:
                width 0.3s,
                background-color 0.3s;
        }
    }

    .strength-text {
        font-size: 12px;
        font-weight: 500;
    }
}

.password-rules {
    margin-top: 16px;
    padding: 12px 16px;
    background-color: var(--el-fill-color-lighter);
    border-radius: 6px;

    .rules-title {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--el-text-color-primary);
    }

    .rules-list {
        margin: 0;
        padding: 0;
        list-style: none;

        li {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 0;
            font-size: 13px;
            color: var(--el-text-color-secondary);

            &.is-met {
                color: var(--el-color-success);
            }

            .el-icon {
                font-size: 14px;
            }
        }
    }
}
</style>
