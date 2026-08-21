<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

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

const props = defineProps<{
    userId: string;
}>();

type ScopeMode = AuthorizationScopeForm["mode"];

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
const selectedAssignmentId = ref("");
const selectedProfileId = ref("");
const selectedRoleId = ref("");
const permissionToAdd = ref("");
const roleAuthorization = ref<RoleAuthorizationState>();
const boundaries = ref<AuthorizationBoundaryForm[]>([]);
const loading = ref(false);
const saving = ref(false);
const applyingProfile = ref(false);

const activeAssignments = computed(() => assignments.value.filter(assignment => assignment.state === "ACTIVE"));

const selectedAssignment = computed(() =>
    assignments.value.find(assignment => assignment.assignment_id === selectedAssignmentId.value)
);

const permissionCatalog = computed(() => flattenAuthorityPermissions(authorityTree.value));

const departmentByCode = computed(() => {
    const result = new Map<string, DepartmentTreeVO>();
    flattenDepartmentTree(departmentTree.value).forEach(department => result.set(department.code, department));
    return result;
});

const activeProfiles = computed(() => profiles.value.filter(profile => profile.state === "ACTIVE"));

const rolePermissionOptions = computed(() => {
    const permissionCodes = new Set(roleAuthorization.value?.permission_codes ?? []);
    return permissionCatalog.value.filter(permission => permissionCodes.has(permission.code));
});

const grantablePermissionCodes = computed(() => new Set(roleAuthorization.value?.grantable_permission_codes ?? []));

const editable = computed(() => !selectedAssignment.value || selectedAssignment.value.state === "ACTIVE");

const scopeModesFor = (permission: string): ScopeMode[] => {
    const configured = permissionCatalog.value.find(item => item.code === permission)?.allowed_scope_modes;
    return configured?.length ? [...configured] : ["NONE"];
};

const permissionName = (permission: string) =>
    permissionCatalog.value.find(item => item.code === permission)?.name ?? permission;

const scopeModeLabel = (mode: ScopeMode) => scopeModeOptions.find(option => option.value === mode)?.label ?? mode;

const roleName = (roleId: string) => roles.value.find(role => role.id === roleId)?.name ?? roleId;

const stateLabel = (state: AuthorizationAssignment["state"]) => {
    if (state === "ACTIVE") return "生效中";
    if (state === "REVOKED") return "已撤销";
    return "已过期";
};

const isGrantable = (permission: string) => grantablePermissionCodes.value.has(permission);

const load = async () => {
    loading.value = true;
    try {
        const [nextAssignments, nextRoles, nextProfiles, nextAuthorityTree, nextDepartmentTree] = await Promise.all([
            AuthorizationApi.assignments(props.userId),
            RoleApi.list(),
            AuthorizationApi.profiles().catch(() => []),
            AuthorityApi.tree(),
            DepartmentApi.tree()
        ]);
        assignments.value = nextAssignments ?? [];
        roles.value = (nextRoles ?? []).filter(role => role.state);
        profiles.value = nextProfiles ?? [];
        authorityTree.value = nextAuthorityTree ?? [];
        departmentTree.value = nextDepartmentTree ?? [];
        const firstAssignment = activeAssignments.value[0] ?? assignments.value[0];
        if (firstAssignment) {
            await selectAssignment(firstAssignment.assignment_id);
        } else {
            resetEditor();
        }
    } catch (error) {
        MessageUtils.error(error);
    } finally {
        loading.value = false;
    }
};

const resetEditor = () => {
    selectedAssignmentId.value = "";
    selectedProfileId.value = "";
    selectedRoleId.value = "";
    permissionToAdd.value = "";
    roleAuthorization.value = undefined;
    boundaries.value = [];
};

const selectAssignment = async (assignmentId: string) => {
    if (!assignmentId) {
        resetEditor();
        return;
    }
    const assignment = assignments.value.find(item => item.assignment_id === assignmentId);
    if (!assignment) return;
    selectedAssignmentId.value = assignment.assignment_id;
    selectedRoleId.value = assignment.role_id;
    permissionToAdd.value = "";
    roleAuthorization.value = await AuthorizationApi.currentRole(assignment.role_id);
    boundaries.value = authorizationAssignmentBoundaries(assignment);
};

