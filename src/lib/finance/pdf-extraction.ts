export function extractTextFromPdfBytes(buffer: Buffer) {
  const raw = buffer.toString("latin1");
  const chunks: string[] = [];
  const textPattern = /\((?:[^()]|\\.)*\)\s*Tj/g;
  const arrayPattern = /\[((?:\s*\((?:[^()]|\\.)*\)\s*)+)\]\s*TJ/g;
  let match: RegExpExecArray | null;
  while ((match = textPattern.exec(raw))) {
    chunks.push(decodePdfString(match[0].replace(/\)\s*Tj$/, "").slice(1)));
  }
  while ((match = arrayPattern.exec(raw))) {
    const parts = match[1].match(/\((?:[^()]|\\.)*\)/g) ?? [];
    chunks.push(parts.map((part) => decodePdfString(part.slice(1, -1))).join(""));
  }
  return chunks.join("\n").replace(/\s+\n/g, "\n").trim();
}

function decodePdfString(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}
