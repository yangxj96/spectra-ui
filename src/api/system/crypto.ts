import { post } from "@/plugin/request/api.ts";
import { request } from "@/plugin/request/http.ts";
import { useCryptoStore } from "@/plugin/store/modules/use-crypto-store.ts";

/**
 * 是否启用请求加解密（前端本地开关，优先级低于后端 crypto.enabled）
 */
const CRYPTO_LOCAL_ENABLED = import.meta.env.VITE_CRYPTO_ENABLED === "true";

// =================================================
// 状态读取（供 http.ts 加解密使用）
// =================================================

export function isCryptoEnabled(): boolean {
    return useCryptoStore().enabled;
}

export function getServerPublicKey(): string | null {
    return useCryptoStore().serverPublicKey;
}

export function getClientPrivateKey(): string | null {
    return useCryptoStore().clientPrivateKey;
}

// =================================================
// 初始化 / 获取密钥
// =================================================

/**
 * 初始化加解密配置
 * 应用启动时调用，从后端获取加解密开关和服务端公钥
 */
export async function initCrypto(): Promise<void> {
    if (!CRYPTO_LOCAL_ENABLED) {
        console.log("[Crypto] 前端本地开关已关闭，跳过初始化");
        return;
    }
    try {
        const data = await request<{ enabled: boolean; serverPublicKey: string | null }, "/api/system/crypto/config">(
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
        useCryptoStore().setConfig({ enabled: false, serverPublicKey: null });
    }
}

/**
 * 获取客户端私钥
 * 登录后调用，用于解密响应的 AES 密钥
 */
export async function fetchClientPrivateKey(): Promise<void> {
    if (!isCryptoEnabled()) return;
    try {
        const data = await request<{ privateKey: string | null }, "/api/system/crypto/keypair/client-private">(
            "/api/system/crypto/keypair/client-private",
            {
                method: "GET",
                loading: false
            }
        );
        useCryptoStore().setClientPrivateKey(data.privateKey);
        console.log("[Crypto] 客户端私钥已获取");
    } catch (e) {
        console.warn("[Crypto] 获取客户端私钥失败:", e);
    }
}

// =================================================
// 密钥管理 API
// =================================================

export const cryptoApi = {
    /**
     * 生成 RSA 密钥对（服务端 + 客户端）
     * 需要 ROLE_DEV_OPS 权限
     */
    generateKeyPair(): Promise<Record<string, string>> {
        return post("/api/system/crypto/keypair/generate");
    }
};
