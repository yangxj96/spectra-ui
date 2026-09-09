<script setup lang="ts">
import { ElMessageBox } from "element-plus";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { QuartzSchedulerApi } from "@/api/system/scheduler-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import TaskEdit from "@/views/Devops/Scheduler/Task/components/TaskEdit/index.vue";

const router = useRouter();
const loading = ref(false);
const tableData = ref<QuartzJobVO[]>([]);
const jobTypes = ref<QuartzJobTypeVO[]>([]);
const page = ref(1);
const pageSize = ref(15);
const total = ref(0);
const typeFilter = ref<string>();
const editVisible = ref(false);
const editingJob = ref<QuartzJobVO>();

const triggerTypeLabels: Record<QuartzTriggerType, string> = {
    CRON: "Cron",
    SIMPLE: "Simple"
};

const triggerStateLabels: Record<string, string> = {
    WAITING: "等待中",
    PAUSED: "已暂停",
    BLOCKED: "阻塞",
    ERROR: "错误",
    NONE: "无状态",
    NORMAL: "正常",
    COMPLETE: "已完成"
};

const visibleJobs = computed(() =>
    typeFilter.value ? tableData.value.filter(item => item.type_key === typeFilter.value) : tableData.value
);

async function loadJobs(): Promise<void> {
    loading.value = true;
    try {
        const result = await QuartzSchedulerApi.jobs({
            page_num: page.value,
            page_size: pageSize.value
        });
        tableData.value = result.records ?? [];
        total.value = result.total ?? 0;
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "定时任务加载失败");
    } finally {
        loading.value = false;
    }
}

async function loadJobTypes(): Promise<void> {
    try {
        jobTypes.value = await QuartzSchedulerApi.jobTypes();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "任务类型目录加载失败");
    }
}

function resetFilter(): void {
    typeFilter.value = undefined;
}

function changePage(value: number): void {
    page.value = value;
    void loadJobs();
}

function changePageSize(value: number): void {
    pageSize.value = value;
    page.value = 1;
    void loadJobs();
}

function openCreate(): void {
    editingJob.value = undefined;
    editVisible.value = true;
}

function openEdit(job: QuartzJobVO): void {
    editingJob.value = job;
    editVisible.value = true;
}

function triggerTypeLabel(trigger: QuartzTriggerVO | null): string {
    return trigger ? triggerTypeLabels[trigger.trigger_type] : "未配置";
}

function triggerStateLabel(trigger: QuartzTriggerVO | null): string {
    return trigger ? (triggerStateLabels[trigger.state] ?? trigger.state) : "未配置";
}

function tagType(value: string): "success" | "warning" | "danger" | "info" {
    if (["WAITING", "NORMAL"].includes(value)) return "success";
    if (["PAUSED", "BLOCKED"].includes(value)) return "warning";
    if (["ERROR"].includes(value)) return "danger";
    return "info";
}

function date(value: string | null): string {
    return value ? formatDateTime(value) : "—";
}

function triggerSchedule(trigger: QuartzTriggerVO | null): string {
    if (!trigger) return "—";
    if (trigger.trigger_type === "CRON") return trigger.cron_expression ?? "—";
    if (trigger.one_shot) return "一次性";
    return trigger.interval_ms ? `每 ${Math.round(trigger.interval_ms / 1000)} 秒` : "—";
}

async function pause(job: QuartzJobVO): Promise<void> {
    try {
        await QuartzSchedulerApi.pauseJob(job.job_key);
        MessageUtils.success("任务已暂停");
        await loadJobs();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "暂停任务失败");
    }
}

async function resume(job: QuartzJobVO): Promise<void> {
    try {
        await QuartzSchedulerApi.resumeJob(job.job_key);
        MessageUtils.success("任务已恢复");
        await loadJobs();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "恢复任务失败");
    }
}

async function trigger(job: QuartzJobVO): Promise<void> {
    try {
        await QuartzSchedulerApi.triggerJob(job.job_key);
        MessageUtils.success("任务已提交立即执行");
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "立即触发任务失败");
    }
}

