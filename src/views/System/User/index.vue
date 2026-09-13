<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { DepartmentApi } from "@/api/user/department-api.ts";
import { UserApi } from "@/api/user/user-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import useTable from "@/hooks/use-table.ts";
import { useDictStore } from "@/plugin/store/modules/use-dict-store.ts";
import { treeDefaultProps } from "@/utils/default-config.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

// 查询条件
const condition = ref<UserPageParams>({
    page_num: 1,
    page_size: 15
});

const organizationTree = ref<DepartmentTreeVO[]>([]);
const resettingUserId = ref<string | null>(null);

const dictStore = useDictStore();
const router = useRouter();

// table分页请求
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<UserPageVO>(
    UserApi.page,
    condition.value
);

const handleInitData = async () => {
    organizationTree.value = (await DepartmentApi.tree()) || [];
};

const handleUserAdd = () => {
    router.push({ name: "SystemUserCreate" });
};

const handleUserImport = () => {
    router.push({ name: "SystemUserImport" });
};

const handleUserEdit = (row: UserPageVO) => {
    router.push({ name: "SystemUserEdit", params: { id: row.id } });
};

const authorizationStatusMeta: Record<
    UserAuthorizationStatus,
    { label: string; type: "success" | "warning" | "danger" | "info"; description: string }
> = {
    UNCONFIGURED: {
        label: "未配置",
        type: "info",
        description: "该用户还没有 RoleAssignment，需要配置角色授权。"
    },
    BASIC_ONLY: {
        label: "仅基础权限",
        type: "info",
        description: "该用户拥有系统自动提供的基础角色，尚未配置业务角色。"
    },
    INCOMPLETE: {
        label: "授权不完整",
        type: "warning",
        description: "已配置角色，但仍有 Permission 缺少访问范围。"
    },
    ACTIVE: {
        label: "已生效",
        type: "success",
        description: "当前有效角色和 Permission Boundary 均已生效。"
    },
    PARTIAL: {
        label: "部分失效",
        type: "danger",
        description: "当前仍有角色授权过期、停用或未完整生效。"
    }
};

const authorizationStatusOf = (status: UserAuthorizationStatus | undefined) =>
    authorizationStatusMeta[status ?? "UNCONFIGURED"];

const userStatusMeta: Record<UserStatus, { label: string; type: "success" | "warning" | "danger" | "info" }> = {
    ACTIVE: { label: "正常", type: "success" },
    LOCKED: { label: "锁定", type: "warning" },
    DISABLED: { label: "禁用", type: "danger" },
    DEPARTED: { label: "离职", type: "info" }
};

function getUserStatusMeta(status: UserStatus | undefined) {
    return status ? userStatusMeta[status] : undefined;
}

// 用户重置密码
const handleTableItemResetPassword = async (row: UserPageVO) => {
    if (resettingUserId.value) return;

    try {
        await MessageUtils.box.confirm(`是否要重置[${row.real_name}]的密码`, "提示");
    } catch {
        return;
    }

    resettingUserId.value = row.id;
    try {
        await UserApi.passwordResetById(row.id);

        let refreshFailed = false;
        try {
            await handlerConditionQuery();
        } catch {
            refreshFailed = true;
        }

        MessageUtils.notify.success(
            refreshFailed
                ? "密码已重置，但用户列表刷新失败，请手动刷新查看最新状态。"
                : "密码已重置为系统默认密码，用户下次登录后必须立即修改。",
            "密码重置成功"
        );
    } catch (error) {
        MessageUtils.notify.error(error instanceof Error ? error.message : "请求失败，请稍后重试。", "密码重置失败");
    } finally {
        resettingUserId.value = null;
    }
};

// 组织机构树节点被单击
const handleOrganizationTreeNodeClick = (row: DepartmentTreeVO) => {
    condition.value.department_id = row.id;
    handlerConditionQuery();
};

// 挂载后执行
onMounted(async () => {
    // 预加载数据
    await dictStore.getDictData("sys_language");
    await dictStore.getDictData("sys_timezone");
    await handleInitData();
});
</script>

