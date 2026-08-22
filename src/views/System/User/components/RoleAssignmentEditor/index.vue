<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

import { AuthorityApi } from "@/api/auth/authority-api.ts";
import { AuthorizationApi } from "@/api/auth/authorization-api.ts";
import { RoleApi } from "@/api/auth/role-api.ts";
import { DepartmentApi } from "@/api/user/department-api.ts";
import {
    authorizationAssignmentBoundaries,
    authorizationBoundariesFromProfile,
    createAuthorizationScope,
    flattenAuthorityPermissions,
    flattenDepartmentTree,
    toAuthorizationScopeChange,
    type AuthorizationBoundaryForm,
    type AuthorizationScopeForm
} from "@/utils/authorization-boundary.ts";
import { treeDefaultProps } from "@/utils/default-config.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

type EditorStage = "selection" | "details";
type ScopeMode = AuthorizationScopeForm["mode"];

type RoleAssignmentDraft = {
    key: string;
    assignmentId?: string;
    roleId: string;
    expectedVersion: number;
    authorization?: RoleAuthorizationState;
    boundaries: AuthorizationBoundaryForm[];
};

type RoleAssignmentStep = {
    key: string;
    name: string;
    code: string;
};

const props = withDefaults(
    defineProps<{
        userId?: string;
        stage?: EditorStage;
    }>(),
    { userId: "", stage: "selection" }
);

const emit = defineEmits<{
    "roles-change": [steps: RoleAssignmentStep[]];
}>();

const scopeModeOptions: { value: ScopeMode; label: string }[] = [
    { value: "NONE", label: "NONE（仅能力，不限定数据范围）" },
    { value: "ALL", label: "ALL（显式全范围）" },
    { value: "SELF", label: "SELF（仅当前主体数据）" },
    { value: "RULES", label: "RULES（按组织规则）" }
];

const assignments = ref<AuthorizationAssignment[]>([]);
const roles = ref<RolePageVO[]>([]);
const profiles = ref<AuthorizationProfile[]>([]);
const authorityTree = ref<AuthorityTree[]>([]);
const departmentTree = ref<DepartmentTreeVO[]>([]);
const selectedProfileId = ref("");
const roleIdsToAdd = ref<string[]>([]);
const activeDraftKey = ref("");
const draftAssignments = ref<RoleAssignmentDraft[]>([]);
const loading = ref(false);
const applyingProfile = ref(false);

const initialActiveAssignments = computed(() => assignments.value.filter(assignment => assignment.state === "ACTIVE"));
const activeProfiles = computed(() => profiles.value.filter(profile => profile.state === "ACTIVE"));
const permissionCatalog = computed(() => flattenAuthorityPermissions(authorityTree.value));
const departmentByCode = computed(() => {
    const result = new Map<string, DepartmentTreeVO>();
    flattenDepartmentTree(departmentTree.value).forEach(department => result.set(department.code, department));
    return result;
});
const selectedRoleIds = computed(() => new Set(draftAssignments.value.map(draft => draft.roleId)));
const selectableRoles = computed(() => roles.value.filter(role => role.state && !selectedRoleIds.value.has(role.id)));
const activeDraft = computed(() => draftAssignments.value.find(draft => draft.key === activeDraftKey.value));
const roleSteps = computed<RoleAssignmentStep[]>(() =>
    draftAssignments.value.map(draft => {
        const role = roleById(draft.roleId);
        return {
            key: draft.key,
            name: role?.name ?? draft.roleId,
            code: role?.code ?? draft.roleId
        };
    })
);

const roleById = (roleId: string) => roles.value.find(role => role.id === roleId);
const roleName = (roleId: string) => roleById(roleId)?.name ?? roleId;
const roleLabel = (draft: RoleAssignmentDraft) => {
    const role = roleById(draft.roleId);
    return role ? `${role.name}（${role.code}）` : draft.roleId;
};
const permissionName = (permission: string) =>
    permissionCatalog.value.find(item => item.code === permission)?.name ?? permission;
const scopeModeLabel = (mode: ScopeMode) => scopeModeOptions.find(option => option.value === mode)?.label ?? mode;
const scopeModesFor = (permission: string): ScopeMode[] => {
    const configured = permissionCatalog.value.find(item => item.code === permission)?.allowed_scope_modes;
    return configured?.length ? [...configured] : ["NONE"];
};
const rolePermissionOptions = (draft: RoleAssignmentDraft) => {
    const permissionCodes = new Set(draft.authorization?.permission_codes ?? []);
    return permissionCatalog.value.filter(permission => permissionCodes.has(permission.code));
};
const grantablePermissionCodes = (draft: RoleAssignmentDraft) =>
    new Set(draft.authorization?.grantable_permission_codes ?? []);
