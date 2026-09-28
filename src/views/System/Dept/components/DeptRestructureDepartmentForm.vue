<script setup lang="ts">
import { type FormInstance, type FormRules } from "element-plus";
import { useTemplateRef } from "vue";

import DictSelect from "@/components/DictSelect/index.vue";
import RegionSelectLazy from "@/components/RegionSelectLazy/index.vue";

const form = defineModel<DepartmentForm>({ required: true });
const props = defineProps<{
    parentName: string;
}>();

const formRef = useTemplateRef<FormInstance>("formRef");
const rules: FormRules<DepartmentForm> = {
    name: [{ required: true, message: "请输入新部门名称", trigger: "blur" }],
    region_id: [{ required: true, message: "请选择行政区划", trigger: "blur" }],
    type: [{ required: true, message: "请选择部门类型", trigger: "change" }]
};

async function validate(): Promise<boolean> {
    if (!formRef.value) return false;
    try {
        await formRef.value.validate();
        return true;
    } catch {
        return false;
    }
}

defineExpose({ validate });
</script>

<template>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" @submit.prevent>
        <el-row :gutter="24">
            <el-col :span="12">
                <el-form-item label="同级父部门">{{ props.parentName }}</el-form-item>
            </el-col>
            <el-col :span="12">
                <el-form-item label="新部门名称" prop="name">
                    <el-input v-model="form.name" maxlength="120" clearable placeholder="请输入新部门名称" />
                </el-form-item>
            </el-col>
            <el-col :span="12">
                <el-form-item label="行政区划" prop="region_id">
                    <RegionSelectLazy v-model="form.region_id" v-model:name="form.region_name" />
                </el-form-item>
            </el-col>
            <el-col :span="12">
                <el-form-item label="部门类型" prop="type">
                    <DictSelect v-model="form.type" dict_code="sys_organization_type" placeholder="请选择部门类型" />
                </el-form-item>
            </el-col>
            <el-col :span="12">
                <el-form-item label="排序" prop="sort">
                    <el-input-number v-model="form.sort" :min="0" />
                </el-form-item>
            </el-col>
            <el-col :span="24">
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" />
                </el-form-item>
            </el-col>
        </el-row>
    </el-form>
</template>
