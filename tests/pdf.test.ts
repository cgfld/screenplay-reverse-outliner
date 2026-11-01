import { it, expect } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { extractPdfText } from "../src/parsing/pdf";
import { parseText } from "../src/parsing/parser";
function makePdf(lines: string[]) {
  const content = `BT /F1 12 Tf 72 720 Td 18 TL ${lines.map((l, i) => `${i ? "T* " : ""}(${l.replace(/[()\\]/g, "\\$&")}) Tj`).join("\n")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
it("extracts a real PDF and passes its scene text through the screenplay parser", async () => {
  const task = getDocument({
    data: makePdf([
      "INT. KITCHEN - DAY",
      "Mara waits.",
      "MARA",
      "Come home.",
      "EXT. ROAD - NIGHT",
      "A car passes.",
    ]),
    useSystemFonts: true,
  });
  try {
    const pdf = await task.promise;
    const text = await extractPdfText(pdf);
    const project = parseText(text, "test.pdf");
    expect(project.scenes).toHaveLength(2);
    expect(project.scenes[0].location).toBe("KITCHEN");
    expect(project.scenes[0].dialogue[0]).toEqual({
      character: "MARA",
      text: "Come home.",
    });
  } finally {
    await task.destroy();
  }
});
it("reports non-text PDFs instead of inventing scene content", async () => {
  const task = getDocument({ data: makePdf([]), useSystemFonts: true });
  try {
    await expect(extractPdfText(await task.promise)).rejects.toThrow("OCR");
  } finally {
    await task.destroy();
  }
});
