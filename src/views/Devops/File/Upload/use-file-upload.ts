import { onBeforeUnmount, ref } from "vue";

import { useUserStore } from "@/plugin/store/modules/use-user-store";

import { FileUploadClient, type FileUploadClientOptions, type FileUploadSnapshot } from "./file-upload-client";
import { FileUploadStore, type UploadResumeRecord } from "./file-upload-store";

export function useFileUpload(options: FileUploadClientOptions) {
    const store = options.store ?? new FileUploadStore("spectra-file-upload", useUserStore().token.id || "anonymous");
    const snapshot = ref<FileUploadSnapshot>({
        state: "IDLE",
        analysis_progress: 0,
        upload_progress: 0,
        verification_progress: 0,
        uploaded_bytes: 0,
        completed_parts: [],
        total_parts: 0
    });
    const client = new FileUploadClient({
        ...options,
        store,
        onChange: value => {
            snapshot.value = value;
            options.onChange?.(value);
        }
    });
    const unsubscribe = client.subscribe(value => {
        snapshot.value = value;
    });

    onBeforeUnmount(() => {
        client.dispose();
        unsubscribe();
    });

    return {
        client,
        snapshot,
        start: (file: File) => client.start(file),
        resume: (file: File, record: UploadResumeRecord) => client.resume(file, record),
        pause: () => client.pause(),
        resumeUpload: () => client.resumeUpload(),
        cancel: () => client.cancel(),
        listResumeRecords: () => store.list()
    };
}
