<script setup lang="ts">
import { CircleCheck, Download, Plus, Promotion, Refresh, Upload, View } from "@element-plus/icons-vue";
import { ElMessageBox, type FormInstance, type UploadFile } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";

import { initCrypto } from "@/api/system/crypto-api.ts";
import { SecretManagementApi } from "@/api/system/secret-management-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const categories: Array<{ value: SecretCategory; label: string }> = [
    { value: "APPLICATION_CRYPTO", label: "应用加密密钥" },
    { value: "BUSINESS_CREDENTIAL", label: "业务服务凭据" },
    { value: "SECURITY_SIGNING", label: "安全签名密钥" }
];

const stateLabels: Record<SecretVersionState, string> = {
    PENDING: "待启用",
    ACTIVE: "启用中",
    RETIRED: "已退役",
    REVOKED: "已撤销",
    DESTROYED: "已销毁"
};

const activeCategory = ref<SecretCategory>("APPLICATION_CRYPTO");
const definitions = ref<SecretDefinitionVO[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const cryptoEnabled = ref(false);
const cryptoReady = ref(false);
const cryptoState = ref<SecretManagementSettingsVO["crypto_state"]>("DISABLED");
const cryptoSubmitting = ref(false);

const versionDialogVisible = ref(false);
const versionFormRef = ref<FormInstance>();
const versionSubmitting = ref(false);
const versionForm = reactive({ code: "", name: "", value: "" });

const versionDrawerVisible = ref(false);
const versionLoading = ref(false);
const versionCode = ref("");
const versions = ref<SecretVersionVO[]>([]);

const importFile = ref<File>();
const importPassphrase = ref("");
const importPreview = ref<SecretImportPreviewVO>();
const importDialogVisible = ref(false);
const importPreviewLoading = ref(false);
const importSubmitting = ref(false);

const visibleDefinitions = computed(() => definitions.value.filter(item => item.category === activeCategory.value));
const versionRules = {
    value: [
        { required: true, message: "请输入密钥值", trigger: "blur" },
        { max: 16_384, message: "密钥值长度不能超过 16384 个字符", trigger: "blur" }
    ]
};

function stateType(state: SecretVersionState): "success" | "warning" | "danger" | "info" {
    if (state === "ACTIVE") return "success";
    if (state === "PENDING") return "warning";
    if (state === "REVOKED" || state === "DESTROYED") return "danger";
    return "info";
}

function formatFingerprint(value?: string): string {
    return value ? `${value.slice(0, 12)}…` : "—";
}

function cryptoStateLabel(): string {
    if (cryptoState.value === "READY") return "已启用且密钥就绪";
    if (cryptoState.value === "UNAVAILABLE") return "已配置但密钥不可用";
    return "已关闭";
}

function applySettings(settings: SecretManagementSettingsVO): void {
    cryptoEnabled.value = settings.crypto_enabled;
    cryptoReady.value = settings.crypto_ready;
    cryptoState.value = settings.crypto_state;
}

async function loadSettings(): Promise<void> {
    applySettings(await SecretManagementApi.getSettings());
}

async function loadPage(): Promise<void> {
    loading.value = true;
    try {
        applySettings(await SecretManagementApi.getSettings());
        definitions.value = await SecretManagementApi.listDefinitions();
    } catch {
        MessageUtils.error("密钥管理页面加载失败，请稍后重试。");
    } finally {
        loading.value = false;
    }
}

async function loadDefinitions(showLoading = true): Promise<void> {
    if (showLoading) loading.value = true;
    else refreshing.value = true;
    try {
        definitions.value = await SecretManagementApi.listDefinitions();
    } catch {
        MessageUtils.error("密钥定义加载失败，请稍后重试。");
    } finally {
        loading.value = false;
        refreshing.value = false;
    }
}

async function refreshRuntime(): Promise<void> {
    refreshing.value = true;
    try {
        await SecretManagementApi.refresh();
        await Promise.all([loadSettings(), loadDefinitions(false)]);
        MessageUtils.success("密钥运行态已刷新。");
    } catch {
        MessageUtils.error("密钥运行态刷新失败。");
    } finally {
        refreshing.value = false;
    }
}

async function toggleCrypto(enabled: boolean): Promise<void> {
    const previous = cryptoEnabled.value;
    if (enabled) {
        try {
            await ElMessageBox.confirm(
                "启用后普通接口请求和响应将使用 RSA/AES 加密传输，是否继续？",
                "确认启用接口加解密",
                { type: "warning", confirmButtonText: "确认启用", cancelButtonText: "取消" }
            );
        } catch (error: unknown) {
            if (error !== "cancel" && error !== "close") MessageUtils.error("接口加解密开关操作已取消。");
            return;
        }
    }

    cryptoSubmitting.value = true;
    try {
        await SecretManagementApi.setCryptoEnabled(enabled);
        await initCrypto();
        await loadSettings();
        MessageUtils.success(enabled ? "接口加解密已启用。" : "接口加解密已关闭。");
    } catch {
        cryptoEnabled.value = previous;
        MessageUtils.error(enabled ? "接口加解密启用失败，请检查四个 RSA 密钥。" : "接口加解密关闭失败。");
    } finally {
        cryptoSubmitting.value = false;
    }
}

function openCreateVersion(row: SecretDefinitionVO): void {
    versionForm.code = row.code;
    versionForm.name = row.name;
    versionForm.value = "";
    versionDialogVisible.value = true;
}

async function createVersion(): Promise<void> {
    if (!versionFormRef.value) return;
    const valid = await versionFormRef.value.validate().catch(() => false);
    if (!valid) return;
    versionSubmitting.value = true;
    try {
        await SecretManagementApi.createVersion(versionForm.code, versionForm.value);
        MessageUtils.success("待启用版本已创建，请确认后发布。");
        versionDialogVisible.value = false;
        await loadDefinitions(false);
    } catch {
        MessageUtils.error("创建密钥版本失败。");
    } finally {
        versionSubmitting.value = false;
    }
}

async function loadVersions(code: string): Promise<void> {
    versionLoading.value = true;
    try {
        versions.value = await SecretManagementApi.listVersions(code);
    } catch {
        MessageUtils.error("密钥版本加载失败。");
    } finally {
        versionLoading.value = false;
    }
}

async function openVersions(row: SecretDefinitionVO): Promise<void> {
    versionCode.value = row.code;
    versionDrawerVisible.value = true;
    await loadVersions(row.code);
}

async function publishVersion(version: SecretVersionVO): Promise<void> {
    try {
        await ElMessageBox.confirm(
            `确认发布 ${versionCode.value} 的第 ${version.version_no} 版吗？发布后原启用版本将自动退役。`,
            "确认发布密钥版本",
            { type: "warning", confirmButtonText: "确认发布", cancelButtonText: "取消" }
        );
        await SecretManagementApi.publish(versionCode.value, version.id);
        MessageUtils.success("密钥版本已发布。");
        await Promise.all([loadVersions(versionCode.value), loadDefinitions(false)]);
    } catch (error: unknown) {
        if (error !== "cancel" && error !== "close") MessageUtils.error("发布密钥版本失败。");
    }
}

async function retireVersion(version: SecretVersionVO): Promise<void> {
    try {
        await ElMessageBox.confirm("退役后当前运行态将不再使用该版本，是否继续？", "确认退役", {
            type: "warning",
            confirmButtonText: "确认退役",
            cancelButtonText: "取消"
        });
        await SecretManagementApi.retire(versionCode.value, version.id);
        MessageUtils.success("密钥版本已退役。");
        await Promise.all([loadVersions(versionCode.value), loadDefinitions(false)]);
    } catch (error: unknown) {
        if (error !== "cancel" && error !== "close") MessageUtils.error("退役密钥版本失败。");
    }
}

function decodeBase64(value: string): Uint8Array {
    const binary = atob(value);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function exportSecrets(): Promise<void> {
    try {
        const result = await SecretManagementApi.exportCurrent();
        const blob = new Blob([decodeBase64(result.package_base64)], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = result.file_name;
        anchor.click();
        URL.revokeObjectURL(url);
        await ElMessageBox.alert(
            `导出完成，共 ${result.entry_count} 个当前启用版本。\n\n一次性导出口令（只显示本次）：\n${result.one_time_passphrase}\n\n请立即安全保存，关闭后无法再次查看。`,
            "导出口令",
            { confirmButtonText: "我已安全保存", type: "warning" }
        );
    } catch (error: unknown) {
        if (error !== "cancel" && error !== "close") MessageUtils.error("密钥导出失败。");
    }
}

function handleImportFile(upload: UploadFile): void {
    importFile.value = upload.raw;
    importPreview.value = undefined;
}

async function previewImport(): Promise<void> {
    if (!importFile.value) {
        MessageUtils.warning("请选择密钥导入包。");
        return;
    }
    if (!importPassphrase.value.trim()) {
        MessageUtils.warning("请输入导入口令。");
        return;
    }
    importPreviewLoading.value = true;
    try {
        importPreview.value = await SecretManagementApi.previewImport(importFile.value, importPassphrase.value.trim());
    } catch {
        importPreview.value = undefined;
        MessageUtils.error("导入包校验失败，请检查文件和导入口令。");
    } finally {
        importPreviewLoading.value = false;
    }
}

async function confirmImport(): Promise<void> {
    if (!importFile.value || !importPreview.value?.valid) return;
    importSubmitting.value = true;
    try {
        const count = await SecretManagementApi.importPending(importFile.value, importPassphrase.value.trim());
        MessageUtils.success(`已导入 ${count} 个待启用版本，请逐项确认后发布。`);
        importDialogVisible.value = false;
        importFile.value = undefined;
        importPassphrase.value = "";
        importPreview.value = undefined;
        await loadDefinitions(false);
    } catch {
        MessageUtils.error("密钥导入失败。");
    } finally {
        importSubmitting.value = false;
    }
}

onMounted(() => void loadPage());
</script>

<template>
    <div v-loading="loading" class="secret-page">
        <div class="crypto-setting">
            <div class="crypto-setting-copy">
                <div class="crypto-setting-title">接口加解密</div>
                <div class="crypto-setting-description">
                    开关状态保存到系统配置表；启用前必须确认四个 RSA 密钥均存在并且运行态可用。
                </div>
            </div>
            <div class="crypto-setting-status">
                <el-tag :type="cryptoState === 'READY' ? 'success' : cryptoState === 'UNAVAILABLE' ? 'danger' : 'info'">
                    {{ cryptoStateLabel() }}
                </el-tag>
                <el-switch
                    :model-value="cryptoEnabled"
                    :loading="cryptoSubmitting"
                    :disabled="cryptoSubmitting"
                    active-text="启用"
                    inactive-text="关闭"
                    @change="value => void toggleCrypto(Boolean(value))" />
            </div>
        </div>

        <div class="toolbar">
            <el-tabs v-model="activeCategory" class="category-tabs">
                <el-tab-pane
                    v-for="category in categories"
                    :key="category.value"
                    :name="category.value"
                    :label="category.label" />
            </el-tabs>
            <div class="toolbar-actions">
                <el-button :loading="refreshing" @click="void refreshRuntime()">
                    <el-icon><Refresh /></el-icon>
                    刷新运行态
                </el-button>
                <el-button @click="importDialogVisible = true">
                    <el-icon><Upload /></el-icon>
                    导入
                </el-button>
                <el-button type="primary" @click="void exportSecrets()">
                    <el-icon><Download /></el-icon>
                    导出当前启用版本
                </el-button>
            </div>
        </div>

        <el-alert
            title="密钥值只在创建版本时输入，页面和接口只展示版本状态、摘要和来源；导入版本默认待启用。"
            type="info"
            show-icon
            :closable="false"
            class="security-tip" />

        <el-table :data="visibleDefinitions" stripe class="secret-table">
            <el-table-column prop="name" label="密钥名称" min-width="180" />
            <el-table-column prop="code" label="编码" min-width="260" show-overflow-tooltip />
            <el-table-column prop="value_type" label="类型" width="130" />
            <el-table-column label="当前状态" width="130">
                <template #default="scope">
                    <el-tag v-if="scope.row.active_version" type="success">
                        第 {{ scope.row.active_version }} 版启用
                    </el-tag>
                    <el-tag v-else type="warning">未启用</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="待启用" width="90" prop="pending_count" />
            <el-table-column label="当前摘要" min-width="150">
                <template #default="scope">{{ formatFingerprint(scope.row.active_fingerprint) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="250" fixed="right">
                <template #default="scope">
                    <el-button link type="primary" @click="openCreateVersion(scope.row)">
                        <el-icon><Plus /></el-icon>
                        新增版本
                    </el-button>
                    <el-button link type="primary" @click="void openVersions(scope.row)">
                        <el-icon><View /></el-icon>
                        版本记录
                    </el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-dialog v-model="versionDialogVisible" :title="`新增${versionForm.name}版本`" width="520px" destroy-on-close>
            <el-form ref="versionFormRef" :model="versionForm" :rules="versionRules" label-width="100px">
                <el-form-item label="密钥编码"><el-input v-model="versionForm.code" disabled /></el-form-item>
                <el-form-item prop="value">
                    <template #label>
                        密钥值
                        <span class="required-mark">*</span>
                    </template>
                    <el-input
                        v-model="versionForm.value"
                        type="textarea"
                        :rows="7"
                        show-word-limit
                        maxlength="16384"
                        autocomplete="new-password" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="versionDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="versionSubmitting" @click="void createVersion()">
                    创建待启用版本
                </el-button>
            </template>
        </el-dialog>

        <el-drawer v-model="versionDrawerVisible" :title="`${versionCode} 版本记录`" size="620px">
            <div v-loading="versionLoading">
                <el-empty v-if="!versionLoading && versions.length === 0" description="暂无版本记录" />
                <el-timeline v-else>
                    <el-timeline-item
                        v-for="version in versions"
                        :key="version.id"
                        :timestamp="version.created_at"
                        placement="top">
                        <div class="version-item">
                            <div>
                                <strong>第 {{ version.version_no }} 版</strong>
                                <el-tag :type="stateType(version.state)" size="small">
                                    {{ stateLabels[version.state] ?? version.state }}
                                </el-tag>
                                <p>摘要：{{ version.fingerprint }}</p>
                                <p>来源：{{ version.source }}　算法：{{ version.cipher_algorithm }}</p>
                            </div>
                            <div class="version-actions">
                                <el-button
                                    v-if="version.state === 'PENDING'"
                                    type="primary"
                                    size="small"
                                    @click="void publishVersion(version)">
                                    <el-icon><Promotion /></el-icon>
                                    发布
                                </el-button>
                                <el-button
                                    v-if="version.state === 'ACTIVE'"
                                    type="warning"
                                    size="small"
                                    @click="void retireVersion(version)">
                                    <el-icon><CircleCheck /></el-icon>
                                    退役
                                </el-button>
                            </div>
                        </div>
                    </el-timeline-item>
                </el-timeline>
            </div>
        </el-drawer>

        <el-dialog v-model="importDialogVisible" title="导入密钥包" width="560px" destroy-on-close>
            <el-form label-width="100px">
                <el-form-item>
                    <template #label>
                        导入文件
                        <span class="required-mark">*</span>
                    </template>
                    <el-upload :auto-upload="false" :show-file-list="true" :limit="1" :on-change="handleImportFile">
                        <el-button>
                            <el-icon><Upload /></el-icon>
                            选择密钥包
                        </el-button>
                    </el-upload>
                </el-form-item>
                <el-form-item>
                    <template #label>
                        导入口令
                        <span class="required-mark">*</span>
                    </template>
                    <el-input v-model="importPassphrase" type="password" show-password autocomplete="new-password" />
                </el-form-item>
            </el-form>
            <el-alert
                v-if="importPreview"
                :title="importPreview.valid ? '预校验通过，导入后所有版本仍为待启用。' : '预校验未通过，请先处理冲突。'"
                :type="importPreview.valid ? 'success' : 'error'"
                show-icon
                :closable="false" />
            <el-table
                v-if="importPreview"
                :data="importPreview.entries"
                size="small"
                max-height="260"
                class="preview-table">
                <el-table-column prop="code" label="编码" min-width="230" />
                <el-table-column prop="version" label="来源版本" width="90" />
                <el-table-column label="状态" width="100">
                    <template #default="scope">{{ scope.row.registered ? "已注册" : "未知编码" }}</template>
                </el-table-column>
            </el-table>
            <el-alert
                v-if="importPreview?.conflicts.length"
                :title="importPreview.conflicts.join('；')"
                type="error"
                show-icon
                :closable="false"
                class="conflict-alert" />
            <template #footer>
                <el-button :loading="importPreviewLoading" @click="void previewImport()">预校验</el-button>
                <el-button
                    type="primary"
                    :disabled="!importPreview?.valid"
                    :loading="importSubmitting"
                    @click="void confirmImport()">
                    确认导入为待启用
                </el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.secret-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px 20px;
    box-sizing: border-box;
}

.toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
}

.crypto-setting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 14px 16px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    background: var(--el-fill-color-blank);
}

.crypto-setting-title {
    color: var(--el-text-color-primary);
    font-size: 15px;
    font-weight: 600;
}

.crypto-setting-description {
    margin-top: 6px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.crypto-setting-status {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 12px;
}

.category-tabs {
    flex: 1;
    min-width: 0;
}

.toolbar-actions {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
}

.security-tip,
.secret-table {
    flex-shrink: 0;
}

.secret-table {
    flex: 1;
    min-height: 300px;
}

.required-mark {
    color: var(--el-color-danger);
    margin-left: 3px;
}

.version-item {
    display: flex;
    justify-content: space-between;
    gap: 16px;
}

.version-item strong {
    margin-right: 10px;
}

.version-item p {
    margin: 8px 0 0;
    color: var(--el-text-color-secondary);
    word-break: break-all;
}

.version-actions {
    flex-shrink: 0;
}

.preview-table,
.conflict-alert {
    margin-top: 14px;
}

@media (max-width: 900px) {
    .crypto-setting {
        align-items: stretch;
        flex-direction: column;
    }

    .crypto-setting-status {
        justify-content: space-between;
    }

    .toolbar {
        align-items: stretch;
        flex-direction: column;
    }

    .toolbar-actions {
        justify-content: flex-end;
    }
}
</style>
