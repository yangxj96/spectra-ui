<script setup lang="ts">
import { ElTree } from "element-plus";
import { onMounted, reactive, ref, useTemplateRef } from "vue";
import { useRouter } from "vue-router";

import { AuthorityApi } from "@/api/auth/authority-api.ts";
import { AuthorizationApi } from "@/api/auth/authorization-api.ts";
import { RoleApi } from "@/api/auth/role-api.ts";
import { MenuApi } from "@/api/system/menu-api.ts";
import { roleConverter } from "@/converter/role-converter.ts";
import useTable from "@/hooks/use-table.ts";
import { treeDefaultProps } from "@/utils/default-config.ts";
import { collectMenuIds } from "@/utils/menu-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

import RoleEdit from "./components/RoleEdit/index.vue";

// refs
const powerRef = useTemplateRef<InstanceType<typeof ElTree>>("powerRef");
const grantablePowerRef = useTemplateRef<InstanceType<typeof ElTree>>("grantablePowerRef");
const menuRef = useTemplateRef<InstanceType<typeof ElTree>>("menuRef");
const router = useRouter();

// 数据
const menu_tree = ref<Menu[]>();
const authority_tree = ref<AuthorityTree[]>();
const condition = ref<RolePageParams>({
    page_num: 1,
    page_size: 15
});
const edit = reactive<{
    dialog: boolean;
    form: RoleForm;
}>({
    dialog: false,
    form: roleConverter.createForm()
});
const currentRow = ref<RolePageVO>();

const { handlerConditionQuery, handleCurrentChange, handleSizeChange, pagination, table_data } = useTable<RolePageVO>(
    RoleApi.page,
    condition.value
);

onMounted(() => {
    handleInitData();
});

// 初始化数据
const handleInitData = async () => {
    menu_tree.value = await MenuApi.tree();
    authority_tree.value = await AuthorityApi.tree();
};

const handleRoleAdd = () => {
    edit.form = roleConverter.createForm();
    edit.dialog = false;
    setTimeout(() => {
        edit.dialog = true;
    }, 0);
};

const handleAuthorizationProfiles = () => {
    router.push({ name: "SystemAuthorizationProfiles" });
};

const handleRoleEdit = (row: RolePageVO) => {
    edit.form = roleConverter.toForm(row);
    edit.dialog = false;
    setTimeout(() => {
        edit.dialog = true;
    }, 0);
};

// 角色删除
const handleRoleDelete = (row: RolePageVO) => {
    MessageUtils.box.confirm(`是否要删除[${row.name}]`, "提示").then(async () => {
        await RoleApi.delete(row.id);
        MessageUtils.success("删除成功");
        await handlerConditionQuery();
    });
};

// 条件查询
const handleRoleConditionQuery = () => {
    cleanTreeCheckState();
    handlerConditionQuery();
};

// 清理右边两棵树的选中状态
const cleanTreeCheckState = () => {
    currentRow.value = undefined;
    powerRef.value?.setCheckedKeys([]);
    grantablePowerRef.value?.setCheckedKeys([]);
    menuRef.value?.setCheckedKeys([]);
};

const authorityLeaves = (nodes: AuthorityTree[]): AuthorityTree[] => {
    const leaves: AuthorityTree[] = [];
    for (const node of nodes) {
        if (node.children?.length) {
            leaves.push(...authorityLeaves(node.children));
        } else {
            leaves.push(node);
        }
    }
    return leaves;
};

const checkedPermissionCodes = (treeRef: typeof powerRef): string[] => {
    const checkedKeys = new Set((treeRef.value?.getCheckedKeys() ?? []).map(key => String(key)));
    return authorityLeaves(authority_tree.value ?? [])
        .filter(node => checkedKeys.has(String(node.id)))
        .map(node => node.code);
};

const setCheckedPermissionCodes = (treeRef: typeof powerRef, codes: string[]) => {
    const selectedCodes = new Set(codes);
    const selectedIds = authorityLeaves(authority_tree.value ?? [])
        .filter(node => selectedCodes.has(node.code))
        .map(node => String(node.id));
    treeRef.value?.setCheckedKeys(selectedIds);
};

// 角色列表行被单机
const handleRoleTableRowClick = async (row: RolePageVO) => {
    if (currentRow.value && currentRow.value.id && currentRow.value.id === row.id) return;
    try {
        cleanTreeCheckState();
        const [roleAuthorization, roleMenu] = await Promise.all([
            AuthorizationApi.currentRole(row.id),
            RoleApi.getRoleMenu(row.id)
        ]);
        currentRow.value = {
            ...row,
            version: roleAuthorization.version,
            authority_level: roleAuthorization.authority_level
        };
        setCheckedPermissionCodes(powerRef, roleAuthorization.permission_codes);
        setCheckedPermissionCodes(grantablePowerRef, roleAuthorization.grantable_permission_codes);
        menuRef.value?.setCheckedKeys(roleMenu.map(i => i.id));
    } catch (error: unknown) {
        console.error("未知错误", error);
    }
};

// 角色-权限关联关系保存
const handleSaveRoleAuthority = async () => {
    if (!currentRow.value) {
        MessageUtils.warning("请先选中一个角色");
        return;
    }
    const roleAuthorization: RoleAuthorizationChange = {
        expected_version: currentRow.value.version,
        authority_level: currentRow.value.authority_level ?? 1,
        permission_codes: checkedPermissionCodes(powerRef),
        grantable_permission_codes: checkedPermissionCodes(grantablePowerRef)
    };
    const preview = await AuthorizationApi.previewRole(currentRow.value.id, roleAuthorization);
    await MessageUtils.box.confirm(
        `本次授权变更将影响 ${preview.affected_user_count} 个用户、${preview.affected_assignment_count} 个授权实例，是否继续提交？`,
        "确认授权变更"
    );
    await AuthorizationApi.applyRole(currentRow.value.id, {
        ...roleAuthorization,
        expected_version: preview.expected_version,
        preview_token: preview.preview_token
    });
    currentRow.value = {
        ...currentRow.value,
        version: preview.expected_version + 1
    };
    MessageUtils.success("角色授权已提交");
};

