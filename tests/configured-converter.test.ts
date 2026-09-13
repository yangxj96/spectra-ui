import { describe, expect, it } from "vitest";

import { configuredConverter } from "@/converter/configured-converter.ts";

describe("秘密系统配置", () => {
    const secret: ConfiguredPageVO = {
        id: "secret-id",
        key: "user.default-password",
        value: null,
        type: "SECRET",
        dict_code: "",
        remarks: "新建、导入和管理员重置用户使用的默认密码",
        configured: true
    };

    it("回显时不带出服务端的秘密值", () => {
        expect(configuredConverter.toForm(secret).value).toBe("");
    });

    it("空值仍以空字符串提交，以便服务端保留已配置秘密", () => {
        expect(configuredConverter.toDTO(configuredConverter.toForm(secret))).toMatchObject({
            key: "user.default-password",
            type: "SECRET",
            value: ""
        });
    });
});