const handleRoleChange = async () => {
    roleAuthorization.value = selectedRoleId.value
        ? await AuthorizationApi.currentRole(selectedRoleId.value)
        : undefined;
    permissionToAdd.value = "";
    boundaries.value = [];
};

const applyProfile = async () => {
    const profile = profiles.value.find(item => item.id === selectedProfileId.value);
    if (!profile) return;
    if (profile.state !== "ACTIVE") {
        MessageUtils.warning("已停用的授权方案不能套用");
        return;
    }
    if (profile.assignments.length !== 1) {
        MessageUtils.warning("当前用户授权步骤一次配置一个 RoleAssignment，包含多个 Role 的方案请在批量授权流程中使用");
        return;
    }
    const profileAssignment = profile.assignments[0];
    const role = roles.value.find(item => item.code === profileAssignment.role_code);
    if (!role) {
        MessageUtils.warning(`方案依赖的 Role 不存在或已停用：${profileAssignment.role_code}`);
        return;
    }
    applyingProfile.value = true;
    try {
        const nextRoleAuthorization = await AuthorizationApi.currentRole(role.id);
        if (nextRoleAuthorization.version !== profileAssignment.role_version) {
            MessageUtils.warning("授权方案依赖的 Role version 已变化，请先刷新或更新授权方案");
            return;
        }
        const rolePermissionCodes = new Set(nextRoleAuthorization.permission_codes);
        if (profileAssignment.boundaries.some(boundary => !rolePermissionCodes.has(boundary.permission))) {
            MessageUtils.warning("授权方案中的 Permission 已不属于当前 Role，请先更新授权方案");
            return;
        }
        const nextBoundaries = authorizationBoundariesFromProfile(profileAssignment, departmentByCode.value);
        if (!nextBoundaries) {
            MessageUtils.warning("授权方案引用了不存在的部门编码，请先更新授权方案");
            return;
        }
        selectedRoleId.value = role.id;
        roleAuthorization.value = nextRoleAuthorization;
        boundaries.value = nextBoundaries;
        permissionToAdd.value = "";
        selectedProfileId.value = "";
        MessageUtils.success(`已套用授权方案：${profile.name}，提交前仍可调整当前用户的授权范围`);
    } finally {
        applyingProfile.value = false;
    }
};

const addBoundary = () => {
    if (!permissionToAdd.value || boundaries.value.some(boundary => boundary.permission === permissionToAdd.value))
        return;
    const [defaultMode = "NONE"] = scopeModesFor(permissionToAdd.value);
    boundaries.value.push({
        permission: permissionToAdd.value,
        access: createAuthorizationScope(defaultMode),
        grantEnabled: false,
        grant: createAuthorizationScope(defaultMode)
    });
    permissionToAdd.value = "";
};

const removeBoundary = (permission: string) => {
    boundaries.value = boundaries.value.filter(boundary => boundary.permission !== permission);
};

const validateEditor = () => {
    if (!selectedRoleId.value || !roleAuthorization.value) {
        MessageUtils.warning("请先选择有效 Role");
        return false;
    }
    if (!boundaries.value.length) {
        MessageUtils.warning("至少添加一个 Permission-specific Access Boundary");
        return false;
    }
    const rolePermissionCodes = new Set(roleAuthorization.value.permission_codes);
    for (const boundary of boundaries.value) {
        if (!rolePermissionCodes.has(boundary.permission)) {
            MessageUtils.warning(`Role 未声明 Permission：${boundary.permission}`);
            return false;
        }
        if (!scopeModesFor(boundary.permission).includes(boundary.access.mode)) {
            MessageUtils.warning(`Permission ${boundary.permission} 不允许 Access Scope：${boundary.access.mode}`);
            return false;
        }
        if (boundary.access.mode === "RULES" && !boundary.access.department_ids.length) {
            MessageUtils.warning(`Permission ${boundary.permission} 的 Access RULES 必须选择组织`);
            return false;
        }
        if (boundary.grantEnabled) {
            if (!isGrantable(boundary.permission)) {
                MessageUtils.warning(`Role 未声明 GrantablePermission：${boundary.permission}`);
                return false;
            }
            if (!scopeModesFor(boundary.permission).includes(boundary.grant.mode)) {
                MessageUtils.warning(`Permission ${boundary.permission} 不允许 Grant Scope：${boundary.grant.mode}`);
                return false;
            }
            if (boundary.grant.mode === "RULES" && !boundary.grant.department_ids.length) {
                MessageUtils.warning(`Permission ${boundary.permission} 的 Grant RULES 必须选择组织`);
                return false;
            }
        }
    }
    return true;
};

