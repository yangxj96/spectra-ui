<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";

import { DocumentApi } from "@/api/oa/document-api.ts";
import FileUpload from "@/components/FileUpload/index.vue";
import { MessageUtils } from "@/utils/message-utils.ts";

const loading = ref(false);
const rows = ref<DocumentVO[]>([]);
const folders = ref<DocumentFolderVO[]>([]);
const pagination = reactive({ page_num: 1, page_size: 15, total: 0 });
const query = reactive<DocumentPageParams>({ page_num: 1, page_size: 15, keyword: "", status: "", folder_id: "" });
const editor = reactive({ visible: false, id: "", title: "", summary: "", visibility: "DEPARTMENT", folder_id: "" });
const versionDialog = reactive({
    visible: false,
    document: undefined as DocumentVO | undefined,
    file_id: "",
    file_url: "",
    version_note: ""
});
const folderDialog = reactive({ visible: false, name: "", sort: 0 });
const historyDialog = reactive({ visible: false, document: undefined as DocumentVO | undefined, loading: false });
const versionHistory = ref<DocumentVersionVO[]>([]);

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
    Object.assign(editor, {
        visible: true,
        id: "",
        title: "",
        summary: "",
        visibility: "DEPARTMENT",
        folder_id: query.folder_id || ""
    });
}
function openEdit(row: DocumentVO) {
    Object.assign(editor, {
        visible: true,
        id: row.id,
        title: row.title,
        summary: row.summary || "",
        visibility: row.visibility,
        folder_id: row.folder_id || ""
    });
}
async function saveDocument() {
    const payload: DocumentSaveParams = {
        title: editor.title,
        summary: editor.summary,
        visibility: editor.visibility,
        folder_id: editor.folder_id || undefined
    };
    if (editor.id) await DocumentApi.update(editor.id, payload);
    else await DocumentApi.create(payload);
    editor.visible = false;
    MessageUtils.success("保存成功");
    await load();
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
async function createFolder() {
    await DocumentApi.createFolder({ name: folderDialog.name, sort: folderDialog.sort });
    folderDialog.visible = false;
    folderDialog.name = "";
    await loadFolders();
    MessageUtils.success("目录已创建");
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
    <div class="oa-page">
        <el-card shadow="never">
            <el-form :inline="true" @submit.prevent="load">
                <el-form-item label="关键词">
                    <el-input v-model="query.keyword" clearable placeholder="标题" @keyup.enter="load" />
                </el-form-item>
                <el-form-item label="目录">
                    <el-select v-model="query.folder_id" clearable placeholder="全部目录" @change="load">
                        <el-option v-for="item in folders" :key="item.id" :label="item.name" :value="item.id" />
                    </el-select>
                </el-form-item>
                <el-form-item label="状态">
                    <el-select v-model="query.status" clearable placeholder="全部状态" @change="load">
                        <el-option label="草稿" value="DRAFT" />
                        <el-option label="已发布" value="PUBLISHED" />
                        <el-option label="已归档" value="ARCHIVED" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="load">查询</el-button>
                    <el-button v-owner="'OA_DOCUMENT:INSERT'" @click="openCreate">新建文档</el-button>
                    <el-button v-owner="'OA_DOCUMENT:INSERT'" @click="folderDialog.visible = true">新建目录</el-button>
                </el-form-item>
            </el-form>
        </el-card>
        <el-card class="oa-body" shadow="never">
            <el-table v-loading="loading" :data="rows" border stripe height="100%">
                <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
                <el-table-column prop="status" label="状态" width="100">
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
                <el-table-column prop="visibility" label="可见范围" width="120" />
                <el-table-column label="当前版本" width="120">
                    <template #default="scope">
                        {{ scope.row.current_version ? `V${scope.row.current_version.version_no}` : "未上传" }}
                    </template>
                </el-table-column>
                <el-table-column prop="updated_at" label="更新时间" width="190" />
                <el-table-column label="操作" width="270" fixed="right">
                    <template #default="scope">
                        <el-button v-owner="'OA_DOCUMENT:UPDATE'" link type="primary" @click="openEdit(scope.row)">
                            编辑
                        </el-button>
                        <el-button v-owner="'OA_DOCUMENT:UPDATE'" link type="primary" @click="openVersion(scope.row)">
                            上传版本
                        </el-button>
                        <el-button v-owner="'OA_DOCUMENT:QUERY'" link type="primary" @click="openHistory(scope.row)">
                            版本历史
                        </el-button>
                        <el-button
                            v-if="scope.row.status !== 'PUBLISHED'"
                            v-owner="'OA_DOCUMENT:UPDATE'"
                            link
                            type="success"
                            @click="publish(scope.row)">
                            发布
                        </el-button>
                        <el-button
                            v-if="scope.row.status === 'PUBLISHED'"
                            v-owner="'OA_DOCUMENT:UPDATE'"
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
        </el-card>
    </div>
    <el-dialog v-model="editor.visible" :title="editor.id ? '编辑文档' : '新建文档'" width="520px">
        <el-form label-width="90px">
            <el-form-item label="标题"><el-input v-model="editor.title" /></el-form-item>
            <el-form-item label="目录">
                <el-select v-model="editor.folder_id" clearable>
                    <el-option v-for="item in folders" :key="item.id" :label="item.name" :value="item.id" />
                </el-select>
            </el-form-item>
            <el-form-item label="可见范围">
                <el-select v-model="editor.visibility">
                    <el-option label="部门" value="DEPARTMENT" />
                    <el-option label="公开" value="PUBLIC" />
                    <el-option label="私有" value="PRIVATE" />
                </el-select>
            </el-form-item>
            <el-form-item label="摘要"><el-input v-model="editor.summary" type="textarea" :rows="3" /></el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="editor.visible = false">取消</el-button>
            <el-button type="primary" @click="saveDocument">保存</el-button>
        </template>
    </el-dialog>
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
    <el-dialog v-model="folderDialog.visible" title="新建目录" width="420px">
        <el-form label-width="80px">
            <el-form-item label="名称"><el-input v-model="folderDialog.name" /></el-form-item>
            <el-form-item label="排序"><el-input-number v-model="folderDialog.sort" :min="0" /></el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="folderDialog.visible = false">取消</el-button>
            <el-button type="primary" @click="createFolder">保存</el-button>
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
                        v-owner="'OA_DOCUMENT:UPDATE'"
                        link
                        type="warning"
                        @click="restoreVersion(scope.row)">
                        恢复为当前
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
    </el-dialog>
</template>

<style scoped lang="scss">
.oa-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    height: 100%;
}
.oa-body {
    flex: 1;
    min-height: 0;
}
.pager {
    margin-top: 12px;
    justify-content: flex-end;
}
.uploaded {
    margin-left: 8px;
    color: var(--el-color-success);
}
</style>
