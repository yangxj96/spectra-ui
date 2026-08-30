import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestBinary } from "@/plugin/request/http";
import { useUserStore } from "@/plugin/store/modules/use-user-store";

class FakeUpload {
    onprogress: ((event: ProgressEvent) => void) | null = null;
}

class FakeXhr {
    static instances: FakeXhr[] = [];
    readonly upload = new FakeUpload();
    withCredentials = true;
    timeout = 0;
    status = 204;
    statusText = "No Content";
    responseText = "";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    ontimeout: (() => void) | null = null;
    onabort: (() => void) | null = null;
    opened?: { method: string; url: string };
    readonly requestHeaders = new Map<string, string>();

    constructor() {
        FakeXhr.instances.push(this);
    }

    open(method: string, url: string): void {
        this.opened = { method, url };
    }

    setRequestHeader(name: string, value: string): void {
        this.requestHeaders.set(name, value);
    }

    getAllResponseHeaders(): string {
        return 'ETag: "part-etag"\r\n';
    }

    send(body: unknown): void {
        expect(body).toBeInstanceOf(Blob);
        this.upload.onprogress?.({ lengthComputable: true, loaded: 10, total: 10 } as ProgressEvent);
        this.onload?.();
    }

    abort(): void {
        this.onabort?.();
    }
}

describe("统一二进制请求适配器", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        useUserStore().token = { access_token: "access-token", permissions: [] } as Token;
        document.cookie = "XSRF-TOKEN=csrf-token; path=/";
        FakeXhr.instances = [];
        vi.stubGlobal("XMLHttpRequest", FakeXhr);
    });

    it("Local PUT 使用项目认证、CSRF 和上传进度", async () => {
        const progress = vi.fn();
        await requestBinary("/api/file/uploads/123/parts/1/content", new Blob(["data"]), {
            headers: { "Content-Type": "application/octet-stream" },
            onUploadProgress: progress
        });
        const xhr = FakeXhr.instances[0];
        expect(xhr.withCredentials).toBe(true);
        expect(xhr.requestHeaders.get("Authorization")).toBe("Bearer access-token");
        expect(xhr.requestHeaders.get("X-XSRF-TOKEN")).toBe("csrf-token");
        expect(xhr.requestHeaders.get("Api-Version")).toBe("1.0.0");
        expect(progress).toHaveBeenCalledWith(10, 10);
    });

    it("presigned PUT 不附带项目认证和 Cookie", async () => {
        await requestBinary("https://storage.example/upload", new Blob(["data"]), {
            external: true,
            headers: { "Content-Type": "application/octet-stream" }
        });
        const xhr = FakeXhr.instances[0];
        expect(xhr.withCredentials).toBe(false);
        expect(xhr.requestHeaders.has("Authorization")).toBe(false);
        expect(xhr.requestHeaders.has("Api-Version")).toBe(false);
        expect(xhr.requestHeaders.has("X-XSRF-TOKEN")).toBe(false);
    });
});
