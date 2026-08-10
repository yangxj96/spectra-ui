<script setup lang="ts">
import { ElMessage } from "element-plus";
import { computed, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ContractApi } from "@/api/oa/contract-api.ts";
import OaFormPage from "@/views/OA/components/OaFormPage/index.vue";

const route = useRoute();
const router = useRouter();
const contractId = computed(() => String(route.query.contract_id ?? ""));
const form = reactive<ContractMilestoneSaveParams>({
    name: "",
    milestone_type: "PAYMENT",
    due_date: "",
    remark: ""
});

async function save(): Promise<void> {
    if (!contractId.value) {
        ElMessage.warning("缺少合同 ID");
        return;
    }
    if (!form.name.trim() || !form.due_date) {
        ElMessage.warning("请填写节点名称和到期日期");
        return;
    }
    await ContractApi.createMilestone(contractId.value, {
        name: form.name.trim(),
        milestone_type: form.milestone_type,
        due_date: form.due_date,
        remark: form.remark?.trim() || undefined
    });
    ElMessage.success("履约节点已添加");
    await router.push({ name: "OAContract" });
}
</script>

<template>
    <OaFormPage
        title="新增履约节点"
        description="为合同增加一项履约节点，保存后返回合同管理列表。"
        back-path="/oa/contract">
        <el-form label-width="110px">
            <el-form-item label="节点名称" required><el-input v-model="form.name" /></el-form-item>
            <el-form-item label="节点类型">
                <el-select v-model="form.milestone_type">
                    <el-option label="付款" value="PAYMENT" />
                    <el-option label="交付" value="DELIVERY" />
                    <el-option label="验收" value="ACCEPTANCE" />
                    <el-option label="其他" value="OTHER" />
                </el-select>
            </el-form-item>
            <el-form-item label="到期日期" required>
                <el-date-picker v-model="form.due_date" value-format="YYYY-MM-DD" type="date" />
            </el-form-item>
            <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="5" /></el-form-item>
        </el-form>

        <template #actions>
            <el-button @click="router.push('/oa/contract')">取消</el-button>
            <el-button type="primary" @click="save">保存节点</el-button>
        </template>
    </OaFormPage>
</template>