const buildRequest = (): AuthorizationAssignmentChange => ({
    assignment_id: selectedAssignmentId.value || undefined,
    role_id: selectedRoleId.value,
    expected_version: selectedAssignment.value?.version ?? 0,
    boundaries: boundaries.value.map(boundary => ({
        permission: boundary.permission,
        access: toAuthorizationScopeChange(boundary.access),
        grant: boundary.grantEnabled ? toAuthorizationScopeChange(boundary.grant) : undefined
    }))
});

const handleSave = async () => {
    if (!validateEditor()) return;
    saving.value = true;
    try {
        const request = buildRequest();
        const preview = await AuthorizationApi.previewAssignment(props.userId, request);
        await MessageUtils.box.confirm(
            `本次 RoleAssignment 变更将影响 ${preview.affected_user_count} 个用户、${preview.affected_assignment_count} 个授权实例，是否继续提交？`,
            "确认 RoleAssignment 变更"
        );
        await AuthorizationApi.applyAssignment(props.userId, {
            ...request,
            expected_version: preview.expected_version,
            preview_token: preview.preview_token
        });
        await load();
        MessageUtils.success("RoleAssignment 已提交");
    } finally {
        saving.value = false;
    }
};

onMounted(load);
</script>

<template>
    <el-skeleton v-if="loading" :rows="5" animated />
    <template v-else>
        <div class="authorization-toolbar-grid">
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
                        套用方案
                    </el-button>
                </div>
            </div>

            <div class="authorization-tool">
                <strong class="authorization-tool-title">编辑已有角色授权</strong>
                <div class="authorization-tool-controls">
                    <el-select
                        v-model="selectedAssignmentId"
                        placeholder="选择要编辑的角色授权"
                        clearable
                        filterable
                        @change="selectAssignment">
                        <el-option
                            v-for="assignment in assignments"
                            :key="assignment.assignment_id"
                            :label="`${roleName(assignment.role_id)} · ${stateLabel(assignment.state)}`"
                            :value="assignment.assignment_id">
                            <span>{{ assignment.role_name }}（{{ assignment.role_code }}）</span>
                            <el-tag size="small" :type="assignment.state === 'ACTIVE' ? 'success' : 'info'">
                                {{ stateLabel(assignment.state) }}
                            </el-tag>
                        </el-option>
                    </el-select>
                    <el-button @click="resetEditor">新建角色授权</el-button>
                </div>
            </div>
        </div>

        <div class="role-boundary-toolbar" :class="{ 'has-boundary': selectedRoleId && editable }">
            <div class="assignment-form">
                <div class="role-field-label">
                    <strong class="authorization-tool-title">
                        角色
                        <span class="required-mark">*</span>
                    </strong>
                    <el-text v-if="selectedAssignment" class="role-version" type="info" size="small">
                        授权实例版本：{{ selectedAssignment.version }}；角色版本：{{ selectedAssignment.role_version }}
                    </el-text>
                </div>
                <el-select
                    v-model="selectedRoleId"
                    placeholder="请选择角色"
                    filterable
                    :disabled="!editable"
                    @change="handleRoleChange">
                    <el-option
                        v-for="role in roles"
                        :key="role.id"
                        :label="`${role.name}（${role.code}）`"
                        :value="role.id">
                        <span>{{ role.name }}（{{ role.code }}）</span>
                        <el-tag v-if="role.builtin" size="small" type="info">系统托管</el-tag>
                    </el-option>
                </el-select>
            </div>

            <template v-if="selectedRoleId && editable">
                <div class="boundary-add-row">
                    <strong class="authorization-tool-title">添加访问范围</strong>
                    <div class="boundary-add-controls">
                        <el-select v-model="permissionToAdd" placeholder="选择角色已声明的权限" filterable>
                            <el-option
                                v-for="permission in rolePermissionOptions"
                                :key="permission.code"
                                :label="`${permission.name}（${permission.code}）`"
                                :value="permission.code"
                                :disabled="boundaries.some(boundary => boundary.permission === permission.code)" />
                        </el-select>
                        <el-button type="primary" plain :disabled="!permissionToAdd" @click="addBoundary">
                            添加访问范围
                        </el-button>
                    </div>
                </div>
            </template>
        </div>

        <el-alert
            v-if="selectedAssignment && !editable"
            title="历史授权实例只读，不能覆盖历史记录。"
            type="info"
            :closable="false" />

        <template v-if="selectedRoleId && editable">
            <el-alert
                v-if="!rolePermissionOptions.length"
                title="当前角色没有可配置的权限，不能提交空的访问范围。"
                type="error"
                :closable="false" />

            <el-card v-for="boundary in boundaries" :key="boundary.permission" class="boundary-card" shadow="never">
                <template #header>
                    <div class="boundary-header">
                        <span>{{ permissionName(boundary.permission) }}（{{ boundary.permission }}）</span>
                        <el-button link type="danger" @click="removeBoundary(boundary.permission)">移除</el-button>
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
                        <el-checkbox v-model="boundary.grantEnabled" :disabled="!isGrantable(boundary.permission)">
                            允许向下授权此权限
                        </el-checkbox>
                        <el-text v-if="!isGrantable(boundary.permission)" type="info" size="small">
                            当前角色未声明可授权权限
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

            <el-empty v-if="!boundaries.length" description="尚未配置权限访问范围" />
            <div class="assignment-actions">
                <el-button type="primary" :loading="saving" :disabled="!boundaries.length" @click="handleSave">
                    预览并应用
                </el-button>
            </div>
        </template>
    </template>
