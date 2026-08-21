import { get, post } from "@/plugin/request/api.ts";

const USER_IMPORT_API_OPTIONS = {
    headers: {
        "Api-Version": "1.0.0"
    }
};

/** 用户批量导入 Preview、Apply 和结果查询接口。 */
export const UserImportApi = {
    preview(params: UserImportPreviewFrom): Promise<UserImportTask> {
        return post<UserImportTask>("/api/user/imports/preview", params, USER_IMPORT_API_OPTIONS);
    },

    detail(id: string): Promise<UserImportTask> {
        return get<UserImportTask>(`/api/user/imports/${id}`, undefined, USER_IMPORT_API_OPTIONS);
    },

    errors(id: string): Promise<UserImportRowResult[]> {
        return get<UserImportRowResult[]>(`/api/user/imports/${id}/errors`, undefined, USER_IMPORT_API_OPTIONS);
    },

    apply(id: string, params: UserImportApplyFrom): Promise<void> {
        return post<void>(`/api/user/imports/${id}/apply`, params, USER_IMPORT_API_OPTIONS);
    }
};
