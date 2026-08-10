<script setup lang="ts">
import { useRouter } from "vue-router";

defineOptions({
    name: "OaFormPage"
});

interface Props {
    title: string;
    description?: string;
    backPath: string;
}

const props = withDefaults(defineProps<Props>(), {
    description: ""
});

const router = useRouter();

function goBack(): void {
    router.push(props.backPath);
}
</script>

<template>
    <div class="oa-form-page">
        <div class="oa-form-header">
            <div>
                <h2>{{ title }}</h2>
                <p v-if="description">{{ description }}</p>
            </div>
            <el-button @click="goBack">返回列表</el-button>
        </div>
        <div class="oa-form-content">
            <slot />
        </div>
        <div class="oa-form-actions">
            <slot name="actions" />
        </div>
    </div>
</template>

<style scoped lang="scss">
.oa-form-page {
    min-height: 100%;
    padding: 20px;
    overflow: auto;
}

.oa-form-header,
.oa-form-content,
.oa-form-actions {
    width: min(880px, 100%);
    margin: 0 auto;
}

.oa-form-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

h2 {
    margin: 0;
    color: var(--el-text-color-primary);
    font-size: 20px;
    font-weight: 600;
}

p {
    margin: 8px 0 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.oa-form-content {
    padding: 24px 0 8px;
}

.oa-form-content :deep(.el-form) {
    width: 100%;
}

.oa-form-content :deep(.el-form-item__content > .el-input),
.oa-form-content :deep(.el-form-item__content > .el-select),
.oa-form-content :deep(.el-form-item__content > .el-date-editor),
.oa-form-content :deep(.el-form-item__content > .el-input-number) {
    width: 100%;
}

.oa-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-lighter);
}
</style>
