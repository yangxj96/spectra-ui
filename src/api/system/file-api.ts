import { del, download, get } from "@/plugin/request/api.ts";

/**
 * 文件管理相关接口
 */
export const FileApi = {
    /**
     * 分页查询文件列表
     * @param params 分页参数
     */
    page(params?: FilePageParams): Promise<Page<FileInfo>> {
        return get<Page<FileInfo>>("/api/file/info/page", params);
    },
    /**
     * 下载文件
     * @param id 文件ID
     */
    async download(id: string): Promise<void> {
        await download(`/api/file/upload/download/${id}`);
    },
    /**
     * 删除文件
     * @param id 文件ID
     */
    deleteById(id: string): Promise<void> {
        return del<void>(`/api/file/info/${id}`);
    },
    /**
     * 获取文件预览地址
     * @param id 文件ID
     */
    previewUrl(id: string): string {
        return `/api/file/upload/preview/${id}`;
    }
};
