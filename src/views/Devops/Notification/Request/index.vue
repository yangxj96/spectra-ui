<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import { NotificationAdminApi } from "@/api/notification/notification-admin-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import useTable from "@/hooks/use-table.ts";

import type { DateModelType } from "element-plus";

const purposeOptions = [
    { label: "登录验证码", value: "LOGIN_CODE" },
    { label: "绑定手机验证码", value: "BIND_PHONE_CODE" },
    { label: "绑定邮箱验证码", value: "BIND_EMAIL_CODE" },
    { label: "重置密码验证码", value: "RESET_PASSWORD_CODE" },
    { label: "安全告警", value: "SECURITY_ALERT" },
    { label: "系统通知", value: "SYSTEM_NOTICE" },
    { label: "流程待办", value: "WORKFLOW_TODO" },
    { label: "流程结果", value: "WORKFLOW_RESULT" },
    { label: "OA 通知", value: "OA_NOTICE" },
    { label: "OA 提醒", value: "OA_REMINDER" },
    { label: "内部消息", value: "INNER_MESSAGE" }
];

const statusOptions = [
    { label: "已接受", value: "ACCEPTED" },
    { label: "分发中", value: "DISPATCHING" },
    { label: "已成功", value: "SUCCEEDED" },
    { label: "部分成功", value: "PARTIAL" },
    { label: "失败", value: "FAILED" },
    { label: "已取消", value: "CANCELLED" },
    { label: "已过期", value: "EXPIRED" }
];

const condition = ref<NotificationAdminRequestQuery>({ page_num: 1, page_size: 15 });
const dateRange = ref<[DateModelType, DateModelType] | undefined>();
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable(
    NotificationAdminApi.pageRequests,
    condition.value
);
const router = useRouter();

function purposeLabel(purpose: string): string {
    return purposeOptions.find(item => item.value === purpose)?.label ?? purpose;
}

function statusLabel(status: string): string {
    return statusOptions.find(item => item.value === status)?.label ?? status;
}

function statusTagType(status: string): "success" | "warning" | "danger" | "info" {
    if (status === "SUCCEEDED") return "success";
    if (status === "FAILED" || status === "EXPIRED") return "danger";
    if (status === "PARTIAL" || status === "DISPATCHING") return "warning";
    return "info";
}

function toIso(value: DateModelType): string | undefined {
    if (!value) return undefined;
    return new Date(value).toISOString();
}

function applyDateRange(): void {
    condition.value.start_time = toIso(dateRange.value?.[0]);
    condition.value.end_time = toIso(dateRange.value?.[1]);
}

function search(): void {
    applyDateRange();
    condition.value.page_num = 1;
    void handlerConditionQuery();
}

function reset(): void {
    dateRange.value = undefined;
    Object.assign(condition.value, {
        status: undefined,
        purpose: undefined,
        source_module: undefined,
        business_type: undefined,
        business_id: undefined,
        start_time: undefined,
        end_time: undefined,
        page_num: 1
    });
    void handlerConditionQuery();
}

function openDetail(row: NotificationRequestAdminVO): void {
    void router.push({ name: "DevopsNotificationRequestDetail", query: { id: row.id } });
}
</script>