const isRoleEditable = (draft: RoleAssignmentDraft) => Boolean(roleById(draft.roleId)?.state && draft.authorization);
const assignmentKey = (assignment: AuthorizationAssignment) => `assignment:${assignment.assignment_id}`;
const newRoleKey = (roleId: string) => `role:${roleId}`;

async function loadRoleAuthorization(roleId: string): Promise<RoleAuthorizationState | undefined> {
    try {
        return await AuthorizationApi.currentRole(roleId);
    } catch {
        MessageUtils.warning(`无法读取角色“${roleName(roleId)}”的授权能力，请移除后重新选择角色`);
        return undefined;
    }
}

async function toExistingDraft(assignment: AuthorizationAssignment): Promise<RoleAssignmentDraft> {
    return {
        key: assignmentKey(assignment),
        assignmentId: assignment.assignment_id,
        roleId: assignment.role_id,
        expectedVersion: assignment.version,
        authorization: await loadRoleAuthorization(assignment.role_id),
        boundaries: authorizationAssignmentBoundaries(assignment)
    };
}

async function load(): Promise<void> {
    loading.value = true;
    try {
        const assignmentsRequest = props.userId
            ? AuthorizationApi.assignments(props.userId)
            : Promise.resolve<AuthorizationAssignment[]>([]);
        const [nextAssignments, nextRoles, nextProfiles, nextAuthorityTree, nextDepartmentTree] = await Promise.all([
            assignmentsRequest,
            RoleApi.list(),
            AuthorizationApi.profiles().catch(() => []),
            AuthorityApi.tree(),
            DepartmentApi.tree()
        ]);
        assignments.value = nextAssignments ?? [];
        roles.value = nextRoles ?? [];
        profiles.value = nextProfiles ?? [];
        authorityTree.value = nextAuthorityTree ?? [];
        departmentTree.value = nextDepartmentTree ?? [];
        draftAssignments.value = await Promise.all(initialActiveAssignments.value.map(toExistingDraft));
        activeDraftKey.value = draftAssignments.value[0]?.key ?? "";
    } catch (error: unknown) {
        MessageUtils.error(error);
    } finally {
        loading.value = false;
    }
}

function removeDraft(draft: RoleAssignmentDraft): void {
    draftAssignments.value = draftAssignments.value.filter(item => item.key !== draft.key);
    if (activeDraftKey.value === draft.key) activeDraftKey.value = draftAssignments.value[0]?.key ?? "";
}

function selectRole(key: string): void {
    if (draftAssignments.value.some(draft => draft.key === key)) activeDraftKey.value = key;
}

async function addRoles(): Promise<void> {
    if (!roleIdsToAdd.value.length) return;
    const ids = [...roleIdsToAdd.value];
    roleIdsToAdd.value = [];
    const added: RoleAssignmentDraft[] = [];
    for (const roleId of ids) {
        if (selectedRoleIds.value.has(roleId)) continue;
        const authorization = await loadRoleAuthorization(roleId);
        added.push({
            key: newRoleKey(roleId),
            roleId,
            expectedVersion: 0,
            authorization,
            boundaries: []
        });
    }
    draftAssignments.value.push(...added);
    if (added.length) activeDraftKey.value = added[0].key;
}

