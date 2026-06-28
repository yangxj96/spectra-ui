import { decryptAesGcm, encryptAesGcm } from "./aes-utils";
import { base64ToBytes, decryptAesKey, importRsaOaepPublicKey, importRsaPublicKey, toBufferSource } from "./ras-utils";

/**
 * 一键解密：RSA 解密 AES 密钥 + AES-GCM 解密业务数据
 */
export async function decrypt(key: string, data: string, ivHex: string, privateKeyBase64: string): Promise<string> {
    const aesKeyBytes = await decryptAesKey(key, privateKeyBase64);
    return await decryptAesGcm(data, aesKeyBytes, ivHex);
}

/**
 * 一键加密：生成随机 AES 密钥 + AES-GCM 加密业务数据 + RSA 加密 AES 密钥
 */
export async function encrypt(
    data: string,
    ivHex: string,
    publicKeyBase64: string
): Promise<{ encryptedData: string; encryptedKey: string }> {
    // 生成随机 AES 密钥（256 位）
    const aesKeyBytes = crypto.getRandomValues(new Uint8Array(32));

    // AES-GCM 加密业务数据
    const encryptedData = await encryptAesGcm(data, aesKeyBytes, ivHex);

    // RSA-OAEP 加密 AES 密钥
    const publicKey = await importRsaOaepPublicKey(publicKeyBase64);
    const encryptedKeyBuffer = await crypto.subtle.encrypt(
        {
            name: "RSA-OAEP"
        } as RsaOaepParams,
        publicKey,
        toBufferSource(aesKeyBytes)
    );

    // 转为 Base64
    const encryptedKey = btoa(String.fromCharCode(...new Uint8Array(encryptedKeyBuffer)));

    return { encryptedData, encryptedKey };
}

/**
 * 生成随机 IV（HEX 格式）
 */
export function generateIv(): string {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    return Array.from(iv)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * RSA-PSS 验签
 */
export async function verifySignature(
    signatureBase64: string,
    dataString: string,
    publicKeyBase64: string
): Promise<boolean> {
    const publicKey = await importRsaPublicKey(publicKeyBase64);
    const signature = base64ToBytes(signatureBase64);
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);

    return await crypto.subtle.verify(
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
            saltLength: 32
        },
        publicKey,
        toBufferSource(signature),
        data
    );
}
