// node docs/tools/validate.js  -> checks every note anchor matches the snapshot
global.window = global;
require("../js/repo-data.js"); require("../js/knowledge.js"); require("../js/content.js");
let bad = 0, n = 0;
for (const [f, info] of Object.entries(KB.files)) {
  const src = REPO.files[f]; if (!src) { console.log("MISSING FILE", f); bad++; continue; }
  const lines = src.text.split("\n");
  for (const note of info.notes) {
    n++; const [a, b, anchor] = note;
    if (!lines[a - 1] || !lines[a - 1].includes(anchor) || b < a || b > lines.length) { bad++; console.log("BAD", f, a, b, JSON.stringify(anchor), "| line:", JSON.stringify(lines[a - 1])); }
  }
}
// lesson, trace and requirement references must point inside the file
if (global.C) {
  const chk = (f, a, b, what) => { const t = REPO.files[f]; if (!t || a < 1 || b > t.text.split("\n").length || b < a) { bad++; console.log("BAD REF", what, f, a, b); } };
  C.lessons.forEach((l) => l.cards.forEach((c) => c.code && chk(c.code.file, c.code.from, c.code.to, l.id)));
  C.traces.forEach((t) => chk(t.file, t.from, t.to, t.id));
  C.requirements.forEach((r) => { const [f, l] = r.ev.split(":"); if (l) chk(f, +l, +l, r.req); });
  C.questions.forEach((q) => { if (q.ref) { const [f, l] = q.ref.split(":"); chk(f, +l, +l, q.id); } });
}
for (const fd of KB.findings) { const l = REPO.files[fd.file]; if (!l) { bad++; console.log("finding file", fd.file); } }
for (const f of Object.keys(REPO.files)) if (!KB.files[f] && !f.endsWith("__init__.py")) console.log("no notes for", f);
console.log(n, "notes,", bad, "problems"); process.exit(bad ? 1 : 0);
