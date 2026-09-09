<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";

import { QuartzSchedulerApi } from "@/api/system/scheduler-api.ts";
import JsonEditor from "@/components/JsonEditor/index.vue";
import { MessageUtils } from "@/utils/message-utils.ts";

const props = defineProps<{
    modelValue: boolean;
    catalog: QuartzJobTypeVO[];
    job?: QuartzJobVO;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
    saved: [];
}>();

interface QuartzJobForm {
    display_name: string;
    type_key: string;
    parameters_json: string;
    trigger: QuartzTriggerParams;
}

const saving = ref(false);
const parameterValue = ref<JsonValue>({});
const form = reactive<QuartzJobForm>({
    display_name: "",
    type_key: "",
    parameters_json: "",
    trigger: defaultTrigger("CRON")
});

const selectedType = computed(() => props.catalog.find(item => item.type_key === form.type_key));
const parameterFields = computed(() => Object.entries(selectedType.value?.parameter_fields ?? {}));

watch(
    () => [props.modelValue, props.job, props.catalog] as const,
    ([visible]) => {
        if (visible) resetForm();
    },
    { deep: false }
);

function defaultTrigger(type: QuartzTriggerType): QuartzTriggerParams {
    return type === "CRON"
        ? {
              trigger_type: "CRON",
              cron_expression: "0 0 1 * * ?",
              time_zone: "UTC",
              start_at: null,
              interval_ms: null,
              one_shot: false,
              misfire_instruction: "DO_NOTHING"
          }
        : {
              trigger_type: "SIMPLE",
              cron_expression: null,
              time_zone: null,
              start_at: null,
              interval_ms: 60_000,
              one_shot: false,
              misfire_instruction: "NEXT_WITH_REMAINING_COUNT"
          };
}

function defaultParameters(type: QuartzJobTypeVO | undefined): JsonObject {
    return { version: type?.parameter_version ?? "1" };
}

function resetForm(): void {
    const job = props.job;
    if (job) {
        form.display_name = job.display_name;
        form.type_key = job.type_key;
        form.parameters_json = job.parameters_json;
        form.trigger = job.trigger
            ? {
                  trigger_type: job.trigger.trigger_type,
                  cron_expression: job.trigger.cron_expression,
                  time_zone: job.trigger.time_zone,
                  start_at: job.trigger.start_at,
                  interval_ms: job.trigger.interval_ms,
                  one_shot: job.trigger.one_shot,
                  misfire_instruction: job.trigger.misfire_instruction
              }
            : defaultTrigger("CRON");
        try {
            parameterValue.value = JSON.parse(job.parameters_json) as JsonValue;
        } catch {
            parameterValue.value = defaultParameters(selectedType.value);
        }
        return;
    }

    const type = props.catalog[0];
    form.display_name = type?.display_name ?? "";
    form.type_key = type?.type_key ?? "";
    form.parameters_json = JSON.stringify(defaultParameters(type));
    form.trigger = defaultTrigger(type?.supported_trigger_types[0] ?? "CRON");
    parameterValue.value = defaultParameters(type);
}

function onTypeChange(): void {
    const type = selectedType.value;
    if (!type || props.job) return;
    parameterValue.value = defaultParameters(type);
    form.trigger = defaultTrigger(type.supported_trigger_types[0] ?? "CRON");
}

function onTriggerTypeChange(): void {
    form.trigger = defaultTrigger(form.trigger.trigger_type);
}

function isJsonObject(value: JsonValue): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parameterHint(): string {
    if (!selectedType.value) return "请先选择代码白名单中的任务类型";
    if (!parameterFields.value.length) return `当前类型只需要 version=${selectedType.value.parameter_version}`;
    return parameterFields.value
        .map(([name, definition]) => `${name}${definition.required ? "（必填）" : ""}`)
        .join("、");
}

function buildTrigger(): QuartzTriggerParams {
    const trigger = form.trigger;
    return {
        trigger_type: trigger.trigger_type,
        cron_expression: trigger.trigger_type === "CRON" ? trigger.cron_expression?.trim() || null : null,
        time_zone: trigger.trigger_type === "CRON" ? trigger.time_zone?.trim() || null : null,
        start_at: trigger.start_at || null,
        interval_ms: trigger.trigger_type === "SIMPLE" && !trigger.one_shot ? trigger.interval_ms : null,
        one_shot: trigger.trigger_type === "SIMPLE" && Boolean(trigger.one_shot),
        misfire_instruction: trigger.misfire_instruction
    };
}

