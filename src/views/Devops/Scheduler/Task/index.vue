<script setup lang="ts">
import { onMounted, ref } from "vue";

import { SchedulerAdminApi } from "@/api/system/scheduler-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

import LoopRuntimePanel from "../components/LoopRuntimePanel.vue";
import SchedulerOperationHistory from "../components/SchedulerOperationHistory.vue";

import TaskEdit from "./components/TaskEdit/index.vue";

const loading = ref(false);
const tableData = ref<SchedulerJobVO[]>([]);
const catalog = ref<SchedulerCatalogVO[]>([]);
const searchKey = ref("");
const page = ref(1);
const pageSize = ref(15);
const total = ref(0);
const selectedType = ref<SchedulerJobType | undefined>();
const editVisible = ref(false);
const editingJob = ref<SchedulerJobVO>();
const loopVisible = ref(false);
const selectedLoopJobId = ref("");
const operationVisible = ref(false);
const selectedOperationJobId = ref("");

const typeLabels: Record<SchedulerJobType, string> = { OPS: "运维", SYSTEM: "系统", LOOP: "循环" };
const scopeLabels: Record<SchedulerRunScope, string> = { PER_INSTANCE: "每实例", SINGLETON: "单实例" };
const stateLabels: Record<string, string> = {
    ENABLED: "已启用",
    DISABLED: "已停用",
    RUNNING: "运行中",
    DRAINING: "排空中",
    STOPPED: "已停止",
    REGISTERED: "已注册",
    UNAVAILABLE: "不可用",
    ARCHIVED: "已归档"
};

async function loadData(): Promise<void> {
    loading.value = true;
    try {
        const result = await SchedulerAdminApi.jobs({
            page_num: page.value,
            page_size: pageSize.value,
            job_key: searchKey.value || undefined,
            job_type: selectedType.value
        });
        tableData.value = result.records ?? [];
        total.value = result.total ?? 0;
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "调度任务加载失败");
    } finally {
        loading.value = false;
    }
}

async function loadCatalog(): Promise<void> {
    try {
        catalog.value = await SchedulerAdminApi.catalog();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "调度处理器目录加载失败");
    }
}

function search(): void {
    page.value = 1;
    void loadData();
}
function reset(): void {
    searchKey.value = "";
    selectedType.value = undefined;
    search();
}
function openCreate(): void {
    editingJob.value = undefined;
    editVisible.value = true;
}
function openEdit(row: SchedulerJobVO): void {
    editingJob.value = row;
    editVisible.value = true;
}
function openLoops(row: SchedulerJobVO): void {
    selectedLoopJobId.value = row.id;
    loopVisible.value = true;
}
function openOperations(row: SchedulerJobVO): void {
    selectedOperationJobId.value = row.id;
    operationVisible.value = true;
}

