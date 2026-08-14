<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { ContractApi } from "@/api/oa/contract-api.ts";
import FileUpload from "@/components/FileUpload/index.vue";
import { MessageUtils } from "@/utils/message-utils.ts";
import OaListPage from "@/views/OA/components/OaListPage/index.vue";

const loading = ref(false);
const rows = ref<ContractVO[]>([]);
const pagination = reactive({ page_num: 1, page_size: 15, total: 0 });
const router = useRouter();
const query = reactive<ContractPageParams>({
    page_num: 1,
    page_size: 15,
    keyword: "",
    status: "",
    contract_type: "",
    signing_status: ""
});
const detail = reactive({ visible: false, data: undefined as ContractVO | undefined });
const versionDialog = reactive({
    visible: false,
    contract: undefined as ContractVO | undefined,
    file_id: "",
    file_url: "",
    version_note: ""
});

const statusLabels: Record<string, string> = {
    DRAFT: "草稿",
    ACTIVE: "生效中",
    EXPIRED: "已到期",
    TERMINATED: "已终止",
    ARCHIVED: "已归档"
};
const signingLabels: Record<string, string> = { UNSIGNED: "未签署", SIGNED: "已签署" };

async function load() {
    loading.value = true;
    try {
        const result = await ContractApi.page(query);
        rows.value = result.records || [];
        pagination.total = result.total || 0;
    } finally {
        loading.value = false;
    }
}

function openCreate() {
    router.push({ name: "OAContractEdit" });
}

function openEdit(row: ContractVO) {
    router.push({ name: "OAContractEdit", query: { id: row.id } });
}

async function openDetail(row: ContractVO) {
    detail.data = await ContractApi.get(row.id);
    detail.visible = true;
}

function openVersion(contract: ContractVO) {
    Object.assign(versionDialog, { visible: true, contract, file_id: "", file_url: "", version_note: "" });
}

async function saveVersion() {
    if (!versionDialog.contract || !versionDialog.file_id) return MessageUtils.warning("请先上传合同文件");
    await ContractApi.addVersion(versionDialog.contract.id, {
        file_id: versionDialog.file_id,
        version_note: versionDialog.version_note || undefined
    });
    versionDialog.visible = false;
    MessageUtils.success("合同版本已保存");
    await load();
    if (detail.visible && detail.data) await openDetail(detail.data);
}

function openMilestone(contract: ContractVO) {
    router.push({ name: "OAContractMilestoneCreate", query: { contract_id: contract.id } });
}

async function updateMilestone(contract: ContractVO, milestone: ContractMilestoneVO, status: string) {
    await ContractApi.updateMilestone(contract.id, milestone.id, { status, remark: milestone.remark });
    MessageUtils.success("履约节点状态已更新");
    await openDetail(contract);
}

async function sign(row: ContractVO) {
    await ContractApi.sign(row.id);
    MessageUtils.success("合同已标记签署");
    await load();
}

async function activate(row: ContractVO) {
    await ContractApi.activate(row.id);
    MessageUtils.success("合同已生效");
    await load();
}

async function terminate(row: ContractVO) {
    await ContractApi.terminate(row.id);
    MessageUtils.success("合同已终止");
    await load();
}
async function archive(row: ContractVO) {
    await ContractApi.archive(row.id);
    MessageUtils.success("合同已归档");
    await load();
}
async function runReminders() {
    const count = await ContractApi.runReminders();
    MessageUtils.success(`本次已发送 ${count || 0} 条履约提醒`);
}

async function remove(row: ContractVO) {
    await ContractApi.delete(row.id);
    MessageUtils.success("合同已删除");
    await load();
}

function pageChange(page: number) {
    query.page_num = page;
    load();
}

function tagType(status: string): "success" | "warning" | "danger" | "info" {
    if (status === "ACTIVE") return "success";
    if (status === "TERMINATED") return "danger";
    if (status === "EXPIRED") return "warning";
    return "info";
}

onMounted(load);
</script>

