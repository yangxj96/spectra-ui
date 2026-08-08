<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, onMounted, ref } from "vue";

import { ApplicationApi } from "@/api/oa/application-api.ts";
import { LeaveApi } from "@/api/oa/leave-api.ts";
import { PurchaseApi } from "@/api/oa/purchase-api.ts";
import { ReimbursementApi } from "@/api/oa/reimbursement-api.ts";
import { WorkflowApi } from "@/api/workflow/workflow-api.ts";

const activeTab = ref<"todo" | "done">("todo");
const loading = ref(false);
const rows = ref<TaskVO[]>([]);
const pageNum = ref(1);
const pageSize = ref(15);
const total = ref(0);
const detailVisible = ref(false);
const detailLoading = ref(false);
const application = ref<ApplicationVO>();
const businessDetail = ref<Record<string, unknown>>();

const processNames: Record<string, string> = {
    oa_leave_approval: "请假审批",
    oa_reimbursement_approval: "费用报销审批",
    oa_purchase_approval: "采购申请审批"
};

const detailFields = computed(() => {
    const detail = businessDetail.value;
    if (!detail || !application.value) return [];
    if (application.value.type_code === "leave") {
        return [
            ["请假类型", detail.leave_type_code],
            ["开始时间", detail.start_time],
            ["结束时间", detail.end_time],
            ["请假时长", `${detail.duration_hours ?? "-"} 小时`],
            ["请假事由", detail.reason]
        ];
    }
    if (application.value.type_code === "reimbursement") {
        return [
            ["报销用途", detail.purpose],
            ["费用期间", `${detail.expense_start ?? "-"} 至 ${detail.expense_end ?? "-"}`],
            ["报销金额", `${detail.currency ?? "CNY"} ${detail.total_amount ?? 0}`],
            ["收款人", detail.payee_name]
        ];
    }
    if (application.value.type_code === "purchase") {
        return [
            ["采购事由", detail.purpose],
            ["期望到货", detail.expected_date],
            ["采购预算", `${detail.currency ?? "CNY"} ${detail.budget_amount ?? 0}`],
            ["建议供应商", detail.suggested_supplier]
        ];
    }
    return [];
});

const detailItems = computed<Array<Record<string, unknown>>>(() => {
    const value = businessDetail.value?.items;
    return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
});

async function load(): Promise<void> {
    loading.value = true;
    try {
        const params = { page_num: pageNum.value, page_size: pageSize.value };
        const result =
            activeTab.value === "todo"
                ? await WorkflowApi.getTodoTasks(params)
                : await WorkflowApi.getDoneTasks(params);
        rows.value = result.records;
        total.value = result.total;
    } finally {
        loading.value = false;
    }
}

async function changeTab(): Promise<void> {
    pageNum.value = 1;
    await load();
}

async function openDetail(task: TaskVO): Promise<void> {
    detailVisible.value = true;
    detailLoading.value = true;
    application.value = undefined;
    businessDetail.value = undefined;
    try {
        const current = await ApplicationApi.get(task.business_key);
        application.value = current;
        if (!current.biz_id) return;
        if (current.type_code === "leave") {
            businessDetail.value = (await LeaveApi.get(current.biz_id)) as unknown as Record<string, unknown>;
        }
        if (current.type_code === "reimbursement") {
            businessDetail.value = (await ReimbursementApi.get(current.biz_id)) as unknown as Record<string, unknown>;
        }
        if (current.type_code === "purchase") {
            businessDetail.value = (await PurchaseApi.get(current.biz_id)) as unknown as Record<string, unknown>;
        }
    } finally {
        detailLoading.value = false;
    }
}

async function approve(task: TaskVO): Promise<void> {
    const result = await ElMessageBox.prompt("可填写审批意见", "审批通过", {
        inputPlaceholder: "同意",
        confirmButtonText: "通过",
        cancelButtonText: "取消"
    });
    await WorkflowApi.completeTask(task.id, result.value || "同意");
    ElMessage.success("审批已通过");
    await load();
}

async function reject(task: TaskVO): Promise<void> {
    const result = await ElMessageBox.prompt("请填写驳回原因", "驳回申请", {
        inputPlaceholder: "驳回原因",
        inputValidator: value => Boolean(value.trim()) || "驳回原因不能为空",
        confirmButtonText: "确认驳回",
        cancelButtonText: "取消",
        type: "warning"
    });
    await WorkflowApi.rejectTask(task.id, result.value.trim());
    ElMessage.success("申请已驳回");
    await load();
}

onMounted(load);
</script>

<template>
    <div class="approval-page">
        <el-card class="approval-card">
            <el-tabs v-model="activeTab" @tab-change="changeTab">
                <el-tab-pane label="待我审批" name="todo" />
                <el-tab-pane label="我已审批" name="done" />
            </el-tabs>
            <el-table v-loading="loading" :data="rows" height="calc(100% - 88px)" stripe>
                <el-table-column label="任务" prop="name" min-width="160" />
                <el-table-column label="业务类型" min-width="160">
                    <template #default="scope">
                        {{ processNames[scope.row.process_definition_key] || scope.row.process_definition_key }}
                    </template>
                </el-table-column>
                <el-table-column label="创建时间" prop="create_time" width="180" />
                <el-table-column label="操作" fixed="right" :width="activeTab === 'todo' ? 210 : 90">
                    <template #default="scope">
                        <el-button link type="primary" @click="openDetail(scope.row)">查看</el-button>
                        <template v-if="activeTab === 'todo'">
                            <el-button v-owner="'WF_TASK:UPDATE'" link type="success" @click="approve(scope.row)">
                                通过
                            </el-button>
                            <el-button v-owner="'WF_TASK:UPDATE'" link type="danger" @click="reject(scope.row)">
                                驳回
                            </el-button>
                        </template>
                    </template>
                </el-table-column>
            </el-table>
            <el-pagination
                v-model:current-page="pageNum"
                v-model:page-size="pageSize"
                layout="total, sizes, prev, pager, next"
                :total="total"
                @change="load" />
        </el-card>

        <el-drawer v-model="detailVisible" title="申请详情" size="520px">
            <div v-loading="detailLoading">
                <el-descriptions v-if="application" :column="1" border>
                    <el-descriptions-item label="申请编号">{{ application.application_no }}</el-descriptions-item>
                    <el-descriptions-item label="标题">{{ application.title }}</el-descriptions-item>
                    <el-descriptions-item label="状态">{{ application.status }}</el-descriptions-item>
                    <el-descriptions-item v-for="field in detailFields" :key="field[0]" :label="String(field[0])">
                        {{ field[1] || "-" }}
                    </el-descriptions-item>
                </el-descriptions>
                <el-table v-if="detailItems.length" :data="detailItems" class="detail-items" size="small" stripe>
                    <el-table-column label="明细" min-width="160">
                        <template #default="scope">
                            {{ scope.row.item_name || scope.row.description || scope.row.category || "-" }}
                        </template>
                    </el-table-column>
                    <el-table-column label="数量/金额" width="130" align="right">
                        <template #default="scope">
                            {{ scope.row.amount ?? scope.row.quantity ?? "-" }}
                        </template>
                    </el-table-column>
                </el-table>
            </div>
        </el-drawer>
    </div>
</template>

<style scoped lang="scss">
.approval-page {
    height: 100%;
    padding: 20px;
}
.approval-card {
    height: 100%;
}
.detail-items {
    margin-top: 16px;
}
</style>
