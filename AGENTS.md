# AGENTS.md
Guidance for autonomous coding agents working in `goey-toast-angular`.

## Scope and priorities
1. Keep the library (`src/lib`) stable and publishable.
2. Keep root tests and build green.
3. Treat `demo/` as a consumer app for manual validation and Pages deploy.
4. Prefer focused, minimal diffs over broad refactors.

## Repository map
- Library source: `src/lib/`
- Public entrypoint: `src/public-api.ts`
- Library barrel: `src/lib/public-api.ts`
- Library packaging config: `ng-package.json`
- Library tests: `src/**/*.spec.ts` (Vitest)
- Demo Angular app: `demo/`
- CI workflow: `.github/workflows/ci.yml`
- Demo Pages workflow: `.github/workflows/demo-pages.yml`
- Publish workflow: `.github/workflows/publish.yml`

## Toolchain and runtime
- Package manager: `npm`
- CI Node version: `22`
- Library build: `ng-packagr`
- Library tests: `vitest` + `@vitest/coverage-v8`
- Demo tests: Angular CLI + Karma + Jasmine
- TypeScript strict mode is enabled in root and demo tsconfig files.

## Install
- Root install (preferred): `npm ci`
- Root install (fallback): `npm install`
- Demo install: `npm --prefix demo ci`
- Generated artifacts are ignored: `dist/`, `coverage/`, `out-tsc/`, `node_modules/`

## Build, lint, and test commands

### Root library (primary quality gate)
- Build: `npm run build`
- Test all with coverage: `npm test`
- Test watch mode: `npm run test:watch`
- Publish precheck: `npm run prepublishOnly`

### Run a single root test (Vitest)
- Single spec file:
  - `npx vitest run src/lib/goey-toast.service.spec.ts`
- Single spec via npm script passthrough:
  - `npm test -- src/lib/goey-toast.service.spec.ts`
- Single test by name:
  - `npx vitest run src/lib/goey-toast.service.spec.ts -t "adds a success toast"`
- Watch one spec file:
  - `npx vitest src/lib/goey-toast.service.spec.ts`

### Demo app commands (secondary)
- Start dev server: `npm --prefix demo run start`
- Build demo: `npm --prefix demo run build`
- Build demo for GitHub Pages base href:
  - `npm --prefix demo run build -- --base-href /goey-toast-angular/`
- Run demo tests: `npm --prefix demo test`

### Run a single demo test (Karma/Angular CLI)
- Single spec once:
  - `npm --prefix demo test -- --watch=false --include="src/app/app.component.spec.ts"`
- Single spec in watch mode:
  - `npm --prefix demo test -- --include="src/app/app.component.spec.ts"`

### Linting and static checks in this repo
- There is currently no dedicated lint script in root or demo `package.json`.
- Do not invent ESLint or Prettier requirements not configured in this repo.
- Use practical static gates instead:
  - Root typecheck: `npx tsc -p tsconfig.lib.json --noEmit`
  - Demo compile/type gate: `npm --prefix demo run build -- --configuration development`

## Code style conventions

### Formatting
- Use 2-space indentation.
- Use semicolons in TypeScript.
- Use single quotes for TS strings.
- Keep trailing commas in multiline objects/arrays where idiomatic.
- Keep files UTF-8 with final newline.

### Imports
- Keep imports grouped by source:
  1) Angular/framework imports
  2) RxJS/third-party imports
  3) Local relative imports
- Keep imports explicit and minimal.
- Use wildcard exports only in established barrel files.

### Types and strictness
- Preserve `strict: true` assumptions.
- Prefer explicit interfaces/types for domain models.
- Use union types for constrained states and options.
- Prefer `unknown` over `any` for caught errors.
- Keep public API types exported through `src/lib/public-api.ts`.

### Naming
- Classes, services, components, interfaces, type aliases: `PascalCase`.
- Variables, functions, methods, properties: `camelCase`.
- Observable streams use `$` suffix (example: `toasts$`).
- Internal subjects may use `_` prefix (example: `_toasts`).
- Filenames use kebab-case plus Angular suffix patterns:
  - `*.service.ts`, `*.component.ts`, `*.types.ts`, `*.spec.ts`.

### Angular patterns
- Follow standalone component patterns already used here.
- Keep DI simple (`constructor` injection or `inject` when appropriate).
- Keep templates declarative; move complex logic to TS.
- Use `trackBy` for repeated lists when stable IDs exist.
- Keep `@Input` and public component APIs explicitly typed.

### RxJS and state
- Use `BehaviorSubject` when current value semantics are required.
- Expose read-only streams via `.asObservable()`.
- Keep state updates immutable (`map`, `filter`, spread copies).
- Keep timer cleanup explicit when creating async side effects.

### Error handling
- Do not silently swallow errors.
- If catching for side effects (toast/logging), rethrow unless intentionally handled.
- Keep async helpers transparent to callers about failures.
- Keep user-facing messages concise and actionable.

### CSS and template guidance
- Keep component styles colocated with the component.
- Prefer CSS custom properties for API-driven styling.
- Preserve accessibility attributes on interactive/announced UI.
- Avoid changing animation timing unless behavior requires it.

### Testing style
- Library specs use Vitest (`describe`, `it`, `expect`, `vi`).
- Name tests by behavior.
- For timer logic, use fake timers and restore real timers.
- Assert observable outputs from stable emissions.

## CI and release expectations
- Root CI pipeline is install -> `npm test` -> `npm run build`.
- Publish workflow also runs tests and build before `npm publish`.
- Breaking these commands is release-blocking.
- Keep package metadata compatible with release automation.

## Cursor and Copilot rules
- Checked for:
  - `.cursor/rules/`
  - `.cursorrules`
  - `.github/copilot-instructions.md`
- Current status: none of these files exist in this repository.
- If they are added, treat them as higher-priority local instructions and update this file.

## Agent checklist before finishing
1. Run or reason through tests for changed behavior.
2. Run `npm run build` for library-impacting changes.
3. Add or update tests when behavior changes.
4. Keep exports aligned in `src/lib/public-api.ts` and `src/public-api.ts`.
5. Avoid unrelated cleanup in the same patch.
