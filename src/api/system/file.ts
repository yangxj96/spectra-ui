import { del, get } from "@/plugin/request/api.ts";
import { request } from "@/plugin/request/http";

/**
 * 文件管理相关接口
 */
export const fileApi = {
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
     * @param filename 文件名
     */
    async download(id: string, filename: string): Promise<void> {
        const blob = await request<Blob>(`/api/file/upload/download/${id}`, {
            method: "GET"
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
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
