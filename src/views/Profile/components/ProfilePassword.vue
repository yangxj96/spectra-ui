<script setup lang="ts">
import { CircleCheck, CircleClose, Lock } from "@element-plus/icons-vue";
import { computed, ref } from "vue";

import { AuthApi } from "@/api/auth/auth-api";
import { UserApi, type ChangePasswordFrom } from "@/api/user/user-api";
import { cancelAllRequests } from "@/plugin/request/http.ts";
import { GlobalUtils } from "@/utils/global-utils";
import { MessageUtils } from "@/utils/message-utils";

import type { FormInstance } from "element-plus";

defineOptions({
    name: "ProfilePassword"
});

const formRef = ref<FormInstance>();
const loading = ref(false);

const passwordForm = ref<ChangePasswordFrom>({
    old_password: "",
    new_password: "",
    verify_password: ""
});

// 密码强度计算
const passwordStrength = computed(() => {
    const password = passwordForm.value.new_password;

    if (!password) {
        return { level: "empty" as const, percent: 0, text: "", color: "" };
    }

    let score = 0;

    // 长度检查
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;

    // 字符类型检查
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;

    // 判断强度等级
    if (score <= 2) {
        return { level: "weak" as const, percent: 33, text: "弱", color: "var(--el-color-danger)" };
    } else if (score <= 4) {
        return { level: "medium" as const, percent: 66, text: "中", color: "var(--el-color-warning)" };
    } else {
        return { level: "strong" as const, percent: 100, text: "强", color: "var(--el-color-success)" };
    }
});

// 密码规则实时检查
const passwordRules = computed(() => [
    { label: "密码长度 6-20 位", met: passwordForm.value.new_password.length >= 6 },
    { label: "包含小写字母", met: /[a-z]/.test(passwordForm.value.new_password) },
    { label: "包含大写字母", met: /[A-Z]/.test(passwordForm.value.new_password) },
    { label: "包含数字", met: /\d/.test(passwordForm.value.new_password) },
    { label: "包含特殊字符（@$!%*?&）", met: /[@$!%*?&]/.test(passwordForm.value.new_password) }
]);

// 密码强度验证
const validatePassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
    if (!value) {
        callback(new Error("请输入新密码"));
    } else if (value.length < 6 || value.length > 20) {
        callback(new Error("密码长度必须在6-20位之间"));
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(value)) {
        callback(new Error("密码必须包含大小写字母、数字和特殊字符"));
    } else {
        callback();
    }
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
    if (!formRef.value) return;
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
                <el-button type="primary" :loading="loading" @click="handleChangePassword">
                    <el-icon><Lock /></el-icon>
                    修改密码
                </el-button>
            </el-form-item>
        </el-form>

        <!-- 密码规则说明 -->
        <div class="password-rules">
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
