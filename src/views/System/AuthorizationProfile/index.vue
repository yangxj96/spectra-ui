<script setup lang="ts">
import { type FormInstance, type FormRules } from "element-plus";
import { computed, onMounted, reactive, ref, useTemplateRef } from "vue";
import { useRouter } from "vue-router";

import { AuthorityApi } from "@/api/auth/authority-api.ts";
import { AuthorizationApi } from "@/api/auth/authorization-api.ts";
import { RoleApi } from "@/api/auth/role-api.ts";
import { DepartmentApi } from "@/api/user/department-api.ts";
import { treeDefaultProps } from "@/utils/default-config.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

type ScopeMode = AuthorizationProfileScope["mode"];

type ProfileScopeDraft = AuthorizationProfileScope;

type ProfileBoundaryDraft = AuthorizationProfileBoundary;

type ProfileAssignmentDraft = AuthorizationProfileAssignment & {
    permission_to_add: string;
};

type ProfileForm = Omit<AuthorizationProfileSave, "assignments"> & {
    assignments: ProfileAssignmentDraft[];
};

const router = useRouter();
const formRef = useTemplateRef<FormInstance>("formRef");
const profiles = ref<AuthorizationProfile[]>([]);
const roles = ref<RolePageVO[]>([]);
const authorityTree = ref<AuthorityTree[]>([]);
const departmentTree = ref<DepartmentTreeVO[]>([]);
const roleAuthorizations = ref<Record<string, RoleAuthorizationState>>({});
const loading = ref(false);
const saving = ref(false);
const editorVisible = ref(false);
const editingId = ref("");
const form = reactive<ProfileForm>(createForm());

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

const permissionCatalog = computed(() => flattenPermissions(authorityTree.value));
const activeRoles = computed(() => roles.value.filter(role => role.state));
const editorTitle = computed(() => (editingId.value ? "编辑授权方案" : "新建授权方案"));

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

