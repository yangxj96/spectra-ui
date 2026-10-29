<script setup lang="ts">
import { onMounted, ref } from "vue";

import { RegionApi } from "@/api/system/region-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

import type { CascaderNode, CascaderProps, CascaderValue } from "element-plus";

defineOptions({
    name: "RegionSelectLazy"
});

/**
 * 对外：只要 ID
 */
const model = defineModel<string>({
    required: true
});

/**
 * full_name
 */
const name = defineModel<string>("name", {
    required: true
});

/**
 * 内部：路径数组（核心）
 */
const cascaderValue = ref<string[]>([]);

/** 区域路径加载错误；失败必须可见并可重试，不能伪装成空选项。 */
const loadError = ref("");

/** 重新挂载级联选择器，强制重新执行 lazyLoad。 */
const cascaderKey = ref(0);

let pathSequence = 0;

function errorMessage(error: unknown): string {
    return error instanceof Error && error.message ? error.message : "区域数据加载失败";
}

/**
 * 清空选择时同步清理 id、名称和内部路径，避免表单显示已清空但仍提交旧区域。
 */
function clearSelection(): void {
    pathSequence++;
    model.value = "";
    name.value = "";
    cascaderValue.value = [];
}

/**
 * lazy load
 */
const handleLoad: CascaderProps["lazyLoad"] = async (node: CascaderNode, resolve) => {
    try {
        const res = await RegionApi.load({
            level: node.level + 1,
            id: (node.data as Region | undefined)?.id
        });

        loadError.value = "";
        resolve(res ?? []);
    } catch (e) {
        loadError.value = errorMessage(e);
        MessageUtils.error(e);
        resolve([]);
    }
};

/**
 * 用户选择 → 同步 model + name
 */
const handleChange = async (value: CascaderValue | null | undefined) => {
    pathSequence++;
    const sequence = pathSequence;

    if (!value || !Array.isArray(value) || value.length === 0) {
        clearSelection();
        return;
    }

    const last = value[value.length - 1];
    if (typeof last !== "string") {
        clearSelection();
        return;
    }

    // 先更新 id 并清空旧名称；路径响应返回前不能保留上一区域的 full_name。
    model.value = last;
    name.value = "";

    try {
        const res = await RegionApi.path(last);
        if (sequence !== pathSequence) return;
        name.value = res.full_name;
        loadError.value = "";
    } catch (e) {
        if (sequence !== pathSequence) return;
        loadError.value = errorMessage(e);
        MessageUtils.error(e);
    }
};

/**
 * 回显核心
 */
const initPath = async () => {
    const sequence = ++pathSequence;
    if (!model.value) {
        cascaderValue.value = [];
        return;
    }

    try {
        const res = await RegionApi.path(model.value);
        if (sequence !== pathSequence) return;

        // ✔ 设置路径数组（关键）
        cascaderValue.value = res.ids;

        // ✔ 设置 full_name
        name.value = res.full_name;
        loadError.value = "";
    } catch (e) {
        if (sequence !== pathSequence) return;
        loadError.value = errorMessage(e);
        MessageUtils.error(e);
    }
};

/** 失败后重新加载当前路径和懒加载节点。 */
function retryLoad(): void {
    loadError.value = "";
    cascaderKey.value++;
    void initPath();
}

onMounted(initPath);

/**
 * props
 */
const cascaderProps: CascaderProps = {
    lazy: true,
    checkStrictly: true,
    value: "id",
    label: "name",
    emitPath: true,
    lazyLoad: handleLoad
};
</script>

<template>
    <div class="region-select-lazy">
        <el-alert
            v-if="loadError"
            class="region-select-lazy__error"
            :title="loadError"
            type="error"
            :closable="false"
            show-icon>
            <el-button size="small" @click="retryLoad">重新加载</el-button>
        </el-alert>
        <el-cascader
            :key="cascaderKey"
            v-model="cascaderValue"
            :props="cascaderProps"
            clearable
            filterable
            @change="handleChange"
            style="width: 100%" />
    </div>
</template>

<style scoped>
.region-select-lazy__error {
    margin-bottom: 8px;
}
</style>
