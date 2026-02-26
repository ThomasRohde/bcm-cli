import { BcmAppError, ErrorCode } from "../cli/errors.js";

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
    const page = await browser.newPage();
    await page.setViewportSize({
      width: Math.ceil(width * scale),
      height: Math.ceil(height * scale),
    });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.screenshot({ path: outPath, fullPage: true });
  } catch (err: any) {
    if (err instanceof BcmAppError) throw err;
    throw new BcmAppError(ErrorCode.ERR_EXPORT_PLAYWRIGHT, `PNG export failed: ${err.message}`);
  } finally {
    await browser?.close();
  }
}

export async function exportPdf(
  html: string,
  outPath: string,
  pageSize: string,
  margin: string,
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
    await page.setContent(html, { waitUntil: "networkidle" });

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
