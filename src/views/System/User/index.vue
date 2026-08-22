<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { DepartmentApi } from "@/api/user/department-api.ts";
import { UserApi } from "@/api/user/user-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import DictTag from "@/components/DictTag/index.vue";
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

const dictStore = useDictStore();
const router = useRouter();
const temporaryPasswordDialogVisible = ref(false);
const temporaryPasswordResult = ref<UserPasswordResetVO>();

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

const temporaryPasswordExpiresText = computed(() => {
    const expiresAt = temporaryPasswordResult.value?.expires_at;
    return expiresAt ? new Date(expiresAt).toLocaleString() : "—";
});

// 用户重置密码
const handleTableItemResetPassword = async (row: UserPageVO) => {
    try {
        await MessageUtils.box.confirm(`是否要重置[${row.username}]的密码`, "提示");
    } catch {
        return;
    }

    const result = await UserApi.passwordResetById(row.id);
    temporaryPasswordResult.value = result;
    temporaryPasswordDialogVisible.value = true;
    await handlerConditionQuery();
};

const handleCopyTemporaryPassword = async () => {
    const password = temporaryPasswordResult.value?.temporary_password;
    if (!password) return;

    try {
        await navigator.clipboard.writeText(password);
        MessageUtils.success("临时密码已复制");
    } catch {
        MessageUtils.error("复制失败，请手动复制临时密码");
    }
};

const handleTemporaryPasswordDialogClosed = () => {
    temporaryPasswordResult.value = undefined;
};

// 组织机构树节点被单击
const handleOrganizationTreeNodeClick = (row: DepartmentTreeVO) => {
    condition.value.department_id = row.id;
    handlerConditionQuery();
};

// 挂载后执行
onMounted(async () => {
    // 预加载数据
    await dictStore.getDictData("sys_user_gender");
    await dictStore.getDictData("sys_language");
    await dictStore.getDictData("sys_timezone");
    await handleInitData();
});
</script>

<template>
    <!-- 搜索区 -->
    <el-row class="box__search">
        <el-form :inline="true" :model="condition">
            <el-form-item label="姓名" prop="username">
                <el-input v-model="condition.username" placeholder="请输入姓名" clearable />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
                <el-input v-model="condition.email" placeholder="请输入电话" clearable />
            </el-form-item>
            <el-form-item label="状态" prop="status">
                <el-select v-model="condition.status" placeholder="请输入状态" clearable style="width: 200px">
                    <el-option label="激活" :value="true" />
                    <el-option label="冻结" :value="false" />
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
                <el-table-column align="center" type="index" />
                <el-table-column align="center" width="150" show-overflow-tooltip label="显示名称" prop="username" />
                <el-table-column align="center" width="150" show-overflow-tooltip label="真实姓名" prop="real_name" />
                <el-table-column align="center" width="250" show-overflow-tooltip label="邮箱" prop="email" />
                <el-table-column align="center" width="110" show-overflow-tooltip label="性别" prop="gender">
                    <template v-slot:default="scope">
                        {{ dictStore.getDictItemSync("sys_user_gender", scope.row.gender)?.label }}
                    </template>
                </el-table-column>
                <el-table-column align="center" width="130" show-overflow-tooltip label="生日" prop="birthday" />
                <el-table-column align="center" width="120" show-overflow-tooltip label="手机号码" prop="phone" />
                <el-table-column align="center" width="100" show-overflow-tooltip label="国家" prop="country" />
                <el-table-column align="center" width="100" show-overflow-tooltip label="城市" prop="city" />
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
                <el-table-column align="center" width="150" show-overflow-tooltip label="状态" prop="state">
                    <template #default="scope">
                        <DictTag v-model="scope.row.status" primary_value="0" dict_code="sys_user_state" />
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
                            <el-button link type="primary" @click="handleTableItemResetPassword(scope.row)">
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
                style="padding: 0 10px; margin-left: auto"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange" />
        </el-col>
    </el-row>

    <el-dialog
        v-model="temporaryPasswordDialogVisible"
        title="临时密码（仅显示一次）"
        width="500px"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        @closed="handleTemporaryPasswordDialogClosed">
        <el-alert
            title="请立即复制并安全转交给用户"
            description="关闭此窗口后将无法再次查看临时密码；如遗失，请重新执行重置密码。用户首次登录后必须修改密码。"
            type="warning"
            :closable="false"
            show-icon />
        <div v-if="temporaryPasswordResult" class="temporary-password-content">
            <div class="temporary-password-field">
                <span class="temporary-password-label">临时密码</span>
                <div class="temporary-password-input">
                    <el-input
                        :model-value="temporaryPasswordResult.temporary_password"
                        type="password"
                        readonly
                        show-password
                        autocomplete="off" />
                    <el-button type="primary" plain @click="handleCopyTemporaryPassword">复制</el-button>
                </div>
            </div>
            <div class="temporary-password-meta">
                <span>有效期至</span>
                <strong>{{ temporaryPasswordExpiresText }}</strong>
            </div>
        </div>
        <template #footer>
            <el-button type="primary" @click="temporaryPasswordDialogVisible = false">我已保存</el-button>
        </template>
    </el-dialog>
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
}

.box__body {
    height: 90%;
}

.temporary-password-content {
    margin-top: 20px;
}

.temporary-password-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.temporary-password-label,
.temporary-password-meta span {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.temporary-password-input {
    display: flex;
    gap: 10px;

    .el-input {
        flex: 1;
    }
}

.temporary-password-meta {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--el-border-color-lighter);

    strong {
        color: var(--el-text-color-primary);
        font-weight: 500;
    }
}
</style>
