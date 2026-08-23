<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

import { UserApi } from "@/api/user/user-api.ts";

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
const tableData = ref<UserPageVO[]>([]);
const total = ref(0);
const keyword = ref("");
const pageNum = ref(1);
const pageSize = ref(10);
const tableRef = ref<InstanceType<typeof ElTable>>();
const currentRow = ref<UserPageVO | null>(null);

// 跨页持久化的多选结果：用户ID -> 显示名
const selectedMap = ref<Map<string, string>>(new Map());

const loadData = async () => {
    loading.value = true;
    try {
        const params: UserPageParams = {
            page_num: pageNum.value,
            page_size: pageSize.value
        };
        if (keyword.value) params.real_name = keyword.value;
        const result = await UserApi.page(params);
        tableData.value = result?.records || [];
        total.value = result?.total || 0;
        syncTableSelection();
    } finally {
        loading.value = false;
    }
};

// 将持久化的选中状态反映到当前页的复选框
const syncTableSelection = () => {
    if (!props.multiple) return;
    nextTick(() => {
        tableData.value.forEach(row => {
            if (selectedMap.value.has(row.id)) {
                selectedMap.value.set(row.id, row.real_name);
                tableRef.value?.toggleRowSelection(row, true);
            }
        });
    });
};

watch(
    visible,
    v => {
        if (v) {
            keyword.value = "";
            pageNum.value = 1;
            currentRow.value = null;
            selectedMap.value = new Map();
            if (props.multiple && props.modelValue) {
                props.modelValue
                    .split(",")
                    .filter(Boolean)
                    .forEach(u => selectedMap.value.set(u, u));
            }
            loadData();
        }
    },
    { immediate: true }
);

// 用户手动勾选单行（不受翻页/程序化选中干扰）
const handleSelect = (selection: UserPageVO[], row: UserPageVO) => {
    if (selection.some(r => r.id === row.id)) {
        selectedMap.value.set(row.id, row.real_name);
    } else {
        selectedMap.value.delete(row.id);
    }
};

// 用户点击表头全选
const handleSelectAll = (selection: UserPageVO[]) => {
    if (selection.length > 0) {
        tableData.value.forEach(row => selectedMap.value.set(row.id, row.real_name));
    } else {
        tableData.value.forEach(row => selectedMap.value.delete(row.id));
    }
};

const handleRowClick = (row: UserPageVO) => {
    currentRow.value = row;
};

const handleConfirm = () => {
    if (props.multiple) {
        if (selectedMap.value.size === 0) return;
        emit("confirm", [...selectedMap.value.keys()].join(","), [...selectedMap.value.values()].join(","));
    } else {
        if (!currentRow.value) return;
        emit("confirm", currentRow.value.id, currentRow.value.real_name);
    }
    visible.value = false;
};

const hasSelection = () => (props.multiple ? selectedMap.value.size > 0 : !!currentRow.value);
</script>

<template>
    <el-dialog v-model="visible" title="选择用户" width="680px" destroy-on-close :close-on-click-modal="false">
        <div style="margin-bottom: 12px">
            <el-input v-model="keyword" placeholder="搜索姓名" clearable style="width: 240px" @keyup.enter="loadData" />
            <el-button type="primary" style="margin-left: 8px" @click="loadData">查询</el-button>
        </div>
        <el-table
            ref="tableRef"
            v-loading="loading"
            :data="tableData"
            :highlight-current-row="!multiple"
            height="360"
            @select="handleSelect"
            @select-all="handleSelectAll"
            @row-click="handleRowClick">
            <el-table-column v-if="multiple" type="selection" width="50" />
            <el-table-column label="工号" prop="employee_no" width="140" />
            <el-table-column label="姓名" prop="real_name" width="120" />
            <el-table-column label="部门" prop="department_name" />
            <el-table-column label="手机号" prop="phone" width="140" />
        </el-table>
        <div style="margin-top: 12px; display: flex; justify-content: flex-end">
            <el-pagination
                v-model:current-page="pageNum"
                v-model:page-size="pageSize"
                :total="total"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next"
                @size-change="loadData"
                @current-change="loadData" />
        </div>
        <template #footer>
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" :disabled="!hasSelection()" @click="handleConfirm">确定</el-button>
        </template>
    </el-dialog>
</template>
