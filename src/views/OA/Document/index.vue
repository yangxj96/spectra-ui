<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { DocumentApi } from "@/api/oa/document-api.ts";
import FileUpload from "@/components/FileUpload/index.vue";
import { MessageUtils } from "@/utils/message-utils.ts";
import OaListPage from "@/views/OA/components/OaListPage/index.vue";

const loading = ref(false);
const rows = ref<DocumentVO[]>([]);
const folders = ref<DocumentFolderVO[]>([]);
const pagination = reactive({ page_num: 1, page_size: 15, total: 0 });
const query = reactive<DocumentPageParams>({ page_num: 1, page_size: 15, keyword: "", status: "", folder_id: "" });
const versionDialog = reactive({
    visible: false,
    document: undefined as DocumentVO | undefined,
    file_id: "",
    file_url: "",
    version_note: ""
});
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
function openVersion(row: DocumentVO) {
    Object.assign(versionDialog, { visible: true, document: row, file_id: "", file_url: "", version_note: "" });
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
async function saveVersion() {
    if (!versionDialog.document || !versionDialog.file_id) return MessageUtils.warning("请先上传文件");
    await DocumentApi.addVersion(versionDialog.document.id, {
        file_id: versionDialog.file_id,
        version_note: versionDialog.version_note || undefined
    });
    versionDialog.visible = false;
    MessageUtils.success("版本已保存");
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
                    <el-button v-permission="'oa:document:update'" link type="primary" @click="openVersion(scope.row)">
                        上传版本
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
        <el-dialog v-model="versionDialog.visible" title="上传文档版本" width="520px">
            <el-form label-width="90px">
                <el-form-item label="文件">
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
.uploaded {
    margin-left: 8px;
    color: var(--el-color-success);
}
</style>
