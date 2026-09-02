export {};

declare global {
    type SystemInitializationStatus = {
        state: "UNINITIALIZED" | "INITIALIZING" | "INITIALIZED";
        initialized: boolean;
        initialization_required: boolean;
    };

    type SystemInitializationStartFrom = {
        username: string;
        password: string;
        real_name: string;
        system_name: string;
        system_short_name: string;
        system_logo: string;
        default_locale: "zh-CN" | "en-US";
        default_timezone: string;
        security_profile: "STANDARD" | "STRICT";
    };

    type SystemInitializationStartVO = {
        initialization_id: string;
    };

    type SystemInitializationCompleteFrom = {
        initialization_id: string;
    };
}
