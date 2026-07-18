<script setup lang="ts">
import { onMounted, ref } from "vue";

import { UserApi, type UserProfileVO } from "@/api/user/user-api";
import avatar from "@/assets/images/avatar.png";

import ProfileBinding from "./components/ProfileBinding.vue";
import ProfileInfo from "./components/ProfileInfo.vue";
import ProfilePassword from "./components/ProfilePassword.vue";
import ProfileSettings from "./components/ProfileSettings.vue";

defineOptions({
    name: "Profile"
});

const activeTab = ref("info");

const userInfo = ref<UserProfileVO>({
    id: "",
    username: "",
    real_name: "",
    avatar: "",
    status: 1,
    gender: 0,
    birthday: "",
    phone: "",
    email: "",
    country: "",
    city: "",
    language: "",
    timezone: "",
    department_id: "",
    department_name: "",
    roles: []
});

async function loadUserProfile() {
    try {
        const profile = await UserApi.getProfile();
        userInfo.value = profile;
    } catch (error) {
        console.error("加载用户信息失败:", error);
    }
}

onMounted(() => {
    loadUserProfile();
});
</script>

<template>
    <div class="profile-container">
        <!-- 左侧：头像与基本信息 -->
        <div class="left-panel">
            <el-card class="avatar-card">
                <div class="avatar-section">
                    <el-avatar :src="userInfo.avatar || avatar" :size="100" class="avatar-image" />
                    <h3 class="username">{{ userInfo.real_name || userInfo.username }}</h3>
                    <p class="department">{{ userInfo.department_name }}</p>
                    <div class="role-tags">
                        <el-tag v-for="role in userInfo.roles" :key="role.id" size="small" type="info">
                            {{ role.name }}
                        </el-tag>
                    </div>
                    <el-divider />
                    <div class="info-list">
                        <div class="info-item">
                            <span class="info-label">用户名</span>
                            <span class="info-value">{{ userInfo.username }}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">邮箱</span>
                            <span class="info-value">{{ userInfo.email }}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">手机</span>
                            <span class="info-value">{{ userInfo.phone }}</span>
                        </div>
                    </div>
                </div>
            </el-card>
        </div>

        <!-- 右侧：Tab切换 -->
        <div class="right-panel">
            <el-card class="tabs-card">
                <el-tabs v-model="activeTab">
                    <el-tab-pane label="基本资料" name="info">
                        <ProfileInfo v-model:userInfo="userInfo" />
                    </el-tab-pane>
                    <el-tab-pane label="修改密码" name="password">
                        <ProfilePassword />
                    </el-tab-pane>
                    <el-tab-pane label="其他设置" name="settings">
                        <ProfileSettings />
                    </el-tab-pane>
                    <el-tab-pane label="账号绑定" name="binding">
                        <ProfileBinding />
                    </el-tab-pane>
                </el-tabs>
            </el-card>
        </div>
    </div>
</template>

<style scoped lang="scss">
.profile-container {
    display: flex;
    gap: 16px;
    height: 100%;
    padding: 16px;
    background-color: var(--el-bg-color-page);
}

/* 左侧面板 */
.left-panel {
    width: 280px;
    flex-shrink: 0;
}

.avatar-card {
    height: 100%;
    border-radius: 8px;
}

.avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.avatar-image {
    border: 3px solid var(--el-border-color-lighter);
    margin-bottom: 12px;
}

.username {
    margin: 0 0 4px 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.department {
    margin: 0 0 8px 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.role-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
}

.info-list {
    width: 100%;
}

.info-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 13px;
    border-bottom: 1px dashed var(--el-border-color-lighter);

    &:last-child {
        border-bottom: none;
    }
}

.info-label {
    color: var(--el-text-color-secondary);
}

.info-value {
    color: var(--el-text-color-primary);
    font-weight: 500;
}

/* 右侧面板 */
.right-panel {
    flex: 1;
    min-width: 0;
}

.tabs-card {
    height: 100%;
    border-radius: 8px;

    :deep(.el-card__body) {
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    :deep(.el-tabs) {
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    :deep(.el-tabs__header) {
        margin-bottom: 16px;
    }

    :deep(.el-tabs__content) {
        flex: 1;
        overflow-y: auto;
    }

    :deep(.el-tab-pane) {
        height: 100%;
    }
}

/* 子组件中 el-icon 与文字间距 */
:deep(.el-button .el-icon),
:deep(.el-tag .el-icon) {
    margin-right: 4px;
}
</style>