function operationKey(prefix: string): string {
    return `${prefix}:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

async function askReason(title: string): Promise<string | undefined> {
    try {
        const result = await MessageUtils.box.prompt("请输入本次操作原因。", title, {
            inputPlaceholder: "例如：例行维护窗口调整",
            inputValidator: value => (value?.trim() ? true : "操作原因不能为空")
        });
        return result.value.trim();
    } catch {
        return undefined;
    }
}

function stateActionTitle(row: SchedulerJobVO, action: "enable" | "disable" | "archive"): string {
    if (action === "archive") return "归档任务";
    if (action === "enable" && row.definition_status === "ARCHIVED") return "重新注册任务";
    if (action === "enable") return "启用任务";
    return "停用任务";
}

async function changeState(row: SchedulerJobVO, action: "enable" | "disable" | "archive"): Promise<void> {
    const reason = await askReason(stateActionTitle(row, action));
    if (!reason) return;
    try {
        const body: SchedulerOperationParams = { version: row.version, idempotency_key: operationKey(action), reason };
        if (action === "enable") await SchedulerAdminApi.enableJob(row.id, body);
        if (action === "disable") await SchedulerAdminApi.disableJob(row.id, body);
        if (action === "archive") await SchedulerAdminApi.archiveJob(row.id, body);
        MessageUtils.success("任务状态已更新");
        await loadData();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "任务状态更新失败");
    }
}

async function trigger(row: SchedulerJobVO): Promise<void> {
    const reason = await askReason("手工触发任务");
    if (!reason) return;
    try {
        await SchedulerAdminApi.triggerJob(row.id, {
            parameters: row.parameters ?? {},
            idempotency_key: operationKey("manual"),
            reason
        });
        MessageUtils.success("手工执行已入队");
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "手工触发失败");
    }
}

function stateLabel(value: string): string {
    return stateLabels[value] ?? value;
}
function typeLabel(value: SchedulerJobType): string {
    return typeLabels[value] ?? value;
}
function scopeLabel(value: SchedulerRunScope): string {
    return scopeLabels[value] ?? value;
}
function tagType(value: string): "success" | "warning" | "danger" | "info" {
    if (["RUNNING", "ENABLED", "SUCCEEDED", "REGISTERED"].includes(value)) return "success";
    if (["DRAINING", "UNAVAILABLE"].includes(value)) return "warning";
    if (["FAILED", "UNKNOWN", "ARCHIVED"].includes(value)) return "danger";
    return "info";
}
function formatOptional(value: string | null): string {
    return value ? formatDateTime(value) : "—";
}

onMounted(() => {
    void Promise.all([loadCatalog(), loadData()]);
});
</script>

<template>
    <div v-loading="loading" class="scheduler-task-page">
        <el-row class="box__search">
            <el-form :inline="true">
                <el-form-item label="任务键">
                    <el-input
                        v-model="searchKey"
                        class="search-field"
                        clearable
                        placeholder="按任务键搜索"
                        @keyup.enter="search" />
                </el-form-item>
                <el-form-item label="类型">
                    <el-select v-model="selectedType" class="search-field" clearable placeholder="全部类型">
                        <el-option
                            v-for="type in Object.keys(typeLabels) as SchedulerJobType[]"
                            :key="type"
                            :label="typeLabel(type)"
                            :value="type" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="search">查询</el-button>
                    <el-button @click="reset">重置</el-button>
                    <el-button type="primary" @click="openCreate">新增运维任务</el-button>
                </el-form-item>
            </el-form>
        </el-row>

        <el-row class="box__body">
            <el-table :data="tableData" height="92%" stripe empty-text="暂无调度任务">
                <el-table-column align="center" type="index" label="序号" width="70" />
                <el-table-column label="名称" prop="name" min-width="170" show-overflow-tooltip />
                <el-table-column label="任务键" prop="job_key" min-width="220" show-overflow-tooltip />
                <el-table-column label="类型" width="110" align="center">
                    <template #default="scope">
                        <el-tag size="small">{{ typeLabel(scope.row.job_type) }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="范围" width="110" align="center">
                    <template #default="scope">
                        <el-tag size="small" effect="plain">{{ scopeLabel(scope.row.run_scope) }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="定义状态" width="100" align="center">
                    <template #default="scope">
                        <el-tag size="small" :type="tagType(scope.row.definition_status)">
                            {{ stateLabel(scope.row.definition_status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="期望状态" width="100" align="center">
                    <template #default="scope">
                        <el-tag size="small" :type="tagType(scope.row.desired_state)">
                            {{ stateLabel(scope.row.desired_state) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="下一次计划" width="175" show-overflow-tooltip>
                    <template #default="scope">{{ formatOptional(scope.row.next_fire_at) }}</template>
                </el-table-column>
                <el-table-column label="修订/版本" width="105" align="center">
                    <template #default="scope">{{ scope.row.revision }} / {{ scope.row.version }}</template>
                </el-table-column>
                <el-table-column label="操作" min-width="370" fixed="right">
                    <template #default="scope">
                        <el-button link type="info" @click="openOperations(scope.row)">操作记录</el-button>
                        <el-button
                            v-if="scope.row.job_type !== 'LOOP' && scope.row.definition_status === 'REGISTERED'"
                            link
                            type="primary"
                            @click="trigger(scope.row)">
                            触发
                        </el-button>
                        <el-button
                            v-if="scope.row.job_type === 'LOOP'"
                            link
                            type="primary"
                            @click="openLoops(scope.row)">
                            运行会话
                        </el-button>
                        <el-button
                            v-if="scope.row.job_type === 'OPS' && scope.row.definition_status === 'REGISTERED'"
                            link
                            type="primary"
                            @click="openEdit(scope.row)">
                            编辑
                        </el-button>
                        <el-button
                            v-if="scope.row.job_type === 'OPS' && scope.row.desired_state === 'ENABLED'"
                            link
                            type="warning"
                            @click="changeState(scope.row, 'disable')">
                            停用
                        </el-button>
                        <el-button
                            v-if="
                                scope.row.job_type === 'OPS' &&
                                scope.row.desired_state === 'DISABLED' &&
                                scope.row.definition_status === 'REGISTERED'
                            "
                            link
                            type="success"
                            @click="changeState(scope.row, 'enable')">
                            启用
                        </el-button>
                        <el-button
                            v-if="scope.row.job_type === 'OPS' && scope.row.definition_status === 'ARCHIVED'"
                            link
                            type="success"
                            @click="changeState(scope.row, 'enable')">
                            重新注册
                        </el-button>
                        <el-button
                            v-if="scope.row.job_type === 'OPS' && scope.row.definition_status !== 'ARCHIVED'"
                            link
                            type="danger"
                            @click="changeState(scope.row, 'archive')">
                            归档
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-pagination
                :current-page="page"
                :page-size="pageSize"
                :page-sizes="[15, 50, 100]"
                layout="total, sizes, prev, pager, next"
                :total="total"
                style="padding: 0 10px; margin-left: auto"
                @current-change="loadData"
                @size-change="search" />
        </el-row>

        <TaskEdit v-model="editVisible" :catalog="catalog" :job="editingJob" @saved="loadData" />
        <el-dialog v-model="operationVisible" title="调度操作记录" width="80%" destroy-on-close>
            <SchedulerOperationHistory v-if="operationVisible" :job-id="selectedOperationJobId" />
        </el-dialog>
        <el-dialog v-model="loopVisible" title="LOOP 运行会话" width="80%" destroy-on-close>
            <LoopRuntimePanel v-if="loopVisible" :job-id="selectedLoopJobId" />
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.scheduler-task-page {
    height: 100%;
    min-height: 0;
    overflow: hidden;
    box-sizing: border-box;
    background: var(--el-bg-color);
}

.box__search {
    display: flex;
    height: 10%;
    align-items: center;
    padding-left: 20px;
}

.box__search :deep(.el-form-item) {
    margin-bottom: 0;
}

.box__search :deep(.search-field) {
    flex: 0 0 200px;
    width: 200px;
    min-width: 200px;
    max-width: 200px;
}

.box__body {
    display: block;
    height: 90%;
    padding: 0 20px;
}

.box__body :deep(.el-table) {
    width: 100%;
}

.box__body :deep(.el-pagination) {
    justify-content: flex-end;
    margin-top: 4px;
}

@media (max-width: 900px) {
    .box__search {
        height: auto;
        padding: 12px 20px;
    }

    .box__body {
        height: calc(100% - 96px);
    }
}
</style>
