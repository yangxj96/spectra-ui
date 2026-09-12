<script setup lang="ts">
import { ref } from "vue";

import { AuditLogApi } from "@/api/system/audit-log-api.ts";
import useTable from "@/hooks/use-table.ts";

const condition = ref<AuditLogPageParams>({
    page_num: 1,
    page_size: 15,
    category: undefined,
    event_type: "",
    result: undefined
});
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<AuditLogVO>(
    AuditLogApi.page,
    condition.value
);
const detailVisible = ref(false);
const detail = ref<AuditLogVO>();

const formatSnapshot = (snapshot: Record<string, unknown>) => JSON.stringify(snapshot, null, 2);

const handleDetail = async (row: AuditLogVO) => {
    detail.value = await AuditLogApi.detail(row.event_id, row.occurred_at);
    detailVisible.value = true;
};

const handleExport = async () => {
    await AuditLogApi.export({
        category: condition.value.category,
        event_type: condition.value.event_type || undefined,
        operator_id: condition.value.operator_id,
        target_id: condition.value.target_id,
        result: condition.value.result,
        from: condition.value.from,
        to: condition.value.to
    });
};

const handleReset = () => {
    condition.value.category = undefined;
    condition.value.event_type = "";
    condition.value.operator_id = undefined;
    condition.value.target_id = undefined;
    condition.value.result = undefined;
    condition.value.from = undefined;
    condition.value.to = undefined;
    condition.value.page_num = 1;
    handlerConditionQuery();
};
</script>

<template>
    <div class="audit-log-page">
        <el-card shadow="never">
            <el-form :inline="true" class="search-form">
                <el-form-item label="分类">
                    <el-select v-model="condition.category" clearable placeholder="全部" style="width: 150px">
                        <el-option label="普通操作" value="OPERATION" />
                        <el-option label="安全操作" value="SECURITY" />
                    </el-select>
                </el-form-item>
                <el-form-item label="事件类型">
                    <el-input v-model="condition.event_type" clearable placeholder="如 USER_PROFILE_UPDATED" />
                </el-form-item>
                <el-form-item label="操作者">
                    <el-input v-model="condition.operator_id" clearable />
                </el-form-item>
                <el-form-item label="目标">
                    <el-input v-model="condition.target_id" clearable />
                </el-form-item>
                <el-form-item label="结果">
                    <el-select v-model="condition.result" clearable placeholder="全部" style="width: 140px">
                        <el-option label="开始" value="STARTED" />
                        <el-option label="成功" value="SUCCEEDED" />
                        <el-option label="失败" value="FAILED" />
                        <el-option label="拒绝" value="DENIED" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                    <el-button @click="handleReset">重置</el-button>
                    <el-button v-permission="'audit:export'" type="success" @click="handleExport">导出</el-button>
                </el-form-item>
            </el-form>
            <el-table :data="table_data" border stripe height="calc(100vh - 260px)">
                <el-table-column prop="occurred_at" label="发生时间" width="190" />
                <el-table-column prop="category" label="分类" width="110" />
                <el-table-column prop="event_type" label="事件类型" min-width="220" show-overflow-tooltip />
                <el-table-column prop="result" label="结果" width="100" />
                <el-table-column prop="operator_id" label="操作者" min-width="200" show-overflow-tooltip />
                <el-table-column prop="target_id" label="目标" min-width="200" show-overflow-tooltip />
                <el-table-column prop="failure_reason" label="失败原因" min-width="180" show-overflow-tooltip />
                <el-table-column label="操作" width="90" fixed="right">
                    <template #default="scope">
                        <el-button link type="primary" @click="handleDetail(scope.row)">详情</el-button>
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

        <el-dialog v-model="detailVisible" title="审计日志详情" width="760px">
            <el-descriptions v-if="detail" :column="2" border>
                <el-descriptions-item label="事件 ID">{{ detail.event_id }}</el-descriptions-item>
                <el-descriptions-item label="发生时间">{{ detail.occurred_at }}</el-descriptions-item>
                <el-descriptions-item label="分类">{{ detail.category }}</el-descriptions-item>
                <el-descriptions-item label="事件类型">{{ detail.event_type }}</el-descriptions-item>
                <el-descriptions-item label="结果">{{ detail.result }}</el-descriptions-item>
                <el-descriptions-item label="请求">
                    {{ detail.http_method }} {{ detail.request_url }}
                </el-descriptions-item>
                <el-descriptions-item label="失败码">{{ detail.failure_code || "-" }}</el-descriptions-item>
                <el-descriptions-item label="异常类型">{{ detail.failure_type || "-" }}</el-descriptions-item>
                <el-descriptions-item label="原因" :span="2">{{ detail.reason || "-" }}</el-descriptions-item>
                <el-descriptions-item label="失败原因" :span="2">
                    {{ detail.failure_reason || "-" }}
                </el-descriptions-item>
                <el-descriptions-item label="变更前快照" :span="2">
                    <pre>{{ formatSnapshot(detail.before) }}</pre>
                </el-descriptions-item>
                <el-descriptions-item label="变更后快照" :span="2">
                    <pre>{{ formatSnapshot(detail.after) }}</pre>
                </el-descriptions-item>
            </el-descriptions>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.audit-log-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
}

.search-form {
    margin-bottom: 12px;
}

pre {
    max-height: 220px;
    overflow: auto;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
}
</style>
