<script setup lang="ts">
import { useRouter } from "vue-router";

import ComponentsIcons from "@/components/ComponentsIcons/index.vue";

defineOptions({ name: "MenuItem" });

defineProps<{ menu: Menu }>();

const router = useRouter();

function handleClick(menu: Menu) {
    if (menu.routeName) router.push({ name: menu.routeName });
}
</script>

<template>
    <el-sub-menu v-if="menu.menuType === 'DIRECTORY'" :index="menu.id">
        <template #title>
            <ComponentsIcons :name="menu.icon" class-name="icon-sidebar" />
            <span>{{ menu.name }}</span>
        </template>
        <MenuItem v-for="child in menu.children ?? []" :key="child.id" :menu="child" />
    </el-sub-menu>
    <el-menu-item
        v-else
        :index="menu.routeName ?? menu.id"
        :data-route-name="menu.routeName"
        @click="handleClick(menu)">
        <ComponentsIcons :name="menu.icon" class-name="icon-sidebar" />
        <span>{{ menu.name }}</span>
    </el-menu-item>
</template>

<style scoped lang="scss">
.icon-sidebar {
    width: 1.4em;
    height: 1.4em;
    padding-right: 0.5em;
    padding-left: 0.2em;
}
</style>
