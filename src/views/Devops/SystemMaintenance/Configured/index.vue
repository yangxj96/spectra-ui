<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { ConfiguredApi } from "@/api/system/configured-api.ts";
import DictSelect from "@/components/DictSelect/index.vue";
import { MessageUtils } from "@/utils/message-utils.ts";

const categories: Array<{ key: ConfiguredSettingsCategory; label: string; description: string }> = [
    { key: "SYSTEM", label: "系统配置", description: "管理平台名称、标识、默认语言和版权信息。" },
    { key: "SECURITY", label: "安全与加密", description: "管理密码策略、接口加密及相关安全参数。" },
    { key: "NOTIFICATION", label: "通知配置", description: "管理通知服务和消息中心的系统参数。" },
    { key: "OTHER", label: "其他配置", description: "管理其他业务模块使用的全局配置。" }
];

const settings = ref<ConfiguredSettingVO[]>([]);
const activeCategory = ref<ConfiguredSettingsCategory>("SYSTEM");
const loading = ref(false);
const saving = ref(false);

const visibleCategories = computed(() =>
    categories.filter(category => settings.value.some(setting => setting.category === category.key))
);

const settingsFor = (category: ConfiguredSettingsCategory) =>
    settings.value.filter(setting => setting.category === category);
const isNotificationChannelSetting = (setting: ConfiguredSettingVO): boolean =>
    setting.category === "NOTIFICATION" && /EMAIL|SMS/i.test(`${setting.key} ${setting.remarks ?? ""}`);
const currentSettings = computed(() => settings.value.filter(setting => setting.category === activeCategory.value));
const editableSettings = computed(() => currentSettings.value.filter(setting => setting.editable));

const loadSettings = async (notifyOnFailure = true): Promise<boolean> => {
    loading.value = true;
    try {
        settings.value = await ConfiguredApi.settings();
        if (!visibleCategories.value.some(category => category.key === activeCategory.value)) {
            activeCategory.value = visibleCategories.value[0]?.key ?? "SYSTEM";
        }
        return true;
    } catch (error) {
        if (notifyOnFailure) {
            MessageUtils.notify.error(
                error instanceof Error ? error.message : "加载系统配置失败，请稍后重试。",
                "配置加载失败"
            );
        }
        return false;
    } finally {
        loading.value = false;
    }
};

const handleSave = async () => {
    if (saving.value || editableSettings.value.length === 0) return;

    saving.value = true;
    try {
        await ConfiguredApi.batchModify({
            category: activeCategory.value,
            items: editableSettings.value.map(setting => ({
                id: setting.id,
                value: setting.value ?? "",
                remarks: setting.remarks
            }))
        });

        settings.value = settings.value.map(setting =>
            setting.type === "SECRET" ? { ...setting, value: null } : setting
        );
        const refreshed = await loadSettings(false);
        MessageUtils.notify.success(
            refreshed ? "当前分类的配置已保存。" : "配置已保存，但刷新失败，请手动刷新页面确认。",
            "保存成功"
        );
    } catch (error) {
        MessageUtils.notify.error(
            error instanceof Error ? error.message : "保存系统配置失败，请稍后重试。",
            "保存失败"
        );
    } finally {
        saving.value = false;
    }
};

onMounted(() => {
    void loadSettings();
});
</script>

<template>
    <section v-loading="loading" class="configured-page">
        <template v-if="visibleCategories.length > 0">
            <el-tabs v-model="activeCategory" class="configured-tabs">
                <el-tab-pane v-for="category in visibleCategories" :key="category.key" :name="category.key">
                    <template #label>
                        <span class="configured-tab-label">
                            <span>{{ category.label }}</span>
                            <span class="configured-tab-count">{{ settingsFor(category.key).length }}</span>
                        </span>
                    </template>

                    <div class="configured-tab-content">
                        <div class="configured-section-heading">
                            <div>
                                <h2>{{ category.label }}</h2>
                                <p>{{ category.description }}</p>
                            </div>
                            <span class="configured-section-count">{{ settingsFor(category.key).length }} 项</span>
                        </div>

                        <el-form
                            :model="settingsFor(category.key)"
                            label-position="top"
                            class="configured-form"
                            @submit.prevent>
                            <el-form-item
                                v-for="setting in settingsFor(category.key)"
                                :key="setting.id"
                                :class="{
                                    'configured-field--wide':
                                        !isNotificationChannelSetting(setting) &&
                                        (setting.type === 'SECRET' ||
                                            setting.type === 'TEXTAREA' ||
                                            setting.key === 'copyright.url')
                                }">
                                <template #label>
                                    <span>{{ setting.remarks || setting.key }}</span>
                                    <code class="configured-setting-key">{{ setting.key }}</code>
                                </template>
                                <template v-if="!setting.editable">
                                    <div class="configured-managed-value">
                                        <el-tag type="info" effect="plain">由专用配置页面或系统自动维护</el-tag>
                                    </div>
                                </template>
                                <template v-else>
                                    <div v-if="setting.type === 'BOOL'" class="configured-boolean-field">
                                        <el-switch v-model="setting.value" active-value="true" inactive-value="false" />
                                        <span>{{ setting.value === "true" ? "已启用" : "已关闭" }}</span>
                                    </div>
                                    <DictSelect
                                        v-else-if="setting.type === 'SELECT' && setting.dict_code"
                                        v-model="setting.value"
                                        class="configured-control"
                                        :dict_code="setting.dict_code"
                                        placeholder="请选择" />
                                    <el-input
                                        v-else-if="setting.type === 'SELECT'"
                                        :model-value="setting.value"
                                        class="configured-control"
                                        disabled
                                        placeholder="该配置未关联字典，无法编辑" />
                                    <div v-else-if="setting.type === 'SECRET'" class="configured-secret-field">
                                        <el-input
                                            v-model="setting.value"
                                            class="configured-control"
                                            type="password"
                                            show-password
                                            autocomplete="new-password"
                                            :placeholder="
                                                setting.key === 'user.default-password'
                                                    ? '留空则保留当前默认密码'
                                                    : '留空则保留当前秘密配置'
                                            " />
                                        <span class="configured-secret-state">
                                            {{ setting.configured ? "已设置；留空将保留当前值" : "尚未设置" }}
                                        </span>
                                    </div>
                                    <el-input
                                        v-else-if="setting.type === 'TEXT'"
                                        v-model="setting.value"
                                        class="configured-control"
                                        placeholder="请输入配置值" />
                                    <el-input
                                        v-else
                                        v-model="setting.value"
                                        class="configured-control"
                                        type="textarea"
                                        :rows="3"
                                        placeholder="请输入配置值" />
                                </template>
                            </el-form-item>
                        </el-form>
                    </div>
                </el-tab-pane>
            </el-tabs>

            <footer class="configured-actions">
                <span class="configured-save-note">当前分类 {{ editableSettings.length }} 项可编辑</span>
                <el-button
                    v-permission="'security:config:update'"
                    type="primary"
                    :loading="saving"
                    :disabled="editableSettings.length === 0"
                    @click="handleSave">
                    保存当前分类
                </el-button>
            </footer>
        </template>
        <el-empty v-else description="暂无系统配置" />
    </section>
