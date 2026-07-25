/** 缓存条目 */
interface CacheEntry {
    data: unknown;
    expiresAt: number;
}

/** 缓存存储 */
const cache = new Map<string, CacheEntry>();

/** 默认缓存有效期：5 分钟 */
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * 读取缓存
 * @param key 缓存键
 * @returns 缓存数据，过期或不存在时返回 undefined
 */
export function getCache<T>(key: string): T | undefined {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return undefined;
    }
    return entry.data as T;
}

/**
 * 写入缓存
 * @param key 缓存键
 * @param value 缓存数据
 * @param ttl 有效期（毫秒），默认 5 分钟
 */
export function setCache(key: string, value: unknown, ttl = DEFAULT_TTL) {
    cache.set(key, { data: value, expiresAt: Date.now() + ttl });
}

/**
 * 清空所有缓存
 */
export function clearCache() {
    cache.clear();
}
