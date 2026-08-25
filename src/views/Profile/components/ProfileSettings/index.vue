<script setup lang="ts">
import { Check } from "@element-plus/icons-vue";
import { ref } from "vue";

import ProfileBinding from "../ProfileBinding/index.vue";

defineOptions({
    name: "ProfileSecuritySettings"
});

const securitySettings = ref({
    two_factor_auth: false,
    login_notification: true
});

function handleSaveSecurity() {
    console.log("保存安全设置:", securitySettings.value);
}
</script>

<template>
    <div class="settings-content">
        <div class="settings-section">
            <h4 class="section-title">安全设置</h4>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>两步验证</h5>
                    <p>启用后，登录时需要额外验证</p>
                </div>
                <el-switch v-model="securitySettings.two_factor_auth" />
            </div>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>登录通知</h5>
                    <p>新设备登录时发送通知，当前功能暂未实现</p>
                </div>
                <el-switch v-model="securitySettings.login_notification" />
            </div>
        </div>
        <div class="settings-actions">
            <el-button type="primary" @click="handleSaveSecurity">
                <el-icon><Check /></el-icon>
                保存安全设置
            </el-button>
        </div>

        <el-divider />

        <div class="binding-section">
            <h4 class="section-title">账号绑定与登录方式</h4>
            <p class="section-description">管理可用于登录和身份验证的手机号、邮箱等账号。</p>
            <ProfileBinding />
        </div>
    </div>
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

.settings-actions {
    padding-top: 16px;
}

.binding-section {
    padding: 8px 0;
}

.section-description {
    margin: -4px 0 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
}
</style>
