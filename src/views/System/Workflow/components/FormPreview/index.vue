<script setup lang="ts">
import formCreate from "@form-create/element-ui";
import { ElMessage } from "element-plus";
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { FormApi } from "@/api/workflow/form-api.ts";

const route = useRoute();
const router = useRouter();

// 表单名称
const formName = ref("");
// 表单规则
const rule = ref([]);
// 表单配置
const options = ref({ submitBtn: false, resetBtn: false });
// 加载状态
const loading = ref(false);

/**
 * 返回列表
 */
const handleBack = () => {
    router.push({ path: "/system/workflow" });
};

/**
 * 加载指定版本的表单数据
 */
const loadVersionData = async (id: string, version: number) => {
    loading.value = true;
    try {
        const detail = await FormApi.getVersion(id, version);
        formName.value = detail.form_definition_id ? `V${version}` : "";
        if (detail.rule_json) {
            rule.value = JSON.parse(detail.rule_json);
        }
        if (detail.options_json) {
            const parsedOptions = JSON.parse(detail.options_json);
            options.value = {
                ...parsedOptions,
                submitBtn: false,
                resetBtn: false
            };
        }
        // 尝试获取表单名称
        if (detail.form_definition_id) {
            try {
                const formDetail = await FormApi.getById(detail.form_definition_id);
                formName.value = formDetail.name || "";
            } catch {
                // 忽略，使用默认名称
            }
        }
    } catch (error) {
        console.error("加载版本数据失败:", error);
        ElMessage.error("加载版本数据失败");
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    const id = route.query.id as string | undefined;
    const version = route.query.version ? Number(route.query.version) : undefined;
    if (id && version) {
        loadVersionData(id, version);
    }
});
</script>

<template>
    <div class="form-preview">
        <!-- 顶部栏 -->
        <div class="form-preview__header">
            <el-button link type="primary" @click="handleBack">← 返回</el-button>
            <span class="form-preview__title">{{ formName || "表单预览" }}</span>
        </div>
        <!-- 表单内容 -->
        <div v-loading="loading" class="form-preview__content">
            <form-create v-if="rule.length" :rule="rule" :option="options" />
            <el-empty v-else-if="!loading" description="暂无表单内容" />
        </div>
    </div>
</template>

<style scoped lang="scss">
.form-preview {
    height: 100%;
    display: flex;
    flex-direction: column;

    &__header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--el-border-color-lighter);
        background: #fff;
    }

    &__title {
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);
    }

    &__content {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        background: #fff;
    }
}
</style>
