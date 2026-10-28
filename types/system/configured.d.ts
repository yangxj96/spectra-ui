import type { components } from "@/api/generated/openapi.ts";

export {};

declare global {
    // 系统配置业务分类
    type ConfiguredSettingsCategory = NonNullable<components["schemas"]["ConfiguredVO"]["category"]>;

    // 系统配置表单项
    type ConfiguredSettingVO = components["schemas"]["ConfiguredVO"] &
        Required<
            Pick<components["schemas"]["ConfiguredVO"], "id" | "key" | "configured" | "type" | "category" | "editable">
        >;

    // 系统配置分类表单提交参数
    type ConfiguredSettingsBatchDTO = {
        category: ConfiguredSettingsCategory;
        items: Array<
            components["schemas"]["ConfiguredBatchItemFrom"] &
                Required<Pick<components["schemas"]["ConfiguredBatchItemFrom"], "id" | "version" | "value">>
        >;
    };
}