async function save(): Promise<void> {
    if (!form.display_name.trim() || !form.type_key || !selectedType.value) {
        MessageUtils.error("请选择代码白名单中的任务类型并填写名称");
        return;
    }
    if (!isJsonObject(parameterValue.value)) {
        MessageUtils.error("任务参数必须是 JSON 对象");
        return;
    }
    const parametersJson = JSON.stringify(parameterValue.value);
    if (!parametersJson) {
        MessageUtils.error("任务参数不能为空");
        return;
    }

    saving.value = true;
    try {
        const trigger = buildTrigger();
        if (props.job) {
            await QuartzSchedulerApi.updateJob(props.job.job_key, {
                display_name: form.display_name.trim(),
                parameters_json: parametersJson,
                trigger
            });
        } else {
            await QuartzSchedulerApi.createJob({
                display_name: form.display_name.trim(),
                type_key: form.type_key,
                parameters_json: parametersJson,
                trigger
            });
        }
        MessageUtils.success("定时任务已保存");
        emit("update:modelValue", false);
        emit("saved");
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "保存定时任务失败");
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <el-drawer
        :model-value="modelValue"
        :title="job ? '修改定时任务' : '新增定时任务'"
        direction="rtl"
        size="620px"
        destroy-on-close
        @update:model-value="emit('update:modelValue', $event)">
        <el-form class="task-edit-form" label-width="110px">
            <el-form-item label="任务类型" required>
                <el-select
                    v-model="form.type_key"
                    filterable
                    :disabled="Boolean(job)"
                    style="width: 100%"
                    @change="onTypeChange">
                    <el-option
                        v-for="item in catalog"
                        :key="item.type_key"
                        :label="`${item.display_name}（${item.type_key}）`"
                        :value="item.type_key" />
                </el-select>
            </el-form-item>
            <el-form-item label="任务名称" required>
                <el-input v-model="form.display_name" maxlength="120" />
            </el-form-item>
            <el-form-item label="参数版本">
                <el-tag>{{ selectedType?.parameter_version ?? "—" }}</el-tag>
                <span class="hint">必须与 JSON 根节点 version 一致</span>
            </el-form-item>
            <el-form-item label="参数 JSON">
                <div class="json-editor-field">
                    <div class="json-editor">
                        <JsonEditor v-model="parameterValue" />
                    </div>
                    <span class="hint json-editor-hint">
                        只允许白名单声明的字段；敏感字段由服务端拒绝。可用字段：{{ parameterHint() }}
                    </span>
                </div>
            </el-form-item>
            <el-form-item label="触发类型" required>
                <el-radio-group v-model="form.trigger.trigger_type" @change="onTriggerTypeChange">
                    <el-radio label="CRON">Cron</el-radio>
                    <el-radio label="SIMPLE">Simple</el-radio>
                </el-radio-group>
            </el-form-item>
            <el-form-item v-if="form.trigger.trigger_type === 'CRON'" label="Cron 表达式" required>
                <el-input v-model="form.trigger.cron_expression" placeholder="Quartz 六字段，例如 0 0 1 * * ?" />
            </el-form-item>
            <el-form-item v-if="form.trigger.trigger_type === 'CRON'" label="IANA 时区" required>
                <el-input v-model="form.trigger.time_zone" placeholder="例如 Asia/Shanghai；默认 UTC" />
            </el-form-item>
            <el-form-item v-if="form.trigger.trigger_type === 'SIMPLE'" label="执行方式" required>
                <el-radio-group v-model="form.trigger.one_shot">
                    <el-radio :label="true">一次性</el-radio>
                    <el-radio :label="false">固定间隔</el-radio>
                </el-radio-group>
            </el-form-item>
            <el-form-item
                v-if="form.trigger.trigger_type === 'SIMPLE' && !form.trigger.one_shot"
                label="间隔毫秒"
                required>
                <el-input-number
                    v-model="form.trigger.interval_ms"
                    class="form-control"
                    :min="1"
                    :step="1000"
                    controls-position="right" />
            </el-form-item>
            <el-form-item label="首次触发">
                <el-date-picker
                    v-model="form.trigger.start_at"
                    class="form-control"
                    type="datetime"
                    value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
                    placeholder="留空则立即进入调度"
                    clearable />
            </el-form-item>
            <el-form-item label="错过执行策略">
                <el-select v-model="form.trigger.misfire_instruction" class="form-control">
                    <el-option v-if="form.trigger.trigger_type === 'CRON'" label="跳过错过周期" value="DO_NOTHING" />
                    <el-option label="立即执行一次" value="FIRE_ONCE_NOW" />
                    <el-option label="跳到下个周期" value="NEXT_WITH_REMAINING_COUNT" />
                </el-select>
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
    line-height: 1.4;
}

:deep(.form-control) {
    width: 100%;
}

.json-editor-field {
    width: 100%;
}

.json-editor {
    width: 100%;
    min-height: 180px;
}

.json-editor :deep(.jsoneditor) {
    height: 180px;
}

.json-editor-hint {
    display: block;
    margin-top: 6px;
}
</style>
