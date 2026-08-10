<script setup lang="ts">
import { ElMessage } from "element-plus";
import { reactive } from "vue";
import { useRouter } from "vue-router";

import { AssetApi } from "@/api/oa/asset-api.ts";
import OaFormPage from "@/views/OA/components/OaFormPage/index.vue";

const router = useRouter();
const form = reactive<AssetPurchaseDraftParams>({ purchase_id: "", receipt_id: "" });

async function createFromPurchase(): Promise<void> {
    if (!form.purchase_id.trim() || !form.receipt_id.trim()) {
        ElMessage.warning("请输入采购申请 ID 和收货单 ID");
        return;
    }
    const result = await AssetApi.fromPurchase({
        purchase_id: form.purchase_id.trim(),
        receipt_id: form.receipt_id.trim(),
        category_id: form.category_id
    });
    ElMessage.success(`已生成 ${result.length} 条资产草稿`);
    await router.push({ name: "OAAsset" });
}
</script>

<template>
    <OaFormPage title="采购收货转资产" description="根据采购申请和收货单生成资产草稿。" back-path="/oa/asset">
        <el-form label-width="110px">
            <el-form-item label="采购申请 ID" required><el-input v-model="form.purchase_id" /></el-form-item>
            <el-form-item label="收货单 ID" required><el-input v-model="form.receipt_id" /></el-form-item>
            <el-form-item label="资产分类 ID"><el-input v-model="form.category_id" /></el-form-item>
        </el-form>

        <template #actions>
            <el-button @click="router.push('/oa/asset')">取消</el-button>
            <el-button type="primary" @click="createFromPurchase">生成资产草稿</el-button>
        </template>
    </OaFormPage>
</template>
