import { get } from "@/plugin/request/api";

/**
 * 权限相关接口
 *
 * @author Jack Young
 * @version 1.0
 * @since 2025-11-11 15:00:00
 */
export const AuthorityApi = {
    /**
     * 只读 Permission Catalog 资源树。
     */
    tree(): Promise<AuthorityTree[]> {
        return get<AuthorityTree[]>("/api/authority/tree");
    }
};
