<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";

import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import { useNotificationStore } from "@/plugin/store/modules/use-notification-store.ts";

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

/** Tab配置 */
const tabs = [
    { label: "全部", value: "all" },
    { label: "系统", value: "system" },
    { label: "工作流", value: "workflow" },
    { label: "OA", value: "oa" },
    { label: "站内信", value: "inner_mail" },
    { label: "待审批", value: "approval" }
];

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
    notificationStore.setCurrentType(tab as NotificationType | "all");
}

/** 点击消息项 */
function handleNotificationClick(notification: Notification): void {
    notificationStore.markAsRead(notification.id);
    if (notification.link) {
        router.push(notification.link);
        handleClose();
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

/** 获取类型图标 */
function getTypeIcon(type: string): string {
    const iconMap: Record<string, string> = {
        system: "icon-notification",
        workflow: "icon-workflow",
        oa: "icon-office",
        inner_mail: "icon-mail",
        approval: "icon-approval"
    };
    return iconMap[type] || "icon-notification";
}

/** 获取类型颜色 */
function getTypeColor(type: string): string {
    const colorMap: Record<string, string> = {
        system: "#409eff",
        workflow: "#e6a23c",
        oa: "#67c23a",
        inner_mail: "#909399",
        approval: "#f56c6c"
    };
    return colorMap[type] || "#909399";
}

/** 获取类型名称 */
function getTypeName(type: string): string {
    const nameMap: Record<string, string> = {
        system: "系统",
        workflow: "工作流",
        oa: "OA",
        inner_mail: "站内信",
        approval: "待审批"
    };
    return nameMap[type] || type;
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
            <div class="tab-bar">
                <div
                    v-for="tab in tabs"
                    :key="tab.value"
                    class="tab-item"
                    :class="{ active: activeTab === tab.value }"
                    @click="handleTabChange(tab.value)">
                    {{ tab.label }}
                </div>
            </div>

            <div class="notification-list" v-loading="notificationStore.loading">
                <el-empty v-if="notificationStore.filteredNotifications.length === 0" description="暂无消息" />

                <div
                    v-for="item in notificationStore.filteredNotifications"
                    :key="item.id"
                    class="notification-item"
                    :class="{ unread: !item.is_read }"
                    @click="handleNotificationClick(item)">
                    <div class="item-icon" :style="{ backgroundColor: getTypeColor(item.type) + '15' }">
                        <ComponentsIcons :name="getTypeIcon(item.type)" class-name="icon-sidebar" />
                    </div>
                    <div class="item-content">
                        <div class="item-header">
                            <div class="item-title-row">
                                <el-tag :color="getTypeColor(item.type)" effect="dark" size="small" class="type-tag">
                                    {{ getTypeName(item.type) }}
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

.tab-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.tab-item {
    padding: 6px 12px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    background-color: var(--el-fill-color-light);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
        color: var(--el-color-primary);
        background-color: var(--el-color-primary-light-9);
    }

    &.active {
        color: #fff;
        background-color: var(--el-color-primary);
    }
}

.notification-list {
    flex: 1;
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
