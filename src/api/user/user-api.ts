import { del, get, post, put } from "@/plugin/request/api.ts";

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
     */
    async page(params?: UserPageParams): Promise<Page<UserPageVO>> {
        return get<Page<UserPageVO>>("/api/user/page", params);
    },
    /**
     * 新增用户
     * @param params 角色入参
     */
    async create(params: UserDTO): Promise<void> {
        return post<void>("/api/user", params);
    },
    /**
     * 修改用户
     * @param params 角色入参
     */
    async update(params: UserDTO): Promise<void> {
        return put<void>("/api/user", params);
    },
    /**
     * 删除用户
     * @param id 角色ID
     */
    async deleteById(id: string): Promise<void> {
        return del<void>(`/api/user/${id}`);
    },
    /**
     * 重置用户密码
     * @param id 角色ID
     */
    async passwordResetById(id: string): Promise<void> {
        return put<void>(`/api/user/password/reset/${id}`);
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
    }
};

/** 当前用户详情 */
export interface UserProfileVO {
    /** 用户ID */
    id: string;
    /** 用户名 */
    username: string;
    /** 真实姓名 */
    realName: string;
    /** 头像 */
    avatar: string;
    /** 状态 */
    status: number;
    /** 性别 */
    gender: number;
    /** 生日 */
    birthday: string;
    /** 手机号 */
    phone: string;
    /** 邮箱 */
    email: string;
    /** 国家 */
    country: string;
    /** 城市 */
    city: string;
    /** 语言 */
    language: string;
    /** 时区 */
    timezone: string;
    /** 部门ID */
    departmentId: string;
    /** 部门名称 */
    departmentName: string;
    /** 角色列表 */
    roles: RoleInfo[];
}

/** 角色信息 */
export interface RoleInfo {
    /** 角色ID */
    id: string;
    /** 角色名称 */
    name: string;
    /** 角色编码 */
    code: string;
}

/** 更新用户信息入参 */
export interface UserProfileFrom {
    /** 真实姓名 */
    realName: string;
    /** 性别 */
    gender: number;
    /** 生日 */
    birthday: string;
    /** 手机号 */
    phone: string;
    /** 邮箱 */
    email: string;
    /** 国家 */
    country: string;
    /** 城市 */
    city: string;
    /** 语言 */
    language: string;
    /** 时区 */
    timezone: string;
}
