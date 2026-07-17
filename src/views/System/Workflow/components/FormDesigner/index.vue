<script setup lang="ts">
import { type Config } from "@form-create/designer";
import { ElMessage } from "element-plus";
import { defineAsyncComponent, onMounted, ref, useTemplateRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { FormApi } from "@/api/workflow/form-api.ts";

const FcDesigner = defineAsyncComponent({
    loader: () => import("@form-create/designer"),
    delay: 200,
    timeout: 30000
});

const route = useRoute();
const router = useRouter();
const designer = useTemplateRef<InstanceType<typeof FcDesigner>>("designer");

// 表单定义ID
const definitionId = ref<string | undefined>(undefined);

// 配置
const config: Config = {
    switchType: false,
    showSaveBtn: true,
    showPreviewBtn: false,
    showDevice: false,
    showJsonPreview: false,
    showLanguage: false
};

/**
 * 保存
 */
const handleSave = (data: { rule: string; options: string }) => {
    // 从 options 中提取表单名称
    let formName = "";
    try {
        const options = JSON.parse(data.options);
        formName = options.formName || "";
    } catch {
        // 忽略解析错误
    }

    if (!formName.trim()) {
        ElMessage.warning("请先在右侧设置中填写表单名称");
        return;
    }

    const ruleJson = data.rule;
    const optionsJson = data.options;
    const formJson = JSON.stringify(designer.value?.getJson());

    if (definitionId.value) {
        // 编辑模式：保存新版本
        saveVersion(ruleJson, optionsJson, formJson);
    } else {
        // 新增模式：创建表单
        createForm(formName, ruleJson, optionsJson, formJson);
    }
};

/**
 * 保存新版本（编辑模式）
 */
const saveVersion = async (ruleJson: string, optionsJson: string, formJson: string) => {
    try {
        await FormApi.saveVersion(definitionId.value!, {
            rule_json: ruleJson,
            options_json: optionsJson,
            form_json: formJson
        });
        ElMessage.success("保存成功");
        router.push({ path: "/system/workflow" });
    } catch (error) {
        console.error("保存失败:", error);
        ElMessage.error("保存失败");
    }
};

/**
 * 创建表单（新增模式）
 */
const createForm = async (name: string, ruleJson: string, optionsJson: string, formJson: string) => {
    try {
        await FormApi.create({
            name,
            rule_json: ruleJson,
            options_json: optionsJson,
            form_json: formJson
        });

        ElMessage.success("创建成功");
        router.push({ path: "/system/workflow" });
    } catch (error) {
        console.error("创建失败:", error);
        ElMessage.error("创建失败");
    }
};

/**
 * 加载当前版本表单数据（编辑模式）
 */
const loadFormData = async (id: string) => {
    try {
        const detail = await FormApi.getById(id);
        if (detail && designer.value) {
            if (detail.rule_json) {
                designer.value.setRule(JSON.parse(detail.rule_json));
            }
            if (detail.options_json) {
                designer.value.setOptions(JSON.parse(detail.options_json));
            }
        }
    } catch (error) {
        console.error("加载表单数据失败:", error);
        ElMessage.error("加载表单数据失败");
    }
};

onMounted(() => {
    const id = route.query.id as string | undefined;
    if (id) {
        definitionId.value = id;
    }
});

// 等待设计器就绪后加载数据
watch(
    designer,
    newDesigner => {
        if (newDesigner && definitionId.value) {
            loadFormData(definitionId.value);
        }
    },
    { once: true }
);
</script>

<template>
    <el-row style="width: 100%; height: 85vh">
        <FcDesigner ref="designer" class="designer" :config="config" @save="handleSave" />
    </el-row>
</template>

<style scoped lang="scss">
.designer {
    width: 100%;
    height: 100%;
}

:deep(.el-aside ._fc-l-menu) {
    display: none !important;
}
</style>