async function applyProfile(): Promise<void> {
    const profile = profiles.value.find(item => item.id === selectedProfileId.value);
    if (!profile) return;
    if (profile.state !== "ACTIVE") {
        MessageUtils.warning("已停用的授权方案不能套用");
        return;
    }
    applyingProfile.value = true;
    const duplicateRoles: string[] = [];
    const added: RoleAssignmentDraft[] = [];
    try {
        const existingRoleIds = new Set(initialActiveAssignments.value.map(assignment => assignment.role_id));
        const selectedIds = new Set(draftAssignments.value.map(draft => draft.roleId));
        for (const profileAssignment of profile.assignments) {
            const role = roles.value.find(item => item.code === profileAssignment.role_code);
            if (!role || !role.state) {
                MessageUtils.warning(`方案依赖的角色不存在或已停用：${profileAssignment.role_code}`);
                continue;
            }
            if (existingRoleIds.has(role.id) || selectedIds.has(role.id)) {
                duplicateRoles.push(role.name);
                continue;
            }
            const authorization = await loadRoleAuthorization(role.id);
            if (!authorization || authorization.version !== profileAssignment.role_version) {
                MessageUtils.warning(`角色“${role.name}”的授权版本已变化，请先更新授权方案`);
                continue;
            }
            const boundaries = authorizationBoundariesFromProfile(profileAssignment, departmentByCode.value);
            if (!boundaries) {
                MessageUtils.warning(`角色“${role.name}”引用了不存在的组织，请先更新授权方案`);
                continue;
            }
            const draft: RoleAssignmentDraft = {
                key: newRoleKey(role.id),
                roleId: role.id,
                expectedVersion: 0,
                authorization,
                boundaries
            };
            added.push(draft);
            selectedIds.add(role.id);
        }
        draftAssignments.value.push(...added);
        if (added.length) activeDraftKey.value = added[0].key;
        selectedProfileId.value = "";
        if (duplicateRoles.length) {
            MessageUtils.warning(`角色已存在当前用户，已跳过：${duplicateRoles.join("、")}`);
        }
        if (added.length) MessageUtils.success(`已加载授权方案“${profile.name}”，可在下一步逐个调整角色范围`);
    } finally {
        applyingProfile.value = false;
    }
}

function addSelectedBoundary(draft: RoleAssignmentDraft, permission: string): void {
    if (!permission || draft.boundaries.some(boundary => boundary.permission === permission)) return;
    const [defaultMode = "NONE"] = scopeModesFor(permission);
    draft.boundaries.push({
        permission,
        access: createAuthorizationScope(defaultMode),
        grantEnabled: false,
        grant: createAuthorizationScope(defaultMode)
    });
}

function removeBoundary(draft: RoleAssignmentDraft, permission: string): void {
    draft.boundaries = draft.boundaries.filter(boundary => boundary.permission !== permission);
}

function validateDraft(draft: RoleAssignmentDraft): boolean {
    if (!isRoleEditable(draft)) {
        MessageUtils.warning(`角色“${roleLabel(draft)}”不可编辑，请移除该角色后再提交`);
        return false;
    }
    if (!draft.boundaries.length) {
        MessageUtils.warning(`角色“${roleLabel(draft)}”至少需要配置一个权限访问范围`);
        return false;
    }
    const rolePermissionCodes = new Set(draft.authorization?.permission_codes ?? []);
    for (const boundary of draft.boundaries) {
        if (!rolePermissionCodes.has(boundary.permission)) {
            MessageUtils.warning(`角色“${roleLabel(draft)}”未声明权限：${boundary.permission}`);
            return false;
        }
        if (!scopeModesFor(boundary.permission).includes(boundary.access.mode)) {
            MessageUtils.warning(`权限 ${boundary.permission} 不允许访问范围模式：${boundary.access.mode}`);
            return false;
        }
        if (boundary.access.mode === "RULES" && !boundary.access.department_ids.length) {
            MessageUtils.warning(`角色“${roleLabel(draft)}”的权限 ${boundary.permission} 必须选择访问组织`);
            return false;
        }
        if (boundary.grantEnabled) {
            if (!grantablePermissionCodes(draft).has(boundary.permission)) {
                MessageUtils.warning(`角色“${roleLabel(draft)}”未声明可授予权限：${boundary.permission}`);
                return false;
            }
            if (!scopeModesFor(boundary.permission).includes(boundary.grant.mode)) {
                MessageUtils.warning(`权限 ${boundary.permission} 不允许授权范围模式：${boundary.grant.mode}`);
                return false;
            }
            if (boundary.grant.mode === "RULES" && !boundary.grant.department_ids.length) {
                MessageUtils.warning(`角色“${roleLabel(draft)}”的权限 ${boundary.permission} 必须选择授权组织`);
                return false;
            }
        }
    }
    return true;
}

async function validateSelection(): Promise<boolean> {
    if (roleIdsToAdd.value.length) await addRoles();
    if (!draftAssignments.value.length) {
        MessageUtils.warning("至少选择一个角色后才能继续");
        return false;
    }
    return true;
}

function validateDetails(): boolean {
    if (!draftAssignments.value.length) {
        MessageUtils.warning("至少选择一个角色后才能提交");
        return false;
    }
    return draftAssignments.value.every(validateDraft);
}

function validateCurrent(): boolean {
    if (!activeDraft.value) {
        MessageUtils.warning("至少选择一个角色后才能继续");
        return false;
    }
    return validateDraft(activeDraft.value);
}

