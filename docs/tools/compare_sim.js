// Compares the JS simulator with the REAL Python CLI for every deterministic test case.
// usage: node docs/tools/compare_sim.js   (run from repo root; needs python3)
global.window = global;
const { execFileSync } = require("child_process"); const fs = require("fs"); const os = require("os"); const path = require("path");
require("../js/repo-data.js"); require("../js/content.js"); require("../js/simulator.js");
const ROOT = path.resolve(__dirname, "../..");
const codes = { red: "\x1b[91m", yellow: "\x1b[93m", cyan: "\x1b[96m" };
const wrap = (t, c) => (c ? codes[c] + t + "\x1b[0m" : t);
(async () => {
  let bad = 0;
  const random = new Set(["T11", "T22"]); // random ids/marks
  for (const tc of C.tests) {
    if (random.has(tc.id)) continue;
    // JS stream
    const db = new SIM.SimDB(REPO.files["students.data"].text); let s = ""; let i = 0;
    await SIM.runCLI(db, { input: async (p, c) => { s += wrap(p, c); return i < tc.inputs.length ? tc.inputs[i++] : null; }, print: (t, c) => (s += wrap(t, c) + "\n"), trace() {}, changed() {}, end() {} });
    // Python stream on a temp copy
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sim"));
    execFileSync("bash", ["-c", `cd "${ROOT}" && git ls-files | grep -v '^docs/' | tar cf - -T - | tar xf - -C "${tmp}"`]);
    let py = "";
    try { py = execFileSync("python3", ["main.py"], { cwd: tmp, input: tc.inputs.join("\n") + "\n" }).toString(); }
    catch (e) { py = e.stdout.toString(); }
    const ok = py === s || py.startsWith(s);
    if (!ok) { bad++; console.log("MISMATCH", tc.id, "\nPY:", JSON.stringify(py), "\nJS:", JSON.stringify(s)); } else console.log("ok", tc.id);
  }
  process.exit(bad ? 1 : 0);
})();
