<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import { RoleApi } from "@/api/auth/role-api.ts";
import useTable from "@/hooks/use-table.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const router = useRouter();
const condition = ref<RolePageParams>({
    page_num: 1,
    page_size: 15
});

const { handlerConditionQuery, handleCurrentChange, handleSizeChange, pagination, table_data } = useTable<RolePageVO>(
    RoleApi.page,
    condition.value
);

const roleKindLabels: Record<string, string> = {
    BUSINESS: "业务角色",
    DEV_OPS: "运维角色",
    SYSTEM_ADMIN: "系统管理员",
    AUDITOR: "审计角色"
};

function roleKindLabel(roleKind: string | undefined): string {
    return roleKindLabels[roleKind ?? ""] ?? roleKind ?? "业务角色";
}

function openCreate(): void {
    void router.push({ name: "SystemRoleCreate" });
}

function openEdit(row: RolePageVO): void {
    void router.push({ name: "SystemRoleEdit", params: { id: row.id } });
}

async function handleRoleConditionQuery(): Promise<void> {
    condition.value.page_num = 1;
    pagination.value.page = 1;
    await handlerConditionQuery();
}

async function refreshRoleList(): Promise<void> {
    await handlerConditionQuery();
    if (table_data.value.length === 0 && pagination.value.page > 1) {
        pagination.value.page -= 1;
        condition.value.page_num = pagination.value.page;
        await handlerConditionQuery();
    }
}

async function handleRoleEnable(row: RolePageVO): Promise<void> {
    try {
        await MessageUtils.box.confirm(`是否启用角色[${row.name}]`, "提示");
        await RoleApi.enable(row.id);
        MessageUtils.success("角色已启用");
        await refreshRoleList();
    } catch (error: unknown) {
        if (error !== "cancel" && error !== "close") MessageUtils.error(error);
    }
}

async function handleRoleDisable(row: RolePageVO): Promise<void> {
    try {
        await MessageUtils.box.confirm(`是否禁用角色[${row.name}]`, "提示");
        await RoleApi.disable(row.id);
        MessageUtils.success("角色已禁用");
        await refreshRoleList();
    } catch (error: unknown) {
        if (error !== "cancel" && error !== "close") MessageUtils.error(error);
    }
}

async function handleRoleDelete(row: RolePageVO): Promise<void> {
    try {
        await MessageUtils.box.confirm(`删除后角色将从角色目录中移除，是否继续删除[${row.name}]？`, "提示");
        await RoleApi.delete(row.id);
        MessageUtils.success("角色已删除");
        await refreshRoleList();
    } catch (error: unknown) {
        if (error !== "cancel" && error !== "close") MessageUtils.error(error);
    }
}
</script>

<template>
    <div class="role-list-page">
        <div class="role-list-search">
            <el-form :inline="true" :model="condition" @submit.prevent>
                <el-form-item label="角色名称">
                    <el-input v-model="condition.name" placeholder="请输入角色名称" clearable style="width: 190px" />
                </el-form-item>
                <el-form-item label="角色状态">
                    <el-select v-model="condition.state" placeholder="请选择角色状态" clearable style="width: 190px">
                        <el-option label="激活" :value="true" />
                        <el-option label="禁用" :value="false" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handleRoleConditionQuery">查询</el-button>
                    <el-button type="primary" plain @click="openCreate">新增角色</el-button>
                </el-form-item>
            </el-form>
        </div>

        <div class="role-list-body">
            <el-table :data="table_data" border height="100%">
                <el-table-column align="center" width="60" label="序号">
                    <template #default="scope">
                        {{ (pagination.page - 1) * pagination.size + scope.$index + 1 }}
                    </template>
                </el-table-column>
                <el-table-column align="center" width="170" prop="id" label="ID" show-overflow-tooltip />
                <el-table-column align="center" width="130" prop="name" label="角色名称" show-overflow-tooltip />
                <el-table-column align="center" width="150" prop="code" label="角色编码" show-overflow-tooltip />
                <el-table-column align="center" width="110" label="角色类型">
                    <template #default="scope">
                        {{ roleKindLabel(scope.row.role_kind) }}
                    </template>
                </el-table-column>
                <el-table-column align="center" width="110" prop="authority_level" label="授权管理等级" />
                <el-table-column align="center" width="90" label="状态">
                    <template #default="scope">
                        <el-tag :type="scope.row.state ? 'primary' : 'danger'">
                            {{ scope.row.state ? "激活" : "禁用" }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column align="center" width="100" label="是否内置">
                    <template #default="scope">
                        <el-tag :type="scope.row.builtin ? 'primary' : 'danger'">
                            {{ scope.row.builtin ? "是" : "否" }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column align="center" width="80" prop="version" label="版本" />
                <el-table-column align="center" prop="remark" label="备注" show-overflow-tooltip />
                <el-table-column align="center" label="操作" width="240" fixed="right">
                    <template #default="scope">
                        <template v-if="!scope.row.builtin">
                            <el-button link type="primary" size="small" @click="openEdit(scope.row)">编辑</el-button>
                            <el-button
                                v-if="scope.row.state"
                                link
                                type="warning"
                                size="small"
                                @click="handleRoleDisable(scope.row)">
                                禁用
                            </el-button>
                            <el-button v-else link type="success" size="small" @click="handleRoleEnable(scope.row)">
                                启用
                            </el-button>
                            <el-button link type="danger" size="small" @click="handleRoleDelete(scope.row)">
                                删除
                            </el-button>
                        </template>
                        <el-text v-else type="info" size="small">内置角色</el-text>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <el-pagination
            background
            layout="total, sizes, prev, pager, next"
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.size"
            :page-sizes="pagination.page_sizes"
            :total="pagination.total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
    </div>
</template>

<style scoped lang="scss">
.role-list-page {
    display: flex;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    padding: 10px 20px 16px;
    overflow: hidden;
    background: var(--el-bg-color);
    box-sizing: border-box;
}

.role-list-search {
    flex: 0 0 auto;
    padding: 8px 0 18px;
}

.role-list-search .el-form-item {
    margin-bottom: 0;
}

.role-list-body {
    flex: 1 1 auto;
    min-height: 0;
}

.role-list-page > .el-pagination {
    flex: 0 0 auto;
    align-self: flex-end;
    padding: 14px 0 0;
}
</style>
