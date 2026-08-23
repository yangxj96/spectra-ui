<script setup lang="ts">
import { ElTreeV2, type FormInstance, type FormRules, type TreeV2Instance } from "element-plus";
import { computed, nextTick, onMounted, reactive, ref, useTemplateRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AuthorityApi } from "@/api/auth/authority-api.ts";
import { AuthorizationApi } from "@/api/auth/authorization-api.ts";
import { RoleApi } from "@/api/auth/role-api.ts";
import { MenuApi } from "@/api/system/menu-api.ts";
import StepNavigation from "@/components/StepNavigation/index.vue";
import type { StepNavigationItem } from "@/components/StepNavigation/types.ts";
import { roleConverter, roleKindLabels } from "@/converter/role-converter.ts";
import { collectMenuIds } from "@/utils/menu-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

type RoleEditorNode = "basic" | "permissions" | "grantable" | "menus";
type PermissionView = "all" | "selected" | "unselected";
type PermissionSelection = "permissions" | "grantable";

type PermissionItem = AuthorityTree & {
    groupId: string;
    groupName: string;
    path: string;
};

type PermissionGroup = {
    id: string;
    name: string;
    permissions: PermissionItem[];
};

type PermissionGroupOptions = {
    allowedCodes?: Set<string>;
    search: string;
    selectedCodes: string[];
    view: PermissionView;
};

type MenuTreeData = Menu & {
    displayName: string;
    children?: MenuTreeData[];
};

type MenuCheckInfo = {
    checkedKeys: Array<string | number>;
};

const route = useRoute();
const router = useRouter();
const formRef = useTemplateRef<FormInstance>("formRef");
const menuRef = useTemplateRef<TreeV2Instance>("menuRef");

const form = reactive<RoleForm>(roleConverter.createForm());
const currentRole = ref<RolePageVO>();
const roleAuthorization = ref<RoleAuthorizationState>();
const authorityTree = ref<AuthorityTree[]>([]);
const menuTree = ref<Menu[]>([]);
const currentNode = ref<RoleEditorNode>("basic");
const maxStepIndex = ref(0);
const permissionCodes = ref<string[]>([]);
const grantablePermissionCodes = ref<string[]>([]);
const selectedMenuIds = ref<string[]>([]);
const permissionSearch = ref("");
const permissionView = ref<PermissionView>("all");
const grantableSearch = ref("");
const grantableView = ref<PermissionView>("all");
const menuSearch = ref("");
const menuView = ref<PermissionView>("all");
const loading = ref(false);
const saving = ref(false);

const editingId = computed(() => String(route.params.id ?? ""));
const isModify = computed(() => Boolean(editingId.value));
const isBuiltin = computed(() => Boolean(form.builtin));
const isRoleWritable = computed(() => !isBuiltin.value && form.state);
const currentNodeTip = computed(() => nodeTips[currentNode.value]);
const permissionItems = computed(() => authorityPermissionItems(authorityTree.value));
const permissionGroups = computed(() =>
    buildPermissionGroups(authorityTree.value, {
        selectedCodes: permissionCodes.value,
        search: permissionSearch.value,
        view: permissionView.value
    })
);
const grantableGroups = computed(() =>
    buildPermissionGroups(authorityTree.value, {
        selectedCodes: grantablePermissionCodes.value,
        search: grantableSearch.value,
        view: grantableView.value,
        allowedCodes: new Set(permissionCodes.value)
    })
);
const permissionCount = computed(() => permissionCodes.value.length);
const grantableCount = computed(() => grantablePermissionCodes.value.length);
const grantableCandidateCount = computed(
    () => permissionItems.value.filter(item => permissionCodes.value.includes(item.code)).length
);
const menuNodes = computed(() => flattenMenus(menuTree.value));
const menuDirectoryIds = computed(() =>
    menuNodes.value.filter(menu => menu.menuType === "DIRECTORY").map(menu => menu.id)
);
const menuLeafIds = computed(
    () => new Set(menuNodes.value.filter(menu => menu.menuType === "MENU").map(menu => menu.id))
);
const menuTreeData = computed(() => buildMenuTreeData(menuTree.value));
const menuTreeProps = { label: "displayName" };
const menuTreeHeight = 480;

