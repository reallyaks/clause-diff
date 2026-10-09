# clause-diff

Open [samples/nda/redline.md](samples/nda/redline.md) first. The matching Word file is [samples/nda/redline.docx](samples/nda/redline.docx).

DOCX in, DOCX out. It aligns numbered clauses, keeps moves as moves, and writes Word tracked changes plus comment balloons.

Not a chatbot. Not legal advice. The risk notes are phrase rules (auto-renewal, unlimited liability, one-way indemnity, assignment without consent, governing-law swap, jury waiver, shortened period). They name the clause and the matched phrase. They do not say what to sign.

## What it does not do

- It does not read scanned PDFs or image-only Word files.
- It does not understand tables, footnotes, or redlines that are already tracked changes.
- A heading must look like `4. Term` or `Section 4. Term`. A wall of unnumbered prose becomes one preamble.
- “Narrowed” and “broadened” are wording patterns, not a legal conclusion.
- Rules miss sarcasm, and a cross-reference written out in words (“section nine”) instead of `Section 9`.

## Run in about two minutes

Requires Node 22.

```bash
npm install
npm test
npm run samples
node --experimental-strip-types src/cli.ts samples/nda/original.docx samples/nda/revised.docx --out /tmp/redline.md --docx /tmp/redline.docx
```

Committed samples, so you can read a result with no install:

- [samples/nda/redline.md](samples/nda/redline.md) — counts, clause table, comments
- [samples/nda/redline.docx](samples/nda/redline.docx) — open in Word; track-changes and comments are in the file
- Same layout for `samples/saas` and `samples/contractor`

On the NDA sample, Term is flagged for auto-renewal. Purpose did not change and has no flag. Notices moves from §9 to §4. “return or destroy” moves into Obligations. Entire Agreement still cites Section 9, which is now the wrong clause.

Fictional contracts. Do not use them as forms.
