import { FileApi } from "@/api/system/file-api";
import { uploadBinary } from "@/plugin/request/upload";

import { FileUploadStore, type UploadResumeRecord } from "./file-upload-store";

export type FileUploadState =
    | "IDLE"
    | "ANALYZING"
    | "CREATING"
    | "UPLOADING"
    | "VERIFYING"
    | "READY"
    | "FAILED"
    | "CANCELED"
    | "EXPIRED";

export type FileUploadSnapshot = {
    state: FileUploadState;
    upload_id?: string;
    file_asset_id?: string;
    content_sha256?: string;
    analysis_progress: number;
    upload_progress: number;
    verification_progress: number;
    uploaded_bytes: number;
    completed_parts: number[];
    total_parts: number;
    error_code?: string;
    error_message?: string;
};

export type FileUploadClientOptions = {
    file_type_code: string;
    get_file_type_code?: () => string;
    store?: FileUploadStore;
    concurrency?: number;
    analysis_chunk_size?: number;
    max_part_retries?: number;
    onChange?: (snapshot: FileUploadSnapshot) => void;
};

const EMPTY_SNAPSHOT: FileUploadSnapshot = {
    state: "IDLE",
    analysis_progress: 0,
    upload_progress: 0,
    verification_progress: 0,
    uploaded_bytes: 0,
    completed_parts: [],
    total_parts: 0
};

/**
 * 统一 Local/S3 上传客户端。控制面始终调用 FileApi，二进制数据始终调用共享 upload adapter。
 */
export class FileUploadClient {
    private readonly options: Required<
        Pick<FileUploadClientOptions, "concurrency" | "analysis_chunk_size" | "max_part_retries">
    > &
        FileUploadClientOptions;
    private readonly store: FileUploadStore;
    private snapshotValue: FileUploadSnapshot = { ...EMPTY_SNAPSHOT };
    private readonly listeners = new Set<(snapshot: FileUploadSnapshot) => void>();
    private file?: File;
    private session?: UploadSession;
    private abortController?: AbortController;
    private analysisWorker?: Worker;
    private analysisWorkerId?: string;
    private runPromise?: Promise<void>;
    private workflowPromise?: Promise<FileUploadSnapshot>;
    private paused = false;
    private canceled = false;
    private resumeRequested = false;
    private activeFileTypeCode?: string;
    private readonly inFlightProgress = new Map<number, number>();

    constructor(options: FileUploadClientOptions) {
        this.options = {
            ...options,
            concurrency: options.concurrency ?? 3,
            analysis_chunk_size: options.analysis_chunk_size ?? 4 * 1024 * 1024,
            max_part_retries: options.max_part_retries ?? 3
        };
        this.store = options.store ?? new FileUploadStore();
    }

    get snapshot(): FileUploadSnapshot {
        return { ...this.snapshotValue, completed_parts: [...this.snapshotValue.completed_parts] };
    }

    subscribe(listener: (snapshot: FileUploadSnapshot) => void): () => void {
        this.listeners.add(listener);
        listener(this.snapshot);
        return () => this.listeners.delete(listener);
    }

    async start(file: File): Promise<FileUploadSnapshot> {
        if (this.workflowPromise) throw new Error("当前上传任务正在执行");
        this.workflowPromise = this.startWorkflow(file).finally(() => {
            this.workflowPromise = undefined;
        });
        return this.workflowPromise;
    }

    async resume(file: File, record: UploadResumeRecord): Promise<FileUploadSnapshot> {
        if (this.workflowPromise) throw new Error("当前上传任务正在执行");
        this.workflowPromise = this.resumeWorkflow(file, record).finally(() => {
            this.workflowPromise = undefined;
        });
        return this.workflowPromise;
    }

    private async startWorkflow(file: File): Promise<FileUploadSnapshot> {
        this.prepare(file);
        try {
            const sha256 = await this.analyze(file);
            if (this.canceled) return this.snapshot;
            return this.createAndUpload(file, sha256);
        } catch (error) {
            if (this.canceled) return this.snapshot;
            this.fail(errorCode(error), error instanceof Error ? error.message : "文件分析失败");
            throw error;
        }
    }

    private async resumeWorkflow(file: File, record: UploadResumeRecord): Promise<FileUploadSnapshot> {
        this.prepare(file);
        try {
            const sha256 = await this.analyze(file);
            if (this.canceled) return this.snapshot;
            const key = FileUploadStore.key(file.size, sha256);
            if (
                key !== record.key ||
                record.size !== file.size ||
                record.content_sha256.toLowerCase() !== sha256.toLowerCase()
            ) {
                await this.store.remove(record.key);
                this.change({
                    state: "FAILED",
                    error_code: "FILE_RESUME_FILE_MISMATCH",
                    error_message: "重新选择的文件与上传任务不一致"
                });
                return this.snapshot;
            }
            return this.createAndUpload(file, sha256, record.file_type_code);
        } catch (error) {
            if (this.canceled) return this.snapshot;
            this.fail(errorCode(error), error instanceof Error ? error.message : "恢复上传失败");
            throw error;
        }
    }

