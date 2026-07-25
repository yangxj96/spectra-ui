import { get, put } from "@/plugin/request/api.ts";

/**
 * 系统配置 API
 *
 * @author Jack Young
 * @version 1.0
 * @since 2026-04-22 00:00:00
 */
export const ConfiguredApi = {
    /**
     * 分页查询系统配置信息
     */
    page(): Promise<Page<ConfiguredPageVO>> {
        return get<Page<ConfiguredPageVO>>("/api/configured/page");
    },
    /**
     * 修改系统配置
     * @param params 系统信息DTO
     */
    upload(params: ConfiguredDTO): Promise<void> {
        return put<void>("/api/configured", params);
    }
};
