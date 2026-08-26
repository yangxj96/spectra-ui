<script setup lang="ts">
import { onMounted, ref } from "vue";

import { SecurityAuditApi } from "@/api/auth/security-audit-api.ts";
import useTable from "@/hooks/use-table.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const condition = ref<SecurityAuditPageParams>({
    page_num: 1,
    page_size: 15,
    event_type: "",
    result: undefined
});
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } =
    useTable<SecurityAuditVO>(SecurityAuditApi.page, condition.value);
const detailVisible = ref(false);
const detail = ref<SecurityAuditVO>();
const retention = ref<SecurityAuditRetention>();

const formatSnapshot = (snapshot: Record<string, unknown>) => JSON.stringify(snapshot, null, 2);

const handleDetail = async (row: SecurityAuditVO) => {
    detail.value = await SecurityAuditApi.detail(row.event_id);
    detailVisible.value = true;
};

const handleExport = async () => {
    await SecurityAuditApi.export({
        event_type: condition.value.event_type || undefined,
        result: condition.value.result
    });
    MessageUtils.success("审计导出已生成");
};

const handleReset = () => {
    condition.value.event_type = "";
    condition.value.result = undefined;
    condition.value.page_num = 1;
    handlerConditionQuery();
};

onMounted(async () => {
    try {
        retention.value = await SecurityAuditApi.retention();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "审计保留策略加载失败");
    }
});
</script>

<template>
    <div class="security-audit-page">
        <el-card shadow="never" class="retention-card">
            <template #header>安全审计运营策略</template>
            <el-space v-if="retention">
                <el-tag type="success">热存 {{ retention.hot_retention_months }} 个月</el-tag>
                <el-tag type="warning">总保留不少于 {{ retention.total_retention_years }} 年</el-tag>
                <el-tag>归档后端：{{ retention.archive_backend }}</el-tag>
                <el-tag>状态：{{ retention.state }}</el-tag>
            </el-space>
            <el-empty v-else description="暂未读取保留策略" :image-size="40" />
        </el-card>

        <el-card shadow="never" class="audit-card">
            <el-form :inline="true" class="search-form">
                <el-form-item label="事件类型">
                    <el-input v-model="condition.event_type" clearable placeholder="如 USER_PROFILE_UPDATED" />
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
            <el-table :data="table_data" border stripe height="calc(100vh - 330px)">
                <el-table-column prop="occurred_at" label="发生时间" width="190" />
                <el-table-column prop="event_type" label="事件类型" min-width="220" show-overflow-tooltip />
                <el-table-column prop="result" label="结果" width="100" />
                <el-table-column prop="operator_id" label="操作者" min-width="220" show-overflow-tooltip />
                <el-table-column prop="target_id" label="目标" min-width="220" show-overflow-tooltip />
                <el-table-column prop="client" label="客户端" width="100" />
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

        <el-dialog v-model="detailVisible" title="安全审计详情" width="760px">
            <el-descriptions v-if="detail" :column="2" border>
                <el-descriptions-item label="事件 ID">{{ detail.event_id }}</el-descriptions-item>
                <el-descriptions-item label="关联请求">{{ detail.correlation_id || "-" }}</el-descriptions-item>
                <el-descriptions-item label="事件类型">{{ detail.event_type }}</el-descriptions-item>
                <el-descriptions-item label="结果">{{ detail.result }}</el-descriptions-item>
                <el-descriptions-item label="IP">{{ detail.ip || "-" }}</el-descriptions-item>
                <el-descriptions-item label="原因" :span="2">{{ detail.reason || "-" }}</el-descriptions-item>
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
.security-audit-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
}

.retention-card :deep(.el-card__body) {
    padding: 10px 16px;
}

.audit-card {
    flex: 1;
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