function getRoleSteps(): RoleAssignmentStep[] {
    return roleSteps.value;
}

function buildRequest(): AuthorizationAssignmentsChange {
    const draftKeys = new Set(draftAssignments.value.map(draft => draft.assignmentId));
    return {
        assignments: draftAssignments.value.map(draft => ({
            assignment_id: draft.assignmentId,
            role_id: draft.roleId,
            expected_version: draft.expectedVersion,
            boundaries: draft.boundaries.map(boundary => ({
                permission: boundary.permission,
                access: toAuthorizationScopeChange(boundary.access),
                grant: boundary.grantEnabled ? toAuthorizationScopeChange(boundary.grant) : undefined
            }))
        })),
        removed_assignments: initialActiveAssignments.value
            .filter(assignment => !draftKeys.has(assignment.assignment_id))
            .map(assignment => ({
                assignment_id: assignment.assignment_id,
                expected_version: assignment.version
            }))
    };
}

defineExpose({
    validateSelection,
    validateCurrent,
    validate: validateDetails,
    getRequest: buildRequest,
    getRoleSteps,
    selectRole
});

watch([draftAssignments, roles], () => emit("roles-change", roleSteps.value), { deep: true, immediate: true });

onMounted(load);
</script>

<template>
    <el-skeleton v-if="loading" :rows="5" animated />
    <template v-else>
        <template v-if="props.stage === 'selection'">
            <div class="authorization-tool">
                <strong class="authorization-tool-title">快速套用授权方案</strong>
                <div class="authorization-tool-controls">
                    <el-select v-model="selectedProfileId" placeholder="选择可复用授权方案" clearable filterable>
                        <el-option
                            v-for="profile in activeProfiles"
                            :key="profile.id"
                            :label="`${profile.name}（${profile.code}）`"
                            :value="profile.id">
                            <div class="profile-option">
                                <span>{{ profile.name }}（{{ profile.code }}）</span>
                                <el-tag size="small" type="info">v{{ profile.version }}</el-tag>
                            </div>
                        </el-option>
                    </el-select>
                    <el-button
                        type="primary"
                        plain
                        :loading="applyingProfile"
                        :disabled="!selectedProfileId"
                        @click="applyProfile">
                        快速套用
                    </el-button>
                </div>
            </div>

            <div class="authorization-tool">
                <strong class="authorization-tool-title">新建角色授权</strong>
                <div class="authorization-tool-controls">
                    <el-select
                        v-model="roleIdsToAdd"
                        multiple
                        collapse-tags
                        collapse-tags-tooltip
                        filterable
                        placeholder="选择要新增的角色">
                        <el-option
                            v-for="role in selectableRoles"
                            :key="role.id"
                            :label="`${role.name}（${role.code}）`"
                            :value="role.id">
                            <span>{{ role.name }}（{{ role.code }}）</span>
                            <el-tag v-if="role.builtin" size="small" type="info">内置</el-tag>
                        </el-option>
                    </el-select>
                    <el-button type="primary" plain :disabled="!roleIdsToAdd.length" @click="addRoles">
                        添加角色
                    </el-button>
                </div>
            </div>

            <div class="selected-role-panel">
                <div class="selected-role-header">
                    <strong class="authorization-tool-title">已选择角色</strong>
                    <el-text type="info" size="small">至少保留一个角色</el-text>
                </div>
                <div v-if="draftAssignments.length" class="selected-role-list">
                    <el-tag
                        v-for="draft in draftAssignments"
                        :key="draft.key"
                        closable
                        size="large"
                        type="info"
                        @close="removeDraft(draft)">
                        {{ roleLabel(draft) }}
                    </el-tag>
                </div>
                <el-empty v-else description="尚未选择角色" :image-size="70" />
            </div>
        </template>

        <template v-else>
            <template v-if="activeDraft">
                <div class="role-detail-header">
                    <div>
                        <strong>{{ roleLabel(activeDraft) }}</strong>
                        <el-text v-if="activeDraft.assignmentId" type="info" size="small">
                            授权实例版本：{{ activeDraft.expectedVersion }}
                        </el-text>
                    </div>
                </div>

                <el-alert
                    v-if="!isRoleEditable(activeDraft)"
                    title="当前角色已停用或授权能力读取失败，请返回第 02 步移除后再选择其他角色。"
                    type="error"
                    :closable="false" />

                <template v-else>
                    <div class="boundary-add-row">
                        <strong class="authorization-tool-title">添加访问范围</strong>
                        <div class="boundary-add-controls">
                            <el-select
                                placeholder="选择角色已声明的权限"
                                filterable
                                @change="addSelectedBoundary(activeDraft, $event)">
                                <el-option
                                    v-for="permission in rolePermissionOptions(activeDraft)"
                                    :key="permission.code"
                                    :label="`${permission.name}（${permission.code}）`"
                                    :value="permission.code"
                                    :disabled="
                                        activeDraft.boundaries.some(boundary => boundary.permission === permission.code)
                                    " />
                            </el-select>
                        </div>
                    </div>

                    <el-alert
                        v-if="!rolePermissionOptions(activeDraft).length"
                        title="当前角色没有可配置的权限，不能提交空的访问范围。"
                        type="error"
                        :closable="false" />

                    <el-card
                        v-for="boundary in activeDraft.boundaries"
                        :key="boundary.permission"
                        class="boundary-card"
                        shadow="never">
                        <template #header>
                            <div class="boundary-header">
                                <span>{{ permissionName(boundary.permission) }}（{{ boundary.permission }}）</span>
                                <el-button link type="danger" @click="removeBoundary(activeDraft, boundary.permission)">
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
                                    v-model="boundary.access.department_ids"
                                    :data="departmentTree"
                                    node-key="id"
                                    multiple
                                    check-strictly
                                    default-expand-all
                                    :props="treeDefaultProps"
                                    placeholder="选择组织规则" />
                                <el-checkbox v-model="boundary.access.include_descendants">包含子部门</el-checkbox>
                            </el-form-item>
                            <el-form-item label="授权范围">
                                <el-checkbox
                                    v-model="boundary.grantEnabled"
                                    :disabled="!grantablePermissionCodes(activeDraft).has(boundary.permission)">
                                    允许向下授权此权限
                                </el-checkbox>
                                <el-text
                                    v-if="!grantablePermissionCodes(activeDraft).has(boundary.permission)"
                                    type="info"
                                    size="small">
                                    当前角色未声明可授予权限
                                </el-text>
                            </el-form-item>
                            <template v-if="boundary.grantEnabled">
                                <el-form-item label="授权范围模式">
                                    <el-select v-model="boundary.grant.mode">
                                        <el-option
                                            v-for="mode in scopeModesFor(boundary.permission)"
                                            :key="mode"
                                            :label="scopeModeLabel(mode)"
                                            :value="mode" />
                                    </el-select>
                                </el-form-item>
                                <el-form-item v-if="boundary.grant.mode === 'RULES'" label="授权组织">
                                    <el-tree-select
                                        v-model="boundary.grant.department_ids"
                                        :data="departmentTree"
                                        node-key="id"
                                        multiple
                                        check-strictly
                                        default-expand-all
                                        :props="treeDefaultProps"
                                        placeholder="选择授权组织规则" />
                                    <el-checkbox v-model="boundary.grant.include_descendants">包含子部门</el-checkbox>
                                </el-form-item>
                            </template>
                        </el-form>
                    </el-card>
                    <el-empty v-if="!activeDraft.boundaries.length" description="尚未配置权限访问范围" />
                </template>
            </template>
            <el-empty v-else description="请返回第 02 步至少选择一个角色" />
        </template>
    </template>
</template>

<style scoped lang="scss">
.authorization-tool,
.selected-role-panel {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
    padding: 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    background: var(--el-fill-color-light);
}

.authorization-tool-title {
    color: var(--el-text-color-primary);
    font-size: 13px;
    line-height: 20px;
}

.authorization-tool-controls,
.boundary-add-row,
.boundary-add-controls,
.selected-role-header,
.selected-role-list,
.role-detail-header,
.boundary-header {
    display: flex;
    align-items: center;
    gap: 10px;
}

.authorization-tool-controls .el-select,
.boundary-add-controls .el-select {
    flex: 1;
    min-width: 0;
}

.profile-option,
.selected-role-header,
.role-detail-header,
.boundary-header {
    justify-content: space-between;
}

.selected-role-list {
    flex-wrap: wrap;
}

.role-detail-header {
    align-items: flex-start;
    margin-bottom: 12px;
}

.role-detail-header > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.boundary-add-row {
    align-items: stretch;
    flex-direction: column;
    margin: 12px 0;
}

.boundary-add-controls {
    width: 100%;
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

@media (max-width: 768px) {
    .authorization-tool-controls,
    .boundary-add-controls {
        align-items: stretch;
        flex-direction: column;
    }
}
</style>
