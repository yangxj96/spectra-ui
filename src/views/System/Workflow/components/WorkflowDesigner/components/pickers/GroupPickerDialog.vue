<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

import { DepartmentApi } from "@/api/user/department-api.ts";

import type { ElTree } from "element-plus";

const visible = defineModel<boolean>("visible", { required: true });

const props = defineProps<{
    multiple?: boolean;
    modelValue?: string;
}>();

const emit = defineEmits<{
    confirm: [value: string, label?: string];
}>();

const loading = ref(false);
const treeData = ref<DepartmentTreeVO[]>([]);
const treeRef = ref<InstanceType<typeof ElTree>>();
const currentNode = ref<DepartmentTreeVO | null>(null);

const loadData = async () => {
    loading.value = true;
    try {
        treeData.value = await DepartmentApi.tree();
        restoreSelection();
    } finally {
        loading.value = false;
    }
};

// 根据 modelValue 回显已选中节点
const restoreSelection = () => {
    if (!props.modelValue) return;
    const ids = props.modelValue.split(",").filter(Boolean);
    if (ids.length === 0) return;
    nextTick(() => {
        if (props.multiple) {
            treeRef.value?.setCheckedKeys(ids);
        } else {
            treeRef.value?.setCurrentKey(ids[0]);
            const node = treeRef.value?.getNode(ids[0]);
            if (node) currentNode.value = node.data as DepartmentTreeVO;
        }
    });
};

watch(
    visible,
    v => {
        if (v) {
            currentNode.value = null;
            loadData();
        }
    },
    { immediate: true }
);

const handleNodeClick = (data: DepartmentTreeVO) => {
    if (!props.multiple) {
        currentNode.value = data;
    }
};

const handleConfirm = () => {
    if (props.multiple) {
        const checked = treeRef.value?.getCheckedNodes(false, false) as DepartmentTreeVO[];
        if (!checked || checked.length === 0) return;
        emit("confirm", checked.map(n => n.id).join(","), checked.map(n => n.name).join(","));
    } else {
        if (!currentNode.value) return;
        emit("confirm", currentNode.value.id, currentNode.value.name);
    }
    visible.value = false;
};

const hasSelection = () => {
    if (props.multiple) {
        const checked = treeRef.value?.getCheckedNodes(false, false);
        return !!checked && checked.length > 0;
    }
    return !!currentNode.value;
};
</script>

<template>
    <el-dialog v-model="visible" title="选择部门" width="480px" destroy-on-close :close-on-click-modal="false">
        <div v-loading="loading" style="height: 380px; overflow-y: auto">
            <el-tree
                ref="treeRef"
                :data="treeData"
                :props="{ label: 'name', children: 'children' }"
                node-key="id"
                :highlight-current="!multiple"
                :show-checkbox="multiple"
                default-expand-all
                @node-click="handleNodeClick" />
        </div>
        <template #footer>
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" :disabled="!hasSelection()" @click="handleConfirm">确定</el-button>
        </template>
    </el-dialog>
</template>
