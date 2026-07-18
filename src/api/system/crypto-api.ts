import { post } from "@/plugin/request/api.ts";
import { request } from "@/plugin/request/http.ts";
import { useCryptoStore } from "@/plugin/store/modules/use-crypto-store.ts";

// =================================================
// 状态读取（供 http.ts 加解密使用）
// =================================================

export function isCryptoEnabled(): boolean {
    return useCryptoStore().enabled;
}

export function getServerPublicKey(): string | null {
    return useCryptoStore().server_public_key;
}

export function getClientPrivateKey(): string | null {
    return useCryptoStore().client_private_key;
}

// =================================================
// 初始化 / 获取密钥
// =================================================

/**
 * 初始化加解密配置
 * 应用启动时调用，从后端获取加解密开关和服务端公钥
 */
export async function initCrypto(): Promise<void> {
    try {
        const data = await request<{ enabled: boolean; server_public_key: string | null }, "/api/system/crypto/config">(
            "/api/system/crypto/config",
            {
                method: "GET",
                loading: false
            }
        );
        useCryptoStore().setConfig(data);
        console.log(`[Crypto] 初始化完成: enabled=${data.enabled}`);
    } catch (e) {
        console.warn("[Crypto] 初始化失败，加解密已禁用:", e);
        useCryptoStore().setConfig({ enabled: false, server_public_key: null });
    }
}

/**
 * 获取客户端私钥
 * 登录后调用，用于解密响应的 AES 密钥
 */
export async function fetchClientPrivateKey(): Promise<void> {
    if (!isCryptoEnabled()) return;
    try {
        const data = await request<{ private_key: string | null }, "/api/system/crypto/keypair/client-private">(
            "/api/system/crypto/keypair/client-private",
            {
                method: "GET",
                loading: false
            }
        );
        useCryptoStore().setClientPrivateKey(data.private_key);
        console.log("[Crypto] 客户端私钥已获取");
    } catch (e) {
        console.warn("[Crypto] 获取客户端私钥失败:", e);
    }
}

// =================================================
// 密钥管理 API
// =================================================

export const CryptoApi = {
    /**
     * 生成 RSA 密钥对（服务端 + 客户端）
     * 需要 ROLE_DEV_OPS 权限
     */
    generateKeyPair(): Promise<Record<string, string>> {
        return post("/api/system/crypto/keypair/generate");
    },
    /**
     * 刷新加解密密钥状态
     * 需要 ROLE_DEV_OPS 权限
     */
    refreshKeys(): Promise<void> {
        return post("/api/system/crypto/keypair/refresh");
    }
};
