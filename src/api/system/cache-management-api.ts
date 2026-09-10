import { get, post } from "@/plugin/request/api.ts";

const noCache = { cache: false } as const;

export const CacheManagementApi = {
    getOverview(options?: Pick<RequestOptions<"/api/cache/monitor/overview">, "loading">) {
        return get<CacheMonitorOverview>("/api/cache/monitor/overview", undefined, { ...options, ...noCache });
    },

    getRegions(options?: Pick<RequestOptions<"/api/cache/monitor/regions">, "loading">) {
        return get<CacheRegion[]>("/api/cache/monitor/regions", undefined, { ...options, ...noCache });
    },

    getSecurity(options?: Pick<RequestOptions<"/api/cache/monitor/security">, "loading">) {
        return get<SecurityRuntime>("/api/cache/monitor/security", undefined, { ...options, ...noCache });
    },

    getOperation(
        operationId: string,
        options?: Pick<RequestOptions<"/api/cache/admin/operations/{operationId}">, "loading">
    ) {
        return get<CacheOperation, "/api/cache/admin/operations/{operationId}">(
            "/api/cache/admin/operations/{operationId}",
            undefined,
            { ...options, ...noCache, pathParams: { operationId } }
        );
    },

    previewBusinessClear(data: Pick<CacheBusinessClearRequest, "region_codes" | "all_regions" | "all_instances">) {
        return post<CacheOperation>("/api/cache/admin/business/clear/preview", data);
    },

    clearBusiness(data: CacheBusinessClearRequest) {
        return post<CacheOperation>("/api/cache/admin/business/clear", data);
    },

    revokeSession(data: { user_id: string; client_type: string; reason: string; confirmed: boolean }) {
        return post<CacheOperation>("/api/cache/admin/security/session/revoke", data);
    },

    revokeAllSessions(data: { user_id: string; reason: string; confirmed: boolean }) {
        return post<CacheOperation>("/api/cache/admin/security/session/revoke-all", data);
    },

    searchSessionCandidates({ keyword }: SecurityTargetCandidateQuery) {
        return get<SecurityUserCandidate[]>("/api/cache/admin/security/session/candidates", { keyword }, noCache);
    },

    clearVerification(data: SecurityVerificationClearRequest) {
        return post<CacheOperation>("/api/cache/admin/security/verification/clear", data);
    },

    searchVerificationCandidates({ type, keyword }: SecurityVerificationCandidateQuery) {
        return get<SecurityVerificationCandidate[]>(
            "/api/cache/admin/security/verification/candidates",
            { type, keyword },
            noCache
        );
    },

    clearLoginFailure(data: { username: string; reason: string; confirmed: boolean }) {
        return post<CacheOperation>("/api/cache/admin/security/login-failure/clear", data);
    },

    searchLoginFailureCandidates({ keyword }: SecurityTargetCandidateQuery) {
        return get<SecurityUserCandidate[]>("/api/cache/admin/security/login-failure/candidates", { keyword }, noCache);
    },

    invalidateNonce(data: { nonce: string; reason: string; confirmed: boolean }) {
        return post<CacheOperation>("/api/cache/admin/security/nonce/invalidate", data);
    },

    invalidateAllNonces(data: { reason: string; confirmation_phrase: string }) {
        return post<CacheOperation>("/api/cache/admin/security/nonce/invalidate-all", data);
    }
};
