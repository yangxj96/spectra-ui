import { base64ToBytes, toBufferSource } from "./ras-utils";

/**
 * HEX 转 Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
}

/**
 * 导入 AES-GCM 密钥
 */
export async function importAesKey(keyBytes: Uint8Array): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
        "raw",
        toBufferSource(keyBytes),
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * AES-GCM 加密数据
 */
export async function encryptAesGcm(data: string, keyBytes: Uint8Array, ivHex: string): Promise<string> {
    const aesKey = await importAesKey(keyBytes);
    const iv = hexToBytes(ivHex);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);

    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: toBufferSource(iv)
        },
        aesKey,
        toBufferSource(new Uint8Array(encoded))
    );

    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

/**
 * AES-GCM 解密数据
 */
export async function decryptAesGcm(encryptedDataBase64: string, keyBytes: Uint8Array, ivHex: string): Promise<string> {
    const aesKey = await importAesKey(keyBytes);
    const encryptedData = base64ToBytes(encryptedDataBase64);
    const iv = hexToBytes(ivHex);

    const decryptedData = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: toBufferSource(iv)
        },
        aesKey,
        toBufferSource(encryptedData)
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
}
