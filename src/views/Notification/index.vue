<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

import { useNotificationStore } from "@/plugin/store/modules/use-notification-store.ts";

import NotificationDetail from "./components/NotificationDetail/index.vue";

defineOptions({
    name: "NotificationPage"
});

const notificationStore = useNotificationStore();
const selectedIds = ref<string[]>([]);
const detailVisible = ref(false);
const currentNotification = ref<Notification | null>(null);
const queryParams = ref<NotificationQueryParams>({
    page_num: 1,
    page_size: 10
});

/** 搜索表单 */
const searchForm = ref({
    keyword: "",
    type: "" as NotificationType | "all",
    is_read: "" as boolean | "",
    dateRange: [] as string[]
});

/** 当前详情索引 */
const currentDetailIndex = computed(() => {
    if (!currentNotification.value) return -1;
    return notificationStore.filteredNotifications.findIndex(n => n.id === currentNotification.value?.id);
});

/** 是否有上一条 */
const hasPrevious = computed(() => currentDetailIndex.value > 0);

/** 是否有下一条 */
const hasNext = computed(() => {
    return currentDetailIndex.value < notificationStore.filteredNotifications.length - 1;
});

/** 加载数据 */
async function loadData(): Promise<void> {
    await notificationStore.fetchNotifications(queryParams.value);
}

/** 处理搜索 */
function handleSearch(): void {
    queryParams.value = {
        page_num: 1,
        page_size: queryParams.value.page_size
    };

    if (searchForm.value.keyword) {
        queryParams.value.keyword = searchForm.value.keyword;
    }
    if (searchForm.value.type && searchForm.value.type !== "all") {
        queryParams.value.type = searchForm.value.type;
    }
    if (searchForm.value.is_read !== "") {
        queryParams.value.is_read = searchForm.value.is_read === "true";
    }
    if (searchForm.value.dateRange && searchForm.value.dateRange.length === 2) {
        queryParams.value.start_time = searchForm.value.dateRange[0];
        queryParams.value.end_time = searchForm.value.dateRange[1];
    }

    loadData();
}

/** 重置搜索 */
function handleReset(): void {
    searchForm.value = {
        keyword: "",
        type: "",
        is_read: "",
        dateRange: []
    };
    queryParams.value = {
        page_num: 1,
        page_size: 10
    };
    loadData();
}

/** 处理分页变化 */
function handleCurrentChange(page: number): void {
    queryParams.value.page_num = page;
    loadData();
}

/** 处理每页条数变化 */
function handleSizeChange(size: number): void {
    queryParams.value.page_size = size;
    queryParams.value.page_num = 1;
    loadData();
}

/** 处理选择变化 */
function handleSelectionChange(selection: Notification[]): void {
    selectedIds.value = selection.map(item => item.id);
}

/** 全部标记已读 */
async function handleMarkAllAsRead(): Promise<void> {
    await notificationStore.markAllAsRead();
    loadData();
}

/** 批量删除 */
async function handleBatchDelete(): Promise<void> {
    if (selectedIds.value.length === 0) return;
    await notificationStore.batchDelete(selectedIds.value);
    selectedIds.value = [];
    loadData();
}

/** 查看详情 */
function handleViewDetail(row: Notification): void {
    currentNotification.value = row;
    detailVisible.value = true;
    if (!row.is_read) {
        notificationStore.markAsRead(row.id);
    }
}

/** 删除消息 */
async function handleDelete(id: string): Promise<void> {
    await notificationStore.deleteNotification(id);
    if (currentNotification.value && currentNotification.value.id === id) {
        detailVisible.value = false;
        currentNotification.value = null;
    }
    loadData();
}

/** 上一条 */
function handlePrev(): void {
    if (hasPrevious.value && currentDetailIndex.value > 0) {
        currentNotification.value = notificationStore.filteredNotifications[currentDetailIndex.value - 1];
    }
}

/** 下一条 */
function handleNext(): void {
    if (hasNext.value && currentDetailIndex.value < notificationStore.filteredNotifications.length - 1) {
        currentNotification.value = notificationStore.filteredNotifications[currentDetailIndex.value + 1];
    }
}

/** 关闭详情弹窗 */
function handleCloseDetail(): void {
    detailVisible.value = false;
    currentNotification.value = null;
}

/** 格式化时间 */
function formatTime(time: string): string {
    const date = new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString("zh-CN");
}

/** 获取类型标签 */
function getTypeLabel(type: NotificationType): string {
    return notificationStore.getTypeLabel(type);
}

