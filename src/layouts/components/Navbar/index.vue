<script setup lang="ts">
import { Bell } from "@element-plus/icons-vue";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AuthApi } from "@/api/auth/auth-api.ts";
import avatar from "@/assets/images/avatar.png";
import logo from "@/assets/images/logo.svg";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import NotificationBell from "@/components/NotificationBell/index.vue";
import { cancelAllRequests } from "@/plugin/request/http.ts";
import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";
import { GlobalUtils } from "@/utils/global-utils.ts";
import { findFirstRoutableMenu, findMenuPath } from "@/utils/menu-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

defineOptions({
    name: "LayoutsNavbar"
});

// 获取路由对象（useRoute 是响应式的）
const router = useRouter();
const route = useRoute();
const appStore = useAppStore();
const prefixes = computed(() => appStore.menus);
const active = ref("");

// 监听路由变化
watch(
    [() => route.fullPath, () => appStore.menus],
    () => {
        resolveNavigation();
    },
    { immediate: true, flush: "pre", deep: true }
);

function resolveNavigation() {
    const routeName = route.meta.activeMenu ?? route.meta.requiredMenu ?? route.name;
    const menuPath = typeof routeName === "string" ? findMenuPath(appStore.menus, routeName) : [];
    const root = menuPath[0];
    active.value = root?.id ?? "";
    appStore.currentMenus = root?.menuType === "DIRECTORY" ? (root.children ?? []) : [];
}

function handleTopMenu(menu: Menu) {
    const target = findFirstRoutableMenu(menu);
    if (target?.routeName) router.push({ name: target.routeName });
}

async function handleUserLogout() {
    cancelAllRequests();
    try {
        await AuthApi.logout();
        MessageUtils.success("退出成功", () => {
            GlobalUtils.exit();
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "退出失败";
        MessageUtils.error(message);
    }
}

function handleGoToProfile() {
    router.push("/profile");
}

function handleGoToNotification() {
    router.push("/notification");
}
</script>

<template>
    <el-row style="height: 60px">
        <el-col :span="3">
            <el-image :src="logo" style="height: 55px; width: 90%" />
        </el-col>

        <el-col :span="19" style="padding-right: 40px">
            <el-menu :default-active="active" mode="horizontal">
                <el-menu-item v-for="o in prefixes" :key="o.id" :index="o.id" @click="handleTopMenu(o)">
                    <ComponentsIcons :name="o.icon" class-name="icon-sidebar" />
                    {{ o.name }}
                </el-menu-item>
            </el-menu>
        </el-col>

        <el-col :span="1" style="display: flex; align-items: center; justify-content: center">
            <NotificationBell />
        </el-col>

        <el-col :span="1">
            <el-dropdown>
                <img
                    :src="avatar"
                    alt="default avatar"
                    style="object-fit: cover"
                    class="el-avatar el-avatar--circle el-tooltip__trigger" />
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item @click="handleGoToNotification">
                            <el-icon :size="16" class-name="icon-navbar"><Bell /></el-icon>
                            <span>消息中心</span>
                        </el-dropdown-item>
                        <el-dropdown-item @click="handleGoToProfile">
                            <ComponentsIcons name="icon-user" class-name="icon-navbar" />
                            <span>个人中心</span>
                        </el-dropdown-item>
                        <el-dropdown-item @click="handleUserLogout">
                            <ComponentsIcons name="icon-logout" class-name="icon-navbar" />
                            <span>退出登录</span>
                        </el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </el-col>
    </el-row>
</template>

<style scoped lang="scss">
.goto-home {
    cursor: pointer;
}

.el-menu.el-menu--horizontal {
    border: 0;
}

:deep(.el-dropdown) {
    width: 100%;
    top: 20%;
    text-align: center;
}

.icon-navbar {
    width: 1.3em;
    height: 1.3em;
    padding-right: 0.5em;
}

.flex-grow {
    flex-grow: 1;
}

:deep(.el-menu) {
    height: 100%;
}
</style>
