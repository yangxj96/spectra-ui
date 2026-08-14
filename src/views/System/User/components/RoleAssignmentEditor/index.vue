<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { AuthorityApi } from "@/api/auth/authority-api.ts";
import { AuthorizationApi } from "@/api/auth/authorization-api.ts";
import { RoleApi } from "@/api/auth/role-api.ts";
import { DepartmentApi } from "@/api/user/department-api.ts";
import { treeDefaultProps } from "@/utils/default-config.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const props = defineProps<{
    userId: string;
}>();

type ScopeMode = AuthorizationScopeChange["mode"];

type ScopeForm = AuthorizationScopeChange;

type BoundaryForm = {
    permission: string;
    access: ScopeForm;
    grantEnabled: boolean;
    grant: ScopeForm;
};

const scopeModeOptions: { value: ScopeMode; label: string }[] = [
    { value: "NONE", label: "NONE（仅能力，不限定数据范围）" },
    { value: "ALL", label: "ALL（显式全范围）" },
    { value: "SELF", label: "SELF（仅当前主体数据）" },
    { value: "RULES", label: "RULES（按组织规则）" }
];

const assignments = ref<AuthorizationAssignment[]>([]);
const roles = ref<RolePageVO[]>([]);
const authorityTree = ref<AuthorityTree[]>([]);
const departmentTree = ref<DepartmentTreeVO[]>([]);
const selectedAssignmentId = ref("");
const selectedRoleId = ref("");
const permissionToAdd = ref("");
const roleAuthorization = ref<RoleAuthorizationState>();
const boundaries = ref<BoundaryForm[]>([]);
const loading = ref(false);
const saving = ref(false);

const activeAssignments = computed(() => assignments.value.filter(assignment => assignment.state === "ACTIVE"));

const selectedAssignment = computed(() =>
    assignments.value.find(assignment => assignment.assignment_id === selectedAssignmentId.value)
);

const permissionCatalog = computed(() => flattenPermissions(authorityTree.value));

const rolePermissionOptions = computed(() => {
    const permissionCodes = new Set(roleAuthorization.value?.permission_codes ?? []);
    return permissionCatalog.value.filter(permission => permissionCodes.has(permission.code));
});

const grantablePermissionCodes = computed(() => new Set(roleAuthorization.value?.grantable_permission_codes ?? []));

const editable = computed(() => !selectedAssignment.value || selectedAssignment.value.state === "ACTIVE");

const flattenPermissions = (nodes: AuthorityTree[]): AuthorityTree[] =>
    nodes.flatMap(node => (node.children?.length ? flattenPermissions(node.children) : [node]));

const createScope = (mode: ScopeMode = "NONE"): ScopeForm => ({
    mode,
    department_ids: [],
    include_descendants: false
});

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

const scopeFromBoundary = (boundary: AuthorizationBoundary): ScopeForm => ({
    mode: boundary.scope_mode,
    department_ids: (boundary.rules ?? []).map(rule => rule.department_id).filter((id): id is string => Boolean(id)),
    include_descendants: (boundary.rules ?? []).some(rule => rule.include_descendants)
});

const assignmentBoundaries = (assignment: AuthorizationAssignment): BoundaryForm[] => {
    const grants = new Map(assignment.grant_boundaries.map(boundary => [boundary.permission_code, boundary]));
    return assignment.access_boundaries.map(access => {
        const grant = grants.get(access.permission_code);
        return {
            permission: access.permission_code,
            access: scopeFromBoundary(access),
            grantEnabled: Boolean(grant),
            grant: grant ? scopeFromBoundary(grant) : createScope()
        };
    });
};

