import { describe, expect, it } from "vitest";

import { IncrementalSha256 } from "@/workers/file-hash.worker";

describe("文件 SHA-256 增量摘要", () => {
    it("支持空文件和标准向量", () => {
        expect(new IncrementalSha256().digestHex()).toBe(
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        const hasher = new IncrementalSha256();
        hasher.update(new TextEncoder().encode("abc"));
        expect(hasher.digestHex()).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    });

    it("分多次更新时结果与一次更新一致", () => {
        const bytes = new Uint8Array(130_000);
        for (let index = 0; index < bytes.length; index++) bytes[index] = index % 251;
        const first = new IncrementalSha256();
        first.update(bytes);
        const second = new IncrementalSha256();
        for (let offset = 0; offset < bytes.length; offset += 97) second.update(bytes.slice(offset, offset + 97));
        expect(second.digestHex()).toBe(first.digestHex());
    });
});
