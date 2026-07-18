<script setup lang="ts">
import { ref, watch } from "vue";

import { useNotificationStore } from "@/plugin/store/modules/use-notification-store.ts";

defineOptions({
    name: "NotificationList"
});

interface Props {
    data: Notification[];
    loading: boolean;
    total: number;
    pageSize: number;
    currentPage: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    "selection-change": [ids: string[]];
    "view-detail": [notification: Notification];
    "page-change": [page: number];
    "size-change": [size: number];
}>();

const notificationStore = useNotificationStore();
const localPageSize = ref(props.pageSize);
const localCurrentPage = ref(props.currentPage);

watch(
    () => props.pageSize,
    val => {
        localPageSize.value = val;
    }
);

watch(
    () => props.currentPage,
    val => {
        localCurrentPage.value = val;
    }
);

/** 处理选择变化 */
function handleSelectionChange(selection: Notification[]): void {
    const ids = selection.map(item => item.id);
    emit("selection-change", ids);
}

/** 查看详情 */
function handleViewDetail(row: Notification): void {
    emit("view-detail", row);
}

/** 分页变化 */
function handleCurrentChange(page: number): void {
    emit("page-change", page);
}

/** 每页条数变化 */
function handleSizeChange(size: number): void {
    emit("size-change", size);
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
</script>

<template>
    <div class="notification-list">
        <el-table
            v-loading="loading"
            :data="data"
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
                v-model:current-page="localCurrentPage"
                v-model:page-size="localPageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="total"
                layout="total, sizes, prev, pager, next, jumper"
                @current-change="handleCurrentChange"
                @size-change="handleSizeChange" />
        </div>
    </div>
</template>

<style scoped lang="scss">
.notification-list {
    display: flex;
    flex-direction: column;
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
