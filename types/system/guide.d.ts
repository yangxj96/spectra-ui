export {};

declare global {
    type SystemGuideStatus = {
        state: "PENDING" | "COMPLETED";
        completed: boolean;
        required: boolean;
    };

    type SystemGuideCompleteFrom = {
        root_department_name: string;
        root_department_region_id: string;
        root_department_region_name: string;
        root_department_type: number | undefined;
        crypto_enabled: boolean;
        notification_enabled: boolean;
        copyright_enabled: boolean;
        copyright_name: string;
        copyright_url: string;
    };
}
