<script setup lang="ts">
import { computed, onMounted, reactive, ref, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";

import { AuthorizationApi } from "@/api/auth/authorization-api.ts";
import { DepartmentApi } from "@/api/user/department-api.ts";
import DictTag from "@/components/DictTag/index.vue";
import { deptConverter } from "@/converter/dept-converter.ts";
import { flattenDepartmentTree } from "@/utils/authorization-boundary.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

import DeptRestructureDepartmentForm from "../components/DeptRestructureDepartmentForm.vue";
import DeptRestructurePreview from "../components/DeptRestructurePreview.vue";
import DeptRestructureWizardShell from "../components/DeptRestructureWizardShell.vue";

interface DepartmentFormExpose {
    validate: () => Promise<boolean>;
}

const router = useRouter();
const departmentTree = ref<DepartmentTreeVO[]>([]);
const sourceIds = ref<string[]>([]);
const form = reactive(deptConverter.createForm());
const preview = ref<DepartmentRestructurePreview>();
const previewRequest = ref<DepartmentMergePreviewRequest>();
const pageLoading = ref(false);
const submitting = ref(false);
const activeStep = ref(0);
const departmentForm = useTemplateRef<DepartmentFormExpose>("departmentForm");

const departments = computed(() => flattenDepartmentTree(departmentTree.value));
const departmentById = computed(() => new Map(departments.value.map(department => [department.id, department])));
const sourceDepartments = computed(() =>
    sourceIds.value
        .map(id => departmentById.value.get(id))
        .filter((department): department is DepartmentTreeVO => !!department)
);
const commonParentId = computed(() => sourceDepartments.value[0]?.pid);
const commonParentName = computed(() => {
    const parentId = commonParentId.value;
    return parentId ? departmentById.value.get(parentId)?.name || "上级部门" : "根部门";
});
const sourceNames = computed(() => sourceDepartments.value.map(department => department.name).join("、"));
const steps = computed(() => [
    { key: "0", title: "选择源部门", description: "选择至少两个同级部门", complete: activeStep.value > 0 },
    {
        key: "1",
        title: "新部门资料",
        description: "填写合并后的部门信息",
        disabled: sourceDepartments.value.length < 2,
        complete: activeStep.value > 1
    },
    {
        key: "2",
        title: "预览并确认",
        description: "核对组织与授权影响",
        disabled: !preview.value
    }
]);
const guideTitle = computed(() => ["选择部门提示", "新部门资料提示", "合并影响提示"][activeStep.value] ?? "合并说明");

watch(sourceIds, clearPreview, { deep: true });
watch(form, clearPreview, { deep: true });

function clearPreview(): void {
    preview.value = undefined;
    previewRequest.value = undefined;
}

function haveSameParent(items: DepartmentTreeVO[]): boolean {
    const firstParent = items[0]?.pid ?? "";
    return items.length > 0 && items.every(item => (item.pid ?? "") === firstParent);
}

async function load(): Promise<void> {
    pageLoading.value = true;
    try {
        departmentTree.value = (await DepartmentApi.tree()) ?? [];
    } catch (error: unknown) {
        MessageUtils.error(error);
    } finally {
        pageLoading.value = false;
    }
}

function canSelectForMerge(row: DepartmentTreeVO): boolean {
    return (
        sourceIds.value.includes(row.id) ||
        sourceDepartments.value.length === 0 ||
        (row.pid ?? "") === (commonParentId.value ?? "")
    );
}

function handleSelectionChange(rows: DepartmentTreeVO[]): void {
    sourceIds.value = rows.map(row => row.id);
}

function handleStepSelect(key: string): void {
    const targetStep = Number(key);
    if (targetStep === 0) {
        activeStep.value = 0;
        return;
    }
    if (targetStep === 1) {
        if (sourceDepartments.value.length < 2) {
            MessageUtils.warning("请先选择至少两个同级部门");
            return;
        }
        activeStep.value = 1;
        return;
    }
    if (targetStep === 2 && preview.value) activeStep.value = 2;
}

function handleNextFromSources(): void {
    if (sourceDepartments.value.length < 2 || !haveSameParent(sourceDepartments.value)) {
        MessageUtils.warning("请先选择至少两个同级部门");
        return;
    }
    activeStep.value = 1;
}

function makeRequest(expectedOrganizationVersion: number): DepartmentMergePreviewRequest {
    if (form.type === undefined) throw new Error("请选择部门类型");
    return {
        source_department_ids: [...sourceIds.value].sort(),
        department: {
            name: form.name.trim(),
            type: form.type,
            region_id: form.region_id,
            sort: form.sort,
            remark: form.remark.trim() || undefined
        },
        expected_organization_version: expectedOrganizationVersion
    };
}

async function handlePreview(): Promise<void> {
    if (sourceDepartments.value.length < 2 || !haveSameParent(sourceDepartments.value)) {
        MessageUtils.warning("请先选择至少两个同级部门");
        activeStep.value = 0;
        return;
    }
    if (!(await departmentForm.value?.validate())) return;

    submitting.value = true;
    try {
        const expectedOrganizationVersion = await AuthorizationApi.organizationVersion();
        const request = makeRequest(expectedOrganizationVersion);
        preview.value = await AuthorizationApi.previewDepartmentMerge(request);
        previewRequest.value = request;
        activeStep.value = 2;
    } catch (error: unknown) {
        clearPreview();
        MessageUtils.error(error);
    } finally {
        submitting.value = false;
    }
}

async function handleApply(): Promise<void> {
    if (!preview.value || !previewRequest.value) return;
    try {
        await MessageUtils.box.confirm(
            `将把 ${preview.value.source_department_count} 个源部门及其子部门、${preview.value.affected_user_count} 名成员迁入新部门，并逻辑删除源部门。确认提交？`,
            "确认部门合并"
        );
    } catch {
        return;
    }

    submitting.value = true;
    try {
        await AuthorizationApi.applyDepartmentMerge({
            ...previewRequest.value,
            expected_organization_version: preview.value.expected_organization_version,
            preview_token: preview.value.preview_token
        });
        MessageUtils.success("部门合并完成");
        await router.replace({ name: "SystemDept" });
    } catch (error: unknown) {
        clearPreview();
        MessageUtils.error(error);
        MessageUtils.info("预览已清除。请重新预览后再提交。");
    } finally {
        submitting.value = false;
    }
}

function handleBack(): void {
    void router.push({ name: "SystemDept" });
}

onMounted(load);
</script>

<template>
    <DeptRestructureWizardShell
        title="合并到新部门"
        subtitle="选择部门、填写资料并预览组织影响"
        :steps="steps"
        :active-step="activeStep"
        :guide-title="guideTitle"
        :guide-type="activeStep === 2 && preview?.expands_effective_authority ? 'warning' : 'info'"
        :loading="pageLoading"
        @step-select="handleStepSelect">
        <template #heading>
            <div v-if="activeStep === 0" class="step-title">
                <div>
                    <span>选择源部门</span>
                </div>
            </div>
            <div v-else-if="activeStep === 1" class="step-title">
                <div>
                    <span>填写新部门资料</span>
                </div>
            </div>
            <div v-else class="step-title">
                <div>
                    <span>预览并确认合并</span>
                </div>
            </div>
        </template>

        <div v-if="activeStep === 0" class="step-panel">
            <el-table
                :data="departments"
                row-key="id"
                border
                stripe
                max-height="calc(100vh - 400px)"
                @selection-change="handleSelectionChange">
                <el-table-column type="selection" width="48" reserve-selection :selectable="canSelectForMerge" />
                <el-table-column prop="name" label="部门名称" min-width="180" show-overflow-tooltip />
                <el-table-column label="上级部门" min-width="150" show-overflow-tooltip>
                    <template #default="scope">
                        {{ scope.row.pid ? departmentById.get(scope.row.pid)?.name || "上级部门" : "根部门" }}
                    </template>
                </el-table-column>
                <el-table-column label="部门类型" min-width="130">
                    <template #default="scope">
                        <DictTag v-model="scope.row.type" dict_code="sys_organization_type" />
                    </template>
                </el-table-column>
                <el-table-column prop="code" label="部门编码" min-width="220" show-overflow-tooltip />
            </el-table>
            <div class="selection-summary">
                <span>已选 {{ sourceDepartments.length }} 个部门</span>
                <span>共同父级：{{ commonParentName }}</span>
            </div>
        </div>

        <DeptRestructureDepartmentForm
            v-else-if="activeStep === 1"
            ref="departmentForm"
            v-model="form"
            :parent-name="commonParentName" />

        <DeptRestructurePreview v-else-if="preview" :preview="preview" />

        <template #guide>
            <template v-if="activeStep === 0">
                <p>在此选择需要合并的源部门。</p>
                <p>只能选择同一父级的部门，根部门也可以与其他根部门合并。</p>
                <p>源部门的下级部门会迁入新部门并保留层级，源部门将逻辑删除。</p>
            </template>
            <template v-else-if="activeStep === 1">
                <p>新部门创建在所选源部门的共同父级下，名称、行政区划和类型为必填项。</p>
                <p>修改源部门或表单资料后，需要重新生成影响预览。</p>
            </template>
            <template v-else>
                <p v-if="preview?.expands_effective_authority">
                    <strong>授权范围可能扩大：</strong>
                    {{ preview.effective_scope_change_summary }}
                </p>
                <p v-else-if="preview">
                    <strong>授权范围变化：</strong>
                    {{ preview.effective_scope_change_summary }}
                </p>
                <p>源部门将逻辑删除。{{ preview?.historical_data_summary }}</p>
                <p>
                    组织版本 {{ preview?.expected_organization_version }} → {{ preview?.after_organization_version }}；
                    预览有效期至 {{ preview?.expires_at }}。提交前系统会再次核对版本和预览令牌。
                </p>
            </template>
        </template>
        <template #summary>
            <div class="summary-card">
                <strong>合并摘要</strong>
                <span>源部门：{{ sourceDepartments.length }} 个</span>
                <span>共同父级：{{ commonParentName }}</span>
                <span class="source-names">{{ sourceNames || "尚未选择部门" }}</span>
            </div>
        </template>
        <template #actions>
            <el-button @click="handleBack">返回部门管理</el-button>
            <el-button v-if="activeStep === 1" @click="activeStep = 0">上一步</el-button>
            <el-button
                v-if="activeStep === 0"
                type="primary"
                :disabled="sourceDepartments.length < 2"
                @click="handleNextFromSources">
                下一步
            </el-button>
            <template v-else-if="activeStep === 1">
                <el-button type="primary" :loading="submitting" @click="handlePreview">预览影响</el-button>
            </template>
            <template v-else>
                <el-button @click="activeStep = 1">上一步</el-button>
                <el-button :loading="submitting" @click="handlePreview">重新预览</el-button>
                <el-button type="primary" :disabled="!preview" :loading="submitting" @click="handleApply">
                    确认合并
                </el-button>
            </template>
        </template>
    </DeptRestructureWizardShell>
</template>

<style scoped lang="scss">
.step-title {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.step-title > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.step-title span {
    color: var(--el-text-color-primary);
    font-size: 16px;
    font-weight: 600;
}

.step-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.selection-summary {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.summary-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 1.6;
}

.summary-card strong {
    color: var(--el-text-color-primary);
    font-size: 13px;
}

.source-names {
    overflow-wrap: anywhere;
}
</style>
