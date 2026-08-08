<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, reactive, ref } from "vue";

import { PurchaseApi } from "@/api/oa/purchase-api.ts";
import OAApproverSelect from "@/components/OAApproverSelect/index.vue";
import useTable from "@/hooks/use-table.ts";
import { toLocalDateString } from "@/utils/date-utils.ts";

const statusMap: Record<string, [string, "success" | "warning" | "danger" | "info"]> = {
    DRAFT: ["草稿", "info"],
    IN_REVIEW: ["审批中", "warning"],
    APPROVED: ["已通过", "success"],
    REJECTED: ["已驳回", "danger"],
    WITHDRAWN: ["已撤回", "info"],
    CANCELLED: ["已取消", "info"]
};
const executionMap: Record<string, string> = {
    NOT_STARTED: "待执行",
    ORDERED: "采购中",
    PARTIAL_RECEIVED: "部分收货",
    RECEIVED: "已收货",
    CANCELLED: "已取消"
};

const condition = ref<PurchasePageParams>({ page_num: 1, page_size: 15 });
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<PurchaseVO>(
    PurchaseApi.page,
    condition.value
);
const dialogVisible = ref(false);
const approverUsername = ref("");
const editingId = ref("");
const receiveVisible = ref(false);
const form = reactive<PurchaseSaveParams>(emptyForm());
const receivedDate = ref(toLocalDateString());
const receiveItems = ref<Array<PurchaseReceiptItemParams & { item_name: string; max: number }>>([]);
const receivePurchaseId = ref("");

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

function statusLabel(status: string): string {
    return statusMap[status]?.[0] ?? status;
}

function statusType(status: string): "success" | "warning" | "danger" | "info" {
    return statusMap[status]?.[1] ?? "info";
}

function executionLabel(status: string): string {
    return executionMap[status] ?? status;
}

function openCreate(): void {
    editingId.value = "";
    Object.assign(form, emptyForm());
    dialogVisible.value = true;
}

function openEdit(row: PurchaseVO): void {
    editingId.value = row.id;
    Object.assign(form, {
        purpose: row.purpose,
        expected_date: row.expected_date,
        budget_amount: row.budget_amount,
        currency: row.currency,
        suggested_supplier: row.suggested_supplier,
        items: row.items.map(item => ({
            item_type: item.item_type,
            item_name: item.item_name,
            specification: item.specification,
            quantity: item.quantity,
            estimated_unit_price: item.estimated_unit_price,
            purpose: item.purpose
        }))
    });
    dialogVisible.value = true;
}

function addItem(): void {
    form.items.push({ item_type: "GOODS", item_name: "", specification: "", quantity: 1, estimated_unit_price: 0 });
}

function removeItem(index: number): void {
    if (form.items.length > 1) {
        form.items.splice(index, 1);
    }
}

const estimateTotal = computed(() =>
    form.items.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.estimated_unit_price || 0), 0)
);

async function saveDraft(): Promise<void> {
    if (estimateTotal.value > Number(form.budget_amount || 0)) {
        ElMessage.warning("采购明细估价合计不能超过采购预算");
        return;
    }
    const params = { ...form, budget_amount: Number(form.budget_amount) };
    if (editingId.value) await PurchaseApi.update(editingId.value, params);
    else await PurchaseApi.create(params);
    dialogVisible.value = false;
    ElMessage.success(editingId.value ? "采购申请草稿已更新" : "采购申请草稿已保存");
    handlerConditionQuery();
}

async function submit(row: PurchaseVO): Promise<void> {
    if (!approverUsername.value) {
        ElMessage.warning("请先选择审批人");
        return;
    }
    await PurchaseApi.submit(row.id, { approver_username: approverUsername.value });
    ElMessage.success("已提交审批");
    handlerConditionQuery();
}

async function withdraw(row: PurchaseVO): Promise<void> {
    await ElMessageBox.confirm("确认撤回这条采购申请吗？", "提示", { type: "warning" });
    await PurchaseApi.withdraw(row.id);
    ElMessage.success("已撤回");
    handlerConditionQuery();
}

async function cancel(row: PurchaseVO): Promise<void> {
    await ElMessageBox.confirm("确认取消这条采购申请吗？取消后不可再提交。", "提示", { type: "warning" });
    await PurchaseApi.cancel(row.id);
    ElMessage.success("申请已取消");
    handlerConditionQuery();
}

