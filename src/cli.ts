import { readFileSync, writeFileSync } from "node:fs";
import { redlineFromDocx, redlineToDocx } from "./docx.ts";
import { toSummaryMarkdown } from "./engine.ts";

function asArrayBuffer(bytes: Buffer): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function arg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const positional = process.argv.slice(2).filter((token, index, all) => {
  if (token.startsWith("--")) return false;
  const prev = all[index - 1];
  return prev !== "--out" && prev !== "--docx";
});

const [originalPath, revisedPath] = positional;
const outPath = arg("--out") ?? "redline.md";
const docxPath = arg("--docx");

if (!originalPath || !revisedPath) {
  console.error(
    "Usage: node --experimental-strip-types src/cli.ts original.docx revised.docx --out redline.md [--docx redline.docx]",
  );
  process.exit(1);
}

const redline = await redlineFromDocx(
  "Redline",
  asArrayBuffer(readFileSync(originalPath)),
  asArrayBuffer(readFileSync(revisedPath)),
);
writeFileSync(outPath, toSummaryMarkdown(redline));
if (docxPath) writeFileSync(docxPath, await redlineToDocx(redline));
console.log(
  `${outPath}: ${redline.counts.modified} edited, ${redline.counts.moved} moved, ${redline.counts.added} added, ${redline.counts.removed} removed, ${redline.counts.risks} risk flags, ${redline.counts.xrefs} cross-refs`,
);
