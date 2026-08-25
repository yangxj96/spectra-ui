<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import { NotificationTemplateApi } from "@/api/notification/notification-template-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import useTable from "@/hooks/use-table.ts";

const router = useRouter();

const channelOptions: Array<{ label: string; value: NotificationTemplateChannel }> = [
    { label: "站内信", value: "IN_APP" },
    { label: "短信", value: "SMS" },
    { label: "邮件", value: "EMAIL" }
];

const purposeOptions = [
    { label: "登录验证码", value: "LOGIN_CODE" },
    { label: "绑定手机验证码", value: "BIND_PHONE_CODE" },
    { label: "绑定邮箱验证码", value: "BIND_EMAIL_CODE" },
    { label: "重置密码验证码", value: "RESET_PASSWORD_CODE" },
    { label: "安全告警", value: "SECURITY_ALERT" },
    { label: "系统通知", value: "SYSTEM_NOTICE" },
    { label: "流程待办", value: "WORKFLOW_TODO" },
    { label: "流程结果", value: "WORKFLOW_RESULT" },
    { label: "OA 通知", value: "OA_NOTICE" },
    { label: "OA 提醒", value: "OA_REMINDER" },
    { label: "内部消息", value: "INNER_MESSAGE" }
];

const stateOptions: Array<{ label: string; value: NotificationTemplateState }> = [
    { label: "草稿", value: "DRAFT" },
    { label: "已发布 · 启用", value: "PUBLISHED" },
    { label: "已发布 · 禁用", value: "DISABLED" },
    { label: "已归档", value: "ARCHIVED" }
];

const condition = ref<NotificationTemplatePageParams>({
    page_num: 1,
    page_size: 15
});

const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable(
    NotificationTemplateApi.groupPage,
    condition.value
);

const versionVisible = ref(false);
const versionLoading = ref(false);
const versionData = ref<NotificationTemplateVO[]>([]);
const versionTemplateName = ref("");
const compareVisible = ref(false);
const compareFromId = ref("");
const compareToId = ref("");

const compareFrom = computed(() => versionData.value.find(item => item.id === compareFromId.value));
const compareTo = computed(() => versionData.value.find(item => item.id === compareToId.value));

function stateLabel(state: NotificationTemplateState): string {
    return stateOptions.find(item => item.value === state)?.label ?? state;
}

function stateTagType(state: NotificationTemplateState): "success" | "warning" | "danger" | "info" {
    if (state === "PUBLISHED") return "success";
    if (state === "DISABLED") return "danger";
    if (state === "DRAFT") return "warning";
    return "info";
}

function channelLabel(channel: NotificationTemplateChannel): string {
    return channelOptions.find(item => item.value === channel)?.label ?? channel;
}

function purposeLabel(purpose: string): string {
    return purposeOptions.find(item => item.value === purpose)?.label ?? purpose;
}

function digestLabel(digest: string | null | undefined): string {
    return digest ? `${digest.slice(0, 12)}…` : "-";
}

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

function resetCondition(): void {
    Object.assign(condition.value, {
        template_group_code: undefined,
        channel: undefined,
        purpose: undefined,
        state: undefined,
        page_num: 1
    });
    void handlerConditionQuery();
}

function openCreate(): void {
    void router.push({ name: "DevopsNotificationTemplateEdit" });
}

function allowedChannels(purpose: string): NotificationTemplateChannel[] {
    if (purpose === "BIND_PHONE_CODE") return ["SMS"];
    if (purpose === "BIND_EMAIL_CODE") return ["EMAIL"];
    if (["LOGIN_CODE", "RESET_PASSWORD_CODE"].includes(purpose)) return ["SMS", "EMAIL"];
    return ["IN_APP", "SMS", "EMAIL"];
}

function channelRows(group: NotificationTemplateGroupVO): NotificationTemplateChannelGroupVO[] {
    return [...group.channels].sort(
        (left, right) =>
            channelOptions.findIndex(item => item.value === left.channel) -
            channelOptions.findIndex(item => item.value === right.channel)
    );
}

function editTarget(row: NotificationTemplateChannelGroupVO): NotificationTemplateVO | undefined {
    return row.draft ?? row.current ?? undefined;
}

function openEdit(row: NotificationTemplateChannelGroupVO): void {
    const target = editTarget(row);
    if (target) void router.push({ name: "DevopsNotificationTemplateEdit", query: { id: target.id } });
}

