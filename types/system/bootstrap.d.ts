export {};

declare global {
    type SystemPublicConfig = {
        name: string;
        short_name: string;
        logo: string;
        default_locale: "zh-CN" | "en-US";
        default_timezone: string;
        copyright_enabled: boolean;
        copyright_name: string;
        copyright_url: string;
    };

    type SystemBootstrap = {
        system: SystemPublicConfig;
        crypto: {
            enabled: boolean;
            server_public_key: string | null;
        };
        initialization: SystemInitializationStatus;
    };
}
