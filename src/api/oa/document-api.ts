import { get, post, put } from "@/plugin/request/api.ts";

export const DocumentApi = {
    page(params?: DocumentPageParams): Promise<Page<DocumentVO>> {
        return get<Page<DocumentVO>>("/api/oa/document/page", params);
    },
    get(id: string): Promise<DocumentVO> {
        return get<DocumentVO>(`/api/oa/document/${id}`);
    },
    create(params: DocumentSaveParams): Promise<string> {
        return post<string>("/api/oa/document", params);
    },
    update(id: string, params: DocumentSaveParams): Promise<void> {
        return put<void>(`/api/oa/document/${id}`, params);
    },
    addVersion(id: string, params: DocumentVersionParams): Promise<string> {
        return post<string>(`/api/oa/document/${id}/versions`, params);
    },
    versions(id: string): Promise<DocumentVersionVO[]> {
        return get<DocumentVersionVO[]>(`/api/oa/document/${id}/versions`);
    },
    publish(id: string): Promise<void> {
        return post<void>(`/api/oa/document/${id}/publish`);
    },
    folders(): Promise<DocumentFolderVO[]> {
        return get<DocumentFolderVO[]>("/api/oa/document/folders");
    },
    createFolder(params: DocumentFolderSaveParams): Promise<string> {
        return post<string>("/api/oa/document/folders", params);
    }
};
