import { registerHooks } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.KS_TEST_MODE = "1";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const candidate = path.join(rootDir, specifier.slice(2));
      if (fs.existsSync(candidate + ".ts")) {
        return nextResolve(pathToFileURL(candidate + ".ts").href, context);
      }
      if (fs.existsSync(candidate + ".tsx")) {
        return nextResolve(pathToFileURL(candidate + ".tsx").href, context);
      }
    }
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !path.extname(specifier)
    ) {
      const parentPath = context.parentURL
        ? path.dirname(fileURLToPath(context.parentURL))
        : rootDir;
      const candidate = path.resolve(parentPath, specifier);
      if (fs.existsSync(candidate + ".ts")) {
        return nextResolve(pathToFileURL(candidate + ".ts").href, context);
      }
      if (fs.existsSync(candidate + ".tsx")) {
        return nextResolve(pathToFileURL(candidate + ".tsx").href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});
