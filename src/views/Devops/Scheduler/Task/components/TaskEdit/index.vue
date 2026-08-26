<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";

import { SchedulerAdminApi } from "@/api/system/scheduler-api.ts";
import JsonEditor from "@/components/JsonEditor/index.vue";
import { MessageUtils } from "@/utils/message-utils.ts";

const props = defineProps<{
    modelValue: boolean;
    catalog: SchedulerCatalogVO[];
    job?: SchedulerJobVO;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
    saved: [];
}>();

const saving = ref(false);
const parameterValue = ref<JsonValue>({});
const policyValue = ref<JsonValue>({});
const form = reactive<SchedulerJobSaveParams>({
    job_key: "",
    name: "",
    description: "",
    schedule_kind: "CRON",
    cron_expression: "",
    fixed_delay_ms: null,
    initial_delay_ms: 0,
    misfire_policy: "SKIP",
    concurrency_policy: "FORBID",
    execution_policy: {},
    parameters: {},
    idempotency_key: "",
    reason: ""
});

const opsCatalog = computed(() => props.catalog.filter(item => item.job_type === "OPS"));
const selectedDescriptor = computed(() => props.catalog.find(item => item.job_key === form.job_key));
const parameterNames = computed(() => Object.keys(selectedDescriptor.value?.parameter_schema ?? {}));

watch(
    () => [props.modelValue, props.job] as const,
    ([visible]) => {
        if (visible) resetForm();
    }
);

function resetForm(): void {
    const job = props.job;
    Object.assign(
        form,
        job
            ? {
                  job_key: job.job_key,
                  name: job.name,
                  description: job.description ?? "",
                  schedule_kind: job.schedule_kind,
                  cron_expression: job.cron_expression,
                  fixed_delay_ms: job.fixed_delay_ms,
                  initial_delay_ms: job.initial_delay_ms ?? 0,
                  misfire_policy: job.misfire_policy,
                  concurrency_policy: job.concurrency_policy,
                  execution_policy: job.execution_policy ?? {},
                  parameters: job.parameters ?? {},
                  version: job.version,
                  idempotency_key: "",
                  reason: ""
              }
            : {
                  job_key: opsCatalog.value[0]?.job_key ?? "",
                  name: opsCatalog.value[0]?.name ?? "",
                  description: "",
                  schedule_kind: opsCatalog.value[0]?.schedule_kind ?? "CRON",
                  cron_expression: opsCatalog.value[0]?.schedule_kind === "CRON" ? "0 0 1 * * *" : null,
                  fixed_delay_ms: opsCatalog.value[0]?.schedule_kind === "FIXED_DELAY" ? 60000 : null,
                  initial_delay_ms: 0,
                  misfire_policy: "SKIP",
                  concurrency_policy: "FORBID",
                  execution_policy: opsCatalog.value[0]?.execution_policy ?? {},
                  parameters: {},
                  idempotency_key: "",
                  reason: ""
              }
    );
    parameterValue.value = (form.parameters ?? {}) as JsonObject;
    policyValue.value = (form.execution_policy ?? {}) as JsonObject;
}

function onJobKeyChange(): void {
    const descriptor = selectedDescriptor.value;
    if (!props.job && descriptor) {
        form.name = descriptor.name;
        form.schedule_kind = descriptor.schedule_kind;
        form.cron_expression = descriptor.schedule_kind === "CRON" ? "0 0 1 * * *" : null;
        form.fixed_delay_ms = descriptor.schedule_kind === "FIXED_DELAY" ? 60000 : null;
        form.execution_policy = descriptor.execution_policy;
        policyValue.value = descriptor.execution_policy;
        parameterValue.value = {};
    }
}

