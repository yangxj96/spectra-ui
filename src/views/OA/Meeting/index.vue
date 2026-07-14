<script setup lang="ts">
import { ref } from "vue";

import { MeetingApi } from "@/api/oa/meeting-api.ts";
import useTable from "@/hooks/use-table.ts";

// 会议状态下拉选项（查询用：业务状态）
const statusOptions = [
    { label: "草稿", value: "draft" },
    { label: "已安排", value: "scheduled" },
    { label: "进行中", value: "ongoing" },
    { label: "已结束", value: "finished" },
    { label: "已取消", value: "cancelled" }
];

// 统一状态映射：key → [显示文本, 标签类型]
const statusMap: Record<string, [string, string]> = {
    draft: ["草稿", "info"],
    scheduled: ["已安排", "primary"],
    ongoing: ["进行中", "warning"],
    finished: ["已结束", "success"],
    cancelled: ["已取消", "danger"],
    processing: ["审批中", "warning"],
    approved: ["已通过", "success"],
    rejected: ["已驳回", "danger"]
};

const getStatusLabel = (status: string) => statusMap[status]?.[0] || status;
const getStatusType = (status: string) => statusMap[status]?.[1] || "info";

// 查询条件
const condition = ref<MeetingPageParams>({
    page_num: 1,
    page_size: 15
});

// table分页请求
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<MeetingVO>(
    MeetingApi.page,
    condition.value
);

// 重置查询条件
const handleReset = () => {
    condition.value.title = undefined;
    condition.value.status = undefined;
    handlerConditionQuery();
};
</script>

<template>
    <!-- 搜索区 -->
    <el-row class="box-search">
        <el-form :inline="true" :model="condition">
            <el-form-item label="会议标题" prop="title">
                <el-input v-model="condition.title" placeholder="请输入会议标题" clearable />
            </el-form-item>
            <el-form-item label="会议状态" prop="status">
                <el-select v-model="condition.status" placeholder="请选择状态" clearable style="width: 180px">
                    <el-option
                        v-for="item in statusOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value" />
                </el-select>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                <el-button @click="handleReset">重置</el-button>
            </el-form-item>
        </el-form>
    </el-row>
    <!-- 数据区 -->
    <el-row class="box-body">
        <el-table :data="table_data" height="92%" stripe>
            <el-table-column align="center" type="index" width="60" />
            <el-table-column align="center" width="200" show-overflow-tooltip label="会议标题" prop="title" />
            <el-table-column align="center" width="120" show-overflow-tooltip label="发起人" prop="initiator_id" />
            <el-table-column align="center" width="170" show-overflow-tooltip label="开始时间" prop="start_time" />
            <el-table-column align="center" width="170" show-overflow-tooltip label="结束时间" prop="end_time" />
            <el-table-column align="center" width="150" show-overflow-tooltip label="地点" prop="location" />
            <el-table-column align="center" width="100" label="状态" prop="status">
                <template #default="scope">
                    <el-tag :type="getStatusType(scope.row.status)" size="small">
                        {{ getStatusLabel(scope.row.status) }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" width="100" label="审批" prop="approval_status">
                <template #default="scope">
                    <el-tag :type="getStatusType(scope.row.approval_status)" size="small">
                        {{ getStatusLabel(scope.row.approval_status) }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" width="170" show-overflow-tooltip label="创建时间" prop="created_at" />
        </el-table>
        <!-- 分页 -->
        <el-pagination
            layout="total, sizes, prev, pager, next"
            :page-size="pagination.size"
            :page-sizes="pagination.page_sizes"
            :total="pagination.total"
            style="padding: 0 10px; margin-left: auto"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
    </el-row>
</template>

<style scoped lang="scss">
.box-search {
    height: 10%;
    display: flex;
    align-items: center;
    padding-left: 20px;

    .el-form-item {
        margin-bottom: 0;
    }
}

.box-body {
    height: 90%;
}
</style>
