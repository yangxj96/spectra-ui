import { describe, expect, it } from "vitest";

import { RequestCancelledError } from "@/plugin/request/error";
import { isRetryable } from "@/views/Devops/File/Upload/file-upload-retry";
import { FileUploadStore } from "@/views/Devops/File/Upload/file-upload-store";

describe("upload resume identity isolation", () => {
    it("includes the session owner in resume keys", () => {
        const first = FileUploadStore.key("user-a", 1024, "A".repeat(64));
        const second = FileUploadStore.key("user-b", 1024, "a".repeat(64));

        expect(first).toBe(`user-a:1024:${"a".repeat(64)}`);
        expect(second).not.toBe(first);
        expect(new FileUploadStore("spectra-file-upload", "user-a").scope).toBe("user-a");
    });
});

describe("upload retry classification", () => {
    it("does not retry canceled or client errors", () => {
        expect(isRetryable(new RequestCancelledError())).toBe(false);
        expect(isRetryable({ status: 403 })).toBe(false);
        expect(isRetryable({ status: 409 })).toBe(false);
    });

    it("retries network, server and throttling failures", () => {
        expect(isRetryable(new Error("network down"))).toBe(true);
        expect(isRetryable({ status: 500 })).toBe(true);
        expect(isRetryable({ status: 504 })).toBe(true);
        expect(isRetryable({ status: 429 })).toBe(true);
    });
});
