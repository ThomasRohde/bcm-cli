# CLAUDE.md

## Project Overview

BCM-CLI (`bcm`) is an agent-first CLI tool that ingests Business Capability Model JSON, normalizes it into a tree, applies an adaptive flow layout algorithm, renders SVG, and exports HTML/PNG/PDF.

## Tech Stack

- **Language:** TypeScript (strict, ESM-only with `.js` import extensions)
- **Runtime:** Node.js >= 20
- **CLI framework:** Commander.js
- **Build:** tsup (esbuild-based)
- **Test:** Vitest (globals enabled)
- **Font metrics:** opentype.js
- **PNG/PDF:** Playwright (optional peer dep)

## Build & Test Commands

```bash
pnpm build          # Build with tsup → dist/
pnpm dev            # Watch mode
pnpm test           # Run all tests (vitest run)
pnpm test:watch     # Watch mode testing
pnpm typecheck      # Type check without emitting
```

## Project Structure

- `src/core/` — Types (`types.ts`) and defaults (`defaults.ts`)
- `src/cli/` — CLI commands, envelope output, error codes, options
- `src/import/` — Import pipeline: parse → unwrap → detect → normalize → validate
- `src/layout/` — Adaptive flow layout algorithm (ported from Archi/jArchi)
- `src/render/` — SVG renderer, HTML wrapper, theme resolution
- `src/export/` — Atomic file writer, Playwright PNG/PDF export
- `src/fonts/` — Font metrics (stub + opentype.js measurer)
- `test/fixtures/` — 12 JSON test fixtures
- `test/unit/` — Unit tests by module
- `test/integration/` — End-to-end command tests

## Key Patterns

- **All output is structured JSON envelopes** on stdout. Diagnostics go to stderr.
- **Error codes** are categorized: I/O (exit 50), validation (exit 10), layout (exit 20), export (exit 30), internal (exit 90).
- **Throw `BcmAppError`** with a specific `ErrorCode` — commands catch and wrap into envelopes.
- **Schema detection** is automatic: nested (children field), flat (parent field), simple (array of items).
- **Layout is pure** — takes `CapabilityNode[]` + options + `measureText` function, returns `LayoutResult`. No side effects.
- **Theme merge precedence:** CLI flags > theme file > built-in defaults.
- **Atomic file writes:** write to temp, then rename.

## Conventions

- ESM imports always use `.js` extensions
- Types live in `src/core/types.ts` — single source of truth
- Tests use Vitest globals (`describe`, `it`, `expect` — no imports needed)
- Test fixtures in `test/fixtures/`, temp dirs cleaned up in afterEach
- Warnings are non-fatal (processing continues); errors throw `BcmAppError`
