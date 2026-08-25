<script setup lang="ts">
import { type FormInstance, type FormRules } from "element-plus";
import { computed, nextTick, onMounted, reactive, ref, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AuthorityApi } from "@/api/auth/authority-api.ts";
import { AuthorizationApi } from "@/api/auth/authorization-api.ts";
import { RoleApi } from "@/api/auth/role-api.ts";
import { DepartmentApi } from "@/api/user/department-api.ts";
import StepNavigation from "@/components/StepNavigation/index.vue";
import type { StepNavigationItem } from "@/components/StepNavigation/types.ts";
import { treeDefaultProps } from "@/utils/default-config.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

type ScopeMode = AuthorizationProfileScope["mode"];
type ProfileScopeDraft = AuthorizationProfileScope;
type ProfileBoundaryDraft = AuthorizationProfileBoundary;
type ProfileAssignmentDraft = AuthorizationProfileAssignment & {
    permission_to_add: string[];
    selected_permissions: string[];
    batch_access: ProfileScopeDraft;
    batch_grant_configured: boolean;
    batch_grant_enabled: boolean;
    batch_grant: ProfileScopeDraft;
};
type ProfileForm = Omit<AuthorizationProfileSave, "assignments"> & {
    assignments: ProfileAssignmentDraft[];
};

const route = useRoute();
const router = useRouter();
const formRef = useTemplateRef<FormInstance>("formRef");
const roles = ref<RolePageVO[]>([]);
const authorityTree = ref<AuthorityTree[]>([]);
const departmentTree = ref<DepartmentTreeVO[]>([]);
const roleAuthorizations = ref<Record<string, RoleAuthorizationState>>({});
const loading = ref(false);
const saving = ref(false);
const roleSelectionLoading = ref(false);
const stepLoading = ref(false);
const currentStep = ref(0);
const profileEditSteps = computed<StepNavigationItem[]>(() => [
    { key: "0", title: "基本信息", description: "填写方案基本资料", complete: currentStep.value > 0 },
    { key: "1", title: "选择角色", description: "选择一个或多个角色", complete: currentStep.value > 1 },
    {
        key: "2",
        title: "权限范围设置",
        description: "配置每个角色的权限范围",
        children: form.assignments.map(assignment => ({
            key: assignment.role_code,
            title: `${roleName(assignment.role_code)}设置`,
            description: assignment.role_code
        }))
    }
]);
const selectedRoleCodes = ref<string[]>([]);
const form = reactive<ProfileForm>(createForm());
const currentAssignmentIndex = ref(0);
const currentAssignments = computed(() => {
    const assignment = form.assignments[currentAssignmentIndex.value];
    return assignment ? [assignment] : [];
});

const DEFAULT_USER_ROLE_CODE = "ROLE_USER";

const editingId = computed(() => String(route.params.id ?? ""));
const editorTitle = computed(() => (editingId.value ? "编辑授权方案" : "新建授权方案"));
const permissionCatalog = computed(() => flattenPermissions(authorityTree.value));
const activeRoles = computed(() => roles.value.filter(role => role.state && role.code !== DEFAULT_USER_ROLE_CODE));

const scopeModeOptions: { value: ScopeMode; label: string }[] = [
    { value: "NONE", label: "NONE（仅能力，不限定数据范围）" },
    { value: "ALL", label: "ALL（显式全范围）" },
    { value: "SELF", label: "SELF（仅当前主体数据）" },
    { value: "RULES", label: "RULES（按组织规则）" }
];

const rules: FormRules<ProfileForm> = {
    code: [
        { required: true, message: "请输入方案编码", trigger: "blur" },
        { pattern: /^PROFILE_[A-Z0-9_]+$/, message: "方案编码格式必须为 PROFILE_*", trigger: "blur" }
    ],
    name: [
        { required: true, message: "请输入方案名称", trigger: "blur" },
        { max: 120, message: "方案名称不能超过 120 个字符", trigger: "blur" }
    ],
    description: [{ max: 500, message: "方案说明不能超过 500 个字符", trigger: "blur" }]
};

function createScope(mode: ScopeMode = "NONE"): ProfileScopeDraft {
    return {
        mode,
        department_codes: [],
        include_descendants: false
    };
}

function createForm(): ProfileForm {
    return {
        code: "PROFILE_",
        name: "",
        description: "",
        assignments: []
    };
}

function createAssignment(roleCode = ""): ProfileAssignmentDraft {
    return {
        role_code: roleCode,
        role_version: 0,
        boundaries: [],
        permission_to_add: [],
        selected_permissions: [],
        batch_access: createScope(),
        batch_grant_configured: false,
        batch_grant_enabled: false,
        batch_grant: createScope()
    };
}

function createBoundary(permission: string, mode: ScopeMode = "NONE"): ProfileBoundaryDraft {
    return {
        permission,
        access: createScope(mode),
        grant: undefined
    };
}

function flattenPermissions(nodes: AuthorityTree[]): AuthorityTree[] {
    return nodes.flatMap(node => (node.children?.length ? flattenPermissions(node.children) : [node]));
}

function permissionName(permission: string): string {
    return permissionCatalog.value.find(item => item.code === permission)?.name ?? permission;
}

function scopeModeLabel(mode: ScopeMode): string {
    return scopeModeOptions.find(option => option.value === mode)?.label ?? mode;
}

function roleName(roleCode: string): string {
    return roles.value.find(role => role.code === roleCode)?.name ?? roleCode;
}

function assignmentIndexOf(assignment: ProfileAssignmentDraft): number {
    return form.assignments.indexOf(assignment);
}

function roleAuthorization(roleCode: string): RoleAuthorizationState | undefined {
    return roleAuthorizations.value[roleCode];
}

