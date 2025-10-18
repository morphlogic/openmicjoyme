# Repository Guidelines

## Project Structure & Module Organization
This Angular workspace keeps all runnable code in `src/`. Application wiring lives in `src/app/app.module.ts`, while feature flows sit under `src/app/features/` (`events/`, `about/`). Cross-cutting utilities and DTOs belong in `src/app/core/` (`models/` and `services/`). Shared visuals live in `src/app/app.component.*`, and global styling is centralized in `src/styles.scss`. Static assets, icons, and copy updates belong in `src/assets/`.

## Build, Test, and Development Commands
- `npm install` — install dependencies; run after pulling new Angular or Material releases.
- `npm run start` — start the dev server with live reload at `http://localhost:4200/` and open the browser.
- `npm run build` — produce a production build under `dist/openmicjoy`, optimized for deployment.
- `npx ng test --watch` — execute Jasmine/Karma specs locally; add `--code-coverage` to generate `coverage/`.

## Coding Style & Naming Conventions
TypeScript and HTML templates follow Angular’s style guide: two-space indentation, single quotes, and trailing commas in multi-line literals. Components, directives, and pipes use `PascalCase` class names and selectors prefixed with `app-` (see `events-list.component.ts`). Services and helpers use `camelCase` file names (`event.model.ts`) and reside alongside their domain. Keep SCSS modular: component-specific styles next to their templates; global tokens in `styles.scss`. Run `npx ng config cli.cache.enabled false` temporarily if you need deterministic rebuilds during debugging.

## Testing Guidelines
Add new specs next to the code under test (e.g., `events-list.component.spec.ts`). Favor Jasmine’s `describe/it` naming that mirrors user stories and assert observable behavior rather than implementation details. When adding services, prefer dependency-injected test beds with Angular’s `TestBed`. If a feature lacks coverage, at minimum include render smoke tests and date formatting checks for event cards. Run `npx ng test --code-coverage` before submitting and ensure new suites leave the coverage report without regressions.

## Commit & Pull Request Guidelines
Existing history uses concise, imperative subject lines (for example, “Initial commit -=- Baseline w/ dummy data”). Keep summaries under 72 characters and expand on context in the body when needed. Group related changes per commit so reviewers can trace feature slices. Pull requests should link the corresponding issue, list testing commands executed, and include screenshots or gif captures for UI changes (mobile and desktop if applicable). Request review from a maintainer familiar with the affected feature area and wait for CI to pass before merging.
