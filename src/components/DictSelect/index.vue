<script setup lang="ts">
import { computed, onMounted, type PropType, ref, watch } from "vue";

import { useDictStore } from "@/plugin/store/modules/use-dict-store.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

defineOptions({
    name: "DictSelect"
});

type ModelType = string | number | boolean | undefined;

const model = defineModel<ModelType>({
    required: true,
    default: null
});

const dict_code = defineModel("dict_code", {
    required: false,
    type: String as PropType<string | null>
});

const dictStore = useDictStore();

const options = ref<DictItem[]>([]);

/** 字典加载失败信息；失败时显示明确选项，而不是伪装成空字典。 */
const loadError = ref("");

// localValue 用来绑定 el-select，支持字符串/数字/空
const localValue = ref<string | undefined>(undefined);

// 计算绑定，保证双向绑定
const localComputed = computed({
    get() {
        return toInner(localValue.value);
    },
    set(val: string | undefined) {
        localValue.value = val;
        model.value = toOuter(val);
    }
});

watch(
    () => dictStore.dicts[dict_code.value?.trim() ?? ""],
    dictItems => {
        if (dictItems) {
            options.value = dictItems;
        }
    }
);

/** 加载字典选项；失败时保留可观察错误并允许重新打开下拉时重试。 */
async function loadOptions(): Promise<void> {
    const dictCode = dict_code.value?.trim();
    if (!dictCode) {
        options.value = [];
        loadError.value = "";
        return;
    }

    try {
        options.value = await dictStore.getDictData(dictCode);
        loadError.value = "";
        // 如果外部 model 未传值，使用 default_flag 的值
        if (model.value === undefined || model.value === null) {
            const defaultItem = options.value.find(item => item.default_flag && item.state === 0);
            if (defaultItem) {
                localValue.value = defaultItem.value;
                model.value = toOuter(defaultItem.value);
            }
        } else {
            // 如果外部传入了 model，则覆盖 default_flag
            localValue.value = toInner(model.value);
        }
    } catch (error) {
        options.value = [];
        loadError.value = error instanceof Error && error.message ? error.message : "获取字典数据失败";
        MessageUtils.error(error);
    }
}

// 挂载的时候读取字典
onMounted(loadOptions);

// 失败后重新打开下拉时重试，正常加载不重复请求。
function handleVisibleChange(visible: boolean): void {
    if (visible && loadError.value) void loadOptions();
}

// 监听外部 model 改变，同步 localValue
watch(model, val => {
    const inner = toInner(val);
    if (inner !== localValue.value) {
        localValue.value = inner;
    }
});

function toInner(val: ModelType): string | undefined {
    if (val === undefined || val === null) return undefined;
    return String(val);
}

function toOuter(val: string | undefined): ModelType {
    if (val === undefined) return undefined;

    switch (typeof model.value) {
        case "number":
            return Number(val);
        case "boolean":
            return val === "true";
        default:
            return val;
    }
}
</script>

<template>
    <el-select v-model="localComputed" v-bind="{ clearable: true, ...$attrs }" @visible-change="handleVisibleChange">
        <el-option v-if="loadError" :label="`字典加载失败：${loadError}`" value="" disabled />
        <el-option
            v-for="item in options"
            :key="item.id"
            :label="item.label"
            :value="item.value"
            :disabled="item.state !== 0" />
    </el-select>
</template>