async function remove(job: QuartzJobVO): Promise<void> {
    try {
        await ElMessageBox.confirm(`确认删除任务「${job.display_name}」？删除后不可恢复。`, "删除定时任务", {
            confirmButtonText: "删除",
            cancelButtonText: "取消",
            type: "warning"
        });
        await QuartzSchedulerApi.deleteJob(job.job_key);
        MessageUtils.success("任务已删除");
        if (tableData.value.length === 1 && page.value > 1) page.value -= 1;
        await loadJobs();
    } catch (error) {
        if (error !== "cancel" && error !== "close") {
            MessageUtils.error(error instanceof Error ? error.message : "删除任务失败");
        }
    }
}

function viewHistory(job: QuartzJobVO): void {
    void router.push({
        name: "DevopsSchedulerExecution",
        query: { job_key: job.job_key }
    });
}

onMounted(() => {
    void Promise.all([loadJobTypes(), loadJobs()]);
});
</script>

<template>
    <div v-loading="loading" class="scheduler-task-page">
        <el-row class="box__search">
            <el-form :inline="true">
                <el-form-item label="任务类型">
                    <el-select v-model="typeFilter" class="search-field" clearable placeholder="全部类型">
                        <el-option
                            v-for="item in jobTypes"
                            :key="item.type_key"
                            :label="`${item.display_name}（${item.type_key}）`"
                            :value="item.type_key" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button @click="resetFilter">重置</el-button>
                    <el-button type="primary" @click="openCreate">新增任务</el-button>
                    <el-button @click="void loadJobs()">刷新</el-button>
                </el-form-item>
            </el-form>
        </el-row>

        <el-row class="box__body">
            <el-table :data="visibleJobs" height="92%" stripe empty-text="暂无定时任务">
                <el-table-column align="center" type="index" label="序号" width="70" />
                <el-table-column label="任务名称" prop="display_name" min-width="170" show-overflow-tooltip />
                <el-table-column label="任务键" prop="job_key" min-width="245" show-overflow-tooltip />
                <el-table-column label="任务类型" prop="type_key" min-width="180" show-overflow-tooltip />
                <el-table-column label="触发类型" width="110" align="center">
                    <template #default="scope">
                        <el-tag size="small" type="info">
                            {{ triggerTypeLabel(scope.row.trigger) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="调度配置" min-width="130" show-overflow-tooltip>
                    <template #default="scope">
                        {{ triggerSchedule(scope.row.trigger) }}
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="110" align="center">
                    <template #default="scope">
                        <el-tag size="small" :type="tagType(scope.row.trigger?.state ?? 'NONE')">
                            {{ triggerStateLabel(scope.row.trigger) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="下次触发时间" width="175" show-overflow-tooltip>
                    <template #default="scope">{{ date(scope.row.trigger?.next_fire_at ?? null) }}</template>
                </el-table-column>
                <el-table-column label="保护" width="80" align="center">
                    <template #default="scope">
                        <el-tag v-if="scope.row.protected_job" type="warning" size="small">内置</el-tag>
                        <span v-else>普通</span>
                    </template>
                </el-table-column>
                <el-table-column label="操作" min-width="330" fixed="right">
                    <template #default="scope">
                        <el-button link type="primary" @click="viewHistory(scope.row)">执行历史</el-button>
                        <el-button
                            v-if="scope.row.trigger?.state === 'PAUSED'"
                            link
                            type="success"
                            @click="resume(scope.row)">
                            恢复
                        </el-button>
                        <el-button v-else link type="warning" @click="pause(scope.row)">暂停</el-button>
                        <el-button link type="primary" @click="trigger(scope.row)">立即触发</el-button>
                        <el-button link type="primary" @click="openEdit(scope.row)">编辑</el-button>
                        <el-button v-if="!scope.row.protected_job" link type="danger" @click="remove(scope.row)">
                            删除
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
                @current-change="changePage"
                @size-change="changePageSize" />
        </el-row>

        <TaskEdit v-model="editVisible" :catalog="jobTypes" :job="editingJob" @saved="loadJobs" />
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
    width: 260px;
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
