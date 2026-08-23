<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import { NotificationTemplateApi } from "@/api/notification/notification-template-api.ts";
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
    { label: "已发布", value: "PUBLISHED" },
    { label: "已停用", value: "DISABLED" },
    { label: "已归档", value: "ARCHIVED" }
];

const condition = ref<NotificationTemplatePageParams>({
    page_num: 1,
    page_size: 15
});

const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable(
    NotificationTemplateApi.page,
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
    if (state === "DRAFT") return "warning";
    if (state === "DISABLED") return "danger";
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

function sensitiveParameterNames(parameterSchema: Record<string, unknown> | null | undefined): string[] {
    const properties = parameterSchema?.properties;
    if (!properties || typeof properties !== "object" || Array.isArray(properties)) return [];
    return Object.entries(properties as Record<string, unknown>)
        .filter(([, definition]) => {
            return (
                typeof definition === "object" &&
                definition !== null &&
                !Array.isArray(definition) &&
                (definition as Record<string, unknown>).sensitive === true
            );
        })
        .map(([name]) => name);
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

function openEdit(row: NotificationTemplateVO): void {
    void router.push({ name: "DevopsNotificationTemplateEdit", query: { id: row.id } });
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

function publish(row: NotificationTemplateVO): Promise<void> {
    return confirmAction(
        row,
        `确定发布模板「${row.template_name}」吗？发布后将成为${channelLabel(row.channel)}当前生效版本。`,
        NotificationTemplateApi.publish,
        "模板已发布"
    );
}

function disable(row: NotificationTemplateVO): Promise<void> {
    return confirmAction(
        row,
        `确定停用模板「${row.template_name}」吗？停用后将不再用于发送。`,
        NotificationTemplateApi.disable,
        "模板已停用"
    );
}

function archive(row: NotificationTemplateVO): Promise<void> {
    return confirmAction(
        row,
        `确定归档模板「${row.template_name}」吗？归档后只能查看历史。`,
        NotificationTemplateApi.archive,
        "模板已归档"
    );
}

async function copyTemplate(row: NotificationTemplateVO): Promise<void> {
    try {
        await ElMessageBox.confirm(
            `复制「${row.template_name}」会新建一个可编辑的草稿，原模板和历史版本不会被修改。复制完成后进入草稿编辑页，确定继续吗？`,
            "复制为新草稿",
            { confirmButtonText: "复制并编辑", cancelButtonText: "取消", type: "info" }
        );
        const draft = await NotificationTemplateApi.copy(row.id);
        ElMessage.success("新草稿已创建");
        await router.push({ name: "DevopsNotificationTemplateEdit", query: { id: draft.id } });
    } catch (error: unknown) {
        if (error !== "cancel") ElMessage.error(errorMessage(error, "复制模板失败"));
    }
}

async function openVersions(row: NotificationTemplateVO): Promise<void> {
    versionVisible.value = true;
    versionLoading.value = true;
    versionTemplateName.value = `${row.template_name}（${row.template_group_code}） / ${channelLabel(row.channel)}`;
    try {
        versionData.value = await NotificationTemplateApi.versions(row.id);
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

async function rollback(row: NotificationTemplateVO): Promise<void> {
    try {
        await ElMessageBox.confirm(
            `确定从版本 ${row.version_no} 创建新的回滚草稿吗？历史版本不会被修改。`,
            "创建回滚草稿",
            { confirmButtonText: "创建并编辑", cancelButtonText: "取消", type: "warning" }
        );
        const draft = await NotificationTemplateApi.rollback(row.id);
        ElMessage.success("回滚草稿已创建");
        versionVisible.value = false;
        await router.push({ name: "DevopsNotificationTemplateEdit", query: { id: draft.id } });
    } catch (error: unknown) {
        if (error !== "cancel") ElMessage.error(errorMessage(error, "创建回滚草稿失败"));
    }
}
</script>

<template>
    <div class="notification-template-page">
        <el-card shadow="never" class="search-card">
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
                    <el-select v-model="condition.state" clearable placeholder="请选择状态" style="width: 130px">
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
                    <el-button v-permission="'notification:template:write'" type="success" @click="openCreate">
                        新增模板
                    </el-button>
                </el-form-item>
            </el-form>
        </el-card>

        <el-card shadow="never" class="table-card">
            <el-table :data="table_data" class="notification-data-table" stripe>
                <el-table-column align="center" type="index" label="序号" width="70" />
                <el-table-column
                    align="center"
                    prop="template_group_code"
                    label="模板组编码"
                    min-width="150"
                    show-overflow-tooltip />
                <el-table-column prop="template_name" label="模板名称" min-width="160" show-overflow-tooltip />
                <el-table-column align="center" label="渠道" width="100">
                    <template #default="scope">{{ channelLabel(scope.row.channel) }}</template>
                </el-table-column>
                <el-table-column align="center" label="用途" min-width="130" show-overflow-tooltip>
                    <template #default="scope">{{ purposeLabel(scope.row.purpose) }}</template>
                </el-table-column>
                <el-table-column prop="content_template" label="模板正文" min-width="260" show-overflow-tooltip />
                <el-table-column label="敏感参数" min-width="150">
                    <template #default="scope">
                        <template v-if="sensitiveParameterNames(scope.row.parameter_schema).length">
                            <el-tag
                                v-for="name in sensitiveParameterNames(scope.row.parameter_schema)"
                                :key="name"
                                type="warning"
                                size="small">
                                {{ name }}
                            </el-tag>
                        </template>
                        <span v-else>无</span>
                    </template>
                </el-table-column>
                <el-table-column align="center" label="版本" prop="version_no" width="75" />
                <el-table-column align="center" label="版本摘要" width="135" show-overflow-tooltip>
                    <template #default="scope">{{ digestLabel(scope.row.version_digest) }}</template>
                </el-table-column>
                <el-table-column align="center" label="状态" width="90">
                    <template #default="scope">
                        <el-tag :type="stateTagType(scope.row.state)" size="small">
                            {{ stateLabel(scope.row.state) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column align="center" label="更新时间" prop="updated_at" width="170" show-overflow-tooltip />
                <el-table-column align="center" label="操作" width="470" fixed="right">
                    <template #default="scope">
                        <el-button
                            v-if="scope.row.state === 'DRAFT'"
                            v-permission="'notification:template:write'"
                            link
                            type="primary"
                            size="small"
                            @click="openEdit(scope.row)">
                            编辑
                        </el-button>
                        <el-button
                            v-permission="'notification:template:write'"
                            link
                            type="info"
                            size="small"
                            @click="void copyTemplate(scope.row)">
                            复制为新草稿
                        </el-button>
                        <el-button
                            v-permission="'notification:template:read'"
                            link
                            type="info"
                            size="small"
                            @click="void openVersions(scope.row)">
                            版本历史
                        </el-button>
                        <el-button
                            v-if="scope.row.state === 'DRAFT'"
                            v-permission="'notification:template:publish'"
                            link
                            type="success"
                            size="small"
                            @click="void publish(scope.row)">
                            发布
                        </el-button>
                        <el-button
                            v-if="scope.row.state === 'PUBLISHED'"
                            v-permission="'notification:template:write'"
                            link
                            type="warning"
                            size="small"
                            @click="void disable(scope.row)">
                            停用
                        </el-button>
                        <el-button
                            v-if="scope.row.state === 'DRAFT' || scope.row.state === 'DISABLED'"
                            v-permission="'notification:template:write'"
                            link
                            type="danger"
                            size="small"
                            @click="void archive(scope.row)">
                            归档
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-pagination
                layout="total, sizes, prev, pager, next"
                :current-page="pagination.page"
                :page-size="pagination.size"
                :page-sizes="pagination.page_sizes"
                :total="pagination.total"
                background
                size="small"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange" />
        </el-card>

        <el-dialog v-model="versionVisible" :title="`版本历史 - ${versionTemplateName}`" width="900px" destroy-on-close>
            <div v-loading="versionLoading" class="version-container">
                <el-alert
                    title="版本摘要用于确认当前版本内容；对比只在浏览器展示模板快照，不会修改任何版本。"
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
                    <el-table-column align="center" label="状态" width="90">
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
                    <el-table-column align="center" label="操作" width="150">
                        <template #default="scope">
                            <el-button
                                v-if="scope.row.state !== 'DRAFT'"
                                v-permission="'notification:template:publish'"
                                link
                                type="primary"
                                size="small"
                                @click="void rollback(scope.row)">
                                回滚为新草稿
                            </el-button>
                        </template>
                    </el-table-column>
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
                            <el-descriptions-item label="版本摘要">{{ item.version_digest }}</el-descriptions-item>
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
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    min-height: 0;
    padding: 14px;
    overflow-x: hidden;
    overflow-y: auto;
    box-sizing: border-box;
    background: var(--el-bg-color-page);
}

.search-card {
    flex: 0 0 auto;
}

.search-card :deep(.el-form-item) {
    margin-bottom: 12px;
}

.table-card {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 320px;
}

.table-card :deep(.el-card__body) {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
}

.notification-data-table {
    flex: 1 1 auto;
    min-height: 0;
}

.table-card :deep(.el-pagination) {
    justify-content: flex-end;
    margin-top: 12px;
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

h4 {
    margin: 18px 0 8px;
}
</style>