const permissionResourceLabels: Record<string, string> = {
    account: "认证账号",
    ai: "AI 会话",
    audit: "安全审计",
    department: "部门",
    dictionary: "字典",
    file: "文件",
    "file:admin": "文件资产管理",
    menu: "菜单",
    notification: "通知",
    "notification-setting": "通知设置",
    "notification:admin": "通知运维",
    "oa:application": "OA 申请",
    "oa:application-type": "OA 申请类型",
    "oa:asset": "OA 资产",
    "oa:calendar": "OA 日历",
    "oa:contact": "OA 通讯录",
    "oa:contract": "OA 合同",
    "oa:document": "OA 文档",
    "oa:leave": "OA 请假",
    "oa:meeting": "OA 会议",
    "oa:notice": "OA 公告",
    "oa:purchase": "OA 采购",
    "oa:reimbursement": "OA 报销",
    "oa:report": "OA 报表",
    "oa:workbench": "OA 工作台",
    permission: "权限目录",
    region: "行政区划",
    role: "角色",
    "role:authority-level": "角色管理等级",
    "security:auth-method": "认证方式",
    "security:config": "系统配置",
    "security:crypto": "加解密治理",
    "security:password-policy": "密码策略",
    "security:root": "DEV_OPS Root 治理",
    "security:session-policy": "会话策略",
    session: "在线会话",
    "system:monitor": "系统运行状态",
    user: "用户",
    "workflow:form": "流程表单",
    "workflow:instance": "流程实例",
    "workflow:process": "流程定义",
    "workflow:task": "流程任务"
};

const editorNodes: { id: RoleEditorNode; title: string; description: string }[] = [
    { id: "basic", title: "基本信息", description: "维护角色名称和说明" },
    { id: "permissions", title: "角色权限", description: "配置角色可使用的能力" },
    { id: "grantable", title: "可授予权限", description: "配置角色可向下授权的能力" },
    { id: "menus", title: "角色菜单", description: "配置角色可见的菜单" }
];

const roleNavigationItems = computed<StepNavigationItem[]>(() =>
    editorNodes.map((node, index) => ({
        key: node.id,
        title: node.title,
        description: node.description,
        disabled: index > maxStepIndex.value
    }))
);

const nodeTips: Record<RoleEditorNode, { title: string; description: string; items: string[] }> = {
    basic: {
        title: "角色信息提示",
        description: "角色编码、类型、授权管理等级和内置标记由系统控制。",
        items: ["业务角色可以新增多个。", "角色名称不能与其他角色重复。", "内置角色只能查看，不能编辑或变更状态。"]
    },
    permissions: {
        title: "角色权限提示",
        description: "这里配置角色可以使用的功能和操作权限，同时设置授权管理等级。",
        items: [
            "这里的选择会在最后一步统一提交。",
            "权限调整会影响该角色已有用户的有效授权。",
            "授权管理等级用于限制角色可以授予的目标角色范围，等级越高，可管理的目标角色等级越低。",
            "授权管理等级只控制授权边界，不代表业务角色级别或排序。",
            "内置角色的权限固定，不能在这里修改。"
        ]
    },
    grantable: {
        title: "可授予权限提示",
        description: "可授予权限决定角色能够向下管理哪些能力。",
        items: ["可授予权限必须同时存在于角色权限中。", "范围边界由授权方案继续配置。", "请谨慎扩大可授予权限范围。"]
    },
    menus: {
        title: "角色菜单提示",
        description: "菜单决定角色在管理后台可以看到的导航入口。",
        items: [
            "菜单变更只影响导航可见性，不替代接口权限校验。",
            "提交时会自动包含选中节点的父级目录。",
            "内置角色菜单固定，不能在这里修改。"
        ]
    }
};

const rules: FormRules<RoleForm> = {
    name: [
        { required: true, message: "请输入角色名称", trigger: "blur" },
        { min: 2, max: 120, message: "角色名称长度需要在2-120字符范围内", trigger: "blur" }
    ],
    remark: [{ max: 500, message: "备注不能超过500个字符", trigger: "blur" }]
};

function roleKindLabel(roleKind: string | undefined): string {
    return roleKindLabels[roleKind ?? ""] ?? roleKind ?? "业务角色";
}

function permissionResourceLabel(resourceCode: string): string {
    const normalizedCode = resourceCode.trim().toLocaleLowerCase();
    return permissionResourceLabels[normalizedCode] ?? resourceCode;
}

function authorityPermissionItems(
    nodes: AuthorityTree[],
    parentPath: string[] = [],
    group?: AuthorityTree
): PermissionItem[] {
    const items: PermissionItem[] = [];
    for (const node of nodes) {
        const path = [...parentPath, node.name];
        const currentGroup = group ?? node;
        if (node.children?.length) {
            items.push(...authorityPermissionItems(node.children, path, currentGroup));
        } else {
            items.push({
                ...node,
                groupId: currentGroup.id,
                groupName: currentGroup.name,
                path: path.join(" / ")
            });
        }
    }
    return items;
}

function buildPermissionGroups(nodes: AuthorityTree[], options: PermissionGroupOptions): PermissionGroup[] {
    const selected = new Set(options.selectedCodes);
    const normalizedSearch = options.search.trim().toLocaleLowerCase();
    return nodes
        .map(group => {
            const permissions = authorityPermissionItems([group])
                .filter(item => !options.allowedCodes || options.allowedCodes.has(item.code))
                .filter(item => {
                    const matchesSearch =
                        !normalizedSearch ||
                        [item.name, item.code, item.path].some(value =>
                            value.toLocaleLowerCase().includes(normalizedSearch)
                        );
                    const matchesView =
                        options.view === "all" ||
                        (options.view === "selected" ? selected.has(item.code) : !selected.has(item.code));
                    return matchesSearch && matchesView;
                });
            return { id: group.id, name: permissionResourceLabel(group.name), permissions };
        })
        .filter(group => group.permissions.length > 0);
}