    private async createAndUpload(
        file: File,
        sha256: string,
        fileTypeCode: string = this.fileTypeCode()
    ): Promise<FileUploadSnapshot> {
        this.activeFileTypeCode = fileTypeCode;
        this.change({ content_sha256: sha256, analysis_progress: 100, state: "CREATING" });
        const session = await FileApi.createUpload({
            original_name: file.name,
            content_type: file.type || "application/octet-stream",
            size: file.size,
            content_sha256: sha256,
            file_type_code: fileTypeCode
        });
        if (this.canceled) {
            if (session.upload_id) {
                try {
                    await FileApi.cancel(session.upload_id);
                } catch {
                    // 创建请求与取消请求并发时，服务端 TTL 扫描负责最终清理。
                }
            }
            return this.snapshot;
        }
        this.session = session;
        this.applySession(session);
        if (session.result === "DEDUPLICATED" || session.status === "READY") {
            await this.store.remove(FileUploadStore.key(file.size, sha256));
            return this.snapshot;
        }
        await this.persistResumeRecord(file, sha256, session, fileTypeCode);
        this.startUploadRun(session);
        await this.runPromise;
        return this.snapshot;
    }

    private prepare(file: File): void {
        this.file = file;
        this.session = undefined;
        this.paused = false;
        this.canceled = false;
        this.resumeRequested = false;
        this.activeFileTypeCode = undefined;
        this.inFlightProgress.clear();
        this.change({
            state: "ANALYZING",
            analysis_progress: 0,
            upload_progress: 0,
            verification_progress: 0,
            uploaded_bytes: 0,
            completed_parts: [],
            total_parts: 0,
            upload_id: undefined,
            file_asset_id: undefined,
            content_sha256: undefined,
            error_code: undefined,
            error_message: undefined
        });
    }

    pause(): void {
        if (this.snapshotValue.state === "UPLOADING") {
            this.paused = true;
            this.abortController?.abort();
        }
    }

    resumeUpload(): void {
        if (!this.file || !this.session || !this.paused || this.snapshotValue.state !== "UPLOADING") return;
        this.resumeRequested = true;
        if (this.runPromise) return;
        this.paused = false;
        this.resumeRequested = false;
        this.startUploadRun(this.session);
    }

    async cancel(): Promise<void> {
        const state = this.snapshotValue.state;
        if (state === "VERIFYING" || state === "READY") {
            throw new Error("服务端最终复核期间不能取消已提交的文件");
        }
        if (!["ANALYZING", "CREATING", "UPLOADING"].includes(state)) return;
        this.canceled = true;
        this.paused = false;
        this.resumeRequested = false;
        if (this.analysisWorker && this.analysisWorkerId) {
            this.analysisWorker.postMessage({ type: "cancel", id: this.analysisWorkerId });
        }
        this.abortController?.abort();
        const session = this.session;
        if (session?.upload_id) {
            try {
                await FileApi.cancel(session.upload_id);
            } catch {
                // 任务取消请求可重试；本地先停止传输，清理任务由服务端 TTL 扫描兜底。
            }
        }
        if (this.file && this.snapshotValue.content_sha256) {
            await this.store.remove(FileUploadStore.key(this.file.size, this.snapshotValue.content_sha256));
        }
        this.change({ state: "CANCELED" });
    }

    private startUploadRun(session: UploadSession): void {
        this.runPromise = this.runUpload(session).finally(() => {
            this.runPromise = undefined;
            if (this.resumeRequested && this.paused && !this.canceled && this.snapshotValue.state === "UPLOADING") {
                this.resumeRequested = false;
                this.paused = false;
                this.startUploadRun(session);
            }
        });
    }