// 角色-菜单 关联关系保存
const handleSaveRoleMenu = async () => {
    if (!currentRow.value) {
        MessageUtils.warning("请先选中一个角色");
        return;
    }
    const params = {
        role_id: currentRow.value.id,
        menu_ids: collectMenuIds(menu_tree.value ?? [], menuRef.value?.getCheckedKeys() ?? [])
    };
    await RoleApi.saveRoleMenu(params);
    MessageUtils.success("保存成功");
};
</script>

<template>
    <el-row class="rbac-container">
        <!-- 角色 -->
        <el-col :span="12" class="table-col">
            <!-- 过滤条件 -->
            <el-row>
                <el-form :inline="true" :model="condition">
                    <el-form-item label="角色名称">
                        <el-input
                            v-model="condition.name"
                            placeholder="请输入角色名称"
                            clearable
                            style="width: 170px" />
                    </el-form-item>
                    <el-form-item label="角色状态">
                        <el-select
                            v-model="condition.state"
                            placeholder="请输入选择角色状态"
                            clearable
                            style="width: 170px">
                            <el-option label="启用" :value="true" />
                            <el-option label="禁用" :value="false" />
                        </el-select>
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" @click="handleRoleConditionQuery()">查询</el-button>
                        <el-button @click="handleRoleAdd()">新增</el-button>
                        <el-button @click="handleAuthorizationProfiles">授权方案</el-button>
                    </el-form-item>
                </el-form>
            </el-row>
            <!-- 表格 -->
            <el-table
                :data="table_data"
                border
                highlight-current-row
                style="width: 100%"
                @row-click="handleRoleTableRowClick">
                <el-table-column align="center" width="060" type="index" label="序号" />
                <el-table-column align="center" width="150" prop="name" label="名称" />
                <el-table-column align="center" width="120" prop="code" label="标识" show-overflow-tooltip />
                <el-table-column align="center" width="120" label="是否启用">
                    <template #default="scope">
                        <el-tag :type="scope.row.state ? 'primary' : 'danger'">
                            {{ scope.row.state ? "启用" : "禁用" }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column align="center" width="120" label="内置">
                    <template #default="scope">
                        <el-tag :type="scope.row.builtin ? 'primary' : 'danger'">
                            {{ scope.row.builtin ? "是" : "否" }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column align="center" prop="remark" label="备注" show-overflow-tooltip />
                <el-table-column align="center" label="编辑" width="120">
                    <template #default="scope">
                        <el-button link type="primary" size="small" @click="handleRoleEdit(scope.row)">编辑</el-button>
                        <el-button link type="primary" size="small" @click="handleRoleDelete(scope.row)">
                            删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <!-- 分页 -->
            <el-pagination
                background
                layout="total, sizes, prev, pager, next"
                :page-size="pagination.size"
                :page-sizes="pagination.page_sizes"
                :total="pagination.total"
                style="padding: 10px; float: right"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange" />
        </el-col>
        <!-- 权限 -->
        <el-col :span="4" class="tree-col">
            <el-text type="primary">角色权限</el-text>
            <el-divider class="divider-box" />
            <el-button link type="primary" @click="handleSaveRoleAuthority">预览并保存授权</el-button>
            <div class="tree-wrapper">
                <ElTree
                    ref="powerRef"
                    :data="authority_tree"
                    :props="treeDefaultProps"
                    node-key="id"
                    default-expand-all
                    empty-text="暂无权限"
                    show-checkbox />
            </div>
        </el-col>
        <!-- 可授予权限 -->
        <el-col :span="4" class="tree-col">
            <el-text type="primary">可授予权限</el-text>
            <el-divider class="divider-box" />
            <el-text size="small" type="info">与角色权限一起提交</el-text>
            <div class="tree-wrapper">
                <ElTree
                    ref="grantablePowerRef"
                    :data="authority_tree"
                    :props="treeDefaultProps"
                    node-key="id"
                    default-expand-all
                    empty-text="暂无权限"
                    show-checkbox />
            </div>
        </el-col>
        <!-- 菜单 -->
        <el-col :span="4" class="tree-col">
            <el-text type="primary">角色菜单</el-text>
            <el-divider class="divider-box" />
            <el-button link type="primary" @click="handleSaveRoleMenu">保存角色菜单</el-button>
            <div class="tree-wrapper">
                <ElTree
                    ref="menuRef"
                    :data="menu_tree"
                    :props="treeDefaultProps"
                    node-key="id"
                    default-expand-all
                    empty-text="暂无菜单"
                    show-checkbox />
            </div>
        </el-col>
    </el-row>
    <!-- 角色编辑框 -->
    <RoleEdit v-if="edit.dialog" :show="edit.dialog" :form="edit.form" @close="handleRoleConditionQuery" />
</template>

<style scoped lang="scss">
.rbac-container {
    display: flex;
    height: 100%;
    padding: 10px;
    overflow: hidden;
    min-height: 0;
}

.table-col {
    flex: 0 0 50%;
    display: flex;
    flex-direction: column;
    min-height: 0;

    .el-table {
        flex: 1;
        min-height: 0;
    }
}

.tree-col {
    flex: 0 0 16.666%;
    display: flex;
    flex-direction: column;
    padding: 10px;
    min-height: 0;
    overflow: hidden;
    height: 94%;
}

.tree-wrapper {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.divider-box {
    margin: 18px 0 10px 0;
}
</style>
