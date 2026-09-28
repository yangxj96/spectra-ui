<script setup lang="ts">
import StepNavigation from "@/components/StepNavigation/index.vue";
import type { StepNavigationItem } from "@/components/StepNavigation/types.ts";

defineProps<{
    title: string;
    subtitle: string;
    steps: StepNavigationItem[];
    activeStep: number;
    guideTitle: string;
    guideType?: "info" | "warning";
    loading?: boolean;
}>();

const emit = defineEmits<{
    "step-select": [key: string];
}>();
</script>

<template>
    <div v-loading="loading" class="restructure-page">
        <div class="restructure-shell">
            <div class="restructure-workspace">
                <aside class="restructure-side restructure-side-left">
                    <StepNavigation
                        :items="steps"
                        :active-key="String(activeStep)"
                        aria-label="部门重组步骤"
                        @select="emit('step-select', $event)" />
                </aside>

                <section class="restructure-section">
                    <div class="restructure-step-header">
                        <slot name="heading" />
                    </div>
                    <div class="restructure-content">
                        <slot />
                    </div>
                    <div class="restructure-actions">
                        <slot name="actions" />
                    </div>
                </section>

                <aside class="restructure-side restructure-side-right">
                    <div class="section-title restructure-heading">
                        <div>
                            <span>{{ title }}</span>
                            <small>{{ subtitle }}</small>
                        </div>
                    </div>
                    <el-alert
                        class="restructure-tip"
                        :class="{ 'restructure-tip-warning': guideType === 'warning' }"
                        :title="guideTitle"
                        :type="guideType ?? 'info'"
                        :closable="false"
                        show-icon>
                        <template #default>
                            <div class="restructure-tip-content">
                                <slot name="guide" />
                            </div>
                        </template>
                    </el-alert>
                    <slot name="summary" />
                </aside>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.restructure-page {
    height: 100%;
    min-height: 0;
    padding: 20px 32px 24px;
    overflow: hidden;
    background: var(--el-bg-color);
    box-sizing: border-box;
}

.restructure-shell {
    display: flex;
    flex-direction: column;
    width: min(1600px, 100%);
    height: 100%;
    min-height: 0;
    margin: 0 auto;
}

.restructure-workspace {
    display: grid;
    flex: 1 1 auto;
    grid-template-columns: max-content minmax(0, 1fr) minmax(220px, 280px);
    min-height: 0;
    gap: 24px;
}

.restructure-side {
    min-width: 0;
    padding-top: 4px;
}

.restructure-side-left {
    grid-column: 1;
    width: max-content;
    max-width: 240px;
}

.restructure-side-right {
    grid-column: 3;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.restructure-section {
    grid-column: 2;
    grid-row: 1;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    background: var(--el-bg-color);
}

.restructure-step-header {
    flex: 0 0 auto;
    min-height: 0;
}

.restructure-content {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0 4px 12px;
    overflow: auto;
    scrollbar-gutter: stable;
}

.section-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.section-title > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.section-title span {
    color: var(--el-text-color-primary);
    font-size: 16px;
    font-weight: 600;
}

.section-title small {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    font-weight: 400;
}

.restructure-heading {
    align-items: flex-start;
    flex-direction: column;
    margin: 0;
    padding: 14px 16px;
    border: 1px solid var(--el-border-color-extra-light);
    border-left: 3px solid var(--el-color-primary-light-5);
    border-radius: 0 10px 10px 0;
    background: var(--el-fill-color-light);
}

.restructure-tip {
    flex: 0 0 auto;
    align-items: flex-start;
    padding: 14px 16px;
    border: 1px solid var(--el-color-info-light-7);
    border-radius: 10px;
    background: var(--el-color-info-light-9);
}

.restructure-tip-warning {
    border-color: var(--el-color-warning-light-7);
    background: var(--el-color-warning-light-9);
}

.restructure-tip :deep(.el-alert__icon) {
    flex: 0 0 auto;
    margin-top: 2px;
}

.restructure-tip :deep(.el-alert__content) {
    min-width: 0;
    gap: 4px;
}

.restructure-tip :deep(.el-alert__title) {
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
}

.restructure-tip-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--el-text-color-regular);
    font-size: 12px;
    line-height: 1.7;
}

.restructure-tip-content p {
    margin: 0;
}

.restructure-tip-content strong {
    color: var(--el-text-color-primary);
    font-weight: 600;
}

.restructure-actions {
    display: flex;
    flex: 0 0 auto;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 0 4px;
    border-top: 1px solid var(--el-border-color-lighter);
}

.restructure-actions :deep(.el-button) {
    min-width: 88px;
}

:deep(.el-input),
:deep(.el-select),
:deep(.el-autocomplete),
:deep(.el-tree-select) {
    width: 100%;
}

@media (max-width: 1200px) {
    .restructure-workspace {
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow: hidden;
    }

    .restructure-side {
        flex: 0 0 auto;
        padding-top: 0;
    }

    .restructure-section {
        order: 1;
        min-height: 0;
    }

    .restructure-side-right {
        order: 2;
    }
}

@media (max-width: 768px) {
    .restructure-page {
        padding: 20px 16px 24px;
    }
}
</style>
