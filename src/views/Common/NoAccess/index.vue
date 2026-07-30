<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";

import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";
import { findFirstRoutableMenu } from "@/utils/menu-utils.ts";

const router = useRouter();
const appStore = useAppStore();

const time = ref(-1);
const second = ref(3);

onMounted(() => {
    time.value = globalThis.setInterval(() => {
        second.value = second.value - 1;
        if (second.value <= 0) {
            goToSafePage();
        }
    }, 1000);
});

onUnmounted(() => {
    clearInterval(time.value);
});

const handleBack = () => {
    if (time.value !== -1) {
        clearInterval(time.value);
    }
    goToSafePage();
};

function goToSafePage() {
    for (const root of appStore.menus) {
        const target = findFirstRoutableMenu(root);
        if (target?.routeName) {
            router.replace({ name: target.routeName });
            return;
        }
    }
    router.replace({ name: "Profile" });
}
</script>

<template>
    <el-result icon="error" title="401" :sub-title="`无权访问该页面,${second}秒后返回可访问页面`">
        <template #extra>
            <el-button type="primary" @click="handleBack">返回可访问页面</el-button>
        </template>
    </el-result>
</template>
