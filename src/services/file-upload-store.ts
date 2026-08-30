export type UploadResumeRecord = {
    key: string;
    upload_id: string;
    original_name: string;
    size: number;
    content_sha256: string;
    file_type_code: string;
    updated_at: number;
};

const STORE_NAME = "upload_sessions";

/** 只保存可重新校验的上传元数据，不把 File 对象或本地分片状态当成事实源。 */
export class FileUploadStore {
    private readonly databaseName: string;
    private databasePromise?: Promise<IDBDatabase>;

    constructor(databaseName = "spectra-file-upload") {
        this.databaseName = databaseName;
    }

    async get(key: string): Promise<UploadResumeRecord | undefined> {
        const database = await this.database();
        return requestResult(database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key));
    }

    async list(): Promise<UploadResumeRecord[]> {
        const database = await this.database();
        const records = await requestResult(
            database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll()
        );
        const valid = records.filter(isValidRecord);
        if (valid.length !== records.length) {
            await Promise.all(records.filter(record => !isValidRecord(record)).map(record => this.remove(record?.key)));
        }
        return valid;
    }

    async put(record: UploadResumeRecord): Promise<void> {
        if (!isValidRecord(record)) throw new Error("invalid upload resume record");
        const database = await this.database();
        await requestResult(database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(record));
    }

    async remove(key: string | undefined): Promise<void> {
        if (!key) return;
        const database = await this.database();
        await requestResult(database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(key));
    }

    static key(size: number, contentSha256: string): string {
        return `${size}:${contentSha256.toLowerCase()}`;
    }

    private database(): Promise<IDBDatabase> {
        if (this.databasePromise) return this.databasePromise;
        if (typeof indexedDB === "undefined") return Promise.reject(new Error("当前浏览器不支持 IndexedDB"));
        this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(this.databaseName, 1);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    const store = database.createObjectStore(STORE_NAME, { keyPath: "key" });
                    store.createIndex("updated_at", "updated_at", { unique: false });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error("打开上传恢复存储失败"));
        });
        return this.databasePromise;
    }
}

function isValidRecord(value: Partial<UploadResumeRecord> | undefined): value is UploadResumeRecord {
    return (
        !!value &&
        typeof value.key === "string" &&
        typeof value.upload_id === "string" &&
        typeof value.original_name === "string" &&
        Number.isSafeInteger(value.size) &&
        value.size >= 0 &&
        typeof value.content_sha256 === "string" &&
        /^[0-9a-f]{64}$/i.test(value.content_sha256) &&
        typeof value.file_type_code === "string" &&
        Number.isFinite(value.updated_at)
    );
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB 请求失败"));
    });
}
