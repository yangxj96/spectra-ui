<script setup lang="ts">
import { ElMessage } from "element-plus";
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { AssetApi } from "@/api/oa/asset-api.ts";
import { toLocalDateString } from "@/utils/date-utils.ts";
import OaFormPage from "@/views/OA/components/OaFormPage/index.vue";

const router = useRouter();
const categories = ref<AssetCategoryVO[]>([]);
const form = reactive<AssetSaveParams>({
    name: "",
    asset_no: "",
    category_id: undefined,
    specification: "",
    asset_type: "FIXED",
    quantity: 1,
    acquisition_date: toLocalDateString(),
    acquisition_amount: 0,
    currency: "CNY",
    supplier: "",
    location: "",
    remark: ""
});

async function loadCategories(): Promise<void> {
    categories.value = await AssetApi.categories();
}

async function saveDraft(): Promise<void> {
    if (!form.name.trim()) {
        ElMessage.warning("请输入资产名称");
        return;
    }
    await AssetApi.create({
        ...form,
        name: form.name.trim(),
        quantity: Number(form.quantity),
        acquisition_amount: Number(form.acquisition_amount || 0)
    });
    ElMessage.success("资产已保存");
    await router.push({ name: "OAAsset" });
}

onMounted(loadCategories);
</script>

<template>
    <OaFormPage title="新建资产" description="登记资产台账基础信息，保存后返回资产管理列表。" back-path="/oa/asset">
        <el-form label-width="110px">
            <el-form-item label="资产名称" required><el-input v-model="form.name" /></el-form-item>
            <el-form-item label="资产编号"><el-input v-model="form.asset_no" placeholder="可稍后补充" /></el-form-item>
            <el-form-item label="资产分类">
                <el-select v-model="form.category_id" clearable placeholder="选择分类">
                    <el-option
                        v-for="category in categories"
                        :key="category.id"
                        :label="category.name"
                        :value="category.id" />
                </el-select>
            </el-form-item>
            <el-form-item label="规格型号"><el-input v-model="form.specification" /></el-form-item>
            <el-form-item label="数量">
                <el-input-number v-model="form.quantity" :min="0.001" :precision="3" />
            </el-form-item>
            <el-form-item label="购置日期">
                <el-date-picker v-model="form.acquisition_date" type="date" value-format="YYYY-MM-DD" />
            </el-form-item>
            <el-form-item label="购置金额">
                <el-input-number v-model="form.acquisition_amount" :min="0" :precision="2" />
            </el-form-item>
            <el-form-item label="供应商"><el-input v-model="form.supplier" /></el-form-item>
            <el-form-item label="存放位置"><el-input v-model="form.location" /></el-form-item>
            <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="4" /></el-form-item>
        </el-form>

        <template #actions>
            <el-button @click="router.push('/oa/asset')">取消</el-button>
            <el-button type="primary" @click="saveDraft">保存</el-button>
        </template>
    </OaFormPage>
</template>
