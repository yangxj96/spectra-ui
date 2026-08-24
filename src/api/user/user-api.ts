import { get, post, put } from "@/plugin/request/api.ts";

/**
 * 用户相关接口
 *
 * @author Jack Young
 * @version 1.0
 * @since 2025-11-11 15:00:00
 */
export const UserApi = {
    /**
     * 分页获取用户列表
     * @param params 分页参数
     * @param options 请求选项
     */
    async page(
        params?: UserPageParams,
        options?: Pick<RequestOptions<"/api/user/page">, "loading">
    ): Promise<Page<UserPageVO>> {
        return get<Page<UserPageVO>>("/api/user/page", params, options);
    },
    /**
     * 获取管理员用户详情
     * @param id 用户ID
     */
    async detail(id: string): Promise<UserPageVO> {
        return get<UserPageVO>(`/api/user/${id}`);
    },
    /**
     * 提交新增用户及角色授权
     * @param params 用户资料和授权配置
     */
    async submitCreate(params: UserOnboardingDTO): Promise<UserOnboardingVO> {
        return post<UserOnboardingVO>("/api/user/onboarding", params);
    },
    /**
     * 提交用户编辑及角色授权
     * @param params 用户资料和授权配置
     */
    async submitUpdate(params: UserOnboardingDTO): Promise<UserOnboardingVO> {
        return put<UserOnboardingVO>("/api/user/onboarding", params);
    },
    /**
     * 重置用户密码
     * @param id 角色ID
     */
    async passwordResetById(id: string): Promise<UserPasswordResetVO> {
        return put<UserPasswordResetVO>(`/api/user/password/reset/${id}`);
    },
    /**
     * 获取当前用户详情
     */
    async getProfile(): Promise<UserProfileVO> {
        return get<UserProfileVO>("/api/user/profile");
    },
    /**
     * 更新当前用户信息
     * @param params 用户信息
     */
    async updateProfile(params: UserProfileFrom): Promise<void> {
        return put<void>("/api/user/profile", params);
    },
    /**
     * 修改密码
     * @param params 修改密码参数
     */
    async changePassword(params: ChangePasswordFrom): Promise<void> {
        return put<void>("/api/user/password", params);
    }
};