function permissionOptions(assignment: ProfileAssignmentDraft): AuthorityTree[] {
    const permissionCodes = new Set(roleAuthorization(assignment.role_code)?.permission_codes ?? []);
    return permissionCatalog.value.filter(permission => permissionCodes.has(permission.code));
}

function hasRolePermissions(assignment: ProfileAssignmentDraft): boolean {
    return (roleAuthorization(assignment.role_code)?.permission_codes.length ?? 0) > 0;
}

function grantablePermissions(assignment: ProfileAssignmentDraft): Set<string> {
    return new Set(roleAuthorization(assignment.role_code)?.grantable_permission_codes ?? []);
}

function scopeModesFor(permission: string): ScopeMode[] {
    const configured = permissionCatalog.value.find(item => item.code === permission)?.allowed_scope_modes;
    return configured?.length ? [...configured] : ["NONE"];
}

function copyScope(scope: AuthorizationProfileScope): ProfileScopeDraft {
    return {
        mode: scope.mode,
        resource_code: scope.resource_code,
        department_codes: [...(scope.department_codes ?? [])],
        include_descendants: scope.include_descendants
    };
}

function toDraft(profile: AuthorizationProfile): ProfileForm {
    return {
        id: profile.id,
        code: profile.code,
        name: profile.name,
        description: profile.description ?? "",
        expected_version: profile.version,
        assignments: profile.assignments.map(assignment => {
            const boundaries = assignment.boundaries.map(boundary => ({
                permission: boundary.permission,
                access: copyScope(boundary.access),
                grant: boundary.grant ? copyScope(boundary.grant) : undefined
            }));
            const firstBoundary = boundaries[0];
            return {
                role_code: assignment.role_code,
                role_version: assignment.role_version,
                permission_to_add: [],
                selected_permissions: boundaries.map(boundary => boundary.permission),
                batch_access: firstBoundary ? copyScope(firstBoundary.access) : createScope(),
                batch_grant_configured: false,
                batch_grant_enabled: Boolean(firstBoundary?.grant),
                batch_grant: firstBoundary?.grant ? copyScope(firstBoundary.grant) : createScope(),
                boundaries
            };
        })
    };
}

async function ensureRoleAuthorization(roleCode: string): Promise<RoleAuthorizationState | undefined> {
    if (!roleCode) return undefined;
    const cached = roleAuthorization(roleCode);
    if (cached) return cached;
    const role = roles.value.find(item => item.code === roleCode);
    if (!role) return undefined;
    const authorization = await AuthorizationApi.currentRole(role.id);
    roleAuthorizations.value = { ...roleAuthorizations.value, [roleCode]: authorization };
    return authorization;
}

async function load(): Promise<void> {
    loading.value = true;
    try {
        const [profile, nextRoles, nextAuthorityTree, nextDepartmentTree] = await Promise.all([
            editingId.value ? AuthorizationApi.profile(editingId.value) : Promise.resolve(undefined),
            RoleApi.list(),
            AuthorityApi.tree(),
            DepartmentApi.tree()
        ]);
        roles.value = (nextRoles ?? []).filter(role => role.state);
        authorityTree.value = nextAuthorityTree ?? [];
        departmentTree.value = nextDepartmentTree ?? [];
        if (profile) {
            await Promise.all(profile.assignments.map(assignment => ensureRoleAuthorization(assignment.role_code)));
            Object.assign(form, toDraft(profile));
            selectedRoleCodes.value = form.assignments.map(assignment => assignment.role_code);
            currentAssignmentIndex.value = 0;
        }
    } catch (error: unknown) {
        MessageUtils.error(error);
    } finally {
        loading.value = false;
    }
}

async function goBack(): Promise<void> {
    await router.push({ name: "SystemAuthorizationProfiles" });
}

async function handleRoleSelectionChange(roleCodes: string[]): Promise<void> {
    const nextRoleCodes = Array.from(new Set(roleCodes));
    const existingAssignments = new Map(form.assignments.map(assignment => [assignment.role_code, assignment]));
    roleSelectionLoading.value = true;
    try {
        const nextAssignments: ProfileAssignmentDraft[] = [];
        for (const roleCode of nextRoleCodes) {
            const existingAssignment = existingAssignments.get(roleCode);
            if (existingAssignment) {
                nextAssignments.push(existingAssignment);
                continue;
            }
            const assignment = createAssignment(roleCode);
            const authorization = await ensureRoleAuthorization(roleCode);
            assignment.role_version = authorization?.version ?? 0;
            nextAssignments.push(assignment);
        }
        form.assignments = nextAssignments;
        currentAssignmentIndex.value = Math.min(currentAssignmentIndex.value, Math.max(nextAssignments.length - 1, 0));
    } catch (error: unknown) {
        selectedRoleCodes.value = form.assignments.map(assignment => assignment.role_code);
        MessageUtils.error(error);
    } finally {
        roleSelectionLoading.value = false;
    }
}

function removeAssignment(index: number): void {
    const [removedAssignment] = form.assignments.splice(index, 1);
    if (removedAssignment) {
        selectedRoleCodes.value = selectedRoleCodes.value.filter(roleCode => roleCode !== removedAssignment.role_code);
        if (currentAssignmentIndex.value > index) {
            currentAssignmentIndex.value -= 1;
        } else {
            currentAssignmentIndex.value = Math.min(
                currentAssignmentIndex.value,
                Math.max(form.assignments.length - 1, 0)
            );
        }
    }
}

function addBoundaries(assignment: ProfileAssignmentDraft): void {
    const addedPermissions: string[] = [];
    for (const permission of assignment.permission_to_add) {
        if (assignment.boundaries.some(boundary => boundary.permission === permission)) continue;
        const [defaultMode = "NONE"] = scopeModesFor(permission);
        assignment.boundaries.push(createBoundary(permission, defaultMode));
        addedPermissions.push(permission);
    }
    assignment.selected_permissions = Array.from(new Set([...assignment.selected_permissions, ...addedPermissions]));
    assignment.permission_to_add = [];
    handleBatchSelectionChange(assignment);
}