const load = async () => {
    loading.value = true;
    try {
        const [nextAssignments, nextRoles, nextAuthorityTree, nextDepartmentTree] = await Promise.all([
            AuthorizationApi.assignments(props.userId),
            RoleApi.list(),
            AuthorityApi.tree(),
            DepartmentApi.tree()
        ]);
        assignments.value = nextAssignments ?? [];
        roles.value = (nextRoles ?? []).filter(role => role.state);
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
    boundaries.value = assignmentBoundaries(assignment);
};

const handleRoleChange = async () => {
    roleAuthorization.value = selectedRoleId.value
        ? await AuthorizationApi.currentRole(selectedRoleId.value)
        : undefined;
    permissionToAdd.value = "";
    boundaries.value = [];
};

const addBoundary = () => {
    if (!permissionToAdd.value || boundaries.value.some(boundary => boundary.permission === permissionToAdd.value))
        return;
    const [defaultMode = "NONE"] = scopeModesFor(permissionToAdd.value);
    boundaries.value.push({
        permission: permissionToAdd.value,
        access: createScope(defaultMode),
        grantEnabled: false,
        grant: createScope(defaultMode)
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

const toScopeChange = (scope: ScopeForm): AuthorizationScopeChange => ({
    mode: scope.mode,
    department_ids: scope.mode === "RULES" ? scope.department_ids : [],
    include_descendants: scope.mode === "RULES" && scope.include_descendants
});

const buildRequest = (): AuthorizationAssignmentChange => ({
    assignment_id: selectedAssignmentId.value || undefined,
    role_id: selectedRoleId.value,
    expected_version: selectedAssignment.value?.version ?? 0,
    boundaries: boundaries.value.map(boundary => ({
        permission: boundary.permission,
        access: toScopeChange(boundary.access),
        grant: boundary.grantEnabled ? toScopeChange(boundary.grant) : undefined
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
    <el-divider content-position="left">RoleAssignment 授权实例</el-divider>
    <el-alert
        title="每个 Permission 都必须显式配置 Access Boundary；Grant Boundary 独立管理，缺失不会自动扩大为 ALL。"
        type="warning"
        :closable="false"
        show-icon />

    <el-skeleton v-if="loading" :rows="5" animated />
    <template v-else>
        <div class="assignment-toolbar">
            <el-select
                v-model="selectedAssignmentId"
                placeholder="选择已有授权实例"
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
            <el-button @click="resetEditor">新建 RoleAssignment</el-button>
        </div>

        <el-form label-width="110px" class="assignment-form">
            <el-form-item label="Role" required>
                <el-select
                    v-model="selectedRoleId"
                    placeholder="请选择 Role"
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
                <el-text v-if="selectedAssignment" type="info" size="small">
                    Assignment version：{{ selectedAssignment.version }}；Role version：{{
                        selectedAssignment.role_version
                    }}
                </el-text>
            </el-form-item>
        </el-form>

        <el-alert
            v-if="selectedAssignment && !editable"
            title="历史授权实例只读，不能覆盖历史记录。"
            type="info"
            :closable="false" />

        <template v-if="selectedRoleId && editable">
            <div class="boundary-add-row">
                <el-select v-model="permissionToAdd" placeholder="选择 Role 已声明的 Permission" filterable>
                    <el-option
                        v-for="permission in rolePermissionOptions"
                        :key="permission.code"
                        :label="`${permission.name}（${permission.code}）`"
                        :value="permission.code"
                        :disabled="boundaries.some(boundary => boundary.permission === permission.code)" />
                </el-select>
                <el-button type="primary" plain :disabled="!permissionToAdd" @click="addBoundary">
                    添加 Access Boundary
                </el-button>
            </div>

            <el-alert
                v-if="!rolePermissionOptions.length"
                title="当前 Role 没有可配置的 Permission，不能提交空 Boundary。"
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
                    <el-form-item label="Access Scope">
                        <el-select v-model="boundary.access.mode">
                            <el-option
                                v-for="mode in scopeModesFor(boundary.permission)"
                                :key="mode"
                                :label="scopeModeLabel(mode)"
                                :value="mode" />
                        </el-select>
                    </el-form-item>
                    <el-form-item v-if="boundary.access.mode === 'RULES'" label="Access 组织">
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
                    <el-form-item label="Grant Boundary">
                        <el-checkbox v-model="boundary.grantEnabled" :disabled="!isGrantable(boundary.permission)">
                            允许向下授权此 Permission
                        </el-checkbox>
                        <el-text v-if="!isGrantable(boundary.permission)" type="info" size="small">
                            当前 Role 未声明 GrantablePermission
                        </el-text>
                    </el-form-item>
                    <template v-if="boundary.grantEnabled">
                        <el-form-item label="Grant Scope">
                            <el-select v-model="boundary.grant.mode">
                                <el-option
                                    v-for="mode in scopeModesFor(boundary.permission)"
                                    :key="mode"
                                    :label="scopeModeLabel(mode)"
                                    :value="mode" />
                            </el-select>
                        </el-form-item>
                        <el-form-item v-if="boundary.grant.mode === 'RULES'" label="Grant 组织">
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

            <el-empty v-if="!boundaries.length" description="尚未配置 Permission Boundary" />
            <div class="assignment-actions">
                <el-button type="primary" :loading="saving" :disabled="!boundaries.length" @click="handleSave">
                    Preview 并 Apply
                </el-button>
            </div>
        </template>
    </template>
</template>

<style scoped lang="scss">
.assignment-toolbar,
.boundary-add-row,
.boundary-header,
.assignment-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.assignment-toolbar,
.boundary-add-row {
    margin: 12px 0;
}

.assignment-toolbar .el-select,
.boundary-add-row .el-select {
    flex: 1;
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
</style>
