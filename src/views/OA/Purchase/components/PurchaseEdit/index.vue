<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { PurchaseApi } from "@/api/oa/purchase-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import OaFormPage from "@/views/OA/components/OaFormPage/index.vue";

const route = useRoute();
const router = useRouter();
const editingId = computed(() => String(route.query.id ?? ""));
const loading = ref(false);
const form = reactive<PurchaseSaveParams>(emptyForm());

function emptyForm(): PurchaseSaveParams {
    return {
        purpose: "",
        expected_date: "",
        budget_amount: 0,
        currency: "CNY",
        suggested_supplier: "",
        items: [
            { item_type: "GOODS", item_name: "", specification: "", quantity: 1, estimated_unit_price: 0, purpose: "" }
        ]
    };
}

const estimateTotal = computed(() =>
    form.items.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.estimated_unit_price || 0), 0)
);

async function load(): Promise<void> {
    Object.assign(form, emptyForm());
    if (!editingId.value) return;
    loading.value = true;
    try {
        const row = await PurchaseApi.get(editingId.value);
        Object.assign(form, {
            purpose: row.purpose,
            expected_date: row.expected_date,
            budget_amount: row.budget_amount,
            currency: row.currency,
            suggested_supplier: row.suggested_supplier || "",
            items: row.items.map(item => ({
                item_type: item.item_type,
                item_name: item.item_name,
                specification: item.specification,
                quantity: item.quantity,
                estimated_unit_price: item.estimated_unit_price,
                purpose: item.purpose
            }))
        });
    } finally {
        loading.value = false;
    }
}

function addItem(): void {
    form.items.push({ item_type: "GOODS", item_name: "", specification: "", quantity: 1, estimated_unit_price: 0 });
}

function removeItem(index: number): void {
    if (form.items.length > 1) form.items.splice(index, 1);
}

async function saveDraft(): Promise<void> {
    if (!form.purpose.trim() || !form.expected_date || !form.items.some(item => item.item_name.trim())) {
        MessageUtils.warning("请填写采购事由、期望到货日期和采购明细");
        return;
    }
    if (estimateTotal.value > Number(form.budget_amount || 0)) {
        MessageUtils.warning("采购明细估价合计不能超过采购预算");
        return;
    }
    const params = { ...form, purpose: form.purpose.trim(), budget_amount: Number(form.budget_amount) };
    if (editingId.value) await PurchaseApi.update(editingId.value, params);
    else await PurchaseApi.create(params);
    MessageUtils.success(editingId.value ? "采购申请草稿已更新" : "采购申请草稿已保存");
    await router.push({ name: "OAPurchase" });
}

onMounted(load);
</script>

<template>
    <OaFormPage
        :title="editingId ? '编辑采购申请' : '新建采购申请'"
        description="填写采购事由、预算和明细，保存后可在列表中提交审批。"
        back-path="/oa/purchase">
        <el-form v-loading="loading" label-width="110px">
            <el-form-item label="采购事由" required><el-input v-model="form.purpose" /></el-form-item>
            <el-form-item label="期望到货" required>
                <el-date-picker v-model="form.expected_date" type="date" value-format="YYYY-MM-DD" />
            </el-form-item>
            <el-form-item label="采购预算" required>
                <el-input-number v-model="form.budget_amount" :min="0" :precision="2" />
                <span class="estimate-tip">明细估价：{{ estimateTotal.toFixed(2) }} {{ form.currency }}</span>
            </el-form-item>
            <el-form-item label="建议供应商"><el-input v-model="form.suggested_supplier" /></el-form-item>
            <el-form-item label="采购明细" required>
                <div class="items">
                    <div v-for="(item, index) in form.items" :key="index" class="item-row">
                        <el-select v-model="item.item_type" class="item-type">
                            <el-option label="物品" value="GOODS" />
                            <el-option label="服务" value="SERVICE" />
                        </el-select>
                        <el-input v-model="item.item_name" placeholder="名称" />
                        <el-input v-model="item.specification" placeholder="规格" />
                        <el-input-number v-model="item.quantity" :min="0.001" :precision="3" placeholder="数量" />
                        <el-input-number
                            v-model="item.estimated_unit_price"
                            :min="0"
                            :precision="2"
                            placeholder="单价" />
                        <el-button link type="danger" @click="removeItem(index)">删除</el-button>
                    </div>
                    <el-button link type="primary" @click="addItem">+ 添加明细</el-button>
                </div>
            </el-form-item>
        </el-form>

        <template #actions>
            <el-button @click="router.push('/oa/purchase')">取消</el-button>
            <el-button type="primary" :loading="loading" @click="saveDraft">保存草稿</el-button>
        </template>
    </OaFormPage>
</template>

<style scoped lang="scss">
.items {
    width: 100%;
}

.item-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
}

.item-row .el-input,
.item-row .el-input-number,
.item-row .item-type {
    flex: 1;
    min-width: 0;
}

.estimate-tip {
    margin-left: 12px;
    color: var(--el-text-color-secondary);
}
</style>
