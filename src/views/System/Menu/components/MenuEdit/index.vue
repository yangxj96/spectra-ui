<script setup lang="ts">
import { type FormInstance, type FormRules } from "element-plus";
import { onMounted, reactive, useTemplateRef } from "vue";

import { MenuApi } from "@/api/system/menu-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import IconPicker from "@/components/IconPicker/index.vue";
import JsonEditor from "@/components/JsonEditor/index.vue";
import { MessageUtils } from "@/utils/message-utils.ts";

const props = defineProps<{
    row?: Menu;
    tableData: Menu[];
}>();

const emit = defineEmits<{
    /** 关闭事件 */
    close: [];
}>();

const menuForm = useTemplateRef<FormInstance>("ruleFormRef");

// 编辑标识,是否为编辑数据
const has_edit = props.row?.id && props.row.id !== "";

// 定义菜单编辑对话框的状态和表单数据
const edit = reactive({
    visible: true,
    title: (has_edit ? "编辑" : "新增") + "菜单",
    rules: {
        name: [{ required: true, message: "请输入菜单名称", trigger: "blur" }],
        icon: [{ required: true, message: "请选择菜单图标", trigger: "blur" }],
        path: [{ required: true, message: "请输入菜单路径", trigger: "blur" }],
        component: [{ required: true, message: "请输入组件路径", trigger: "blur" }],
        sort: [{ required: true, message: "请输入排序", trigger: "blur" }]
    } as FormRules,
    form: {} as Menu
});

onMounted(() => {
    edit.form = has_edit ? JSON.parse(JSON.stringify(props.row || edit.form)) : ({} as Menu);
});

// 处理关闭
const handleClose = () => {
    edit.visible = false;
    emit("close");
};

// 保存菜单
const handleMenuSave = async () => {
    if (!menuForm.value) return;
    await menuForm.value?.validate(async valid => {
        if (valid) {
            if (has_edit) {
                await MenuApi.update(edit.form);
            } else {
                await MenuApi.create(edit.form);
            }
            MessageUtils.success(has_edit ? "修改菜单成功" : "新增菜单成功", handleClose);
        }
    });
};
</script>

<template>
    <el-drawer v-model="edit.visible" class="loading-box" :modal="true" @close="handleClose">
        <template #header>
            <div>
                <ComponentsIcons name="icon-edit" />
                {{ edit.title }}
            </div>
        </template>
        <template #default>
            <el-form
                ref="ruleFormRef"
                :rules="edit.rules"
                :model="edit.form"
                label-width="auto"
                style="padding: 20px"
                @submit.prevent>
                <el-form-item v-if="has_edit" label="数据ID" prop="id">
                    <el-input v-model="edit.form.id" disabled clearable placeholder="请输入菜单名称" />
                </el-form-item>
                <el-form-item label="上级菜单" prop="pid">
                    <el-tree-select
                        v-model="edit.form.pid"
                        :data="tableData"
                        placeholder="请选择菜单父级"
                        check-strictly
                        default-expand-all
                        node-key="id"
                        append-to=".box-content"
                        :props="{ label: 'name' }"
                        :render-after-expand="false" />
                </el-form-item>
                <el-form-item label="名称" prop="name">
                    <el-input v-model="edit.form.name" clearable placeholder="请输入菜单名称" />
                </el-form-item>
                <el-form-item label="图标" prop="icon">
                    <IconPicker v-model="edit.form.icon" />
                </el-form-item>
                <el-form-item label="是否隐藏" prop="hide">
                    <el-switch v-model="edit.form.hide" />
                </el-form-item>
                <el-form-item label="路径" prop="path">
                    <el-input v-model="edit.form.path" clearable placeholder="请输入路径" />
                </el-form-item>
                <el-form-item label="组件" prop="component">
                    <el-input v-model="edit.form.component" clearable placeholder="请输入组件路径" />
                </el-form-item>
                <el-form-item label="布局" prop="layout">
                    <el-select v-model="edit.form.layout" clearable placeholder="请输入布局" append-to=".box-content">
                        <el-option label="默认布局" value="default" />
                        <el-option label="空白布局" value="blank" />
                    </el-select>
                </el-form-item>
                <el-form-item label="元数据" prop="metadata">
                    <JsonEditor :read-only="false" :model-value="edit.form.metadata ?? {}" style="width: 100%" />
                </el-form-item>
                <el-form-item label="排序" prop="sort">
                    <el-input-number
                        v-model="edit.form.sort"
                        :min="0"
                        :max="999"
                        placeholder="请输入排序"
                        style="width: 100%" />
                </el-form-item>
            </el-form>
        </template>
        <template #footer>
            <el-button @click="handleClose">取消</el-button>
            <el-button type="primary" @click="handleMenuSave">确定</el-button>
        </template>
    </el-drawer>
</template>
