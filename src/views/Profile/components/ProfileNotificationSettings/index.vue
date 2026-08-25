<script setup lang="ts">
import { ref } from "vue";

import { NotificationApi } from "@/api/notification/notification-api";
import { MessageUtils } from "@/utils/message-utils";

defineOptions({
    name: "ProfileNotificationSettings"
});

type NotificationPreferenceChannel = "IN_APP" | "SMS" | "EMAIL";

interface NotificationPreferenceRow {
    purpose: NotificationPurpose;
    channel: NotificationPreferenceChannel;
    enabled: boolean;
    doNotDisturb: boolean;
}

const purposeOptions: Array<{ value: NotificationPurpose; label: string; description: string }> = [
    { value: "SYSTEM_NOTICE", label: "系统通知", description: "系统公告、配置变更和运维通知" },
    { value: "WORKFLOW_TODO", label: "流程待办", description: "流程任务待处理提醒" },
    { value: "WORKFLOW_RESULT", label: "流程结果", description: "流程任务处理结果通知" },
    { value: "OA_NOTICE", label: "OA 公告", description: "OA 公告和业务消息" },
    { value: "OA_REMINDER", label: "OA 提醒", description: "会议、合同等业务提醒" },
    { value: "INNER_MESSAGE", label: "站内私信", description: "用户之间的站内消息" }
];

const channelOptions: Array<{ value: NotificationPreferenceChannel; label: string }> = [
    { value: "IN_APP", label: "站内信" },
    { value: "SMS", label: "短信" },
    { value: "EMAIL", label: "邮件" }
];

const preferenceLoading = ref(false);
const preferenceRows = ref<NotificationPreferenceRow[]>([]);
const savingPreferenceKeys = ref(new Set<string>());

function preferenceKey(row: Pick<NotificationPreferenceRow, "purpose" | "channel">): string {
    return `${row.purpose}:${row.channel}`;
}

function isPreferenceSaving(row: NotificationPreferenceRow): boolean {
    return savingPreferenceKeys.value.has(preferenceKey(row));
}

function setPreferenceSaving(row: NotificationPreferenceRow, saving: boolean): void {
    const keys = new Set(savingPreferenceKeys.value);
    const key = preferenceKey(row);
    if (saving) keys.add(key);
    else keys.delete(key);
    savingPreferenceKeys.value = keys;
}

function buildPreferenceRows(preferences: NotificationPreference[]): NotificationPreferenceRow[] {
    const preferenceMap = new Map(preferences.map(item => [`${item.purpose}:${item.channel}`, item]));
    return purposeOptions.flatMap(purpose =>
        channelOptions.map(channel => {
            const preference = preferenceMap.get(`${purpose.value}:${channel.value}`);
            return {
                purpose: purpose.value,
                channel: channel.value,
                enabled: preference?.enabled ?? channel.value === "IN_APP",
                doNotDisturb: preference?.do_not_disturb ?? false
            };
        })
    );
}

function rowsForPurpose(purpose: NotificationPurpose): NotificationPreferenceRow[] {
    return preferenceRows.value.filter(row => row.purpose === purpose);
}

function channelLabel(channel: NotificationPreferenceChannel): string {
    return channelOptions.find(item => item.value === channel)?.label ?? channel;
}

function purposeLabel(purpose: NotificationPurpose): string {
    return purposeOptions.find(item => item.value === purpose)?.label ?? purpose;
}

async function loadNotificationPreferences(): Promise<void> {
    preferenceLoading.value = true;
    try {
        const preferences = await NotificationApi.preferences({ loading: false });
        preferenceRows.value = buildPreferenceRows(preferences);
    } catch (error: unknown) {
        MessageUtils.error(error instanceof Error ? error.message : "通知偏好加载失败");
    } finally {
        preferenceLoading.value = false;
    }
}

async function handlePreferenceChange(row: NotificationPreferenceRow): Promise<void> {
    setPreferenceSaving(row, true);
    try {
        await NotificationApi.savePreference(
            {
                purpose: row.purpose,
                channel: row.channel,
                enabled: row.enabled,
                doNotDisturb: row.doNotDisturb
            },
            { loading: false }
        );
        MessageUtils.success(`${purposeLabel(row.purpose)}·${channelLabel(row.channel)}偏好已保存`);
    } catch (error: unknown) {
        await loadNotificationPreferences();
        MessageUtils.error(error instanceof Error ? error.message : "通知偏好保存失败");
    } finally {
        setPreferenceSaving(row, false);
    }
}

loadNotificationPreferences();
</script>

<template>
    <div class="notification-settings">
        <el-alert
            title="调整开关后会立即保存"
            description="普通通知默认使用站内信；短信和邮件需要先启用对应渠道。免打扰设置只对已启用的渠道生效。"
            type="info"
            :closable="false"
            show-icon />

        <div v-loading="preferenceLoading" class="preference-list">
            <div v-for="purpose in purposeOptions" :key="purpose.value" class="preference-group">
                <div class="preference-group__header">
                    <div>
                        <h4>{{ purpose.label }}</h4>
                        <p>{{ purpose.description }}</p>
                    </div>
                </div>
                <div v-for="row in rowsForPurpose(purpose.value)" :key="preferenceKey(row)" class="preference-row">
                    <span class="preference-channel">{{ channelLabel(row.channel) }}</span>
                    <div class="preference-controls">
                        <span>接收</span>
                        <el-switch
                            v-model="row.enabled"
                            :loading="isPreferenceSaving(row)"
                            @change="void handlePreferenceChange(row)" />
                        <span>免打扰</span>
                        <el-switch
                            v-model="row.doNotDisturb"
                            :disabled="!row.enabled"
                            :loading="isPreferenceSaving(row)"
                            @change="void handlePreferenceChange(row)" />
                    </div>
                </div>
            </div>
        </div>

        <div class="notification-settings__tip">
            登录验证码、密码重置和安全告警等安全通知由系统强制管理，不受个人偏好影响。
        </div>
    </div>
</template>

<style scoped lang="scss">
.notification-settings {
    padding: 8px 0;
}

.preference-list {
    margin-top: 16px;
}

.preference-group {
    padding: 14px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);

    &:first-child {
        padding-top: 20px;
    }

    &:last-child {
        border-bottom: none;
    }
}

.preference-group__header {
    margin-bottom: 8px;

    h4 {
        margin: 0 0 4px;
        font-size: 14px;
        font-weight: 600;
        color: var(--el-text-color-primary);
    }

    p {
        margin: 0;
        color: var(--el-text-color-secondary);
        font-size: 12px;
    }
}

.preference-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 38px;
    padding: 4px 12px;
    border-radius: 4px;

    &:hover {
        background: var(--el-fill-color-light);
    }
}

.preference-channel {
    color: var(--el-text-color-regular);
    font-size: 13px;
}

.preference-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.notification-settings__tip {
    margin-top: 16px;
    padding: 10px 12px;
    border-radius: 4px;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 1.6;
}
</style>
