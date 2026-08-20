<script setup lang="ts">
import { type FormInstance, type FormRules } from "element-plus";
import { computed, onMounted, reactive, ref, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { initCrypto } from "@/api/system/crypto-api.ts";
import { SystemGuideApi } from "@/api/system/system-guide-api.ts";
import DictSelect from "@/components/DictSelect/index.vue";
import DictTag from "@/components/DictTag/index.vue";
import RegionSelectLazy from "@/components/RegionSelectLazy/index.vue";
import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";
import { useCryptoStore } from "@/plugin/store/modules/use-crypto-store.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const cryptoStore = useCryptoStore();
const loading = ref(true);
const submitting = ref(false);
const currentStep = ref(0);
const form = reactive<SystemGuideCompleteFrom>({
    root_department_name: appStore.system.name || "Spectra",
    root_department_region_id: "",
    root_department_region_name: "",
    root_department_type: undefined,
    crypto_enabled: cryptoStore.enabled,
    notification_enabled: true,
    copyright_enabled: appStore.system.copyright_enabled,
    copyright_name: appStore.system.copyright_name || "devops00",
    copyright_url: appStore.system.copyright_url || "https://www.devops00.com"
});

const steps = [
    { title: "组织机构", description: "设置根部门" },
    { title: "接口安全", description: "配置请求加解密" },
    { title: "通知中心", description: "配置统一通知模块" },
    { title: "底部版权", description: "配置页脚显示" },
    { title: "完成设置", description: "确认并提交配置" }
];

const isLastStep = computed(() => currentStep.value === steps.length - 1);
const rootDepartmentFormRef = useTemplateRef<FormInstance>("rootDepartmentFormRef");
const copyrightFormRef = useTemplateRef<FormInstance>("copyrightFormRef");
const rootDepartmentRules: FormRules<SystemGuideCompleteFrom> = {
    root_department_name: [{ required: true, message: "请输入根部门名称", trigger: "blur" }],
    root_department_region_id: [{ required: true, message: "请选择根部门所属区域", trigger: "change" }],
    root_department_type: [{ required: true, message: "请选择根部门类型", trigger: "change" }]
};
const copyrightRules: FormRules<SystemGuideCompleteFrom> = {
    copyright_name: [{ required: true, message: "请输入底部版权名称", trigger: "blur" }],
    copyright_url: [{ required: true, message: "请输入底部版权跳转地址", trigger: "blur" }]
};

const safeRedirect = () => {
    const target = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    return target.startsWith("/") && !target.startsWith("//") ? target : "/";
};

const loadStatus = async () => {
    try {
        const status = await SystemGuideApi.status();
        appStore.setSystemGuideStatus(status);
        if (!status.required) {
            await router.replace(safeRedirect());
        }
    } catch (error) {
        console.error("加载系统设置引导状态失败:", error);
        MessageUtils.error("系统设置引导状态加载失败，请刷新后重试");
    } finally {
        loading.value = false;
    }
};

const nextStep = async () => {
    if (currentStep.value === 0) {
        const valid = await rootDepartmentFormRef.value?.validate().catch(() => false);
        if (!valid) return;
        const name = form.root_department_name.trim();
        if (!name) {
            MessageUtils.error("请输入根部门名称");
            return;
        }
        form.root_department_name = name;
    }
    if (currentStep.value === 3 && form.copyright_enabled) {
        const valid = await copyrightFormRef.value?.validate().catch(() => false);
        if (!valid) return;
        form.copyright_name = form.copyright_name.trim();
        form.copyright_url = form.copyright_url.trim();
        if (!isHttpUrl(form.copyright_url)) {
            MessageUtils.error("请输入有效的 HTTP/HTTPS 跳转地址");
            return;
        }
    }
    if (!isLastStep.value) {
        currentStep.value += 1;
    }
};

const isHttpUrl = (value: string) => {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
};

const previousStep = () => {
    if (currentStep.value > 0) {
        currentStep.value -= 1;
    }
};

const completeGuide = async () => {
    if (submitting.value) return;
    submitting.value = true;
    try {
        await SystemGuideApi.complete(form);
        await initCrypto();
        appStore.setCopyrightConfig({
            copyright_enabled: form.copyright_enabled,
            copyright_name: form.copyright_name,
            copyright_url: form.copyright_url
        });
        appStore.setSystemGuideStatus({ state: "COMPLETED", completed: true, required: false });
        MessageUtils.success("系统设置已完成");
        await router.replace(safeRedirect());
    } catch (error) {
        console.error("完成系统设置引导失败:", error);
        MessageUtils.error("系统设置保存失败，请检查后重试");
    } finally {
        submitting.value = false;
    }
};

onMounted(async () => {
    await loadStatus();
});
</script>

<template>
    <div v-loading="loading" class="guide-page">
        <div class="guide-shell">
            <header class="guide-header">
                <div class="guide-heading">
                    <div class="guide-meta">
                        <span class="guide-eyebrow">WELCOME TO {{ appStore.system.name || "SPECTRA" }}</span>
                        <el-tag type="warning" effect="plain">DEV_OPS 必填</el-tag>
                    </div>
                    <h1>完成系统设置</h1>
                    <p>完成基础运行策略配置后，即可进入管理首页。</p>
                    <el-alert
                        class="guide-alert"
                        title="这些设置会保存到系统配置中"
                        description="完成后才可以进入管理首页。启用相关模块时，系统会自动生成所需密钥，不需要再配置对应环境变量。"
                        type="info"
                        :closable="false"
                        show-icon />
                </div>
            </header>

            <div class="guide-progress" aria-label="系统设置引导进度">
                <el-steps :active="currentStep" finish-status="success" process-status="process" align-center>
                    <el-step
                        v-for="step in steps"
                        :key="step.title"
                        :title="step.title"
                        :description="step.description" />
                </el-steps>
            </div>

            <main class="guide-content">
                <section v-if="currentStep === 0" class="setting-panel">
                    <el-form
                        ref="rootDepartmentFormRef"
                        class="root-department-form"
                        :model="form"
                        :rules="rootDepartmentRules"
                        label-position="top"
                        @submit.prevent>
                        <div class="setting-icon organization-icon">O</div>
                        <div class="setting-copy">
                            <div class="setting-title">初始化根部门</div>
                            <div class="setting-description">
                                根部门是系统组织架构的顶层节点，DEV_OPS 用户将自动设置为该部门的主成员。
                            </div>
                            <div class="root-department-fields">
                                <el-form-item label="名称" prop="root_department_name">
                                    <el-input
                                        v-model="form.root_department_name"
                                        maxlength="100"
                                        show-word-limit
                                        clearable
                                        placeholder="请输入根部门名称" />
                                </el-form-item>
                                <el-form-item label="区域" prop="root_department_region_id">
                                    <RegionSelectLazy
                                        v-model="form.root_department_region_id"
                                        v-model:name="form.root_department_region_name" />
                                </el-form-item>
                                <el-form-item label="类型" prop="root_department_type">
                                    <DictSelect
                                        v-model="form.root_department_type"
                                        dict_code="sys_organization_type"
                                        placeholder="请选择根部门类型" />
                                </el-form-item>
                            </div>
                        </div>
                    </el-form>
                </section>

                <section v-else-if="currentStep === 1" class="setting-panel">
                    <div class="setting-icon security-icon">S</div>
                    <div class="setting-copy">
                        <div class="setting-title">接口请求加解密</div>
                        <div class="setting-description">
                            启用后，系统自动生成服务端和客户端 RSA 密钥，用于接口请求与响应的加解密。
                        </div>
                    </div>
                    <el-switch
                        v-model="form.crypto_enabled"
                        class="setting-switch"
                        :width="72"
                        active-text="启用"
                        inactive-text="关闭" />
                </section>

                <section v-else-if="currentStep === 2" class="setting-panel">
                    <div class="setting-icon notification-icon">N</div>
                    <div class="setting-copy">
                        <div class="setting-title">统一通知模块</div>
                        <div class="setting-description">
                            启用站内通知及后续外部渠道能力。系统会自动生成通知地址和敏感载荷的 AES-GCM 密钥。
                        </div>
                    </div>
                    <el-switch
                        v-model="form.notification_enabled"
                        class="setting-switch"
                        :width="72"
                        active-text="启用"
                        inactive-text="关闭" />
                </section>

                <section v-else-if="currentStep === 3" class="setting-panel">
                    <div class="setting-icon copyright-icon">C</div>
                    <div class="setting-copy">
                        <div class="setting-title">底部版权</div>
                        <div class="setting-description">
                            设置管理页面底部是否显示版权信息，以及版权名称和点击跳转地址。
                        </div>
                        <el-form
                            v-if="form.copyright_enabled"
                            ref="copyrightFormRef"
                            class="copyright-form"
                            :model="form"
                            :rules="copyrightRules"
                            label-position="top"
                            @submit.prevent>
                            <div class="copyright-fields">
                                <el-form-item label="版权名称" prop="copyright_name">
                                    <el-input
                                        v-model="form.copyright_name"
                                        maxlength="100"
                                        show-word-limit
                                        clearable
                                        placeholder="例如：devops00" />
                                </el-form-item>
                                <el-form-item label="点击跳转地址" prop="copyright_url">
                                    <el-input
                                        v-model="form.copyright_url"
                                        maxlength="500"
                                        clearable
                                        placeholder="https://www.example.com" />
                                </el-form-item>
                            </div>
                        </el-form>
                    </div>
                    <el-switch
                        v-model="form.copyright_enabled"
                        class="setting-switch"
                        :width="72"
                        active-text="启用"
                        inactive-text="关闭" />
                </section>

                <section v-else class="review-panel">
                    <div class="review-heading">
                        <div class="review-check">✓</div>
                        <div>
                            <div class="setting-title">配置已填写完成</div>
                            <div class="setting-description">请确认以下配置，提交后系统将保存设置并进入管理首页。</div>
                        </div>
                    </div>
                    <div class="review-list">
                        <div class="review-item">
                            <span>根部门</span>
                            <el-tag type="success" effect="plain">{{ form.root_department_name }}</el-tag>
                        </div>
                        <div class="review-item">
                            <span>根部门区域</span>
                            <el-tag type="success" effect="plain">{{ form.root_department_region_name }}</el-tag>
                        </div>
                        <div class="review-item">
                            <span>根部门类型</span>
                            <DictTag
                                v-if="form.root_department_type !== undefined"
                                v-model="form.root_department_type"
                                dict_code="sys_organization_type" />
                        </div>
                        <div class="review-item">
                            <span>接口请求加解密</span>
                            <el-tag :type="form.crypto_enabled ? 'success' : 'info'" effect="plain">
                                {{ form.crypto_enabled ? "启用" : "关闭" }}
                            </el-tag>
                        </div>
                        <div class="review-item">
                            <span>统一通知模块</span>
                            <el-tag :type="form.notification_enabled ? 'success' : 'info'" effect="plain">
                                {{ form.notification_enabled ? "启用" : "关闭" }}
                            </el-tag>
                        </div>
                        <div class="review-item">
                            <span>底部版权</span>
                            <el-tag :type="form.copyright_enabled ? 'success' : 'info'" effect="plain">
                                {{ form.copyright_enabled ? `${form.copyright_name}（启用）` : "关闭" }}
                            </el-tag>
                        </div>
                        <div v-if="form.copyright_enabled" class="review-item">
                            <span>版权跳转地址</span>
                            <el-link :href="form.copyright_url" target="_blank" rel="noopener noreferrer">
                                {{ form.copyright_url }}
                            </el-link>
                        </div>
                    </div>
                </section>
            </main>

            <footer class="guide-actions">
                <el-button v-if="currentStep > 0" :disabled="submitting" @click="previousStep">上一步</el-button>
                <span class="action-spacer" />
                <el-button v-if="!isLastStep" type="primary" @click="nextStep">下一步</el-button>
                <el-button v-else type="primary" :loading="submitting" @click="completeGuide">
                    提交保存并进入系统
                </el-button>
            </footer>
        </div>
    </div>
</template>

<style scoped lang="scss">
.guide-page {
    box-sizing: border-box;
    width: 100%;
    height: 100vh;
    min-height: 100vh;
    padding: clamp(28px, 5vw, 64px) clamp(20px, 6vw, 96px);
    overflow: hidden;
    background:
        radial-gradient(circle at 15% 15%, rgb(59 130 246 / 18%), transparent 36%),
        radial-gradient(circle at 85% 85%, rgb(14 165 233 / 14%), transparent 36%), var(--el-bg-color-page);
}

.guide-shell {
    box-sizing: border-box;
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    width: min(1160px, 100%);
    height: 100%;
    min-height: 0;
    min-width: 0;
    margin: 0 auto;
}

.guide-header,
.guide-actions,
.review-heading,
.review-item {
    display: flex;
    align-items: center;
}

.guide-header {
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 28px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.guide-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-width: 0;
    gap: 12px;
}

.guide-heading {
    min-width: 0;
    flex: 1;
}

.guide-eyebrow {
    display: block;
    min-width: 0;
    color: var(--el-color-primary);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.guide-meta :deep(.el-tag) {
    flex: 0 0 auto;
}

h1 {
    margin: 0;
    color: var(--el-text-color-primary);
    font-size: 26px;
}

.guide-header p {
    margin: 8px 0 0;
    color: var(--el-text-color-secondary);
    overflow-wrap: anywhere;
}

.guide-progress {
    max-width: 100%;
    margin: 30px 0 0;
    padding: 0 4px 28px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    overflow: hidden;
}

.guide-progress :deep(.el-steps) {
    min-width: 0;
}

.guide-progress :deep(.el-step__title),
.guide-progress :deep(.el-step__description) {
    overflow-wrap: anywhere;
}

.guide-alert {
    max-width: 100%;
    margin-top: 16px;
}

.guide-content {
    box-sizing: border-box;
    min-width: 0;
    min-height: 0;
    padding: 52px clamp(0px, 4vw, 56px) 40px;
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-gutter: stable;
}

.setting-panel,
.review-panel {
    box-sizing: border-box;
    min-width: 0;
    padding: 0;
}

.setting-panel {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: start;
    gap: 20px;
}

.root-department-form {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: flex-start;
    width: 100%;
    min-width: 0;
    gap: 20px;
}

.setting-icon,
.review-check {
    display: grid;
    flex: 0 0 48px;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    font-size: 20px;
    font-weight: 800;
}

.security-icon {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
}

.organization-icon {
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);
}

.notification-icon {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
}

.copyright-icon {
    color: var(--el-color-info);
    background: var(--el-color-info-light-9);
}

.setting-copy {
    min-width: 0;
    flex: 1;
}

.setting-title {
    color: var(--el-text-color-primary);
    font-size: 18px;
    font-weight: 700;
}

.setting-description {
    margin-top: 10px;
    color: var(--el-text-color-secondary);
    line-height: 1.7;
    overflow-wrap: anywhere;
}

.root-department-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 18px;
}

