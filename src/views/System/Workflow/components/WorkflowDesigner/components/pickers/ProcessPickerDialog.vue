<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

import { WorkflowApi } from "@/api/workflow/workflow-api.ts";

import type { ElTable } from "element-plus";

const visible = defineModel<boolean>("visible", { required: true });

const props = defineProps<{
    multiple?: boolean;
    modelValue?: string;
}>();

const emit = defineEmits<{
    confirm: [value: string, label?: string];
}>();

const loading = ref(false);
const tableData = ref<ProcessDefinitionVO[]>([]);
const selected = ref<ProcessDefinitionVO | null>(null);
const tableRef = ref<InstanceType<typeof ElTable>>();

const loadData = async () => {
    loading.value = true;
    try {
        tableData.value = await WorkflowApi.getProcessDefinitions();
        restoreSelection();
    } finally {
        loading.value = false;
    }
};

// 根据 modelValue（key）回显高亮行
const restoreSelection = () => {
    if (!props.modelValue) return;
    nextTick(() => {
        const row = tableData.value.find(r => r.key === props.modelValue);
        if (row) {
            selected.value = row;
            tableRef.value?.setCurrentRow(row);
        }
    });
};

watch(
    visible,
    v => {
        if (v) {
            selected.value = null;
            loadData();
        }
    },
    { immediate: true }
);

const handleRowClick = (row: ProcessDefinitionVO) => {
    selected.value = row;
};

const handleConfirm = () => {
    if (!selected.value) return;
    emit("confirm", selected.value.key, selected.value.name);
    visible.value = false;
};
</script>

<template>
    <el-dialog v-model="visible" title="选择流程定义" width="620px" destroy-on-close :close-on-click-modal="false">
        <el-table
            ref="tableRef"
            v-loading="loading"
            :data="tableData"
            highlight-current-row
            height="360"
            @row-click="handleRowClick"
            @current-change="handleRowClick">
            <el-table-column label="流程名称" prop="name" />
            <el-table-column label="Key" prop="key" width="180" />
            <el-table-column label="版本" prop="version" width="70" align="center" />
            <el-table-column label="状态" width="80" align="center">
                <template #default="{ row }">
                    <el-tag :type="row.suspended ? 'danger' : 'success'" size="small">
                        {{ row.suspended ? "挂起" : "激活" }}
                    </el-tag>
                </template>
            </el-table-column>
        </el-table>
        <template #footer>
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" :disabled="!selected" @click="handleConfirm">确定</el-button>
        </template>
    </el-dialog>
</template>
