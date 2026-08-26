<script setup lang="ts">
import { onMounted, ref } from "vue";

import { SchedulerAdminApi } from "@/api/system/scheduler-api.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const props = defineProps<{ jobId: string }>();
const runtimes = ref<SchedulerLoopRuntimeVO[]>([]);
const errors = ref<SchedulerLoopErrorVO[]>([]);
const loading = ref(false);

const runtimeStatusLabels: Record<SchedulerRuntimeStatus, string> = {
    STARTING: "启动中",
    RUNNING: "运行中",
    DEGRADED: "降级",
    DRAINING: "排空中",
    STOPPED: "已停止",
    CRASHED: "已崩溃",
    UNKNOWN: "未知"
};
const errorStatusLabels: Record<SchedulerLoopErrorStatus, string> = {
    OPEN: "未解决",
    RESOLVED: "已解决"
};

function key(prefix: string): string {
    return `${prefix}:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

async function load(): Promise<void> {
    loading.value = true;
    try {
        const [runtimePage, errorPage] = await Promise.all([
            SchedulerAdminApi.loops({ page_num: 1, page_size: 100, job_id: props.jobId }),
            SchedulerAdminApi.errors(props.jobId, { page_num: 1, page_size: 100 })
        ]);
        runtimes.value = runtimePage.records ?? [];
        errors.value = errorPage.records ?? [];
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "LOOP 会话或错误加载失败");
    } finally {
        loading.value = false;
    }
}

async function askReason(title: string): Promise<string | undefined> {
    try {
        const result = await MessageUtils.box.prompt("请输入控制原因。", title, {
            inputPlaceholder: "例如：发布窗口前排空 Worker",
            inputValidator: value => (value?.trim() ? true : "控制原因不能为空")
        });
        return result.value.trim();
    } catch {
        return undefined;
    }
}

function commandTitle(commandType: SchedulerCommandType): string {
    if (commandType === "DRAIN_STOP") return "排空停止";
    if (commandType === "FORCE_RECLAIM") return "强制回收租约";
    return commandType;
}

async function command(commandType: SchedulerCommandType, runtime?: SchedulerLoopRuntimeVO): Promise<void> {
    const reason = await askReason(commandTitle(commandType));
    if (!reason) return;
    if (commandType !== "START" && !runtime) {
        MessageUtils.warning("该命令需要选择一个有效的运行会话");
        return;
    }
    try {
        await SchedulerAdminApi.command(props.jobId, {
            command_type: commandType,
            target_runtime_id: runtime?.id,
            target_session_key: runtime?.session_key,
            expected_runtime_version: runtime?.version,
            idempotency_key: key(commandType.toLowerCase()),
            reason,
            deadline_at: commandType === "DRAIN_STOP" ? new Date(Date.now() + 60_000).toISOString() : undefined
        });
        MessageUtils.success("控制命令已持久化，等待循环控制器应用");
        await load();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "控制命令提交失败");
    }
}

function date(value: string | null): string {
    return value ? formatDateTime(value) : "—";
}
function active(runtime: SchedulerLoopRuntimeVO): boolean {
    return ["STARTING", "RUNNING", "DEGRADED", "DRAINING"].includes(runtime.status);
}
function tag(value: SchedulerRuntimeStatus): "success" | "warning" | "danger" | "info" {
    if (value === "RUNNING") return "success";
    if (value === "DEGRADED" || value === "DRAINING" || value === "STARTING") return "warning";
    if (value === "CRASHED" || value === "UNKNOWN") return "danger";
    return "info";
}
function runtimeStatusLabel(value: SchedulerRuntimeStatus): string {
    return runtimeStatusLabels[value] ?? value;
}
function errorStatusLabel(value: SchedulerLoopErrorStatus): string {
    return errorStatusLabels[value] ?? value;
}

onMounted(() => void load());
</script>

<template>
    <div v-loading="loading" class="loop-runtime-panel">
        <div class="panel-toolbar">
            <el-button type="primary" @click="command('START')">启动</el-button>
            <el-alert
                class="panel-tip"
                type="info"
                :closable="false"
                title="正常周期只更新会话计数；错误按指纹聚合并限流日志。重启、强停和强制回收由后端 DEV_OPS 边界控制。" />
        </div>
        <el-table :data="runtimes" border stripe empty-text="暂无运行会话">
            <el-table-column label="实例" prop="instance_id" min-width="150" show-overflow-tooltip />
            <el-table-column label="会话" prop="session_key" min-width="230" show-overflow-tooltip />
            <el-table-column label="状态" width="100" align="center">
                <template #default="scope">
                    <el-tag :type="tag(scope.row.status)" size="small">
                        {{ runtimeStatusLabel(scope.row.status) }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column label="心跳/租约" min-width="175">
                <template #default="scope">
                    {{ date(scope.row.last_heartbeat_at) }}
                    <br />
                    {{ date(scope.row.lease_expires_at) }}
                </template>
            </el-table-column>
            <el-table-column label="周期/处理/失败" width="135" align="center">
                <template #default="scope">
                    {{ scope.row.total_cycles }} / {{ scope.row.total_processed }} / {{ scope.row.total_failed }}
                </template>
            </el-table-column>
            <el-table-column label="版本" width="70" prop="version" align="center" />
            <el-table-column label="控制" min-width="230" fixed="right">
                <template #default="scope">
                    <el-button v-if="active(scope.row)" link type="warning" @click="command('DRAIN_STOP', scope.row)">
                        排空停止
                    </el-button>
                    <el-button v-if="active(scope.row)" link type="primary" @click="command('RESTART', scope.row)">
                        重启
                    </el-button>
                    <el-button v-if="active(scope.row)" link type="danger" @click="command('FORCE_STOP', scope.row)">
                        强制停止
                    </el-button>
                    <el-button
                        v-if="scope.row.status === 'CRASHED' || scope.row.status === 'UNKNOWN'"
                        link
                        type="danger"
                        @click="command('FORCE_RECLAIM', scope.row)">
                        强制回收
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-divider content-position="left">错误聚合</el-divider>
        <el-table :data="errors" border stripe empty-text="暂无循环错误">
            <el-table-column label="错误码" prop="error_code" width="180" />
            <el-table-column label="错误信息" prop="error_message" min-width="250" show-overflow-tooltip />
            <el-table-column label="首次/最近" min-width="175">
                <template #default="scope">
                    {{ date(scope.row.first_seen_at) }}
                    <br />
                    {{ date(scope.row.last_seen_at) }}
                </template>
            </el-table-column>
            <el-table-column label="次数/抑制" width="110" align="center">
                <template #default="scope">
                    {{ scope.row.occurrence_count }} / {{ scope.row.suppressed_count }}
                </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
                <template #default="scope">
                    {{ errorStatusLabel(scope.row.status) }}
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<style scoped lang="scss">
.loop-runtime-panel {
    display: grid;
    gap: 12px;
    max-height: 70vh;
    overflow: auto;
}
.panel-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
}
.panel-tip {
    flex: 1;
}
</style>
