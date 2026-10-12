// node docs/tools/validate.js  -> checks every note anchor matches the snapshot
global.window = global;
require("../js/repo-data.js"); require("../js/knowledge.js");
let bad = 0, n = 0;
for (const [f, info] of Object.entries(KB.files)) {
  const src = REPO.files[f]; if (!src) { console.log("MISSING FILE", f); bad++; continue; }
  const lines = src.text.split("\n");
  for (const note of info.notes) {
    n++; const [a, b, anchor] = note;
    if (!lines[a - 1] || !lines[a - 1].includes(anchor) || b < a || b > lines.length) { bad++; console.log("BAD", f, a, b, JSON.stringify(anchor), "| line:", JSON.stringify(lines[a - 1])); }
  }
}
for (const fd of KB.findings) { const l = REPO.files[fd.file]; if (!l) { bad++; console.log("finding file", fd.file); } }
for (const f of Object.keys(REPO.files)) if (!KB.files[f] && !f.endsWith("__init__.py")) console.log("no notes for", f);
console.log(n, "notes,", bad, "problems"); process.exit(bad ? 1 : 0);
