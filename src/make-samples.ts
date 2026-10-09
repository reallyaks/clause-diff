import { mkdirSync, writeFileSync } from "node:fs";
import { draftToDocx, redlineToDocx } from "./docx.ts";
import { compareDrafts, toSummaryMarkdown } from "./engine.ts";
import { SAMPLES } from "./samples.ts";

function textOf(clauses: { number: string; title: string; body: string }[]): string {
  return clauses.map((clause) => `${clause.number}. ${clause.title}\n${clause.body}`).join("\n\n") + "\n";
}

for (const sample of SAMPLES) {
  const dir = `samples/${sample.id}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/original.txt`, textOf(sample.original));
  writeFileSync(`${dir}/revised.txt`, textOf(sample.revised));
  writeFileSync(`${dir}/original.docx`, await draftToDocx(sample.original));
  writeFileSync(`${dir}/revised.docx`, await draftToDocx(sample.revised));
  const redline = compareDrafts(sample.name, sample.original, sample.revised);
  writeFileSync(`${dir}/redline.md`, toSummaryMarkdown(redline));
  writeFileSync(`${dir}/redline.docx`, await redlineToDocx(redline));
  console.log(sample.id, redline.counts);
}
