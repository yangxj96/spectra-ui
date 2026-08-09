import { resolve } from "path";

import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig, loadEnv } from "vite";
import viteCompression from "vite-plugin-compression2";

export default defineConfig(({ mode }) => {
    const root = process.cwd();
    const env = loadEnv(mode, root);
    if (mode === "development") {
        console.log("环境变量:", env);
    }
    const srcPath = resolve(__dirname, "src");
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
                })
        ].filter(Boolean),
        resolve: {
            alias: {
                "@": srcPath,
                "@yangxj96/logicflow-plugin-flowable/style.css": resolve(
                    __dirname,
                    "../logicflow-plugin-flowable/dist/index.css"
                ),
                "@yangxj96/logicflow-plugin-flowable": resolve(__dirname, "../logicflow-plugin-flowable/src")
            }
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
                    entryFileNames: "js/[name]-[hash].js",
                    chunkFileNames: "js/[name]-[hash].js",
                    assetFileNames: "[ext]/[name]-[hash][extname]"
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
