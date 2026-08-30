<script setup lang="ts">
import { ref } from "vue";

import { FileApi } from "@/api/system/file-api.ts";
import useTable from "@/hooks/use-table.ts";
import { formatDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

// 查询条件
const condition = ref<FileAssetPageParams>({
    page_num: 1,
    page_size: 15,
    original_name: "",
    content_sha256: "",
    content_type: "",
    storage_provider: undefined,
    status: undefined
});

// table分页请求
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<FileAsset>(
    FileApi.assetsPage,
    condition.value
);

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

const formatStatus = (status: string): string => {
    const map: Record<string, string> = {
        READY: "可用",
        DELETING: "删除中",
        DELETED: "已删除"
    };
    return map[status] || status;
};

const statusTagType = (status: string): "success" | "warning" | "info" => {
    if (status === "READY") return "success";
    if (status === "DELETING") return "warning";
    return "info";
};

// 下载文件
const handleDownload = async (row: FileAsset) => {
    const blob = await FileApi.download(row.file_asset_id);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = row.original_name;
    anchor.click();
    URL.revokeObjectURL(url);
    MessageUtils.success("下载成功");
};

// 预览文件
const handlePreview = async (row: FileAsset) => {
    const blob = await FileApi.preview(row.file_asset_id);
    window.open(URL.createObjectURL(blob), "_blank");
};

// 删除文件
const handleDelete = (row: FileAsset) => {
    MessageUtils.box.confirm(`是否要删除文件[${row.original_name}]`, "提示").then(async () => {
        await FileApi.deleteAsset(row.file_asset_id);
        MessageUtils.success("删除成功", () => {
            handlerConditionQuery();
        });
    });
};

// 重置查询条件
const handleReset = () => {
    condition.value = {
        page_num: 1,
        page_size: 15,
        original_name: "",
        content_sha256: "",
        content_type: "",
        storage_provider: undefined,
        status: undefined
    };
    handlerConditionQuery();
};
</script>

<template>
    <!-- 搜索区 -->
    <el-row class="box__search">
        <el-form :inline="true">
            <el-form-item label="文件名" prop="original_name">
                <el-input v-model="condition.original_name" placeholder="请输入文件名" clearable />
            </el-form-item>
            <el-form-item label="存储类型" prop="storage_provider">
                <el-select
                    v-model="condition.storage_provider"
                    placeholder="请选择存储类型"
                    clearable
                    style="width: 180px">
                    <el-option label="本地存储" value="LOCAL" />
                    <el-option label="S3存储" value="S3" />
                </el-select>
            </el-form-item>
            <el-form-item label="状态" prop="status">
                <el-select v-model="condition.status" placeholder="请选择状态" clearable style="width: 150px">
                    <el-option label="可用" value="READY" />
                    <el-option label="删除中" value="DELETING" />
                    <el-option label="已删除" value="DELETED" />
                </el-select>
            </el-form-item>
            <el-form-item label="摘要" prop="content_sha256">
                <el-input v-model="condition.content_sha256" placeholder="SHA-256" clearable style="width: 260px" />
            </el-form-item>
            <el-form-item label="媒体类型" prop="content_type">
                <el-input v-model="condition.content_type" placeholder="例如 application/pdf" clearable />
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                <el-button @click="handleReset">重置</el-button>
            </el-form-item>
        </el-form>
    </el-row>
    <!-- 数据区 -->
    <el-row class="box__body">
        <el-table :data="table_data" height="95%" border stripe>
            <el-table-column align="center" prop="file_asset_id" label="ID" width="300" show-overflow-tooltip />
            <el-table-column align="center" prop="original_name" label="文件名" min-width="200" show-overflow-tooltip />
            <el-table-column
                align="center"
                prop="content_sha256"
                label="SHA-256"
                min-width="250"
                show-overflow-tooltip />
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
                    <el-tag :type="scope.row.storage_provider === 'LOCAL' ? 'primary' : 'success'">
                        {{ formatStorageType(scope.row.storage_provider) }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" label="状态" width="100">
                <template #default="scope">
                    <el-tag size="small" :type="statusTagType(scope.row.status)">
                        {{ formatStatus(scope.row.status) }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" prop="reference_count" label="业务引用" width="100" />
            <el-table-column align="center" label="上传时间" width="180">
                <template #default="scope">{{ formatDateTime(scope.row.created_at) }}</template>
            </el-table-column>
            <el-table-column align="center" label="操作" width="200" fixed="right">
                <template #default="scope">
                    <el-button
                        v-if="scope.row.status === 'READY'"
                        link
                        type="primary"
                        size="small"
                        @click="handlePreview(scope.row)">
                        预览
                    </el-button>
                    <el-button
                        v-if="scope.row.status === 'READY'"
                        link
                        type="primary"
                        size="small"
                        @click="handleDownload(scope.row)">
                        下载
                    </el-button>
                    <el-button
                        v-if="scope.row.status === 'READY'"
                        v-permission="'file:admin:delete'"
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
</template>

<style scoped lang="scss">
.box__search {
    height: 10%;
    display: flex;
    align-items: center;
    padding-left: 20px;

    .el-form-item {
        margin-bottom: 0;
    }
}

.box__body {
    padding-left: 1vw;
    padding-right: 1vw;
    height: 90%;
}
</style>
