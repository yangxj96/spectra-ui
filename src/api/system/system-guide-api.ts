import { get, post } from "@/plugin/request/api.ts";

/**
 * DEV_OPS 首次登录后的系统设置引导接口。
 */
export const SystemGuideApi = {
    /** 查询当前登录用户是否必须完成系统设置引导。 */
    status(): Promise<SystemGuideStatus> {
        return get<SystemGuideStatus>("/api/system/guide/status");
    },

    /** 保存首次系统设置并完成引导。 */
    complete(from: SystemGuideCompleteFrom): Promise<void> {
        return post<void>("/api/system/guide/complete", from);
    }
};
