<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import { cancelAllRequests } from "@/plugin/request/http.ts";
import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";

import MenuItem from "./MenuItem/index.vue";

defineOptions({ name: "LayoutsSidebar" });

const appStore = useAppStore();
const route = useRoute();
const activeMenu = computed(() => {
    const name = route.meta.activeMenu ?? route.meta.requiredMenu;
    return typeof name === "string" ? name : "";
});
</script>

<template>
    <el-menu
        class="box__menu"
        :default-active="activeMenu"
        :collapse="!appStore.unfold"
        :collapse-transition="true"
        :unique-opened="true"
        @select="cancelAllRequests">
        <MenuItem v-for="menu in appStore.currentMenus" :key="menu.id" :menu="menu" />
    </el-menu>
</template>

<style scoped lang="scss">
.box__menu {
    height: 100%;
}

.box__menu:not(.el-menu--collapse) {
    width: 100%;
}
</style>
