import { defineConfig } from "vitest/config";
import { readFileSync } from "fs";

const skillMd = readFileSync("./SKILL.md", "utf-8");

export default defineConfig({
  define: {
    __SKILL_MD__: JSON.stringify(skillMd),
  },
  test: {
    include: ["test/**/*.test.ts"],
    globals: true,
  },
});
