import { defineStore } from "pinia";

/**
 * 加解密状态管理
 * 管理通信加密开关、服务端公钥、客户端私钥
 */
export const useCryptoStore = defineStore("crypto", {
    state: () => ({
        /** 是否启用通信加密 */
        enabled: false,
        /** 服务端 RSA 公钥（用于加密请求体、验证响应签名） */
        server_public_key: null as string | null,
        /** 客户端 RSA 私钥（用于解密响应、签名请求，不持久化） */
        client_private_key: null as string | null
    }),
    actions: {
        /** 设置加密配置（登录后由接口返回） */
        setConfig(payload: { enabled: boolean; server_public_key: string | null }) {
            this.enabled = payload.enabled;
            this.server_public_key = payload.server_public_key;
        },
        /** 设置客户端私钥（密钥交换完成后调用） */
        setClientPrivateKey(key: string | null) {
            this.client_private_key = key;
        }
    },
    persist: {
        // 私钥不持久化，仅保存开关和服务端公钥
        pick: ["enabled", "server_public_key"]
    }
});
