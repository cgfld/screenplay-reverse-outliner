import { projectSchema, type Project } from "../model/project";
import { extractPdfText } from "./pdf";
import { parseText, parseFdx } from "./parser";
function validateParsed(project: Project): Project {
  const parsed = projectSchema.safeParse(project);
  if (!parsed.success)
    throw new Error(
      "This script exceeds a supported project limit: " +
        parsed.error.issues[0]?.message,
    );
  return parsed.data;
}
export async function parseUpload(file: File) {
  if (file.size > 25 * 1024 * 1024)
    throw new Error("Choose a file smaller than 25 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "fdx")
    return validateParsed(parseFdx(await file.text(), file.name));
  if (ext === "txt")
    return validateParsed(parseText(await file.text(), file.name));
  if (ext !== "pdf") throw new Error("Choose a PDF, FDX, or TXT script.");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).href;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  try {
    const pdf = await task.promise;
    const text = await extractPdfText(pdf);
    const project = parseText(text, file.name);
    project.source.format = "pdf";
    return validateParsed(project);
  } finally {
    await task.destroy();
  }
}
