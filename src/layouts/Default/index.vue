<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import Footer from "@/layouts/components/Footer/index.vue";
import Navbar from "@/layouts/components/Navbar/index.vue";
import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";
import { findMenuPath } from "@/utils/menu-utils.ts";

import Sidebar from "./components/Sidebar/index.vue";

defineOptions({
    name: "LayoutsDefault"
});

const appStore = useAppStore();
const route = useRoute();
const breadcrumb = computed(() => {
    const menuName = route.meta.activeMenu ?? route.meta.requiredMenu ?? route.name;
    const items =
        typeof menuName === "string"
            ? findMenuPath(appStore.menus, menuName).map(menu => ({ title: menu.name, routeName: menu.routeName }))
            : [];
    if (route.meta.activeMenu && route.name !== route.meta.activeMenu && typeof route.meta.title === "string") {
        items.push({ title: route.meta.title, routeName: null });
    }
    return items;
});

function handleMenu() {
    appStore.unfold = !appStore.unfold;
}
</script>

<template>
    <el-container class="box">
        <el-header class="box__header">
            <Navbar />
        </el-header>

        <el-container class="box__container">
            <el-aside width="10vw">
                <Sidebar />
            </el-aside>

            <el-main class="box__main">
                <!-- 面包屑横条 -->
                <el-row class="box__breadcrumb">
                    <el-col :span="24">
                        <i class="box__unfold-a" @click="handleMenu">
                            <ComponentsIcons v-if="appStore.unfold" name="icon-fold-left" />
                            <ComponentsIcons v-else name="icon-fold-right" />
                        </i>
                        <!-- 面包屑 -->
                        <el-breadcrumb style="display: inline-block">
                            <el-breadcrumb-item
                                v-for="(item, idx) in breadcrumb"
                                :key="idx"
                                :to="item.routeName ? { name: item.routeName } : undefined">
                                {{ item.title }}
                            </el-breadcrumb-item>
                        </el-breadcrumb>
                    </el-col>
                </el-row>
                <!-- 内容部分 -->
                <div class="box__content loading-box">
                    <router-view></router-view>
                </div>
                <!-- 底部版权 -->
                <Footer />
            </el-main>
        </el-container>
    </el-container>
</template>

<style scoped lang="scss">
.box {
    height: 100vh;
    display: flex;
    flex-direction: column;
}

.box-aside {
    width: 64px;
}

.box__header {
    flex: 0 0 auto;
    height: auto !important;
    border-bottom: solid 1px var(--el-border-color) !important;
    padding: 0;
}

.box__container {
    flex: 1;
    min-height: 0;
}

.box__main {
    padding: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;

    .box__breadcrumb {
        flex: 0 0 auto;
        margin-top: 0.5vh;
        margin-bottom: 0.5vh;
        padding-left: 2vh;
        padding-right: 2vh;
        background-color: var(--el-bg-color);
    }

    .box__content {
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }

    .box__content > div {
        padding: 10px;
    }

    .box__unfold-a {
        margin-right: 8px;
        cursor: pointer;
    }

    .footer {
        flex: 0 0 auto;
        text-align: center;
        width: 100%;
        height: 20px;
        font-size: 10px;
        line-height: 20px;
        color: var(--el-text-color-regular);

        a {
            color: var(--el-text-color-primary);
        }
    }
}
</style>
