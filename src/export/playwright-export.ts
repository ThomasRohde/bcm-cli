import { BcmAppError, ErrorCode } from "../cli/errors.js";

function injectExportModeClass(html: string): string {
  return html.replace(/<html([^>]*)>/i, (_full, attrs: string) => {
    if (/class\s*=/.test(attrs)) {
      return `<html${attrs.replace(
        /class=(["'])(.*?)\1/i,
        (_classFull, quote: string, value: string) =>
          `class=${quote}${value} bcm-export${quote}`,
      )}>`;
    }
    return `<html${attrs} class="bcm-export">`;
  });
}

export async function exportPng(
  html: string,
  outPath: string,
  width: number,
  height: number,
  scale: number,
): Promise<void> {
  let pw: typeof import("playwright");
  try {
    pw = await import("playwright");
  } catch {
    throw new BcmAppError(
      ErrorCode.ERR_EXPORT_BROWSER_LAUNCH,
      "Playwright is not installed. Install it with: pnpm add playwright",
    );
  }

  let browser;
  try {
    browser = await pw.chromium.launch();
    const htmlForExport = injectExportModeClass(html);
    // Use deviceScaleFactor for DPI scaling instead of enlarging the viewport.
    // Export mode strips explorer chrome and padding, so viewport can match map size.
    const padding = 0;
    const page = await browser.newPage({
      deviceScaleFactor: scale,
      viewport: {
        width: Math.ceil(width + padding),
        height: Math.ceil(height + padding),
      },
    });
    await page.setContent(htmlForExport, { waitUntil: "networkidle" });
    await page.screenshot({ path: outPath, fullPage: true });
  } catch (err: any) {
    if (err instanceof BcmAppError) throw err;
    throw new BcmAppError(ErrorCode.ERR_EXPORT_PLAYWRIGHT, `PNG export failed: ${err.message}`);
  } finally {
    await browser?.close();
  }
}

/** Parse page size string into width/height in px (at 96 DPI). */
export function parsePageSize(pageSize: string): { width: number; height: number } {
  if (pageSize === "A4") return { width: 794, height: 1123 }; // 210mm x 297mm at 96 DPI
  if (pageSize === "Letter") return { width: 816, height: 1056 }; // 8.5in x 11in at 96 DPI
  if (pageSize.includes("x")) {
    const [w, h] = pageSize.split("x").map((s) => parseInt(s.trim(), 10));
    return { width: w, height: h };
  }
  // Fallback to A4
  return { width: 794, height: 1123 };
}

export async function exportPdf(
  html: string,
  outPath: string,
  pageSize: string,
  margin: string,
  contentWidth?: number,
  contentHeight?: number,
): Promise<void> {
  let pw: typeof import("playwright");
  try {
    pw = await import("playwright");
  } catch {
    throw new BcmAppError(
      ErrorCode.ERR_EXPORT_BROWSER_LAUNCH,
      "Playwright is not installed. Install it with: pnpm add playwright",
    );
  }

  let browser;
  try {
    browser = await pw.chromium.launch();
    const page = await browser.newPage();

    // Scale-to-fit: if content exceeds page, inject CSS transform
    let htmlToUse = injectExportModeClass(html);
    if (contentWidth && contentHeight) {
      const pageDims = parsePageSize(pageSize);
      // Account for margins (parse mm values, approximate 1mm ≈ 3.78px)
      const marginPx = parseFloat(margin) * 3.78;
      const availW = pageDims.width - 2 * marginPx;
      const availH = pageDims.height - 2 * marginPx;
      const scale = Math.min(availW / contentWidth, availH / contentHeight, 1);
      if (scale < 1) {
        htmlToUse = html.replace(
          "</style>",
          `  svg { transform: scale(${scale.toFixed(4)}); transform-origin: top left; }\n</style>`,
        );
      }
    }

    await page.setContent(htmlToUse, { waitUntil: "networkidle" });

    const pdfOptions: Record<string, unknown> = {
      path: outPath,
      printBackground: true,
      margin: { top: margin, right: margin, bottom: margin, left: margin },
    };

    // Parse page size
    if (pageSize === "A4") {
      pdfOptions.format = "A4";
    } else if (pageSize === "Letter") {
      pdfOptions.format = "Letter";
    } else if (pageSize.includes("x")) {
      const [w, h] = pageSize.split("x").map((s) => s.trim());
      pdfOptions.width = w;
      pdfOptions.height = h;
    } else {
      pdfOptions.format = pageSize;
    }

    await page.pdf(pdfOptions);
  } catch (err: any) {
    if (err instanceof BcmAppError) throw err;
    throw new BcmAppError(ErrorCode.ERR_EXPORT_PLAYWRIGHT, `PDF export failed: ${err.message}`);
  } finally {
    await browser?.close();
  }
}
