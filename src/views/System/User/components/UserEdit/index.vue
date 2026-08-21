<script setup lang="ts">
import { type AutocompleteData, type FormInstance, type FormRules } from "element-plus";
import { computed, onMounted, reactive, ref, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { DepartmentApi } from "@/api/user/department-api.ts";
import { UserApi } from "@/api/user/user-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import DictSelect from "@/components/DictSelect/index.vue";
import { userConverter } from "@/converter/user-converter.ts";
import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";
import { useDictStore } from "@/plugin/store/modules/use-dict-store.ts";
import { treeDefaultProps } from "@/utils/default-config.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import { email, mobile } from "@/utils/verify-rules.ts";

import RoleAssignmentEditor from "../RoleAssignmentEditor/index.vue";

interface RoleAssignmentEditorExpose {
    save: () => Promise<void>;
}

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const dictStore = useDictStore();
const userId = computed(() => String(route.params.id ?? ""));
const isEditing = computed(() => Boolean(userId.value));
const editorTitle = computed(() => (isEditing.value ? "编辑用户" : "新建用户"));
const activeStep = ref(0);
const userEditSteps = [
    { title: "基本信息", description: "填写用户基础资料" },
    { title: "角色授权", description: "配置角色和数据访问范围" }
] as const;
const form = reactive<UserForm>(
    userConverter.createForm({
        language: appStore.system.default_locale,
        timezone: appStore.system.default_timezone
    })
);
const departmentTree = ref<DepartmentTreeVO[]>([]);
const emailSuffixes = ref<string[]>([]);
const loading = ref(false);
const saving = ref(false);
const authorizationSaving = ref(false);
const formRef = useTemplateRef<FormInstance>("formRef");
const roleAssignmentEditor = useTemplateRef<RoleAssignmentEditorExpose>("roleAssignmentEditor");

const rules: FormRules<UserForm> = {
    username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
    email: [
        { required: true, message: "请输入邮箱", trigger: "blur" },
        { validator: email, trigger: "blur" }
    ],
    phone: [
        { required: true, message: "请输入手机号码", trigger: "blur" },
        { validator: mobile, trigger: "blur" }
    ],
    status: [{ required: true, message: "请选择状态", trigger: "change" }],
    language: [{ required: true, message: "请选择语言", trigger: "change" }],
    timezone: [{ required: true, message: "请选择时区", trigger: "change" }],
    department_id: [{ required: true, message: "请选择所属组织", trigger: "change" }]
};

async function load(): Promise<void> {
    loading.value = true;
    try {
        const [departments, suffixes] = await Promise.all([
            DepartmentApi.tree(),
            dictStore.getDictData("sys_email_suffix")
        ]);
        departmentTree.value = departments ?? [];
        emailSuffixes.value = (suffixes ?? []).map(item => item.value);

        if (isEditing.value) {
            Object.assign(form, userConverter.toForm(await UserApi.detail(userId.value)));
            if (route.query.step === "authorization") activeStep.value = 1;
        }
    } catch (error: unknown) {
        MessageUtils.error(error);
        if (isEditing.value) await router.push({ name: "SystemUser" });
    } finally {
        loading.value = false;
    }
}

async function handleBack(): Promise<void> {
    await router.push({ name: "SystemUser" });
}

function handleStepChange(step: number): void {
    if (step === 1 && !form.id) {
        MessageUtils.warning("请先保存用户基本信息");
        return;
    }
    activeStep.value = step;
}

async function handleUserSave(): Promise<void> {
    if (!formRef.value) return;
    saving.value = true;
    try {
        await formRef.value.validate();
        if (isEditing.value) {
            await UserApi.update(userConverter.toDTO(form));
            MessageUtils.success("修改用户成功，继续配置角色授权");
            activeStep.value = 1;
        } else {
            const createdUser = await UserApi.create(userConverter.toDTO(form));
            form.id = createdUser.id;
            await router.replace({ name: "SystemUserEdit", params: { id: createdUser.id } });
            MessageUtils.success("新增用户成功，继续配置角色授权");
            activeStep.value = 1;
        }
    } catch (error: unknown) {
        console.error(error);
        MessageUtils.error(error);
    } finally {
        saving.value = false;
    }
}

async function handleAuthorizationSave(): Promise<void> {
    if (!roleAssignmentEditor.value) return;
    authorizationSaving.value = true;
    try {
        await roleAssignmentEditor.value.save();
    } catch (error: unknown) {
        if (error !== "cancel" && error !== "close") MessageUtils.error(error);
    } finally {
        authorizationSaving.value = false;
    }
}

function handleEmailSuggestions(query: string, callback: (results: AutocompleteData) => void): void {
    if (!query) {
        callback([]);
        return;
    }

    let name = "";
    let domainPart = "";
    if (query.includes("@")) {
        [name = "", domainPart = ""] = query.split("@");
    } else {
        name = query;
    }

    if (!name) {
        callback([]);
        return;
    }

    callback(
        emailSuffixes.value
            .filter(suffix => !domainPart || suffix.includes(domainPart))
            .map(suffix => ({ value: `${name}@${suffix}` }))
    );
}

onMounted(load);
</script>

<template>
    <div v-loading="loading" class="user-edit-page">
        <div class="user-edit-shell">
            <div class="user-edit-workspace">
                <aside class="user-edit-side user-edit-side-left">
                    <nav class="user-edit-step-nav" aria-label="用户编辑步骤">
                        <button
                            v-for="(step, index) in userEditSteps"
                            :key="step.title"
                            class="user-edit-step"
                            :class="{ 'is-active': activeStep === index, 'is-complete': activeStep > index }"
                            type="button"
                            :aria-current="activeStep === index ? 'step' : undefined"
                            @click="handleStepChange(index)">
                            <span class="user-edit-step-index">{{ String(index + 1).padStart(2, "0") }}</span>
                            <span class="user-edit-step-content">
                                <strong>{{ step.title }}</strong>
                                <small>{{ step.description }}</small>
                            </span>
                        </button>
                    </nav>
                </aside>

                <section class="user-edit-section">
                    <div class="user-step-header">
                        <template v-if="activeStep === 0">
                            <div class="user-step-section-title">
                                <div>
                                    <span>基本信息</span>
                                    <small>用于登录、身份识别和组织归属，保存后进入角色授权</small>
                                </div>
                            </div>
                        </template>

                        <template v-else>
                            <div class="user-step-section-title">
                                <div>
                                    <span>角色授权</span>
                                    <small>配置当前用户的角色、权限和数据访问范围</small>
                                </div>
                            </div>
                        </template>
                    </div>

                    <div class="user-edit-content">
                        <template v-if="activeStep === 0">
                            <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" @submit.prevent>
                                <el-row :gutter="24">
                                    <el-col :span="12">
                                        <el-form-item label="名称" prop="username">
                                            <el-input v-model="form.username" clearable placeholder="请输入名称" />
                                        </el-form-item>
                                    </el-col>
                                    <el-col :span="12">
                                        <el-form-item label="真实名称" prop="real_name">
                                            <el-input v-model="form.real_name" clearable placeholder="请输入真实名称" />
                                        </el-form-item>
                                    </el-col>
                                    <el-col :span="12">
                                        <el-form-item label="状态" prop="status">
                                            <DictSelect
                                                v-model="form.status"
                                                dict_code="sys_user_state"
                                                placeholder="请选择状态" />
                                        </el-form-item>
                                    </el-col>
                                    <el-col :span="12">
                                        <el-form-item label="性别" prop="gender">
                                            <DictSelect
                                                v-model="form.gender"
                                                dict_code="sys_user_gender"
                                                placeholder="请选择性别" />
                                        </el-form-item>
                                    </el-col>
                                    <el-col :span="12">
                                        <el-form-item label="生日" prop="birthday">
                                            <el-date-picker
                                                v-model="form.birthday"
                                                type="date"
                                                placeholder="请选择生日"
                                                value-format="YYYY-MM-DD"
                                                style="width: 100%" />
                                        </el-form-item>
                                    </el-col>
                                    <el-col :span="12">
                                        <el-form-item label="手机号码" prop="phone">
                                            <el-input v-model="form.phone" clearable placeholder="请输入手机号码" />
                                        </el-form-item>
                                    </el-col>
                                    <el-col :span="12">
                                        <el-form-item label="邮箱" prop="email">
                                            <el-autocomplete
                                                v-model="form.email"
                                                :fetch-suggestions="handleEmailSuggestions"
                                                clearable
                                                placeholder="请输入邮箱">
                                                <template #suffix>
                                                    <el-tooltip
                                                        effect="dark"
                                                        content="同时也作为默认登录账号"
                                                        placement="right">
                                                        <ComponentsIcons
                                                            name="icon-hint"
                                                            style="margin-left: 10px; width: 1.4em; height: 1.4em" />
                                                    </el-tooltip>
                                                </template>
                                            </el-autocomplete>
                                        </el-form-item>
                                    </el-col>
                                    <el-col :span="12">
                                        <el-form-item label="所属组织" prop="department_id">
                                            <el-tree-select
                                                v-model="form.department_id"
                                                :data="departmentTree"
                                                node-key="id"
                                                clearable
                                                check-strictly
                                                default-expand-all
                                                :props="treeDefaultProps"
                                                placeholder="请选择所属组织" />
                                        </el-form-item>
                                    </el-col>
                                    <el-col :span="12">
                                        <el-form-item label="国家" prop="country">
                                            <el-input v-model="form.country" clearable placeholder="请输入国家" />
                                        </el-form-item>
                                    </el-col>
                                    <el-col :span="12">
                                        <el-form-item label="城市" prop="city">
                                            <el-input v-model="form.city" clearable placeholder="请输入城市" />
                                        </el-form-item>
                                    </el-col>
                                    <el-col :span="12">
                                        <el-form-item label="语言" prop="language">
                                            <DictSelect
                                                v-model="form.language"
                                                dict_code="sys_language"
                                                placeholder="请选择语言" />
                                        </el-form-item>
                                    </el-col>
                                    <el-col :span="12">
                                        <el-form-item label="时区" prop="timezone">
                                            <DictSelect
                                                v-model="form.timezone"
                                                dict_code="sys_timezone"
                                                placeholder="请选择时区" />
                                        </el-form-item>
                                    </el-col>
                                </el-row>
                            </el-form>
                        </template>

                        <template v-else-if="form.id">
                            <RoleAssignmentEditor ref="roleAssignmentEditor" :user-id="form.id" />
                        </template>

                        <el-alert
                            v-else
                            class="authorization-tip"
                            title="用户保存后可以继续配置角色授权和数据访问范围。"
                            type="info"
                            :closable="false"
                            show-icon />
                    </div>
                </section>

                <aside class="user-edit-side user-edit-side-right">
                    <div class="section-title user-heading">
                        <div>
                            <span>{{ editorTitle }}</span>
                            <small>用于维护用户身份信息并完成角色授权配置</small>
                        </div>
                        <el-text type="info">带 * 的字段为必填项</el-text>
                    </div>
                    <el-alert class="user-tip" title="授权提示" type="info" :closable="false" show-icon>
                        <template #default>
                            <div class="user-tip-content">
                                <p>
                                    每个权限都必须显式配置访问范围；向下授权范围独立管理，未配置时不会自动扩大为全部数据。
                                </p>
                                <p>
                                    <strong>快速套用授权方案：</strong>
                                    授权方案只填充当前编辑内容，不会直接创建或修改授权实例。
                                </p>
                                <p>
                                    <strong>编辑已有角色授权：</strong>
                                    可修改已有实例，或新建一个角色授权。
                                </p>
                            </div>
                        </template>
                    </el-alert>
                </aside>
            </div>

            <div class="user-edit-actions">
                <el-button @click="handleBack">取消</el-button>
                <template v-if="activeStep === 0">
                    <el-button type="primary" :loading="saving" @click="handleUserSave">保存并继续授权</el-button>
                </template>
                <template v-else>
                    <el-button @click="activeStep = 0">上一步</el-button>
                    <el-button type="primary" :loading="authorizationSaving" @click="handleAuthorizationSave">
                        预览并应用
                    </el-button>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.user-edit-page {
    height: 100%;
    min-height: 0;
    padding: 20px 32px 24px;
    overflow: hidden;
    background: var(--el-bg-color);
    box-sizing: border-box;
}

.user-edit-shell {
    display: flex;
    flex-direction: column;
    width: min(1600px, 100%);
    height: 100%;
    min-height: 0;
    margin: 0 auto;
}

.user-edit-workspace {
    display: grid;
    flex: 1 1 auto;
    grid-template-columns: max-content minmax(0, 1fr) minmax(220px, 280px);
    min-height: 0;
    gap: 24px;
}

.user-edit-side {
    min-width: 0;
    padding-top: 4px;
}

.user-edit-side-left {
    grid-column: 1;
    width: max-content;
    max-width: 240px;
}

.user-edit-side-right {
    grid-column: 3;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.user-edit-section {
    grid-column: 2;
    grid-row: 1;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    background: var(--el-bg-color);
}

.user-step-header {
    flex: 0 0 auto;
    min-height: 0;
}

.user-edit-content {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0 4px 12px;
    overflow-y: auto;
    scrollbar-gutter: stable;
}

.user-edit-step-nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 1px solid var(--el-border-color-extra-light);
    border-radius: 12px;
    background: var(--el-fill-color-lighter);
}

.user-edit-step {
    display: flex;
    align-items: flex-start;
    width: 100%;
    gap: 12px;
    padding: 12px;
    border: 0;
    border-radius: 8px;
    outline: none;
    background: transparent;
    color: var(--el-text-color-secondary);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
        background-color 0.2s ease,
        color 0.2s ease,
        box-shadow 0.2s ease;
}

.user-edit-step:hover {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
}

.user-edit-step:focus-visible {
    box-shadow: 0 0 0 2px var(--el-color-primary-light-5);
}

.user-edit-step.is-active {
    background: var(--el-bg-color);
    color: var(--el-text-color-primary);
    box-shadow: 0 4px 12px rgb(15 23 42 / 6%);
}

.user-edit-step-index {
    display: inline-flex;
    flex: 0 0 30px;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    line-height: 1;
}

.user-edit-step.is-active .user-edit-step-index,
.user-edit-step.is-complete .user-edit-step-index {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
}

.user-edit-step-content {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
    padding-top: 1px;
}

.user-edit-step-content strong {
    color: inherit;
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
}

.user-edit-step-content small {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 18px;
}

.section-title,
.user-edit-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.section-title {
    justify-content: space-between;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.section-title > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.section-title span {
    color: var(--el-text-color-primary);
    font-size: 16px;
    font-weight: 600;
}

.section-title small {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    font-weight: 400;
}

.user-step-section-title {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.user-step-section-title > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.user-step-section-title span {
    color: var(--el-text-color-primary);
    font-size: 16px;
    font-weight: 600;
}

.user-step-section-title small {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.user-heading {
    align-items: flex-start;
    flex-direction: column;
    margin: 0;
    padding: 14px 16px;
    border: 1px solid var(--el-border-color-extra-light);
    border-left: 3px solid var(--el-color-primary-light-5);
    border-radius: 0 10px 10px 0;
    background: var(--el-fill-color-light);
}

.user-tip {
    flex: 0 0 auto;
    align-items: flex-start;
    padding: 14px 16px;
    border: 1px solid var(--el-color-info-light-7);
    border-radius: 10px;
    background: var(--el-color-info-light-9);
}

.user-tip :deep(.el-alert__icon) {
    flex: 0 0 auto;
    margin-top: 2px;
}

.user-tip :deep(.el-alert__content) {
    min-width: 0;
    gap: 4px;
}

.user-tip :deep(.el-alert__title) {
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
}

.user-tip :deep(.el-alert__description) {
    color: var(--el-text-color-regular);
    font-size: 12px;
    line-height: 1.7;
}

.user-tip-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--el-text-color-regular);
    font-size: 12px;
    line-height: 1.7;
}

.user-tip-content p {
    margin: 0;
}

.user-tip-content strong {
    color: var(--el-text-color-primary);
    font-weight: 600;
}

.authorization-tip {
    margin-bottom: 18px;
    border-radius: 10px;
}

.user-edit-actions {
    flex: 0 0 auto;
    width: 100%;
    margin: 0 auto;
    justify-content: flex-end;
    padding: 16px 0 4px;
    border-top: 1px solid var(--el-border-color-lighter);
}

.user-edit-actions .el-button {
    min-width: 88px;
}

:deep(.el-form-item) {
    margin-bottom: 22px;
}

:deep(.el-input),
:deep(.el-select),
:deep(.el-autocomplete),
:deep(.el-tree-select) {
    width: 100%;
}

@media (max-width: 1200px) {
    .user-edit-workspace {
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow: hidden;
    }

    .user-edit-side {
        flex: 0 0 auto;
        padding-top: 0;
    }

    .user-edit-side-left {
        order: 0;
    }

    .user-edit-step-nav {
        flex-direction: row;
    }

    .user-edit-step {
        flex: 1;
    }

    .user-edit-section {
        order: 1;
        min-height: 0;
    }

    .user-edit-side-right {
        order: 2;
    }
}

@media (max-width: 768px) {
    .user-edit-page {
        padding: 20px 16px 24px;
    }

    .section-title {
        align-items: flex-start;
        flex-direction: column;
    }

    .user-edit-step-nav {
        padding: 6px;
    }

    .user-edit-step {
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 8px;
    }

    .user-edit-step-content small {
        display: none;
    }

    :deep(.el-col) {
        width: 100%;
        max-width: 100%;
        flex: 0 0 100%;
    }
}
</style>
