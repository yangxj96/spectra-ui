<script setup lang="ts">
import { Close, Link, Delete, ArrowLeft, ArrowRight, User, Bell } from "@element-plus/icons-vue";
import { computed } from "vue";
import { useRouter } from "vue-router";

import { useNotificationStore } from "@/plugin/store/modules/use-notification-store.ts";

defineOptions({
    name: "NotificationDetail"
});

interface Props {
    modelValue: boolean;
    notification: Notification | null;
    hasPrevious?: boolean;
    hasNext?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    hasPrevious: false,
    hasNext: false
});

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
    close: [];
    delete: [id: string];
    prev: [];
    next: [];
}>();

const router = useRouter();
const notificationStore = useNotificationStore();

/** 抽屉显示状态 */
const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => {
        emit("update:modelValue", value);
    }
});

/** 格式化时间 */
function formatTime(time: string): string {
    const date = new Date(time);
    return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

/** 获取类型标签 */
function getTypeLabel(type: NotificationType): string {
    return notificationStore.getTypeLabel(type);
}

/** 获取类型颜色 */
function getTypeColor(type: NotificationType): string {
    return notificationStore.getTypeColor(type);
}

/** 跳转链接 */
function handleGoToLink(): void {
    if (props.notification?.link) {
        router.push(props.notification.link);
        handleClose();
    }
}

/** 删除消息 */
function handleDelete(): void {
    if (props.notification) {
        emit("delete", props.notification.id);
    }
}

/** 上一条 */
function handlePrev(): void {
    emit("prev");
}

/** 下一条 */
function handleNext(): void {
    emit("next");
}

/** 关闭弹窗 */
function handleClose(): void {
    emit("update:modelValue", false);
    emit("close");
}
</script>

<template>
    <el-drawer v-model="visible" direction="rtl" size="480px" :show-close="false" @close="handleClose">
        <template #header>
            <div class="drawer-header">
                <span class="drawer-title">消息详情</span>
                <el-button type="primary" link @click="handleClose">
                    <el-icon><Close /></el-icon>
                </el-button>
            </div>
        </template>

        <div v-if="notification" class="notification-detail">
            <!-- 状态栏 -->
            <div class="detail-status">
                <el-tag :color="getTypeColor(notification.type)" effect="dark" size="small" class="type-tag">
                    {{ getTypeLabel(notification.type) }}
                </el-tag>
                <el-tag :type="notification.is_read ? 'info' : 'danger'" size="small" effect="plain">
                    {{ notification.is_read ? "已读" : "未读" }}
                </el-tag>
            </div>

            <!-- 标题 -->
            <h3 class="detail-title">{{ notification.title }}</h3>

            <!-- 元信息卡片 -->
            <div class="meta-card">
                <div class="meta-item">
                    <div class="meta-avatar">
                        <el-icon :size="18"><User /></el-icon>
                    </div>
                    <div class="meta-info">
                        <span class="meta-label">发送者</span>
                        <span class="meta-value">{{ notification.sender_name || "系统" }}</span>
                    </div>
                </div>
                <div class="meta-item">
                    <div class="meta-avatar">
                        <el-icon :size="18"><Bell /></el-icon>
                    </div>
                    <div class="meta-info">
                        <span class="meta-label">时间</span>
                        <span class="meta-value">{{ formatTime(notification.created_at) }}</span>
                    </div>
                </div>
            </div>

            <!-- 内容区域 -->
            <div class="content-card">
                <div class="content-label">内容</div>
                <div class="content-text">{{ notification.content }}</div>
            </div>

            <!-- 操作按钮 -->
            <div class="action-buttons">
                <el-button v-if="notification.link" type="primary" @click="handleGoToLink">
                    <el-icon><Link /></el-icon>
                    查看相关页面
                </el-button>
                <el-button type="danger" plain @click="handleDelete">
                    <el-icon><Delete /></el-icon>
                    删除
                </el-button>
            </div>
        </div>

        <!-- 底部导航 -->
        <template #footer>
            <div class="drawer-footer">
                <el-button :disabled="!hasPrevious" @click="handlePrev">
                    <el-icon><ArrowLeft /></el-icon>
                    上一条
                </el-button>
                <el-button :disabled="!hasNext" @click="handleNext">
                    下一条
                    <el-icon><ArrowRight /></el-icon>
                </el-button>
            </div>
        </template>
    </el-drawer>
</template>

<style scoped lang="scss">
.drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.drawer-title {
    font-size: 16px;
    font-weight: 600;
}

.notification-detail {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.detail-status {
    display: flex;
    align-items: center;
    gap: 8px;
}

.type-tag {
    font-size: 12px;
}

.detail-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--el-text-color-primary);
}

.meta-card {
    background-color: var(--el-fill-color-lighter);
    border-radius: 8px;
    padding: 16px;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 12px;

    &:not(:last-child) {
        margin-bottom: 12px;
    }
}

.meta-avatar {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--el-fill-color);
    border-radius: 8px;
    color: var(--el-text-color-secondary);
}

.meta-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.meta-label {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
}

.meta-value {
    font-size: 14px;
    color: var(--el-text-color-primary);
}

.content-card {
    background-color: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 16px;
}

.content-label {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    margin-bottom: 8px;
}

.content-text {
    font-size: 14px;
    line-height: 1.8;
    color: var(--el-text-color-primary);
    white-space: pre-wrap;
}

.action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 8px;

    :deep(.el-button) {
        .el-icon {
            margin-right: 4px;
        }
    }
}

.drawer-footer {
    display: flex;
    justify-content: space-between;
    width: 100%;
}
</style>