function createAssignment(): ProfileAssignmentDraft {
    return {
        role_code: "",
        role_version: 0,
        boundaries: [],
        permission_to_add: ""
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

function statusLabel(state: AuthorizationProfile["state"]): string {
    return state === "ACTIVE" ? "启用" : "停用";
}

function statusType(state: AuthorizationProfile["state"]): "success" | "info" {
    return state === "ACTIVE" ? "success" : "info";
}

function roleLabel(roleCode: string): string {
    const role = roles.value.find(item => item.code === roleCode);
    return role ? `${role.name}（${role.code}）` : roleCode;
}

function permissionName(permission: string): string {
    return permissionCatalog.value.find(item => item.code === permission)?.name ?? permission;
}

function scopeModeLabel(mode: ScopeMode): string {
    return scopeModeOptions.find(option => option.value === mode)?.label ?? mode;
}

function roleAuthorization(roleCode: string): RoleAuthorizationState | undefined {
    return roleAuthorizations.value[roleCode];
}

function permissionOptions(assignment: ProfileAssignmentDraft): AuthorityTree[] {
    const permissionCodes = new Set(roleAuthorization(assignment.role_code)?.permission_codes ?? []);
    return permissionCatalog.value.filter(permission => permissionCodes.has(permission.code));
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
        assignments: profile.assignments.map(assignment => ({
            role_code: assignment.role_code,
            role_version: assignment.role_version,
            permission_to_add: "",
            boundaries: assignment.boundaries.map(boundary => ({
                permission: boundary.permission,
                access: copyScope(boundary.access),
                grant: boundary.grant ? copyScope(boundary.grant) : undefined
            }))
        }))
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
        const [nextProfiles, nextRoles, nextAuthorityTree, nextDepartmentTree] = await Promise.all([
            AuthorizationApi.profiles(),
            RoleApi.list(),
            AuthorityApi.tree(),
            DepartmentApi.tree()
        ]);
        profiles.value = nextProfiles ?? [];
        roles.value = (nextRoles ?? []).filter(role => role.state);
        authorityTree.value = nextAuthorityTree ?? [];
        departmentTree.value = nextDepartmentTree ?? [];
    } catch (error: unknown) {
        MessageUtils.error(error);
    } finally {
        loading.value = false;
    }
}

function openCreate(): void {
    Object.assign(form, createForm());
    editingId.value = "";
    editorVisible.value = true;
}

async function openEdit(profile: AuthorizationProfile): Promise<void> {
    try {
        await Promise.all(profile.assignments.map(assignment => ensureRoleAuthorization(assignment.role_code)));
        Object.assign(form, toDraft(profile));
        editingId.value = profile.id;
        editorVisible.value = true;
    } catch (error: unknown) {
        MessageUtils.error(error);
    }
}

function closeEditor(): void {
    editorVisible.value = false;
    editingId.value = "";
}

async function handleRoleChange(assignment: ProfileAssignmentDraft): Promise<void> {
    assignment.boundaries = [];
    assignment.permission_to_add = "";
    const authorization = await ensureRoleAuthorization(assignment.role_code);
    assignment.role_version = authorization?.version ?? 0;
}

function addAssignment(): void {
    form.assignments.push(createAssignment());
}

function removeAssignment(index: number): void {
    form.assignments.splice(index, 1);
}

function addBoundary(assignment: ProfileAssignmentDraft): void {
    const permission = assignment.permission_to_add;
    if (!permission || assignment.boundaries.some(boundary => boundary.permission === permission)) return;
    const [defaultMode = "NONE"] = scopeModesFor(permission);
    assignment.boundaries.push(createBoundary(permission, defaultMode));
    assignment.permission_to_add = "";
}

function removeBoundary(assignment: ProfileAssignmentDraft, permission: string): void {
    assignment.boundaries = assignment.boundaries.filter(boundary => boundary.permission !== permission);
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
        MessageUtils.warning("至少配置一个 Role");
        return false;
    }
    const roleCodes = new Set<string>();
    for (const assignment of form.assignments) {
        if (!assignment.role_code) {
            MessageUtils.warning("请选择 Role");
            return false;
        }
        if (!roleCodes.add(assignment.role_code)) {
            MessageUtils.warning("同一个授权方案不能重复配置 Role");
            return false;
        }
        const role = roles.value.find(item => item.code === assignment.role_code);
        const authorization = roleAuthorization(assignment.role_code);
        if (!role || !authorization) {
            MessageUtils.warning(`无法读取 Role 授权信息：${assignment.role_code}`);
            return false;
        }
        if (role.role_kind === "DEV_OPS") {
            MessageUtils.warning("DEV_OPS Role 不能通过普通授权方案配置");
            return false;
        }
        if (assignment.role_version !== authorization.version) {
            MessageUtils.warning(`${assignment.role_code} 的 Role version 已变化，请重新选择 Role`);
            return false;
        }
        if (!assignment.boundaries.length) {
            MessageUtils.warning(`${assignment.role_code} 至少需要一个 Permission Boundary`);
            return false;
        }
        const permissionCodes = new Set<string>();
        const rolePermissionCodes = new Set(authorization.permission_codes);
        const grantableCodes = new Set(authorization.grantable_permission_codes);
        for (const boundary of assignment.boundaries) {
            if (!permissionCodes.add(boundary.permission)) {
                MessageUtils.warning(`Permission 不能重复配置：${boundary.permission}`);
                return false;
            }
            if (!rolePermissionCodes.has(boundary.permission)) {
                MessageUtils.warning(`${assignment.role_code} 未声明 Permission：${boundary.permission}`);
                return false;
            }
            if (!validateScope(boundary.access, boundary.permission, "Access Scope")) return false;
            if (boundary.grant) {
                if (!grantableCodes.has(boundary.permission)) {
                    MessageUtils.warning(`${assignment.role_code} 未声明 GrantablePermission：${boundary.permission}`);
                    return false;
                }
                if (!validateScope(boundary.grant, boundary.permission, "Grant Scope")) return false;
            }
        }
    }
    return true;
}

async function handleSave(): Promise<void> {
    if (!formRef.value) return;
    try {
        await formRef.value.validate();
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
        closeEditor();
        await load();
    } catch (error: unknown) {
        MessageUtils.error(error);
    } finally {
        saving.value = false;
    }
}