function removeBoundary(assignment: ProfileAssignmentDraft, permission: string): void {
    assignment.boundaries = assignment.boundaries.filter(boundary => boundary.permission !== permission);
    assignment.selected_permissions = assignment.selected_permissions.filter(item => item !== permission);
    handleBatchSelectionChange(assignment);
}

function selectedBoundaries(assignment: ProfileAssignmentDraft): ProfileBoundaryDraft[] {
    const selectedPermissions = new Set(assignment.selected_permissions);
    return assignment.boundaries.filter(boundary => selectedPermissions.has(boundary.permission));
}

function commonScopeModes(assignment: ProfileAssignmentDraft): ScopeMode[] {
    const boundaries = selectedBoundaries(assignment);
    if (!boundaries.length) return [];
    return scopeModeOptions
        .map(option => option.value)
        .filter(mode => boundaries.every(boundary => scopeModesFor(boundary.permission).includes(mode)));
}

function batchScopeHint(assignment: ProfileAssignmentDraft): string {
    if (!assignment.selected_permissions.length) return "";
    if (commonScopeModes(assignment).length === 1 && commonScopeModes(assignment)[0] === "NONE") {
        return "当前选中的权限只支持 NONE，不支持按组织设置访问范围。";
    }
    if (!commonScopeModes(assignment).length) {
        return "当前选中的权限范围模式不一致，请使用右侧按钮按范围模式筛选后再批量设置。";
    }
    return "";
}

function hasPermissionMode(assignment: ProfileAssignmentDraft, mode: ScopeMode): boolean {
    return assignment.boundaries.some(boundary => scopeModesFor(boundary.permission).includes(mode));
}

function selectPermissionsByMode(assignment: ProfileAssignmentDraft, mode: ScopeMode): void {
    const selectedPermissions = assignment.boundaries
        .filter(boundary => scopeModesFor(boundary.permission).includes(mode))
        .map(boundary => boundary.permission);
    if (!selectedPermissions.length) {
        MessageUtils.warning(`当前没有支持 ${mode} 范围模式的权限`);
        return;
    }
    assignment.selected_permissions = selectedPermissions;
    handleBatchSelectionChange(assignment);
    const modes = commonScopeModes(assignment);
    if (modes.includes(mode)) {
        assignment.batch_access.mode = mode;
        assignment.batch_grant.mode = mode;
    }
}

function canApplyGrant(assignment: ProfileAssignmentDraft): boolean {
    const grantableCodes = grantablePermissions(assignment);
    return (
        selectedBoundaries(assignment).length > 0 &&
        selectedBoundaries(assignment).every(boundary => grantableCodes.has(boundary.permission))
    );
}

function handleBatchSelectionChange(assignment: ProfileAssignmentDraft): void {
    const modes = commonScopeModes(assignment);
    if (modes.length && !modes.includes(assignment.batch_access.mode)) {
        assignment.batch_access.mode = modes[0];
    }
    if (modes.length && !modes.includes(assignment.batch_grant.mode)) {
        assignment.batch_grant.mode = modes[0];
    }
    if (!canApplyGrant(assignment)) {
        assignment.batch_grant_configured = false;
        assignment.batch_grant_enabled = false;
    }
}

function selectAllBoundaries(assignment: ProfileAssignmentDraft): void {
    assignment.selected_permissions = assignment.boundaries.map(boundary => boundary.permission);
    handleBatchSelectionChange(assignment);
}

function clearBoundarySelection(assignment: ProfileAssignmentDraft): void {
    assignment.selected_permissions = [];
    handleBatchSelectionChange(assignment);
}

function applyBatchScope(assignment: ProfileAssignmentDraft): void {
    const boundaries = selectedBoundaries(assignment);
    if (!boundaries.length) {
        MessageUtils.warning("请先选择要批量设置的权限");
        return;
    }
    const modes = commonScopeModes(assignment);
    if (!modes.includes(assignment.batch_access.mode)) {
        MessageUtils.warning("选中权限没有共同支持的访问范围模式");
        return;
    }
    if (assignment.batch_grant_configured && !canApplyGrant(assignment)) {
        MessageUtils.warning("选中的权限必须全部支持向下授权，才能批量设置授权范围");
        return;
    }
    if (
        assignment.batch_grant_configured &&
        assignment.batch_grant_enabled &&
        !modes.includes(assignment.batch_grant.mode)
    ) {
        MessageUtils.warning("选中权限没有共同支持的授权范围模式");
        return;
    }
    for (const boundary of boundaries) {
        boundary.access = copyScope(assignment.batch_access);
        if (assignment.batch_grant_configured) {
            boundary.grant = assignment.batch_grant_enabled ? copyScope(assignment.batch_grant) : undefined;
        }
    }
    MessageUtils.success(`已将范围设置应用到 ${boundaries.length} 个权限`);
}

function setGrantEnabled(boundary: ProfileBoundaryDraft, enabled: boolean): void {
    if (enabled && !boundary.grant) boundary.grant = createScope(boundary.access.mode);
    if (!enabled) boundary.grant = undefined;
}

function validateScope(scope: ProfileScopeDraft, permission: string, label: string): boolean {
    if (!scopeModesFor(permission).includes(scope.mode)) {
        MessageUtils.warning(`${permission} 不允许 ${label}：${scope.mode}`);
        return false;
    }
    if (scope.mode === "RULES" && !scope.department_codes.length) {
        MessageUtils.warning(`${permission} 的 ${label} 必须选择组织`);
        return false;
    }
    if (scope.mode !== "RULES") scope.department_codes = [];
    return true;
}

