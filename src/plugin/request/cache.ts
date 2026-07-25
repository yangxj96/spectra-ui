interface CacheEntry {
    data: unknown;
    expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL = 5 * 60 * 1000;

export function getCache<T>(key: string): T | undefined {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return undefined;
    }
    return entry.data as T;
}

export function setCache(key: string, value: unknown, ttl = DEFAULT_TTL) {
    cache.set(key, { data: value, expiresAt: Date.now() + ttl });
}

export function clearCache() {
    cache.clear();
}