async function handleDisable(profile: AuthorizationProfile): Promise<void> {
    if (profile.state !== "ACTIVE") return;
    try {
        await MessageUtils.box.confirm(
            `停用后不能用于新用户和批量导入，已经生成的 RoleAssignment 不受影响。是否停用「${profile.name}」？`,
            "停用授权方案"
        );
        await AuthorizationApi.disableProfile(profile.id);
        MessageUtils.success("授权方案已停用");
        await load();
    } catch (error: unknown) {
        if (error !== "cancel" && error !== "close") MessageUtils.error(error);
    }
}

async function goToUserAuthorization(): Promise<void> {
    await router.push({ name: "SystemUser" });
}

onMounted(load);
</script>

<template>
    <div v-loading="loading" class="profile-page">
        <div class="page-header">
            <div>
                <div class="breadcrumb" @click="goToUserAuthorization">访问控制 / 授权方案</div>
                <h2>授权方案</h2>
                <p>把常用的 Role、Permission 和数据范围保存为模板，用户开通和批量导入时可以复用。</p>
            </div>
            <el-button type="primary" @click="openCreate">新建授权方案</el-button>
        </div>

        <el-alert
            title="授权方案不是运行时授权实例。套用后仍需根据当前用户完成 Preview/Apply，方案停用不会撤销已生效授权。"
            type="info"
            :closable="false"
            show-icon />

        <el-table :data="profiles" stripe class="profile-table">
            <el-table-column prop="name" label="方案名称" min-width="180" />
            <el-table-column prop="code" label="方案编码" min-width="180" show-overflow-tooltip />
            <el-table-column label="包含 Role" min-width="240">
                <template #default="scope">
                    <el-space wrap>
                        <el-tag v-for="assignment in scope.row.assignments" :key="assignment.role_code" type="info">
                            {{ roleLabel(assignment.role_code) }}
                        </el-tag>
                    </el-space>
                </template>
            </el-table-column>
            <el-table-column prop="version" label="版本" width="90" />
            <el-table-column label="状态" width="100">
                <template #default="scope">
                    <el-tag :type="statusType(scope.row.state)">{{ statusLabel(scope.row.state) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
            <el-table-column label="操作" width="180" fixed="right">
                <template #default="scope">
                    <el-button link type="primary" @click="openEdit(scope.row)">编辑</el-button>
                    <el-button v-if="scope.row.state === 'ACTIVE'" link type="danger" @click="handleDisable(scope.row)">
                        停用
                    </el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-dialog v-model="editorVisible" :title="editorTitle" width="min(1120px, 94vw)" top="5vh" destroy-on-close>
            <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
                <el-row :gutter="24">
                    <el-col :span="8">
                        <el-form-item label="方案编码" prop="code">
                            <el-input v-model="form.code" :disabled="Boolean(editingId)" clearable />
                        </el-form-item>
                    </el-col>
                    <el-col :span="8">
                        <el-form-item label="方案名称" prop="name">
                            <el-input v-model="form.name" clearable />
                        </el-form-item>
                    </el-col>
                    <el-col :span="8">
                        <el-form-item label="方案说明" prop="description">
                            <el-input v-model="form.description" clearable />
                        </el-form-item>
                    </el-col>
                </el-row>

                <div class="assignment-heading">
                    <div>
                        <strong>Role 配置</strong>
                        <span>每个 Role 都要至少配置一个 Permission Boundary。</span>
                    </div>
                    <el-button plain @click="addAssignment">添加 Role</el-button>
                </div>

                <el-empty v-if="!form.assignments.length" description="尚未配置 Role" />
                <div
                    v-for="(assignment, assignmentIndex) in form.assignments"
                    :key="assignmentIndex"
                    class="assignment-card">
                    <div class="assignment-header">
                        <el-select
                            v-model="assignment.role_code"
                            placeholder="选择 Role"
                            filterable
                            @change="handleRoleChange(assignment)">
                            <el-option
                                v-for="role in activeRoles"
                                :key="role.id"
                                :label="`${role.name}（${role.code}）`"
                                :value="role.code">
                                <span>{{ role.name }}（{{ role.code }}）</span>
                                <el-tag v-if="role.role_kind === 'DEV_OPS'" size="small" type="danger">
                                    不可用于方案
                                </el-tag>
                            </el-option>
                        </el-select>
                        <el-text v-if="assignment.role_code" type="info">
                            Role version：{{ assignment.role_version }}
                        </el-text>
                        <el-button link type="danger" @click="removeAssignment(assignmentIndex)">移除 Role</el-button>
                    </div>

                    <template v-if="assignment.role_code">
                        <div class="permission-add-row">
                            <el-select
                                v-model="assignment.permission_to_add"
                                placeholder="选择 Role 已声明的 Permission"
                                filterable
                                :disabled="!roleAuthorization(assignment.role_code)">
                                <el-option
                                    v-for="permission in permissionOptions(assignment)"
                                    :key="permission.code"
                                    :label="`${permission.name}（${permission.code}）`"
                                    :value="permission.code"
                                    :disabled="
                                        assignment.boundaries.some(item => item.permission === permission.code)
                                    " />
                            </el-select>
                            <el-button
                                type="primary"
                                plain
                                :disabled="!assignment.permission_to_add"
                                @click="addBoundary(assignment)">
                                添加 Permission
                            </el-button>
                        </div>

                        <el-card
                            v-for="boundary in assignment.boundaries"
                            :key="boundary.permission"
                            class="boundary-card"
                            shadow="never">
                            <template #header>
                                <div class="boundary-header">
                                    <span>{{ permissionName(boundary.permission) }}（{{ boundary.permission }}）</span>
                                    <el-button
                                        link
                                        type="danger"
                                        @click="removeBoundary(assignment, boundary.permission)">
                                        移除
                                    </el-button>
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
                                        v-model="boundary.access.department_codes"
                                        :data="departmentTree"
                                        node-key="code"
                                        multiple
                                        check-strictly
                                        default-expand-all
                                        :props="treeDefaultProps"
                                        placeholder="选择组织规则" />
                                    <el-checkbox v-model="boundary.access.include_descendants">包含子部门</el-checkbox>
                                </el-form-item>
                                <el-form-item label="Grant Boundary">
                                    <el-checkbox
                                        :model-value="Boolean(boundary.grant)"
                                        :disabled="!grantablePermissions(assignment).has(boundary.permission)"
                                        @update:model-value="setGrantEnabled(boundary, $event)">
                                        允许向下授权此 Permission
                                    </el-checkbox>
                                    <el-text
                                        v-if="!grantablePermissions(assignment).has(boundary.permission)"
                                        type="info"
                                        size="small">
                                        当前 Role 未声明 GrantablePermission
                                    </el-text>
                                </el-form-item>
                                <template v-if="boundary.grant">
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

                        <el-empty v-if="!assignment.boundaries.length" description="尚未配置 Permission Boundary" />
                    </template>
                </div>
            </el-form>

            <template #footer>
                <el-button @click="closeEditor">取消</el-button>
                <el-button type="primary" :loading="saving" @click="handleSave">保存方案</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.profile-page {
    min-height: 100%;
    padding: 28px 32px 32px;
    overflow: auto;
    background: var(--el-bg-color);
}

.page-header,
.assignment-heading,
.assignment-header,
.permission-add-row,
.boundary-header {
    display: flex;
    align-items: center;
    gap: 12px;
}

.page-header {
    justify-content: space-between;
    margin-bottom: 20px;
}

.breadcrumb {
    color: var(--el-color-primary);
    cursor: pointer;
    font-size: 13px;
}

.page-header h2 {
    margin: 8px 0 4px;
    color: var(--el-text-color-primary);
    font-size: 24px;
}

.page-header p {
    margin: 0;
    color: var(--el-text-color-secondary);
}

.profile-table {
    margin-top: 18px;
}

.assignment-heading {
    justify-content: space-between;
    margin: 12px 0;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.assignment-heading div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.assignment-heading span {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.assignment-card {
    margin-top: 14px;
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
}

.assignment-header {
    justify-content: space-between;
}

.assignment-header .el-select,
.permission-add-row .el-select {
    flex: 1;
}

.permission-add-row {
    margin: 14px 0;
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
    .profile-page {
        padding: 20px 16px 24px;
    }

    .page-header,
    .assignment-header,
    .permission-add-row {
        align-items: stretch;
        flex-direction: column;
    }
}
</style>