function validateAssignments(): boolean {
    if (!form.assignments.length) {
        MessageUtils.warning("至少配置一个角色");
        return false;
    }
    const roleCodes = new Set<string>();
    for (const assignment of form.assignments) {
        if (!assignment.role_code) {
            MessageUtils.warning("请选择角色");
            return false;
        }
        if (!roleCodes.add(assignment.role_code)) {
            MessageUtils.warning("同一个授权方案不能重复配置角色");
            return false;
        }
        const role = roles.value.find(item => item.code === assignment.role_code);
        const authorization = roleAuthorization(assignment.role_code);
        if (!role || !authorization) {
            MessageUtils.warning(`无法读取角色授权信息：${assignment.role_code}`);
            return false;
        }
        if (role.role_kind === "DEV_OPS") {
            MessageUtils.warning("DEV_OPS 角色不能通过普通授权方案配置");
            return false;
        }
        if (assignment.role_version !== authorization.version) {
            MessageUtils.warning(`${assignment.role_code} 的角色版本已变化，请重新选择角色`);
            return false;
        }
        const permissionCodes = new Set<string>();
        const rolePermissionCodes = new Set(authorization.permission_codes);
        const grantableCodes = new Set(authorization.grantable_permission_codes);
        if (!assignment.boundaries.length) {
            if (rolePermissionCodes.size > 0) {
                MessageUtils.warning(`角色「${roleName(assignment.role_code)}」至少需要一个权限访问范围`);
                return false;
            }
            continue;
        }
        for (const boundary of assignment.boundaries) {
            if (!permissionCodes.add(boundary.permission)) {
                MessageUtils.warning(`权限不能重复配置：${boundary.permission}`);
                return false;
            }
            if (!rolePermissionCodes.has(boundary.permission)) {
                MessageUtils.warning(`${assignment.role_code} 未声明权限：${boundary.permission}`);
                return false;
            }
            if (!validateScope(boundary.access, boundary.permission, "访问范围")) return false;
            if (boundary.grant) {
                if (!grantableCodes.has(boundary.permission)) {
                    MessageUtils.warning(`${assignment.role_code} 未声明可授权权限：${boundary.permission}`);
                    return false;
                }
                if (!validateScope(boundary.grant, boundary.permission, "授权范围")) return false;
            }
        }
    }
    return true;
}

async function validateBasicInfo(): Promise<boolean> {
    if (!formRef.value) return false;
    try {
        await formRef.value.validateField(["code", "name", "description"]);
        return true;
    } catch {
        return false;
    }
}

