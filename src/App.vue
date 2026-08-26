<script setup lang="ts">
import { reactive, ref } from "vue";

import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";
import { MESSAGE_DURATION } from "@/utils/message-utils.ts";

import type { Language } from "element-plus/es/locale";

const locale = ref(useAppStore().lang as Language);
/** 全局轻提示配置：max 同时显示数、duration 时长、plain 朴素样式、appendTo 挂载容器 */
const message = reactive({
    max: 3,
    duration: MESSAGE_DURATION,
    plain: true,
    appendTo: ".box-content"
});
</script>

<template>
    <div id="nav">
        <el-config-provider :locale="locale" :message="message">
            <router-view />
        </el-config-provider>
    </div>
</template>

<style lang="scss">
@use "@/assets/css/common.scss";

* {
    padding: 0;
    margin: 0;
}
</style>