    private async runUpload(session: UploadSession): Promise<void> {
        if (!session.upload_id || !session.chunk_size || !session.total_parts) {
            this.fail("FILE_UPLOAD_CONFLICT", "服务端没有返回可上传的会话参数");
            return;
        }
        if (session.status === "EXPIRED") {
            this.change({ state: "EXPIRED", error_code: session.error_code });
            return;
        }
        const confirmed = new Set(session.completed_parts ?? []);
        const partNumbers = Array.from({ length: session.total_parts }, (_, index) => index + 1).filter(
            partNumber => !confirmed.has(partNumber)
        );
        this.change({ state: "UPLOADING", total_parts: session.total_parts });
        const next = { value: 0 };
        this.abortController = new AbortController();
        const workers = Array.from(
            { length: Math.min(this.options.concurrency, Math.max(1, partNumbers.length)) },
            async () => {
                while (next.value < partNumbers.length) {
                    if (this.paused || this.canceled) return;
                    const partNumber = partNumbers[next.value++];
                    await this.uploadPart(session, partNumber, confirmed);
                }
            }
        );
        try {
            await Promise.all(workers);
        } catch (error) {
            if (this.paused || this.canceled) return;
            this.fail(errorCode(error), error instanceof Error ? error.message : "分片上传失败");
            return;
        }
        if (this.paused || this.canceled) return;
        const completed = await FileApi.complete(session.upload_id);
        this.session = completed;
        this.applySession(completed);
        if (completed.status === "READY" && completed.file_asset_id) {
            await this.store.remove(FileUploadStore.key(this.file?.size ?? 0, this.snapshotValue.content_sha256 ?? ""));
            this.change({
                state: "READY",
                file_asset_id: completed.file_asset_id,
                upload_progress: 100,
                verification_progress: 100
            });
            return;
        }
        if (completed.status !== "VERIFYING") {
            this.fail(completed.error_code ?? "FILE_UPLOAD_CONFLICT", "服务端未进入最终复核");
            return;
        }
        await this.pollVerification(completed.upload_id);
    }

    private async uploadPart(session: UploadSession, partNumber: number, confirmed: Set<number>): Promise<void> {
        const file = this.file;
        if (!file || !session.upload_id || !session.chunk_size) throw new Error("上传文件不存在");
        const start = (partNumber - 1) * session.chunk_size;
        const blob = file.slice(start, Math.min(file.size, start + session.chunk_size));
        const partSha256 = await digestBlob(blob);
        let lastError: unknown;
        for (let attempt = 1; attempt <= this.options.max_part_retries; attempt++) {
            try {
                const target = await FileApi.target(session.upload_id, partNumber, {
                    part_size: blob.size,
                    part_sha256: partSha256
                });
                const response = await uploadBinary(target.url, blob, {
                    transport: session.transport_mode === "PRESIGNED" ? "PRESIGNED" : "LOCAL_PROXY",
                    headers: target.headers,
                    signal: this.abortController?.signal,
                    onProgress: loaded => {
                        this.inFlightProgress.set(partNumber, loaded);
                        this.updateProgress(session, confirmed);
                    }
                });
                const providerEtag = response.headers.get("etag") ?? undefined;
                await FileApi.confirm(session.upload_id, partNumber, {
                    part_size: blob.size,
                    part_sha256: partSha256,
                    provider_etag: providerEtag,
                    attempt: target.attempt
                });
                confirmed.add(partNumber);
                this.inFlightProgress.delete(partNumber);
                this.updateProgress(session, confirmed);
                await this.persistResumeRecord(
                    file,
                    this.snapshotValue.content_sha256 ?? partSha256,
                    {
                        ...session,
                        completed_parts: [...confirmed]
                    },
                    this.activeFileTypeCode ?? this.fileTypeCode()
                );
                return;
            } catch (error) {
                lastError = error;
                if (this.paused || this.canceled) throw error;
                if (attempt < this.options.max_part_retries) await wait(250 * attempt);
            }
        }
        throw lastError ?? new Error("分片上传失败");
    }

    private async pollVerification(uploadId: string | undefined): Promise<void> {
        if (!uploadId) throw new Error("上传任务 ID 缺失");
        this.change({ state: "VERIFYING" });
        while (!this.paused && !this.canceled) {
            await wait(1000);
            const session = await FileApi.status(uploadId);
            this.session = session;
            this.applySession(session);
            if (session.status === "READY" && session.file_asset_id) {
                await this.store.remove(
                    FileUploadStore.key(this.file?.size ?? 0, this.snapshotValue.content_sha256 ?? "")
                );
                this.change({
                    state: "READY",
                    file_asset_id: session.file_asset_id,
                    upload_progress: 100,
                    verification_progress: 100
                });
                return;
            }
            if (session.status === "EXPIRED") {
                this.change({ state: "EXPIRED", error_code: session.error_code });
                return;
            }
            if (session.status === "FAILED" || session.status === "CANCELED") {
                this.change({ state: session.status, error_code: session.error_code });
                return;
            }
        }
    }

