<script setup lang="ts">
import JSONEditor from "jsoneditor";
import "jsoneditor/dist/jsoneditor.min.css";
import { onMounted, onUnmounted, useTemplateRef, watch } from "vue";

defineOptions({
    name: "JsonEditor"
});

interface Props {
    modelValue?: JsonValue;
    readOnly?: boolean;
    expandAll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    expandAll: false
});

const emit = defineEmits<{
    (e: "update:modelValue", value: JsonValue): void;
}>();

const editor = useTemplateRef<HTMLElement>("editor");
let instance: JSONEditor | undefined;
let isUserTyping = false;
let lastText = "";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** 解析并提交当前文本；无效 JSON 不覆盖模型。 */
function emitText(text: string): void {
    isUserTyping = true;

    try {
        const parsed = text ? JSON.parse(text) : {};
        emit("update:modelValue", parsed);
    } catch (error) {
        console.error("JSON 解析错误:", error);
    }
}

/** 提交前立即执行尚未触发的防抖输入，返回是否已同步。 */
function flush(): void {
    if (!debounceTimer) return;
    clearTimeout(debounceTimer);
    debounceTimer = null;
    emitText(lastText);
}

const handleChangeText = (newValue: string) => {
    lastText = newValue;
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        emitText(lastText);
    }, 300);
};

/**
 * 安全 stringify
 */
function safeStringify(value: JsonValue | undefined) {
    try {
        return JSON.stringify(value ?? {}, null, 2);
    } catch {
        return "{}";
    }
}

onMounted(() => {
    if (editor.value) {
        instance = new JSONEditor(editor.value, {
            mode: "code",
            allowSchemaSuggestions: true,
            indentation: 4,
            mainMenuBar: false,
            statusBar: false,
            onChangeText: handleChangeText
        });

        // 初始化时设置值
        if (props.modelValue) {
            instance.setText(safeStringify(props.modelValue));
        }
        if (props.readOnly) {
            instance.setMode("view");
            if (props.expandAll) instance.expandAll();
        }
    }
});

onUnmounted(() => {
    // 卸载时取消未触发的输入并销毁第三方编辑器，避免计时器在卸载后继续 emit。
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
    instance?.destroy();
    instance = undefined;
});

watch(
    () => props.modelValue,
    newVal => {
        if (!instance) return;

        // 避免用户正在输入时覆盖
        const isFocused = editor.value?.contains(document.activeElement);

        if (!isFocused && !isUserTyping) {
            instance.setText(safeStringify(newVal));
            if (props.readOnly && props.expandAll) instance.expandAll();
        }
        isUserTyping = false;
    },
    { deep: true }
);

watch(
    () => props.readOnly,
    val => {
        if (instance) {
            instance.setMode(val ? "view" : "code");
            if (val && props.expandAll) instance.expandAll();
        }
    }
);

watch(
    () => props.expandAll,
    expand => {
        if (expand && props.readOnly) instance?.expandAll();
    }
);

defineExpose({ flush });
</script>

<template>
    <div ref="editor"></div>
</template>
