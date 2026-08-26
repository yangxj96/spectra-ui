<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ContractApi } from "@/api/oa/contract-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import OaFormPage from "@/views/OA/components/OaFormPage/index.vue";

const route = useRoute();
const router = useRouter();
const editingId = computed(() => String(route.query.id ?? ""));
const loading = ref(false);
const form = reactive<ContractSaveParams>(emptyForm());

function emptyForm(): ContractSaveParams {
    return {
        title: "",
        contract_type: "SERVICE",
        counterparty_name: "",
        counterparty_contact: "",
        amount: 0,
        currency: "CNY",
        start_date: "",
        end_date: "",
        visibility: "DEPARTMENT",
        summary: ""
    };
}

async function load(): Promise<void> {
    Object.assign(form, emptyForm());
    if (!editingId.value) return;
    loading.value = true;
    try {
        const row = await ContractApi.get(editingId.value);
        Object.assign(form, {
            title: row.title,
            contract_type: row.contract_type,
            counterparty_name: row.counterparty_name,
            counterparty_contact: row.counterparty_contact || "",
            amount: row.amount,
            currency: row.currency,
            start_date: row.start_date || "",
            end_date: row.end_date || "",
            visibility: row.visibility,
            summary: row.summary || ""
        });
    } finally {
        loading.value = false;
    }
}

async function save(): Promise<void> {
    if (!form.title.trim() || !form.contract_type || !form.counterparty_name.trim()) {
        MessageUtils.warning("请填写合同标题、类型和相对方");
        return;
    }
    const payload: ContractSaveParams = {
        title: form.title.trim(),
        contract_type: form.contract_type,
        counterparty_name: form.counterparty_name.trim(),
        counterparty_contact: form.counterparty_contact?.trim() || undefined,
        amount: Number(form.amount),
        currency: form.currency,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        visibility: form.visibility,
        summary: form.summary?.trim() || undefined
    };
    if (editingId.value) await ContractApi.update(editingId.value, payload);
    else await ContractApi.create(payload);
    MessageUtils.success("合同台账已保存");
    await router.push({ name: "OAContract" });
}

onMounted(load);
</script>

<template>
    <OaFormPage
        :title="editingId ? '编辑合同' : '新建合同'"
        description="维护合同基本信息，保存后可在台账中管理履约节点。"
        back-path="/oa/contract">
        <el-form v-loading="loading" label-width="110px">
            <el-form-item label="合同标题" required><el-input v-model="form.title" /></el-form-item>
            <el-form-item label="合同类型" required>
                <el-select v-model="form.contract_type">
                    <el-option label="采购合同" value="PURCHASE" />
                    <el-option label="销售合同" value="SALES" />
                    <el-option label="服务合同" value="SERVICE" />
                    <el-option label="租赁合同" value="LEASE" />
                    <el-option label="其他" value="OTHER" />
                </el-select>
            </el-form-item>
            <el-form-item label="相对方" required><el-input v-model="form.counterparty_name" /></el-form-item>
            <el-form-item label="联系人"><el-input v-model="form.counterparty_contact" /></el-form-item>
            <el-form-item label="合同金额">
                <div class="amount-field">
                    <el-input-number v-model="form.amount" :min="0" :precision="2" :step="100" />
                    <el-select v-model="form.currency" class="currency-select">
                        <el-option label="CNY" value="CNY" />
                        <el-option label="USD" value="USD" />
                    </el-select>
                </div>
            </el-form-item>
            <el-form-item label="生效日期">
                <el-date-picker v-model="form.start_date" value-format="YYYY-MM-DD" type="date" />
            </el-form-item>
            <el-form-item label="到期日期">
                <el-date-picker v-model="form.end_date" value-format="YYYY-MM-DD" type="date" />
            </el-form-item>
            <el-form-item label="可见范围">
                <el-select v-model="form.visibility">
                    <el-option label="部门" value="DEPARTMENT" />
                    <el-option label="公开" value="PUBLIC" />
                    <el-option label="私有" value="PRIVATE" />
                </el-select>
            </el-form-item>
            <el-form-item label="摘要"><el-input v-model="form.summary" type="textarea" :rows="5" /></el-form-item>
        </el-form>

        <template #actions>
            <el-button @click="router.push('/oa/contract')">取消</el-button>
            <el-button type="primary" :loading="loading" @click="save">保存草稿</el-button>
        </template>
    </OaFormPage>
</template>

<style scoped lang="scss">
.currency-select {
    width: 100px;
}

.amount-field {
    display: flex;
    width: 100%;
    gap: 8px;
}

.amount-field .el-input-number {
    flex: 1;
}
</style>