    private async analyze(file: File): Promise<string> {
        const id = crypto.randomUUID();
        return new Promise<string>((resolve, reject) => {
            const worker = new Worker(new URL("../workers/file-hash.worker.ts", import.meta.url), { type: "module" });
            this.analysisWorker = worker;
            this.analysisWorkerId = id;
            const cleanup = () => worker.terminate();
            worker.onmessage = event => {
                const response = event.data as FileHashWorkerResponse;
                if (response.id !== id) return;
                if (response.type === "progress") {
                    this.change({
                        analysis_progress:
                            response.totalBytes === 0
                                ? 100
                                : Math.floor((response.processedBytes * 100) / response.totalBytes)
                    });
                } else if (response.type === "complete") {
                    cleanup();
                    this.analysisWorker = undefined;
                    resolve(response.sha256);
                } else if (response.type === "canceled" || response.type === "error") {
                    cleanup();
                    this.analysisWorker = undefined;
                    reject(new Error(response.type === "error" ? response.message : "文件分析已取消"));
                }
            };
            worker.onerror = event => {
                cleanup();
                this.analysisWorker = undefined;
                reject(new Error(event.message || "文件分析失败"));
            };
            worker.postMessage({ type: "hash", id, file, chunkSize: this.options.analysis_chunk_size });
        });
    }

    private applySession(session: UploadSession): void {
        const completed = session.completed_parts ?? [];
        const uploadedBytes = session.uploaded_bytes ?? 0;
        this.change({
            upload_id: session.upload_id,
            file_asset_id: session.file_asset_id,
            completed_parts: completed,
            uploaded_bytes: uploadedBytes,
            total_parts: session.total_parts ?? 0,
            upload_progress: this.uploadProgress(uploadedBytes, session),
            verification_progress: session.verification_progress ?? 0,
            state: mapSessionState(session.status),
            error_code: session.error_code
        });
    }

    private updateProgress(session: UploadSession, confirmed: Set<number>): void {
        if (!this.file || !session.chunk_size) return;
        let uploadedBytes = 0;
        for (const partNumber of confirmed) {
            uploadedBytes += Math.min(
                session.chunk_size,
                Math.max(0, this.file.size - (partNumber - 1) * session.chunk_size)
            );
        }
        for (const loaded of this.inFlightProgress.values()) uploadedBytes += loaded;
        const percent = this.file.size === 0 ? 100 : Math.min(100, Math.floor((uploadedBytes * 100) / this.file.size));
        this.change({
            uploaded_bytes: uploadedBytes,
            upload_progress: percent,
            completed_parts: [...confirmed].sort((a, b) => a - b)
        });
    }

    private uploadProgress(uploadedBytes: number, session: UploadSession): number {
        if (!session.total_parts || !this.file) return this.snapshotValue.upload_progress;
        if (this.file.size === 0) return 100;
        return Math.min(100, Math.floor((uploadedBytes * 100) / this.file.size));
    }

    private async persistResumeRecord(
        file: File,
        sha256: string,
        session: UploadSession,
        fileTypeCode: string = this.fileTypeCode()
    ): Promise<void> {
        if (!session.upload_id) return;
        await this.store.put({
            key: FileUploadStore.key(file.size, sha256),
            upload_id: session.upload_id,
            original_name: file.name,
            size: file.size,
            content_sha256: sha256,
            file_type_code: fileTypeCode,
            updated_at: Date.now()
        });
    }

    private change(update: Partial<FileUploadSnapshot>): void {
        this.snapshotValue = { ...this.snapshotValue, ...update };
        for (const listener of this.listeners) listener(this.snapshot);
        this.options.onChange?.(this.snapshot);
    }

    private fail(code: string, message: string): void {
        this.change({ state: "FAILED", error_code: code, error_message: message });
    }

    private fileTypeCode(): string {
        return this.options.get_file_type_code?.() ?? this.options.file_type_code;
    }
}

type FileHashWorkerResponse =
    | { type: "progress"; id: string; processedBytes: number; totalBytes: number }
    | { type: "complete"; id: string; sha256: string; totalBytes: number }
    | { type: "canceled"; id: string }
    | { type: "error"; id: string; message: string };

async function digestBlob(blob: Blob): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
}

function mapSessionState(status: UploadSession["status"]): FileUploadState {
    return status === "UPLOADING" ||
        status === "VERIFYING" ||
        status === "READY" ||
        status === "FAILED" ||
        status === "CANCELED" ||
        status === "EXPIRED"
        ? status
        : "FAILED";
}

function errorCode(error: unknown): string {
    if (typeof error === "object" && error !== null && "code" in error) {
        return String((error as { code?: string }).code ?? "FILE_UPLOAD_CONFLICT");
    }
    return "FILE_UPLOAD_CONFLICT";
}

function wait(milliseconds: number): Promise<void> {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}
