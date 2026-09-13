<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";

import { CacheManagementApi } from "@/api/system/cache-management-api.ts";
import { DepartmentApi } from "@/api/user/department-api.ts";
import { UserApi } from "@/api/user/user-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const condition = reactive<OnlineUserPageParams>({ page_num: 1, page_size: 15 });
const users = ref<OnlineUserPageVO[]>([]);
const departments = ref<DepartmentTreeVO[]>([]);
const loading = ref(false);
const pagination = reactive<Pagination>({
    page: 1,
    size: 15,
    page_sizes: [15, 30, 50, 100],
    default_page_size: 15,
    total: 0
});

function buildQuery(): OnlineUserPageParams {
    return {
        page_num: condition.page_num,
        page_size: condition.page_size,
        ...(condition.username?.trim() ? { username: condition.username.trim() } : {}),
        ...(condition.real_name?.trim() ? { real_name: condition.real_name.trim() } : {}),
        ...(condition.department_id ? { department_id: condition.department_id } : {})
    };
}

async function loadUsers(): Promise<void> {
    loading.value = true;
    try {
        let result = await UserApi.online(buildQuery());
        const pageSize = result.size || condition.page_size;
        const lastPage = Math.max(1, Math.ceil((result.total ?? 0) / pageSize));
        if ((result.records?.length ?? 0) === 0 && condition.page_num > lastPage) {
            condition.page_num = lastPage;
            result = await UserApi.online(buildQuery());
        }

        users.value = result.records ?? [];
        pagination.total = result.total ?? 0;
        pagination.page = result.current ?? condition.page_num;
        pagination.size = result.size ?? condition.page_size;
    } catch {
        ElMessage.error("在线用户查询失败，请检查连接后手动刷新");
    } finally {
        loading.value = false;
    }
}

async function loadDepartments(): Promise<void> {
    try {
        departments.value = await DepartmentApi.tree();
    } catch {
        ElMessage.error("部门列表加载失败");
    }
}

function queryUsers(): void {
    condition.page_num = 1;
    pagination.page = 1;
    void loadUsers();
}

function resetQuery(): void {
    condition.username = undefined;
    condition.real_name = undefined;
    condition.department_id = undefined;
    queryUsers();
}

function changePage(page: number): void {
    condition.page_num = page;
    pagination.page = page;
    void loadUsers();
}

function changePageSize(size: number): void {
    condition.page_num = 1;
    condition.page_size = size;
    pagination.page = 1;
    pagination.size = size;
    void loadUsers();
}

function isDialogDismissal(reason: unknown): boolean {
    if (reason === "cancel" || reason === "close") {
        return true;
    }
    return (
        typeof reason === "object" &&
        reason !== null &&
        "action" in reason &&
        ((reason as { action?: unknown }).action === "cancel" || (reason as { action?: unknown }).action === "close")
    );
}

async function confirmAndRun(
    promptTitle: string,
    confirmationMessage: string,
    run: (reason: string) => Promise<void>
): Promise<void> {
    try {
        const response = await ElMessageBox.prompt("请填写本次下线原因，该原因会记录到安全审计。", promptTitle, {
            inputPlaceholder: "例如：账号异常，按安全流程下线",
            inputValidator: value => Boolean(value?.trim()),
            inputErrorMessage: "操作原因不能为空",
            confirmButtonText: "继续",
            cancelButtonText: "取消"
        });
        const reason = MessageUtils.box.promptValue(response).trim();
        if (!reason) {
            MessageUtils.warning("操作原因不能为空");
            return;
        }
        await ElMessageBox.confirm(confirmationMessage, "确认下线", {
            type: "warning",
            confirmButtonText: "确认下线",
            cancelButtonText: "取消"
        });
        await run(reason);
        ElMessage.success("下线操作已完成");
        await loadUsers();
    } catch (failure) {
        if (!isDialogDismissal(failure)) {
            ElMessage.error("下线操作失败，会话可能已失效；请刷新列表后重试");
        }
    }
}

function revokeOne(user: OnlineUserPageVO, session: OnlineSessionVO): void {
    void confirmAndRun(
        `下线 ${user.username} 的 ${session.client_type} 会话`,
        `确认下线账号“${user.username}”的这台设备吗？`,
        async reason => {
            await CacheManagementApi.revokeSingleSession({ session_id: session.session_id, reason, confirmed: true });
        }
    );
}

function revokeAll(user: OnlineUserPageVO): void {
    void confirmAndRun(
        `下线 ${user.username} 的全部会话`,
        `确认下线账号“${user.username}”的全部 ${user.session_count} 个会话吗？`,
        async reason => {
            await CacheManagementApi.revokeAllSessions({ user_id: user.user_id, reason, confirmed: true });
        }
    );
}

