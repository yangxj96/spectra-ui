<script setup lang="ts">
import { Check } from "@element-plus/icons-vue";
import { ref } from "vue";

defineOptions({
    name: "ProfileSettings"
});

const securitySettings = ref({
    two_factor_auth: false,
    login_notification: true
});

const notificationSettings = ref({
    email_notification: true,
    sms_notification: false,
    system_notification: true
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
                    <p>新设备登录时发送通知</p>
                </div>
                <el-switch v-model="securitySettings.login_notification" />
            </div>
        </div>
        <el-divider />
        <div class="settings-section">
            <h4 class="section-title">通知设置</h4>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>邮件通知</h5>
                    <p>接收重要邮件通知</p>
                </div>
                <el-switch v-model="notificationSettings.email_notification" />
            </div>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>短信通知</h5>
                    <p>接收短信验证码</p>
                </div>
                <el-switch v-model="notificationSettings.sms_notification" />
            </div>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>系统通知</h5>
                    <p>接收系统消息推送</p>
                </div>
                <el-switch v-model="notificationSettings.system_notification" />
            </div>
        </div>
        <div class="settings-actions">
            <el-button type="primary" @click="handleSaveSecurity">
                <el-icon><Check /></el-icon>
                保存设置
            </el-button>
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
</style>
