<script setup lang="ts">
import { User } from "@element-plus/icons-vue";
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";

import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import { useNotificationStore } from "@/plugin/store/modules/use-notification-store.ts";
import NotificationDetail from "@/views/Notification/components/NotificationDetail/index.vue";

defineOptions({
    name: "NotificationDrawer"
});

interface Props {
    modelValue: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
    close: [];
}>();

const router = useRouter();
const notificationStore = useNotificationStore();
const activeTab = ref<string>("all");
const detailVisible = ref(false);
const currentNotification = ref<Notification | null>(null);
const deleteLoading = ref(false);

/** 按通知用途生成筛选 Tab */
const tabs = computed(() => [
    { label: "全部", value: "all" },
    ...notificationStore.purposeConfigs.map(({ purpose, label }) => ({ label, value: purpose }))
]);

/** 当前详情消息在筛选列表中的位置 */
const currentDetailIndex = computed(() => {
    if (!currentNotification.value) return -1;
    return notificationStore.filteredNotifications.findIndex(item => item.id === currentNotification.value?.id);
});

/** 是否存在上一条消息 */
const hasPrevious = computed(() => currentDetailIndex.value > 0);

/** 是否存在下一条消息 */
const hasNext = computed(() => currentDetailIndex.value < notificationStore.filteredNotifications.length - 1);

/** 抽屉显示状态 */
const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => {
        emit("update:modelValue", value);
    }
});

/** 监听抽屉打开，加载数据 */
watch(
    () => props.modelValue,
    (isOpen: boolean) => {
        if (isOpen) {
            loadNotifications();
        }
    }
);

/** 加载消息列表 */
async function loadNotifications(): Promise<void> {
    await notificationStore.fetchNotifications({ page_num: 1, page_size: 20 });
}

/** 切换Tab */
function handleTabChange(tab: string): void {
    activeTab.value = tab;
    notificationStore.setCurrentPurpose(tab as NotificationPurpose | "all");
}

/** 点击消息项 */
function handleNotificationClick(notification: Notification): void {
    currentNotification.value = notification;
    detailVisible.value = true;
    markAsRead(notification);
    handleClose();
}

/** 标记消息已读 */
function markAsRead(notification: Notification): void {
    if (!notification.is_read) {
        void notificationStore.markAsRead(notification.id);
    }
}

/** 全部标记已读 */
async function handleMarkAllAsRead(): Promise<void> {
    await notificationStore.markAllAsRead();
}

/** 关闭抽屉 */
function handleClose(): void {
    emit("update:modelValue", false);
    emit("close");
}

/** 跳转到消息中心页面 */
function goToNotificationPage(): void {
    router.push("/notification");
    handleClose();
}

/** 关闭消息详情 */
function handleDetailClose(): void {
    detailVisible.value = false;
    currentNotification.value = null;
}

/** 删除消息 */
async function handleDelete(id: string): Promise<void> {
    const deletedIndex = currentDetailIndex.value;
    deleteLoading.value = true;
    try {
        await notificationStore.deleteNotification(id, { loading: false });

        // Store 在请求失败时会保留原消息，失败时继续停留在当前详情，避免误切换。
        if (notificationStore.notifications.some(notification => notification.id === id)) {
            return;
        }

        const remainingNotifications = notificationStore.filteredNotifications;
        const nextNotification = remainingNotifications[deletedIndex] ?? remainingNotifications[deletedIndex - 1];
        if (nextNotification) {
            currentNotification.value = nextNotification;
            markAsRead(nextNotification);
            return;
        }

        // 当前筛选下已没有消息，回到通知列表抽屉，便于继续浏览其他类型的通知。
        handleDetailClose();
        emit("update:modelValue", true);
    } finally {
        deleteLoading.value = false;
    }
}

/** 查看上一条消息 */
function handlePrev(): void {
    if (!hasPrevious.value) return;
    const notification = notificationStore.filteredNotifications[currentDetailIndex.value - 1];
    if (notification) {
        currentNotification.value = notification;
        markAsRead(notification);
    }
}