<template>
    <OaListPage>
        <template #search>
            <el-form :inline="true" @submit.prevent="load">
                <el-form-item label="关键词">
                    <el-input
                        v-model="query.keyword"
                        clearable
                        placeholder="合同编号、标题、相对方"
                        @keyup.enter="load" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-select
                        v-model="query.status"
                        clearable
                        placeholder="全部状态"
                        style="width: 160px"
                        @change="load">
                        <el-option label="草稿" value="DRAFT" />
                        <el-option label="生效中" value="ACTIVE" />
                        <el-option label="已到期" value="EXPIRED" />
                        <el-option label="已终止" value="TERMINATED" />
                        <el-option label="已归档" value="ARCHIVED" />
                    </el-select>
                </el-form-item>
                <el-form-item label="签署">
                    <el-select
                        v-model="query.signing_status"
                        clearable
                        placeholder="全部"
                        style="width: 160px"
                        @change="load">
                        <el-option label="未签署" value="UNSIGNED" />
                        <el-option label="已签署" value="SIGNED" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="load">查询</el-button>
                    <el-button v-permission="'oa:contract:create'" @click="openCreate">新建合同</el-button>
                    <el-button v-permission="'oa:contract:update'" @click="runReminders">执行履约提醒</el-button>
                </el-form-item>
            </el-form>
        </template>
        <el-table v-loading="loading" :data="rows" stripe>
            <el-table-column align="center" prop="contract_no" label="合同编号" width="180" />
            <el-table-column align="center" prop="title" label="合同标题" min-width="200" show-overflow-tooltip />
            <el-table-column align="center" prop="contract_type" label="类型" width="110" />
            <el-table-column
                align="center"
                prop="counterparty_name"
                label="相对方"
                min-width="160"
                show-overflow-tooltip />
            <el-table-column align="center" label="金额" width="130">
                <template #default="scope">{{ scope.row.amount }} {{ scope.row.currency }}</template>
            </el-table-column>
            <el-table-column align="center" label="状态" width="110">
                <template #default="scope">
                    <el-tag :type="tagType(scope.row.status)">
                        {{ statusLabels[scope.row.status] || scope.row.status }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" label="签署" width="100">
                <template #default="scope">
                    {{ signingLabels[scope.row.signing_status] || scope.row.signing_status }}
                </template>
            </el-table-column>
            <el-table-column align="center" prop="end_date" label="到期日期" width="120" />
            <el-table-column align="center" label="操作" width="350" fixed="right">
                <template #default="scope">
                    <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
                    <el-button
                        v-if="scope.row.status === 'DRAFT'"
                        v-permission="'oa:contract:update'"
                        link
                        type="primary"
                        @click="openEdit(scope.row)">
                        编辑
                    </el-button>
                    <el-button v-permission="'oa:contract:update'" link type="primary" @click="openVersion(scope.row)">
                        上传版本
                    </el-button>
                    <el-button
                        v-if="scope.row.status === 'DRAFT'"
                        v-permission="'oa:contract:update'"
                        link
                        type="warning"
                        @click="sign(scope.row)">
                        标记签署
                    </el-button>
                    <el-button
                        v-if="scope.row.signing_status === 'SIGNED' && scope.row.status === 'DRAFT'"
                        v-permission="'oa:contract:update'"
                        link
                        type="success"
                        @click="activate(scope.row)">
                        生效
                    </el-button>
                    <el-button
                        v-if="scope.row.status === 'ACTIVE'"
                        v-permission="'oa:contract:update'"
                        link
                        type="danger"
                        @click="terminate(scope.row)">
                        终止
                    </el-button>
                    <el-button
                        v-if="['ACTIVE', 'EXPIRED', 'TERMINATED'].includes(scope.row.status)"
                        v-permission="'oa:contract:update'"
                        link
                        type="warning"
                        @click="archive(scope.row)">
                        归档
                    </el-button>
                    <el-button
                        v-if="scope.row.status === 'DRAFT'"
                        v-permission="'oa:contract:delete'"
                        link
                        type="danger"
                        @click="remove(scope.row)">
                        删除
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination
            v-model:current-page="pagination.page_num"
            class="pager"
            layout="total, prev, pager, next"
            :page-size="pagination.page_size"
            :total="pagination.total"
            @current-change="pageChange" />

        <el-dialog v-model="versionDialog.visible" title="上传合同版本" width="520px">
            <el-form label-width="90px">
                <el-form-item label="合同文件">
                    <FileUpload
                        v-model="versionDialog.file_url"
                        :show-file-list="false"
                        @uploaded="versionDialog.file_id = $event.file_id" />
                    <span v-if="versionDialog.file_id" class="uploaded">已上传</span>
                </el-form-item>
                <el-form-item label="版本说明"><el-input v-model="versionDialog.version_note" /></el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="versionDialog.visible = false">取消</el-button>
                <el-button type="primary" @click="saveVersion">保存版本</el-button>
            </template>
        </el-dialog>

        <el-drawer v-model="detail.visible" title="合同详情" size="720px">
            <template v-if="detail.data">
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="合同编号">{{ detail.data.contract_no }}</el-descriptions-item>
                    <el-descriptions-item label="状态">
                        {{ statusLabels[detail.data.status] || detail.data.status }}
                    </el-descriptions-item>
                    <el-descriptions-item label="标题" :span="2">{{ detail.data.title }}</el-descriptions-item>
                    <el-descriptions-item label="相对方">{{ detail.data.counterparty_name }}</el-descriptions-item>
                    <el-descriptions-item label="金额">
                        {{ detail.data.amount }} {{ detail.data.currency }}
                    </el-descriptions-item>
                    <el-descriptions-item label="期限">
                        {{ detail.data.start_date || "-" }} 至 {{ detail.data.end_date || "-" }}
                    </el-descriptions-item>
                    <el-descriptions-item label="签署">
                        {{ signingLabels[detail.data.signing_status] || detail.data.signing_status }}
                    </el-descriptions-item>
                    <el-descriptions-item label="摘要" :span="2">{{ detail.data.summary || "-" }}</el-descriptions-item>
                </el-descriptions>
                <el-divider />
                <div class="section-title">
                    <span>文件版本</span>
                    <el-button v-permission="'oa:contract:update'" size="small" @click="openVersion(detail.data)">
                        上传版本
                    </el-button>
                </div>
                <el-table :data="detail.data.versions || []" border size="small">
                    <el-table-column label="版本" width="80">
                        <template #default="scope">V{{ scope.row.version_no }}</template>
                    </el-table-column>
                    <el-table-column prop="file_name" label="文件名" show-overflow-tooltip />
                    <el-table-column prop="version_note" label="说明" show-overflow-tooltip />
                    <el-table-column prop="created_at" label="上传时间" width="180" />
                </el-table>
                <el-divider />
                <div class="section-title">
                    <span>履约节点</span>
                    <el-button v-permission="'oa:contract:update'" size="small" @click="openMilestone(detail.data)">
                        新增节点
                    </el-button>
                </div>
                <el-table :data="detail.data.milestones || []" border size="small">
                    <el-table-column prop="name" label="节点" min-width="150" />
                    <el-table-column prop="milestone_type" label="类型" width="100" />
                    <el-table-column prop="due_date" label="到期日期" width="120" />
                    <el-table-column label="状态" width="120">
                        <template #default="scope">
                            <el-select
                                :model-value="scope.row.status"
                                size="small"
                                @change="updateMilestone(detail.data!, scope.row, $event)">
                                <el-option label="待办" value="PENDING" />
                                <el-option label="完成" value="DONE" />
                                <el-option label="跳过" value="SKIPPED" />
                            </el-select>
                        </template>
                    </el-table-column>
                </el-table>
            </template>
        </el-drawer>
    </OaListPage>
</template>

<style scoped lang="scss">
.pager {
    justify-content: flex-end;
}
.currency-select {
    width: 100px;
    margin-left: 8px;
}
.uploaded {
    margin-left: 8px;
    color: var(--el-color-success);
}
.section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-weight: 600;
}
</style>
