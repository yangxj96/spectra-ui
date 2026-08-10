<script setup lang="ts">
import { ElMessage } from "element-plus";
import { reactive } from "vue";
import { useRouter } from "vue-router";

import { SupplyApi } from "@/api/oa/supply-api.ts";
import OaFormPage from "@/views/OA/components/OaFormPage/index.vue";

const router = useRouter();
const form = reactive<SupplySaveParams>({
    category: "办公耗材",
    sku: "",
    name: "",
    specification: "",
    unit: "件",
    min_stock: 0,
    status: "ACTIVE",
    supplier: "",
    location: "",
    remark: ""
});

async function save(): Promise<void> {
    if (!form.sku.trim() || !form.name.trim() || !form.unit.trim()) {
        ElMessage.warning("请输入 SKU、名称和单位");
        return;
    }
    await SupplyApi.create({ ...form, min_stock: Number(form.min_stock || 0) });
    ElMessage.success("办公用品已保存");
    await router.push({ name: "OASupply" });
}
</script>

<template>
    <OaFormPage title="新建办公用品" description="维护办公用品基础信息和库存预警设置。" back-path="/oa/supply">
        <el-form label-width="110px">
            <el-form-item label="SKU" required><el-input v-model="form.sku" /></el-form-item>
            <el-form-item label="名称" required><el-input v-model="form.name" /></el-form-item>
            <el-form-item label="分类"><el-input v-model="form.category" /></el-form-item>
            <el-form-item label="规格"><el-input v-model="form.specification" /></el-form-item>
            <el-form-item label="单位" required><el-input v-model="form.unit" /></el-form-item>
            <el-form-item label="最低库存">
                <el-input-number v-model="form.min_stock" :min="0" :precision="3" />
            </el-form-item>
            <el-form-item label="供应商"><el-input v-model="form.supplier" /></el-form-item>
            <el-form-item label="存放位置"><el-input v-model="form.location" /></el-form-item>
            <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="4" /></el-form-item>
        </el-form>

        <template #actions>
            <el-button @click="router.push('/oa/supply')">取消</el-button>
            <el-button type="primary" @click="save">保存</el-button>
        </template>
    </OaFormPage>
</template>
