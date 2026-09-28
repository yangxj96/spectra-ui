<script setup lang="ts">
import { computed, onMounted, reactive, ref, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";

import { AuthorizationApi } from "@/api/auth/authorization-api.ts";
import { DepartmentApi } from "@/api/user/department-api.ts";
import { deptConverter } from "@/converter/dept-converter.ts";
import { flattenDepartmentTree } from "@/utils/authorization-boundary.ts";
import { treeDefaultProps } from "@/utils/default-config.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

import DeptRestructureDepartmentForm from "../components/DeptRestructureDepartmentForm.vue";
import DeptRestructurePreview from "../components/DeptRestructurePreview.vue";
import DeptRestructureWizardShell from "../components/DeptRestructureWizardShell.vue";

interface DepartmentFormExpose {
    validate: () => Promise<boolean>;
}

const router = useRouter();
const sourceDepartmentId = ref("");
const departmentTree = ref<DepartmentTreeVO[]>([]);
const form = reactive(deptConverter.createForm());
const preview = ref<DepartmentRestructurePreview>();
const previewRequest = ref<DepartmentSplitPreviewRequest>();
const candidatePage = ref<PageResult<DepartmentMemberCandidate>>({
    records: [],
    total: 0,
    size: 20,
    current: 1,
    pages: 0
});
const activeStep = ref(0);
const pageLoading = ref(false);
const listLoading = ref(false);
const submitting = ref(false);
const pageNum = ref(1);
const pageSize = ref(20);
const keyword = ref("");
const selectedCandidates = reactive(new Map<string, DepartmentMemberCandidate>());
const selectedUserIds = computed(() => [...selectedCandidates.keys()].sort());
const departmentForm = useTemplateRef<DepartmentFormExpose>("departmentForm");
let candidateRequestId = 0;

const departments = computed(() => flattenDepartmentTree(departmentTree.value));
const departmentById = computed(() => new Map(departments.value.map(department => [department.id, department])));
const sourceDepartment = computed(() => departmentById.value.get(sourceDepartmentId.value));
const sourceParentName = computed(() => {
    const parentId = sourceDepartment.value?.pid;
    if (!parentId) return "根部门";
    return departmentById.value.get(parentId)?.name || "上级部门";
});
const steps = computed(() => [
    { key: "0", title: "选择源部门", description: "选择需要拆分的部门", complete: activeStep.value > 0 },
    {
        key: "1",
        title: "选择直属成员",
        description: "选择需要迁移的成员",
        disabled: !sourceDepartment.value,
        complete: activeStep.value > 1
    },
    {
        key: "2",
        title: "新部门资料",
        description: "填写新同级部门信息",
        disabled: selectedUserIds.value.length === 0,
        complete: activeStep.value > 2
    },
    {
        key: "3",
        title: "预览并确认",
        description: "核对成员及数据范围影响",
        disabled: !preview.value
    }
]);
const guideTitle = computed(
    () => ["选择源部门提示", "选择成员提示", "新部门资料提示", "拆分影响提示"][activeStep.value] ?? "拆分说明"
);

watch(form, clearPreview, { deep: true });
watch(selectedUserIds, clearPreview);
watch(sourceDepartmentId, () => {
    candidateRequestId++;
    listLoading.value = false;
    selectedCandidates.clear();
    candidatePage.value = { records: [], total: 0, size: pageSize.value, current: 1, pages: 0 };
    pageNum.value = 1;
    keyword.value = "";
    clearPreview();
    if (sourceDepartment.value) void loadCandidates();
});

function clearPreview(): void {
    preview.value = undefined;
    previewRequest.value = undefined;
}

async function loadCandidates(): Promise<void> {
    const departmentId = sourceDepartment.value?.id;
    if (!departmentId) return;
    const requestId = ++candidateRequestId;
    listLoading.value = true;
    try {
        const result = await DepartmentApi.departmentMembers({
            departmentId,
            keyword: keyword.value.trim() || undefined,
            pageNum: pageNum.value,
            pageSize: pageSize.value
        });
        if (requestId === candidateRequestId) candidatePage.value = result;
    } catch (error: unknown) {
        if (requestId === candidateRequestId) MessageUtils.error(error);
    } finally {
        if (requestId === candidateRequestId) listLoading.value = false;
    }
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

function handleSelectionChange(rows: DepartmentMemberCandidate[]): void {
    const currentIds = new Set(candidatePage.value.records.map(row => row.id));
    for (const id of currentIds) {
        if (!rows.some(row => row.id === id)) selectedCandidates.delete(id);
    }
    for (const row of rows) selectedCandidates.set(row.id, row);
}

function handleSearch(): void {
    pageNum.value = 1;
    clearPreview();
    void loadCandidates();
}

function handlePageChange(nextPage: number): void {
    pageNum.value = nextPage;
    void loadCandidates();
}

function handlePageSizeChange(nextPageSize: number): void {
    pageSize.value = nextPageSize;
    pageNum.value = 1;
    void loadCandidates();
}

function handleStepSelect(key: string): void {
    const targetStep = Number(key);
    if (targetStep === 0) {
        activeStep.value = 0;
        return;
    }
    if (targetStep === 1) {
        if (!sourceDepartment.value) {
            MessageUtils.warning("请先选择一个源部门");
            return;
        }
        activeStep.value = 1;
        return;
    }
    if (targetStep === 2) {
        if (selectedUserIds.value.length === 0) {
            MessageUtils.warning("请至少选择一名直属成员");
            return;
        }
        activeStep.value = 2;
        return;
    }
    if (targetStep === 3 && preview.value) activeStep.value = 3;
}

function handleNextFromSource(): void {
    if (!sourceDepartment.value) {
        MessageUtils.warning("请先选择一个源部门");
        return;
    }
    activeStep.value = 1;
}

function handleNextFromMembers(): void {
    if (selectedUserIds.value.length === 0) {
        MessageUtils.warning("请至少选择一名直属成员");
        return;
    }
    activeStep.value = 2;
}

function makeRequest(expectedOrganizationVersion: number): DepartmentSplitPreviewRequest {
    if (!sourceDepartment.value) throw new Error("源部门不存在或已停用");
    if (form.type === undefined) throw new Error("请选择部门类型");
    return {
        source_department_id: sourceDepartment.value.id,
        user_ids: selectedUserIds.value,
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
    if (!sourceDepartment.value) {
        MessageUtils.warning("请先选择一个源部门");
        activeStep.value = 0;
        return;
    }
    if (selectedUserIds.value.length === 0) {
        MessageUtils.warning("请至少选择一名直属成员");
        activeStep.value = 1;
        return;
    }
    if (!(await departmentForm.value?.validate())) return;

    submitting.value = true;
    try {
        const expectedOrganizationVersion = await AuthorizationApi.organizationVersion();
        const request = makeRequest(expectedOrganizationVersion);
        preview.value = await AuthorizationApi.previewDepartmentSplit(request);
        previewRequest.value = request;
        activeStep.value = 3;
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
            `将把 ${preview.value.affected_user_count} 名所选直属成员迁入同级新部门。角色授权边界保持不变，但数据范围会按新部门重新计算。确认提交？`,
            "确认部分拆分"
        );
    } catch {
        return;
    }

    submitting.value = true;
    try {
        await AuthorizationApi.applyDepartmentSplit({
            ...previewRequest.value,
            expected_organization_version: preview.value.expected_organization_version,
            preview_token: preview.value.preview_token
        });
        MessageUtils.success("部门拆分完成");
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
        title="拆分直属成员到新部门"
        subtitle="选择源部门和成员、填写资料并预览范围变化"
        :steps="steps"
        :active-step="activeStep"
        :guide-title="guideTitle"
        :guide-type="activeStep === 3 && preview?.expands_effective_authority ? 'warning' : 'info'"
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
                    <span>选择直属成员</span>
                </div>
            </div>
            <div v-else-if="activeStep === 2" class="step-title">
                <div>
                    <span>填写新部门资料</span>
                </div>
            </div>
            <div v-else class="step-title">
                <div>
                    <span>预览并确认拆分</span>
                </div>
            </div>
        </template>

        <div v-if="activeStep === 0" class="step-panel source-step">
            <el-form label-position="top">
                <el-form-item label="源部门" required>
                    <el-tree-select
                        v-model="sourceDepartmentId"
                        :data="departmentTree"
                        :props="treeDefaultProps"
                        node-key="id"
                        check-strictly
                        default-expand-all
                        filterable
                        clearable
                        placeholder="请选择源部门" />
                </el-form-item>
            </el-form>
            <div v-if="sourceDepartment" class="source-summary">
                <span>源部门：{{ sourceDepartment.name }}</span>
                <span>同级父部门：{{ sourceParentName }}</span>
            </div>
        </div>

        <div v-else-if="activeStep === 1" class="step-panel">
            <div class="candidate-toolbar">
                <span>源部门：{{ sourceDepartment?.name }}</span>
                <el-input
                    v-model="keyword"
                    clearable
                    placeholder="按用户名或姓名搜索直属成员"
                    @keyup.enter="handleSearch" />
                <el-button :loading="listLoading" @click="handleSearch">查询成员</el-button>
            </div>
            <el-table
                :data="candidatePage.records"
                row-key="id"
                border
                max-height="calc(100vh - 480px)"
                v-loading="listLoading"
                @selection-change="handleSelectionChange">
                <el-table-column type="selection" width="48" reserve-selection />
                <el-table-column prop="username" label="用户名" min-width="130" />
                <el-table-column prop="real_name" label="姓名" min-width="120" />
                <el-table-column prop="status" label="账号状态" min-width="100" />
                <el-table-column label="部门关系" min-width="180">
                    <template #default="scope">
                        <el-tag v-if="scope.row.primary_member" size="small" type="success">主部门</el-tag>
                        <el-tag v-if="scope.row.associated_member" size="small" type="info">关联部门</el-tag>
                    </template>
                </el-table-column>
            </el-table>
            <div class="selection-summary">已选 {{ selectedUserIds.length }} 名直属成员</div>
            <el-pagination
                v-model:current-page="pageNum"
                v-model:page-size="pageSize"
                :total="candidatePage.total"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next"
                @current-change="handlePageChange"
                @size-change="handlePageSizeChange" />
        </div>

        <DeptRestructureDepartmentForm
            v-else-if="activeStep === 2"
            ref="departmentForm"
            v-model="form"
            :parent-name="sourceParentName" />

        <DeptRestructurePreview v-else-if="preview" :preview="preview" />

        <template #guide>
            <template v-if="activeStep === 0">
                <p>只能选择一个活动部门作为拆分来源。</p>
                <p>拆分只处理源部门的直属成员，不会自动选取下级部门成员。</p>
                <p>新部门会创建在源部门的同级位置。</p>
            </template>
            <template v-else-if="activeStep === 1">
                <p>成员列表只查询源部门的直属关系，不会扩展到下级部门。</p>
                <p>所选成员迁入新部门；源部门、未选成员及其下级部门保持不变。</p>
                <p>可以跨页和关键词搜索后继续选择，主部门与关联部门关系会分别标识。</p>
            </template>
            <template v-else-if="activeStep === 2">
                <p>新部门创建在源部门的同级位置，名称、行政区划和类型为必填项。</p>
                <p>选中成员的主/关联关系切换到新部门，角色权限边界保持原样。</p>
            </template>
            <template v-else>
                <p>请核对受影响成员、角色授权边界与新部门的数据范围。</p>
                <p v-if="preview?.expands_effective_authority">
                    <strong>数据范围可能扩大：</strong>
                    {{ preview.effective_scope_change_summary }}
                </p>
                <p v-else-if="preview">
                    <strong>数据范围变化：</strong>
                    {{ preview.effective_scope_change_summary }}
                </p>
                <p>角色授权边界保持原样。{{ preview?.historical_data_summary }}</p>
                <p>
                    组织版本 {{ preview?.expected_organization_version }} → {{ preview?.after_organization_version }}；
                    预览有效期至 {{ preview?.expires_at }}。提交前系统会再次核对版本和成员直属关系。
                </p>
            </template>
        </template>
        <template #summary>
            <div class="summary-card">
                <strong>拆分摘要</strong>
                <span>源部门：{{ sourceDepartment?.name || "未选择" }}</span>
                <span>同级父部门：{{ sourceParentName }}</span>
                <span>已选直属成员：{{ selectedUserIds.length }} 名</span>
            </div>
        </template>
        <template #actions>
            <el-button @click="handleBack">返回部门管理</el-button>
            <el-button
                v-if="activeStep === 0"
                type="primary"
                :disabled="!sourceDepartment"
                @click="handleNextFromSource">
                下一步
            </el-button>
            <template v-else-if="activeStep === 1">
                <el-button @click="activeStep = 0">上一步</el-button>
                <el-button type="primary" :disabled="selectedUserIds.length === 0" @click="handleNextFromMembers">
                    下一步
                </el-button>
            </template>
            <template v-else-if="activeStep === 2">
                <el-button @click="activeStep = 1">上一步</el-button>
                <el-button type="primary" :loading="submitting" @click="handlePreview">预览影响</el-button>
            </template>
            <template v-else>
                <el-button @click="activeStep = 2">上一步</el-button>
                <el-button :loading="submitting" @click="handlePreview">重新预览</el-button>
                <el-button type="primary" :disabled="!preview" :loading="submitting" @click="handleApply">
                    确认拆分
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
    gap: 12px;
}

.candidate-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--el-text-color-secondary);
}

.candidate-toolbar .el-input {
    width: min(360px, 45%);
}

.selection-summary {
    padding: 4px 0;
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

@media (max-width: 768px) {
    .candidate-toolbar {
        align-items: stretch;
        flex-direction: column;
    }

    .candidate-toolbar .el-input {
        width: 100%;
    }
}
</style>