.root-department-fields :deep(.el-form-item:first-child) {
    grid-column: 1 / -1;
}

.root-department-fields :deep(.el-form-item) {
    min-width: 0;
    margin-bottom: 0;
}

.copyright-form {
    width: 100%;
    margin-top: 18px;
}

.copyright-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.copyright-fields :deep(.el-form-item) {
    min-width: 0;
    margin-bottom: 0;
}

.setting-switch {
    flex: 0 0 auto;
    max-width: 100%;
    white-space: nowrap;
}

.review-heading {
    gap: 16px;
}

.review-check {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
}

.review-list {
    display: grid;
    gap: 12px;
    margin-top: 28px;
}

.review-item {
    justify-content: space-between;
    gap: 16px;
    min-width: 0;
    padding: 14px 16px;
    color: var(--el-text-color-primary);
    background: var(--el-bg-color);
    border-radius: 10px;
}

.review-item > span {
    min-width: 0;
    overflow-wrap: anywhere;
}

.guide-actions {
    gap: 12px;
    min-width: 0;
    flex: 0 0 auto;
    margin-top: 0;
    padding-top: 24px;
    border-top: 1px solid var(--el-border-color-lighter);
}

.action-spacer {
    flex: 1;
}

@media (max-width: 600px) {
    .guide-page {
        padding: 24px 16px;
    }

    .guide-header {
        align-items: flex-start;
        flex-direction: column;
    }

    .guide-progress {
        margin-bottom: 20px;
    }

    .guide-content {
        min-height: 0;
        padding: 36px 0 28px;
    }

    .setting-panel {
        grid-template-columns: auto minmax(0, 1fr);
        align-items: flex-start;
    }

    .root-department-form {
        grid-template-columns: auto minmax(0, 1fr);
    }

    .root-department-fields {
        grid-template-columns: minmax(0, 1fr);
    }

    .root-department-fields :deep(.el-form-item:first-child) {
        grid-column: auto;
    }

    .copyright-fields {
        grid-template-columns: minmax(0, 1fr);
    }

    .setting-switch {
        grid-column: 2;
        justify-self: start;
        margin-top: 4px;
    }

    .guide-actions {
        padding: 16px 0 4px;
        background: var(--el-bg-color-page);
    }
}
</style>