<template>
    <div class="notification-request-page">
        <el-row class="box__search">
            <el-form :model="condition" class="search-form">
                <div class="search-row">
                    <el-form-item label="状态">
                        <el-select v-model="condition.status" clearable placeholder="全部状态" style="width: 200px">
                            <el-option
                                v-for="item in statusOptions"
                                :key="item.value"
                                :label="item.label"
                                :value="item.value" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="用途">
                        <el-select
                            v-model="condition.purpose"
                            clearable
                            filterable
                            placeholder="全部用途"
                            style="width: 200px">
                            <el-option
                                v-for="item in purposeOptions"
                                :key="item.value"
                                :label="item.label"
                                :value="item.value" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="来源模块">
                        <el-input
                            v-model="condition.source_module"
                            clearable
                            placeholder="请输入来源模块"
                            style="width: 200px" />
                    </el-form-item>
                    <el-form-item label="业务类型">
                        <el-input
                            v-model="condition.business_type"
                            clearable
                            placeholder="请输入业务类型"
                            style="width: 200px" />
                    </el-form-item>
                </div>
                <div class="search-row">
                    <el-form-item label="业务编号">
                        <el-input
                            v-model="condition.business_id"
                            clearable
                            placeholder="请输入业务编号"
                            style="width: 200px" />
                    </el-form-item>
                    <el-form-item label="创建时间">
                        <el-date-picker
                            v-model="dateRange"
                            type="datetimerange"
                            range-separator="至"
                            start-placeholder="开始时间"
                            end-placeholder="结束时间"
                            :default-time="[new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]"
                            style="width: 300px" />
                    </el-form-item>
                    <el-form-item class="search-actions">
                        <el-button type="primary" @click="search">查询</el-button>
                        <el-button @click="reset">重置</el-button>
                    </el-form-item>
                </div>
            </el-form>
            <el-alert
                class="search-tip"
                title="未指定时间时默认查询最近 31 天；精确关联任务由请求编号定位，不受时间窗口影响。"
                type="info"
                :closable="false"
                show-icon />
        </el-row>

        <el-row class="box__body">
            <el-table :data="table_data" height="92%" stripe empty-text="暂无通知请求">
                <el-table-column type="index" label="序号" width="65" align="center" />
                <el-table-column label="请求编号" prop="id" min-width="245" show-overflow-tooltip />
                <el-table-column label="用途" min-width="120">
                    <template #default="scope">{{ purposeLabel(scope.row.purpose) }}</template>
                </el-table-column>
                <el-table-column label="来源模块" prop="source_module" min-width="120" show-overflow-tooltip />
                <el-table-column label="业务对象" min-width="170" show-overflow-tooltip>
                    <template #default="scope">
                        {{ scope.row.business_type || "—" }} / {{ scope.row.business_id || "—" }}
                    </template>
                </el-table-column>
                <el-table-column label="任务" width="80" align="center" prop="task_count" />
                <el-table-column label="状态" width="100" align="center">
                    <template #default="scope">
                        <el-tag :type="statusTagType(scope.row.status)" size="small">
                            {{ statusLabel(scope.row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="创建时间" prop="created_at" width="170" show-overflow-tooltip />
                <el-table-column label="操作" width="70" fixed="right">
                    <template #default="scope">
                        <el-tooltip content="查看执行详情" placement="top">
                            <el-button link type="primary" @click="openDetail(scope.row)">
                                <ComponentsIcons name="icon-eye" style="width: 1.4em; height: 1.4em" />
                            </el-button>
                        </el-tooltip>
                    </template>
                </el-table-column>
            </el-table>
            <el-pagination
                layout="total, sizes, prev, pager, next"
                :current-page="pagination.page"
                :page-size="pagination.size"
                :page-sizes="pagination.page_sizes"
                :total="pagination.total"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange" />
        </el-row>
    </div>
</template>

<style scoped lang="scss">
.notification-request-page {
    display: grid;
    grid-template-rows: minmax(148px, 18%) minmax(0, 1fr);
    height: 100%;
    min-height: 0;
    overflow: hidden;
    box-sizing: border-box;
    background: var(--el-bg-color);
}

.box__search {
    display: flex;
    min-height: 0;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: 6px;
    padding: 8px 20px;
    box-sizing: border-box;
    overflow-x: hidden;
    overflow-y: hidden;
}

.search-form {
    display: flex;
    width: 100%;
    min-width: 0;
    flex-direction: column;
    gap: 8px;
}

.search-row {
    display: flex;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 16px;
    overflow-x: hidden;
}

.search-row :deep(.el-form-item) {
    min-width: 0;
    margin: 0;
}

.search-row :deep(.el-form-item .el-input),
.search-row :deep(.el-form-item .el-select),
.search-row :deep(.el-form-item .el-date-editor) {
    max-width: 100%;
}

.search-actions {
    flex: 0 0 auto;
}

.search-tip {
    width: 100%;
    flex: 0 0 auto;
    box-sizing: border-box;
}

.box__body {
    display: block;
    height: auto;
    min-height: 0;
    padding: 0 20px;
    box-sizing: border-box;
}

.box__body :deep(.el-table) {
    width: 100%;
}

.box__body :deep(.el-pagination) {
    justify-content: flex-end;
    padding: 0 10px;
    margin-top: 4px;
    margin-left: auto;
}
</style>
