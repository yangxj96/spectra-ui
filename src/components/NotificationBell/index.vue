<script setup lang="ts">
import { Bell } from "@element-plus/icons-vue";
import { onMounted, ref } from "vue";

import { useNotificationStore } from "@/plugin/store/modules/use-notification-store.ts";

import NotificationDrawer from "./NotificationDrawer/index.vue";

defineOptions({
    name: "NotificationBell"
});

const notificationStore = useNotificationStore();
const drawerVisible = ref(false);

onMounted(() => {
    notificationStore.refreshUnreadCount();
});

/** 打开抽屉 */
function handleOpenDrawer(): void {
    drawerVisible.value = true;
    notificationStore.refreshUnreadCount();
}

/** 关闭抽屉 */
function handleCloseDrawer(): void {
    drawerVisible.value = false;
}
</script>

<template>
    <div class="notification-bell" @click="handleOpenDrawer">
        <span class="icon-wrapper">
            <el-icon :size="20">
                <Bell />
            </el-icon>
            <span v-if="notificationStore.unreadCount > 0" class="badge" />
        </span>
    </div>
    <NotificationDrawer v-model="drawerVisible" @close="handleCloseDrawer" />
</template>

<style scoped lang="scss">
.notification-bell {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60px;
    cursor: pointer;

    &:hover {
        background-color: rgba(0, 0, 0, 0.04);
    }
}

.icon-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.badge {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 8px;
    height: 8px;
    background-color: var(--el-color-danger);
    border-radius: 50%;
}
</style>