function openAddChannel(group: NotificationTemplateGroupVO): void {
    const existingChannels = new Set(group.channels.map(item => item.channel));
    const targetChannel = allowedChannels(group.purpose).find(channel => !existingChannels.has(channel));
    if (!targetChannel) {
        ElMessage.info("当前模板已配置所有适用渠道");
        return;
    }
    const source = group.channels.map(editTarget).find((item): item is NotificationTemplateVO => Boolean(item));
    void router.push({
        name: "DevopsNotificationTemplateEdit",
        query: {
            source_id: source?.id,
            template_group_code: group.template_group_code,
            template_name: group.template_name,
            purpose: group.purpose,
            channel: targetChannel
        }
    });
}

async function confirmAction(
    row: NotificationTemplateVO,
    message: string,
    action: (id: string, version: number) => Promise<void>,
    successMessage: string
): Promise<void> {
    try {
        await ElMessageBox.confirm(message, "确认操作", {
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            type: "warning"
        });
        await action(row.id, row.version);
        ElMessage.success(successMessage);
        await handlerConditionQuery();
    } catch (error: unknown) {
        if (error !== "cancel") ElMessage.error(errorMessage(error, "操作失败，可能是版本已变化"));
    }
}

function disable(row: NotificationTemplateVO): Promise<void> {
    return confirmAction(
        row,
        `确定禁用${channelLabel(row.channel)}渠道的模板「${row.template_name}」吗？禁用后可以重新启用。`,
        NotificationTemplateApi.disable,
        "模板渠道已禁用"
    );
}

function enable(row: NotificationTemplateVO): Promise<void> {
    return confirmAction(
        row,
        `确定重新启用${channelLabel(row.channel)}渠道的模板「${row.template_name}」吗？`,
        NotificationTemplateApi.enable,
        "模板渠道已启用"
    );
}

function archive(row: NotificationTemplateVO): Promise<void> {
    return confirmAction(
        row,
        `确定归档${channelLabel(row.channel)}渠道的版本 v${row.version_no} 吗？归档后只能在版本历史中查看。`,
        NotificationTemplateApi.archive,
        "模板版本已归档"
    );
}

async function openVersions(
    row: NotificationTemplateChannelGroupVO,
    group: NotificationTemplateGroupVO
): Promise<void> {
    const target = editTarget(row);
    if (!target) return;
    versionVisible.value = true;
    versionLoading.value = true;
    versionTemplateName.value = `${group.template_name}（${group.template_group_code}） / ${channelLabel(row.channel)}`;
    try {
        versionData.value = await NotificationTemplateApi.versions(target.id);
        compareFromId.value = versionData.value[1]?.id ?? "";
        compareToId.value = versionData.value[0]?.id ?? "";
    } catch (error: unknown) {
        ElMessage.error(errorMessage(error, "加载版本历史失败"));
        versionData.value = [];
    } finally {
        versionLoading.value = false;
    }
}

function openCompare(): void {
    if (compareFrom.value && compareTo.value) compareVisible.value = true;
}
</script>

