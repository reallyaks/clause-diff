import type { DraftClause } from "./samples.ts";
import {
  mergeRuns,
  normSentence,
  normalizeSpace,
  opcodes,
  scopeShift,
  similarity,
  splitSentences,
  titleKey,
  wordDiff,
  type Run,
  type Scope,
} from "./text.ts";

export type Clause = {
  id: string;
  number: string;
  title: string;
  heading: string;
  body: string;
};

export type NoteKind = "risk" | "xref" | "move" | "scope" | "term";

export type Note = {
  id: string;
  kind: NoteKind;
  title: string;
  body: string;
  phrase?: string;
};

export type BlockKind =
  | "unchanged"
  | "renumbered"
  | "modified"
  | "added"
  | "removed"
  | "moved";

export type Block = {
  id: string;
  kind: BlockKind;
  scope: Scope;
  headingRuns: Run[];
  bodyRuns: Run[];
  fromLabel: string;
  toLabel: string;
  notes: Note[];
  /** Clause-level move: one shared range name. Otherwise runs carry their own move anchors. */
  structure: "clause" | "runs";
  moveName?: string;
};

export type Redline = {
  name: string;
  blocks: Block[];
  notes: Note[];
  counts: {
    clauses: number;
    unchanged: number;
    renumbered: number;
    modified: number;
    added: number;
    removed: number;
    moved: number;
    risks: number;
    xrefs: number;
  };
};

type Side = "original" | "revised";

export function draftToClauses(draft: DraftClause[], side: Side): Clause[] {
  return draft.map((clause, index) => {
    const heading = clause.number ? `${clause.number}. ${clause.title}` : clause.title;
    return {
      id: `${side}-${clause.number || index + 1}`,
      number: clause.number,
      title: clause.title,
      heading,
      body: normalizeSpace(clause.body),
    };
  });
}

const HEADING_RE = /^(?:(?:section|article)\s+)?(\d+(?:\.\d+)*)[.)]\s+(\S.{0,160})$/i;

export function clausesFromParagraphs(paragraphs: string[], side: Side): Clause[] {
  const chunks: { number: string; title: string; body: string[] }[] = [];
  const preamble: string[] = [];
  let current: { number: string; title: string; body: string[] } | null = null;
  for (const raw of paragraphs) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const match = line.match(HEADING_RE);
    const title = match?.[2]?.trim() ?? "";
    if (match && title.length <= 80 && !/[.!?]$/.test(title)) {
      if (current) chunks.push(current);
      current = { number: match[1], title, body: [] };
    } else if (!current) {
      preamble.push(line);
    } else {
      current.body.push(line);
    }
  }
  if (current) chunks.push(current);
  const clauses = draftToClauses(
    chunks.map((chunk) => ({
      number: chunk.number,
      title: chunk.title,
      body: chunk.body.join(" "),
    })),
    side,
  );
  if (preamble.length > 0) {
    clauses.unshift({
      id: `${side}-preamble`,
      number: "",
      title: "Preamble",
      heading: "Preamble",
      body: preamble.join(" "),
    });
  }
  return clauses;
}

type LinkKind = "align" | "move";

type Link = { oi: number; ri: number; kind: LinkKind };

