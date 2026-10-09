export type RunKind = "equal" | "insert" | "delete" | "moveFrom" | "moveTo";

export type Run = { kind: RunKind; text: string };

export function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function titleKey(title: string): string {
  return normalizeSpace(title)
    .toLowerCase()
    .replace(/^(?:section|article)\s+/i, "")
    .replace(/^\d+(?:\.\d+)*[.)]?\s+/, "")
    .replace(/[“”"']/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normSentence(value: string): string {
  return normalizeSpace(value)
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function splitSentences(value: string): string[] {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return [];
  return trimmed
    .split(/(?<=[.!?])\s+(?=[A-Z“"'])/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const left = new Set(a.split(" ").filter(Boolean));
  const right = new Set(b.split(" ").filter(Boolean));
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return (2 * shared) / (left.size + right.size);
}

type Match = { i: number; j: number; k: number };

function longestMatch(
  a: string[],
  b: string[],
  alo: number,
  ahi: number,
  blo: number,
  bhi: number,
): Match {
  const index = new Map<string, number[]>();
  for (let j = blo; j < bhi; j += 1) {
    const bucket = index.get(b[j]);
    if (bucket) bucket.push(j);
    else index.set(b[j], [j]);
  }
  let bestI = alo;
  let bestJ = blo;
  let best = 0;
  let prev = new Map<number, number>();
  for (let i = alo; i < ahi; i += 1) {
    const next = new Map<number, number>();
    for (const j of index.get(a[i]) ?? []) {
      if (j < blo || j >= bhi) continue;
      const size = (prev.get(j - 1) ?? 0) + 1;
      next.set(j, size);
      if (size > best) {
        best = size;
        bestI = i - size + 1;
        bestJ = j - size + 1;
      }
    }
    prev = next;
  }
  return { i: bestI, j: bestJ, k: best };
}

function matchingBlocks(a: string[], b: string[]): Match[] {
  const blocks: Match[] = [];
  const walk = (alo: number, ahi: number, blo: number, bhi: number) => {
    const match = longestMatch(a, b, alo, ahi, blo, bhi);
    if (match.k === 0) return;
    if (alo < match.i && blo < match.j) walk(alo, match.i, blo, match.j);
    blocks.push(match);
    if (match.i + match.k < ahi && match.j + match.k < bhi) {
      walk(match.i + match.k, ahi, match.j + match.k, bhi);
    }
  };
  walk(0, a.length, 0, b.length);
  blocks.push({ i: a.length, j: b.length, k: 0 });
  return blocks;
}

export type Opcode = {
  tag: "equal" | "delete" | "insert" | "replace";
  i1: number;
  i2: number;
  j1: number;
  j2: number;
};

export function opcodes(a: string[], b: string[]): Opcode[] {
  const out: Opcode[] = [];
  let i = 0;
  let j = 0;
  for (const block of matchingBlocks(a, b)) {
    const tag =
      i < block.i && j < block.j
        ? "replace"
        : i < block.i
          ? "delete"
          : j < block.j
            ? "insert"
            : null;
    if (tag) out.push({ tag, i1: i, i2: block.i, j1: j, j2: block.j });
    if (block.k) {
      out.push({
        tag: "equal",
        i1: block.i,
        i2: block.i + block.k,
        j1: block.j,
        j2: block.j + block.k,
      });
    }
    i = block.i + block.k;
    j = block.j + block.k;
  }
  return out;
}

function tokens(value: string): string[] {
  return value.split(/(\s+)/).filter((part) => part.length > 0);
}

export function wordDiff(before: string, after: string): Run[] {
  const a = tokens(before);
  const b = tokens(after);
  if (a.length * b.length > 1_500_000) {
    return [
      { kind: "delete", text: before },
      { kind: "insert", text: after },
    ];
  }
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const runs: Run[] = [];
  const push = (kind: RunKind, text: string) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && last.kind === kind) last.text += text;
    else runs.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("equal", a[i]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("delete", a[i]);
      i += 1;
    } else {
      push("insert", b[j]);
      j += 1;
    }
  }
  while (i < n) {
    push("delete", a[i]);
    i += 1;
  }
  while (j < m) {
    push("insert", b[j]);
    j += 1;
  }
  return runs;
}

export function mergeRuns(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const last = out[out.length - 1];
    if (last && last.kind === run.kind) last.text += run.text;
    else out.push({ ...run });
  }
  return out;
}

const BROAD =
  /\b(any and all|without limitation|including without limitation|unlimited|in perpetuity)\b/gi;
const NARROW = /\b(only|solely|except|excluding|limited to|capped at|neither|may not|shall not)\b/gi;

function weight(text: string): number {
  const broad = text.match(BROAD)?.length ?? 0;
  const narrow = text.match(NARROW)?.length ?? 0;
  const shall = text.match(/\bshall\b/gi)?.length ?? 0;
  const may = text.match(/\bmay\b/gi)?.length ?? 0;
  return broad * 2 - narrow * 2 + shall - may;
}

export type Scope = "broadened" | "narrowed" | "none";

export function scopeShift(before: string, after: string): Scope {
  const delta = weight(after) - weight(before);
  if (delta >= 2) return "broadened";
  if (delta <= -2) return "narrowed";
  return "none";
}

export function moveAnchor(value: string): string {
  const key = normSentence(value);
  let hash = 2166136261;
  for (const char of key) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `sn${(hash >>> 0).toString(16)}`;
}

const AMP = "&" + "amp;";
const LT = "&" + "lt;";
const GT = "&" + "gt;";
const QUOT = "&" + "quot;";
const APOS = "&" + "apos;";

export function xmlEscape(value: string): string {
  return value.replace(/&/g, AMP).replace(/</g, LT).replace(/>/g, GT).replace(/"/g, QUOT);
}

export function decodeXml(value: string): string {
  return value
    .replaceAll(LT, "<")
    .replaceAll(GT, ">")
    .replaceAll(QUOT, '"')
    .replaceAll(APOS, "'")
    .replaceAll(AMP, "&");
}

