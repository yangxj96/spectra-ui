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
     * 查询系统配置表单数据
     */
    settings(): Promise<ConfiguredSettingVO[]> {
        return get<ConfiguredSettingVO[]>("/api/configured/settings");
    },
    /**
     * 按业务分类批量保存系统配置
     * @param params 当前分类配置项
     */
    batchModify(params: ConfiguredSettingsBatchDTO): Promise<void> {
        return put<void>("/api/configured/batch", params, { noBody: true });
    }
};
