<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import { MeetingApi } from "@/api/oa/meeting-api.ts";
import useTable from "@/hooks/use-table.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import OaListPage from "@/views/OA/components/OaListPage/index.vue";

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
const router = useRouter();

const openCreate = () => router.push({ name: "OAMeetingCreate" });

const respond = async (row: MeetingVO, status: string) => {
    await MeetingApi.respond(row.id, status);
    MessageUtils.success("会议响应已更新");
};

const checkIn = async (row: MeetingVO) => {
    await MeetingApi.checkIn(row.id);
    MessageUtils.success("签到成功");
};

// 重置查询条件
const handleReset = () => {
    condition.value.title = undefined;
    condition.value.status = undefined;
    handlerConditionQuery();
};
</script>

<template>
    <OaListPage>
        <template #search>
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
                    <el-button @click="openCreate">新建会议</el-button>
                </el-form-item>
            </el-form>
        </template>
        <el-table :data="table_data" stripe>
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
            <el-table-column align="center" width="180" label="操作" fixed="right">
                <template #default="scope">
                    <el-button link type="primary" @click="respond(scope.row, 'accepted')">接受</el-button>
                    <el-button link type="warning" @click="respond(scope.row, 'declined')">拒绝</el-button>
                    <el-button link type="success" @click="checkIn(scope.row)">签到</el-button>
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