async function waitForStepTransition(): Promise<void> {
    await nextTick();
    await new Promise<void>(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
}

function validateRoleSelection(): boolean {
    if (roleSelectionLoading.value) {
        MessageUtils.warning("角色授权信息正在加载，请稍候");
        return false;
    }
    if (!selectedRoleCodes.value.length || !form.assignments.length) {
        MessageUtils.warning("至少选择一个角色");
        return false;
    }
    if (form.assignments.some(assignment => !roleAuthorization(assignment.role_code))) {
        MessageUtils.warning("部分角色授权信息尚未加载完成，请稍候重试");
        return false;
    }
    return true;
}

async function handleNextStep(): Promise<void> {
    if (stepLoading.value) return;
    stepLoading.value = true;
    try {
        const valid = currentStep.value === 0 ? await validateBasicInfo() : validateRoleSelection();
        if (!valid) return;

        await waitForStepTransition();
        if (currentStep.value === 1) currentAssignmentIndex.value = 0;
        currentStep.value += 1;
        await nextTick();
    } finally {
        stepLoading.value = false;
    }
}

async function handlePreviousStep(): Promise<void> {
    if (stepLoading.value || currentStep.value <= 0) return;
    stepLoading.value = true;
    try {
        await waitForStepTransition();
        currentStep.value -= 1;
        await nextTick();
    } finally {
        stepLoading.value = false;
    }
}

async function handleStepNavigation(step: number): Promise<void> {
    if (step === currentStep.value) return;
    if (step < currentStep.value) {
        await handlePreviousStep();
        return;
    }
    await handleNextStep();
}

function handleStepSelection(key: string): void {
    void handleStepNavigation(Number(key));
}

async function handleAssignmentNavigation(assignmentIndex: number): Promise<void> {
    if (
        stepLoading.value ||
        currentStep.value !== 2 ||
        assignmentIndex === currentAssignmentIndex.value ||
        !form.assignments[assignmentIndex]
    ) {
        return;
    }
    stepLoading.value = true;
    try {
        await waitForStepTransition();
        currentAssignmentIndex.value = assignmentIndex;
        await nextTick();
    } finally {
        stepLoading.value = false;
    }
}

function handleAssignmentSelection(key: string): void {
    const assignmentIndex = form.assignments.findIndex(assignment => assignment.role_code === key);
    void handleAssignmentNavigation(assignmentIndex);
}

async function handleSave(): Promise<void> {
    if (currentStep.value !== 2) return;
    try {
        if (!validateAssignments()) return;
        saving.value = true;
        const params: AuthorizationProfileSave = {
            id: editingId.value || undefined,
            code: form.code,
            name: form.name,
            description: form.description,
            expected_version: editingId.value ? form.expected_version : undefined,
            assignments: form.assignments.map(assignment => ({
                role_code: assignment.role_code,
                role_version: assignment.role_version,
                boundaries: assignment.boundaries
            }))
        };
        if (editingId.value) {
            await AuthorizationApi.updateProfile(editingId.value, params);
        } else {
            await AuthorizationApi.createProfile(params);
        }
        MessageUtils.success(editingId.value ? "修改授权方案成功" : "创建授权方案成功");
        await goBack();
    } catch (error: unknown) {
        MessageUtils.error(error);
    } finally {
        saving.value = false;
    }
}

onMounted(load);
</script>

<template>
    <div v-loading="loading" class="profile-edit-page">
        <div class="profile-edit-shell">
            <div class="profile-edit-workspace">
                <aside class="profile-side profile-side-left">
                    <StepNavigation
                        :items="profileEditSteps"
                        :active-key="String(currentStep)"
                        :active-child-key="form.assignments[currentAssignmentIndex]?.role_code ?? ''"
                        aria-label="授权方案编辑步骤"
                        responsive-children="row"
                        @select="handleStepSelection"
                        @select-child="handleAssignmentSelection" />
                </aside>

                <section class="profile-edit-section">
                    <div class="profile-step-header">
                        <template v-if="currentStep === 0">
                            <div class="step-section-title">
                                <div>
                                    <span>基本信息</span>
                                    <small>填写授权方案的基本资料，下一步后仍可返回修改</small>
                                </div>
                            </div>
                        </template>

                        <template v-else-if="currentStep === 1">
                            <div class="step-section-title">
                                <div>
                                    <span>选择角色</span>
                                    <small>可以一次选择多个角色，系统会为每个角色生成独立的权限范围配置</small>
                                </div>
                            </div>
                        </template>

                        <template v-else>
                            <div class="step-section-title">
                                <div>
                                    <span>权限范围设置</span>
                                    <small>根据已选择的角色分别配置权限、访问范围和授权范围，最后统一保存</small>
                                </div>
                            </div>
                        </template>
                    </div>

                    <div v-loading="stepLoading" element-loading-text="正在切换步骤..." class="profile-edit-content">
                        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" @submit.prevent>
                            <template v-if="currentStep === 0">
                                <div class="basic-info-fields">
                                    <el-form-item label="方案编码" prop="code">
                                        <el-input v-model="form.code" :disabled="Boolean(editingId)" clearable />
                                    </el-form-item>
                                    <el-form-item label="方案名称" prop="name">
                                        <el-input v-model="form.name" clearable />
                                    </el-form-item>
                                    <el-form-item label="方案说明" prop="description">
                                        <el-input v-model="form.description" type="textarea" :rows="5" clearable />
                                    </el-form-item>
                                </div>
                            </template>

                            <template v-else-if="currentStep === 1">
                                <el-form-item label="角色">
                                    <el-select
                                        v-model="selectedRoleCodes"
                                        class="role-picker"
                                        placeholder="选择一个或多个角色"
                                        filterable
                                        multiple
                                        collapse-tags
                                        collapse-tags-tooltip
                                        :loading="roleSelectionLoading"
                                        @change="handleRoleSelectionChange">
                                        <el-option
                                            v-for="role in activeRoles"
                                            :key="role.id"
                                            :label="role.name + '（' + role.code + '）'"
                                            :value="role.code">
                                            <span>{{ role.name }}（{{ role.code }}）</span>
                                            <el-tag v-if="role.role_kind === 'DEV_OPS'" size="small" type="danger">
                                                不可用于方案
                                            </el-tag>
                                        </el-option>
                                    </el-select>
                                </el-form-item>
                                <div v-if="form.assignments.length" class="selected-role-summary">
                                    <el-text type="info">已选择角色</el-text>
                                    <div class="selected-role-tags">
                                        <el-tag v-for="assignment in form.assignments" :key="assignment.role_code">
                                            {{ roleName(assignment.role_code) }}（{{ assignment.role_code }}）
                                        </el-tag>
                                    </div>
                                </div>
                                <el-empty v-else description="尚未选择角色" />
                            </template>

                            <template v-else>
                                <el-empty v-if="!form.assignments.length" description="尚未配置角色" />
                                <div
                                    v-for="assignment in currentAssignments"
                                    :key="assignment.role_code"
                                    class="assignment-card">
                                    <div class="assignment-header">
                                        <div class="assignment-heading">
                                            <span class="assignment-section-index">
                                                3.{{ assignmentIndexOf(assignment) + 1 }}
                                            </span>
                                            <div class="assignment-role">
                                                <strong>{{ roleName(assignment.role_code) }}权限范围设置</strong>
                                                <span>（{{ assignment.role_code }}）</span>
                                            </div>
                                        </div>
                                        <el-text type="info">角色版本：{{ assignment.role_version }}</el-text>
                                        <el-button
                                            link
                                            type="danger"
                                            @click="removeAssignment(assignmentIndexOf(assignment))">
                                            移除角色
                                        </el-button>
                                    </div>

                                    <template v-if="assignment.role_code">
                                        <el-alert
                                            v-if="!hasRolePermissions(assignment)"
                                            type="info"
                                            :closable="false"
                                            title="该角色当前未配置任何业务权限，保存后可以正常登录，但不能访问需要权限的业务功能。" />

                                        <div v-else class="permission-add-row">
                                            <el-select
                                                v-model="assignment.permission_to_add"
                                                placeholder="选择角色已声明的权限"
                                                filterable
                                                multiple
                                                collapse-tags
                                                collapse-tags-tooltip
                                                :disabled="!roleAuthorization(assignment.role_code)">
                                                <el-option
                                                    v-for="permission in permissionOptions(assignment)"
                                                    :key="permission.code"
                                                    :label="`${permission.name}（${permission.code}）`"
                                                    :value="permission.code"
                                                    :disabled="
                                                        assignment.boundaries.some(
                                                            item => item.permission === permission.code
                                                        )
                                                    " />
                                            </el-select>
                                            <el-button
                                                type="primary"
                                                plain
                                                :disabled="!assignment.permission_to_add.length"
                                                @click="addBoundaries(assignment)">
                                                添加权限
                                            </el-button>
                                        </div>

                                        <div v-if="assignment.boundaries.length" class="batch-scope-panel">
                                            <div class="batch-scope-header">
                                                <div>
                                                    <strong>批量设置权限范围</strong>
                                                    <span>勾选权限后统一设置访问组织、子部门和授权范围</span>
                                                </div>
                                                <div class="batch-scope-tools">
                                                    <el-button
                                                        link
                                                        type="primary"
                                                        @click="selectAllBoundaries(assignment)">
                                                        全选权限
                                                    </el-button>
                                                    <el-button
                                                        link
                                                        type="primary"
                                                        @click="clearBoundarySelection(assignment)">
                                                        清空选择
                                                    </el-button>
                                                    <el-button
                                                        link
                                                        type="primary"
                                                        :disabled="!hasPermissionMode(assignment, 'RULES')"
                                                        @click="selectPermissionsByMode(assignment, 'RULES')">
                                                        选中按组织规则
                                                    </el-button>
                                                    <el-button
                                                        link
                                                        type="primary"
                                                        :disabled="!hasPermissionMode(assignment, 'SELF')"
                                                        @click="selectPermissionsByMode(assignment, 'SELF')">
                                                        选中按仅当前主体数据
                                                    </el-button>
                                                </div>
                                            </div>

                                            <el-checkbox-group
                                                v-model="assignment.selected_permissions"
                                                class="permission-selection"
                                                @change="handleBatchSelectionChange(assignment)">
                                                <el-checkbox
                                                    v-for="boundary in assignment.boundaries"
                                                    :key="boundary.permission"
                                                    :label="boundary.permission">
                                                    {{ permissionName(boundary.permission) }}
                                                </el-checkbox>
                                            </el-checkbox-group>

                                            <el-alert
                                                v-if="batchScopeHint(assignment)"
                                                class="batch-scope-warning"
                                                type="warning"
                                                :closable="false">
                                                {{ batchScopeHint(assignment) }}
                                            </el-alert>

                                            <template
                                                v-if="
                                                    assignment.selected_permissions.length &&
                                                    commonScopeModes(assignment).length
                                                ">
                                                <el-form label-width="110px" class="batch-scope-form">
                                                    <el-form-item label="访问范围">
                                                        <el-select v-model="assignment.batch_access.mode">
                                                            <el-option
                                                                v-for="mode in commonScopeModes(assignment)"
                                                                :key="mode"
                                                                :label="scopeModeLabel(mode)"
                                                                :value="mode" />
                                                        </el-select>
                                                    </el-form-item>
                                                    <el-form-item
                                                        v-if="assignment.batch_access.mode === 'RULES'"
                                                        label="访问组织">
                                                        <div class="scope-control-row">
                                                            <el-tree-select
                                                                v-model="assignment.batch_access.department_codes"
                                                                :data="departmentTree"
                                                                node-key="code"
                                                                multiple
                                                                check-strictly
                                                                default-expand-all
                                                                :props="treeDefaultProps"
                                                                placeholder="选择组织规则" />
                                                            <el-checkbox
                                                                v-model="assignment.batch_access.include_descendants">
                                                                包含子部门
                                                            </el-checkbox>
                                                        </div>
                                                    </el-form-item>
                                                    <el-form-item label="授权范围">
                                                        <el-checkbox
                                                            v-model="assignment.batch_grant_configured"
                                                            :disabled="!canApplyGrant(assignment)">
                                                            同时设置授权范围
                                                        </el-checkbox>
                                                        <el-text
                                                            v-if="!canApplyGrant(assignment)"
                                                            type="info"
                                                            size="small">
                                                            选中的权限必须全部支持向下授权
                                                        </el-text>
                                                    </el-form-item>
                                                    <template v-if="assignment.batch_grant_configured">
                                                        <el-form-item>
                                                            <el-checkbox v-model="assignment.batch_grant_enabled">
                                                                允许向下授权选中权限
                                                            </el-checkbox>
                                                        </el-form-item>
                                                    </template>
                                                    <template
                                                        v-if="
                                                            assignment.batch_grant_configured &&
                                                            assignment.batch_grant_enabled
                                                        ">
                                                        <el-form-item label="授权范围模式">
                                                            <el-select v-model="assignment.batch_grant.mode">
                                                                <el-option
                                                                    v-for="mode in commonScopeModes(assignment)"
                                                                    :key="mode"
                                                                    :label="scopeModeLabel(mode)"
                                                                    :value="mode" />
                                                            </el-select>
                                                        </el-form-item>
                                                        <el-form-item
                                                            v-if="assignment.batch_grant.mode === 'RULES'"
                                                            label="授权组织">
                                                            <div class="scope-control-row">
                                                                <el-tree-select
                                                                    v-model="assignment.batch_grant.department_codes"
                                                                    :data="departmentTree"
                                                                    node-key="code"
                                                                    multiple
                                                                    check-strictly
                                                                    default-expand-all
                                                                    :props="treeDefaultProps"
                                                                    placeholder="选择授权组织规则" />
                                                                <el-checkbox
                                                                    v-model="
                                                                        assignment.batch_grant.include_descendants
                                                                    ">
                                                                    包含子部门
                                                                </el-checkbox>
                                                            </div>
                                                        </el-form-item>
                                                    </template>
                                                </el-form>
                                                <div class="batch-scope-actions">
                                                    <el-button
                                                        type="primary"
                                                        plain
                                                        @click="applyBatchScope(assignment)">
                                                        一键应用到选中权限
                                                    </el-button>
                                                </div>
                                            </template>
                                            <el-text v-else type="info">请先勾选需要统一设置的权限</el-text>
                                        </div>

                                        <el-card
                                            v-for="boundary in assignment.boundaries"
                                            :key="boundary.permission"
                                            class="boundary-card"
                                            shadow="never">
                                            <template #header>
                                                <div class="boundary-header">
                                                    <span>
                                                        {{ permissionName(boundary.permission) }}（{{
                                                            boundary.permission
                                                        }}）
                                                    </span>
                                                    <el-button
                                                        link
                                                        type="danger"
                                                        @click="removeBoundary(assignment, boundary.permission)">
                                                        移除
                                                    </el-button>
                                                </div>
                                            </template>

                                            <el-form label-width="110px">
                                                <el-form-item label="访问范围">
                                                    <el-select v-model="boundary.access.mode">
                                                        <el-option
                                                            v-for="mode in scopeModesFor(boundary.permission)"
                                                            :key="mode"
                                                            :label="scopeModeLabel(mode)"
                                                            :value="mode" />
                                                    </el-select>
                                                </el-form-item>
                                                <el-form-item v-if="boundary.access.mode === 'RULES'" label="访问组织">
                                                    <el-tree-select
                                                        v-model="boundary.access.department_codes"
                                                        :data="departmentTree"
                                                        node-key="code"
                                                        multiple
                                                        check-strictly
                                                        default-expand-all
                                                        :props="treeDefaultProps"
                                                        placeholder="选择组织规则" />
                                                    <el-checkbox v-model="boundary.access.include_descendants">
                                                        包含子部门
                                                    </el-checkbox>
                                                </el-form-item>
                                                <el-form-item label="授权范围">
                                                    <el-checkbox
                                                        :model-value="Boolean(boundary.grant)"
                                                        :disabled="
                                                            !grantablePermissions(assignment).has(boundary.permission)
                                                        "
                                                        @update:model-value="setGrantEnabled(boundary, $event)">
                                                        允许向下授权此权限
                                                    </el-checkbox>
                                                    <el-text
                                                        v-if="
                                                            !grantablePermissions(assignment).has(boundary.permission)
                                                        "
                                                        type="info"
                                                        size="small">
                                                        当前角色未声明可授权权限
                                                    </el-text>
                                                </el-form-item>
                                                <template v-if="boundary.grant">
                                                    <el-form-item label="授权范围模式">
                                                        <el-select v-model="boundary.grant.mode">
                                                            <el-option
                                                                v-for="mode in scopeModesFor(boundary.permission)"
                                                                :key="mode"
                                                                :label="scopeModeLabel(mode)"
                                                                :value="mode" />
                                                        </el-select>
                                                    </el-form-item>
                                                    <el-form-item
                                                        v-if="boundary.grant.mode === 'RULES'"
                                                        label="授权组织">
                                                        <el-tree-select
                                                            v-model="boundary.grant.department_codes"
                                                            :data="departmentTree"
                                                            node-key="code"
                                                            multiple
                                                            check-strictly
                                                            default-expand-all
                                                            :props="treeDefaultProps"
                                                            placeholder="选择授权组织规则" />
                                                        <el-checkbox v-model="boundary.grant.include_descendants">
                                                            包含子部门
                                                        </el-checkbox>
                                                    </el-form-item>
                                                </template>
                                            </el-form>
                                        </el-card>

                                        <el-empty
                                            v-if="!assignment.boundaries.length"
                                            :description="
                                                hasRolePermissions(assignment)
                                                    ? '尚未配置权限访问范围'
                                                    : '该角色无已声明权限，无需配置权限访问范围'
                                            " />
                                    </template>
                                </div>
                            </template>
                        </el-form>
                    </div>
                </section>

                <aside class="profile-side profile-side-right">
                    <div class="section-title profile-heading">
                        <div>
                            <span>{{ editorTitle }}</span>
                            <small>用于保存可复用的角色、权限和数据范围配置</small>
                        </div>
                        <el-text type="info">带 * 的字段为必填项</el-text>
                    </div>
                    <el-alert class="profile-tip" title="使用提示" type="info" :closable="false" show-icon>
                        <template #default>
                            <div class="profile-tip-content">
                                <p>
                                    授权方案
                                    <strong>不是运行时授权实例</strong>
                                    。
                                </p>
                                <p>
                                    套用后仍需根据当前用户
                                    <strong>完成预览和应用</strong>
                                    。
                                </p>
                                <p>
                                    方案停用
                                    <strong>不会撤销已生效授权</strong>
                                    。
                                </p>
                            </div>
                        </template>
                    </el-alert>
                </aside>
            </div>

            <div class="profile-actions">
                <el-button :disabled="stepLoading" @click="goBack">取消</el-button>
                <el-button
                    v-if="currentStep > 0 && !(currentStep === 2 && currentAssignmentIndex > 0)"
                    :disabled="stepLoading"
                    @click="handlePreviousStep">
                    上一步
                </el-button>
                <el-button
                    v-if="currentStep === 2 && currentAssignmentIndex > 0"
                    :disabled="stepLoading"
                    @click="handleAssignmentNavigation(currentAssignmentIndex - 1)">
                    上一个角色
                </el-button>
                <el-button
                    v-if="currentStep === 2 && currentAssignmentIndex < form.assignments.length - 1"
                    type="primary"
                    :loading="stepLoading"
                    :disabled="stepLoading"
                    @click="handleAssignmentNavigation(currentAssignmentIndex + 1)">
                    下一个角色
                </el-button>
                <el-button
                    v-if="currentStep < 2"
                    type="primary"
                    :loading="stepLoading"
                    :disabled="stepLoading"
                    @click="handleNextStep">
                    下一步
                </el-button>
                <el-button
                    v-if="currentStep === 2 && currentAssignmentIndex === form.assignments.length - 1"
                    type="primary"
                    :loading="saving || stepLoading"
                    :disabled="stepLoading"
                    @click="handleSave">
                    保存方案
                </el-button>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.profile-edit-page {
    height: 100%;
    min-height: 0;
    padding: 20px 32px 24px;
    overflow: hidden;
    background: var(--el-bg-color);
    box-sizing: border-box;
}

.profile-edit-shell {
    display: flex;
    flex-direction: column;
    width: min(1600px, 100%);
    height: 100%;
    min-height: 0;
    margin: 0 auto;
}

.profile-edit-workspace {
    display: grid;
    flex: 1 1 auto;
    grid-template-columns: max-content minmax(0, 1fr) minmax(220px, 280px);
    min-height: 0;
    gap: 24px;
}

.profile-side {
    min-width: 0;
    padding-top: 4px;
}

.profile-side-left {
    grid-column: 1;
    width: max-content;
    max-width: 260px;
}

.profile-side-right {
    grid-column: 3;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.section-title,
.assignment-header,
.permission-add-row,
.batch-scope-header,
.boundary-header,
.profile-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.profile-tip {
    flex: 0 0 auto;
    align-items: flex-start;
    padding: 14px 16px;
    border: 1px solid var(--el-color-info-light-7);
    border-radius: 10px;
    background: var(--el-color-info-light-9);
}

.profile-tip :deep(.el-alert__icon) {
    flex: 0 0 auto;
    margin-top: 2px;
}

.profile-tip :deep(.el-alert__content) {
    min-width: 0;
    gap: 4px;
}

.profile-tip :deep(.el-alert__title) {
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
}

.profile-tip :deep(.el-alert__description) {
    color: var(--el-text-color-regular);
    font-size: 12px;
    line-height: 1.7;
}

.profile-tip-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--el-text-color-regular);
    font-size: 12px;
    line-height: 1.7;
}

