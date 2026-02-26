import type { ThemeConfig } from "../core/types.js";
import { DEFAULT_THEME } from "../core/defaults.js";
import { readFileSync, existsSync } from "node:fs";
import { BcmAppError, ErrorCode } from "../cli/errors.js";

export function resolveTheme(
  cliOverrides: Partial<{
    font: string;
    fontSize: number;
    leafColor: string;
    depthColors: string[];
    background: string;
    border: string;
    cornerRadius: number;
    strokeWidth: number;
  }>,
  themeFilePath?: string,
): ThemeConfig {
  // Start with defaults
  let theme: ThemeConfig = structuredClone(DEFAULT_THEME);

  // Layer theme file on top
  if (themeFilePath) {
    if (!existsSync(themeFilePath)) {
      throw new BcmAppError(
        ErrorCode.ERR_IO_FILE_NOT_FOUND,
        `Theme file not found: ${themeFilePath}`,
        { path: themeFilePath },
      );
    }
    try {
      const raw = readFileSync(themeFilePath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<ThemeConfig>;
      theme = mergeTheme(theme, parsed);
    } catch (err: any) {
      if (err instanceof BcmAppError) throw err;
      throw new BcmAppError(
        ErrorCode.ERR_VALIDATION_JSON_PARSE,
        `Invalid theme file: ${err.message}`,
        { path: themeFilePath },
      );
    }
  }

  // Layer CLI overrides on top
  if (cliOverrides.font) {
    theme.typography.parentFont.name = cliOverrides.font;
    theme.typography.leafFont.name = cliOverrides.font;
  }
  if (cliOverrides.fontSize !== undefined) {
    theme.typography.parentFont.size = cliOverrides.fontSize;
    theme.typography.leafFont.size = cliOverrides.fontSize;
  }
  if (cliOverrides.leafColor) theme.palette.leafFill = cliOverrides.leafColor;
  if (cliOverrides.depthColors) theme.palette.depthFills = cliOverrides.depthColors;
  if (cliOverrides.background) theme.palette.background = cliOverrides.background;
  if (cliOverrides.border) theme.palette.border = cliOverrides.border;
  if (cliOverrides.cornerRadius !== undefined)
    theme.display.cornerRadius = cliOverrides.cornerRadius;
  if (cliOverrides.strokeWidth !== undefined)
    theme.display.strokeWidth = cliOverrides.strokeWidth;

  return theme;
}

function mergeTheme(
  base: ThemeConfig,
  override: Partial<ThemeConfig>,
): ThemeConfig {
  const result = structuredClone(base);
  if (override.palette) {
    if (override.palette.background)
      result.palette.background = override.palette.background;
    if (override.palette.leafFill)
      result.palette.leafFill = override.palette.leafFill;
    if (override.palette.depthFills)
      result.palette.depthFills = override.palette.depthFills;
    if (override.palette.border)
      result.palette.border = override.palette.border;
  }
  if (override.typography) {
    if (override.typography.parentFont) {
      Object.assign(result.typography.parentFont, override.typography.parentFont);
    }
    if (override.typography.leafFont) {
      Object.assign(result.typography.leafFont, override.typography.leafFont);
    }
  }
  if (override.spacing) {
    Object.assign(result.spacing, override.spacing);
  }
  if (override.display) {
    Object.assign(result.display, override.display);
  }
  return result;
}