function flattenMenus(nodes: Menu[]): Menu[] {
    return nodes.flatMap(menu => [menu, ...flattenMenus(menu.children ?? [])]);
}

function buildMenuTreeData(nodes: Menu[]): MenuTreeData[] {
    return nodes.map(menu => ({
        ...menu,
        displayName: [menu.name, menu.menuType === "DIRECTORY" ? "目录" : "菜单", menu.routeName]
            .filter(Boolean)
            .join(" · "),
        children: buildMenuTreeData(menu.children ?? [])
    }));
}

function isPermissionSelected(kind: PermissionSelection, code: string): boolean {
    return (kind === "permissions" ? permissionCodes.value : grantablePermissionCodes.value).includes(code);
}

function replacePermissionSelection(kind: PermissionSelection, codes: string[]): void {
    const uniqueCodes = [...new Set(codes)];
    if (kind === "permissions") {
        permissionCodes.value = uniqueCodes;
        const selected = new Set(uniqueCodes);
        grantablePermissionCodes.value = grantablePermissionCodes.value.filter(code => selected.has(code));
    } else {
        const available = new Set(permissionCodes.value);
        grantablePermissionCodes.value = uniqueCodes.filter(code => available.has(code));
    }
}

function updatePermissionSelection(kind: PermissionSelection, code: string, checked: boolean): void {
    const current = kind === "permissions" ? permissionCodes.value : grantablePermissionCodes.value;
    const next = new Set(current);
    if (checked) {
        next.add(code);
    } else {
        next.delete(code);
    }
    replacePermissionSelection(kind, [...next]);
}

function handlePermissionChange(kind: PermissionSelection, code: string, value: unknown): void {
    updatePermissionSelection(kind, code, Boolean(value));
}

function permissionGroupChecked(kind: PermissionSelection, group: PermissionGroup): boolean {
    return group.permissions.length > 0 && group.permissions.every(item => isPermissionSelected(kind, item.code));
}

function permissionGroupIndeterminate(kind: PermissionSelection, group: PermissionGroup): boolean {
    const selectedCount = group.permissions.filter(item => isPermissionSelected(kind, item.code)).length;
    return selectedCount > 0 && selectedCount < group.permissions.length;
}

function updatePermissionGroup(kind: PermissionSelection, group: PermissionGroup, checked: boolean): void {
    const visibleCodes = group.permissions.map(item => item.code);
    const selected = new Set(kind === "permissions" ? permissionCodes.value : grantablePermissionCodes.value);
    for (const code of visibleCodes) {
        if (checked) {
            selected.add(code);
        } else {
            selected.delete(code);
        }
    }
    replacePermissionSelection(kind, [...selected]);
}

function handlePermissionGroupChange(kind: PermissionSelection, group: PermissionGroup, value: unknown): void {
    updatePermissionGroup(kind, group, Boolean(value));
}

function visiblePermissionCodes(kind: PermissionSelection): string[] {
    const groups = kind === "permissions" ? permissionGroups.value : grantableGroups.value;
    return groups.flatMap(group => group.permissions.map(item => item.code));
}

function updateVisiblePermissions(kind: PermissionSelection, checked: boolean): void {
    const visibleCodes = visiblePermissionCodes(kind);
    const current = new Set(kind === "permissions" ? permissionCodes.value : grantablePermissionCodes.value);
    for (const code of visibleCodes) {
        if (checked) {
            current.add(code);
        } else {
            current.delete(code);
        }
    }
    replacePermissionSelection(kind, [...current]);
}

function scopeModeLabel(modes: AuthorityTree["allowed_scope_modes"]): string {
    const labels: Record<string, string> = { ALL: "全部数据", NONE: "不限定范围", RULES: "按规则", SELF: "仅当前数据" };
    return (modes ?? []).map(mode => labels[mode] ?? mode).join("、");
}

function menuFilterMethod(query: string, data: Record<string, unknown>): boolean {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const name = String(data.name ?? "").toLocaleLowerCase();
    const routeName = String(data.routeName ?? "").toLocaleLowerCase();
    const matchesSearch = !normalizedQuery || name.includes(normalizedQuery) || routeName.includes(normalizedQuery);
    const selected = selectedMenuIds.value.includes(String(data.id));
    const matchesView = menuView.value === "all" || (menuView.value === "selected" ? selected : !selected);
    return matchesSearch && matchesView;
}

function applyMenuFilter(): void {
    void nextTick(() => menuRef.value?.filter(menuSearch.value));
}

function handleMenuCheck(_data: Record<string, unknown>, info: MenuCheckInfo): void {
    selectedMenuIds.value = info.checkedKeys.map(String).filter(id => menuLeafIds.value.has(id));
}

