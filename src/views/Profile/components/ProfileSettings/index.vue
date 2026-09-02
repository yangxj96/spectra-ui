<script setup lang="ts">
import { ref } from "vue";

import ProfileBinding from "../ProfileBinding/index.vue";

defineOptions({
    name: "ProfileSecuritySettings"
});

const securitySettings = ref({ login_notification: true });
</script>

<template>
    <div class="settings-content">
        <div class="settings-section">
            <h4 class="section-title">安全设置</h4>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>登录通知</h5>
                    <p>新设备登录时发送通知，当前功能暂未实现</p>
                </div>
                <div class="setting-state">
                    <el-tag
                        class="setting-status-tag"
                        :type="securitySettings.login_notification ? 'success' : 'info'"
                        effect="plain">
                        {{ securitySettings.login_notification ? "已启用" : "未启用" }}
                    </el-tag>
                    <el-switch v-model="securitySettings.login_notification" aria-label="切换登录通知" />
                </div>
            </div>
        </div>
        <el-divider />

        <div class="binding-section">
            <h4 class="section-title">账号绑定与登录方式</h4>
            <p class="section-description">管理可用于登录的手机号、邮箱等账号。</p>
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
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.setting-state {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.setting-status-tag {
    order: 0;
}

.setting-state .el-switch {
    order: 1;
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
</style>
