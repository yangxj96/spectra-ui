import { describe, expect, it } from "vitest";

import { HttpRequestError, parseResponseError } from "@/plugin/request/error.ts";

function response(body: unknown, status: number): Response {
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}

describe("request error contract", () => {
    it("reads the stable error_code instead of the legacy code", async () => {
        const parsed = await parseResponseError(
            response({ code: 409, msg: "conflict", error_code: "ENTITY_UPDATE_CONFLICT" }, 409)
        );
        expect(parsed).toEqual({
            status: 409,
            errorCode: "ENTITY_UPDATE_CONFLICT",
            message: "conflict"
        });
    });

    it("does not mine nested data for business errors", async () => {
        const parsed = await parseResponseError(
            response({ code: 200, data: { code: 409, msg: "nested conflict" } }, 500)
        );
        expect(parsed.errorCode).toBeUndefined();
        expect(parsed.message).toBe("系统内部错误，请联系管理员");
    });

    it("uses stable status text for empty error responses", async () => {
        const parsed = await parseResponseError(response("", 409));
        expect(parsed.errorCode).toBeUndefined();
        expect(parsed.message).toBe("请求状态冲突");
    });

    it("keeps plain text messages", async () => {
        expect((await parseResponseError(response("服务暂不可用", 503))).message).toBe("服务暂不可用");
    });

    it("constructs errors with errorCode and status", () => {
        const error = new HttpRequestError("conflict", "ENTITY_UPDATE_CONFLICT", 409);
        expect(error.errorCode).toBe("ENTITY_UPDATE_CONFLICT");
        expect(error.status).toBe(409);
    });
});
