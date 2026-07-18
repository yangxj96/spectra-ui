<script setup lang="ts">
import { Lock } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { ref } from "vue";
import { useRouter } from "vue-router";

import { AuthApi } from "@/api/auth/auth-api";
import { UserApi, type ChangePasswordFrom } from "@/api/user/user-api";
import { useUserStore } from "@/plugin/store/modules/use-user-store";

import type { FormInstance } from "element-plus";

defineOptions({
    name: "ProfilePassword"
});

const router = useRouter();
const formRef = ref<FormInstance>();
const loading = ref(false);

const passwordForm = ref<ChangePasswordFrom>({
    old_password: "",
    new_password: "",
    verify_password: ""
});

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

            // 1. 调用后端退出接口，使 token 失效
            try {
                await AuthApi.logout();
            } catch {
                // 即使服务端退出失败也继续清理本地状态
            }

            // 2. 清除本地状态
            const userStore = useUserStore();
            userStore.token = {} as Token;
            userStore.isLoggedIn = false;

            // 3. 提示并跳转
            ElMessage.success("密码修改成功，请重新登录");
            setTimeout(() => {
                router.push("/login");
            }, 1500);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "修改密码失败";
            ElMessage.error(message);
        } finally {
            loading.value = false;
        }
    });
}
</script>

<template>
    <el-form ref="formRef" :model="passwordForm" :rules="rules" label-width="100px" class="info-form">
        <el-form-item label="旧密码" prop="old_password">
            <el-input v-model="passwordForm.old_password" type="password" show-password placeholder="请输入旧密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="new_password">
            <el-input
                v-model="passwordForm.new_password"
                type="password"
                show-password
                placeholder="请输入新密码（6-20位，包含大小写字母、数字、特殊字符）" />
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
</template>

<style scoped lang="scss">
.info-form {
    max-width: 480px;
    padding: 8px 0;
}
</style>