function setMenuExpanded(expanded: boolean): void {
    menuRef.value?.setExpandedKeys(expanded ? menuDirectoryIds.value : []);
}

function captureCurrentStep(): void {
    if (currentNode.value === "menus") {
        selectedMenuIds.value = (menuRef.value?.getCheckedKeys(true) ?? [])
            .map(String)
            .filter(id => menuLeafIds.value.has(id));
    }
}

function applyCurrentStepSelection(): void {
    if (currentNode.value === "menus") {
        menuRef.value?.setCheckedKeys(selectedMenuIds.value);
        applyMenuFilter();
    }
}

function selectNode(node: RoleEditorNode): void {
    const nextIndex = editorNodes.findIndex(item => item.id === node);
    if (nextIndex < 0 || nextIndex > maxStepIndex.value) return;
    captureCurrentStep();
    currentNode.value = node;
    void nextTick(applyCurrentStepSelection);
}

function handleStepSelection(key: string): void {
    if (editorNodes.some(node => node.id === key)) {
        selectNode(key as RoleEditorNode);
    }
}

async function load(): Promise<void> {
    loading.value = true;
    try {
        const [nextRole, nextAuthorityTree, nextMenuTree] = await Promise.all([
            editingId.value ? RoleApi.detail(editingId.value) : Promise.resolve(undefined),
            AuthorityApi.tree(),
            MenuApi.tree()
        ]);
        authorityTree.value = nextAuthorityTree ?? [];
        menuTree.value = nextMenuTree ?? [];

        if (nextRole) {
            currentRole.value = nextRole;
            Object.assign(form, roleConverter.toForm(nextRole));
            const [authorization, roleMenu] = await Promise.all([
                AuthorizationApi.currentRole(nextRole.id),
                RoleApi.getRoleMenu(nextRole.id)
            ]);
            roleAuthorization.value = authorization;
            permissionCodes.value = authorization.permission_codes;
            const availablePermissionCodes = new Set(permissionCodes.value);
            grantablePermissionCodes.value = authorization.grantable_permission_codes.filter(code =>
                availablePermissionCodes.has(code)
            );
            selectedMenuIds.value = roleMenu.map(menu => menu.id);
            maxStepIndex.value = editorNodes.length - 1;
        } else {
            roleAuthorization.value = {
                role_id: "",
                version: 0,
                authority_level: form.authority_level,
                permission_codes: [],
                grantable_permission_codes: []
            };
            maxStepIndex.value = 0;
        }
    } catch (error: unknown) {
        MessageUtils.error(error);
    } finally {
        loading.value = false;
    }
}

async function goBack(): Promise<void> {
    await router.push({ name: "SystemRoleManagement" });
}

async function validateBasicInfo(): Promise<boolean> {
    if (formRef.value) {
        try {
            await formRef.value.validate();
            return true;
        } catch (error: unknown) {
            if (error !== "cancel" && error !== "close") MessageUtils.error(error);
            return false;
        }
    }

    const nameLength = form.name.trim().length;
    if (nameLength < 2 || nameLength > 120) {
        MessageUtils.warning("角色名称长度需要在2-120字符范围内");
        return false;
    }
    if (form.remark.length > 500) {
        MessageUtils.warning("备注不能超过500个字符");
        return false;
    }
    return true;
}

function goPrevious(): void {
    const previousNode = editorNodes[Math.max(editorNodes.findIndex(node => node.id === currentNode.value) - 1, 0)];
    selectNode(previousNode.id);
}

async function handleNextStep(): Promise<void> {
    if (!isRoleWritable.value || !(await validateBasicInfo())) return;
    maxStepIndex.value = Math.max(maxStepIndex.value, 1);
    selectNode("permissions");
}

function handleNextPermissionStep(): void {
    if (!isRoleWritable.value) return;
    captureCurrentStep();
    maxStepIndex.value = Math.max(maxStepIndex.value, 2);
    selectNode("grantable");
}

function handleNextGrantableStep(): void {
    if (!isRoleWritable.value) return;
    captureCurrentStep();
    maxStepIndex.value = Math.max(maxStepIndex.value, 3);
    selectNode("menus");
}

async function submitRole(): Promise<void> {
    if (!roleAuthorization.value || !isRoleWritable.value) return;
    captureCurrentStep();
    try {
        if (!(await validateBasicInfo())) return;
        const authorityLevel = roleAuthorization.value.authority_level;
        if (authorityLevel < 1 || authorityLevel > 999) {
            MessageUtils.warning("普通角色授权管理等级必须在1到999之间");
            return;
        }

        await MessageUtils.box.confirm("将一次性提交角色信息、权限和菜单配置，是否继续？", "确认提交角色");
        saving.value = true;
        const savedRole = await RoleApi.saveEditor({
            ...(isModify.value ? { id: form.id } : {}),
            name: form.name,
            code: form.code,
            remark: form.remark,
            ...(isModify.value ? { expected_version: roleAuthorization.value.version } : {}),
            authority_level: authorityLevel,
            permission_codes: permissionCodes.value,
            grantable_permission_codes: grantablePermissionCodes.value,
            menu_ids: collectMenuIds(menuTree.value, selectedMenuIds.value)
        });
        currentRole.value = savedRole;
        MessageUtils.success("角色已提交");
        await goBack();
    } catch (error: unknown) {
        if (error !== "cancel" && error !== "close") MessageUtils.error(error);
    } finally {
        saving.value = false;
    }
}

