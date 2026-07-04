<script setup lang="ts">
import { ref } from "vue";

import { fileApi } from "@/api/system/file.ts";
import UseTable from "@/hooks/use-table.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

import FileUpload from "./components/FileUpload/index.vue";

// 查询条件
const condition = ref<FilePageParams>({
    page_num: 1,
    page_size: 15,
    original_name: "",
    storage_type: undefined
});

// table分页请求
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = UseTable<FileInfo>(
    fileApi.page,
    condition.value
);

// 上传对话框状态
const uploadVisible = ref(false);

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// 格式化文件类型
const formatContentType = (contentType: string): string => {
    const map: Record<string, string> = {
        // Office 文档
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPT",
        "application/msword": "Word",
        "application/vnd.ms-excel": "Excel",
        "application/vnd.ms-powerpoint": "PPT",
        // PDF
        "application/pdf": "PDF",
        // 图片
        "image/jpeg": "JPEG",
        "image/png": "PNG",
        "image/gif": "GIF",
        "image/svg+xml": "SVG",
        "image/webp": "WebP",
        // 文本
        "text/plain": "文本",
        "text/html": "HTML",
        "text/css": "CSS",
        "text/javascript": "JavaScript",
        "application/json": "JSON",
        "application/xml": "XML",
        // 压缩包
        "application/zip": "ZIP",
        "application/x-rar-compressed": "RAR",
        "application/gzip": "GZIP",
        // 通用二进制
        "application/octet-stream": "二进制文件",
        // 视频
        "video/mp4": "MP4",
        "video/avi": "AVI",
        // 音频
        "audio/mpeg": "MP3",
        "audio/wav": "WAV"
    };
    return map[contentType] || contentType?.split("/")[1] || contentType || "未知";
};

// 格式化存储类型
const formatStorageType = (type: string): string => {
    const map: Record<string, string> = {
        LOCAL: "本地存储",
        S3: "S3存储"
    };
    return map[type] || type;
};

// 下载文件
const handleDownload = async (row: FileInfo) => {
    await fileApi.download(row.id, row.original_name);
    MessageUtils.success("下载成功");
};

// 预览文件
const handlePreview = (row: FileInfo) => {
    window.open(fileApi.previewUrl(row.id), "_blank");
};

// 删除文件
const handleDelete = (row: FileInfo) => {
    MessageUtils.box.confirm(`是否要删除文件[${row.original_name}]`, "提示").then(async () => {
        await fileApi.deleteById(row.id);
        MessageUtils.success("删除成功", () => {
            handlerConditionQuery();
        });
    });
};

// 上传成功回调
const handleUploadSuccess = () => {
    uploadVisible.value = false;
    handlerConditionQuery();
};

// 重置查询条件
const handleReset = () => {
    condition.value = {
        page_num: 1,
        page_size: 15,
        original_name: "",
        storage_type: undefined
    };
    handlerConditionQuery();
};
</script>

<template>
    <!-- 搜索区 -->
    <el-row class="box-search">
        <el-form :inline="true">
            <el-form-item label="文件名" prop="original_name">
                <el-input v-model="condition.original_name" placeholder="请输入文件名" clearable />
            </el-form-item>
            <el-form-item label="存储类型" prop="storage_type">
                <el-select v-model="condition.storage_type" placeholder="请选择存储类型" clearable style="width: 180px">
                    <el-option label="本地存储" value="LOCAL" />
                    <el-option label="S3存储" value="S3" />
                </el-select>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                <el-button @click="handleReset">重置</el-button>
                <el-button type="success" @click="uploadVisible = true">上传文件</el-button>
            </el-form-item>
        </el-form>
    </el-row>
    <!-- 数据区 -->
    <el-row class="box-body">
        <el-table :data="table_data" height="95%" border stripe>
            <el-table-column align="center" prop="id" label="ID" width="300" show-overflow-tooltip />
            <el-table-column align="center" prop="original_name" label="文件名" min-width="200" show-overflow-tooltip />
            <el-table-column align="center" prop="filename" label="存储路径" min-width="250" show-overflow-tooltip />
            <el-table-column align="center" label="文件类型" width="120">
                <template #default="scope">
                    {{ formatContentType(scope.row.content_type) }}
                </template>
            </el-table-column>
            <el-table-column align="center" label="文件大小" width="120">
                <template #default="scope">
                    {{ formatFileSize(scope.row.size) }}
                </template>
            </el-table-column>
            <el-table-column align="center" label="存储类型" width="120">
                <template #default="scope">
                    <el-tag :type="scope.row.storage_type === 'LOCAL' ? 'primary' : 'success'">
                        {{ formatStorageType(scope.row.storage_type) }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" prop="created_at" label="上传时间" width="180" />
            <el-table-column align="center" label="操作" width="200" fixed="right">
                <template #default="scope">
                    <el-button link type="primary" size="small" @click="handlePreview(scope.row)">
                        预览
                    </el-button>
                    <el-button link type="primary" size="small" @click="handleDownload(scope.row)">
                        下载
                    </el-button>
                    <el-button
                        v-owner="'FILE:DELETE'"
                        link
                        type="danger"
                        size="small"
                        @click="handleDelete(scope.row)">
                        删除
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
        <!-- 分页 -->
        <el-pagination
            layout="total, sizes, prev, pager, next"
            :page-size="pagination.size"
            :page-sizes="pagination.page_sizes"
            :total="pagination.total"
            style="padding: 0 10px; margin-left: auto"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
    </el-row>
    <!-- 上传组件 -->
    <FileUpload v-if="uploadVisible" @close="uploadVisible = false" @success="handleUploadSuccess" />
</template>

<style scoped lang="scss">
.box-search {
    height: 10%;
    display: flex;
    align-items: center;
    padding-left: 20px;

    .el-form-item {
        margin-bottom: 0;
    }
}

.box-body {
    padding-left: 1vw;
    padding-right: 1vw;
    height: 90%;
}
</style>