async function execute(row: PurchaseVO): Promise<void> {
    const result = await ElMessageBox.prompt("填写采购订单号（可选）", "登记采购执行", {
        inputPlaceholder: "例如 PO-20260807-001",
        confirmButtonText: "确认执行",
        cancelButtonText: "取消"
    });
    await PurchaseApi.execute(row.id, { order_no: result.value, execution_status: "ORDERED" });
    ElMessage.success("已登记采购执行");
    handlerConditionQuery();
}

function openReceive(row: PurchaseVO): void {
    receivePurchaseId.value = row.id;
    receivedDate.value = toLocalDateString();
    receiveItems.value = row.items
        .map(item => ({
            purchase_item_id: item.id,
            item_name: item.item_name,
            quantity: 0,
            max: Math.max(0, Number(item.quantity) - Number(item.received_quantity || 0)),
            accepted: true
        }))
        .filter(item => item.max > 0);
    receiveVisible.value = true;
}

async function saveReceipt(): Promise<void> {
    const items = receiveItems.value
        .filter(item => Number(item.quantity) > 0)
        .map(item => ({
            purchase_item_id: item.purchase_item_id,
            quantity: Number(item.quantity),
            accepted: item.accepted
        }));
    if (!items.length) {
        ElMessage.warning("至少填写一项收货数量");
        return;
    }
    await PurchaseApi.receive(receivePurchaseId.value, { received_date: receivedDate.value, items });
    receiveVisible.value = false;
    ElMessage.success("收货记录已保存");
    handlerConditionQuery();
}
</script>

<template>
    <el-row class="box__search">
        <el-form :inline="true" :model="condition">
            <el-form-item label="关键词">
                <el-input v-model="condition.keyword" clearable placeholder="事由、供应商或订单号" />
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
                <el-button @click="openCreate">新建采购申请</el-button>
            </el-form-item>
            <el-form-item label="审批人"><OAApproverSelect v-model="approverUsername" /></el-form-item>
        </el-form>
    </el-row>

    <el-row class="box__body">
        <el-table :data="table_data" height="92%" stripe>
            <el-table-column type="index" width="60" align="center" />
            <el-table-column label="申请编号" prop="application_no" width="210" show-overflow-tooltip />
            <el-table-column label="采购事由" prop="purpose" min-width="180" show-overflow-tooltip />
            <el-table-column label="预算" prop="budget_amount" width="110" />
            <el-table-column label="期望到货" prop="expected_date" width="120" />
            <el-table-column label="审批状态" prop="status" width="110">
                <template #default="scope">
                    <el-tag :type="statusType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="执行状态" prop="execution_status" width="120">
                <template #default="scope">{{ executionLabel(scope.row.execution_status) }}</template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="360">
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
                        v-if="scope.row.status === 'APPROVED' && scope.row.execution_status === 'NOT_STARTED'"
                        link
                        type="primary"
                        @click="execute(scope.row)">
                        登记执行
                    </el-button>
                    <el-button
                        v-if="scope.row.status === 'APPROVED' && scope.row.execution_status !== 'RECEIVED'"
                        link
                        type="success"
                        @click="openReceive(scope.row)">
                        登记收货
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

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑采购申请' : '新建采购申请'" width="820px">
        <el-form label-width="110px">
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
                        <el-select v-model="item.item_type" style="width: 100px">
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
        <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveDraft">保存草稿</el-button>
        </template>
    </el-dialog>

    <el-dialog v-model="receiveVisible" title="登记采购收货" width="680px">
        <el-form label-width="100px">
            <el-form-item label="收货日期" required>
                <el-date-picker v-model="receivedDate" type="date" value-format="YYYY-MM-DD" />
            </el-form-item>
            <el-form-item v-for="item in receiveItems" :key="item.purchase_item_id" :label="item.item_name">
                <el-input-number v-model="item.quantity" :min="0" :max="item.max" :precision="3" />
                <span class="estimate-tip">剩余 {{ item.max }}</span>
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="receiveVisible = false">取消</el-button>
            <el-button type="primary" @click="saveReceipt">保存收货</el-button>
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
.estimate-tip {
    margin-left: 12px;
    color: var(--el-text-color-secondary);
}
</style>
