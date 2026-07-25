/**
 * 系统配置类型转换器
 *
 * @author Jack Young
 * @version 1.0
 * @since 2026-04-22 00:00:00
 */
export const configuredConverter = {
    /** 创建空白配置表单（新增时使用） */
    createForm(): ConfiguredForm {
        return {
            id: "",
            key: "",
            value: undefined,
            type: "",
            dict_code: "",
            remarks: ""
        };
    },

    /** 列表数据转表单回显 */
    toForm(datum: ConfiguredPageVO): ConfiguredForm {
        return {
            id: datum.id ?? "",
            key: datum.key ?? "",
            value: datum.value ?? undefined,
            type: datum.type ?? "",
            dict_code: datum.dict_code ?? "",
            remarks: datum.remarks ?? ""
        };
    },

    /** 表单数据转接口请求参数 */
    toDTO(datum: ConfiguredForm): ConfiguredDTO {
        return {
            id: datum.id ?? "",
            key: datum.key ?? "",
            value: datum.value ?? undefined,
            type: datum.type ?? "",
            dict_code: datum.dict_code ?? "",
            remarks: datum.remarks ?? ""
        };
    }
};