async function handleStepAction(): Promise<void> {
    if (currentNode.value === "basic") {
        await handleNextStep();
    } else if (currentNode.value === "permissions") {
        handleNextPermissionStep();
    } else if (currentNode.value === "grantable") {
        handleNextGrantableStep();
    } else {
        await submitRole();
    }
}

onMounted(() => {
    void load();
});

watch([menuSearch, menuView, selectedMenuIds], applyMenuFilter, { deep: true });
</script>

<template>
    <div v-loading="loading" class="role-edit-page">
        <div class="role-edit-shell">
            <div class="role-edit-workspace">
                <aside class="role-side role-side-left">
                    <StepNavigation
                        :items="roleNavigationItems"
                        :active-key="currentNode"
                        aria-label="角色编辑步骤"
                        responsive-layout="grid"
                        @select="handleStepSelection" />
                </aside>

                <main class="role-edit-section">
                    <div class="role-edit-content">
                        <section v-if="currentNode === 'basic'" class="role-section">
                            <div class="step-section-title">
                                <div>
                                    <span>基本信息</span>
                                    <small>角色编码和系统属性只读，业务角色可修改名称和备注。</small>
                                </div>
                            </div>
                            <div class="role-section-body">
                                <el-form ref="formRef" :model="form" :rules="rules" label-width="130px">
                                    <el-form-item v-if="isModify" label="ID">
                                        <el-text type="info">{{ form.id }}</el-text>
                                    </el-form-item>
                                    <el-form-item label="角色编码">
                                        <el-text v-if="isModify" type="info">{{ form.code }}</el-text>
                                        <el-text v-else type="info">提交后由系统自动生成（ROLE_XXXXXXXX）</el-text>
                                    </el-form-item>
                                    <el-form-item label="角色类型">
                                        <el-text type="info">{{ roleKindLabel(form.role_kind) }}</el-text>
                                    </el-form-item>
                                    <el-form-item label="授权管理等级">
                                        <el-text type="info">{{ form.authority_level ?? 1 }}</el-text>
                                    </el-form-item>
                                    <el-form-item label="是否内置">
                                        <el-tag :type="form.builtin ? 'warning' : 'info'">
                                            {{ form.builtin ? "是" : "否" }}
                                        </el-tag>
                                    </el-form-item>
                                    <el-form-item label="角色状态">
                                        <el-tag :type="form.state ? 'primary' : 'danger'">
                                            {{ form.state ? "激活" : "禁用" }}
                                        </el-tag>
                                    </el-form-item>
                                    <el-form-item label="角色名称" prop="name">
                                        <el-input
                                            v-model="form.name"
                                            maxlength="120"
                                            show-word-limit
                                            clearable
                                            :disabled="!isRoleWritable" />
                                    </el-form-item>
                                    <el-form-item label="备注" prop="remark">
                                        <el-input
                                            v-model="form.remark"
                                            type="textarea"
                                            maxlength="500"
                                            show-word-limit
                                            clearable
                                            :disabled="!isRoleWritable" />
                                    </el-form-item>
                                </el-form>
                            </div>
                        </section>

                        <section v-else-if="currentNode === 'permissions'" class="role-section role-tree-section">
                            <div class="step-section-title">
                                <div>
                                    <span>角色权限</span>
                                    <small>配置角色可以使用的功能和操作权限。</small>
                                </div>
                            </div>
                            <div class="role-section-body role-tree-section-body">
                                <div class="role-authorization-meta">
                                    <el-form inline label-width="auto">
                                        <el-form-item label="授权管理等级">
                                            <el-input-number
                                                v-if="roleAuthorization"
                                                v-model="roleAuthorization.authority_level"
                                                :min="1"
                                                :max="999"
                                                :disabled="!isRoleWritable"
                                                controls-position="right"
                                                style="width: 140px" />
                                            <el-text v-else type="info">保存角色后配置</el-text>
                                        </el-form-item>
                                    </el-form>
                                    <el-text v-if="isBuiltin" type="info">内置角色的等级不可修改</el-text>
                                </div>
                                <el-alert
                                    v-if="!isModify"
                                    title="角色将在最后一步统一创建并提交。"
                                    type="info"
                                    :closable="false"
                                    show-icon />
                                <el-alert
                                    v-else-if="isBuiltin"
                                    title="内置角色的权限、授权管理等级和菜单不可修改。"
                                    type="warning"
                                    :closable="false"
                                    show-icon />
                                <div class="permission-config-panel" :class="{ 'is-readonly': !isRoleWritable }">
                                    <div class="permission-toolbar">
                                        <el-input
                                            v-model="permissionSearch"
                                            placeholder="搜索权限名称、编码或所属模块"
                                            clearable
                                            class="permission-search" />
                                        <el-select v-model="permissionView" class="permission-view-select">
                                            <el-option label="全部权限" value="all" />
                                            <el-option label="只看已选" value="selected" />
                                            <el-option label="只看未选" value="unselected" />
                                        </el-select>
                                        <span class="permission-count">已选 {{ permissionCount }} 项</span>
                                        <el-button
                                            text
                                            :disabled="!isRoleWritable"
                                            @click="updateVisiblePermissions('permissions', true)">
                                            选择当前结果
                                        </el-button>
                                        <el-button
                                            text
                                            :disabled="!isRoleWritable"
                                            @click="updateVisiblePermissions('permissions', false)">
                                            清空当前结果
                                        </el-button>
                                    </div>
                                    <div v-if="permissionGroups.length" class="permission-group-list">
                                        <section
                                            v-for="group in permissionGroups"
                                            :key="group.id"
                                            class="permission-group">
                                            <div class="permission-group-header">
                                                <div>
                                                    <strong>{{ group.name }}</strong>
                                                    <span>{{ group.permissions.length }} 项</span>
                                                </div>
                                                <el-checkbox
                                                    :model-value="permissionGroupChecked('permissions', group)"
                                                    :indeterminate="permissionGroupIndeterminate('permissions', group)"
                                                    :disabled="!isRoleWritable"
                                                    @change="handlePermissionGroupChange('permissions', group, $event)">
                                                    全选本组
                                                </el-checkbox>
                                            </div>
                                            <div class="permission-items">
                                                <div
                                                    v-for="item in group.permissions"
                                                    :key="item.code"
                                                    class="permission-item">
                                                    <el-checkbox
                                                        :model-value="isPermissionSelected('permissions', item.code)"
                                                        :disabled="!isRoleWritable"
                                                        @change="
                                                            handlePermissionChange('permissions', item.code, $event)
                                                        " />
                                                    <span class="permission-item-main">
                                                        <strong>{{ item.name }}</strong>
                                                        <small>{{ item.path }} · {{ item.code }}</small>
                                                    </span>
                                                    <el-tag
                                                        v-if="item.allowed_scope_modes?.length"
                                                        size="small"
                                                        type="info">
                                                        {{ scopeModeLabel(item.allowed_scope_modes) }}
                                                    </el-tag>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                    <el-empty v-else description="没有符合条件的权限" :image-size="72" />
                                </div>
                            </div>
                        </section>

                        <section v-else-if="currentNode === 'grantable'" class="role-section role-tree-section">
                            <div class="step-section-title">
                                <div>
                                    <span>可授予权限</span>
                                    <small>配置角色可以向下授权的能力，最后一步统一提交。</small>
                                </div>
                            </div>
                            <div class="role-section-body role-tree-section-body">
                                <div class="permission-config-panel" :class="{ 'is-readonly': !isRoleWritable }">
                                    <div class="permission-toolbar">
                                        <el-input
                                            v-model="grantableSearch"
                                            placeholder="搜索可授予权限名称、编码或所属模块"
                                            clearable
                                            class="permission-search" />
                                        <el-select v-model="grantableView" class="permission-view-select">
                                            <el-option label="全部可授予权限" value="all" />
                                            <el-option label="只看已选" value="selected" />
                                            <el-option label="只看未选" value="unselected" />
                                        </el-select>
                                        <span class="permission-count">
                                            已选 {{ grantableCount }} / {{ grantableCandidateCount }} 项
                                        </span>
                                        <el-button
                                            text
                                            :disabled="!isRoleWritable"
                                            @click="updateVisiblePermissions('grantable', true)">
                                            选择当前结果
                                        </el-button>
                                        <el-button
                                            text
                                            :disabled="!isRoleWritable"
                                            @click="updateVisiblePermissions('grantable', false)">
                                            清空当前结果
                                        </el-button>
                                    </div>
                                    <el-alert
                                        v-if="!permissionCount"
                                        title="请先在角色权限中选择可使用的权限。"
                                        type="info"
                                        :closable="false"
                                        show-icon />
                                    <div v-else-if="grantableGroups.length" class="permission-group-list">
                                        <section
                                            v-for="group in grantableGroups"
                                            :key="group.id"
                                            class="permission-group">
                                            <div class="permission-group-header">
                                                <div>
                                                    <strong>{{ group.name }}</strong>
                                                    <span>{{ group.permissions.length }} 项</span>
                                                </div>
                                                <el-checkbox
                                                    :model-value="permissionGroupChecked('grantable', group)"
                                                    :indeterminate="permissionGroupIndeterminate('grantable', group)"
                                                    :disabled="!isRoleWritable"
                                                    @change="handlePermissionGroupChange('grantable', group, $event)">
                                                    全选本组
                                                </el-checkbox>
                                            </div>
                                            <div class="permission-items">
                                                <div
                                                    v-for="item in group.permissions"
                                                    :key="item.code"
                                                    class="permission-item">
                                                    <el-checkbox
                                                        :model-value="isPermissionSelected('grantable', item.code)"
                                                        :disabled="!isRoleWritable"
                                                        @change="
                                                            handlePermissionChange('grantable', item.code, $event)
                                                        " />
                                                    <span class="permission-item-main">
                                                        <strong>{{ item.name }}</strong>
                                                        <small>{{ item.path }} · {{ item.code }}</small>
                                                    </span>
                                                    <el-tag
                                                        v-if="item.allowed_scope_modes?.length"
                                                        size="small"
                                                        type="info">
                                                        {{ scopeModeLabel(item.allowed_scope_modes) }}
                                                    </el-tag>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                    <el-empty
                                        v-else
                                        description="当前角色权限中没有符合条件的可授予权限"
                                        :image-size="72" />
                                </div>
                            </div>
                        </section>

                        <section v-else class="role-section role-tree-section">
                            <div class="step-section-title">
                                <div>
                                    <span>角色菜单</span>
                                    <small>配置角色在管理后台可以看到的菜单入口，最后一步统一提交。</small>
                                </div>
                            </div>
                            <div class="role-section-body role-tree-section-body">
                                <div class="menu-config-panel" :class="{ 'is-readonly': !isRoleWritable }">
                                    <div class="menu-toolbar">
                                        <el-input
                                            v-model="menuSearch"
                                            placeholder="搜索菜单名称或路由"
                                            clearable
                                            class="menu-search" />
                                        <el-select v-model="menuView" class="menu-view-select">
                                            <el-option label="全部菜单" value="all" />
                                            <el-option label="只看已选" value="selected" />
                                            <el-option label="只看未选" value="unselected" />
                                        </el-select>
                                        <span class="permission-count">
                                            已选 {{ selectedMenuIds.length }} / {{ menuLeafIds.size }} 项
                                        </span>
                                        <el-button text @click="setMenuExpanded(true)">展开全部</el-button>
                                        <el-button text @click="setMenuExpanded(false)">收起全部</el-button>
                                    </div>
                                    <div class="menu-tree-wrapper">
                                        <ElTreeV2
                                            ref="menuRef"
                                            :data="menuTreeData"
                                            :props="menuTreeProps"
                                            :height="menuTreeHeight"
                                            :default-checked-keys="selectedMenuIds"
                                            :filter-method="menuFilterMethod"
                                            :show-checkbox="true"
                                            :expand-on-click-node="false"
                                            :check-on-click-leaf="false"
                                            :perf-mode="true"
                                            empty-text="暂无菜单"
                                            @check="handleMenuCheck" />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>

                <aside class="role-side role-side-right">
                    <el-alert
                        class="role-tip"
                        :title="currentNodeTip.title"
                        :description="currentNodeTip.description"
                        type="info"
                        :closable="false"
                        show-icon />
                    <el-card class="role-tip-card" shadow="never">
                        <template #header>操作说明</template>
                        <ul>
                            <li v-for="item in currentNodeTip.items" :key="item">{{ item }}</li>
                        </ul>
                    </el-card>
                </aside>
            </div>

            <div class="role-actions">
                <el-button @click="goBack">返回</el-button>
                <el-button v-if="currentNode !== 'basic'" :disabled="saving" @click="goPrevious">上一步</el-button>
                <el-button
                    v-if="
                        currentNode === 'basic' ||
                        currentNode === 'permissions' ||
                        currentNode === 'grantable' ||
                        currentNode === 'menus'
                    "
                    type="primary"
                    :loading="saving"
                    :disabled="!isRoleWritable"
                    @click="handleStepAction">
                    {{ currentNode === "menus" ? "提交" : "下一步" }}
                </el-button>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.role-edit-page {
    height: 100%;
    min-height: 0;
    padding: 20px 32px 24px;
    overflow: hidden;
    background: var(--el-bg-color);
    box-sizing: border-box;
}

