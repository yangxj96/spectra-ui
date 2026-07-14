import { AuthApi } from "@/api/auth/auth-api";
import { useUserStore } from "@/plugin/store/modules/use-user-store";

let refreshing = false;
let queue: (() => void)[] = [];

export function getToken(): string | null {
    const token = useUserStore().token.access_token;
    return token || null;
}

export async function refreshToken(): Promise<Token | null> {
    const store = useUserStore();
    const refreshTokenValue = store.token.refresh_token;

    if (!refreshTokenValue) {
        return null;
    }

    if (refreshing) {
        return new Promise(resolve => {
            queue.push(() => resolve(store.token));
        });
    }

    refreshing = true;

    try {
        const newToken = await AuthApi.refresh(refreshTokenValue);

        store.token = newToken;

        queue.forEach(cb => cb());
        queue = [];

        return newToken;
    } catch {
        queue = [];
        return null;
    } finally {
        refreshing = false;
    }
}

export async function validateToken(): Promise<boolean> {
    const store = useUserStore();

    if (!store.token.refresh_token) {
        return false;
    }

    const newToken = await refreshToken();

    return newToken !== null;
}
