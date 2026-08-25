<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { DocumentApi } from "@/api/oa/document-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import OaListPage from "@/views/OA/components/OaListPage/index.vue";

const loading = ref(false);
const rows = ref<DocumentVO[]>([]);
const folders = ref<DocumentFolderVO[]>([]);
const pagination = reactive({ page_num: 1, page_size: 15, total: 0 });
const query = reactive<DocumentPageParams>({ page_num: 1, page_size: 15, keyword: "", status: "", folder_id: "" });
const historyDialog = reactive({ visible: false, document: undefined as DocumentVO | undefined, loading: false });
const versionHistory = ref<DocumentVersionVO[]>([]);
const router = useRouter();

async function loadFolders() {
    folders.value = (await DocumentApi.folders()) || [];
}
async function load() {
    loading.value = true;
    try {
        const result = await DocumentApi.page(query);
        rows.value = result.records || [];
        pagination.total = result.total || 0;
    } finally {
        loading.value = false;
    }
}
function openCreate() {
    router.push({ name: "OADocumentEdit", query: { folder_id: query.folder_id || undefined } });
}
function openEdit(row: DocumentVO) {
    router.push({ name: "OADocumentEdit", query: { id: row.id } });
}
async function openHistory(row: DocumentVO) {
    historyDialog.visible = true;
    historyDialog.document = row;
    historyDialog.loading = true;
    try {
        versionHistory.value = (await DocumentApi.versions(row.id)) || [];
    } finally {
        historyDialog.loading = false;
    }
}
async function restoreVersion(version: DocumentVersionVO) {
    if (!historyDialog.document || version.current) return;
    await ElMessageBox.confirm(`确认将文档恢复到 V${version.version_no} 吗？`, "版本恢复确认", { type: "warning" });
    await DocumentApi.restoreVersion(historyDialog.document.id, version.id);
    ElMessage.success("已恢复为当前版本");
    await openHistory(historyDialog.document);
    await load();
}
async function publish(row: DocumentVO) {
    await DocumentApi.publish(row.id);
    MessageUtils.success("文档已发布");
    await load();
}
async function archive(row: DocumentVO) {
    await DocumentApi.archive(row.id);
    MessageUtils.success("文档已归档");
    await load();
}
function pageChange(page: number) {
    query.page_num = page;
    load();
}
onMounted(async () => {
    await loadFolders();
    await load();
});
</script>

<template>
    <OaListPage>
        <template #search>
            <el-form :inline="true" @submit.prevent="load">
                <el-form-item label="关键词">
                    <el-input v-model="query.keyword" clearable placeholder="标题" @keyup.enter="load" />
                </el-form-item>
                <el-form-item label="目录">
                    <el-select
                        v-model="query.folder_id"
                        clearable
                        placeholder="全部目录"
                        style="width: 160px"
                        @change="load">
                        <el-option v-for="item in folders" :key="item.id" :label="item.name" :value="item.id" />
                    </el-select>
                </el-form-item>
                <el-form-item label="状态">
                    <el-select
                        v-model="query.status"
                        clearable
                        placeholder="全部状态"
                        style="width: 160px"
                        @change="load">
                        <el-option label="草稿" value="DRAFT" />
                        <el-option label="已发布" value="PUBLISHED" />
                        <el-option label="已归档" value="ARCHIVED" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="load">查询</el-button>
                    <el-button v-permission="'oa:document:create'" @click="openCreate">新建文档</el-button>
                    <el-button
                        v-permission="'oa:document:create'"
                        @click="
                            router.push({
                                name: 'OADocumentFolderCreate',
                                query: { pid: query.folder_id || undefined }
                            })
                        ">
                        新建目录
                    </el-button>
                </el-form-item>
            </el-form>
        </template>
        <el-table v-loading="loading" :data="rows" stripe>
            <el-table-column align="center" prop="title" label="标题" min-width="220" show-overflow-tooltip />
            <el-table-column align="center" prop="status" label="状态" width="100">
                <template #default="scope">
                    <el-tag :type="scope.row.status === 'PUBLISHED' ? 'success' : 'info'">
                        {{
                            scope.row.status === "PUBLISHED"
                                ? "已发布"
                                : scope.row.status === "ARCHIVED"
                                  ? "已归档"
                                  : "草稿"
                        }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" prop="visibility" label="可见范围" width="120" />
            <el-table-column align="center" label="当前版本" width="120">
                <template #default="scope">
                    {{ scope.row.current_version ? `V${scope.row.current_version.version_no}` : "未上传" }}
                </template>
            </el-table-column>
            <el-table-column align="center" prop="updated_at" label="更新时间" width="190" />
            <el-table-column align="center" label="操作" width="270" fixed="right">
                <template #default="scope">
                    <el-button v-permission="'oa:document:update'" link type="primary" @click="openEdit(scope.row)">
                        编辑
                    </el-button>
                    <el-button v-permission="'oa:document:read'" link type="primary" @click="openHistory(scope.row)">
                        版本历史
                    </el-button>
                    <el-button
                        v-if="scope.row.status !== 'PUBLISHED'"
                        v-permission="'oa:document:update'"
                        link
                        type="success"
                        @click="publish(scope.row)">
                        发布
                    </el-button>
                    <el-button
                        v-if="scope.row.status === 'PUBLISHED'"
                        v-permission="'oa:document:update'"
                        link
                        type="warning"
                        @click="archive(scope.row)">
                        归档
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
        <el-dialog v-model="historyDialog.visible" title="版本历史" width="720px">
            <el-table v-loading="historyDialog.loading" :data="versionHistory" border stripe>
                <el-table-column prop="version_no" label="版本" width="90">
                    <template #default="scope">V{{ scope.row.version_no }}</template>
                </el-table-column>
                <el-table-column prop="file_name" label="文件名" min-width="180" show-overflow-tooltip />
                <el-table-column prop="version_note" label="版本说明" min-width="180" show-overflow-tooltip />
                <el-table-column prop="created_at" label="上传时间" width="190" />
                <el-table-column label="状态/操作" width="150" fixed="right">
                    <template #default="scope">
                        <el-tag v-if="scope.row.current" type="success">当前版本</el-tag>
                        <el-button
                            v-else
                            v-permission="'oa:document:update'"
                            link
                            type="warning"
                            @click="restoreVersion(scope.row)">
                            恢复为当前
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-dialog>
    </OaListPage>
</template>

<style scoped lang="scss">
.pager {
    justify-content: flex-end;
}
</style>
