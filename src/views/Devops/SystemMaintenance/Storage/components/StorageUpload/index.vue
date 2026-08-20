<script setup lang="ts">
import { ref } from "vue";

import { FileUploadApi } from "@/api/common/file-upload-api.ts";
import { getToken } from "@/plugin/request/auth.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

import type { UploadFile, UploadFiles } from "element-plus";

const emit = defineEmits<{
    /** 关闭事件 */
    close: [];
    /** 上传成功事件 */
    success: [];
}>();

// API 基础地址
const BASE_URL = import.meta.env.VITE_API_URL;

// 上传状态
const uploading = ref(false);
const fileList = ref<UploadFile[]>([]);

// 跟踪正在分片上传的文件 UID
const chunkUploadFiles = new Set<number>();

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// 文件选择变化
const handleFileChange = (file: UploadFile, files: UploadFiles) => {
    fileList.value = files;
};

// 移除文件
const handleRemove = (file: UploadFile) => {
    const index = fileList.value.findIndex(f => f.uid === file.uid);
    if (index > -1) {
        fileList.value.splice(index, 1);
    }
};

// 计算文件 hash (SHA-256)
const calculateHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

// 使用 XMLHttpRequest 上传（带进度）
const uploadWithProgress = (url: string, formData: FormData, file: UploadFile): Promise<void> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // 监听上传进度
        xhr.upload.addEventListener("progress", e => {
            if (e.lengthComputable) {
                // 分片上传时，进度由外部控制
                if (!chunkUploadFiles.has(file.uid)) {
                    file.percentage = Math.round((e.loaded / e.total) * 100);
                }
            }
        });

        // 上传完成
        xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
            }
        });

        // 上传失败
        xhr.addEventListener("error", () => {
            reject(new Error("Upload failed"));
        });

        // 构建完整URL，避免双斜杠
        const fullUrl = `${BASE_URL.replace(/\/$/, "")}${url}`;

        // 发送请求
        xhr.open("POST", fullUrl);
        xhr.withCredentials = true;

        // 添加认证头
        const token = getToken();
        if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }

        xhr.send(formData);
    });
};

// 小文件直接上传
const uploadSingle = async (file: UploadFile, hash: string, uploadId: string): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file.raw!);
    formData.append("hash", hash);
    formData.append("uploadId", uploadId);

    await uploadWithProgress("/api/file/upload/uploadSingle", formData, file);
};

// 分片上传
const uploadChunked = async (file: UploadFile, hash: string, uploadId: string, chunkSize: number): Promise<void> => {
    const rawFile = file.raw!;
    const totalChunks = Math.ceil(rawFile.size / chunkSize);

    // 标记为分片上传，进度由外部控制
    chunkUploadFiles.add(file.uid);

    for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, rawFile.size);
        const chunk = rawFile.slice(start, end);

        const formData = new FormData();
        formData.append("file", chunk);
        formData.append("uploadId", uploadId);
        formData.append("fileName", file.name);
        formData.append("hash", hash);
        formData.append("count", totalChunks.toString());
        formData.append("index", (i + 1).toString());

        await uploadWithProgress("/api/file/upload/uploadChunk", formData, file);

        // 更新进度
        file.percentage = Math.round(((i + 1) / totalChunks) * 100);
    }

    // 合并分片
    await FileUploadApi.merge(uploadId);

    // 清理标记
    chunkUploadFiles.delete(file.uid);
};

// 上传单个文件（完整流程）
const uploadFile = async (file: UploadFile): Promise<void> => {
    const rawFile = file.raw!;

    // 1. 计算 hash
    file.percentage = 0;
    const hash = await calculateHash(rawFile);

    // 2. 调用预处理接口
    const preResult = await FileUploadApi.pre({
        filename: file.name,
        size: file.size,
        hash: hash
    });

    // 3. 判断是否秒传
    if (preResult.exists) {
        file.percentage = 100;
        file.status = "success";
        return;
    }

    // 4. 判断是否需要分片
    if (!preResult.multipart) {
        // 小文件直接上传
        await uploadSingle(file, hash, preResult.upload_id);
    } else {
        // 分片上传
        await uploadChunked(file, hash, preResult.upload_id, preResult.chunk_size);
    }
};

// 开始上传
const handleUpload = async () => {
    if (fileList.value.length === 0) {
        MessageUtils.warning("请先选择文件");
        return;
    }
    uploading.value = true;

    let successCount = 0;
    let failCount = 0;

    // 逐个文件上传
    for (const file of fileList.value) {
        file.status = "uploading";
        file.percentage = 0;

        try {
            await uploadFile(file);
            file.status = "success";
            file.percentage = 100;
            successCount++;
        } catch (error) {
            file.status = "fail";
            failCount++;
            console.error(`文件 ${file.name} 上传失败:`, error);
        }
    }

    uploading.value = false;

    if (failCount === 0) {
        MessageUtils.success(`上传完成，共 ${successCount} 个文件`);
        fileList.value = [];
        emit("success");
    } else {
        MessageUtils.warning(`上传完成：${successCount} 成功，${failCount} 失败`);
    }
};

// 关闭
const handleClose = () => {
    fileList.value = [];
    emit("close");
};
</script>

<template>
    <el-dialog title="上传文件" width="660px" :model-value="true" :close-on-click-modal="false" @close="handleClose">
        <!-- 上传按钮 -->
        <el-upload multiple :auto-upload="false" :show-file-list="false" :on-change="handleFileChange">
            <el-button type="primary">选择文件</el-button>
            <template #tip>
                <div class="el-upload__tip">支持任意文件，可同时选择多个文件</div>
            </template>
        </el-upload>
        <!-- 文件列表表格 -->
        <el-table :data="fileList" border stripe max-height="250" style="margin-top: 16px" empty-text="暂无文件">
            <el-table-column prop="name" label="文件名" min-width="200" show-overflow-tooltip />
            <el-table-column label="大小" width="100">
                <template #default="scope">
                    {{ formatFileSize(scope.row.size) }}
                </template>
            </el-table-column>
            <el-table-column label="进度" width="200">
                <template #default="scope">
                    <el-progress
                        :percentage="scope.row.percentage || 0"
                        :status="
                            scope.row.status === 'success'
                                ? 'success'
                                : scope.row.status === 'fail'
                                  ? 'exception'
                                  : undefined
                        " />
                </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
                <template #default="scope">
                    <el-button link type="danger" size="small" @click="handleRemove(scope.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>
        <template #footer>
            <el-button @click="handleClose">取消</el-button>
            <el-button type="primary" :loading="uploading" @click="handleUpload">
                {{ uploading ? "上传中..." : "开始上传" }}
            </el-button>
        </template>
    </el-dialog>
</template>
