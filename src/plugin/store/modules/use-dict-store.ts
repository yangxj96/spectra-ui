import PQueue from "p-queue";
import { defineStore } from "pinia";

import { DictApi } from "@/api/system/dict-api.ts";

/** 串行队列，确保同一时刻只有一个字典请求在执行 */
const serialQueue = new PQueue({ concurrency: 1 });

/** 字典缓存所属会话代数；身份切换后旧响应不能写回新会话。 */
let dictScopeGeneration = 0;

/** 字典加载失败；页面必须展示失败而不是伪装成空选项。 */
export class DictLoadError extends Error {
    readonly dictCode: string;

    constructor(dictCode: string, message = "获取字典数据失败") {
        super(message);
        this.name = "DictLoadError";
        this.dictCode = dictCode;
    }
}

/**
 * 字典缓存 Store
 * 使用串行队列（concurrency=1）防止并发重复请求同一字典组
 */
export const useDictStore = defineStore("dict", {
    state: (): StoreDict => ({
        dicts: {},
        errors: {}
    }),
    actions: {
        /**
         * 获取字典数据
         * @param key 字典组KEY
         * @throws {DictLoadError} 请求失败时抛出，调用方必须展示可恢复的失败状态
         */
        async getDictData(key: string): Promise<DictItem[]> {
            const generation = dictScopeGeneration;
            return serialQueue.add(async () => {
                const cached = this.dicts[key];
                if (cached) {
                    return cached;
                }
                try {
                    const data = await DictApi.getDataByTypeCode(key);
                    if (generation !== dictScopeGeneration) return [];
                    this.dicts[key] = data ?? [];
                    delete this.errors[key];
                    return this.dicts[key];
                } catch (error) {
                    if (generation !== dictScopeGeneration) return [];
                    const message = error instanceof Error && error.message ? error.message : "获取字典数据失败";
                    this.errors[key] = message;
                    throw new DictLoadError(key, message);
                }
            });
        },
        /**
         * 重新获取字典项并替换缓存，供字典维护操作后刷新选择器状态。
         * @param key 字典组KEY
         */
        async refreshDictData(key: string): Promise<DictItem[]> {
            delete this.dicts[key];
            delete this.errors[key];
            return await this.getDictData(key);
        },
        /**
         * 根据字典组 key 和字典项 value 返回字典项对象 <br/>
         * 会自动尝试加载字典 <br/>
         * @param key 字典组的KEY
         * @param value 字典项的VALUE
         */
        async getDictItem(key: string, value: string): Promise<DictItem | undefined> {
            const dictItems = this.dicts[key] ?? (await this.getDictData(key));

            // 找不到就返回 undefined
            return dictItems.find(item => item.value === value);
        },
        /**
         * 根据字典组 key 和字典项 value 返回字典项对象 <br/>
         * 不会自动尝试加载字典 <br/>
         * @param key 字典组的KEY
         * @param value 字典项的VALUE
         */
        getDictItemSync(key: string, value: string | number): DictItem | undefined {
            return this.dicts[key]?.find(item => item.value === String(value));
        },
        /** 读取指定字典最近的加载错误，供选择器展示失败状态。 */
        getDictError(key: string): string | undefined {
            return this.errors[key];
        },
        /** 会话切换或退出时清空字典缓存、错误和排队中的请求。 */
        resetSessionScope(): void {
            dictScopeGeneration++;
            serialQueue.clear();
            this.dicts = {};
            this.errors = {};
        }
    }
});
