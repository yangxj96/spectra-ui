<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import { AuditLogApi } from "@/api/system/audit-log-api.ts";
import useTable from "@/hooks/use-table.ts";
import { formatDateTime } from "@/utils/date-utils.ts";

const condition = ref<AuditLogPageParams>({
    page_num: 1,
    page_size: 15,
    category: undefined,
    event_type: "",
    operator: "",
    result: undefined
});
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<AuditLogVO>(
    AuditLogApi.page,
    condition.value
);
const router = useRouter();

const categoryLabels: Record<AuditLogVO["category"], string> = {
    OPERATION: "普通操作",
    SECURITY: "安全操作"
};
const resultLabels: Record<AuditLogVO["result"], string> = {
    STARTED: "开始",
    SUCCEEDED: "成功",
    FAILED: "失败",
    DENIED: "拒绝"
};
const resultTagTypes: Record<AuditLogVO["result"], "success" | "danger" | "warning" | "info"> = {
    STARTED: "info",
    SUCCEEDED: "success",
    FAILED: "danger",
    DENIED: "warning"
};

const formatCategory = (category: string) => categoryLabels[category as keyof typeof categoryLabels] ?? category;
const formatResult = (result: string) => resultLabels[result as keyof typeof resultLabels] ?? result;
const resultTagType = (result: string) => resultTagTypes[result as keyof typeof resultTagTypes] ?? "info";
const formatEventType = (row: AuditLogVO) => {
    const description = row.reason?.trim();
    if (!description) {
        return row.event_type;
    }
    const unquotedDescription =
        description.startsWith("'") && description.endsWith("'") ? description.slice(1, -1).trim() : description;
    return unquotedDescription || row.event_type;
};
const handleDetail = (row: AuditLogVO) => {
    void router.push({
        name: "DevopsAuditLogDetail",
        query: { event_id: row.event_id, occurred_at: row.occurred_at }
    });
};

const handleExport = async () => {
    await AuditLogApi.export({
        category: condition.value.category,
        event_type: condition.value.event_type || undefined,
        operator: condition.value.operator || undefined,
        target_id: condition.value.target_id,
        result: condition.value.result,
        from: condition.value.from,
        to: condition.value.to
    });
};

const handleReset = () => {
    condition.value.category = undefined;
    condition.value.event_type = "";
    condition.value.operator = "";
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
                    <el-input
                        v-model="condition.event_type"
                        clearable
                        placeholder="如 USER_PROFILE_UPDATED 或操作说明" />
                </el-form-item>
                <el-form-item label="操作人">
                    <el-input v-model="condition.operator" clearable placeholder="输入用户 ID 或姓名" />
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
                <el-table-column label="发生时间" width="190">
                    <template #default="scope">{{ formatDateTime(scope.row.occurred_at) }}</template>
                </el-table-column>
                <el-table-column label="分类" width="110">
                    <template #default="scope">{{ formatCategory(scope.row.category) }}</template>
                </el-table-column>
                <el-table-column label="事件类型" min-width="220" show-overflow-tooltip>
                    <template #default="scope">{{ formatEventType(scope.row) }}</template>
                </el-table-column>
                <el-table-column label="结果" width="100">
                    <template #default="scope">
                        <el-tag :type="resultTagType(scope.row.result)" size="small">
                            {{ formatResult(scope.row.result) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="operator_id" label="操作人" min-width="200" show-overflow-tooltip />
                <el-table-column label="姓名" min-width="120" show-overflow-tooltip>
                    <template #default="scope">{{ scope.row.operator_name || "-" }}</template>
                </el-table-column>
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
</style>
