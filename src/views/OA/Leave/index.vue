<script setup lang="ts">
import { ElMessageBox } from "element-plus";
import { ref } from "vue";
import { useRouter } from "vue-router";

import { LeaveApi } from "@/api/oa/leave-api.ts";
import OAApproverSelect from "@/components/OAApproverSelect/index.vue";
import useTable from "@/hooks/use-table.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import OaListPage from "@/views/OA/components/OaListPage/index.vue";

const statusMap: Record<string, [string, "success" | "warning" | "danger" | "info"]> = {
    DRAFT: ["草稿", "info"],
    IN_REVIEW: ["审批中", "warning"],
    APPROVED: ["已通过", "success"],
    REJECTED: ["已驳回", "danger"],
    WITHDRAWN: ["已撤回", "info"],
    CANCELLED: ["已取消", "info"]
};

const condition = ref<LeavePageParams>({ page_num: 1, page_size: 15 });
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<LeaveVO>(
    LeaveApi.page,
    condition.value
);
const approverEmail = ref("");
const router = useRouter();

function openCreate(): void {
    router.push({ name: "OALeaveEdit" });
}

function openEdit(row: LeaveVO): void {
    router.push({ name: "OALeaveEdit", query: { id: row.id } });
}

async function submit(row: LeaveVO): Promise<void> {
    if (!approverEmail.value) {
        MessageUtils.warning("请先选择审批人");
        return;
    }
    await LeaveApi.submit(row.id, { approver_email: approverEmail.value });
    MessageUtils.success("已提交审批");
    handlerConditionQuery();
}

async function withdraw(row: LeaveVO): Promise<void> {
    await ElMessageBox.confirm("确认撤回这条请假申请吗？", "提示", { type: "warning" });
    await LeaveApi.withdraw(row.id);
    MessageUtils.success("已撤回");
    handlerConditionQuery();
}

async function cancel(row: LeaveVO): Promise<void> {
    await ElMessageBox.confirm("确认取消这条请假申请吗？取消后不可再提交。", "提示", { type: "warning" });
    await LeaveApi.cancel(row.id);
    MessageUtils.success("申请已取消");
    handlerConditionQuery();
}

function statusLabel(status: string): string {
    return statusMap[status]?.[0] ?? status;
}

function statusType(status: string): "success" | "warning" | "danger" | "info" {
    return statusMap[status]?.[1] ?? "info";
}
</script>

<template>
    <OaListPage>
        <template #search>
            <el-form :inline="true" :model="condition">
                <el-form-item label="状态">
                    <el-select v-model="condition.status" clearable placeholder="全部状态" style="width: 160px">
                        <el-option label="草稿" value="DRAFT" />
                        <el-option label="审批中" value="IN_REVIEW" />
                        <el-option label="已通过" value="APPROVED" />
                        <el-option label="已驳回" value="REJECTED" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                    <el-button @click="openCreate">新建请假</el-button>
                </el-form-item>
                <el-form-item label="审批人"><OAApproverSelect v-model="approverEmail" /></el-form-item>
            </el-form>
        </template>
        <el-table :data="table_data" stripe>
            <el-table-column type="index" width="60" align="center" />
            <el-table-column label="申请编号" prop="application_no" width="210" show-overflow-tooltip />
            <el-table-column label="类型" prop="leave_type_code" width="100" />
            <el-table-column label="开始时间" prop="start_time" width="180" />
            <el-table-column label="结束时间" prop="end_time" width="180" />
            <el-table-column label="时长(小时)" prop="duration_hours" width="110" />
            <el-table-column label="状态" prop="status" width="110">
                <template #default="scope">
                    <el-tag :type="statusType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="240">
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
