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
        // 是否需要完成 MFA 二阶段验证
        mfa_required?: boolean;
        // 是否需要先登记 TOTP
        mfa_enrollment_required?: boolean;
        // MFA 预认证挑战 ID
        mfa_challenge_id?: string;
        // MFA 预认证挑战过期时间
        mfa_challenge_expires_at?: number;
    };

    /** TOTP 首次登记响应。 */
    type MfaEnrollment = {
        enrollment_id: string;
        provisioning_uri: string;
        secret: string;
    };

    type UserAuthorizationStatus = "UNCONFIGURED" | "INCOMPLETE" | "ACTIVE" | "PARTIAL";

    /** 批量导入用户的一行固定模板数据。 */
    type UserImportRow = {
        username: string;
        real_name: string;
        phone: string;
        email: string;
        department_code: string;
        language: string;
        timezone: string;
        authorization_profile_code: string;
    };

    /** 批量导入 Preview 请求。 */
    type UserImportPreviewFrom = {
        idempotency_key: string;
        file_name: string;
        file_hash: string;
        skip_existing: boolean;
        rows: UserImportRow[];
    };

    /** 批量导入 Apply 请求。 */
    type UserImportApplyFrom = {
        preview_token: string;
    };

    type UserImportTaskStatus =
        | "UPLOADED"
        | "VALIDATING"
        | "PREVIEWED"
        | "APPLYING"
        | "SUCCEEDED"
        | "PARTIAL_FAILED"
        | "FAILED"
        | "EXPIRED";

    /** 批量导入任务和 Preview 汇总。 */
    type UserImportTask = {
        id: string;
        file_name: string;
        file_hash: string;
        skip_existing: boolean;
        status: UserImportTaskStatus;
        expires_at: string;
        preview_expires_at: string;
        total_rows: number;
        valid_rows: number;
        error_rows: number;
        skipped_rows: number;
        applied_rows: number;
        completed_rows: number;
        assignment_count: number;
        access_boundary_count: number;
        grant_boundary_count: number;
        preview_token?: string;
    };

    /** 批量导入行结果。 */
    type UserImportRowResult = {
        id: string;
        row_number: number;
        row_key: string;
        state: string;
        user_id?: string;
        errors: string[];
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
        // 授权状态
        authorization_status: UserAuthorizationStatus;
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

    // 用户创建成功响应
    type UserCreatedVO = {
        id: string;
        username: string;
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

    /** 目标认证身份绑定信息 */
    type AuthenticationIdentityVO = {
        /** 认证身份ID */
        id: string;
        /** 认证方式：PASSWORD/SMS/EMAIL/OTP */
        method_code: "PASSWORD" | "SMS" | "EMAIL" | "OTP";
        /** Provider 编码 */
        provider_code: string;
        /** 目标身份状态 */
        state: "ACTIVE" | "DISABLED" | "REVOKED";
        /** 验证时间 */
        verified_at?: string;
        /** 是否为当前登录方式 */
        current: boolean;
    };
}
