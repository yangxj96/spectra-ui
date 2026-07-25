export {};

declare global {
    // 文件信息
    type FileInfo = BaseEntity & {
        // 存储文件名(系统生成)
        filename: string;

        // 原始文件名
        original_name: string;

        // 文件类型(MIME)
        content_type: string;

        // 文件大小(字节)
        size: number;

        // 文件哈希
        hash: string;

        // 存储类型(LOCAL/S3)
        storage_type: string;

        // 文件状态
        status: string;
    };

    // 文件分页查询参数
    type FilePageParams = BasePageParams & {
        // 原始文件名(模糊搜索)
        original_name?: string;

        // 存储类型(LOCAL/S3)
        storage_type?: string;
    };
}
