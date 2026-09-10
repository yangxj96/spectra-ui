export {};

declare global {
    type SecretCategory = "APPLICATION_CRYPTO" | "BUSINESS_CREDENTIAL" | "SECURITY_SIGNING";
    type SecretVersionState = "PENDING" | "ACTIVE" | "RETIRED" | "REVOKED" | "DESTROYED";

    interface SecretDefinitionVO {
        code: string;
        name: string;
        category: SecretCategory;
        value_type: string;
        owner_module: string;
        description?: string;
        mutable: boolean;
        hot_reload: boolean;
        exportable: boolean;
        active_version?: number;
        pending_count: number;
        active_fingerprint?: string;
        updated_at?: string;
    }

    interface SecretVersionVO {
        id: string;
        version_no: number;
        state: SecretVersionState;
        cipher_algorithm: string;
        fingerprint: string;
        source: string;
        effective_at?: string;
        retired_at?: string;
        created_at?: string;
    }

    interface SecretExportVO {
        file_name: string;
        package_base64: string;
        one_time_passphrase: string;
        entry_count: number;
    }

    interface SecretImportPreviewEntry {
        code: string;
        category: SecretCategory;
        version: number;
        fingerprint: string;
        registered: boolean;
    }

    interface SecretImportPreviewVO {
        valid: boolean;
        entry_count: number;
        entries: SecretImportPreviewEntry[];
        conflicts: string[];
    }

    interface SecretManagementSettingsVO {
        crypto_enabled: boolean;
        crypto_ready: boolean;
        crypto_state: "DISABLED" | "READY" | "UNAVAILABLE";
    }
}
