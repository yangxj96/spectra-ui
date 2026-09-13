export {};

declare global {
    // 系统配置业务分类
    type ConfiguredSettingsCategory = "SYSTEM" | "SECURITY" | "NOTIFICATION" | "OTHER";

    // 系统配置表单项
    type ConfiguredSettingVO = {
        id: string;
        key: string;
        value: string | null;
        configured: boolean;
        type: string;
        category: ConfiguredSettingsCategory;
        editable: boolean;
        dict_code: string | null;
        remarks: string;
    };

    // 系统配置分类表单提交参数
    type ConfiguredSettingsBatchDTO = {
        category: ConfiguredSettingsCategory;
        items: Array<{
            id: string;
            value: string;
            remarks: string;
        }>;
    };
}