<template>
    <div class="notification-template-page">
        <el-row class="box__search">
            <el-form :inline="true" :model="condition">
                <el-form-item label="模板组编码">
                    <el-input v-model="condition.template_group_code" clearable placeholder="请输入模板组编码" />
                </el-form-item>
                <el-form-item label="渠道">
                    <el-select v-model="condition.channel" clearable placeholder="请选择渠道" style="width: 130px">
                        <el-option
                            v-for="item in channelOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value" />
                    </el-select>
                </el-form-item>
                <el-form-item label="用途">
                    <el-select
                        v-model="condition.purpose"
                        clearable
                        filterable
                        placeholder="请选择用途"
                        style="width: 170px">
                        <el-option
                            v-for="item in purposeOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value" />
                    </el-select>
                </el-form-item>
                <el-form-item label="状态">
                    <el-select v-model="condition.state" clearable placeholder="请选择状态" style="width: 150px">
                        <el-option
                            v-for="item in stateOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="void handlerConditionQuery()">查询</el-button>
                    <el-button @click="resetCondition">重置</el-button>
                    <el-button v-permission="'notification:template:write'" @click="openCreate">
                        <ComponentsIcons name="icon-add" style="width: 1.1em; height: 1.1em" />
                        &nbsp; 新增模板
                    </el-button>
                </el-form-item>
            </el-form>
        </el-row>

        <el-row class="box__body">
            <el-table :data="table_data" height="92%" stripe>
                <el-table-column align="center" type="index" label="序号" width="70" />
                <el-table-column
                    align="center"
                    prop="template_group_code"
                    label="模板组编码"
                    min-width="170"
                    show-overflow-tooltip />
                <el-table-column prop="template_name" label="模板名称" min-width="160" show-overflow-tooltip />
                <el-table-column align="center" label="用途" min-width="130" show-overflow-tooltip>
                    <template #default="scope">{{ purposeLabel(scope.row.purpose) }}</template>
                </el-table-column>
                <el-table-column label="渠道版本" min-width="500">
                    <template #default="scope">
                        <div class="channel-list">
                            <div v-for="channel in channelRows(scope.row)" :key="channel.channel" class="channel-row">
                                <div class="channel-row__summary">
                                    <el-tag size="small" effect="plain">{{ channelLabel(channel.channel) }}</el-tag>
                                    <template v-if="channel.current">
                                        <el-tag :type="stateTagType(channel.current.state)" size="small">
                                            {{ stateLabel(channel.current.state) }}
                                        </el-tag>
                                        <span class="channel-version">v{{ channel.current.version_no }}</span>
                                    </template>
                                    <el-tag v-if="channel.draft" type="warning" size="small">
                                        草稿 v{{ channel.draft.version_no }}
                                    </el-tag>
                                    <span v-if="!channel.current && !channel.draft" class="channel-empty">
                                        暂无版本
                                    </span>
                                </div>
                                <div class="channel-row__actions">
                                    <el-tooltip v-if="editTarget(channel)" content="编辑渠道模板" placement="top">
                                        <el-button
                                            v-permission="'notification:template:write'"
                                            link
                                            type="primary"
                                            @click="openEdit(channel)">
                                            <ComponentsIcons name="icon-edit" style="width: 1.3em; height: 1.3em" />
                                        </el-button>
                                    </el-tooltip>
                                    <el-tooltip v-if="editTarget(channel)" content="版本历史" placement="top">
                                        <el-button
                                            v-permission="'notification:template:read'"
                                            link
                                            type="primary"
                                            @click="void openVersions(channel, scope.row)">
                                            <ComponentsIcons name="icon-code" style="width: 1.3em; height: 1.3em" />
                                        </el-button>
                                    </el-tooltip>
                                    <el-tooltip
                                        v-if="channel.current?.state === 'PUBLISHED'"
                                        content="禁用渠道"
                                        placement="top">
                                        <el-button
                                            v-permission="'notification:template:write'"
                                            link
                                            type="warning"
                                            @click="void disable(channel.current)">
                                            <ComponentsIcons name="icon-disable" style="width: 1.3em; height: 1.3em" />
                                        </el-button>
                                    </el-tooltip>
                                    <el-tooltip
                                        v-if="channel.current?.state === 'DISABLED'"
                                        content="启用渠道"
                                        placement="top">
                                        <el-button
                                            v-permission="'notification:template:write'"
                                            link
                                            type="success"
                                            @click="void enable(channel.current)">
                                            <ComponentsIcons name="icon-enable" style="width: 1.3em; height: 1.3em" />
                                        </el-button>
                                    </el-tooltip>
                                    <el-tooltip v-if="channel.draft" content="归档草稿" placement="top">
                                        <el-button
                                            v-permission="'notification:template:write'"
                                            link
                                            type="danger"
                                            @click="void archive(channel.draft)">
                                            <ComponentsIcons
                                                name="icon-file-config"
                                                style="width: 1.3em; height: 1.3em" />
                                        </el-button>
                                    </el-tooltip>
                                    <el-tooltip
                                        v-if="channel.current?.state === 'DISABLED'"
                                        content="归档已禁用版本"
                                        placement="top">
                                        <el-button
                                            v-permission="'notification:template:write'"
                                            link
                                            type="danger"
                                            @click="void archive(channel.current)">
                                            <ComponentsIcons
                                                name="icon-file-config"
                                                style="width: 1.3em; height: 1.3em" />
                                        </el-button>
                                    </el-tooltip>
                                </div>
                            </div>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column align="center" label="更新时间" prop="updated_at" width="170" show-overflow-tooltip />
                <el-table-column align="center" label="操作" width="120" fixed="right">
                    <template #default="scope">
                        <el-tooltip content="新增渠道" placement="top">
                            <el-button
                                v-permission="'notification:template:write'"
                                link
                                type="primary"
                                @click="openAddChannel(scope.row)">
                                <ComponentsIcons name="icon-add" style="width: 1.4em; height: 1.4em" />
                            </el-button>
                        </el-tooltip>
                    </template>
                </el-table-column>
            </el-table>
            <el-pagination
                layout="total, sizes, prev, pager, next"
                :current-page="pagination.page"
                :page-size="pagination.size"
                :page-sizes="pagination.page_sizes"
                :total="pagination.total"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange" />
        </el-row>

        <el-dialog v-model="versionVisible" :title="`版本历史 - ${versionTemplateName}`" width="900px" destroy-on-close>
            <div v-loading="versionLoading" class="version-container">
                <el-alert
                    title="版本摘要用于确认当前版本内容；历史版本仅供查看，不提供操作。"
                    type="info"
                    :closable="false"
                    show-icon />
                <div class="compare-toolbar">
                    <el-select v-model="compareFromId" placeholder="选择基准版本" style="width: 220px">
                        <el-option
                            v-for="item in versionData"
                            :key="`from-${item.id}`"
                            :label="`版本 ${item.version_no} · ${stateLabel(item.state)}`"
                            :value="item.id" />
                    </el-select>
                    <span>对比</span>
                    <el-select v-model="compareToId" placeholder="选择目标版本" style="width: 220px">
                        <el-option
                            v-for="item in versionData"
                            :key="`to-${item.id}`"
                            :label="`版本 ${item.version_no} · ${stateLabel(item.state)}`"
                            :value="item.id" />
                    </el-select>
                    <el-button type="primary" :disabled="!compareFrom || !compareTo" @click="openCompare">
                        对比版本
                    </el-button>
                </div>
                <el-table :data="versionData" stripe>
                    <el-table-column align="center" label="版本号" prop="version_no" width="80" />
                    <el-table-column align="center" label="状态" width="130">
                        <template #default="scope">
                            <el-tag :type="stateTagType(scope.row.state)" size="small">
                                {{ stateLabel(scope.row.state) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column align="center" label="用途" min-width="120">
                        <template #default="scope">{{ purposeLabel(scope.row.purpose) }}</template>
                    </el-table-column>
                    <el-table-column align="center" label="版本摘要" width="145" show-overflow-tooltip>
                        <template #default="scope">{{ digestLabel(scope.row.version_digest) }}</template>
                    </el-table-column>
                    <el-table-column align="center" label="更新时间" prop="updated_at" width="170" />
                </el-table>
                <el-empty v-if="!versionLoading && versionData.length === 0" description="暂无版本记录" />
            </div>
        </el-dialog>

        <el-dialog v-model="compareVisible" title="模板版本对比" width="1100px" destroy-on-close>
            <el-empty v-if="!compareFrom || !compareTo" description="请选择两个版本" />
            <el-row v-else :gutter="18">
                <el-col v-for="item in [compareFrom, compareTo]" :key="item.id" :span="12">
                    <el-card shadow="never">
                        <template #header>版本 {{ item.version_no }} · {{ stateLabel(item.state) }}</template>
                        <el-descriptions :column="1" border>
                            <el-descriptions-item label="版本摘要">
                                <span class="version-digest">{{ item.version_digest }}</span>
                            </el-descriptions-item>
                            <el-descriptions-item label="用途">{{ purposeLabel(item.purpose) }}</el-descriptions-item>
                            <el-descriptions-item label="更新时间">{{ item.updated_at }}</el-descriptions-item>
                        </el-descriptions>
                        <h4>标题模板</h4>
                        <pre class="preview-source">{{ item.title_template || "（无标题）" }}</pre>
                        <h4>正文模板</h4>
                        <pre class="preview-source">{{ item.content_template }}</pre>
                    </el-card>
                </el-col>
            </el-row>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.notification-template-page {
    height: 100%;
    min-height: 0;
    overflow: hidden;
    box-sizing: border-box;
    background: var(--el-bg-color);
}

.box__search {
    display: flex;
    height: 10%;
    align-items: center;
    padding-left: 20px;
}

.box__search :deep(.el-form-item) {
    margin-bottom: 0;
}

.box__search :deep(.el-input),
.box__search :deep(.el-select) {
    width: 200px;
}

.box__body {
    display: block;
    height: 90%;
    padding: 0 20px;
}

.box__body :deep(.el-table) {
    width: 100%;
}

.box__body :deep(.el-pagination) {
    justify-content: flex-end;
    padding: 0 10px;
    margin-top: 4px;
    margin-left: auto;
}

.channel-list {
    display: grid;
    gap: 6px;
    padding: 4px 0;
}

.channel-row {
    display: flex;
    min-height: 32px;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 4px 8px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    background: var(--el-fill-color-lighter);
}

.channel-row__summary,
.channel-row__actions {
    display: flex;
    align-items: center;
    gap: 6px;
}

.channel-row__summary {
    min-width: 0;
    flex-wrap: wrap;
}

.channel-version,
.channel-empty {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.channel-row__actions {
    flex: 0 0 auto;
}

.version-container {
    min-height: 240px;
}

.compare-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 14px 0;
}

.preview-source {
    max-height: 240px;
    margin: 0;
    padding: 12px;
    overflow: auto;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    white-space: pre-wrap;
    word-break: break-word;
}

.version-digest {
    display: block;
    overflow-wrap: anywhere;
    word-break: break-all;
}

@media (max-width: 900px) {
    .box__search {
        height: auto;
        padding: 12px 20px;
    }

    .box__body {
        height: calc(100% - 96px);
    }
}
</style>
