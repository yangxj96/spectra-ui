/**
 * 用户类型转换器
 *
 * @author Jack Young
 * @version 1.0
 * @since 2026-04-22 00:00:00
 */
export const userConverter = {
    /** 创建空白用户表单（新增时使用） */
    createForm(defaults: Partial<Pick<UserForm, "language" | "timezone">> = {}): UserForm {
        return {
            id: "",
            username: "",
            real_name: "",
            status: undefined,
            gender: undefined,
            birthday: "",
            phone: "",
            email: "",
            country: "",
            city: "",
            language: defaults.language ?? "",
            timezone: defaults.timezone ?? "",
            department_id: ""
        };
    },
    /** 列表数据转表单回显 */
    toForm(datum: UserPageVO): UserForm {
        return {
            // 基础字段
            id: datum.id ?? "",
            username: datum.username ?? "",
            real_name: datum.real_name ?? "",
            status: datum.status ?? undefined,
            gender: datum.gender ?? undefined,
            birthday: datum.birthday ?? "",
            phone: datum.phone ?? "",
            email: datum.email ?? "",
            country: datum.country ?? "",
            city: datum.city ?? "",
            language: datum.language ?? "",
            timezone: datum.timezone ?? "",
            department_id: datum.department_id ?? ""
        };
    },
    /** 表单数据转接口请求参数 */
    toDTO(form: UserForm): UserDTO {
        return {
            id: form.id || undefined,
            username: form.username,
            real_name: form.real_name,
            status: form.status ?? undefined,
            gender: form.gender ?? undefined,
            birthday: form.birthday ?? undefined,
            phone: form.phone,
            email: form.email,
            country: form.country,
            city: form.city,
            language: form.language,
            timezone: form.timezone,
            department_id: form.department_id
        };
    }
};
