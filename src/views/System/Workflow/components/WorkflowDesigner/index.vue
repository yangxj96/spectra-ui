<script setup lang="ts">
import LogicFlow from "@logicflow/core";
import { Control, SelectionSelect } from "@logicflow/extension";
import "@logicflow/extension/dist/index.css";
import Flowable, { type PickerRequestPayload, type PickerType } from "@yangxj96/logicflow-plugin-flowable";
import "@yangxj96/logicflow-plugin-flowable/style.css";
import { ElMessage } from "element-plus";
import { computed, onMounted, reactive, ref, shallowRef, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { WorkflowApi } from "@/api/workflow/workflow-api.ts";

import FormPickerDialog from "./components/pickers/FormPickerDialog.vue";
import GroupPickerDialog from "./components/pickers/GroupPickerDialog.vue";
import JavaClassPickerDialog from "./components/pickers/JavaClassPickerDialog.vue";
import ProcessPickerDialog from "./components/pickers/ProcessPickerDialog.vue";
import UserPickerDialog from "./components/pickers/UserPickerDialog.vue";

const route = useRoute();
const router = useRouter();

const container = useTemplateRef<HTMLDivElement>("container");
const graph = useTemplateRef<HTMLDivElement>("graph");
const panel = useTemplateRef<HTMLDivElement>("panel");

const logicFlow = shallowRef<LogicFlow | null>(null);
const loading = ref(false);
const deploying = ref(false);

// 从 route query 获取编辑信息
const definitionId = computed(() => route.query.id as string | undefined);
const definitionKey = computed(() => route.query.key as string | undefined);
const isEditMode = computed(() => !!definitionId.value);

const picker = reactive({
    visible: false,
    type: "" as PickerType | "",
    multiple: false,
    value: "",
    resolve: null as ((value: string, label?: string) => void) | null
});

const handlePickerConfirm = (value: string, label?: string) => {
    picker.resolve?.(value, label);
    picker.visible = false;
};

/**
 * 初始化 LogicFlow 实例
 */
const initLogicFlow = () => {
    if (!container.value) return;

    logicFlow.value = new LogicFlow({
        container: container.value!,
        grid: true,
        idGenerator: type => {
            const prefix = type === "bpmn:sequenceFlow" ? "edge" : "node";
            return `${prefix}-${crypto.randomUUID()}`;
        },
        plugins: [Control, SelectionSelect, Flowable.Plugin],
        pluginsOptions: {
            selectionSelect: {
                exclusiveMode: false
            },
            flowable: {
                panel: {
                    dnd: graph.value!,
                    property: panel.value!
                },
                pickers: ["form", "user", "group", "javaClass", "process"]
            }
        }
    });

    const control = logicFlow.value.extension.control as Control | undefined;
    control?.addItem({
        key: "back",
        title: "返回流程列表",
        text: "返回",
        iconClass: "lf-control-back",
        onClick: () => {
            handleBack();
        }
    });
    control?.addItem({
        key: "deploy",
        title: isEditMode.value ? "更新部署流程" : "部署流程",
        text: isEditMode.value ? "更新部署" : "部署",
        iconClass: "lf-control-deploy",
        onClick: () => {
            void handleDeploy();
        }
    });

    logicFlow.value.render({});

    logicFlow.value.on("property:picker", (payload: PickerRequestPayload) => {
        console.log("[WorkflowDesigner] property:picker:", payload);
        picker.type = payload.pickerType;
        picker.multiple = payload.multiple;
        picker.value = payload.currentValue;
        picker.resolve = payload.resolve;
        picker.visible = true;
    });
};

/**
 * 加载流程定义的 BPMN XML（编辑模式）
 */
const loadBpmnXml = async (id: string) => {
    if (!logicFlow.value) return;

    loading.value = true;
    try {
        const result = await WorkflowApi.getProcessDefinitionBpmnXml(id);
        console.log(result);
        if (result?.bpmn_xml) {
            console.log(result.bpmn_xml);
            Flowable.fromBpmnXml(result.bpmn_xml, logicFlow.value);
        }
    } catch (error) {
        console.error("加载流程定义失败:", error);
        ElMessage.error("加载流程定义失败");
    } finally {
        loading.value = false;
    }
};

/**
 * 部署流程
 */
const handleDeploy = async () => {
    if (!logicFlow.value || loading.value || deploying.value) return;

    deploying.value = true;
    try {
        const bpmnXml = Flowable.toBpmnXml(logicFlow.value);
        const result = await WorkflowApi.deployProcess({
            bpmn_xml: bpmnXml,
            key: definitionKey.value
        });

        ElMessage.success(`流程部署成功（版本 ${result.version}）`);
        router.push({ path: "/system/workflow", query: { tab: "workflow" } });
    } catch (error) {
        console.error("部署失败:", error);
        ElMessage.error("部署失败");
    } finally {
        deploying.value = false;
    }
};

/**
 * 返回列表
 */
const handleBack = () => {
    router.push({ path: "/system/workflow", query: { tab: "workflow" } });
};

onMounted(() => {
    initLogicFlow();

    // 编辑模式：加载已有流程定义
    if (isEditMode.value && definitionId.value) {
        loadBpmnXml(definitionId.value);
    }
});
</script>

<template>
    <div class="workflow-designer">
        <!-- 设计器主体 -->
        <div v-loading="loading" class="designer-body">
            <el-row style="height: 100%">
                <el-col :span="4" class="col" style="height: 100%">
                    <div ref="graph" style="height: 100%; width: 100%" />
                </el-col>
                <el-col :span="14" style="height: 100%">
                    <div ref="container" style="height: 100%; width: 100%" />
                </el-col>
                <el-col :span="6" style="height: 100%">
                    <div ref="panel" style="height: 100%; width: 100%" />
                </el-col>
            </el-row>
        </div>

        <!-- Picker 弹框 -->
        <FormPickerDialog
            v-if="picker.type === 'form'"
            v-model:visible="picker.visible"
            :multiple="picker.multiple"
            :model-value="picker.value"
            @confirm="handlePickerConfirm" />
        <UserPickerDialog
            v-else-if="picker.type === 'user'"
            v-model:visible="picker.visible"
            :multiple="picker.multiple"
            :model-value="picker.value"
            @confirm="handlePickerConfirm" />
        <GroupPickerDialog
            v-else-if="picker.type === 'group'"
            v-model:visible="picker.visible"
            :multiple="picker.multiple"
            :model-value="picker.value"
            @confirm="handlePickerConfirm" />
        <JavaClassPickerDialog
            v-else-if="picker.type === 'javaClass'"
            v-model:visible="picker.visible"
            :model-value="picker.value"
            @confirm="handlePickerConfirm" />
        <ProcessPickerDialog
            v-else-if="picker.type === 'process'"
            v-model:visible="picker.visible"
            :model-value="picker.value"
            @confirm="handlePickerConfirm" />
    </div>
</template>

<style scoped lang="scss">
.workflow-designer {
    display: flex;
    flex-direction: column;
    height: 100%;
}

:deep(.lf-control-back),
:deep(.lf-control-deploy) {
    background-position: center;
    background-repeat: no-repeat;
    background-size: 22px 22px;
}

:deep(.lf-control-back) {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23606666' d='M22 10H7.83l5.59-5.59L12 3l-9 9 9 9 1.41-1.41L7.83 14H22v-4z'/%3E%3C/svg%3E");
}

:deep(.lf-control-deploy) {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23606666' d='M3 21h18v-3H3v3zM11 3v9H7l5 5 5-5h-4V3h-2z'/%3E%3C/svg%3E");
}

.designer-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}
</style>
