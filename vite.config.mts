import { readFileSync } from "node:fs";
import { resolve } from "path";

import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig, loadEnv, minify as minifyWithOxc } from "vite";
import viteCompression from "vite-plugin-compression2";

function stripProductionConsole() {
    return {
        name: "strip-production-console",
        apply: "build" as const,
        async renderChunk(code: string, chunk: { fileName: string }) {
            const normalizedCode = code
                .replaceAll("window.console", "console")
                .replace(/\bconsole\.(log|debug|info|warn|error|trace)\.apply\([^;{}]*\)/g, "void 0");
            const result = await minifyWithOxc(chunk.fileName, normalizedCode, {
                compress: {
                    dropConsole: true
                },
                mangle: false,
                codegen: false
            });
            return {
                code: result.code.replace(/\bconsole\.(log|debug|info|warn|error|trace)\b/g, "(() => {})"),
                map: null
            };
        }
    };
}

export default defineConfig(({ mode }) => {
    const root = process.cwd();
    const env = loadEnv(mode, root);
    if (mode === "development") {
        console.log("环境变量:", env);
    }
    const srcPath = resolve(__dirname, "src");
    const localHttps = process.env.SSL_PASSWORD
        ? {
              passphrase: process.env.SSL_PASSWORD,
              pfx: readFileSync(resolve(__dirname, "../spectra-admin/files/ssl/keystore.p12"))
          }
        : undefined;
    return {
        base: "/",
        plugins: [
            vue(),
            vueJsx(),
            // 生产环境压缩
            mode === "production" &&
                viteCompression({
                    threshold: 10240,
                    algorithms: ["gzip", "brotliCompress"]
                }),
            mode === "production" && stripProductionConsole()
        ].filter(Boolean),
        resolve: {
            alias: {
                "@": srcPath,
                "@form-create/component-wangeditor": resolve(
                    __dirname,
                    "vendor/form-create-component-wangeditor-disabled/index.js"
                ),
                "@yangxj96/logicflow-plugin-flowable/style.css": resolve(
                    __dirname,
                    "../logicflow-plugin-flowable/dist/index.css"
                ),
                "@yangxj96/logicflow-plugin-flowable": resolve(__dirname, "../logicflow-plugin-flowable/src")
            }
        },
        server: {
            https: localHttps,
            port: 5173
        },
        css: {
            preprocessorOptions: {
                scss: {
                    quietDeps: true
                }
            }
        },
        // 构建时配置
        build: {
            chunkSizeWarningLimit: 1500,
            rolldownOptions: {
                output: {
                    minify:
                        mode === "production"
                            ? {
                                  compress: {
                                      dropConsole: true
                                  },
                                  mangle: true
                              }
                            : false,
                    entryFileNames: "js/[name]-[hash].js",
                    chunkFileNames: "js/[name]-[hash].js",
                    assetFileNames: "[ext]/[name]-[hash][extname]",
                    manualChunks(moduleId) {
                        const normalizedId = moduleId.replaceAll("\\", "/");
                        if (normalizedId.includes("/logicflow-plugin-flowable/")) {
                            return "flowable-plugin";
                        }
                        if (normalizedId.includes("/@logicflow/core/")) {
                            return "logicflow-core";
                        }
                        if (normalizedId.includes("/@logicflow/extension/")) {
                            return "logicflow-extension";
                        }
                        if (normalizedId.includes("/@form-create/") || normalizedId.includes("/codemirror/")) {
                            return "form-designer";
                        }
                        if (normalizedId.includes("/echarts/") || normalizedId.includes("/zrender/")) {
                            return "charts";
                        }
                        return undefined;
                    }
                }
            }
        },
        test: {
            environment: "happy-dom",
            silent: false,
            reporters: "default",
            include: ["tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
            globals: true,
            setupFiles: "./tests/setup.ts",
            alias: {
                "@": srcPath
            },
            coverage: {
                provider: "v8",
                reporter: ["text", "json", "html"]
            }
        }
    };
});
