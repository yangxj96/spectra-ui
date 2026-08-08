<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { reactive, ref } from "vue";

import { ReimbursementApi } from "@/api/oa/reimbursement-api.ts";
import FileUpload from "@/components/FileUpload/index.vue";
import OAApproverSelect from "@/components/OAApproverSelect/index.vue";
import useTable from "@/hooks/use-table.ts";

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
const dialogVisible = ref(false);
const uploadUrl = ref("");
const approverUsername = ref("");
const editingId = ref("");
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
        items: [{ expense_date: "", category: "", description: "", amount: 0, tax_amount: 0, invoice_no: "" }],
        attachments: []
    };
}

function statusLabel(status: string): string {
    return statusMap[status]?.[0] ?? status;
}

function statusType(status: string): "success" | "warning" | "danger" | "info" {
    return statusMap[status]?.[1] ?? "info";
}

function openCreate(): void {
    editingId.value = "";
    Object.assign(form, emptyForm());
    uploadUrl.value = "";
    dialogVisible.value = true;
}

function openEdit(row: ReimbursementVO): void {
    editingId.value = row.id;
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
        })),
        attachments: row.attachments.map(item => ({ file_id: item.file_id, file_name: item.file_name }))
    });
    uploadUrl.value = "";
    dialogVisible.value = true;
}

function addItem(): void {
    form.items.push({ expense_date: form.expense_start, category: "", description: "", amount: 0, tax_amount: 0 });
}

function removeItem(index: number): void {
    if (form.items.length > 1) {
        form.items.splice(index, 1);
    }
}

function handleUploaded(result: FileUploadResult): void {
    form.attachments ??= [];
    if (!form.attachments.some(item => item.file_id === result.file_id)) {
        form.attachments.push({ file_id: result.file_id, file_name: result.url.split("/").pop() });
    }
}

async function saveDraft(): Promise<void> {
    const params = { ...form, total_amount: Number(form.total_amount) };
    if (editingId.value) await ReimbursementApi.update(editingId.value, params);
    else await ReimbursementApi.create(params);
    dialogVisible.value = false;
    ElMessage.success(editingId.value ? "报销草稿已更新" : "报销草稿已保存");
    handlerConditionQuery();
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
    <el-row class="box__search">
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
    </el-row>

    <el-row class="box__body">
        <el-table :data="table_data" height="92%" stripe>
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
    </el-row>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑费用报销' : '新建费用报销'" width="760px">
        <el-form label-width="100px">
            <el-form-item label="报销用途" required><el-input v-model="form.purpose" /></el-form-item>
            <el-form-item label="费用开始" required>
                <el-date-picker v-model="form.expense_start" type="date" value-format="YYYY-MM-DD" />
            </el-form-item>
            <el-form-item label="费用结束" required>
                <el-date-picker v-model="form.expense_end" type="date" value-format="YYYY-MM-DD" />
            </el-form-item>
            <el-form-item label="收款人" required><el-input v-model="form.payee_name" /></el-form-item>
            <el-form-item label="收款账号" required>
                <el-input
                    v-model="form.payee_account"
                    :placeholder="editingId ? '为安全起见，编辑时请重新填写收款账号' : ''" />
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
            <el-form-item label="报销凭证">
                <FileUpload v-model="uploadUrl" :limit="5" @uploaded="handleUploaded">
                    <template #default><el-button>上传发票/凭证</el-button></template>
                </FileUpload>
                <div v-if="form.attachments?.length" class="attachment-tip">
                    已关联 {{ form.attachments.length }} 个凭证
                </div>
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveDraft">保存草稿</el-button>
        </template>
    </el-dialog>
</template>

<style scoped lang="scss">
.box__search {
    height: 10%;
    display: flex;
    align-items: center;
    padding-left: 20px;
}
.box__search .el-form-item {
    margin-bottom: 0;
}
.box__body {
    height: 90%;
}
.items {
    width: 100%;
}
.item-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
}
.item-row .el-input,
.item-row .el-input-number {
    flex: 1;
}
.attachment-tip {
    color: var(--el-color-success);
    margin-top: 6px;
}
</style>
