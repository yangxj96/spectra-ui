<script setup lang="ts">
import { Check } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { ref } from "vue";

import { UserApi } from "@/api/user/user-api";
import DictSelect from "@/components/DictSelect/index.vue";

defineOptions({
    name: "ProfileInfo"
});

const userInfo = defineModel<UserProfileVO>("userInfo", { required: true });
const loading = ref(false);

async function handleSaveInfo() {
    loading.value = true;
    try {
        const params: UserProfileFrom = {
            real_name: userInfo.value.real_name,
            phone: userInfo.value.phone,
            email: userInfo.value.email,
            language: userInfo.value.language,
            timezone: userInfo.value.timezone
        };
        await UserApi.updateProfile(params);
        ElMessage.success("保存成功");
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "保存失败";
        ElMessage.error(message);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <el-form :model="userInfo" label-width="80px" class="info-form">
        <el-form-item label="工号">
            <el-input v-model="userInfo.employee_no" disabled />
        </el-form-item>
        <el-form-item label="真实姓名">
            <el-input v-model="userInfo.real_name" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="邮箱">
            <el-input v-model="userInfo.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号码">
            <el-input v-model="userInfo.phone" placeholder="请输入手机号码" />
        </el-form-item>
        <el-form-item label="语言">
            <DictSelect
                v-model="userInfo.language"
                dict_code="sys_language"
                placeholder="请选择语言"
                style="width: 100%" />
        </el-form-item>
        <el-form-item label="时区">
            <DictSelect
                v-model="userInfo.timezone"
                dict_code="sys_timezone"
                placeholder="请选择时区"
                style="width: 100%" />
        </el-form-item>
        <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleSaveInfo">
                <el-icon><Check /></el-icon>
                保存
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