</template>

<style scoped lang="scss">
.boundary-add-row,
.boundary-header,
.assignment-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.boundary-add-row {
    margin: 12px 0;
}

.authorization-toolbar-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 16px 0;
}

.authorization-tool {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 4px;
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

.authorization-tool-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.authorization-tool-controls .el-select,
.boundary-add-controls .el-select {
    flex: 1;
    min-width: 0;
}

.role-boundary-toolbar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    gap: 12px;
    margin: 12px 0;
}

.role-boundary-toolbar:not(.has-boundary) .assignment-form {
    grid-column: 1 / -1;
}

.role-boundary-toolbar .assignment-form,
.role-boundary-toolbar .boundary-add-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    min-width: 0;
    box-sizing: border-box;
    gap: 4px;
    margin: 0;
    padding: 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    background: var(--el-fill-color-light);
}

.boundary-add-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    width: 100%;
}

.role-field-label {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
}

.required-mark {
    margin-left: 2px;
    color: var(--el-color-danger);
}

.role-version {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.profile-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.assignment-form,
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

.assignment-actions {
    justify-content: flex-end;
    margin-top: 16px;
}

@media (max-width: 768px) {
    .authorization-toolbar-grid {
        grid-template-columns: 1fr;
    }

    .role-boundary-toolbar {
        grid-template-columns: 1fr;
    }

    .role-boundary-toolbar:not(.has-boundary) .assignment-form {
        grid-column: auto;
    }

    .boundary-add-row {
        align-items: stretch;
        flex-direction: column;
    }

    .boundary-add-controls {
        align-items: stretch;
        flex-direction: column;
    }
}
</style>
