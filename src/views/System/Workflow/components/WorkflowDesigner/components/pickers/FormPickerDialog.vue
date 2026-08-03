<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

import { FormApi } from "@/api/workflow/form-api.ts";

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
const tableData = ref<FormDefinitionVO[]>([]);
const keyword = ref("");
const selected = ref<FormDefinitionVO | null>(null);
const tableRef = ref<InstanceType<typeof ElTable>>();

const loadData = async () => {
    loading.value = true;
    try {
        const params: Record<string, unknown> = {};
        if (keyword.value) params.name = keyword.value;
        const result = await FormApi.page(params);
        tableData.value = result?.records || [];
        restoreSelection();
    } finally {
        loading.value = false;
    }
};

// 根据 modelValue（code）回显高亮行
const restoreSelection = () => {
    if (!props.modelValue) return;
    nextTick(() => {
        const row = tableData.value.find(r => r.code === props.modelValue);
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
            keyword.value = "";
            selected.value = null;
            loadData();
        }
    },
    { immediate: true }
);

const handleRowClick = (row: FormDefinitionVO) => {
    selected.value = row;
};

const handleConfirm = () => {
    if (!selected.value) return;
    emit("confirm", selected.value.code, selected.value.name);
    visible.value = false;
};
</script>

<template>
    <el-dialog v-model="visible" title="选择表单" width="600px" destroy-on-close :close-on-click-modal="false">
        <div style="margin-bottom: 12px">
            <el-input
                v-model="keyword"
                placeholder="搜索表单名称"
                clearable
                style="width: 240px"
                @keyup.enter="loadData" />
            <el-button type="primary" style="margin-left: 8px" @click="loadData">查询</el-button>
        </div>
        <el-table
            ref="tableRef"
            v-loading="loading"
            :data="tableData"
            highlight-current-row
            height="360"
            @row-click="handleRowClick"
            @current-change="handleRowClick">
            <el-table-column label="表单名称" prop="name" />
            <el-table-column label="编码" prop="code" width="160" />
            <el-table-column label="版本" prop="current_version" width="70" align="center" />
            <el-table-column label="状态" width="80" align="center">
                <template #default="{ row }">
                    <el-tag :type="row.active ? 'success' : 'info'" size="small">
                        {{ row.active ? "启用" : "禁用" }}
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
