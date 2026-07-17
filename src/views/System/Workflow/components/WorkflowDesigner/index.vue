<script setup lang="ts">
import LogicFlow from "@logicflow/core";
import "@logicflow/core/dist/index.css";
import { Control, SelectionSelect } from "@logicflow/extension";
import "@logicflow/extension/dist/index.css";
import Flowable from "@yangxj96/logicflow-plugin-flowable";
import "@yangxj96/logicflow-plugin-flowable/dist/index.css";
import { ElMessage } from "element-plus";
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { WorkflowApi } from "@/api/workflow/workflow-api.ts";

const route = useRoute();
const router = useRouter();

const container = useTemplateRef<HTMLDivElement>("container");
const graph = useTemplateRef<HTMLDivElement>("graph");
const panel = useTemplateRef<HTMLDivElement>("panel");

const logicFlow = ref<LogicFlow | null>(null);
const loading = ref(false);
const deploying = ref(false);

// 从 route query 获取编辑信息
const definitionId = computed(() => route.query.id as string | undefined);
const definitionKey = computed(() => route.query.key as string | undefined);
const isEditMode = computed(() => !!definitionId.value);

const pageTitle = computed(() => (isEditMode.value ? "编辑流程" : "新增流程"));

/**
 * 初始化 LogicFlow 实例
 */
const initLogicFlow = () => {
    if (!container.value) return;

    logicFlow.value = new LogicFlow({
        container: container.value!,
        grid: true,
        plugins: [Control, SelectionSelect, Flowable.Plugin],
        pluginsOptions: {
            selectionSelect: {
                exclusiveMode: false
            },
            flowable: {
                panel: {
                    dnd: graph.value!,
                    property: panel.value!
                }
            }
        }
    });

    // 添加导出按钮（调试用）
    (logicFlow.value.extension.control as Control)?.addItem({
        key: "export",
        title: "",
        text: "导出",
        iconClass: "export",
        onClick: lf => {
            const xml = Flowable.toBpmnXml(lf);
            console.log("[WorkflowDesigner] BPMN XML:", xml);
        }
    });

    logicFlow.value.render({});
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
    if (!logicFlow.value || deploying.value) return;

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
        <!-- 顶部工具栏 -->
        <div class="toolbar">
            <el-button @click="handleBack">← 返回</el-button>
            <span class="title">{{ pageTitle }}</span>
            <div class="actions">
                <el-button type="primary" :loading="deploying" :disabled="loading" @click="handleDeploy">
                    {{ isEditMode.value ? "更新部署" : "部署" }}
                </el-button>
            </div>
        </div>

        <!-- 设计器主体 -->
        <div v-loading="loading" class="designer-body">
            <el-row style="height: 100%">
                <el-col :span="4" class="col">
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
    </div>
</template>

<style scoped lang="scss">
.workflow-designer {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.toolbar {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    border-bottom: 1px solid #e4e7ed;
    background-color: #fff;
    gap: 16px;

    .title {
        font-size: 16px;
        font-weight: 600;
        flex: 1;
    }

    .actions {
        display: flex;
        gap: 8px;
    }
}

.designer-body {
    flex: 1;
    overflow: hidden;
}
</style>
