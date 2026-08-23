<script setup lang="ts">
import { type AutocompleteData, type FormInstance, type FormRules } from "element-plus";
import { computed, onMounted, reactive, ref, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { DepartmentApi } from "@/api/user/department-api.ts";
import { UserApi } from "@/api/user/user-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import DictSelect from "@/components/DictSelect/index.vue";
import StepNavigation from "@/components/StepNavigation/index.vue";
import type { StepNavigationItem } from "@/components/StepNavigation/types.ts";
import { userConverter } from "@/converter/user-converter.ts";
import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";
import { useDictStore } from "@/plugin/store/modules/use-dict-store.ts";
import { treeDefaultProps } from "@/utils/default-config.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import { email, mobile } from "@/utils/verify-rules.ts";

import RoleAssignmentEditor from "../RoleAssignmentEditor/index.vue";

interface RoleAssignmentEditorExpose {
    validateSelection: () => Promise<boolean>;
    validateCurrent: () => boolean;
    validate: () => boolean;
    getRequest: () => AuthorizationAssignmentsChange;
    getRoleSteps: () => RoleAssignmentStep[];
    selectRole: (key: string) => void;
}

type RoleAssignmentStep = {
    key: string;
    name: string;
    code: string;
};

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const dictStore = useDictStore();
const userId = computed(() => String(route.params.id ?? ""));
const isEditing = computed(() => Boolean(userId.value));
const editorTitle = computed(() => (isEditing.value ? "编辑用户" : "新建用户"));
const activeStep = ref(0);
const stepTipTitle = computed(() => {
    if (activeStep.value === 0) return "基本信息提示";
    if (activeStep.value === 1) return "授权方案提示";
    return "角色授权提示";
});
const userEditSteps = computed<StepNavigationItem[]>(() => [
    { key: "0", title: "基本信息", description: "填写用户基础资料", complete: activeStep.value > 0 },
    { key: "1", title: "授权方案", description: "选择方案或新增多个角色", complete: activeStep.value > 1 },
    {
        key: "2",
        title: "角色授权",
        description: "分别配置每个角色的访问范围",
        children: roleSteps.value.map(roleStep => ({
            key: roleStep.key,
            title: `${roleStep.name}设置`,
            description: roleStep.code
        }))
    }
]);
const userStatusOptions: Array<{ label: string; value: UserStatus }> = [
    { label: "正常", value: "ACTIVE" },
    { label: "锁定", value: "LOCKED" },
    { label: "禁用", value: "DISABLED" },
    { label: "离职", value: "DEPARTED" }
];
const form = reactive<UserForm>(
    userConverter.createForm({
        language: appStore.system.default_locale,
        timezone: appStore.system.default_timezone
    })
);
const departmentTree = ref<DepartmentTreeVO[]>([]);
const emailSuffixes = ref<string[]>([]);
const loading = ref(false);
const submitting = ref(false);
const roleSteps = ref<RoleAssignmentStep[]>([]);
const activeRoleStepKey = ref("");
const activeRoleStepIndex = computed(() => roleSteps.value.findIndex(step => step.key === activeRoleStepKey.value));
const roleStepActionLabel = computed(() =>
    activeRoleStepIndex.value >= 0 && activeRoleStepIndex.value < roleSteps.value.length - 1 ? "下一步" : "提交"
);
const formRef = useTemplateRef<FormInstance>("formRef");
const roleAssignmentEditor = useTemplateRef<RoleAssignmentEditorExpose>("roleAssignmentEditor");

const rules: FormRules<UserForm> = {
    employee_no: [{ required: true, message: "请输入工号", trigger: "blur" }],
    real_name: [{ required: true, message: "请输入姓名", trigger: "blur" }],
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

async function validateBasicForm(): Promise<boolean> {
    if (!formRef.value) return false;
    try {
        await formRef.value.validate();
        return true;
    } catch {
        return false;
    }
}

async function handleStepChange(step: number): Promise<void> {
    if (step > 0 && activeStep.value === 0 && !(await validateBasicForm())) return;
    if (step > 1 && (!roleAssignmentEditor.value || !(await roleAssignmentEditor.value.validateSelection()))) return;
    if (step === 2 && roleAssignmentEditor.value) {
        activeRoleStepKey.value = roleAssignmentEditor.value.getRoleSteps()[0]?.key ?? "";
        roleAssignmentEditor.value.selectRole(activeRoleStepKey.value);
    }
    activeStep.value = step;
}

function handleStepNavigation(key: string): void {
    void handleStepChange(Number(key));
}

function handleRoleStepsChange(steps: RoleAssignmentStep[]): void {
    roleSteps.value = steps;
    if (!steps.some(step => step.key === activeRoleStepKey.value)) {
        activeRoleStepKey.value = steps[0]?.key ?? "";
    }
}

function handleRoleStepChange(key: string): void {
    activeRoleStepKey.value = key;
    roleAssignmentEditor.value?.selectRole(key);
}

function handleRoleStepPrevious(): void {
    if (activeRoleStepIndex.value > 0) {
        handleRoleStepChange(roleSteps.value[activeRoleStepIndex.value - 1].key);
        return;
    }
    activeStep.value = 1;
}

async function handleRoleStepNext(): Promise<void> {
    if (!roleAssignmentEditor.value || activeRoleStepIndex.value < 0) return;
    if (!roleAssignmentEditor.value.validateCurrent()) return;

    const nextRoleStep = roleSteps.value[activeRoleStepIndex.value + 1];
    if (nextRoleStep) {
        handleRoleStepChange(nextRoleStep.key);
        return;
    }
    await handleSubmit();
}

async function handleSubmit(): Promise<void> {
    if (!roleAssignmentEditor.value) return;
    if (formRef.value && !(await validateBasicForm())) return;
    if (!roleAssignmentEditor.value.validate()) return;
    submitting.value = true;
    try {
        const params: UserOnboardingDTO = {
            user: userConverter.toDTO(form),
            authorization: roleAssignmentEditor.value.getRequest()
        };
        if (isEditing.value) {
            await UserApi.submitUpdate(params);
            MessageUtils.success("用户信息和角色授权已提交");
        } else {
            await UserApi.submitCreate(params);
            MessageUtils.success("用户和角色授权已提交");
        }
        await router.replace({ name: "SystemUser" });
    } catch (error: unknown) {
        MessageUtils.error(error);
    } finally {
        submitting.value = false;
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
                    <StepNavigation
                        :items="userEditSteps"
                        :active-key="String(activeStep)"
                        :active-child-key="activeRoleStepKey"
                        aria-label="用户编辑步骤"
                        @select="handleStepNavigation"
                        @select-child="handleRoleStepChange" />
                </aside>

                <section class="user-edit-section">
                    <div class="user-step-header">
                        <template v-if="activeStep === 0">
                            <div class="user-step-section-title">
                                <div>
                                    <span>基本信息</span>
                                    <small>用于登录、身份识别和组织归属，点击下一步后继续配置授权</small>
                                </div>
                            </div>
                        </template>

                        <template v-else>
                            <div v-if="activeStep === 1" class="user-step-section-title">
                                <div>
                                    <span>授权方案</span>
                                    <small>选择快速套用授权方案，或新增多个角色，下一步逐个配置访问范围</small>
                                </div>
                            </div>
                            <div v-else class="user-step-section-title">
                                <div>
                                    <span>角色授权</span>
                                    <small>分别配置每个角色的权限和数据访问范围，完成后统一提交</small>
                                </div>
                            </div>
                        </template>
                    </div>

                    <div class="user-edit-content">
                        <el-form
                            v-show="activeStep === 0"
                            ref="formRef"
                            :model="form"
                            :rules="rules"
                            label-width="100px"
                            @submit.prevent>
                            <el-row :gutter="24">
                                <el-col :span="12">
                                    <el-form-item label="工号" prop="employee_no">
                                        <el-input v-model="form.employee_no" clearable placeholder="请输入工号" />
                                    </el-form-item>
                                </el-col>
                                <el-col :span="12">
                                    <el-form-item label="姓名" prop="real_name">
                                        <el-input v-model="form.real_name" clearable placeholder="请输入姓名" />
                                    </el-form-item>
                                </el-col>
                                <el-col :span="12">
                                    <el-form-item label="状态" prop="status">
                                        <el-select v-model="form.status" clearable placeholder="请选择状态">
                                            <el-option
                                                v-for="option in userStatusOptions"
                                                :key="option.value"
                                                :label="option.label"
                                                :value="option.value" />
                                        </el-select>
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

                        <template v-if="activeStep !== 0">
                            <div
                                v-if="form.id || !isEditing"
                                v-show="activeStep !== 0"
                                class="authorization-editor-wrapper">
                                <RoleAssignmentEditor
                                    ref="roleAssignmentEditor"
                                    :user-id="form.id || undefined"
                                    :stage="activeStep === 1 ? 'selection' : 'details'"
                                    @roles-change="handleRoleStepsChange" />
                            </div>
                        </template>
                    </div>
                </section>

                <aside class="user-edit-side user-edit-side-right">
                    <div class="section-title user-heading">
                        <div>
                            <span>{{ editorTitle }}</span>
                            <small>填写所有步骤后一次提交用户资料和角色授权</small>
                        </div>
                        <el-text type="info">带 * 的字段为必填项</el-text>
                    </div>
                    <el-alert class="user-tip" :title="stepTipTitle" type="info" :closable="false" show-icon>
                        <template #default>
                            <div class="user-tip-content">
                                <template v-if="activeStep === 0">
                                    <p>
                                        请先完成
                                        <strong>用户登录、身份和组织归属信息</strong>
                                        ，点击下一步后进入授权方案。
                                    </p>
                                    <p>
                                        <strong>用户资料和角色授权会在最后一次提交</strong>
                                        ，不会在步骤切换时提前保存。
                                    </p>
                                </template>
                                <template v-else-if="activeStep === 1">
                                    <p>
                                        可以快速
                                        <strong>套用授权方案</strong>
                                        ，也可以
                                        <strong>新增多个角色</strong>
                                        ；已有角色会自动加载到当前页面。
                                    </p>
                                    <p>
                                        角色的新增、套用和移除都在本步骤完成，
                                        <strong>至少保留一个角色</strong>
                                        后才能进入下一步。
                                    </p>
                                    <p>
                                        如果方案中的角色已经存在当前用户，系统会
                                        <strong>跳过</strong>
                                        并提示具体角色名称。
                                    </p>
                                </template>
                                <template v-else>
                                    <p>
                                        左侧会按角色显示
                                        <strong>3.1、3.2 等子节点</strong>
                                        ，点击节点切换对应角色的授权配置。
                                    </p>
                                    <p>
                                        当前步骤只配置
                                        <strong>权限访问范围</strong>
                                        ；如需新增或移除角色，请返回
                                        <strong>第 02 步</strong>
                                        处理。
                                    </p>
                                    <p>
                                        每个权限都必须
                                        <strong>显式配置访问范围</strong>
                                        ，向下授权范围也需要单独配置。
                                    </p>
                                </template>
                            </div>
                        </template>
                    </el-alert>
                </aside>
            </div>

            <div class="user-edit-actions">
                <el-button @click="handleBack">取消</el-button>
                <template v-if="activeStep < 2">
                    <el-button v-if="activeStep > 0" @click="handleStepChange(activeStep - 1)">上一步</el-button>
                    <el-button type="primary" @click="handleStepChange(activeStep + 1)">下一步</el-button>
                </template>
                <template v-else>
                    <el-button @click="handleRoleStepPrevious">
                        {{ activeRoleStepIndex > 0 ? "上一个角色" : "上一步" }}
                    </el-button>
                    <el-button type="primary" :loading="submitting" @click="handleRoleStepNext">
                        {{ roleStepActionLabel }}
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

    :deep(.el-col) {
        width: 100%;
        max-width: 100%;
        flex: 0 0 100%;
    }
}
</style>
