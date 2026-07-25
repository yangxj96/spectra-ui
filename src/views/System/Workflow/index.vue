<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";

import FormList from "./components/FormList/index.vue";
import WorkflowList from "./components/WorkflowList/index.vue";

const route = useRoute();

// 当前激活的标签页（从路由 query 恢复，默认 form）
const activeTab = ref((route.query.tab as string) || "form");
</script>

<template>
    <el-tabs v-model="activeTab" style="height: 100%">
        <el-tab-pane label="自定义表单" name="form" style="height: 100%">
            <FormList v-if="activeTab === 'form'" />
        </el-tab-pane>
        <el-tab-pane label="工作流定义" name="workflow" style="height: 100%">
            <WorkflowList v-if="activeTab === 'workflow'" />
        </el-tab-pane>
    </el-tabs>
</template>

<style scoped lang="scss">
:deep(.el-tabs__content) {
    height: calc(100% - 40px);
}

:deep(.el-tab-pane) {
    height: 100%;
}
</style>
