/**
 * Resolve hook for running the project's TypeScript modules
 * with plain Node (type stripping). See register.mjs.
 */
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(TESTS_DIR, "..");

/** Extensions to try for extensionless relative/file imports. */
const EXTENSIONS = [".ts", ".tsx", "/index.ts"];

export async function resolve(specifier, context, nextResolve) {
  // tsconfig path alias: "@/..." → project root.
  let target = specifier;
  if (specifier.startsWith("@/")) {
    target = pathToFileURL(join(PROJECT_ROOT, specifier.slice(2))).href;
  }

  try {
    return await nextResolve(target, context);
  } catch (error) {
    if (target.startsWith("file:") || target.startsWith(".")) {
      for (const extension of EXTENSIONS) {
        try {
          return await nextResolve(`${target}${extension}`, context);
        } catch {
          // Try the next extension.
        }
      }
    }
    throw error;
  }
}
