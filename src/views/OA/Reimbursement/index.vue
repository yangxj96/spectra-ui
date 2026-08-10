<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { ref } from "vue";
import { useRouter } from "vue-router";

import { ReimbursementApi } from "@/api/oa/reimbursement-api.ts";
import OAApproverSelect from "@/components/OAApproverSelect/index.vue";
import useTable from "@/hooks/use-table.ts";
import OaListPage from "@/views/OA/components/OaListPage/index.vue";

const statusMap: Record<string, [string, "success" | "warning" | "danger" | "info"]> = {
    DRAFT: ["草稿", "info"],
    IN_REVIEW: ["审批中", "warning"],
    APPROVED: ["已通过", "success"],
    REJECTED: ["已驳回", "danger"],
    WITHDRAWN: ["已撤回", "info"],
    CANCELLED: ["已取消", "info"]
};

const condition = ref<ReimbursementPageParams>({ page_num: 1, page_size: 15 });
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } =
    useTable<ReimbursementVO>(ReimbursementApi.page, condition.value);
const approverUsername = ref("");
const router = useRouter();

function statusLabel(status: string): string {
    return statusMap[status]?.[0] ?? status;
}

function statusType(status: string): "success" | "warning" | "danger" | "info" {
    return statusMap[status]?.[1] ?? "info";
}

function openCreate(): void {
    router.push({ name: "OAReimbursementEdit" });
}

function openEdit(row: ReimbursementVO): void {
    router.push({ name: "OAReimbursementEdit", query: { id: row.id } });
}

async function submit(row: ReimbursementVO): Promise<void> {
    if (!approverUsername.value) {
        ElMessage.warning("请先选择审批人");
        return;
    }
    await ReimbursementApi.submit(row.id, { approver_username: approverUsername.value });
    ElMessage.success("已提交审批");
    handlerConditionQuery();
}

async function withdraw(row: ReimbursementVO): Promise<void> {
    await ElMessageBox.confirm("确认撤回这条报销申请吗？", "提示", { type: "warning" });
    await ReimbursementApi.withdraw(row.id);
    ElMessage.success("已撤回");
    handlerConditionQuery();
}

async function cancel(row: ReimbursementVO): Promise<void> {
    await ElMessageBox.confirm("确认取消这条报销申请吗？取消后不可再提交。", "提示", { type: "warning" });
    await ReimbursementApi.cancel(row.id);
    ElMessage.success("申请已取消");
    handlerConditionQuery();
}

async function markPaid(row: ReimbursementVO): Promise<void> {
    const result = await ElMessageBox.prompt("可填写付款备注", "登记付款", {
        inputPlaceholder: "例如：2026-08-07 银行转账",
        confirmButtonText: "确认付款",
        cancelButtonText: "取消"
    });
    await ReimbursementApi.payment(row.id, { payment_remark: result.value });
    ElMessage.success("付款状态已更新");
    handlerConditionQuery();
}
</script>

<template>
    <OaListPage>
        <template #search>
            <el-form :inline="true" :model="condition">
                <el-form-item label="关键词">
                    <el-input v-model="condition.keyword" clearable placeholder="用途或收款人" />
                </el-form-item>
                <el-form-item label="申请状态">
                    <el-select v-model="condition.status" clearable placeholder="全部状态" style="width: 140px">
                        <el-option label="草稿" value="DRAFT" />
                        <el-option label="审批中" value="IN_REVIEW" />
                        <el-option label="已通过" value="APPROVED" />
                        <el-option label="已驳回" value="REJECTED" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                    <el-button @click="openCreate">新建报销</el-button>
                </el-form-item>
                <el-form-item label="审批人"><OAApproverSelect v-model="approverUsername" /></el-form-item>
            </el-form>
        </template>
        <el-table :data="table_data" stripe>
            <el-table-column type="index" width="60" align="center" />
            <el-table-column label="申请编号" prop="application_no" width="210" show-overflow-tooltip />
            <el-table-column label="报销用途" prop="purpose" min-width="180" show-overflow-tooltip />
            <el-table-column label="金额" prop="total_amount" width="110" />
            <el-table-column label="收款人" prop="payee_name" width="120" />
            <el-table-column label="审批状态" prop="status" width="110">
                <template #default="scope">
                    <el-tag :type="statusType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="付款" prop="payment_status" width="100">
                <template #default="scope">
                    <el-tag :type="scope.row.payment_status === 'PAID' ? 'success' : 'warning'">
                        {{ scope.row.payment_status === "PAID" ? "已付款" : "待付款" }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="290">
                <template #default="scope">
                    <el-button
                        v-if="scope.row.status === 'DRAFT' || scope.row.status === 'REJECTED'"
                        link
                        type="primary"
                        @click="openEdit(scope.row)">
                        编辑
                    </el-button>
                    <el-button
                        v-if="scope.row.status === 'DRAFT' || scope.row.status === 'REJECTED'"
                        link
                        type="primary"
                        @click="submit(scope.row)">
                        提交
                    </el-button>
                    <el-button v-if="scope.row.status === 'IN_REVIEW'" link type="warning" @click="withdraw(scope.row)">
                        撤回
                    </el-button>
                    <el-button
                        v-if="['DRAFT', 'REJECTED', 'WITHDRAWN'].includes(scope.row.status)"
                        link
                        type="danger"
                        @click="cancel(scope.row)">
                        取消
                    </el-button>
                    <el-button
                        v-if="scope.row.status === 'APPROVED' && scope.row.payment_status === 'PENDING'"
                        link
                        type="success"
                        @click="markPaid(scope.row)">
                        登记付款
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination
            layout="total, sizes, prev, pager, next"
            :page-size="pagination.size"
            :page-sizes="pagination.page_sizes"
            :total="pagination.total"
            style="padding: 0 10px; margin-left: auto"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
    </OaListPage>
</template>
