<script setup lang="ts">
import { ElMessage } from "element-plus";
import { reactive, ref } from "vue";

import { NoticeApi } from "@/api/oa/notice-api.ts";
import useTable from "@/hooks/use-table.ts";

const condition = ref<NoticePageParams>({ page_num: 1, page_size: 15 });
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<NoticeVO>(
    NoticeApi.page,
    condition.value
);

const dialogVisible = ref(false);
const form = reactive<NoticeCreateParams>({
    title: "",
    summary: "",
    content: "",
    target_type: "ALL",
    required_read: false
});

const openCreate = () => {
    Object.assign(form, { title: "", summary: "", content: "", target_type: "ALL", required_read: false });
    dialogVisible.value = true;
};

const createAndPublish = async () => {
    const notice = await NoticeApi.create(form);
    await NoticeApi.publish(notice.id);
    ElMessage.success("公告已发布");
    dialogVisible.value = false;
    handlerConditionQuery();
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
    <div class="oa-page">
        <el-card class="oa-toolbar">
            <el-form :inline="true" :model="condition">
                <el-form-item label="关键词">
                    <el-input v-model="condition.keyword" placeholder="标题或摘要" clearable />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                    <el-button @click="openCreate">发布公告</el-button>
                </el-form-item>
            </el-form>
        </el-card>
        <el-card class="oa-body">
            <el-table :data="table_data" height="100%" stripe>
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
                        <el-button
                            v-if="scope.row.status === 'PUBLISHED'"
                            link
                            type="danger"
                            @click="revoke(scope.row)">
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
        </el-card>

        <el-dialog v-model="dialogVisible" title="发布公告" width="620px">
            <el-form label-width="90px">
                <el-form-item label="标题" required><el-input v-model="form.title" /></el-form-item>
                <el-form-item label="摘要"><el-input v-model="form.summary" /></el-form-item>
                <el-form-item label="内容" required>
                    <el-input v-model="form.content" type="textarea" :rows="8" />
                </el-form-item>
                <el-form-item label="范围">
                    <el-select v-model="form.target_type">
                        <el-option label="全员" value="ALL" />
                        <el-option label="部门" value="DEPARTMENT" />
                    </el-select>
                </el-form-item>
                <el-form-item label="必读"><el-switch v-model="form.required_read" /></el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="createAndPublish">保存并发布</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.oa-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    height: 100%;
}
.oa-toolbar {
    flex: none;
}
.oa-body {
    flex: 1;
    min-height: 0;
}
.el-pagination {
    justify-content: flex-end;
    margin-top: 12px;
}
</style>
