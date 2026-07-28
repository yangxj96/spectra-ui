<script setup lang="ts">
import { ref, watch } from "vue";

const visible = defineModel<boolean>("visible", { required: true });

const props = defineProps<{
    multiple?: boolean;
    modelValue?: string;
}>();

const emit = defineEmits<{
    confirm: [value: string, label?: string];
}>();

const inputValue = ref("");

watch(visible, v => {
    if (v) {
        inputValue.value = props.modelValue || "";
    }
});

const handleConfirm = () => {
    if (!inputValue.value.trim()) return;
    emit("confirm", inputValue.value.trim());
    visible.value = false;
};
</script>

<template>
    <el-dialog v-model="visible" title="选择实现类" width="520px" destroy-on-close :close-on-click-modal="false">
        <el-empty description="类列表接口开发中，请手动输入全限定类名" :image-size="80" />
        <el-input
            v-model="inputValue"
            placeholder="如：com.devops00.spectra.workflow.delegate.MyDelegate"
            clearable
            style="margin-top: 12px" />
        <template #footer>
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" :disabled="!inputValue.trim()" @click="handleConfirm">确定</el-button>
        </template>
    </el-dialog>
</template>
