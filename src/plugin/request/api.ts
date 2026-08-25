import { request } from "./http";

/**
 * 发起 GET 请求
 * @param url 请求路径（支持路径参数模板）
 * @param params 查询参数
 * @param options 额外请求选项
 */
export function get<T, U extends string = string>(
    url: U,
    params?: Record<string, unknown>,
    options?: RequestOptions<U>
) {
    return request<T, U>(url, {
        method: "GET",
        params,
        ...options
    });
}

/**
 * 发起 POST 请求
 * @param url 请求路径
 * @param data 请求体（自动 JSON 序列化）
 * @param options 额外请求选项
 */
export function post<T, U extends string = string>(url: U, data?: unknown, options?: RequestOptions<U>) {
    return request<T, U>(url, {
        method: "POST",
        body: JSON.stringify(data),
        ...options
    });
}

/**
 * 发起 PUT 请求
 * @param url 请求路径
 * @param data 请求体（自动 JSON 序列化）
 * @param options 额外请求选项
 */
export function put<T, U extends string = string>(url: U, data?: unknown, options?: RequestOptions<U>) {
    return request<T, U>(url, {
        method: "PUT",
        body: JSON.stringify(data),
        ...options
    });
}

/**
 * 发起 DELETE 请求
 * @param url 请求路径
 * @param params 查询参数
 * @param options 额外请求选项
 */
export function del<T, U extends string = string>(
    url: U,
    params?: Record<string, unknown>,
    options?: RequestOptions<U>
) {
    return request<T, U>(url, {
        method: "DELETE",
        params,
        ...options
    });
}

/**
 * 下载文件
 * @param url 下载路径
 * @param options 额外请求选项
 * @returns Blob 数据
 */
export async function download<U extends string = string>(url: U, options?: RequestOptions<U>) {
    return await request<Blob, U>(url, {
        method: "GET",
        ...options,
        download: true
    });
}
