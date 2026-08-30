export {};

declare global {
    type FileAsset = BaseEntity & {
        file_asset_id: string;
        original_name: string;
        content_sha256: string;
        size: number;
        content_type: string;
        storage_provider: "LOCAL" | "S3" | string;
        status: "READY" | "DELETING" | "DELETED" | string;
        reference_count?: number;
        completed_at?: string;
    };

    type FileAssetPageParams = BasePageParams & {
        // 原始文件名(模糊搜索)
        original_name?: string;

        // 存储类型(LOCAL/S3)
        storage_provider?: "LOCAL" | "S3";

        content_sha256?: string;

        content_type?: string;

        status?: "READY" | "DELETING" | "DELETED";
    };

    type UploadSession = {
        upload_id?: string;
        result?: "CREATED" | "RESUMABLE" | "DEDUPLICATED" | string;
        status: "UPLOADING" | "VERIFYING" | "READY" | "FAILED" | "CANCELED" | "EXPIRED" | "CLEANED" | string;
        chunk_size?: number;
        total_parts?: number;
        transport_mode?: "LOCAL_PROXY" | "PRESIGNED" | string;
        completed_parts?: number[];
        uploaded_bytes?: number;
        expires_at?: string;
        last_activity_at?: string;
        verification_progress?: number;
        file_asset_id?: string;
        error_code?: string;
    };

    type CreateUploadParams = {
        original_name: string;
        content_type: string;
        size: number;
        content_sha256: string;
        file_type_code: string;
    };

    type PartTarget = {
        method: "PUT";
        url: string;
        headers: Record<string, string>;
        expires_at: string;
        attempt: number;
    };

    type PartTargetParams = {
        part_size: number;
        part_sha256: string;
    };

    type ConfirmPartParams = {
        part_size: number;
        part_sha256: string;
        provider_etag?: string;
        attempt: number;
    };

    type FileReference = {
        id: string;
        file_asset_id: string;
        reference_type: string;
        reference_id: string;
        purpose: string;
        display_name?: string;
    };

    type FileUploadAdminPageParams = BasePageParams & {
        original_name?: string;
        owner_user_id?: string;
        status?: UploadSession["status"];
    };

    type FileAdminOperationParams = {
        idempotency_key: string;
        reason: string;
    };

    type FileUploadAdminPart = {
        part_number: number;
        expected_size: number;
        uploaded_size?: number;
        status: "PENDING" | "UPLOADED" | "CONFIRMED" | string;
        upload_attempt: number;
        uploaded_at?: string;
    };

    type FileUploadAdminTask = {
        upload_id: string;
        owner_user_id: string;
        original_name: string;
        declared_content_type: string;
        size: number;
        content_sha256: string;
        chunk_size: number;
        total_parts: number;
        completed_parts: number;
        uploaded_bytes: number;
        storage_provider: "LOCAL" | "S3" | string;
        transport_mode: "LOCAL_PROXY" | "PRESIGNED" | string;
        status: UploadSession["status"];
        expires_at?: string;
        last_activity_at?: string;
        completed_at?: string;
        verify_started_at?: string;
        verify_finished_at?: string;
        verify_processed_bytes?: number;
        verify_total_bytes?: number;
        failure_code?: string;
        cleanup_attempts: number;
        next_cleanup_at?: string;
        created_at?: string;
        updated_at?: string;
    };

    type FileUploadAdminDetail = FileUploadAdminTask & {
        parts: FileUploadAdminPart[];
    };

    type FileReferencePageParams = BasePageParams & {
        file_asset_id?: string;
        reference_type?: string;
        reference_id?: string;
        purpose?: string;
        display_name?: string;
    };

    type FileReferenceAdmin = {
        reference_id: string;
        file_asset_id: string;
        asset_original_name?: string;
        asset_content_sha256?: string;
        asset_size?: number;
        asset_content_type?: string;
        reference_type: string;
        business_reference_id: string;
        purpose: string;
        display_name?: string;
        created_by?: string;
        created_at?: string;
        updated_at?: string;
    };

    type FileMagicRule = {
        bytes: string;
        offset?: number;
        description?: string;
    };

    type FileTypePolicy = {
        id: string;
        code: string;
        display_name: string;
        allowed_extensions: string[];
        allowed_content_types: string[];
        magic_rules: FileMagicRule[];
        max_size: number;
        preview_enabled: boolean;
        download_enabled: boolean;
        upload_enabled: boolean;
        dangerous: boolean;
        enabled: boolean;
        version: number;
        created_at?: string;
        updated_at?: string;
    };

    type FileTypePolicySaveParams = Omit<FileTypePolicy, "id" | "version" | "created_at" | "updated_at"> & {
        version?: number;
    };
}
