import { defineStore } from "pinia";

export const useCryptoStore = defineStore("crypto", {
    state: () => ({
        enabled: false,
        serverPublicKey: null as string | null,
        clientPrivateKey: null as string | null
    }),
    actions: {
        setConfig(payload: { enabled: boolean; serverPublicKey: string | null }) {
            this.enabled = payload.enabled;
            this.serverPublicKey = payload.serverPublicKey;
        },
        setClientPrivateKey(key: string | null) {
            this.clientPrivateKey = key;
        }
    },
    persist: {
        pick: ["enabled", "serverPublicKey"]
    }
});
