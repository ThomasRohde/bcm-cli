import type { MeasureTextFn } from "../core/types.js";

export function createStubMeasurer(charWidth: number = 7): MeasureTextFn {
  return (text: string): number => {
    if (!text || !text.trim()) return 40;
    return text.length * charWidth;
  };
}

const cachedMeasurers = new Map<string, MeasureTextFn>();

function cacheKey(fontPath: string, fontSize: number): string {
  return `${fontPath}::${fontSize}`;
}

/** Reset the font measurer cache (for testing). */
export function resetFontCache(): void {
  cachedMeasurers.clear();
}

export async function createFontMeasurer(
  fontPath: string,
  fontSize: number,
): Promise<MeasureTextFn> {
  const key = cacheKey(fontPath, fontSize);
  const cached = cachedMeasurers.get(key);
  if (cached) return cached;

  try {
    const opentype = await import("opentype.js");
    const font = await opentype.load(fontPath);

    const measurer: MeasureTextFn = (text: string): number => {
      if (!text || !text.trim()) return 40;
      return font.getAdvanceWidth(text, fontSize);
    };
    cachedMeasurers.set(key, measurer);
    return measurer;
  } catch {
    // Fallback to stub measurer if font loading fails
    const measurer = createStubMeasurer();
    cachedMeasurers.set(key, measurer);
    return measurer;
  }
}