onMounted(() => {
    void loadDepartments();
    void loadUsers();
});
</script>

<template>
    <el-row class="box__search">
        <el-form :inline="true" @submit.prevent>
            <el-form-item label="账号">
                <el-input v-model="condition.username" class="search-field" placeholder="请输入账号" clearable />
            </el-form-item>
            <el-form-item label="姓名">
                <el-input v-model="condition.real_name" class="search-field" placeholder="请输入姓名" clearable />
            </el-form-item>
            <el-form-item label="部门">
                <el-tree-select
                    v-model="condition.department_id"
                    class="search-field department-field"
                    :data="departments"
                    node-key="id"
                    :props="{ label: 'name', children: 'children' }"
                    check-strictly
                    default-expand-all
                    clearable
                    placeholder="请选择部门" />
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="queryUsers">查询</el-button>
                <el-button @click="resetQuery">重置</el-button>
                <el-button :loading="loading" @click="loadUsers">刷新</el-button>
            </el-form-item>
        </el-form>
    </el-row>

    <el-row class="box__body">
        <el-col :span="24">
            <el-table v-loading="loading" :data="users" row-key="user_id" stripe height="92%">
                <el-table-column type="expand" align="center">
                    <template #default="scope">
                        <el-table :data="scope.row.sessions" stripe class="session-table">
                            <el-table-column type="index" label="序号" width="70" align="center" />
                            <el-table-column prop="client_type" label="客户端" width="130" align="center" />
                            <el-table-column label="登录 IP" min-width="160" align="center">
                                <template #default="sessionScope">{{ sessionScope.row.ip || "-" }}</template>
                            </el-table-column>
                            <el-table-column label="登录时间" min-width="190" align="center">
                                <template #default="sessionScope">{{ sessionScope.row.login_time || "-" }}</template>
                            </el-table-column>
                            <el-table-column label="操作" width="150" align="center">
                                <template #default="sessionScope">
                                    <el-button link type="danger" @click="revokeOne(scope.row, sessionScope.row)">
                                        下线此会话
                                    </el-button>
                                </template>
                            </el-table-column>
                        </el-table>
                    </template>
                </el-table-column>
                <el-table-column prop="username" label="登录账号" min-width="170" align="center" />
                <el-table-column label="姓名" min-width="140" align="center">
                    <template #default="scope">{{ scope.row.real_name || "-" }}</template>
                </el-table-column>
                <el-table-column label="部门" min-width="180" align="center" show-overflow-tooltip>
                    <template #default="scope">{{ scope.row.department_name || "-" }}</template>
                </el-table-column>
                <el-table-column prop="session_count" label="会话数" width="100" align="center" />
                <el-table-column label="最近登录" min-width="190" align="center">
                    <template #default="scope">{{ scope.row.latest_login_time || "-" }}</template>
                </el-table-column>
                <el-table-column label="操作" width="130" fixed="right" align="center">
                    <template #default="scope">
                        <el-button link type="danger" @click="revokeAll(scope.row)">全部下线</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-pagination
                v-model:current-page="pagination.page"
                v-model:page-size="pagination.size"
                :page-sizes="pagination.page_sizes"
                :total="pagination.total"
                layout="total, sizes, prev, pager, next"
                @size-change="changePageSize"
                @current-change="changePage" />
        </el-col>
    </el-row>
</template>

<style scoped lang="scss">
.box__search {
    height: 10%;
    display: flex;
    align-items: center;
    overflow-x: auto;
    padding: 0 20px;
}

.box__search :deep(.el-form--inline) {
    display: flex;
    flex-wrap: nowrap;
    flex: 0 0 max-content;
    width: max-content;
    min-width: max-content;
    align-items: center;
}

.box__search :deep(.el-form-item) {
    flex: 0 0 auto;
    margin-right: 12px;
    margin-bottom: 0;
}

.box__search :deep(.search-field) {
    flex: 0 0 160px;
    width: 160px;
    min-width: 160px;
    max-width: 160px;
}

.box__search :deep(.department-field) {
    width: 190px;
    min-width: 190px;
    max-width: 190px;
}

.box__body {
    display: block;
    height: 90%;
    padding: 0 20px;
}

.box__body :deep(.el-col) {
    height: 100%;
}

.box__body :deep(.el-pagination) {
    justify-content: flex-end;
    margin-top: 4px;
}

.session-table {
    width: 100%;
    padding: 0 16px;
}
</style>
