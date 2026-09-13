import type { BasePageParams } from "./paging";

export {};

declare global {
    // 系统配置分页请求参数定义
    type ConfiguredPageParams = BasePageParams & {
        key?: string;
    };

    // 系统配置信息
    type ConfiguredPageVO = {
        // 主键ID
        id: string;
        // 系统配置 键
        key: string;
        // 系统配置 值
        value: string | null;
        // 秘密配置是否已经设置，秘密本身不会回传
        configured: boolean;
        // 系统配置类型
        type: string;
        // 如果为字典则是字典组CODE
        dict_code: string;
        // 备注
        remarks: string;
    };

    // 系统配置信息 表单编辑
    type ConfiguredForm = {
        // 主键ID
        id: string;
        // 系统配置 键
        key: string;
        // 系统配置 值
        value: string | undefined;
        // 编辑页是否已有已配置的秘密值
        configured: boolean;
        // 系统配置类型
        type: string;
        // 如果为字典则是字典组CODE
        dict_code: string;
        // 备注
        remarks: string;
    };

    // 系统配置信息 请求提交
    type ConfiguredDTO = {
        // 主键ID
        id: string;
        // 系统配置 键
        key: string;
        // 系统配置 值
        value: string;
        // 系统配置类型
        type: string;
        // 如果为字典则是字典组CODE
        dict_code: string;
        // 备注
        remarks: string;
    };
}
