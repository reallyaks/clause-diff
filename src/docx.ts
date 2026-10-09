import JSZip from "jszip";
import type { Block, Redline } from "./engine.ts";
import { clausesFromParagraphs, compareClauses } from "./engine.ts";
import { decodeXml, moveAnchor, xmlEscape, type Run } from "./text.ts";

const AUTHOR = "Clause Diff";
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function revisionStamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}T${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}Z`;
}

class Ids {
  private n = 1;
  readonly date = revisionStamp();
  next(): number {
    const id = this.n;
    this.n += 1;
    return id;
  }
}

function paragraphText(xml: string): string[] {
  const paragraphs: string[] = [];
  for (const part of xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) ?? []) {
    const text = [...part.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((match) => decodeXml(match[1]))
      .join("");
    if (text.trim()) paragraphs.push(text);
  }
  return paragraphs;
}

export async function paragraphsFromDocx(data: ArrayBuffer | Uint8Array): Promise<string[]> {
  const zip = await JSZip.loadAsync(data);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("That file has no word/document.xml. Export a .docx and try again.");
  const xml = await file.async("string");
  const paragraphs = paragraphText(xml);
  if (paragraphs.length === 0) throw new Error("No paragraph text was found in that document.");
  return paragraphs;
}

function runXml(run: Run, ids: Ids): string {
  const text = xmlEscape(run.text);
  if (!text) return "";
  if (run.kind === "equal") {
    return `<w:r><w:t xml:space="preserve">${text}</w:t></w:r>`;
  }
  if (run.kind === "insert") {
    return `<w:ins w:id="${ids.next()}" w:author="${AUTHOR}" w:date="${ids.date}"><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:ins>`;
  }
  if (run.kind === "delete") {
    return `<w:del w:id="${ids.next()}" w:author="${AUTHOR}" w:date="${ids.date}"><w:r><w:delText xml:space="preserve">${text}</w:delText></w:r></w:del>`;
  }
  const name = moveAnchor(run.text);
  const range = ids.next();
  if (run.kind === "moveTo") {
    return `<w:moveToRangeStart w:id="${range}" w:author="${AUTHOR}" w:date="${ids.date}" w:name="${name}"/><w:moveTo w:id="${ids.next()}" w:author="${AUTHOR}" w:date="${ids.date}"><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:moveTo><w:moveToRangeEnd w:id="${range}"/>`;
  }
  return `<w:moveFromRangeStart w:id="${range}" w:author="${AUTHOR}" w:date="${ids.date}" w:name="${name}"/><w:moveFrom w:id="${ids.next()}" w:author="${AUTHOR}" w:date="${ids.date}"><w:r><w:delText xml:space="preserve">${text}</w:delText></w:r></w:moveFrom><w:moveFromRangeEnd w:id="${range}"/>`;
}

function commentAnchors(notes: { id: string }[], ids: Ids, idMap: Map<string, number>, open: boolean): string {
  return notes
    .map((note) => {
      const id = idMap.get(note.id);
      if (id === undefined) return "";
      if (open) return `<w:commentRangeStart w:id="${id}"/>`;
      return `<w:commentRangeEnd w:id="${id}"/><w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${id}"/></w:r>`;
    })
    .join("");
}

function blockXml(block: Block, ids: Ids, idMap: Map<string, number>): string {
  const clauseMove = block.structure === "clause" && block.moveName;
  const ghost = clauseMove && block.bodyRuns.every((run) => run.kind === "moveFrom");
  const range = clauseMove ? ids.next() : 0;
  const start = !clauseMove
    ? ""
    : ghost
      ? `<w:moveFromRangeStart w:id="${range}" w:author="${AUTHOR}" w:date="${ids.date}" w:name="${block.moveName}"/>`
      : `<w:moveToRangeStart w:id="${range}" w:author="${AUTHOR}" w:date="${ids.date}" w:name="${block.moveName}"/>`;
  const end = !clauseMove ? "" : ghost ? `<w:moveFromRangeEnd w:id="${range}"/>` : `<w:moveToRangeEnd w:id="${range}"/>`;
  const comments = block.notes.filter((note) => note.title !== "Moved from here");
  const headingInner = ghost
    ? `<w:moveFrom w:id="${ids.next()}" w:author="${AUTHOR}" w:date="${ids.date}"><w:r><w:delText xml:space="preserve">${xmlEscape(block.headingRuns.map((run) => run.text).join(""))}</w:delText></w:r></w:moveFrom>`
    : block.headingRuns.map((run) => runXml(run, ids)).join("");
  const bodyInner = ghost
    ? `<w:moveFrom w:id="${ids.next()}" w:author="${AUTHOR}" w:date="${ids.date}"><w:r><w:delText xml:space="preserve">${xmlEscape(block.bodyRuns.map((run) => run.text).join(""))}</w:delText></w:r></w:moveFrom>`
    : block.bodyRuns.map((run) => runXml(run, ids)).join("");
  return [
    `<w:p>${start}${commentAnchors(comments, ids, idMap, true)}${headingInner}${commentAnchors(comments, ids, idMap, false)}</w:p>`,
    `<w:p>${bodyInner}${end}</w:p>`,
  ].join("");
}

function commentsXml(redline: Redline, idMap: Map<string, number>, date: string): string {
  const items = redline.notes
    .map((note) => {
      const id = idMap.get(note.id);
      if (id === undefined) return "";
      const phrase = note.phrase ? ` Matched “${note.phrase}”.` : "";
      return `<w:comment w:id="${id}" w:author="${AUTHOR}" w:date="${date}" w:initials="CD"><w:p><w:r><w:t xml:space="preserve">${xmlEscape(`${note.title}. ${note.body}${phrase}`)}</w:t></w:r></w:p></w:comment>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="${W}">${items}</w:comments>`;
}

export async function redlineToDocx(redline: Redline): Promise<Uint8Array> {
  const ids = new Ids();
  const idMap = new Map<string, number>();
  for (const note of redline.notes) idMap.set(note.id, ids.next());
  const body = redline.blocks.map((block) => blockXml(block, ids, idMap)).join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>
</Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${W}"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="CommentReference"><w:name w:val="annotation reference"/></w:style></w:styles>`;
  const settings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${W}"><w:trackRevisions/></w:settings>`;
  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.folder("_rels")?.file(".rels", rels);
  const word = zip.folder("word");
  word?.file("document.xml", document);
  word?.file("styles.xml", styles);
  word?.file("settings.xml", settings);
  word?.file("comments.xml", commentsXml(redline, idMap, ids.date));
  word?.folder("_rels")?.file("document.xml.rels", docRels);
  return zip.generateAsync({ type: "uint8array" });
}

export async function draftToDocx(clauses: { number: string; title: string; body: string }[]): Promise<Uint8Array> {
  const body = clauses
    .map((clause) => {
      const heading = xmlEscape(clause.number ? `${clause.number}. ${clause.title}` : clause.title);
      return `<w:p><w:r><w:t xml:space="preserve">${heading}</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">${xmlEscape(clause.body)}</w:t></w:r></w:p>`;
    })
    .join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W}"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body></w:document>`;
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.folder("word")?.file("document.xml", document);
  return zip.generateAsync({ type: "uint8array" });
}

export async function redlineFromDocx(name: string, original: ArrayBuffer, revised: ArrayBuffer): Promise<Redline> {
  const left = clausesFromParagraphs(await paragraphsFromDocx(original), "original");
  const right = clausesFromParagraphs(await paragraphsFromDocx(revised), "revised");
  return compareClauses(name, left, right);
}
