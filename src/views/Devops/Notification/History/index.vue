<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

import { NotificationHistoryApi } from "@/api/notification/notification-history-api.ts";
import { toIsoDateRange } from "@/utils/date-utils";
import { MessageUtils } from "@/utils/message-utils.ts";

defineOptions({
    name: "DevopsNotificationHistory"
});

const channelLabels: Record<string, string> = {
    IN_APP: "站内信",
    SMS: "短信",
    EMAIL: "邮件"
};

const statusLabels: Record<string, string> = {
    SUCCESS: "成功",
    FAILED: "失败"
};

const loading = ref(false);
const rows = ref<NotificationMessageVO[]>([]);
const total = ref(0);
const detailVisible = ref(false);
const detail = ref<NotificationMessageVO>();

const query = reactive<NotificationHistoryQuery>({
    page_num: 1,
    page_size: 15
});

const searchForm = reactive({
    channel: "" as NotificationHistoryChannel | "",
    status: "" as NotificationHistoryStatus | "",
    keyword: "",
    dateRange: [] as string[]
});

/** 加载发送历史 */
async function loadData(): Promise<void> {
    loading.value = true;
    try {
        const result = await NotificationHistoryApi.page(query);
        rows.value = result.records ?? [];
        total.value = result.total ?? 0;
    } catch (error) {
        MessageUtils.error(error);
    } finally {
        loading.value = false;
    }
}

/** 查询 */
function handleSearch(): void {
    query.page_num = 1;
    query.channel = searchForm.channel || undefined;
    query.status = searchForm.status || undefined;
    query.keyword = searchForm.keyword || undefined;
    const dateRange = toIsoDateRange(searchForm.dateRange);
    query.start_time = dateRange?.start;
    query.end_time = dateRange?.end;
    loadData();
}

/** 重置 */
function handleReset(): void {
    searchForm.channel = "";
    searchForm.status = "";
    searchForm.keyword = "";
    searchForm.dateRange = [];
    query.channel = undefined;
    query.status = undefined;
    query.keyword = undefined;
    query.start_time = undefined;
    query.end_time = undefined;
    query.page_num = 1;
    loadData();
}

/** 分页 */
function handlePageChange(page: number): void {
    query.page_num = page;
    loadData();
}

/** 每页条数 */
function handleSizeChange(size: number): void {
    query.page_size = size;
    query.page_num = 1;
    loadData();
}

/** 查看详情 */
async function handleDetail(row: NotificationMessageVO): Promise<void> {
    try {
        detail.value = await NotificationHistoryApi.detail(row.id);
        detailVisible.value = true;
    } catch (error) {
        MessageUtils.error(error);
    }
}

/** 格式化时间 */
function formatTime(value?: string): string {
    return value ? new Date(value).toLocaleString("zh-CN") : "-";
}

onMounted(loadData);
</script>

<template>
    <div class="notification-history-page">
        <el-card>
            <template #header>
                <span class="page-title">通知发送历史</span>
            </template>

            <el-form :model="searchForm" inline label-width="80px">
                <el-form-item label="渠道">
                    <el-select v-model="searchForm.channel" placeholder="全部" clearable style="width: 130px">
                        <el-option label="站内信" value="IN_APP" />
                        <el-option label="短信" value="SMS" />
                        <el-option label="邮件" value="EMAIL" />
                    </el-select>
                </el-form-item>
                <el-form-item label="状态">
                    <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 130px">
                        <el-option label="成功" value="SUCCESS" />
                        <el-option label="失败" value="FAILED" />
                    </el-select>
                </el-form-item>
                <el-form-item label="关键词">
                    <el-input
                        v-model="searchForm.keyword"
                        placeholder="模板、标题或收件地址"
                        clearable
                        style="width: 220px" />
                </el-form-item>
                <el-form-item label="时间范围">
                    <el-date-picker
                        v-model="searchForm.dateRange"
                        type="daterange"
                        range-separator="至"
                        start-placeholder="开始日期"
                        end-placeholder="结束日期"
                        value-format="YYYY-MM-DD"
                        style="width: 260px" />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handleSearch">查询</el-button>
                    <el-button @click="handleReset">重置</el-button>
                </el-form-item>
            </el-form>

            <el-table v-loading="loading" :data="rows" style="width: 100%">
                <el-table-column label="时间" width="170">
                    <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
                </el-table-column>
                <el-table-column label="渠道" width="90">
                    <template #default="{ row }">{{ channelLabels[row.channel] ?? row.channel }}</template>
                </el-table-column>
                <el-table-column prop="template_code" label="模板编码" min-width="160" />
                <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
                <el-table-column label="收件人" min-width="160" show-overflow-tooltip>
                    <template #default="{ row }">{{ row.recipient_address || row.recipient_user_id || "-" }}</template>
                </el-table-column>
                <el-table-column label="状态" width="90">
                    <template #default="{ row }">
                        <el-tag :type="row.status === 'SUCCESS' ? 'success' : 'danger'" size="small">
                            {{ statusLabels[row.status] ?? row.status }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="provider" label="供应商" width="110" />
                <el-table-column label="操作" width="90" fixed="right">
                    <template #default="{ row }">
                        <el-button type="primary" link size="small" @click="handleDetail(row)">详情</el-button>
                    </template>
                </el-table-column>
            </el-table>

            <div class="pagination-wrapper">
                <el-pagination
                    :current-page="query.page_num"
                    :page-size="query.page_size"
                    :page-sizes="[10, 15, 20, 50, 100]"
                    :total="total"
                    layout="total, sizes, prev, pager, next, jumper"
                    @current-change="handlePageChange"
                    @size-change="handleSizeChange" />
            </div>
        </el-card>

        <el-dialog v-model="detailVisible" title="发送详情" width="680px">
            <el-descriptions v-if="detail" :column="1" border>
                <el-descriptions-item label="模板编码">{{ detail.template_code }}</el-descriptions-item>
                <el-descriptions-item label="渠道">
                    {{ channelLabels[detail.channel] ?? detail.channel }}
                </el-descriptions-item>
                <el-descriptions-item label="状态">
                    {{ statusLabels[detail.status] ?? detail.status }}
                </el-descriptions-item>
                <el-descriptions-item label="标题">{{ detail.title || "-" }}</el-descriptions-item>
                <el-descriptions-item label="正文">
                    <pre class="content-preview">{{ detail.content || "-" }}</pre>
                </el-descriptions-item>
                <el-descriptions-item label="收件人">
                    {{ detail.recipient_address || detail.recipient_user_id || "-" }}
                </el-descriptions-item>
                <el-descriptions-item label="供应商">{{ detail.provider || "-" }}</el-descriptions-item>
                <el-descriptions-item label="错误">
                    {{ detail.error_code ? `${detail.error_code} ${detail.error_message ?? ""}` : "-" }}
                </el-descriptions-item>
                <el-descriptions-item label="时间">{{ formatTime(detail.created_at) }}</el-descriptions-item>
            </el-descriptions>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.notification-history-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.page-title {
    font-weight: 600;
}

.pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    padding-top: 16px;
}

.content-preview {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
}
</style>