.role-edit-shell {
    display: flex;
    width: min(1600px, 100%);
    height: 100%;
    min-height: 0;
    margin: 0 auto;
    flex-direction: column;
}

.role-edit-workspace {
    display: grid;
    flex: 1 1 auto;
    grid-template-columns: max-content minmax(0, 1fr) minmax(220px, 280px);
    min-height: 0;
    gap: 24px;
}

.role-side {
    min-width: 0;
    padding-top: 4px;
}

.role-side-left {
    width: max-content;
    max-width: 260px;
}

.role-edit-section {
    display: flex;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
}

.step-section-title,
.role-actions {
    display: flex;
    align-items: center;
    gap: 12px;
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
    font-weight: 400;
}

.role-edit-content {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0 4px 12px;
    overflow: hidden;
}

.role-section {
    display: flex;
    height: 100%;
    min-height: 0;
    flex-direction: column;
}

.step-section-title {
    flex: 0 0 auto;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 24px;
    padding: 14px 0 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.role-section-body {
    flex: 1 1 auto;
    min-height: 0;
    padding-bottom: 12px;
    overflow-y: auto;
    scrollbar-gutter: stable;
}

.role-tree-section-body {
    display: flex;
    flex-direction: column;
}

.role-tree-section {
    min-height: 0;
}

.role-authorization-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 40px;
    margin-bottom: 16px;
    padding: 10px 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-lighter);
}

