<script setup lang="ts">
import { ElMessage } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ReimbursementApi } from "@/api/oa/reimbursement-api.ts";
import OaFormPage from "@/views/OA/components/OaFormPage/index.vue";

const route = useRoute();
const router = useRouter();
const editingId = computed(() => String(route.query.id ?? ""));
const loading = ref(false);
const form = reactive<ReimbursementSaveParams>(emptyForm());

function emptyForm(): ReimbursementSaveParams {
    return {
        purpose: "",
        expense_start: "",
        expense_end: "",
        total_amount: 0,
        currency: "CNY",
        payee_name: "",
        payee_account: "",
        items: [{ expense_date: "", category: "", description: "", amount: 0, tax_amount: 0, invoice_no: "" }]
    };
}

async function load(): Promise<void> {
    Object.assign(form, emptyForm());
    if (!editingId.value) return;
    loading.value = true;
    try {
        const row = await ReimbursementApi.get(editingId.value);
        Object.assign(form, {
            purpose: row.purpose,
            expense_start: row.expense_start,
            expense_end: row.expense_end,
            total_amount: row.total_amount,
            currency: row.currency,
            payee_name: row.payee_name,
            payee_account: "",
            items: row.items.map(item => ({
                expense_date: item.expense_date,
                category: item.category,
                description: item.description,
                amount: item.amount,
                tax_amount: item.tax_amount,
                invoice_no: item.invoice_no
            }))
        });
    } finally {
        loading.value = false;
    }
}

function addItem(): void {
    form.items.push({ expense_date: form.expense_start, category: "", description: "", amount: 0, tax_amount: 0 });
}

function removeItem(index: number): void {
    if (form.items.length > 1) form.items.splice(index, 1);
}

async function saveDraft(): Promise<void> {
    if (!form.purpose.trim() || !form.payee_name.trim() || !form.payee_account.trim()) {
        ElMessage.warning("请填写报销用途、收款人和收款账号");
        return;
    }
    const params = {
        ...form,
        purpose: form.purpose.trim(),
        payee_name: form.payee_name.trim(),
        payee_account: form.payee_account.trim(),
        total_amount: Number(form.total_amount)
    };
    if (editingId.value) await ReimbursementApi.update(editingId.value, params);
    else await ReimbursementApi.create(params);
    ElMessage.success(editingId.value ? "报销草稿已更新" : "报销草稿已保存");
    await router.push({ name: "OAReimbursement" });
}

onMounted(load);
</script>

<template>
    <OaFormPage
        :title="editingId ? '编辑费用报销' : '新建费用报销'"
        description="填写报销信息和费用明细，保存后可在列表中提交审批。"
        back-path="/oa/reimbursement">
        <el-form v-loading="loading" label-width="110px">
            <el-form-item label="报销用途" required><el-input v-model="form.purpose" /></el-form-item>
            <el-form-item label="费用开始" required>
                <el-date-picker v-model="form.expense_start" type="date" value-format="YYYY-MM-DD" />
            </el-form-item>
            <el-form-item label="费用结束" required>
                <el-date-picker v-model="form.expense_end" type="date" value-format="YYYY-MM-DD" />
            </el-form-item>
            <el-form-item label="收款人" required><el-input v-model="form.payee_name" /></el-form-item>
            <el-form-item label="收款账号" required>
                <el-input v-model="form.payee_account" :placeholder="editingId ? '编辑时请重新填写收款账号' : ''" />
            </el-form-item>
            <el-form-item label="费用明细" required>
                <div class="items">
                    <div v-for="(item, index) in form.items" :key="index" class="item-row">
                        <el-date-picker
                            v-model="item.expense_date"
                            type="date"
                            value-format="YYYY-MM-DD"
                            placeholder="日期" />
                        <el-input v-model="item.category" placeholder="类别" />
                        <el-input v-model="item.description" placeholder="说明" />
                        <el-input-number v-model="item.amount" :min="0" :precision="2" placeholder="金额" />
                        <el-button link type="danger" @click="removeItem(index)">删除</el-button>
                    </div>
                    <el-button link type="primary" @click="addItem">+ 添加明细</el-button>
                </div>
            </el-form-item>
            <el-form-item label="报销总额" required>
                <el-input-number v-model="form.total_amount" :min="0" :precision="2" />
            </el-form-item>
        </el-form>

        <template #actions>
            <el-button @click="router.push('/oa/reimbursement')">取消</el-button>
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
.item-row .el-date-editor {
    flex: 1;
    min-width: 0;
}
</style>
