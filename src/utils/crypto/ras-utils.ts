// Description: 加密工具类,主要用于RSA算法的相关操作。
// Author : yangxj
// Created Date : 2020-11-26 14:33:00
// Modified By : yangxj
// Modified Date : 20210301 上午 10:49:52
export default class RASUtils {
    /**
     * 导入 RSA 私钥（PKCS#8 格式，Base64 编码）
     */
    async importRsaPrivateKey(base64Key: string): Promise<CryptoKey> {
        const keyData = this.base64ToBytes(base64Key);
        return await crypto.subtle.importKey(
            "pkcs8",
            this.toBufferSource(keyData),
            {
                name: "RSA-OAEP",
                hash: "SHA-256"
            },
            false,
            ["decrypt"]
        );
    }

    /**
     * 导入 RSA 公钥（X.509 格式，Base64 编码）
     */
    async importRsaPublicKey(base64Key: string): Promise<CryptoKey> {
        const keyData = this.base64ToBytes(base64Key);
        return await crypto.subtle.importKey(
            "spki",
            this.toBufferSource(keyData),
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: "SHA-256"
            },
            false,
            ["verify"]
        );
    }

    /**
     * RSA-PSS 验签
     */
    async verifySignature(signatureBase64: string, dataString: string, publicKeyBase64: string): Promise<boolean> {
        const publicKey = await this.importRsaPublicKey(publicKeyBase64);
        const signature = this.base64ToBytes(signatureBase64);
        const encoder = new TextEncoder();
        const data = encoder.encode(dataString);

        return await crypto.subtle.verify(
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: "SHA-256",
                saltLength: 32
            },
            publicKey,
            this.toBufferSource(signature),
            data
        );
    }

    /**
     * 使用 RSA-OAEP(SHA-256) 解密 AES 密钥
     */
    async decryptAesKey(encryptedKeyBase64: string, privateKeyBase64: string): Promise<Uint8Array> {
        const privateKey = await this.importRsaPrivateKey(privateKeyBase64);
        const encryptedKey = this.base64ToBytes(encryptedKeyBase64);

        const decryptedKey = await crypto.subtle.decrypt(
            {
                name: "RSA-OAEP",
                hash: "SHA-256"
            } as RsaOaepParams,
            privateKey,
            this.toBufferSource(encryptedKey)
        );

        return new Uint8Array(decryptedKey);
    }

    /**
     * Base64 转 Uint8Array
     */
    base64ToBytes(base64: string): Uint8Array {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Uint8Array 转 ArrayBuffer
     */
    toBufferSource(data: Uint8Array): ArrayBuffer {
        return new Uint8Array(data).buffer;
    }
}
