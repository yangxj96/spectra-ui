<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

import { NotificationTemplateApi } from "@/api/notification/notification-template-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

defineOptions({
    name: "DevopsNotificationTemplate"
});

const channelLabels: Record<NotificationTemplateChannel, string> = {
    IN_APP: "站内信",
    SMS: "短信",
    EMAIL: "邮件"
};

const channelOptions: NotificationTemplateChannel[] = ["IN_APP", "SMS", "EMAIL"];

/** 渠道标签 */
function channelLabel(channel: string): string {
    return channelLabels[channel as NotificationTemplateChannel] ?? channel;
}

const loading = ref(false);
const rows = ref<NotificationTemplateVO[]>([]);
const total = ref(0);
const query = reactive<NotificationTemplatePageParams>({
    page_num: 1,
    page_size: 15
});
const searchForm = reactive({
    keyword: "",
    channel: "" as NotificationTemplateChannel | "",
    enabled: "" as boolean | ""
});

const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref("");
const form = reactive<NotificationTemplateSaveParams>({
    code: "",
    name: "",
    channel: "IN_APP",
    title_template: "",
    content_template: "",
    html_template: "",
    provider_template_code: "",
    enabled: true
});

/** 加载模板 */
async function loadData(): Promise<void> {
    loading.value = true;
    try {
        const result = await NotificationTemplateApi.page(query);
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
    query.keyword = searchForm.keyword || undefined;
    query.channel = searchForm.channel || undefined;
    query.enabled = searchForm.enabled === "" ? undefined : searchForm.enabled;
    loadData();
}

/** 重置 */
function handleReset(): void {
    searchForm.keyword = "";
    searchForm.channel = "";
    searchForm.enabled = "";
    query.keyword = undefined;
    query.channel = undefined;
    query.enabled = undefined;
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

/** 打开新增 */
function handleCreate(): void {
    editingId.value = "";
    Object.assign(form, {
        code: "",
        name: "",
        channel: "IN_APP",
        title_template: "",
        content_template: "",
        html_template: "",
        provider_template_code: "",
        enabled: true
    });
    dialogVisible.value = true;
}

/** 打开编辑 */
function handleEdit(row: NotificationTemplateVO): void {
    editingId.value = row.id;
    Object.assign(form, {
        code: row.code,
        name: row.name,
        channel: row.channel,
        title_template: row.title_template ?? "",
        content_template: row.content_template,
        html_template: row.html_template ?? "",
        provider_template_code: row.provider_template_code ?? "",
        enabled: row.enabled
    });
    dialogVisible.value = true;
}

/** 保存 */
async function handleSubmit(): Promise<void> {
    if (!form.code || !form.name || !form.content_template) {
        MessageUtils.warning("模板编码、名称和正文不能为空");
        return;
    }
    saving.value = true;
    try {
        if (editingId.value) {
            await NotificationTemplateApi.update(editingId.value, form);
        } else {
            await NotificationTemplateApi.create(form);
        }
        MessageUtils.success("保存成功");
        dialogVisible.value = false;
        loadData();
    } catch (error) {
        MessageUtils.error(error);
    } finally {
        saving.value = false;
    }
}

/** 删除 */
async function handleDelete(row: NotificationTemplateVO): Promise<void> {
    try {
        await MessageUtils.box.confirm(`确认删除模板「${row.name}」？`);
        await NotificationTemplateApi.delete(row.id);
        MessageUtils.success("删除成功");
        loadData();
    } catch (error) {
        if (error !== "cancel") {
            MessageUtils.error(error);
        }
    }
}

/** 启停 */
async function handleToggle(row: NotificationTemplateVO): Promise<void> {
    try {
        await NotificationTemplateApi.changeEnabled(row.id, !row.enabled);
        MessageUtils.success(row.enabled ? "已停用" : "已启用");
        loadData();
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
    <div class="notification-template-page">
        <el-card>
            <template #header>
                <div class="page-header">
                    <span class="page-title">通知模板</span>
                    <el-button type="primary" @click="handleCreate">新增模板</el-button>
                </div>
            </template>

            <el-form :model="searchForm" inline label-width="80px">
                <el-form-item label="关键词">
                    <el-input
                        v-model="searchForm.keyword"
                        placeholder="模板编码或名称"
                        clearable
                        style="width: 220px" />
                </el-form-item>
                <el-form-item label="渠道">
                    <el-select v-model="searchForm.channel" placeholder="全部" clearable style="width: 130px">
                        <el-option
                            v-for="item in channelOptions"
                            :key="item"
                            :label="channelLabels[item]"
                            :value="item" />
                    </el-select>
                </el-form-item>
                <el-form-item label="状态">
                    <el-select v-model="searchForm.enabled" placeholder="全部" clearable style="width: 130px">
                        <el-option label="启用" :value="true" />
                        <el-option label="停用" :value="false" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handleSearch">查询</el-button>
                    <el-button @click="handleReset">重置</el-button>
                </el-form-item>
            </el-form>

            <el-table v-loading="loading" :data="rows" max-height="calc(100vh - 330px)" style="width: 100%">
                <el-table-column prop="code" label="模板编码" min-width="170" />
                <el-table-column prop="name" label="名称" min-width="160" />
                <el-table-column label="渠道" width="90">
                    <template #default="{ row }">{{ channelLabel(row.channel) }}</template>
                </el-table-column>
                <el-table-column label="内置" width="80">
                    <template #default="{ row }">
                        <el-tag :type="row.builtin ? 'warning' : 'info'" size="small">
                            {{ row.builtin ? "内置" : "自定义" }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="80">
                    <template #default="{ row }">
                        <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
                            {{ row.enabled ? "启用" : "停用" }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="创建时间" width="170">
                    <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="180" fixed="right">
                    <template #default="{ row }">
                        <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
                        <el-button type="primary" link size="small" @click="handleToggle(row)">
                            {{ row.enabled ? "停用" : "启用" }}
                        </el-button>
                        <el-button type="danger" link size="small" :disabled="row.builtin" @click="handleDelete(row)">
                            删除
                        </el-button>
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

        <el-dialog v-model="dialogVisible" :title="editingId ? '编辑模板' : '新增模板'" width="620px">
            <el-form :model="form" label-width="110px">
                <el-form-item label="模板编码" required>
                    <el-input v-model="form.code" placeholder="例如 security.login-code" />
                </el-form-item>
                <el-form-item label="模板名称" required>
                    <el-input v-model="form.name" placeholder="例如 登录验证码" />
                </el-form-item>
                <el-form-item label="渠道" required>
                    <el-select v-model="form.channel" style="width: 100%">
                        <el-option
                            v-for="item in channelOptions"
                            :key="item"
                            :label="channelLabels[item]"
                            :value="item" />
                    </el-select>
                </el-form-item>
                <el-form-item label="标题模板">
                    <el-input v-model="form.title_template" placeholder="支持 {{name}} 占位符" />
                </el-form-item>
                <el-form-item label="正文模板" required>
                    <el-input
                        v-model="form.content_template"
                        type="textarea"
                        :rows="4"
                        placeholder="支持 {{name}} 占位符" />
                </el-form-item>
                <el-form-item v-if="form.channel === 'EMAIL'" label="HTML 正文">
                    <el-input
                        v-model="form.html_template"
                        type="textarea"
                        :rows="4"
                        placeholder="可选，支持 {{name}} 占位符" />
                </el-form-item>
                <el-form-item v-if="form.channel === 'SMS'" label="供应商模板">
                    <el-input v-model="form.provider_template_code" placeholder="短信供应商模板编码" />
                </el-form-item>
                <el-form-item label="启用">
                    <el-switch v-model="form.enabled" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.notification-template-page {
    display: flex;
    flex-direction: column;
}

.page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.page-title {
    font-weight: 600;
}

.pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    padding-top: 16px;
}
</style>
