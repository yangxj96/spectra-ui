<script setup lang="ts">
import { Check } from "@element-plus/icons-vue";
import { ref } from "vue";

import { UserApi } from "@/api/user/user-api";
import DictSelect from "@/components/DictSelect/index.vue";
import { HttpRequestError } from "@/plugin/request/fetch-client.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

defineOptions({
    name: "ProfileInfo"
});

const userInfo = defineModel<UserProfileVO>("userInfo", { required: true });
const loading = ref(false);
const latestProfile = ref<UserProfileVO>();

async function compareLatest() {
    latestProfile.value = await UserApi.getProfile({ loading: false });
}

function useLatestVersion() {
    if (!latestProfile.value) return;
    userInfo.value.version = latestProfile.value.version;
    latestProfile.value = undefined;
}

async function handleSaveInfo() {
    loading.value = true;
    try {
        const realName = userInfo.value.real_name?.trim();
        if (!realName) {
            MessageUtils.error("姓名不能为空");
            return;
        }
        const params: UserProfileFrom = {
            version: userInfo.value.version,
            real_name: realName,
            language: userInfo.value.language || null,
            timezone: userInfo.value.timezone || null
        };
        await UserApi.updateProfile(params, { loading: false });
        userInfo.value = await UserApi.getProfile({ loading: false });
        latestProfile.value = undefined;
        MessageUtils.success("保存成功");
    } catch (error: unknown) {
        if (error instanceof HttpRequestError && error.status === 409) {
            try {
                await compareLatest();
            } catch (refreshError) {
                MessageUtils.error(refreshError);
            }
        }
        MessageUtils.error(error);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <el-form :model="userInfo" label-width="100px" class="info-form">
        <el-alert v-if="latestProfile" title="资料已被更新，当前编辑内容已保留" type="warning" :closable="false">
            <p>
                服务器版本 {{ latestProfile.version }}；姓名：{{ latestProfile.real_name }}，语言：{{
                    latestProfile.language
                }}，时区：{{ latestProfile.timezone }}。
            </p>
            <el-button type="warning" @click="useLatestVersion">核对后使用新版本重新提交</el-button>
        </el-alert>
        <el-form-item label="工号">
            <el-input v-model="userInfo.employee_no" disabled />
        </el-form-item>
        <el-form-item label="登录用户名">
            <el-input v-model="userInfo.username" disabled />
        </el-form-item>
        <el-form-item label="姓名">
            <el-input v-model="userInfo.real_name" placeholder="请输入姓名" />
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
