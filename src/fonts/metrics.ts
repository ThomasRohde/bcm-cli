import type { MeasureTextFn } from "../core/types.js";

export function createStubMeasurer(charWidth: number = 7): MeasureTextFn {
  return (text: string): number => {
    if (!text || !text.trim()) return 40;
    return text.length * charWidth;
  };
}

let cachedMeasurer: MeasureTextFn | null = null;

export async function createFontMeasurer(
  fontPath: string,
  fontSize: number,
): Promise<MeasureTextFn> {
  if (cachedMeasurer) return cachedMeasurer;

  try {
    const opentype = await import("opentype.js");
    const font = await opentype.load(fontPath);

    cachedMeasurer = (text: string): number => {
      if (!text || !text.trim()) return 40;
      return font.getAdvanceWidth(text, fontSize);
    };
    return cachedMeasurer;
  } catch {
    // Fallback to stub measurer if font loading fails
    cachedMeasurer = createStubMeasurer();
    return cachedMeasurer;
  }
}
