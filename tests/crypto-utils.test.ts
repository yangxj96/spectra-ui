import { describe, expect, it } from "vitest";

import { decrypt, encrypt, generateIv, verifySignature } from "../src/utils/crypto/crypto-utils";
import { toBufferSource } from "../src/utils/crypto/ras-utils";

/**
 * 生成 RSA 测试密钥对
 */
async function generateTestKeyPair(): Promise<{ publicKeyBase64: string; privateKeyBase64: string }> {
    const keyPair = (await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256"
        },
        true,
        ["encrypt", "decrypt"]
    )) as CryptoKeyPair;

    // 导出公钥 (SPKI)
    const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(spki)));

    // 导出私钥 (PKCS#8)
    const pkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));

    return { publicKeyBase64, privateKeyBase64 };
}

describe("crypto-utils", () => {
    describe("generateIv", () => {
        it("应生成 24 字符的 HEX 字符串", () => {
            const iv = generateIv();
            expect(iv).toHaveLength(24);
            expect(/^[0-9a-f]{24}$/.test(iv)).toBe(true);
        });

        it("每次生成的 IV 应不同", () => {
            const iv1 = generateIv();
            const iv2 = generateIv();
            expect(iv1).not.toBe(iv2);
        });
    });

    describe("encrypt / decrypt", () => {
        it("加密后解密应返回原始数据", async () => {
            const { publicKeyBase64, privateKeyBase64 } = await generateTestKeyPair();

            const plaintext = JSON.stringify({ name: "测试数据", value: 12345 });
            const iv = generateIv();

            // 加密
            const { encryptedData, encryptedKey } = await encrypt(plaintext, iv, publicKeyBase64);

            expect(encryptedData).toBeTruthy();
            expect(encryptedKey).toBeTruthy();
            expect(encryptedData).not.toBe(plaintext);

            // 解密
            const decrypted = await decrypt(encryptedKey, encryptedData, iv, privateKeyBase64);
            expect(decrypted).toBe(plaintext);
            expect(JSON.parse(decrypted)).toEqual({ name: "测试数据", value: 12345 });
        });

        it("使用错误的私钥解密应失败", async () => {
            const { publicKeyBase64 } = await generateTestKeyPair();
            const { privateKeyBase64: wrongPrivateKey } = await generateTestKeyPair();

            const iv = generateIv();
            const { encryptedData, encryptedKey } = await encrypt("hello", iv, publicKeyBase64);

            await expect(decrypt(encryptedKey, encryptedData, iv, wrongPrivateKey)).rejects.toThrow();
        });
    });

    describe("verifySignature", () => {
        it("有效的签名应验证通过", async () => {
            const keyPair = (await crypto.subtle.generateKey(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256"
                },
                true,
                ["sign", "verify"]
            )) as CryptoKeyPair;

            // 导出公钥
            const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey);
            const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(spki)));

            // 签名
            const data = "test data to sign";
            const encoded = new TextEncoder().encode(data);
            const signatureBuffer = await crypto.subtle.sign(
                { name: "RSASSA-PKCS1-v1_5", saltLength: 32 },
                keyPair.privateKey,
                toBufferSource(new Uint8Array(encoded))
            );
            const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

            // 验证
            const isValid = await verifySignature(signatureBase64, data, publicKeyBase64);
            expect(isValid).toBe(true);
        });

        it("篡改数据后验签应失败", async () => {
            const keyPair = (await crypto.subtle.generateKey(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256"
                },
                true,
                ["sign", "verify"]
            )) as CryptoKeyPair;

            const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey);
            const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(spki)));

            const data = "original data";
            const encoded = new TextEncoder().encode(data);
            const signatureBuffer = await crypto.subtle.sign(
                { name: "RSASSA-PKCS1-v1_5", saltLength: 32 },
                keyPair.privateKey,
                toBufferSource(new Uint8Array(encoded))
            );
            const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

            // 用篡改过的数据验证
            const isValid = await verifySignature(signatureBase64, "tampered data", publicKeyBase64);
            expect(isValid).toBe(false);
        });
    });
});
