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
    };

    type SystemInitializationStartVO = {
        initialization_id: string;
        enrollment_id: string;
        provisioning_uri: string;
        secret: string;
        expires_at: number;
    };

    type SystemInitializationMfaConfirmFrom = {
        initialization_id: string;
        enrollment_id: string;
        code: string;
    };

    type SystemInitializationMfaConfirmVO = {
        recovery_codes: string[];
    };

    type SystemInitializationCompleteFrom = {
        initialization_id: string;
    };
}
