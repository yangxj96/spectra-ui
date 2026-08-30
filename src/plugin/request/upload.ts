import { requestBinary, type BinaryResponse } from "./http";

export type UploadTransport = "LOCAL_PROXY" | "PRESIGNED";

export type BinaryUploadOptions = {
    transport: UploadTransport;
    headers: Record<string, string>;
    signal?: AbortSignal;
    onProgress?: (loaded: number, total: number) => void;
};

/** 统一的分片二进制传输入口，业务服务不直接接触 XMLHttpRequest。 */
export function uploadBinary(url: string, body: Blob, options: BinaryUploadOptions): Promise<BinaryResponse> {
    return requestBinary(url, body, {
        headers: options.headers,
        external: options.transport === "PRESIGNED",
        signal: options.signal,
        onUploadProgress: options.onProgress
    });
}