.role-authorization-meta .el-form-item {
    margin-bottom: 0;
}

.permission-config-panel,
.menu-config-panel {
    flex: 1 1 auto;
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 12px;
}

.permission-toolbar,
.menu-toolbar {
    display: flex;
    align-items: center;
    min-height: 32px;
    gap: 8px;
    flex-wrap: wrap;
}

.permission-search,
.menu-search {
    min-width: 220px;
    flex: 1 1 280px;
}

.permission-view-select,
.menu-view-select {
    width: 140px;
}

.permission-count {
    flex: 0 0 auto;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    white-space: nowrap;
}

.permission-group-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.permission-group {
    overflow: hidden;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-bg-color);
}

.permission-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 44px;
    padding: 8px 14px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--el-fill-color-lighter);
}

.permission-group-header > div {
    display: flex;
    align-items: center;
    gap: 8px;
}

.permission-group-header strong {
    color: var(--el-text-color-primary);
    font-size: 14px;
}

.permission-group-header span {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.permission-group-header :deep(.el-checkbox) {
    margin-right: 0;
}

.permission-items {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.permission-item {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
    min-height: 58px;
    padding: 8px 14px;
    border-bottom: 1px solid var(--el-border-color-extra-light);
}

.permission-item:nth-child(2n) {
    border-left: 1px solid var(--el-border-color-extra-light);
}

.permission-item:nth-last-child(-n + 2) {
    border-bottom: 0;
}

.permission-item-main {
    display: flex;
    min-width: 0;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 3px;
}

.permission-item-main strong {
    overflow: hidden;
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.permission-item-main small {
    overflow: hidden;
    color: var(--el-text-color-secondary);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.permission-item :deep(.el-tag) {
    flex: 0 0 auto;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.menu-tree-wrapper {
    flex: 0 0 auto;
    height: 480px;
    min-height: 240px;
    padding: 12px;
    overflow: hidden;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-lighter);
}

.menu-tree-wrapper :deep(.el-tree) {
    width: 100%;
}

.menu-tree-wrapper :deep(.el-tree-node__content) {
    min-height: 34px;
}

.permission-config-panel.is-readonly,
.menu-config-panel.is-readonly {
    opacity: 0.86;
}

.role-tree-wrapper {
    flex: 1 1 auto;
    min-height: 300px;
    margin-top: 16px;
    padding: 12px;
    overflow: auto;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-lighter);
}

.role-tree-wrapper.is-readonly {
    pointer-events: none;
    opacity: 0.72;
}

.role-side-right {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 12px;
}

.role-tip {
    flex: 0 0 auto;
    align-items: flex-start;
}

.role-tip-card {
    color: var(--el-text-color-regular);
    font-size: 12px;
    line-height: 1.7;
}

.role-tip-card :deep(.el-card__header) {
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-weight: 600;
}

.role-tip-card ul {
    margin: 0;
    padding-left: 18px;
}

.role-tip-card li + li {
    margin-top: 8px;
}

.role-actions {
    flex: 0 0 auto;
    justify-content: flex-end;
    padding: 16px 0 4px;
    border-top: 1px solid var(--el-border-color-lighter);
}

.role-actions .el-button {
    min-width: 100px;
}

:deep(.el-form-item) {
    margin-bottom: 22px;
}

:deep(.el-input),
:deep(.el-textarea) {
    width: 100%;
}

@media (max-width: 1200px) {
    .role-edit-workspace {
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow: hidden;
    }

    .role-side-left {
        width: 100%;
        max-width: none;
    }

    .role-edit-section {
        min-height: 0;
    }

    .role-side-right {
        flex: 0 0 auto;
    }
}

@media (max-width: 768px) {
    .role-edit-page {
        padding: 16px;
    }

    .step-section-title {
        align-items: flex-start;
        flex-direction: column;
    }

    .permission-items {
        grid-template-columns: minmax(0, 1fr);
    }

    .permission-item,
    .permission-item:nth-last-child(-n + 2) {
        border-bottom: 1px solid var(--el-border-color-extra-light);
        border-left: 0;
    }

    .permission-item:last-child {
        border-bottom: 0;
    }
}
</style>