<template>
    <!-- 搜索区 -->
    <el-row class="box__search">
        <el-form :inline="true" :model="condition">
            <el-form-item label="工号" prop="employee_no">
                <el-input v-model="condition.employee_no" class="search-field" placeholder="请输入工号" clearable />
            </el-form-item>
            <el-form-item label="姓名" prop="real_name">
                <el-input v-model="condition.real_name" class="search-field" placeholder="请输入姓名" clearable />
            </el-form-item>
            <el-form-item label="登录用户名" prop="username">
                <el-input v-model="condition.username" class="search-field" placeholder="请输入登录用户名" clearable />
            </el-form-item>
            <el-form-item label="状态" prop="status">
                <el-select v-model="condition.status" class="search-field" placeholder="请选择状态" clearable>
                    <el-option label="正常" value="ACTIVE" />
                    <el-option label="锁定" value="LOCKED" />
                    <el-option label="禁用" value="DISABLED" />
                    <el-option label="离职" value="DEPARTED" />
                </el-select>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                <el-button>重置</el-button>
                <el-button @click="handleUserAdd()">
                    <ComponentsIcons name="icon-user-add" style="width: 1.1em; height: 1.1em" />
                    &nbsp;新增用户
                </el-button>
                <el-button @click="handleUserImport">批量导入</el-button>
            </el-form-item>
        </el-form>
    </el-row>
    <!-- 数据区 -->
    <el-row class="box__body">
        <el-col :span="4">
            <el-tree
                :data="organizationTree"
                :props="treeDefaultProps"
                empty-text="暂无组织机构"
                node-key="id"
                :default-expand-all="true"
                :expand-on-click-node="false"
                @node-click="handleOrganizationTreeNodeClick" />
        </el-col>
        <el-col :span="20">
            <!-- 列表 -->
            <el-table :data="table_data" height="92%" stripe>
                <el-table-column align="center" type="index" fixed="left" />
                <el-table-column
                    align="center"
                    width="140"
                    fixed="left"
                    show-overflow-tooltip
                    label="工号"
                    prop="employee_no" />
                <el-table-column
                    align="center"
                    width="150"
                    fixed="left"
                    show-overflow-tooltip
                    label="姓名"
                    prop="real_name" />
                <el-table-column align="center" width="220" show-overflow-tooltip label="登录用户名" prop="username" />
                <el-table-column align="center" width="150" show-overflow-tooltip label="语言" prop="language">
                    <template v-slot:default="scope">
                        {{ dictStore.getDictItemSync("sys_language", scope.row.language)?.label }}
                    </template>
                </el-table-column>
                <el-table-column align="center" width="200" show-overflow-tooltip label="时区" prop="timezone">
                    <template v-slot:default="scope">
                        {{ dictStore.getDictItemSync("sys_timezone", scope.row.timezone)?.label }}
                    </template>
                </el-table-column>
                <el-table-column align="center" width="100" show-overflow-tooltip label="状态" prop="status">
                    <template #default="scope">
                        <el-tag :type="getUserStatusMeta(scope.row.status)?.type ?? 'info'">
                            {{ getUserStatusMeta(scope.row.status)?.label ?? scope.row.status }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column
                    align="center"
                    width="130"
                    show-overflow-tooltip
                    label="授权状态"
                    prop="authorization_status">
                    <template #default="scope">
                        <el-tooltip :content="authorizationStatusOf(scope.row.authorization_status).description">
                            <el-tag :type="authorizationStatusOf(scope.row.authorization_status).type">
                                {{ authorizationStatusOf(scope.row.authorization_status).label }}
                            </el-tag>
                        </el-tooltip>
                    </template>
                </el-table-column>
                <el-table-column
                    align="center"
                    width="150"
                    show-overflow-tooltip
                    label="所属组织"
                    prop="department_name" />
                <el-table-column align="center" width="150" show-overflow-tooltip label="角色" prop="roles">
                    <template #default="scope">
                        <el-tag
                            v-for="(item, idx) in scope.row.roles"
                            :key="idx"
                            :index="idx"
                            style="margin-right: 4px">
                            {{ item.name }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column align="center" width="150" fixed="right" label="操作">
                    <template #default="scope">
                        <el-tooltip content="重置密码" placement="top">
                            <el-button
                                link
                                type="primary"
                                :loading="resettingUserId === scope.row.id"
                                :disabled="resettingUserId !== null && resettingUserId !== scope.row.id"
                                @click="handleTableItemResetPassword(scope.row)">
                                <ComponentsIcons name="icon-reset-passwords" style="width: 1.4em; height: 1.4em" />
                            </el-button>
                        </el-tooltip>
                        <el-tooltip content="编辑用户" placement="top">
                            <el-button link type="primary" @click="handleUserEdit(scope.row)">
                                <ComponentsIcons name="icon-user-edit" style="width: 1.4em; height: 1.4em" />
                            </el-button>
                        </el-tooltip>
                    </template>
                </el-table-column>
            </el-table>
            <!-- 分页 -->
            <el-pagination
                layout="total, sizes, prev, pager, next"
                :page-size="pagination.size"
                :page-sizes="pagination.page_sizes"
                :total="pagination.total"
                style="padding: 0 10px"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange" />
        </el-col>
    </el-row>
</template>

<style scoped lang="scss">
.box__search {
    height: 10%;
    display: flex;
    align-items: center;
    padding-left: 20px;

    .el-form-item {
        margin-bottom: 0;
    }

    :deep(.search-field) {
        flex: 0 0 200px;
        width: 200px;
        min-width: 200px;
        max-width: 200px;
    }
}

.box__body {
    height: 90%;
}

.box__body :deep(.el-pagination) {
    justify-content: flex-end;
}
</style>
