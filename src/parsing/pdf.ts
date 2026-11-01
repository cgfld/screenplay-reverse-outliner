import type { PDFDocumentProxy } from "pdfjs-dist";
/** Keep extraction independent of browser upload/worker setup for testing and future adapters. */
export async function extractPdfText(pdf: PDFDocumentProxy): Promise<string> {
  if (pdf.numPages > 600) throw new Error("PDF exceeds the 600 page limit.");
  let text = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let y: number | undefined;
    let line = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const iy = item.transform[5];
      if (y !== undefined && Math.abs(iy - y) > 3) {
        text += line.trimEnd().replace(/[ \t]+/g, " ") + "\n";
        line = "";
      }
      line += (line ? " " : "") + item.str;
      y = iy;
      if (item.hasEOL) {
        text += line.trimEnd().replace(/[ \t]+/g, " ") + "\n";
        line = "";
        y = undefined;
      }
    }
    text += line.replace(/[ \t]+/g, " ") + "\n\n";
    if (text.length > 2000000)
      throw new Error("Script exceeds the 2 million character limit.");
  }
  if (!text.trim())
    throw new Error(
      "This PDF has no selectable text. Run OCR on scanned pages first.",
    );
  return text;
}
