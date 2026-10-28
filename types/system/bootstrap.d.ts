import type { components } from "@/api/generated/openapi.ts";

export {};

declare global {
    type SystemPublicConfig = Required<components["schemas"]["SystemPublicConfigVO"]> & {
        default_locale: "zh-CN" | "en-US";
    };

    type SystemBootstrap = {
        system: SystemPublicConfig;
        crypto: components["schemas"]["CryptoConfigVO"] & { enabled: boolean };
        initialization: SystemInitializationStatus;
    };
}
