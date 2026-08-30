<script setup lang="ts">
import { onMounted, ref } from "vue";

import { useFileUpload } from "@/composables/use-file-upload";
import { FileUploadStore, type UploadResumeRecord } from "@/services/file-upload-store";
import { MessageUtils } from "@/utils/message-utils";

const fileInput = ref<HTMLInputElement>();
const selectedFile = ref<File>();
const pendingResume = ref<UploadResumeRecord>();
const resumeRecords = ref<UploadResumeRecord[]>([]);
const fileTypeCode = ref("PDF");

const { snapshot, start, resume, pause, resumeUpload, cancel } = useFileUpload({
    file_type_code: fileTypeCode.value,
    get_file_type_code: () => fileTypeCode.value
});

onMounted(async () => {
    resumeRecords.value = await new FileUploadStore().list();
});

function chooseFile(record?: UploadResumeRecord): void {
    pendingResume.value = record;
    fileInput.value?.click();
}

function handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    selectedFile.value = file;
    if (pendingResume.value) {
        void resumeSelected(file, pendingResume.value);
        pendingResume.value = undefined;
    }
}

async function resumeSelected(file: File, record: UploadResumeRecord): Promise<void> {
    try {
        await resume(file, record);
        await refreshRecords();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "恢复上传失败");
    }
}

async function startSelected(): Promise<void> {
    if (!selectedFile.value) {
        MessageUtils.warning("请先选择文件");
        return;
    }
    try {
        await start(selectedFile.value);
        await refreshRecords();
    } catch (error) {
        MessageUtils.error(error instanceof Error ? error.message : "上传失败");
    }
}

async function cancelUpload(): Promise<void> {
    await cancel();
    await refreshRecords();
}

async function refreshRecords(): Promise<void> {
    resumeRecords.value = await new FileUploadStore().list();
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / 1024 ** index).toFixed(2)} ${units[index]}`;
}
</script>

<template>
    <el-card class="upload-card">
        <template #header>
            <div class="card-header">
                <span>统一文件上传</span>
                <span class="hint">先分析完整 SHA-256，再创建上传任务</span>
            </div>
        </template>

        <input ref="fileInput" class="hidden-input" type="file" @change="handleFileChange" />
        <el-form label-width="100px">
            <el-form-item label="文件类型">
                <el-select v-model="fileTypeCode" style="width: 220px">
                    <el-option label="PDF 文档" value="PDF" />
                    <el-option label="JPEG 图片" value="JPEG" />
                    <el-option label="PNG 图片" value="PNG" />
                    <el-option label="Word 文档" value="DOCX" />
                    <el-option label="Excel 文档" value="XLSX" />
                    <el-option label="ZIP 压缩包" value="ZIP" />
                </el-select>
            </el-form-item>
            <el-form-item label="本地文件">
                <el-button @click="chooseFile()">选择文件</el-button>
                <span v-if="selectedFile" class="selected-file">
                    {{ selectedFile.name }}（{{ formatFileSize(selectedFile.size) }}）
                </span>
            </el-form-item>
            <el-form-item>
                <el-button
                    type="primary"
                    :disabled="
                        !selectedFile || ['ANALYZING', 'CREATING', 'UPLOADING', 'VERIFYING'].includes(snapshot.state)
                    "
                    @click="startSelected">
                    开始上传
                </el-button>
                <el-button v-if="snapshot.state === 'UPLOADING'" @click="pause">暂停</el-button>
                <el-button v-if="snapshot.state === 'UPLOADING' && snapshot.uploaded_bytes > 0" @click="resumeUpload">
                    继续
                </el-button>
                <el-button v-if="snapshot.state === 'UPLOADING'" type="danger" plain @click="cancelUpload">
                    取消
                </el-button>
            </el-form-item>
        </el-form>

        <div class="progress-group">
            <div>文件分析：{{ snapshot.analysis_progress }}%</div>
            <el-progress :percentage="snapshot.analysis_progress" />
            <div>分片上传：{{ snapshot.upload_progress }}%</div>
            <el-progress :percentage="snapshot.upload_progress" />
            <div>服务端最终复核：{{ snapshot.verification_progress }}%</div>
            <el-progress :percentage="snapshot.verification_progress" />
        </div>

        <el-alert
            v-if="snapshot.error_code"
            :title="`${snapshot.error_code}${snapshot.error_message ? `：${snapshot.error_message}` : ''}`"
            type="error"
            show-icon />
        <el-alert
            v-if="snapshot.state === 'READY'"
            title="文件已完成，可将 file_asset_id 提交给业务表单"
            type="success"
            show-icon />

        <div v-if="resumeRecords.length" class="resume-list">
            <div class="resume-title">可恢复的上传任务</div>
            <div v-for="record in resumeRecords" :key="record.key" class="resume-item">
                <span>{{ record.original_name }}（{{ formatFileSize(record.size) }}）</span>
                <el-button link type="primary" @click="chooseFile(record)">重新选择文件恢复</el-button>
            </div>
        </div>
    </el-card>
</template>

<style scoped lang="scss">
.upload-card {
    margin: 20px;
}

.card-header,
.resume-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.hint {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.hidden-input {
    display: none;
}

.selected-file {
    margin-left: 12px;
    color: var(--el-text-color-regular);
}

.progress-group {
    max-width: 760px;
    margin: 24px 0;
    line-height: 2;
}

.resume-list {
    max-width: 760px;
    margin-top: 28px;
}

.resume-title {
    margin-bottom: 8px;
    font-weight: 600;
}

.resume-item {
    padding: 8px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
}
</style>
