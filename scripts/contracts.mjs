import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import openapiTS, { astToString } from "openapi-typescript";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const actualPathInput = process.argv[3] ?? process.env.SPECTRA_OPENAPI_RAW ?? "../.temp/openapi.raw.json";
const actualPath = resolve(projectRoot, actualPathInput);
const specPath = resolve(projectRoot, "contracts/openapi.json");
const typesPath = resolve(projectRoot, "src/api/generated/openapi.ts");
const mode = process.argv[2];

if (mode !== "write" && mode !== "check") {
    throw new Error(
        "用法：pnpm run contract:generate|contract:check [实际 OpenAPI JSON 路径]，或设置 SPECTRA_OPENAPI_RAW"
    );
}

function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map(key => [key, canonical(value[key])])
        );
    }
    return value;
}

const actual = JSON.parse(await readFile(actualPath, "utf8"));
if (actual.openapi !== "3.1.0" || actual.info?.version !== "1.0.0") {
    throw new Error("实际 OpenAPI 版本不是 3.1.0 / API 1.0.0");
}
const spec = `${JSON.stringify(canonical(actual), null, 2)}\n`;
const types = astToString(await openapiTS(JSON.parse(spec)));

if (mode === "write") {
    await mkdir(dirname(specPath), { recursive: true });
    await mkdir(dirname(typesPath), { recursive: true });
    await writeFile(specPath, spec);
    await writeFile(typesPath, types);
    process.stdout.write(`已从 ${actualPath} 生成契约与类型。\n`);
} else {
    const [recorded, generated] = await Promise.all([readFile(specPath, "utf8"), readFile(typesPath, "utf8")]);
    if (recorded !== spec || generated !== types) {
        throw new Error("实际 OpenAPI、登记契约或生成 TypeScript 类型发生漂移，请重新导出并审查差异");
    }
    process.stdout.write("实际 OpenAPI 与登记契约、TypeScript 生成类型一致。\n");
}
