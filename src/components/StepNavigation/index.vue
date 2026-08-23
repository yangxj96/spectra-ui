<script setup lang="ts">
import type { StepNavigationItem } from "./types.ts";

defineOptions({
    name: "StepNavigation"
});

interface Props {
    items: readonly StepNavigationItem[];
    activeKey: string;
    activeChildKey?: string;
    ariaLabel?: string;
    responsiveLayout?: "row" | "grid";
    responsiveChildren?: "hide" | "row";
}

const props = withDefaults(defineProps<Props>(), {
    activeChildKey: "",
    ariaLabel: "步骤导航",
    responsiveLayout: "row",
    responsiveChildren: "hide"
});

const emit = defineEmits<{
    select: [key: string];
    "select-child": [key: string];
}>();

function formatStepIndex(index: number): string {
    return String(index + 1).padStart(2, "0");
}

function formatChildIndex(parentIndex: number, childIndex: number): string {
    return `${parentIndex + 1}.${childIndex + 1}`;
}
</script>

<template>
    <nav
        class="step-navigation"
        :class="[`step-navigation--${props.responsiveLayout}`, `step-navigation--children-${props.responsiveChildren}`]"
        :aria-label="props.ariaLabel">
        <template v-for="(item, parentIndex) in props.items" :key="item.key">
            <button
                type="button"
                class="step-navigation__item"
                :class="{
                    'is-active': props.activeKey === item.key,
                    'is-complete': item.complete,
                    'is-disabled': item.disabled
                }"
                :disabled="item.disabled"
                :aria-current="props.activeKey === item.key ? 'step' : undefined"
                @click="emit('select', item.key)">
                <span class="step-navigation__index">{{ formatStepIndex(parentIndex) }}</span>
                <span class="step-navigation__content">
                    <strong>{{ item.title }}</strong>
                    <small v-if="item.description">{{ item.description }}</small>
                </span>
            </button>

            <div
                v-if="props.activeKey === item.key && item.children && item.children.length"
                class="step-navigation__children">
                <button
                    v-for="(child, childIndex) in item.children"
                    :key="child.key"
                    type="button"
                    class="step-navigation__child"
                    :class="{
                        'is-active': props.activeChildKey === child.key,
                        'is-complete': child.complete,
                        'is-disabled': child.disabled
                    }"
                    :disabled="child.disabled"
                    :aria-current="props.activeChildKey === child.key ? 'step' : undefined"
                    @click="emit('select-child', child.key)">
                    <span class="step-navigation__child-index">{{ formatChildIndex(parentIndex, childIndex) }}</span>
                    <span class="step-navigation__child-content">
                        <strong>{{ child.title }}</strong>
                        <small v-if="child.description">{{ child.description }}</small>
                    </span>
                </button>
            </div>
        </template>
    </nav>
</template>

<style scoped lang="scss">
.step-navigation {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 1px solid var(--el-border-color-extra-light);
    border-radius: 12px;
    background: var(--el-fill-color-lighter);
}

.step-navigation__item,
.step-navigation__child {
    border: 0;
    outline: none;
    background: transparent;
    color: var(--el-text-color-secondary);
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.step-navigation__item {
    display: flex;
    align-items: flex-start;
    width: 100%;
    gap: 12px;
    padding: 12px;
    border-radius: 8px;
    transition:
        background-color 0.2s ease,
        color 0.2s ease,
        box-shadow 0.2s ease;
}

.step-navigation__item:hover {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
}

.step-navigation__item:focus-visible,
.step-navigation__child:focus-visible {
    box-shadow: 0 0 0 2px var(--el-color-primary-light-5);
}

.step-navigation__item.is-active {
    background: var(--el-bg-color);
    color: var(--el-text-color-primary);
    box-shadow: 0 4px 12px rgb(15 23 42 / 6%);
}

.step-navigation__item.is-disabled,
.step-navigation__child.is-disabled {
    color: var(--el-text-color-placeholder);
    cursor: not-allowed;
    opacity: 0.65;
}

.step-navigation__item.is-disabled:hover {
    background: transparent;
    box-shadow: none;
}

.step-navigation__index {
    display: inline-flex;
    flex: 0 0 30px;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    line-height: 1;
}

.step-navigation__item.is-active .step-navigation__index,
.step-navigation__item.is-complete .step-navigation__index {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
}

.step-navigation__content,
.step-navigation__child-content {
    display: flex;
    min-width: 0;
    flex-direction: column;
}

.step-navigation__content {
    gap: 3px;
    padding-top: 1px;
}

.step-navigation__content strong {
    color: inherit;
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
}

.step-navigation__content small {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 18px;
}

.step-navigation__children {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: -2px 8px 4px 28px;
    padding: 4px 0 4px 10px;
    border-left: 1px solid var(--el-border-color-lighter);
}

.step-navigation__child {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 7px;
    transition:
        background-color 0.2s ease,
        color 0.2s ease;
}

.step-navigation__child:hover {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
}

.step-navigation__child.is-active {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
}

.step-navigation__child-index {
    flex: 0 0 auto;
    min-width: 28px;
    color: inherit;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    line-height: 18px;
}

.step-navigation__child-content {
    gap: 1px;
}

.step-navigation__child-content strong,
.step-navigation__child-content small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.step-navigation__child-content strong {
    color: inherit;
    font-size: 12px;
    font-weight: 600;
    line-height: 18px;
}

.step-navigation__child-content small {
    color: var(--el-text-color-secondary);
    font-size: 11px;
    line-height: 16px;
}

@media (max-width: 1200px) {
    .step-navigation--row {
        flex-direction: row;
    }

    .step-navigation--row .step-navigation__item {
        flex: 1;
    }

    .step-navigation--grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .step-navigation--grid .step-navigation__item {
        min-width: 0;
    }

    .step-navigation--children-hide .step-navigation__children {
        display: none;
    }

    .step-navigation--children-row {
        flex-wrap: wrap;
    }

    .step-navigation--children-row .step-navigation__children {
        flex: 1 0 100%;
        flex-direction: row;
        margin: 0;
        padding: 6px 0 0;
        border-top: 1px solid var(--el-border-color-lighter);
        border-left: 0;
    }

    .step-navigation--children-row .step-navigation__child {
        flex: 1;
    }
}

@media (max-width: 768px) {
    .step-navigation {
        padding: 6px;
    }

    .step-navigation--grid {
        display: flex;
        flex-direction: column;
    }

    .step-navigation__item {
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 8px;
    }

    .step-navigation__content small,
    .step-navigation__child-content small {
        display: none;
    }
}
</style>