function pairClauses(original: Clause[], revised: Clause[]): Map<number, Link> {
  const links = new Map<number, Link>();
  const takenRev = new Set<number>();
  const keysO = original.map((clause) => titleKey(clause.title));
  const keysR = revised.map((clause) => titleKey(clause.title));
  for (const op of opcodes(keysO, keysR)) {
    if (op.tag !== "equal") continue;
    for (let offset = 0; offset < op.i2 - op.i1; offset += 1) {
      const oi = op.i1 + offset;
      const ri = op.j1 + offset;
      links.set(oi, { oi, ri, kind: "align" });
      takenRev.add(ri);
    }
  }
  const looseO = original.map((_, index) => index).filter((index) => !links.has(index));
  const looseR = revised.map((_, index) => index).filter((index) => !takenRev.has(index));
  const scored: { oi: number; ri: number; score: number }[] = [];
  for (const oi of looseO) {
    for (const ri of looseR) {
      const score = keysO[oi] && keysO[oi] === keysR[ri] ? 1 : similarity(keysO[oi], keysR[ri]);
      if (score >= 0.84) scored.push({ oi, ri, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  for (const pair of scored) {
    if (links.has(pair.oi) || takenRev.has(pair.ri)) continue;
    links.set(pair.oi, { oi: pair.oi, ri: pair.ri, kind: "move" });
    takenRev.add(pair.ri);
  }
  return links;
}

function sentenceIndex(clauses: Clause[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const clause of clauses) {
    for (const sentence of splitSentences(clause.body)) {
      const key = normSentence(sentence);
      const bucket = map.get(key) ?? [];
      bucket.push(clause.id);
      map.set(key, bucket);
    }
  }
  return map;
}

function label(clause: Clause | undefined): string {
  if (!clause) return "";
  return clause.number ? `§${clause.number} ${clause.title}` : clause.title;
}

function durationDays(text: string): { days: number; phrase: string } | null {
  const match = text.match(
    /\b(?:(\d+)|one|two|three|six|twelve|ninety)\s*(?:\((\d+)\)\s*)?(year|month|day)s?\b/i,
  );
  if (!match) return null;
  const words: Record<string, number> = { one: 1, two: 2, three: 3, six: 6, twelve: 12, ninety: 90 };
  const raw = match[1] ? Number(match[1]) : words[match[0].split(/\s+/)[0].toLowerCase()];
  const unit = match[3].toLowerCase();
  const days = unit.startsWith("year") ? raw * 365 : unit.startsWith("month") ? raw * 30 : raw;
  return { days, phrase: match[0] };
}

function permissiveAssignment(text: string): string | null {
  if (/neither party may assign|may not assign|shall not assign|without the prior written consent/i.test(text)) {
    return null;
  }
  const match = text.match(/[^.]*\bmay assign\b[^.]*\bwithout\b[^.]*/i);
  return match ? normalizeSpace(match[0]) : null;
}

function oneWayIndemnity(text: string): string | null {
  if (/each party shall indemnify|mutually indemnify|both parties shall indemnify/i.test(text)) return null;
  const match = text.match(/[^.]*\bshall indemnify\b[^.]*/i);
  return match ? normalizeSpace(match[0]) : null;
}

function claimPeriod(text: string): { days: number; phrase: string } | null {
  if (!/\b(limitation|bring a claim|brought within|a claim must be brought|Limitation Act)\b/i.test(text)) return null;
  return durationDays(text);
}

function lawChoice(text: string): { name: string; phrase: string } | null {
  const rules: [RegExp, string][] = [
    [/England and Wales/, "England and Wales"],
    [/Scots law|laws of Scotland/, "Scotland"],
    [/Northern Ireland/, "Northern Ireland"],
    [/law of Ireland|laws of Ireland/, "Ireland"],
    [/New York/, "New York"],
  ];
  for (const [pattern, name] of rules) {
    const match = text.match(pattern);
    if (match) return { name, phrase: match[0] };
  }
  return null;
}

function forumChoice(text: string): { exclusive: boolean; courts: string; phrase: string } | null {
  const match = text.match(
    /((?:non-exclusive|exclusive)\s+jurisdiction of the courts of [^.]*)/i,
  );
  if (!match) return null;
  const phrase = normalizeSpace(match[1]);
  const courts = phrase.replace(/^.*courts of\s+/i, "").replace(/\s+to\s+.*$/, "");
  return { exclusive: /^exclusive\b/i.test(phrase), courts: normalizeSpace(courts), phrase };
}

function personalInjuryExclusion(text: string): string | null {
  if (/nothing in this agreement (?:limits|excludes)[^.]{0,80}death or personal injury/i.test(text)) return null;
  const match = text.match(
    /[^.]*\b(?:exclud\w+|cap\w+|limit\w+)\b[^.]*\b(?:death or personal injury|personal injury or death)\b[^.]*/i,
  );
  return match ? normalizeSpace(match[0]) : null;
}

function excludesThirdPartyRights(text: string): boolean {
  return (
    /contracts \(rights of third parties\) act 1999/i.test(text) &&
    /no right|shall not|does not confer|no person who is not a party/i.test(text)
  );
}

function endeavoursLevel(text: string): "best" | "all reasonable" | "reasonable" | null {
  if (/all reasonable endeavours/i.test(text)) return "all reasonable";
  if (/best endeavours/i.test(text)) return "best";
  if (/reasonable endeavours/i.test(text)) return "reasonable";
  return null;
}

function riskNotes(before: string, after: string): Omit<Note, "id">[] {
  const notes: Omit<Note, "id">[] = [];
  const push = (title: string, phrase: string, detail: string) => {
    notes.push({ kind: "risk", title, phrase, body: detail });
  };
  const auto = after.match(/\b(?:shall|will) automatically renew\b/i);
  if (auto && !/\b(?:shall|will) automatically renew\b/i.test(before)) {
    push(
      "Auto-renewal",
      auto[0],
      `Matched “${auto[0]}”. The revised clause renews on its own unless someone gives notice.`,
    );
  }
  const unlimited = after.match(/unlimited liability|liability shall be unlimited|unlimited for consequential damages/i);
  if (unlimited && !/unlimited liability|liability shall be unlimited/i.test(before)) {
    push(
      "Unlimited liability",
      unlimited[0],
      `Matched “${unlimited[0]}”. A cap that used to apply is gone, or liability is stated as unlimited.`,
    );
  }
  const indemnity = oneWayIndemnity(after);
  if (indemnity && !oneWayIndemnity(before)) {
    push(
      "One-way indemnity",
      indemnity,
      "Only one side indemnifies. The original was mutual, or had no indemnity.",
    );
  }
  const assignment = permissiveAssignment(after);
  if (assignment && !permissiveAssignment(before)) {
    push(
      "Assignment without consent",
      assignment,
      "The revised text lets a party assign without the other party's consent.",
    );
  }
  const beforeLaw = lawChoice(before);
  const afterLaw = lawChoice(after);
  if (beforeLaw && afterLaw && beforeLaw.name !== afterLaw.name) {
    push(
      "Governing law changed",
      afterLaw.phrase,
      `Governing law moved from “${beforeLaw.phrase}” to “${afterLaw.phrase}”.`,
    );
  }
  const beforeForum = forumChoice(before);
  const afterForum = forumChoice(after);
  if (beforeForum?.exclusive && afterForum && !afterForum.exclusive) {
    push(
      "Exclusive jurisdiction dropped",
      afterForum.phrase,
      `The original submitted to the exclusive jurisdiction of the courts of ${beforeForum.courts}.`,
    );
  } else if (beforeForum && afterForum && beforeForum.courts !== afterForum.courts) {
    push(
      "Forum changed",
      afterForum.phrase,
      `The chosen courts moved from ${beforeForum.courts} to ${afterForum.courts}.`,
    );
  }
  const injury = personalInjuryExclusion(after);
  if (injury && !personalInjuryExclusion(before)) {
    push(
      "Personal injury exclusion",
      injury,
      "The revised text excludes or caps liability for death or personal injury. Read section 2(1) of the Unfair Contract Terms Act 1977 against the clause. This comment does not decide it.",
    );
  }
  if (excludesThirdPartyRights(before) && !excludesThirdPartyRights(after)) {
    push(
      "Third party rights",
      "Contracts (Rights of Third Parties) Act 1999",
      "The original excluded the Contracts (Rights of Third Parties) Act 1999. The revised text does not.",
    );
  }
  const beforeEffort = endeavoursLevel(before);
  const afterEffort = endeavoursLevel(after);
  if (beforeEffort === "best" && (afterEffort === "reasonable" || afterEffort === "all reasonable")) {
    const phrase = after.match(/all reasonable endeavours|reasonable endeavours/i)?.[0] ?? "reasonable endeavours";
    push(
      "Endeavours lowered",
      phrase,
      `The original required best endeavours. The revised text requires ${afterEffort} endeavours.`,
    );
  }
  const emailOnly = after.match(/email alone|solely by email|by email only/i);
  if (emailOnly && !/email alone|solely by email|by email only/i.test(before)) {
    push("Notices by email only", emailOnly[0], "Service is allowed by email with no postal alternative.");
  }
  const restraint = after.match(/[^.]*\bshall not solicit\b[^.]*/i);
  if (restraint && !/\bsolicit\b/i.test(before)) {
    push(
      "Non-solicit added",
      normalizeSpace(restraint[0]),
      "A new restraint. Duration, geography, and the interest being protected are not assessed.",
    );
  }
  const left = claimPeriod(before);
  const right = claimPeriod(after);
  if (left && right && right.days < left.days) {
    push(
      "Shortened limitation period",
      right.phrase,
      `The stated period moved from “${left.phrase}” to “${right.phrase}”.`,
    );
  }
  return notes;
}

function definedTerm(text: string): { term: string; definition: string } | null {
  const match = text.match(/[“"]([^"”]{2,80})[”"]\s+means\s+([\s\S]+)/i);
  if (!match) return null;
  return { term: match[1], definition: normalizeSpace(match[2]) };
}

function bodyForPair(before: string, after: string, movedIn: Set<string>, movedOut: Set<string>): Run[] {
  const originalSentences = splitSentences(before);
  const revisedSentences = splitSentences(after);
  const used = new Set<number>();
  const runs: Run[] = [];
  revisedSentences.forEach((sentence, index) => {
    const lead = runs.length > 0 ? " " : "";
    if (movedIn.has(normSentence(sentence))) {
      runs.push({ kind: "moveTo", text: lead + sentence });
      return;
    }
    let best = -1;
    let bestScore = 0;
    originalSentences.forEach((candidate, candidateIndex) => {
      if (used.has(candidateIndex) || movedOut.has(normSentence(candidate))) return;
      const score =
        candidate === sentence ? 1 : similarity(normSentence(candidate), normSentence(sentence));
      if (score > bestScore) {
        bestScore = score;
        best = candidateIndex;
      }
    });
    if (best >= 0 && bestScore >= 0.55) {
      used.add(best);
      if (originalSentences[best] === sentence) {
        runs.push({ kind: "equal", text: lead + sentence });
      } else {
        const diff = wordDiff(originalSentences[best], sentence);
        if (lead && diff[0]) diff[0] = { ...diff[0], text: lead + diff[0].text };
        runs.push(...diff);
      }
    } else {
      runs.push({ kind: "insert", text: lead + sentence });
    }
  });
  originalSentences.forEach((sentence, index) => {
    if (used.has(index)) return;
    const kind = movedOut.has(normSentence(sentence)) ? "moveFrom" : "delete";
    runs.push({ kind, text: `${runs.length > 0 ? " " : ""}${sentence}` });
  });
  return mergeRuns(runs);
}

let noteSeq = 0;

function stamp(notes: Omit<Note, "id">[]): Note[] {
  return notes.map((note) => {
    noteSeq += 1;
    return { ...note, id: `n${noteSeq}` };
  });
}

function hashName(value: string): string {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `mv${(hash >>> 0).toString(16)}`;
}

export function compareClauses(name: string, original: Clause[], revised: Clause[]): Redline {
  noteSeq = 0;
  const links = pairClauses(original, revised);
  const byRev = new Map<number, Link>();
  for (const link of links.values()) byRev.set(link.ri, link);
  const originalSentences = sentenceIndex(original);
  const revisedSentences = sentenceIndex(revised);

  const movedOutOf = new Map<number, Set<string>>();
  const movedInto = new Map<number, Set<string>>();
  const remember = (map: Map<number, Set<string>>, index: number, key: string) => {
    const set = map.get(index) ?? new Set<string>();
    set.add(key);
    map.set(index, set);
  };

  original.forEach((clause, oi) => {
    const partner = links.get(oi);
    const partnerBody = partner ? revised[partner.ri].body : "";
    const partnerNorms = new Set(splitSentences(partnerBody).map(normSentence));
    for (const sentence of splitSentences(clause.body)) {
      const key = normSentence(sentence);
      if (partnerNorms.has(key)) continue;
      const hosts = (revisedSentences.get(key) ?? []).filter((id) => id !== revised[partner?.ri ?? -1]?.id);
      if (hosts.length > 0) remember(movedOutOf, oi, key);
    }
  });
  revised.forEach((clause, ri) => {
    const partner = byRev.get(ri);
    const partnerBody = partner ? original[partner.oi].body : "";
    const partnerNorms = new Set(splitSentences(partnerBody).map(normSentence));
    for (const sentence of splitSentences(clause.body)) {
      const key = normSentence(sentence);
      if (partnerNorms.has(key)) continue;
      const hosts = (originalSentences.get(key) ?? []).filter((id) => id !== original[partner?.oi ?? -1]?.id);
      if (hosts.length > 0) remember(movedInto, ri, key);
    }
  });

  const origTitles = new Map(original.filter((c) => c.number).map((c) => [c.number, titleKey(c.title)]));
  const revTitles = new Map(revised.filter((c) => c.number).map((c) => [c.number, titleKey(c.title)]));
  const origNames = new Map(original.filter((c) => c.number).map((c) => [c.number, c.title]));
  const revNames = new Map(revised.filter((c) => c.number).map((c) => [c.number, c.title]));

  const xrefFor = (clause: Clause): Omit<Note, "id">[] => {
    const notes: Omit<Note, "id">[] = [];
    const seen = new Set<string>();
    for (const match of clause.body.matchAll(/\b(?:Section|§)\s+(\d+(?:\.\d+)*)/g)) {
      const num = match[1];
      if (seen.has(num)) continue;
      seen.add(num);
      const next = revTitles.get(num);
      const prev = origTitles.get(num);
      if (!next) {
        notes.push({
          kind: "xref",
          title: "Broken cross-reference",
          phrase: match[0],
          body: `“${match[0]}” does not match a section in the revised draft.`,
        });
      } else if (prev && prev !== next) {
        notes.push({
          kind: "xref",
          title: "Stale cross-reference",
          phrase: match[0],
          body: `“${match[0]}” still uses the old number. Section ${num} is now “${revNames.get(num)}”. In the original it was “${origNames.get(num)}”.`,
        });
      }
    }
    return notes;
  };

  const blocks: Block[] = [];
  const destDone = new Set<number>();
  const ghostDone = new Set<number>();
  let i = 0;
  let j = 0;
  let guard = 0;
  const limit = original.length + revised.length + 8;

  const pushBlock = (block: Omit<Block, "notes"> & { pending: Omit<Note, "id">[] }) => {
    const notes = stamp(block.pending);
    blocks.push({ ...block, notes });
  };

  while ((i < original.length || j < revised.length) && guard < limit) {
    guard += 1;
    const linkO = i < original.length ? links.get(i) : undefined;
    const linkR = j < revised.length ? byRev.get(j) : undefined;

    if (linkO && linkR && linkO.ri === j && linkO.oi === i && linkO.kind === "align") {
      pushBlock(emitAligned(original[i], revised[j], movedOutOf.get(i), movedInto.get(j), xrefFor));
      i += 1;
      j += 1;
      continue;
    }
    if (linkR && linkR.kind === "move" && !destDone.has(linkR.oi)) {
      pushBlock(emitMoveDestination(original[linkR.oi], revised[j]));
      destDone.add(linkR.oi);
      j += 1;
      continue;
    }
    if (linkO && linkO.kind === "move" && !ghostDone.has(i)) {
      pushBlock(emitMoveGhost(original[i], revised[linkO.ri]));
      ghostDone.add(i);
      i += 1;
      continue;
    }
    if (j < revised.length && !linkR) {
      pushBlock(emitAdded(revised[j], movedInto.get(j), xrefFor));
      j += 1;
      continue;
    }
    if (i < original.length && !linkO) {
      pushBlock(emitRemoved(original[i], movedOutOf.get(i)));
      i += 1;
      continue;
    }
    if (j < revised.length) {
      j += 1;
      continue;
    }
    if (i < original.length) {
      i += 1;
    }
  }
  if (guard >= limit) {
    throw new Error("Clause alignment did not settle.");
  }

  const notes = blocks.flatMap((block) => block.notes);
  const countKind = (kind: BlockKind) => blocks.filter((block) => block.kind === kind).length;
  return {
    name,
    blocks,
    notes,
    counts: {
      clauses: blocks.length,
      unchanged: countKind("unchanged"),
      renumbered: countKind("renumbered"),
      modified: countKind("modified"),
      added: countKind("added"),
      removed: countKind("removed"),
      moved: countKind("moved"),
      risks: notes.filter((note) => note.kind === "risk").length,
      xrefs: notes.filter((note) => note.kind === "xref").length,
    },
  };
}

function emitAligned(
  before: Clause,
  after: Clause,
  movedOut: Set<string> | undefined,
  movedIn: Set<string> | undefined,
  xrefFor: (clause: Clause) => Omit<Note, "id">[],
): Omit<Block, "notes"> & { pending: Omit<Note, "id">[] } {
  const sameBody = normalizeSpace(before.body) === normalizeSpace(after.body);
  const sameTitle = titleKey(before.title) === titleKey(after.title);
  const renumbered = sameBody && sameTitle && before.number !== after.number;
  const unchanged = sameBody && sameTitle && before.number === after.number;
  const pending: Omit<Note, "id">[] = [];
  if (!unchanged && !renumbered) pending.push(...riskNotes(`${before.heading}\n${before.body}`, `${after.heading}\n${after.body}`));
  pending.push(...xrefFor(after));
  const beforeTerm = definedTerm(before.body);
  const afterTerm = definedTerm(after.body);
  if (beforeTerm && afterTerm && beforeTerm.term === afterTerm.term && beforeTerm.definition !== afterTerm.definition) {
    pending.push({
      kind: "term",
      title: "Defined term edited",
      phrase: afterTerm.term,
      body: `“${afterTerm.term}” does not mean the same thing it meant in the original.`,
    });
  }
  const ins = movedIn ?? new Set<string>();
  const outs = movedOut ?? new Set<string>();
  if (ins.size > 0 || outs.size > 0) {
    pending.push({
      kind: "move",
      title: "Sentence moved",
      body: "A full sentence left one clause and landed in another. It is marked as a move, not as a fresh insertion.",
    });
  }
  let scope: Scope = "none";
  if (!unchanged && !renumbered) {
    scope = scopeShift(before.body, after.body);
    if (scope !== "none") {
      pending.push({
        kind: "scope",
        title: scope === "broadened" ? "Wording broadened" : "Wording narrowed",
        body:
          scope === "broadened"
            ? "The revised wording adds expansive phrases or drops a limit."
            : "The revised wording adds a limit or replaces a stricter duty with a softer one.",
      });
    }
  }
  const kind: BlockKind = unchanged ? "unchanged" : renumbered ? "renumbered" : "modified";
  if (renumbered) {
    pending.push({
      kind: "move",
      title: "Renumbered",
      body: `Was ${label(before)}. The words did not change.`,
    });
  }
  return {
    id: after.id,
    kind,
    scope,
    headingRuns:
      before.heading === after.heading
        ? [{ kind: "equal", text: after.heading }]
        : wordDiff(before.heading, after.heading),
    bodyRuns: unchanged || renumbered ? [{ kind: "equal", text: after.body }] : bodyForPair(before.body, after.body, ins, outs),
    fromLabel: label(before),
    toLabel: label(after),
    structure: "runs",
    moveName: undefined,
    pending,
  };
}

function emitMoveDestination(before: Clause, after: Clause): Omit<Block, "notes"> & { pending: Omit<Note, "id">[] } {
  const pending: Omit<Note, "id">[] = [
    {
      kind: "move",
      title: "Clause moved",
      body: `“${before.title}” moved from ${label(before)} to ${label(after)}.`,
    },
    ...riskNotes(`${before.heading}\n${before.body}`, `${after.heading}\n${after.body}`),
  ];
  const scope = scopeShift(before.body, after.body);
  if (normalizeSpace(before.body) !== normalizeSpace(after.body) && scope !== "none") {
    pending.push({
      kind: "scope",
      title: scope === "broadened" ? "Wording broadened" : "Wording narrowed",
      body: "The moved clause also changed in scope.",
    });
  }
  return {
    id: after.id,
    kind: "moved",
    scope,
    headingRuns: wordDiff(before.heading, after.heading),
    bodyRuns: wordDiff(before.body, after.body),
    fromLabel: label(before),
    toLabel: label(after),
    structure: "clause",
    moveName: hashName(titleKey(before.title)),
    pending,
  };
}

function emitMoveGhost(before: Clause, after: Clause): Omit<Block, "notes"> & { pending: Omit<Note, "id">[] } {
  return {
    id: `${before.id}-from`,
    kind: "moved",
    scope: "none",
    headingRuns: [{ kind: "moveFrom", text: before.heading }],
    bodyRuns: [{ kind: "moveFrom", text: before.body }],
    fromLabel: label(before),
    toLabel: label(after),
    structure: "clause",
    moveName: hashName(titleKey(before.title)),
    pending: [
      {
        kind: "move",
        title: "Moved from here",
        body: `This clause now sits at ${label(after)}.`,
      },
    ],
  };
}

function emitAdded(
  clause: Clause,
  movedIn: Set<string> | undefined,
  xrefFor: (clause: Clause) => Omit<Note, "id">[],
): Omit<Block, "notes"> & { pending: Omit<Note, "id">[] } {
  const ins = movedIn ?? new Set<string>();
  const runs = bodyForPair("", clause.body, ins, new Set());
  return {
    id: clause.id,
    kind: ins.size > 0 && runs.every((run) => run.kind === "moveTo") ? "moved" : "added",
    scope: "none",
    headingRuns: [{ kind: "insert", text: clause.heading }],
    bodyRuns: runs,
    fromLabel: "",
    toLabel: label(clause),
    structure: "runs",
    moveName: undefined,
    pending: [
      { kind: "move", title: "Clause added", body: "This clause has no counterpart in the original." },
      ...riskNotes("", `${clause.heading}\n${clause.body}`),
      ...xrefFor(clause),
    ],
  };
}

function emitRemoved(clause: Clause, movedOut: Set<string> | undefined): Omit<Block, "notes"> & { pending: Omit<Note, "id">[] } {
  const outs = movedOut ?? new Set<string>();
  const sentences = splitSentences(clause.body);
  const allMoved = sentences.length > 0 && sentences.every((sentence) => outs.has(normSentence(sentence)));
  const bodyRuns: Run[] = sentences.map((sentence, index) => ({
    kind: outs.has(normSentence(sentence)) ? "moveFrom" : "delete",
    text: `${index > 0 ? " " : ""}${sentence}`,
  }));
  return {
    id: clause.id,
    kind: allMoved ? "moved" : "removed",
    scope: "none",
    headingRuns: [{ kind: allMoved ? "moveFrom" : "delete", text: clause.heading }],
    bodyRuns,
    fromLabel: label(clause),
    toLabel: "",
    structure: "runs",
    moveName: allMoved ? hashName(normSentence(sentences[0] ?? clause.body)) : undefined,
    pending: [
      allMoved
        ? {
            kind: "move",
            title: "Sentence moved",
            body: "Every sentence in this clause was carried into another clause. Nothing was simply deleted.",
          }
        : { kind: "move", title: "Clause removed", body: "This clause does not appear in the revised draft." },
    ],
  };
}

export function compareDrafts(name: string, original: DraftClause[], revised: DraftClause[]): Redline {
  return compareClauses(name, draftToClauses(original, "original"), draftToClauses(revised, "revised"));
}

export function toSummaryMarkdown(redline: Redline): string {
  const lines = [
    `# Redline — ${redline.name}`,
    "",
    "Comments name the clause and the matched phrase. They do not say whether the clause is enforceable.",
    "",
    "## Counts",
    "",
    "| | |",
    "| --- | --- |",
    ...Object.entries(redline.counts).map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "## Clauses",
    "",
    "| From | To | Change | Scope |",
    "| --- | --- | --- | --- |",
    ...redline.blocks.map(
      (block) => `| ${block.fromLabel || "—"} | ${block.toLabel || "—"} | ${block.kind} | ${block.scope} |`,
    ),
    "",
    "## Comments",
    "",
  ];
  if (redline.notes.length === 0) lines.push("None.");
  for (const note of redline.notes) {
    const phrase = note.phrase ? ` Matched “${note.phrase}”.` : "";
    lines.push(`- **${note.title}.** ${note.body}${phrase}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function blockPlain(block: Block): string {
  return [...block.headingRuns, ...block.bodyRuns].map((run) => run.text).join("");
}
