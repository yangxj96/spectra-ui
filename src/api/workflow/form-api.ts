import { del, get, post, put } from "@/plugin/request/api.ts";

/**
 * 表单定义相关接口
 *
 * @author yangxj96
 * @version 1.0
 * @since 2026-07-17
 */
export const FormApi = {
    /**
     * 分页查询表单列表
     * @param params 查询参数
     */
    page(params?: Record<string, unknown>): Promise<Page<FormDefinitionVO>> {
        return get<Page<FormDefinitionVO>>("/api/workflow/form-definitions", params);
    },

    /**
     * 查询表单详情（含当前版本内容）
     * @param id 表单定义ID
     */
    getById(id: string): Promise<FormDefinitionVO> {
        return get<FormDefinitionVO>(`/api/workflow/form-definitions/${id}`);
    },

    /**
     * 创建表单（同时创建版本1）
     * @param data 表单定义数据
     */
    create(data: FormDefinitionSaveFrom): Promise<void> {
        return post<void>("/api/workflow/form-definitions", data);
    },

    /**
     * 更新表单元数据
     * @param id   表单定义ID
     * @param data 表单定义数据
     */
    update(id: string, data: FormDefinitionSaveFrom): Promise<void> {
        return put<void>(`/api/workflow/form-definitions/${id}`, data);
    },

    /**
     * 删除表单（级联删除版本）
     * @param id 表单定义ID
     */
    delete(id: string): Promise<void> {
        return del<void>(`/api/workflow/form-definitions/${id}`);
    },

    /**
     * 保存新版本（版本号自增）
     * @param id   表单定义ID
     * @param data 版本内容
     */
    saveVersion(id: string, data: FormVersionSaveFrom): Promise<void> {
        return post<void>(`/api/workflow/form-definitions/${id}/versions`, data);
    },

    /**
     * 查询版本历史
     * @param id 表单定义ID
     */
    getVersions(id: string): Promise<FormVersionVO[]> {
        return get<FormVersionVO[]>(`/api/workflow/form-definitions/${id}/versions`);
    },

    /**
     * 查询指定版本详情
     * @param id      表单定义ID
     * @param version 版本号
     */
    getVersion(id: string, version: number): Promise<FormVersionVO> {
        return get<FormVersionVO>(`/api/workflow/form-definitions/${id}/versions/${version}`);
    }
};
