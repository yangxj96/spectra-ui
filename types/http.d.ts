export {};

declare global {
    type ExtractPathParams<T extends string> = T extends `${string}{${infer Param}}${infer Rest}`
        ? Param | ExtractPathParams<Rest>
        : never;

    type PathParams<T extends string> =
        ExtractPathParams<T> extends never ? undefined : Record<ExtractPathParams<T>, string | number>;

    /**
     * 请求优先级
     */
    export type HttpPriority = "high" | "normal" | "low";

    export interface RequestOptions<T extends string> extends RequestInit {
        /**
         * 请求参数
         */
        params?: Record<string, unknown>;

        /**
         * 是否显示全局 loading；默认 false，由页面或 Hook 管理局部反馈。
         */
        loading?: boolean;

        /**
         * 是否将二进制响应保存为文件
         */
        download?: boolean;

        /**
         * 网络失败重试次数；只有安全方法或显式声明幂等的写入才会执行。
         */
        retry?: number;

        /**
         * 写入是否具有幂等契约；声明后允许在可重试错误下重试。
         */
        idempotent?: boolean;

        /**
         * 重试整体截止时间（毫秒），从请求开始计算。
         */
        retryDeadlineMs?: number;

        /** 是否附带当前 Access Token；Refresh 和预签名请求使用 skip。 */
        auth?: "required" | "skip";

        /** 是否允许在一次 401 后刷新并重试原请求。 */
        retryOnAuth?: boolean;

        /** 响应体为空时使用的错误提示；后端返回消息时优先使用后端消息。 */
        errorFallback?: string;

        /** 请求超时时间（毫秒）。 */
        timeout?: number;

        /**
         * 是否启用缓存
         */
        cache?: boolean;

        /**
         * 是否启用请求去重
         */
        dedupe?: boolean;

        /**
         * 路由切换时是否保持请求（不被 cancelAllRequests 取消）
         */
        persistent?: boolean;

        /**
         * 应用层优先级（控制并发队列）
         */
        priority?: HttpPriority;

        /**
         * 浏览器网络优先级
         */
        fetchPriority?: RequestPriority;

        /**
         * 路径参数
         */
        pathParams?: PathParams<T>;

        /**
         * 接口成功时不解析响应体；适用于 HTTP 200/204 的空响应。
         */
        noBody?: boolean;

        /**
         * 将响应按原始二进制 Blob 返回，不尝试解密或业务包装。
         */
        responseType?: "json" | "blob" | "empty";
    }

    // 响应整体
    type IResult<T = unknown> = {
        // 状态码
        code: number;
        // 消息
        msg: string;
        // 稳定业务错误码（失败响应）
        error_code?: string;
        // 响应内容
        data?: T;
    };

    // 基础实体都有的类型
    type BaseEntity = {
        // 主键ID
        id: string;
        // 持久化行的读取版本（仅可编辑实体提供）
        version?: number;
        // 创建人
        created_by?: string;
        // 创建时间
        created_at?: string;
        // 最后更新人
        updated_by?: string;
        // 最后更新时间
        updated_at?: string;
    };
}
