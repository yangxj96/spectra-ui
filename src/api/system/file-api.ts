import { del, download as downloadBlob, get, post, put } from "@/plugin/request/api.ts";

/** 文件上传、资产和业务引用统一接口。 */
export const FileApi = {
    createUpload(params: CreateUploadParams): Promise<UploadSession> {
        return post<UploadSession>("/api/file/uploads", params);
    },
    status(uploadId: string): Promise<UploadSession> {
        return get<UploadSession>(`/api/file/uploads/${uploadId}`);
    },
    target(uploadId: string, partNumber: number, params: PartTargetParams): Promise<PartTarget> {
        return post<PartTarget>(`/api/file/uploads/${uploadId}/parts/${partNumber}/target`, params);
    },
    confirm(uploadId: string, partNumber: number, params: ConfirmPartParams): Promise<void> {
        return post<void>(`/api/file/uploads/${uploadId}/parts/${partNumber}/confirm`, params, { noBody: true });
    },
    complete(uploadId: string): Promise<UploadSession> {
        return post<UploadSession>(`/api/file/uploads/${uploadId}/complete`);
    },
    cancel(uploadId: string): Promise<void> {
        return del<void>(`/api/file/uploads/${uploadId}`, undefined, { noBody: true });
    },
    assetsPage(params?: FileAssetPageParams): Promise<Page<FileAsset>> {
        return get<Page<FileAsset>>("/api/file/assets/page", params);
    },
    uploadTasksPage(params?: FileUploadAdminPageParams): Promise<Page<FileUploadAdminTask>> {
        return get<Page<FileUploadAdminTask>>("/api/file/uploads/page", params);
    },
    uploadTaskDetail(uploadId: string): Promise<FileUploadAdminDetail> {
        return get<FileUploadAdminDetail>(`/api/file/uploads/${uploadId}/admin-detail`);
    },
    adminCancelUpload(uploadId: string, params: FileAdminOperationParams): Promise<void> {
        return post<void>(`/api/file/uploads/${uploadId}/admin-cancel`, params, { noBody: true });
    },
    preview(fileAssetId: string, referenceType?: string, referenceId?: string): Promise<Blob> {
        return downloadBlob("/api/file/assets/{fileAssetId}/preview", {
            pathParams: { fileAssetId },
            params:
                referenceType && referenceId ? { reference_type: referenceType, reference_id: referenceId } : undefined,
            loading: false
        });
    },
    download(fileAssetId: string, referenceType?: string, referenceId?: string): Promise<Blob> {
        return downloadBlob("/api/file/assets/{fileAssetId}/download", {
            pathParams: { fileAssetId },
            params:
                referenceType && referenceId ? { reference_type: referenceType, reference_id: referenceId } : undefined,
            loading: false
        });
    },
    deleteAsset(fileAssetId: string): Promise<void> {
        return del<void>(`/api/file/assets/${fileAssetId}`, undefined, { noBody: true });
    },
    registerReference(params: {
        file_asset_id: string;
        reference_type: string;
        reference_id: string;
        purpose: string;
        display_name?: string;
    }): Promise<FileReference> {
        return post<FileReference>("/api/file/references", params);
    },
    deleteReference(referenceId: string): Promise<void> {
        return del<void>(`/api/file/references/${referenceId}`, undefined, { noBody: true });
    },
    referencesPage(params?: FileReferencePageParams): Promise<Page<FileReferenceAdmin>> {
        return get<Page<FileReferenceAdmin>>("/api/file/references/page", params);
    },
    fileTypesPage(params?: BasePageParams): Promise<Page<FileTypePolicy>> {
        return get<Page<FileTypePolicy>>("/api/file/types/page", params);
    },
    fileType(id: string): Promise<FileTypePolicy> {
        return get<FileTypePolicy>(`/api/file/types/${id}`);
    },
    createFileType(params: FileTypePolicySaveParams): Promise<FileTypePolicy> {
        return post<FileTypePolicy>("/api/file/types", params);
    },
    updateFileType(id: string, params: FileTypePolicySaveParams): Promise<FileTypePolicy> {
        return put<FileTypePolicy>(`/api/file/types/${id}`, params);
    },
    enableFileType(id: string): Promise<FileTypePolicy> {
        return post<FileTypePolicy>(`/api/file/types/${id}/enable`);
    },
    disableFileType(id: string): Promise<FileTypePolicy> {
        return post<FileTypePolicy>(`/api/file/types/${id}/disable`);
    }
};
