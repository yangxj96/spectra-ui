export {};

declare global {
    type LoginForm = {
        type: "PASSWORD" | "SMS" | "OTP" | "SCAN" | "WECHAT" | "GITHUB";
        username: string;
        password: string;
        client_id: string;
        captcha: string;
    };

    // 登录token
    type Token = {
        id: string;
        // 用户名
        username: string;
        // 认证token
        access_token: string;
        // 刷新token
        refresh_token?: string;
        // Permission Catalog 权限编码；不包含角色名称
        permissions: string[];
    };

    // 用户分页查询的实体
    type UserPageVO = {
        // 主键
        id: string;
        // 用户名
        username: string;
        // 头像
        avatar: string;
        // 状态
        status: number;
        // 真实姓名
        real_name: string;
        // 性别
        gender: number;
        // 生日
        birthday: string;
        // 手机号码
        phone: string;
        // 邮箱
        email: string;
        // 国家
        country: string;
        // 城市
        city: string;
        // 语言
        language: string;
        // 时区
        timezone: string;
        // 角色列表
        roles: RolePageVO[];
        // 部门ID
        department_id: string;
        // 部门名称
        department_name: string;
        // 创建时间
        created_at: string;
    };

    // 用户表单相关使用的
    type UserForm = {
        // 主键
        id: string;
        // 用户名
        username: string;
        // 真实姓名
        real_name: string;
        // 状态
        status: number | undefined;
        // 性别
        gender: number | undefined;
        // 生日
        birthday: string;
        // 手机号码
        phone: string;
        // 邮箱
        email: string;
        // 国家
        country: string;
        // 城市
        city: string;
        // 语言
        language: string;
        // 时区
        timezone: string;
        // 部门ID
        department_id: string;
        // 角色ID列表
        role_ids: string[];
    };

    // 用户表单提交内容
    type UserDTO = {
        // 主键
        id: string;
        // 用户名
        username: string;
        // 真实姓名
        real_name: string;
        // 状态
        status: number | undefined;
        // 性别
        gender: number | undefined;
        // 生日
        birthday: string;
        // 手机号码
        phone: string;
        // 邮箱
        email: string;
        // 国家
        country: string;
        // 城市
        city: string;
        // 语言
        language: string;
        // 时区
        timezone: string;
        // 部门ID
        department_id: string;
        // 角色ID列表
        role_ids: string[];
    };

    /** 当前用户详情 */
    type UserProfileVO = {
        /** 用户ID */
        id: string;
        /** 用户名 */
        username: string;
        /** 真实姓名 */
        real_name: string;
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
        department_id: string;
        /** 部门名称 */
        department_name: string;
        /** 角色列表 */
        roles: RoleInfo[];
    };

    /** 角色简要信息 */
    type RoleInfo = {
        /** 角色ID */
        id: string;
        /** 角色名称 */
        name: string;
        /** 角色编码 */
        code: string;
    };

    /** 更新用户信息入参 */
    type UserProfileFrom = {
        /** 真实姓名 */
        real_name: string;
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
    };

    /** 修改密码入参 */
    type ChangePasswordFrom = {
        /** 旧密码 */
        old_password: string;
        /** 新密码 */
        new_password: string;
        /** 确认密码 */
        verify_password: string;
    };

    /** 账号绑定信息 */
    type AccountVO = {
        /** 账号ID */
        id: string;
        /** 登录类型：PASSWORD/SMS/EMAIL/OTP */
        type: "PASSWORD" | "SMS" | "EMAIL" | "OTP";
        /** 登录名称 */
        loginName: string;
        /** 状态：1-正常 2-禁用 3-未验证 */
        status: number;
        /** 是否已验证：0-未验证 1-已验证 */
        verified: number;
        /** 是否为当前登录方式 */
        current: boolean;
    };
}
