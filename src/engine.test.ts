import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { draftToDocx, paragraphsFromDocx, redlineToDocx } from "./docx.ts";
import { compareDrafts } from "./engine.ts";
import { SAMPLES } from "./samples.ts";
import { moveAnchor } from "./text.ts";

const nda = SAMPLES[0];

describe("clause diff", () => {
  const redline = compareDrafts(nda.name, nda.original, nda.revised);

  it("flags auto-renewal on the term and names the phrase", () => {
    const term = redline.blocks.find((block) => block.toLabel.includes("Term"));
    assert.ok(term);
    const note = term.notes.find((item) => item.title === "Auto-renewal");
    assert.ok(note);
    assert.match(note.phrase ?? "", /automatically renew/i);
  });

  it("does not flag a clause whose words did not change", () => {
    const purpose = redline.blocks.find((block) => block.toLabel.includes("Purpose"));
    assert.equal(purpose?.kind, "unchanged");
    assert.deepEqual(purpose?.notes ?? [], []);
  });

  it("tracks the notices clause as a move from section 9 to section 4", () => {
    const dest = redline.blocks.find((block) => block.toLabel === "§4 Notices");
    const ghost = redline.blocks.find((block) => block.id === "original-9-from");
    assert.equal(dest?.kind, "moved");
    assert.equal(dest?.structure, "clause");
    assert.equal(ghost?.structure, "clause");
    assert.equal(dest?.moveName, ghost?.moveName);
    assert.notEqual(dest?.id, ghost?.id);
  });

  it("marks the return-or-destroy sentence as a move, not a fresh insert", () => {
    const obligations = redline.blocks.find((block) => block.toLabel.includes("Obligations"));
    const returned = redline.blocks.find((block) => block.fromLabel.includes("Return of Materials"));
    assert.ok(obligations?.bodyRuns.some((run) => run.kind === "moveTo" && /return or destroy/i.test(run.text)));
    assert.ok(returned?.bodyRuns.some((run) => run.kind === "moveFrom" && /return or destroy/i.test(run.text)));
    const from = returned?.bodyRuns.find((run) => run.kind === "moveFrom");
    const to = obligations?.bodyRuns.find((run) => run.kind === "moveTo");
    assert.equal(moveAnchor(from?.text ?? ""), moveAnchor(to?.text ?? ""));
  });

  it("flags the stale section 9 cross-reference after notices moves", () => {
    const entire = redline.blocks.find((block) => block.fromLabel.includes("Entire Agreement"));
    const xref = entire?.notes.find((note) => note.kind === "xref");
    assert.equal(xref?.title, "Stale cross-reference");
    assert.match(xref?.body ?? "", /Notices/);
  });

  it("writes tracked changes, a shared move name, and comment balloons", async () => {
    const bytes = await redlineToDocx(redline);
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    const comments = await zip.file("word/comments.xml")!.async("string");
    assert.match(xml, /<w:ins /);
    assert.match(xml, /<w:del /);
    assert.match(xml, /<w:moveFrom /);
    assert.match(xml, /<w:moveTo /);
    const name = redline.blocks.find((block) => block.toLabel === "§4 Notices")?.moveName;
    assert.ok(name);
    assert.equal(xml.split(`w:name="${name}"`).length - 1, 2);
    assert.match(comments, /Auto-renewal/);
    assert.match(comments, /automatically renew/);
  });

  it("round-trips a clean docx back into the same headings", async () => {
    const bytes = await draftToDocx(nda.original);
    const paragraphs = await paragraphsFromDocx(bytes);
    assert.equal(paragraphs[0], "1. Purpose");
    assert.equal(paragraphs.filter((line) => /^\d+\./.test(line)).length, nda.original.length);
  });
});