/** 获取类型颜色 */
function getTypeColor(type: NotificationType): string {
    return notificationStore.getTypeColor(type);
}

onMounted(() => {
    loadData();
});
</script>

<template>
    <div class="notification-page">
        <el-card>
            <div class="page-header">
                <span class="page-title">消息中心</span>
                <el-button type="primary" @click="handleMarkAllAsRead">全部已读</el-button>
            </div>
        </el-card>

        <el-card class="search-card">
            <el-form :model="searchForm" inline label-width="80px">
                <el-form-item label="关键词">
                    <el-input
                        v-model="searchForm.keyword"
                        placeholder="搜索标题或内容"
                        clearable
                        style="width: 200px" />
                </el-form-item>
                <el-form-item label="消息类型">
                    <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 140px">
                        <el-option label="全部" value="" />
                        <el-option
                            v-for="item in notificationStore.typeConfigs"
                            :key="item.type"
                            :label="item.label"
                            :value="item.type" />
                    </el-select>
                </el-form-item>
                <el-form-item label="状态">
                    <el-select v-model="searchForm.is_read" placeholder="全部" clearable style="width: 120px">
                        <el-option label="全部" value="" />
                        <el-option label="已读" value="true" />
                        <el-option label="未读" value="false" />
                    </el-select>
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
        </el-card>

        <el-card class="list-card">
            <div class="batch-actions" v-if="selectedIds.length > 0">
                <span>已选择 {{ selectedIds.length }} 项</span>
                <el-button type="danger" size="small" @click="handleBatchDelete">批量删除</el-button>
            </div>

            <el-table
                v-loading="notificationStore.loading"
                :data="notificationStore.filteredNotifications"
                style="width: 100%"
                height="86%"
                @selection-change="handleSelectionChange"
                @row-click="handleViewDetail">
                <el-table-column type="selection" width="50" />
                <el-table-column label="类型" width="100">
                    <template #default="{ row }">
                        <el-tag :color="getTypeColor(row.type)" effect="dark" size="small">
                            {{ getTypeLabel(row.type) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="标题" min-width="200">
                    <template #default="{ row }">
                        <span class="notification-title" :class="{ unread: !row.is_read }">{{ row.title }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="内容" min-width="250">
                    <template #default="{ row }">
                        <span class="notification-content">{{ row.content }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="时间" width="120">
                    <template #default="{ row }">
                        <span class="notification-time">{{ formatTime(row.created_at) }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="80">
                    <template #default="{ row }">
                        <el-tag v-if="row.is_read" type="info" size="small">已读</el-tag>
                        <el-tag v-else type="danger" size="small">未读</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="100" fixed="right">
                    <template #default="{ row }">
                        <el-button type="primary" link size="small" @click.stop="handleViewDetail(row)">查看</el-button>
                    </template>
                </el-table-column>
            </el-table>

            <div class="pagination-wrapper">
                <el-pagination
                    v-model:current-page="queryParams.page_num"
                    v-model:page-size="queryParams.page_size"
                    :page-sizes="[10, 20, 50, 100]"
                    :total="notificationStore.total"
                    layout="total, sizes, prev, pager, next, jumper"
                    @current-change="handleCurrentChange"
                    @size-change="handleSizeChange" />
            </div>
        </el-card>

        <NotificationDetail
            v-model="detailVisible"
            :notification="currentNotification"
            :has-previous="hasPrevious"
            :has-next="hasNext"
            @close="handleCloseDetail"
            @delete="handleDelete"
            @prev="handlePrev"
            @next="handleNext" />
    </div>
</template>

<style scoped lang="scss">
.notification-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: calc(100vh - 120px);
    overflow: hidden;

    :deep(.el-card) {
        overflow: visible;

        .el-card__body {
            overflow: visible;
        }
    }
}

.page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.page-title {
    font-size: 16px;
    font-weight: 600;
}

.search-card {
    flex-shrink: 0;

    :deep(.el-card__body) {
        padding-bottom: 0;
    }
}

.list-card {
    flex: 1;
    overflow: hidden;
    min-height: 0;

    :deep(.el-card__body) {
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
}

.batch-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background-color: var(--el-fill-color-light);
    border-radius: 4px;
}

.notification-title {
    &.unread {
        font-weight: 600;
    }
}

.notification-content {
    color: var(--el-text-color-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.notification-time {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    padding-top: 12px;
}
</style>
