<script setup lang="ts">
import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";

defineOptions({
    name: "LayoutsFooter"
});

const appStore = useAppStore();
</script>

<template>
    <!-- 底部版权 -->
    <el-footer v-if="appStore.system.copyright_enabled" class="footer">
        Copyright © 2025
        <strong>
            <a
                v-if="appStore.system.copyright_url"
                :href="appStore.system.copyright_url"
                target="_blank"
                rel="noopener noreferrer">
                {{ appStore.system.copyright_name || appStore.system.name }}
            </a>
            <span v-else>{{ appStore.system.copyright_name || appStore.system.name }}</span>
        </strong>
        All Rights Reserved.
    </el-footer>
</template>

<style scoped lang="scss">
.footer {
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
</style>
