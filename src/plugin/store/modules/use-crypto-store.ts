import { defineStore } from "pinia";

export const useCryptoStore = defineStore("crypto", {
    state: () => ({
        enabled: false,
        server_public_key: null as string | null,
        client_private_key: null as string | null
    }),
    actions: {
        setConfig(payload: { enabled: boolean; server_public_key: string | null }) {
            this.enabled = payload.enabled;
            this.server_public_key = payload.server_public_key;
        },
        setClientPrivateKey(key: string | null) {
            this.client_private_key = key;
        }
    },
    persist: {
        pick: ["enabled", "server_public_key"]
    }
});
