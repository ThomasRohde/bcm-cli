import { defineConfig } from "tsup";
import { readFileSync } from "fs";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  platform: "node",
  noExternal: ["commander", "opentype.js"],
  define: {
    __VERSION__: JSON.stringify(version),
  },
  banner: {
    js: `#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);`,
  },
});
