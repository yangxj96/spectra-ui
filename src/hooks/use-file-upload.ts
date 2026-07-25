import { ref } from "vue";

import { FileUploadApi } from "@/api/common/file-upload-api.ts";
import { CommonUtils } from "@/utils/common-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

import type { UploadRequestOptions } from "element-plus/es/components/upload";
import type { UploadUserFile } from "element-plus/lib/components";

/**
 * 文件上传组合式函数
 * 支持秒传（哈希命中）、分片上传、单次上传三种策略
 * 流程：预处理 → 秒传判断 → 分片/单次上传 → 合并
 * @returns files 文件列表、handleUpload 上传处理函数（供 el-upload 的 http-request 使用）
 */
export function useFileUpload() {
    const files = ref<UploadUserFile[]>();

    /**
     * 处理文件上传
     */
    const handleUpload = async (options: UploadRequestOptions) => {
        const hash = CommonUtils.UUIDUpper();
        // 先进行预处理
        const { exists, url, multipart, upload_id, chunk_size } = await FileUploadApi.pre({
            filename: options.file.name,
            hash: hash,
            size: options.file.size
        });

        console.log(`存在:${exists},地址:${url},是否需要分片:${multipart},上传id:${upload_id},分片大小:${chunk_size}`);
        // 存在则秒传,提示成功
        if (exists) {
            MessageUtils.success("上传成功");
            return url;
        }
        let finalUrl: string;

        if (multipart) {
            await uploadChunk({
                file: options.file,
                filename: options.file.name,
                hash: hash,
                upload_id: upload_id,
                chunk_size: chunk_size
            });
            finalUrl = await FileUploadApi.merge(upload_id);
        } else {
            finalUrl = await uploadSingle({
                file: options.file,
                hash: hash,
                upload_id: upload_id
            });
        }

        MessageUtils.success("上传成功");
        return finalUrl;
    };

    //////////// 辅助方法

    /**
     * 普通上传
     */
    const uploadSingle = async ({ file, hash, upload_id }: SingleParams) => {
        const params = new FormData();
        params.append("file", file);
        params.append("hash", hash);
        params.append("upload_id", upload_id);
        await FileUploadApi.uploadSingle(params);
        return "";
    };

    /**
     * 分片上传
     */
    const uploadChunk = async ({ file, filename, hash, upload_id, chunk_size }: ChunkParams) => {
        const chunks = createChunks(file, chunk_size);
        const tasks = chunks.map((chunk, index) => {
            const params = new FormData();
            params.append("file", chunk!);
            params.append("upload_id", upload_id);
            params.append("file_name", filename);
            params.append("hash", hash);
            params.append("count", chunks.length.toString());
            params.append("index", (index + 1).toString());

            return FileUploadApi.uploadChunk(params);
        });

        // 等所有成功
        await Promise.all(tasks);
    };

    /**
     * 创建分片
     * @param file
     * @param size
     */
    const createChunks = (file: File, size: number): Blob[] => {
        const result: Blob[] = [];
        let cur = 0;
        while (cur < file.size) {
            result.push(file.slice(cur, cur + size));
            cur += size;
        }
        return result;
    };

    return {
        files,
        handleUpload
    };
}

export default useFileUpload;
