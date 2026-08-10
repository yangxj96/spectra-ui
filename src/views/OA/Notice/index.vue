<script setup lang="ts">
import { ElMessage } from "element-plus";
import { ref } from "vue";
import { useRouter } from "vue-router";

import { NoticeApi } from "@/api/oa/notice-api.ts";
import useTable from "@/hooks/use-table.ts";
import OaListPage from "@/views/OA/components/OaListPage/index.vue";

const condition = ref<NoticePageParams>({ page_num: 1, page_size: 15 });
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<NoticeVO>(
    NoticeApi.page,
    condition.value
);
const router = useRouter();

const openCreate = () => {
    router.push({ name: "OANoticeCreate" });
};

const markRead = async (row: NoticeVO) => {
    if (row.read) return;
    await NoticeApi.markRead(row.id);
    ElMessage.success("已标记为已读");
    handlerConditionQuery();
};

const revoke = async (row: NoticeVO) => {
    await NoticeApi.revoke(row.id);
    ElMessage.success("公告已撤回");
    handlerConditionQuery();
};
</script>

<template>
    <OaListPage>
        <template #search>
            <el-form :inline="true" :model="condition">
                <el-form-item label="关键词">
                    <el-input v-model="condition.keyword" placeholder="标题或摘要" clearable />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                    <el-button @click="openCreate">发布公告</el-button>
                </el-form-item>
            </el-form>
        </template>
        <el-table :data="table_data" stripe>
            <el-table-column prop="title" label="标题" min-width="240" show-overflow-tooltip />
            <el-table-column prop="target_type" label="范围" width="110" />
            <el-table-column prop="publish_at" label="发布时间" width="180" />
            <el-table-column label="状态" width="100">
                <template #default="scope">
                    <el-tag :type="scope.row.status === 'PUBLISHED' ? 'success' : 'info'">
                        {{ scope.row.status }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column label="阅读" width="90">
                <template #default="scope">
                    <el-tag :type="scope.row.read ? 'success' : 'warning'">
                        {{ scope.row.read ? "已读" : "未读" }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
                <template #default="scope">
                    <el-button link type="primary" @click="markRead(scope.row)">标记已读</el-button>
                    <el-button v-if="scope.row.status === 'PUBLISHED'" link type="danger" @click="revoke(scope.row)">
                        撤回
                    </el-button>
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
