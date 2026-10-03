/**
 * Registers the TypeScript resolve hook so `node --test` can run
 * the test files and the modules under test directly (Node 24
 * type stripping). Handles the two things plain Node ESM cannot:
 *
 * 1. Extensionless relative imports (`./safety` → `./safety.ts`),
 *    which bundlers resolve but Node ESM does not.
 * 2. The `@/` path alias from tsconfig.
 *
 * No dependency — a ~30-line resolve hook keeps the test setup
 * free of a runner package.
 */
import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);