/** 查看下一条消息 */
function handleNext(): void {
    if (!hasNext.value) return;
    const notification = notificationStore.filteredNotifications[currentDetailIndex.value + 1];
    if (notification) {
        currentNotification.value = notification;
        markAsRead(notification);
    }
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

/** 获取用途图标 */
function getPurposeIcon(purpose: NotificationPurpose): string {
    return notificationStore.getPurposeIcon(purpose);
}

/** 获取用途颜色 */
function getPurposeColor(purpose: NotificationPurpose): string {
    return notificationStore.getPurposeColor(purpose);
}

/** 获取用途名称 */
function getPurposeName(purpose: NotificationPurpose): string {
    return notificationStore.getPurposeLabel(purpose);
}

onMounted(() => {
    if (props.modelValue) {
        loadNotifications();
    }
});
</script>

<template>
    <el-drawer v-model="visible" direction="rtl" size="400px" :show-close="false" @close="handleClose">
        <template #header>
            <div class="header-left">
                <span class="drawer-title">消息通知</span>
                <el-badge
                    v-if="notificationStore.unreadCount > 0"
                    :value="notificationStore.unreadCount"
                    :max="99"
                    class="unread-badge" />
            </div>
            <el-button type="primary" link @click="handleMarkAllAsRead">全部已读</el-button>
        </template>

        <div class="drawer-content">
            <div class="filter-bar">
                <span class="filter-label">通知类型</span>
                <el-select
                    v-model="activeTab"
                    class="type-select"
                    size="small"
                    aria-label="通知类型"
                    @change="handleTabChange">
                    <el-option v-for="tab in tabs" :key="tab.value" :label="tab.label" :value="tab.value" />
                </el-select>
            </div>

            <div class="notification-list" v-loading="notificationStore.loading">
                <el-empty v-if="notificationStore.filteredNotifications.length === 0" description="暂无消息" />

                <div
                    v-for="item in notificationStore.filteredNotifications"
                    :key="item.id"
                    class="notification-item"
                    :class="{ unread: !item.is_read }"
                    @click="handleNotificationClick(item)">
                    <div class="item-icon" :style="{ backgroundColor: getPurposeColor(item.purpose) + '15' }">
                        <ComponentsIcons :name="getPurposeIcon(item.purpose)" class-name="icon-sidebar" />
                    </div>
                    <div class="item-content">
                        <div class="item-header">
                            <div class="item-title-row">
                                <el-tag
                                    :color="getPurposeColor(item.purpose)"
                                    effect="dark"
                                    size="small"
                                    class="type-tag">
                                    {{ getPurposeName(item.purpose) }}
                                </el-tag>
                                <span class="item-title">{{ item.title }}</span>
                            </div>
                            <span class="item-time">{{ formatTime(item.created_at) }}</span>
                        </div>
                        <div class="item-desc">{{ item.content }}</div>
                        <div v-if="item.sender_name" class="item-sender">
                            <el-icon :size="12"><User /></el-icon>
                            {{ item.sender_name }}
                        </div>
                    </div>
                    <div v-if="!item.is_read" class="item-dot" />
                </div>
            </div>
        </div>

        <template #footer>
            <div class="drawer-footer">
                <el-button type="primary" link @click="goToNotificationPage">查看全部消息 →</el-button>
            </div>
        </template>
    </el-drawer>

    <NotificationDetail
        v-model="detailVisible"
        :notification="currentNotification"
        :has-previous="hasPrevious"
        :has-next="hasNext"
        :delete-loading="deleteLoading"
        @close="handleDetailClose"
        @delete="handleDelete"
        @prev="handlePrev"
        @next="handleNext" />
</template>

<style scoped lang="scss">
.header-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.drawer-title {
    font-size: 16px;
    font-weight: 600;
}

.unread-badge {
    :deep(.el-badge__content) {
        font-size: 12px;
    }
}

.drawer-content {
    height: 100%;
    display: flex;
    flex-direction: column;
}

:deep(.el-drawer__body) {
    padding: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.filter-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.filter-label {
    flex-shrink: 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
}

.type-select {
    flex: 1;
    min-width: 0;
}

.notification-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    max-height: calc(100vh - 200px);

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background-color: var(--el-border-color);
        border-radius: 3px;

        &:hover {
            background-color: var(--el-border-color-dark);
        }
    }
}

.notification-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    cursor: pointer;
    transition: background-color 0.3s;

    &:hover {
        background-color: var(--el-fill-color-light);
    }

    &.unread {
        background-color: rgba(64, 158, 255, 0.04);
    }
}

.item-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    color: var(--el-text-color-primary);
}

.item-content {
    flex: 1;
    min-width: 0;
}

.item-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
}

.item-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
}

.type-tag {
    flex-shrink: 0;
    font-size: 11px;
    padding: 0 6px;
    height: 18px;
    line-height: 18px;
}

.item-title {
    font-size: 14px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.item-time {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
}

.item-desc {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    margin-top: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.item-sender {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    margin-top: 6px;
}

.item-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    background-color: var(--el-color-danger);
    border-radius: 50%;
    margin-top: 8px;
}

.drawer-footer {
    display: flex;
    justify-content: center;
    padding-top: 12px;
    border-top: 1px solid var(--el-border-color-lighter);
}
</style>

<style lang="scss">
.el-drawer__header {
    margin-bottom: 0 !important;
}
</style>