</template>

<style scoped lang="scss">
.configured-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    box-sizing: border-box;
    padding: 16px 20px 0;
    background: var(--el-bg-color);
}

.configured-tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;

    :deep(.el-tabs__header) {
        flex: 0 0 auto;
        margin-bottom: 0;
    }

    :deep(.el-tabs__nav-wrap::after) {
        height: 1px;
        background: var(--el-border-color-lighter);
    }

    :deep(.el-tabs__content) {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
    }

    :deep(.el-tab-pane) {
        min-height: 100%;
    }
}

.configured-tab-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.configured-tab-count,
.configured-section-count {
    display: inline-flex;
    min-width: 20px;
    height: 20px;
    align-items: center;
    justify-content: center;
    padding: 0 6px;
    border-radius: 10px;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 11px;
    line-height: 1;
}

.configured-tab-content {
    padding: 22px 2px 24px;
}

.configured-section-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin: 0 2px 20px;

    h2 {
        margin: 0;
        color: var(--el-text-color-primary);
        font-size: 17px;
        font-weight: 600;
        line-height: 1.45;
    }

    p {
        margin: 5px 0 0;
        color: var(--el-text-color-secondary);
        font-size: 12px;
        line-height: 1.5;
    }
}

.configured-section-count {
    flex: 0 0 auto;
    min-width: auto;
    padding: 0 9px;
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
}

.configured-form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 16px;
    padding: 0 2px;

    :deep(.el-form-item) {
        display: flex;
        flex-direction: column;
        min-width: 0;
        margin: 0;
        padding: 14px 16px 12px;
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 8px;
        background: var(--el-fill-color-blank);
        transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease;

        &:hover {
            border-color: var(--el-border-color);
            box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
        }
    }

    :deep(.el-form-item__label) {
        display: flex;
        width: 100%;
        height: auto;
        align-items: center;
        justify-content: flex-start;
        flex-wrap: wrap;
        gap: 4px 8px;
        padding: 0 0 9px;
        color: var(--el-text-color-primary);
        font-size: 13px;
        font-weight: 600;
        line-height: 1.45;
    }

    :deep(.el-form-item__content) {
        display: block;
        min-width: 0;
        margin-left: 0 !important;
        line-height: normal;
    }
}

.configured-field--wide {
    grid-column: 1 / -1;
}

.configured-control {
    width: 100%;
}

.configured-boolean-field {
    display: inline-flex;
    min-height: 32px;
    align-items: center;
    gap: 10px;

    span {
        color: var(--el-text-color-secondary);
        font-size: 12px;
    }
}

.configured-setting-key {
    flex: 0 0 auto;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 10px;
    font-weight: 400;
    line-height: 1.5;
}

.configured-secret-state,
.configured-save-note {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.configured-secret-state {
    display: block;
    margin-top: 7px;
}

.configured-managed-value {
    display: flex;
    min-height: 32px;
    align-items: center;
}

.configured-actions {
    display: flex;
    flex: 0 0 auto;
    justify-content: flex-end;
    align-items: center;
    gap: 14px;
    min-height: 64px;
    margin-top: 8px;
    padding: 0;
    border-top: 1px solid var(--el-border-color-lighter);
}

.configured-save-note {
    margin-right: auto;
}

@media (max-width: 760px) {
    .configured-page {
        padding: 12px;
    }

    .configured-form {
        grid-template-columns: minmax(0, 1fr);
        gap: 10px;
    }

    .configured-field--wide {
        grid-column: auto;
    }

    .configured-actions {
        margin-top: 8px;
    }
}
</style>
