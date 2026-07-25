<script setup lang="ts">
import { Check } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { ref } from "vue";

import { UserApi, type UserProfileFrom, type UserProfileVO } from "@/api/user/user-api";
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
            gender: userInfo.value.gender,
            birthday: userInfo.value.birthday,
            phone: userInfo.value.phone,
            email: userInfo.value.email,
            country: userInfo.value.country,
            city: userInfo.value.city,
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
        <el-form-item label="用户名">
            <el-input v-model="userInfo.username" disabled />
        </el-form-item>
        <el-form-item label="真实姓名">
            <el-input v-model="userInfo.real_name" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="性别">
            <DictSelect
                v-model="userInfo.gender"
                dict_code="sys_user_gender"
                placeholder="请选择性别"
                style="width: 100%" />
        </el-form-item>
        <el-form-item label="邮箱">
            <el-input v-model="userInfo.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号码">
            <el-input v-model="userInfo.phone" placeholder="请输入手机号码" />
        </el-form-item>
        <el-form-item label="生日">
            <el-date-picker
                v-model="userInfo.birthday"
                type="date"
                placeholder="选择生日"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%" />
        </el-form-item>
        <el-form-item label="国家">
            <el-input v-model="userInfo.country" placeholder="请输入国家" />
        </el-form-item>
        <el-form-item label="城市">
            <el-input v-model="userInfo.city" placeholder="请输入城市" />
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
