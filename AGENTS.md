# AGENTS.md

## Project

Vue 3 SPA admin panel (光谱后端管理系统). TypeScript, Vite, Element Plus, Pinia, Vue Router.

## Quick Commands

- `pnpm start` — dev server (**runs format + lint:fix + type-check first** via `prestart` hook)
- `pnpm run build` — production build
- `pnpm run lint` — ESLint (cached)
- `pnpm run lint:fix` — ESLint + auto-fix
- `pnpm run format` — Prettier
- `pnpm run type-check` — vue-tsc (composite false)
- `pnpm run test` — Vitest single run
- `pnpm run test:watch` — Vitest watch

Verification order: `format → lint:fix → type-check → test`

## Toolchain

- Node 24.14.0, pnpm 11.0.9 (managed via `mise.toml`)
- npm registry: `registry.npmmirror.com` (taobao mirror, `.npmrc`)
- Vite 8, Vue 3.5, TypeScript 5.9, ESLint 9, Prettier 3
- Tests: Vitest 4 + happy-dom + @vue/test-utils + @pinia/testing

## Code Style

- **4-space indent**, no tabs. Double quotes. Semicolons. 120 char line width.
- `endOfLine: lf`. `arrowParens: avoid`. `trailingComma: none`.
- Path alias: `@` → `src/`

## ESLint Rules (enforced)

- `no-any` — zero tolerance for `any` types
- `consistent-type-imports` — use `import type` (inline style: `import { type Foo }`)
- `import/order` — groups: builtin → external → internal (`@/**`) → parent → sibling → index → type. Alphabetical within groups. Newlines between groups.
- `import/no-cycle` — no circular dependencies
- Vue SFC block order: `<script>` → `<template>` → `<style>`
- Vue components in template: **PascalCase**
- Views (`src/views/**`): single-word component names allowed (e.g., `Login.vue`)
- Max function length: 200 lines. Max params: 4. No nested ternary.

## Project Structure

```
src/
  api/            # API modules (auth/, common/, system/, user/)
  assets/         # Static assets
  components/     # Shared components (DictSelect, FileUpload, IconPicker, etc.)
  converter/      # Data converters (entity → display format)
  directive/      # Custom Vue directives (v-owner)
  hooks/          # Composables (useTable, useFileUpload)
  plugin/
    element/      # Element Plus theme/scss overrides
    request/      # HTTP client (http.ts, api.ts, auth.ts, cache.ts)
    router/       # Vue Router config
    store/        # Pinia stores (modules: app, dict, props, user)
  utils/          # Utilities (common, crypto, message, route, verify)
  views/          # Page components (Dashboard, Login, Monitor, System, Example, Common)
types/            # Global .d.ts type declarations
tests/            # Test files (flat, no subdirs)
```

## HTTP Client

Custom `request()` in `src/plugin/request/http.ts` — not Axios. Key features:

- Token auto-refresh on 401
- Request deduplication (inflight map) and abort on re-request
- Priority queue: `high`(10) / `normal`(6) / `low`(2) concurrent limits
- Optional caching and retry
- Path params via template literals: `request("/api/users/{id}", { pathParams: { id } })`
- FormData upload auto-converts snake_case keys to camelCase

API helpers: `get()`, `post()`, `put()`, `del()`, `upload()`, `download()` in `src/plugin/request/api.ts`.

## Testing

- Test files live in `tests/` (flat), named `*.test.ts`
- Setup file: `tests/setup.ts` — stubs `RouterLink` globally
- Tests use `createTestingPinia`, `@vue/test-utils` mount, and `vi.mock` for stores
- Run single test: `pnpm run test -- DictSelect` (vitest name filter)

## Env Variables

- `VITE_API_URL` — backend API base URL
- `VITE_WEB_TITLE` — page title
- Dev defaults in `.env` (https://127.0.0.1:4004/), prod override in `.env.production`

## Gotchas

- `pnpm start` auto-runs format, lint, and type-check before starting the dev server (via `prestart` script). Don't manually chain these.
- `pnpm-workspace.yaml` exists but only configures `allowBuilds` — this is NOT a monorepo.
- Views use `vue/block-order` rule: script must come before template in SFCs.
- `RequestOptions` type uses template literal types for type-safe path params — match the pattern when adding new API functions.
- The `RequestOptions` generic `U extends string` threads the URL string through for path param type inference.