function operationKey(): string {
    return `definition:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

async function save(): Promise<void> {
    if (!form.job_key || !form.name || !selectedDescriptor.value) {
        MessageUtils.error("请选择已注册的运维任务处理器并填写任务名称");
        return;
    }
    try {
        if (!isJsonObject(parameterValue.value) || !isJsonObject(policyValue.value)) {
            throw new Error("JSON 必须是对象");
        }
        const parameters: Record<string, unknown> = parameterValue.value;
        const executionPolicy: Record<string, unknown> = policyValue.value;
        const result = await MessageUtils.box.prompt("请输入本次配置变更原因。", props.job ? "修改任务" : "创建任务", {
            inputPlaceholder: "例如：新增合同提醒任务",
            inputValidator: value => (value?.trim() ? true : "配置变更原因不能为空")
        });
        const body: SchedulerJobSaveParams = {
            ...form,
            parameters,
            execution_policy: executionPolicy,
            idempotency_key: operationKey(),
            reason: result.value.trim()
        };
        saving.value = true;
        if (props.job) await SchedulerAdminApi.updateJob(props.job.id, body);
        else await SchedulerAdminApi.createJob(body);
        MessageUtils.success("调度任务已保存");
        emit("update:modelValue", false);
        emit("saved");
    } catch (error) {
        if (error instanceof SyntaxError) MessageUtils.error("参数或调度策略不是有效 JSON");
        else if (error instanceof Error && error.message) MessageUtils.error(error.message);
    } finally {
        saving.value = false;
    }
}

function isJsonObject(value: JsonValue): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
</script>

<template>
    <el-drawer
        :model-value="modelValue"
        :title="job ? '修改运维任务' : '新增运维任务'"
        direction="rtl"
        size="620px"
        destroy-on-close
        @update:model-value="emit('update:modelValue', $event)">
        <el-form class="task-edit-form" label-width="110px">
            <el-form-item label="注册处理器" required>
                <el-select
                    v-model="form.job_key"
                    filterable
                    :disabled="Boolean(job)"
                    style="width: 100%"
                    @change="onJobKeyChange">
                    <el-option
                        v-for="item in opsCatalog"
                        :key="item.job_key"
                        :label="`${item.name} (${item.job_key})`"
                        :value="item.job_key" />
                </el-select>
            </el-form-item>
            <el-form-item label="任务名称" required><el-input v-model="form.name" maxlength="200" /></el-form-item>
            <el-form-item label="调度类型">
                <el-tag>{{ form.schedule_kind }}</el-tag>
                <span class="hint">由注册处理器决定</span>
            </el-form-item>
            <el-form-item v-if="form.schedule_kind === 'CRON'" label="Cron 表达式" required>
                <el-input v-model="form.cron_expression" placeholder="Spring Cron 六段表达式" />
            </el-form-item>
            <el-form-item v-if="form.schedule_kind === 'FIXED_DELAY'" label="固定延迟(ms)" required>
                <el-input-number
                    v-model="form.fixed_delay_ms"
                    class="form-control"
                    :min="1"
                    :step="1000"
                    placeholder="请输入固定延迟" />
            </el-form-item>
            <el-form-item label="初始延迟(ms)">
                <el-input-number
                    v-model="form.initial_delay_ms"
                    class="form-control"
                    :min="0"
                    :step="1000"
                    placeholder="请输入初始延迟" />
            </el-form-item>
            <el-form-item label="错过策略">
                <el-select v-model="form.misfire_policy" class="form-control" placeholder="请选择错过策略">
                    <el-option label="跳过" value="SKIP" />
                    <el-option label="执行一次" value="FIRE_ONCE" />
                    <el-option label="限制追赶" value="CATCH_UP_LIMITED" />
                </el-select>
            </el-form-item>
            <el-form-item label="并发策略">
                <el-select v-model="form.concurrency_policy" class="form-control" placeholder="请选择并发策略">
                    <el-option label="禁止重叠" value="FORBID" />
                    <el-option label="允许并发" value="ALLOW" />
                    <el-option label="替换" value="REPLACE" />
                </el-select>
            </el-form-item>
            <el-form-item label="执行策略">
                <div class="json-editor-field">
                    <div class="json-editor">
                        <JsonEditor v-model="policyValue" />
                    </div>
                    <span class="hint json-editor-hint">只允许超时、租约、重试和心跳等白名单策略。</span>
                </div>
            </el-form-item>
            <el-form-item label="任务参数">
                <div class="json-editor-field">
                    <div class="json-editor">
                        <JsonEditor v-model="parameterValue" />
                    </div>
                    <span class="hint json-editor-hint">
                        仅允许注册表声明的参数键：{{
                            parameterNames.length ? parameterNames.join("、") : "当前处理器没有可配置参数"
                        }}
                    </span>
                </div>
            </el-form-item>
            <el-form-item label="描述">
                <el-input v-model="form.description" type="textarea" :rows="3" maxlength="2000" />
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="emit('update:modelValue', false)">取消</el-button>
            <el-button type="primary" :loading="saving" @click="save">保存</el-button>
        </template>
    </el-drawer>
</template>

<style scoped lang="scss">
.task-edit-form :deep(.el-form-item) {
    margin-bottom: 14px;
}

.hint {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

:deep(.form-control) {
    width: 100%;
}

.json-editor {
    width: 100%;
    height: auto;
}

.json-editor :deep(.jsoneditor) {
    height: auto;
}

.json-editor-field {
    width: 100%;
}

.json-editor-hint {
    display: block;
    margin-top: 6px;
    line-height: 1.4;
}
</style>
