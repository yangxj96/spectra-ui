<script setup lang="ts">
import { ElMessageBox } from "element-plus";
import { ref } from "vue";
import { useRouter } from "vue-router";

import { CalendarApi } from "@/api/oa/calendar-api.ts";
import useTable from "@/hooks/use-table.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import OaListPage from "@/views/OA/components/OaListPage/index.vue";

const condition = ref<CalendarPageParams>({ page_num: 1, page_size: 15 });
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<CalendarVO>(
    CalendarApi.page,
    condition.value
);
const router = useRouter();

const openCreate = () => {
    router.push({ name: "OACalendarCreate" });
};

const remove = async (row: CalendarVO) => {
    await ElMessageBox.confirm(`确认删除日程“${row.title}”吗？`, "提示", { type: "warning" });
    await CalendarApi.delete(row.id);
    MessageUtils.success("日程已删除");
    handlerConditionQuery();
};
</script>

<template>
    <OaListPage>
        <template #search>
            <el-form :inline="true" :model="condition">
                <el-form-item label="关键词">
                    <el-input v-model="condition.keyword" placeholder="日程标题" clearable />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                    <el-button @click="openCreate">新建日程</el-button>
                </el-form-item>
            </el-form>
        </template>
        <el-table :data="table_data" stripe>
            <el-table-column prop="title" label="日程" min-width="220" />
            <el-table-column prop="start_time" label="开始" width="190" />
            <el-table-column prop="end_time" label="结束" width="190" />
            <el-table-column prop="visibility" label="共享范围" width="120" />
            <el-table-column prop="location" label="地点" width="160" />
            <el-table-column label="操作" width="90" fixed="right">
                <template #default="scope">
                    <el-button link type="danger" @click="remove(scope.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination
            layout="total, sizes, prev, pager, next"
            :page-size="pagination.size"
            :page-sizes="pagination.page_sizes"
            :total="pagination.total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
    </OaListPage>
</template>