.profile-tip-content p {
    margin: 0;
}

.profile-tip-content strong {
    color: var(--el-text-color-primary);
    font-weight: 600;
}

.profile-edit-section {
    grid-column: 2;
    grid-row: 1;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    background: var(--el-bg-color);
}

.profile-step-header {
    flex: 0 0 auto;
    min-height: 0;
}

.section-title {
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.profile-heading {
    align-items: flex-start;
    flex-direction: column;
    margin: 0;
    padding: 14px 16px;
    border: 1px solid var(--el-border-color-extra-light);
    border-left: 3px solid var(--el-color-primary-light-5);
    border-radius: 0 10px 10px 0;
    background: var(--el-fill-color-light);
}

.profile-edit-content {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0 4px 12px;
    overflow-y: auto;
    scrollbar-gutter: stable;
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

.step-section-title {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.step-section-title > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.step-section-title span {
    color: var(--el-text-color-primary);
    font-size: 16px;
    font-weight: 600;
}

.step-section-title small {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.role-picker {
    width: 100%;
}

.selected-role-summary {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-top: 8px;
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-lighter);
}

.selected-role-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.assignment-card {
    margin-top: 16px;
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
}

.assignment-header {
    justify-content: space-between;
}

.assignment-heading {
    display: flex;
    align-items: flex-start;
    min-width: 0;
    gap: 10px;
    margin-right: auto;
}

.assignment-section-index {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    min-width: 38px;
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--el-color-primary-light-5);
    border-radius: 7px;
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    line-height: 1;
}

.assignment-role {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
}

.assignment-role strong {
    color: var(--el-text-color-primary);
}

.permission-add-row .el-select {
    flex: 1;
}

.permission-add-row {
    margin: 14px 0;
}

.batch-scope-panel {
    margin-top: 16px;
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    background: var(--el-fill-color-lighter);
}

.batch-scope-header {
    justify-content: space-between;
    margin-bottom: 14px;
}

.batch-scope-header > div:first-child {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.batch-scope-header span {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.batch-scope-tools {
    display: flex;
    align-items: center;
    flex-direction: row;
    gap: 8px;
    flex-shrink: 0;
    white-space: nowrap;
}

.permission-selection {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    padding: 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-bg-color);
}

.permission-selection :deep(.el-checkbox) {
    margin-right: 0;
}

.batch-scope-warning {
    margin-top: 12px;
}

.batch-scope-warning :deep(.el-button) {
    margin-left: 8px;
}

.batch-scope-form {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-lighter);
}

.scope-control-row {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 12px;
}

.scope-control-row :deep(.el-tree-select) {
    flex: 1;
    width: auto;
}

.batch-scope-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
}

.boundary-card {
    margin-top: 12px;
}

.boundary-header {
    justify-content: space-between;
}

.boundary-card :deep(.el-select),
.boundary-card :deep(.el-tree-select) {
    width: 100%;
}

.boundary-card :deep(.el-checkbox) {
    margin-left: 10px;
}

.profile-actions {
    flex: 0 0 auto;
    width: 100%;
    margin: 0 auto;
    justify-content: flex-end;
    padding: 16px 0 4px;
    border-top: 1px solid var(--el-border-color-lighter);
}

.profile-actions .el-button {
    min-width: 88px;
}

:deep(.el-form-item) {
    margin-bottom: 22px;
}

:deep(.el-input),
:deep(.el-select),
:deep(.el-tree-select) {
    width: 100%;
}

@media (max-width: 768px) {
    .profile-edit-page {
        padding: 20px 16px 24px;
    }

    .section-title {
        align-items: flex-start;
        flex-direction: column;
    }

    .assignment-header,
    .permission-add-row,
    .batch-scope-header {
        align-items: stretch;
        flex-direction: column;
    }

    .scope-control-row {
        align-items: stretch;
        flex-direction: column;
    }

    .scope-control-row :deep(.el-tree-select) {
        width: 100%;
    }

    :deep(.el-col) {
        width: 100%;
        max-width: 100%;
        flex: 0 0 100%;
    }
}

@media (max-width: 1200px) {
    .profile-edit-workspace {
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow: hidden;
    }

    .profile-side {
        flex: 0 0 auto;
        padding-top: 0;
    }

    .profile-side-left {
        order: 0;
        width: 100%;
        max-width: none;
    }

    .profile-edit-section {
        order: 1;
        min-height: 0;
    }

    .profile-side-right {
        order: 2;
    }
}
</style>
