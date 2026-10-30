<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

import { NotificationEmailConfigApi } from "@/api/notification/notification-email-config-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

defineOptions({
    name: "DevopsNotificationEmailConfig"
});

const providerLabels: Record<NotificationEmailProvider, string> = {
    SMTP: "SMTP",
    MOCK: "模拟发送"
};

const providerOptions: NotificationEmailProvider[] = ["SMTP", "MOCK"];

const sslLabels: Record<NotificationEmailSslMode, string> = {
    NONE: "不加密",
    SSL: "SSL",
    STARTTLS: "STARTTLS"
};

const sslOptions: NotificationEmailSslMode[] = ["NONE", "SSL", "STARTTLS"];

/** 供应商标签 */
function providerLabel(provider: string): string {
    return providerLabels[provider as NotificationEmailProvider] ?? provider;
}

/** 加密方式标签 */
function sslLabel(mode: string): string {
    return sslLabels[mode as NotificationEmailSslMode] ?? mode;
}

const loading = ref(false);
const rows = ref<NotificationEmailConfigVO[]>([]);
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref("");

const form = reactive<NotificationEmailConfigSaveParams>({
    name: "",
    provider: "MOCK",
    host: "",
    port: 465,
    username: "",
    password: "",
    from_address: "",
    from_name: "",
    ssl_mode: "SSL",
    extra: {}
});

/** 加载配置 */
async function loadData(): Promise<void> {
    loading.value = true;
    try {
        rows.value = await NotificationEmailConfigApi.list();
    } catch (error) {
        MessageUtils.error(error);
    } finally {
        loading.value = false;
    }
}

/** 打开新增 */
function handleCreate(): void {
    editingId.value = "";
    Object.assign(form, {
        name: "",
        provider: "MOCK",
        host: "",
        port: 465,
        username: "",
        password: "",
        from_address: "",
        from_name: "",
        ssl_mode: "SSL",
        extra: {}
    });
    dialogVisible.value = true;
}

/** 打开编辑 */
function handleEdit(row: NotificationEmailConfigVO): void {
    editingId.value = row.id;
    Object.assign(form, {
        name: row.name,
        provider: row.provider,
        host: row.host ?? "",
        port: row.port ?? 465,
        username: row.username ?? "",
        password: row.password ?? "",
        from_address: row.from_address ?? "",
        from_name: row.from_name ?? "",
        ssl_mode: row.ssl_mode ?? "NONE",
        extra: row.extra ?? {}
    });
    dialogVisible.value = true;
}

/** 保存 */
async function handleSubmit(): Promise<void> {
    if (!form.name) {
        MessageUtils.warning("配置名称不能为空");
        return;
    }
    saving.value = true;
    try {
        if (editingId.value) {
            await NotificationEmailConfigApi.update(editingId.value, form);
        } else {
            await NotificationEmailConfigApi.create(form);
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

/** 激活 */
async function handleActivate(row: NotificationEmailConfigVO): Promise<void> {
    try {
        await NotificationEmailConfigApi.activate(row.id);
        MessageUtils.success("已激活");
        loadData();
    } catch (error) {
        MessageUtils.error(error);
    }
}

/** 删除 */
async function handleDelete(row: NotificationEmailConfigVO): Promise<void> {
    try {
        await MessageUtils.box.confirm(`确认删除邮件配置「${row.name}」？`);
        await NotificationEmailConfigApi.delete(row.id);
        MessageUtils.success("删除成功");
        loadData();
    } catch (error) {
        if (error !== "cancel") {
            MessageUtils.error(error);
        }
    }
}

/** 格式化时间 */
function formatTime(value?: string): string {
    return value ? new Date(value).toLocaleString("zh-CN") : "-";
}

onMounted(loadData);
</script>

<template>
    <div class="notification-config-page">
        <el-card>
            <template #header>
                <div class="page-header">
                    <span class="page-title">邮件配置</span>
                    <el-button type="primary" @click="handleCreate">新增配置</el-button>
                </div>
            </template>

            <el-table v-loading="loading" :data="rows" style="width: 100%">
                <el-table-column prop="name" label="名称" min-width="160" />
                <el-table-column label="供应商" width="110">
                    <template #default="{ row }">{{ providerLabel(row.provider) }}</template>
                </el-table-column>
                <el-table-column prop="host" label="SMTP 主机" min-width="160" />
                <el-table-column prop="port" label="端口" width="90" />
                <el-table-column prop="from_address" label="发件地址" min-width="180" />
                <el-table-column label="加密" width="110">
                    <template #default="{ row }">{{ sslLabel(row.ssl_mode) }}</template>
                </el-table-column>
                <el-table-column label="状态" width="90">
                    <template #default="{ row }">
                        <el-tag :type="row.active ? 'success' : 'info'" size="small">
                            {{ row.active ? "已激活" : "未激活" }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="创建时间" width="170">
                    <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="190" fixed="right">
                    <template #default="{ row }">
                        <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
                        <el-button type="primary" link size="small" :disabled="row.active" @click="handleActivate(row)">
                            激活
                        </el-button>
                        <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>

        <el-dialog v-model="dialogVisible" :title="editingId ? '编辑邮件配置' : '新增邮件配置'" width="560px">
            <el-form :model="form" label-width="120px">
                <el-form-item label="配置名称" required>
                    <el-input v-model="form.name" placeholder="例如 企业邮箱" />
                </el-form-item>
                <el-form-item label="供应商" required>
                    <el-select v-model="form.provider" style="width: 100%">
                        <el-option
                            v-for="item in providerOptions"
                            :key="item"
                            :label="providerLabels[item]"
                            :value="item" />
                    </el-select>
                </el-form-item>
                <template v-if="form.provider !== 'MOCK'">
                    <el-form-item label="SMTP 主机">
                        <el-input v-model="form.host" placeholder="例如 smtp.example.com" />
                    </el-form-item>
                    <el-form-item label="端口">
                        <el-input-number v-model="form.port" :min="1" :max="65535" style="width: 100%" />
                    </el-form-item>
                    <el-form-item label="用户名">
                        <el-input v-model="form.username" />
                    </el-form-item>
                    <el-form-item label="密码">
                        <el-input v-model="form.password" type="password" show-password />
                    </el-form-item>
                    <el-form-item label="发件地址">
                        <el-input v-model="form.from_address" placeholder="noreply@example.com" />
                    </el-form-item>
                    <el-form-item label="发件人名称">
                        <el-input v-model="form.from_name" />
                    </el-form-item>
                    <el-form-item label="加密方式">
                        <el-select v-model="form.ssl_mode" style="width: 100%">
                            <el-option v-for="item in sslOptions" :key="item" :label="sslLabels[item]" :value="item" />
                        </el-select>
                    </el-form-item>
                </template>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.notification-config-page {
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
</style>
