<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

import { NotificationSmsConfigApi } from "@/api/notification/notification-sms-config-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

defineOptions({
    name: "DevopsNotificationSmsConfig"
});

const providerLabels: Record<NotificationSmsProvider, string> = {
    ALIYUN: "阿里云短信",
    TENCENT: "腾讯云短信",
    MOCK: "模拟发送"
};

const providerOptions: NotificationSmsProvider[] = ["ALIYUN", "TENCENT", "MOCK"];

/** 供应商标签 */
function providerLabel(provider: string): string {
    return providerLabels[provider as NotificationSmsProvider] ?? provider;
}

const loading = ref(false);
const rows = ref<NotificationSmsConfigVO[]>([]);
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref("");

const form = reactive<NotificationSmsConfigSaveParams>({
    name: "",
    provider: "MOCK",
    access_key_id: "",
    access_key_secret: "",
    sign_name: "",
    provider_template_code: "",
    region: "",
    extra: {}
});

/** 加载配置 */
async function loadData(): Promise<void> {
    loading.value = true;
    try {
        rows.value = await NotificationSmsConfigApi.list();
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
        access_key_id: "",
        access_key_secret: "",
        sign_name: "",
        provider_template_code: "",
        region: "",
        extra: {}
    });
    dialogVisible.value = true;
}

/** 打开编辑 */
function handleEdit(row: NotificationSmsConfigVO): void {
    editingId.value = row.id;
    Object.assign(form, {
        name: row.name,
        provider: row.provider,
        access_key_id: row.access_key_id ?? "",
        access_key_secret: row.access_key_secret ?? "",
        sign_name: row.sign_name ?? "",
        provider_template_code: row.provider_template_code ?? "",
        region: row.region ?? "",
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
            await NotificationSmsConfigApi.update(editingId.value, form);
        } else {
            await NotificationSmsConfigApi.create(form);
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
async function handleActivate(row: NotificationSmsConfigVO): Promise<void> {
    try {
        await NotificationSmsConfigApi.activate(row.id);
        MessageUtils.success("已激活");
        loadData();
    } catch (error) {
        MessageUtils.error(error);
    }
}

/** 删除 */
async function handleDelete(row: NotificationSmsConfigVO): Promise<void> {
    try {
        await MessageUtils.box.confirm(`确认删除短信配置「${row.name}」？`);
        await NotificationSmsConfigApi.delete(row.id);
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
                    <span class="page-title">短信配置</span>
                    <el-button type="primary" @click="handleCreate">新增配置</el-button>
                </div>
            </template>

            <el-table v-loading="loading" :data="rows" style="width: 100%">
                <el-table-column prop="name" label="名称" min-width="160" />
                <el-table-column label="供应商" width="130">
                    <template #default="{ row }">{{ providerLabel(row.provider) }}</template>
                </el-table-column>
                <el-table-column prop="sign_name" label="短信签名" width="140" />
                <el-table-column prop="provider_template_code" label="默认模板" min-width="160" />
                <el-table-column prop="region" label="地域" width="120" />
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

        <el-dialog v-model="dialogVisible" :title="editingId ? '编辑短信配置' : '新增短信配置'" width="560px">
            <el-form :model="form" label-width="120px">
                <el-form-item label="配置名称" required>
                    <el-input v-model="form.name" placeholder="例如 阿里云生产短信" />
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
                <el-form-item v-if="form.provider !== 'MOCK'" label="AccessKey ID">
                    <el-input v-model="form.access_key_id" />
                </el-form-item>
                <el-form-item v-if="form.provider !== 'MOCK'" label="AccessKey Secret">
                    <el-input v-model="form.access_key_secret" type="password" show-password />
                </el-form-item>
                <el-form-item v-if="form.provider !== 'MOCK'" label="短信签名">
                    <el-input v-model="form.sign_name" />
                </el-form-item>
                <el-form-item v-if="form.provider !== 'MOCK'" label="默认模板编码">
                    <el-input v-model="form.provider_template_code" />
                </el-form-item>
                <el-form-item v-if="form.provider !== 'MOCK'" label="地域">
                    <el-input v-model="form.region" placeholder="例如 cn-hangzhou" />
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
