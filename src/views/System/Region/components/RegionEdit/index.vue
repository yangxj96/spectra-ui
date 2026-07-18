<script setup lang="ts">
import { type FormInstance, type FormRules } from "element-plus";
import { computed, onMounted, reactive, useTemplateRef } from "vue";

import { RegionApi } from "@/api/system/region-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import DictSelect from "@/components/DictSelect/index.vue";
import { MessageUtils } from "@/utils/message-utils.ts";

const dialog = defineModel<boolean>("show", { required: true, default: false });

const row = defineModel<Region>("row");

const tableData = defineModel<Region[]>("table-data", { required: true });

const emit = defineEmits<{
    /** 关闭事件 */
    close: [];
}>();

const editForm = useTemplateRef<FormInstance>("editForm");

const has_edit = computed(() => !!row.value?.id && row.value.id !== "");

const edit = reactive({
    title: computed(() => (has_edit.value ? "编辑" : "新增") + "区域"),
    rules: {
        name: [
            { required: true, message: "请输入区域名称", trigger: "blur" },
            { min: 2, max: 50, message: "长度在 2 到 50 个字符", trigger: "blur" }
        ],
        short_name: [{ required: true, message: "请输入简称", trigger: "blur" }],
        code: [{ required: true, message: "请输入区域编码", trigger: "blur" }],
        level: [{ required: true, message: "请选择层级", trigger: "blur" }],
        sort: [{ required: true, message: "请输入排序值", trigger: "blur" }]
    } as FormRules,
    form: {} as Region
});

onMounted(() => {
    edit.form = has_edit.value
        ? JSON.parse(JSON.stringify(row.value || edit.form))
        : ({ status: true, sort: 999 } as Region);
});

const handleClose = () => {
    dialog.value = false;
    emit("close");
};

const handleSave = async () => {
    if (!editForm.value) return;
    await editForm.value?.validate(async valid => {
        if (!valid) {
            MessageUtils.error("请检查必填内容");
            return;
        }
        if (has_edit.value) {
            await RegionApi.update(edit.form);
        } else {
            await RegionApi.create(edit.form);
        }
        MessageUtils.success("保存成功", handleClose);
    });
};
</script>

<template>
    <el-drawer v-model="dialog" class="loading-box" :modal="true" @close="handleClose">
        <template #header>
            <div>
                <ComponentsIcons name="icon-edit" />
                {{ edit.title }}
            </div>
        </template>
        <template #default>
            <el-form ref="editForm" :model="edit.form" :rules="edit.rules" label-width="auto" @submit.prevent>
                <el-form-item v-if="has_edit" label="主键ID">
                    <p>{{ edit.form.id }}</p>
                </el-form-item>
                <el-form-item label="上级区域" prop="pid">
                    <el-tree-select
                        v-model="edit.form.pid"
                        clearable
                        check-strictly
                        default-expand-all
                        :data="tableData"
                        node-key="id"
                        :props="{ label: 'name', value: 'id' }" />
                </el-form-item>
                <el-form-item label="区域名称" prop="name">
                    <el-input v-model="edit.form.name" clearable placeholder="请输入区域名称" />
                </el-form-item>
                <el-form-item label="区域全称" prop="full_name">
                    <el-input v-model="edit.form.full_name" clearable placeholder="请输入区域全称" />
                </el-form-item>
                <el-form-item label="简称" prop="short_name">
                    <el-input v-model="edit.form.short_name" clearable placeholder="请输入简称" />
                </el-form-item>
                <el-form-item label="区域编码" prop="code">
                    <el-input v-model="edit.form.code" clearable placeholder="请输入区域编码" />
                </el-form-item>
                <el-form-item label="层级" prop="level">
                    <DictSelect v-model="edit.form.level" dict_code="sys_region_level" placeholder="请选择层级" />
                </el-form-item>
                <el-form-item label="状态" prop="status">
                    <el-switch v-model="edit.form.status" />
                </el-form-item>
                <el-form-item label="排序" prop="sort">
                    <el-input-number
                        v-model="edit.form.sort"
                        :min="1"
                        :max="999"
                        placeholder="请输入排序值"
                        style="width: 100%" />
                </el-form-item>
            </el-form>
        </template>
        <template #footer>
            <el-button @click="handleClose">取消</el-button>
            <el-button type="primary" @click="handleSave">确定</el-button>
        </template>
    </el-drawer>
</template>
