<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { ref } from "vue";

import { LeaveApi } from "@/api/oa/leave-api.ts";
import OAApproverSelect from "@/components/OAApproverSelect/index.vue";
import useTable from "@/hooks/use-table.ts";
import { toIsoDateTime } from "@/utils/date-utils.ts";

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

const dialogVisible = ref(false);
const approverUsername = ref("");
const editingId = ref("");
const form = ref<LeaveCreateParams>({
    leave_type_code: "annual",
    start_time: "",
    end_time: "",
    reason: "",
    contact_address: "",
    calculate_duration: true
});

function openCreate(): void {
    editingId.value = "";
    form.value = {
        leave_type_code: "annual",
        start_time: "",
        end_time: "",
        reason: "",
        contact_address: "",
        calculate_duration: true
    };
    dialogVisible.value = true;
}

function openEdit(row: LeaveVO): void {
    editingId.value = row.id;
    form.value = {
        leave_type_code: row.leave_type_code,
        start_time: row.start_time,
        end_time: row.end_time,
        reason: row.reason,
        contact_address: row.contact_address,
        calculate_duration: true
    };
    dialogVisible.value = true;
}

async function submitCreate(): Promise<void> {
    const params = {
        ...form.value,
        start_time: toIsoDateTime(form.value.start_time),
        end_time: toIsoDateTime(form.value.end_time)
    };
    if (editingId.value) await LeaveApi.update(editingId.value, params);
    else await LeaveApi.create(params);
    dialogVisible.value = false;
    ElMessage.success(editingId.value ? "请假申请已更新" : "已保存为草稿");
    handlerConditionQuery();
}

async function submit(row: LeaveVO): Promise<void> {
    if (!approverUsername.value) {
        ElMessage.warning("请先选择审批人");
        return;
    }
    await LeaveApi.submit(row.id, { approver_username: approverUsername.value });
    ElMessage.success("已提交审批");
    handlerConditionQuery();
}

async function withdraw(row: LeaveVO): Promise<void> {
    await ElMessageBox.confirm("确认撤回这条请假申请吗？", "提示", { type: "warning" });
    await LeaveApi.withdraw(row.id);
    ElMessage.success("已撤回");
    handlerConditionQuery();
}

async function cancel(row: LeaveVO): Promise<void> {
    await ElMessageBox.confirm("确认取消这条请假申请吗？取消后不可再提交。", "提示", { type: "warning" });
    await LeaveApi.cancel(row.id);
    ElMessage.success("申请已取消");
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
    <el-row class="box__search">
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
            <el-form-item label="审批人"><OAApproverSelect v-model="approverUsername" /></el-form-item>
        </el-form>
    </el-row>

    <el-row class="box__body">
        <el-table :data="table_data" height="92%" stripe>
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
    </el-row>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑请假申请' : '新建请假申请'" width="520px">
        <el-form label-width="100px">
            <el-form-item label="请假类型">
                <el-select v-model="form.leave_type_code">
                    <el-option label="年假" value="annual" />
                    <el-option label="病假" value="sick" />
                    <el-option label="事假" value="personal" />
                </el-select>
            </el-form-item>
            <el-form-item label="开始时间">
                <el-date-picker v-model="form.start_time" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" />
            </el-form-item>
            <el-form-item label="结束时间">
                <el-date-picker v-model="form.end_time" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" />
            </el-form-item>
            <el-form-item label="请假事由"><el-input v-model="form.reason" type="textarea" :rows="3" /></el-form-item>
            <el-form-item label="联系地址"><el-input v-model="form.contact_address" /></el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitCreate">保存草稿</el-button>
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
</style>
