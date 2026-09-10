import { get, post } from "@/plugin/request/api.ts";
import { request } from "@/plugin/request/http.ts";

/** 密钥管理接口；后端会再次强制校验 ROLE_DEV_OPS。 */
export const SecretManagementApi = {
    getSettings(): Promise<SecretManagementSettingsVO> {
        return get<SecretManagementSettingsVO>("/api/security/secrets/settings");
    },

    setCryptoEnabled(enabled: boolean): Promise<SecretManagementSettingsVO> {
        return post<SecretManagementSettingsVO>("/api/security/secrets/settings/crypto", { enabled });
    },

    listDefinitions(): Promise<SecretDefinitionVO[]> {
        return get<SecretDefinitionVO[]>("/api/security/secrets/definitions");
    },

    listVersions(code: string): Promise<SecretVersionVO[]> {
        return get<SecretVersionVO[], "/api/security/secrets/{code}/versions">(
            "/api/security/secrets/{code}/versions",
            undefined,
            { pathParams: { code } }
        );
    },

    createVersion(code: string, value: string): Promise<SecretVersionVO> {
        return post<SecretVersionVO, "/api/security/secrets/{code}/versions">(
            "/api/security/secrets/{code}/versions",
            { value, source: "MANUAL" },
            { pathParams: { code } }
        );
    },

    publish(code: string, versionId: string): Promise<void> {
        return post<void, "/api/security/secrets/{code}/versions/{versionId}/publish">(
            "/api/security/secrets/{code}/versions/{versionId}/publish",
            { confirm: true },
            { pathParams: { code, versionId }, noBody: true }
        );
    },

    retire(code: string, versionId: string): Promise<void> {
        return post<void, "/api/security/secrets/{code}/versions/{versionId}/retire">(
            "/api/security/secrets/{code}/versions/{versionId}/retire",
            undefined,
            { pathParams: { code, versionId }, noBody: true }
        );
    },

    exportCurrent(category?: SecretCategory): Promise<SecretExportVO> {
        return post<SecretExportVO>("/api/security/secrets/export", category ? { category } : {});
    },

    previewImport(file: File, passphrase: string): Promise<SecretImportPreviewVO> {
        const form = new FormData();
        form.append("file", file);
        form.append("passphrase", passphrase);
        return request<SecretImportPreviewVO>("/api/security/secrets/import/preview", {
            method: "POST",
            body: form
        });
    },

    importPending(file: File, passphrase: string): Promise<number> {
        const form = new FormData();
        form.append("file", file);
        form.append("passphrase", passphrase);
        return request<number>("/api/security/secrets/import", {
            method: "POST",
            body: form
        });
    },

    refresh(): Promise<void> {
        return post<void>("/api/security/secrets/refresh", undefined, { noBody: true });
    }
};
