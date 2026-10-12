/* UniEnroll Learning Coach — core: state, routing, explorer, lessons, learn pages. */
(function () {
  const A = (window.App = {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  A.$ = $; A.$$ = $$;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  A.esc = esc;

  /* ---------------------------------------------------------- storage */
  const KEY = "uec.v1";
  const blank = () => ({ lessons: {}, q: {}, fc: {}, quiz: [], showcase: [], bookmarks: [], explained: {}, viewed: {}, settings: { name: "", model: "claude-opus-5-5", theme: "auto", brief: "" }, imported: null, streak: { last: "", days: 0 } });
  A.S = (() => { try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { return blank(); } })();
  A.S.settings = Object.assign(blank().settings, A.S.settings || {});
  A.save = () => { try { localStorage.setItem(KEY, JSON.stringify(A.S)); } catch (e) { A.toast("Could not save progress on this device"); } };
  // API key kept separately so it is never in exports
  A.getKey = () => { try { return localStorage.getItem("uec.key") || ""; } catch (e) { return ""; } };
  A.setKey = (k) => { try { k ? localStorage.setItem("uec.key", k) : localStorage.removeItem("uec.key"); } catch (e) {} };

  function touchStreak() {
    const d = new Date().toISOString().slice(0, 10), s = A.S.streak;
    if (s.last === d) return;
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    s.days = s.last === y ? s.days + 1 : 1; s.last = d; A.save();
  }

  /* ------------------------------------------------- active source */
  A.snapshotFiles = () => Object.fromEntries(Object.entries(REPO.files).map(([k, v]) => [k, v.text]));
  A.files = () => (A.S.imported && A.S.imported.files) || A.snapshotFiles();
  A.sourceLabel = () => (A.S.imported ? `Imported: ${A.S.imported.label}` : `Snapshot ${REPO.repo}@${REPO.commit} (${REPO.snapshotDate})`);
  A.lines = (p) => { const t = A.files()[p]; return t == null ? null : t.split("\n"); };

  /* Map hand-written notes onto the active version of a file. */
  A.notes = (path) => {
    const info = KB.files[path]; if (!info) return [];
    const lines = A.lines(path) || [];
    const same = REPO.files[path] && A.files()[path] === REPO.files[path].text;
    return info.notes.map((n) => {
      const [from, to, anchor, t, y, x = {}] = n;
      const o = { from, to, anchor, t, y, x, status: "verified" };
      if (same) return o;
      if (lines[from - 1] && lines[from - 1].includes(anchor)) return o;
      let best = -1, dist = 1e9;
      lines.forEach((l, i) => { if (l.includes(anchor) && Math.abs(i + 1 - from) < dist) { dist = Math.abs(i + 1 - from); best = i + 1; } });
      if (best < 0) return Object.assign(o, { status: "unverified" });
      return Object.assign(o, { from: best, to: best + (to - from), status: "moved" });
    });
  };
  A.notesAt = (path, n) => A.notes(path).filter((x) => n >= x.from && n <= x.to).sort((a, b) => (a.to - a.from) - (b.to - b.from));

  /* ----------------------------------------------- python helpers */
  const KW = new Set("False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield".split(" "));
  const BI = new Set("print input len range str int float list dict open super isinstance enumerate random self cls Exception RuntimeError".split(" "));
  A.hl = (line, path) => {
    if (!/\.py$/.test(path || ".py")) return esc(line);
    let out = "", i = 0;
    const re = /(#.*$)|("""[\s\S]*?"""|'''[\s\S]*?'''|[rf]?"(?:\\.|[^"\\])*"?|[rf]?'(?:\\.|[^'\\])*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/gm;
    let m, prevWord = "";
    while ((m = re.exec(line))) {
      out += esc(line.slice(i, m.index)); i = m.index + m[0].length;
      if (m[1]) out += `<span class="tk-c">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="tk-s">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="tk-n">${m[3]}</span>`;
      else { const w = m[4]; out += KW.has(w) ? `<span class="tk-k">${w}</span>` : (prevWord === "def" || prevWord === "class") ? `<span class="tk-f">${w}</span>` : BI.has(w) ? `<span class="tk-b">${w}</span>` : w; prevWord = w; }
    }
    return out + esc(line.slice(i));
  };

  /* Automatic plain-English explanation of ONE line (used everywhere, labelled "auto"). */
  A.explainLine = (raw, path) => {
    const s = raw.trim();
    if (!/\.py$/.test(path || "")) {
      if (!s) return "Empty line.";
      if (/\.data$|\.json$/.test(path)) return /"(\w+)":/.test(s) ? `JSON field "${s.match(/"(\w+)":/)[1]}" with its value.` : "Part of the JSON structure (brackets/braces).";
      return "Text in the project notes.";
    }
    if (!s) return "Empty line. Python ignores it; it makes the code easier to read.";
    if (s.startsWith("#")) return `A comment. Python ignores it. It is a note for people: “${s.replace(/^#+\s*/, "")}”.`;
    if (/^("""|''')/.test(s)) return "Part of a docstring: a description of the function written as text.";
    let m;
    if ((m = s.match(/^from\s+([\w.]+)\s+import\s+\(?\s*(.*)$/))) return `Imports ${m[2].replace(/[()\\]/g, "").trim() || "names"} from the module ${m[1]} (the file ${m[1].replace(/\./g, "/")}.py), so this file can use them.`;
    if ((m = s.match(/^import\s+([\w.]+)(?:\s+as\s+(\w+))?/))) return `Imports the ${m[1]} module${m[2] ? ` and calls it ${m[2]}` : ""}.`;
    if ((m = s.match(/^class\s+(\w+)(?:\(([^)]*)\))?:/))) return `Starts a class called ${m[1]} — a blueprint for objects.${m[2] ? ` It inherits from ${m[2]}, so it gets all of ${m[2]}'s features.` : ""}`;
    if ((m = s.match(/^def\s+(\w+)\((.*)\)\s*(?:->.*)?:/))) {
      const ps = m[2].split(",").map((p) => p.trim().split(/[:=]/)[0].trim()).filter(Boolean);
      const isM = ps[0] === "self" || ps[0] === "cls";
      const args = ps.filter((p) => p !== "self" && p !== "cls");
      const nm = m[1] === "__init__" ? "the constructor (__init__), which runs when a new object is created" : m[1] === "__str__" ? "__str__, which Python calls when the object is printed" : `${isM ? "the method" : "the function"} ${m[1]}`;
      return `Defines ${nm}. ${args.length ? `Inputs: ${args.join(", ")}.` : "It takes no inputs" + (isM ? " apart from the object itself" : "") + "."}`;
    }
    if (s.startsWith("@classmethod")) return "A decorator: the next method belongs to the class, not one object. It receives the class as cls.";
    if ((m = s.match(/^return\s*(.*)$/))) return m[1] ? `Ends the function and gives back ${m[1]} to whoever called it.` : "Ends the function and gives back nothing (None).";
    if ((m = s.match(/^raise\s+(\w+)/))) return `Raises (throws) the error ${m[1]}. The function stops here and Python looks for a matching except.`;
    if (s === "try:") return "Starts a try block: if any line inside causes an error, Python jumps to the except block instead of crashing.";
    if ((m = s.match(/^except\s*(\w+)?(?:\s+as\s+(\w+))?:/))) return m[1] ? `Catches a ${m[1]} error${m[2] ? ` and stores it in ${m[2]}` : ""}, then runs the lines below.` : "Catches any error.";
    if ((m = s.match(/^(if|elif)\s+(.*):$/))) return `${m[1] === "if" ? "Checks" : "Otherwise checks"} the condition ${m[2]}. If it is True, the indented lines below run.`;
    if (s === "else:") return "Runs the indented lines below when none of the conditions above were True.";
    if (s === "while True:") return "Starts a loop that repeats forever, until a break or return inside it.";
    if ((m = s.match(/^while\s+(.*):$/))) return `Repeats the indented lines while ${m[1]} is True.`;
    if ((m = s.match(/^for\s+(.*)\s+in\s+(.*):$/))) return `A loop: for each item in ${m[2]}, store it in ${m[1]} and run the indented lines.`;
    if ((m = s.match(/^with\s+(.*)\s+as\s+(\w+):/))) return `Opens ${m[1]} as ${m[2]}; “with” closes it automatically afterwards.`;
    if (s === "break") return "Leaves the nearest loop immediately.";
    if (s === "pass") return "Does nothing. Used where Python needs at least one line (e.g. an empty class).";
    if (s === "continue") return "Skips to the next turn of the loop.";
    if (/^super\(\)\.__init__/.test(s)) return "Runs the parent class's constructor so the object is set up properly (here: create the Tkinter window).";
    if ((m = s.match(/^(self\.)?([\w.]+)\s*=\s*input\((.*)\)/))) return `Shows the prompt ${m[3]} and waits for the user to type; the text is stored in ${m[2]}.`;
    if ((m = s.match(/^print\((.*)\)$/))) return `Prints text on the screen: ${m[1].length > 70 ? m[1].slice(0, 70) + "…" : m[1]}.`;
    if ((m = s.match(/^([\w.\[\]"', ]+?)\s*(\+=|-=|=)\s*(.+)$/)) && !/^[=]/.test(m[3])) {
      const tgt = m[1].trim();
      if (m[2] === "+=") return `Adds ${m[3]} to ${tgt}.`;
      const where = tgt.startsWith("self.") ? ` on this object (${tgt.slice(5)} can be used by other methods)` : "";
      return `Stores ${m[3].length > 60 ? "the value on the right" : m[3]} in ${tgt}${where}.`;
    }
    if ((m = s.match(/^([\w.]+)\.(append|pop|remove|pack|grid|config|destroy|withdraw|deiconify|focus|set|title|geometry|resizable|transient|grab_set|wait_window|protocol|mainloop)\(/))) {
      const d = { append: "adds an item to the end of the list", pop: "removes an item by position", remove: "removes that item from the list", pack: "places the widget in the window (stacked)", grid: "places the widget in a row/column", config: "changes the widget's settings", destroy: "closes the window", withdraw: "hides the window", deiconify: "shows the hidden window again", focus: "puts the cursor in this field", set: "changes the value", title: "sets the window title", geometry: "sets window size/position", resizable: "allows/blocks resizing", transient: "keeps it on top of its parent", grab_set: "blocks other windows (modal)", wait_window: "waits until the window closes", protocol: "reacts to the window's close button", mainloop: "starts the event loop" };
      return `Calls ${m[2]}() on ${m[1]}: ${d[m[2]]}.`;
    }
    if (/^[)\]}],?$/.test(s)) return "Closes the brackets opened above.";
    if ((m = s.match(/^([\w.]+)\(/))) return `Calls ${m[1]}(…) with the values in brackets.`;
    return "Part of the statement started above (Python lets long statements continue across lines inside brackets).";
  };

  /* ------------------------------------------------------- symbols */
  A.symbols = (path) => {
    const L = A.lines(path) || []; const out = []; let cls = null;
    L.forEach((l, i) => {
      let m;
      if ((m = l.match(/^class\s+(\w+)/))) { cls = m[1]; out.push({ kind: "class", name: m[1], full: m[1], line: i + 1 }); }
      else if ((m = l.match(/^(\s*)def\s+(\w+)\((.*)\)/))) {
        const inCls = m[1].length > 0 && cls; if (!m[1].length) cls = null;
        out.push({ kind: inCls ? "method" : "function", name: m[2], full: inCls ? `${cls}.${m[2]}` : m[2], line: i + 1, sig: m[3] });
      }
    });
    return out;
  };
  A.callsOf = (full, path) => {
    const key = full === "main" ? `${path}:main` : full;
    return { out: KB.calls.filter((c) => c[0] === key).map((c) => c[1]), in: KB.calls.filter((c) => c[1] === key).map((c) => c[0]) };
  };
  A.findSymbol = (full) => {
    if (/:main$/.test(full)) return { path: full.split(":")[0], line: (A.symbols(full.split(":")[0]).find((s) => s.name === "main") || {}).line };
    for (const p of Object.keys(A.files())) { const s = A.symbols(p).find((x) => x.full === full); if (s) return { path: p, line: s.line }; }
    return null;
  };

  /* ------------------------------------------------------- UI bits */
  const ICON = {
    home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="currentColor"/>',
    learn: '<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM13 4h5.5c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H13z" fill="currentColor"/>',
    practice: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>',
    showcase: '<rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
    me: '<circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6z" fill="currentColor"/>',
    chev: '<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    back: '<path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    file: '<path d="M6 3h8l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="2"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>',
    term: '<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="m7 9 3 3-3 3M12 15h5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z" fill="currentColor"/>',
    check: '<path d="m5 12 5 5 9-10" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
    cards: '<rect x="3" y="6" width="14" height="14" rx="2" fill="currentColor" opacity=".5"/><rect x="7" y="3" width="14" height="14" rx="2" fill="currentColor"/>',
    bug: '<ellipse cx="12" cy="13" rx="5" ry="7" fill="currentColor"/><path d="M4 9l3 2M20 9l-3 2M3 14h4M17 14h4M5 20l3-3M19 20l-3-3M9 4l1.5 2.5M15 4l-1.5 2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    trace: '<path d="M4 6h10M4 12h16M4 18h7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="18" cy="6" r="2.2" fill="currentColor"/>',
    window: '<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9h18" stroke="currentColor" stroke-width="2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="4.5" cy="6" r="1.5" fill="currentColor"/><circle cx="4.5" cy="12" r="1.5" fill="currentColor"/><circle cx="4.5" cy="18" r="1.5" fill="currentColor"/>',
    diagram: '<rect x="3" y="3" width="7" height="6" rx="1.5" fill="currentColor"/><rect x="14" y="15" width="7" height="6" rx="1.5" fill="currentColor"/><path d="M6.5 9v5.5H14" stroke="currentColor" stroke-width="2" fill="none"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/>',
    gear: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    cloud: '<path d="M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8.5 4.5 4.5 0 0 1 17.5 18z" fill="currentColor"/>',
    repeat: '<path d="M4 10a6 6 0 0 1 10-4l2 2M20 14a6 6 0 0 1-10 4l-2-2M16 4v4h-4M8 20v-4h4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  A.icon = (n, cls = "") => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${ICON[n] || ""}</svg>`;
  A.row = (o) => `<button class="row${o.icon ? "" : " noicon"}" ${o.go ? `data-go="${esc(o.go)}"` : ""} ${o.act ? `data-act="${esc(o.act)}"` : ""}>
      ${o.icon ? `<span class="ic" style="background:${o.color || "var(--blue)"}">${ICON[o.icon] ? A.icon(o.icon) : o.icon}</span>` : ""}
      <span class="main"><div class="t">${o.t}</div>${o.d ? `<div class="d">${o.d}</div>` : ""}</span>
      ${o.r != null ? `<span class="r">${o.r}</span>` : ""}${o.go || o.chev ? `<span class="chev">${A.icon("chev")}</span>`.replace("<svg", '<svg width="14" height="14"') : ""}</button>`;
  A.toast = (t) => { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); };
  A.ring = (pct, label) => { const r = 44, c = 2 * Math.PI * r; return `<div class="ring"><svg viewBox="0 0 104 104"><circle cx="52" cy="52" r="${r}" stroke="var(--card2)" stroke-width="10" fill="none"/><circle cx="52" cy="52" r="${r}" stroke="${pct >= 75 ? "var(--green)" : pct >= 45 ? "var(--orange)" : "var(--red)"}" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/></svg><div class="v"><div>${pct}%<small>${label}</small></div></div></div>`; };
  A.bar = (pct, color) => `<div class="bar"><i style="width:${Math.max(0, Math.min(100, pct))}%;${color ? `background:${color}` : ""}"></i></div>`;

  /* bottom sheet */
  A.sheet = (title, html, mount) => {
    A.closeSheet();
    const s = document.createElement("div"); s.className = "scrim"; s.onclick = A.closeSheet;
    const d = document.createElement("div"); d.className = "sheet"; d.setAttribute("role", "dialog");
    d.innerHTML = `<div class="grab"></div><div class="sh-h"><b>${title}</b><button class="btn small gray" data-close>Done</button></div>${html}`;
    document.body.append(s, d); d.querySelector("[data-close]").onclick = A.closeSheet;
    wire(d); mount && mount(d);
  };
  A.closeSheet = () => { $$(".scrim,.sheet").forEach((e) => e.remove()); };

  /* ---------------------------------------------------- progress */
  const INTERVAL = [0, 6e5, 864e5, 2 * 864e5, 4 * 864e5, 8 * 864e5];
  A.grade = (store, id, ok, extra) => {
    const r = A.S[store][id] || { box: 0, seen: 0, right: 0, wrong: 0 };
    r.seen++; r.last = Date.now();
    if (ok === true) { r.right++; r.box = Math.min(5, r.box + 1); } else if (ok === "half") { r.box = Math.max(1, r.box); } else { r.wrong++; r.box = 0; }
    if (extra) Object.assign(r, extra);
    A.S[store][id] = r; touchStreak(); A.save();
  };
  A.isDue = (store, id) => { const r = A.S[store][id]; return !r || Date.now() - (r.last || 0) >= INTERVAL[r.box]; };
  A.topicMastery = (t) => {
    const qs = C.questions.filter((q) => q.topic === t);
    let sum = 0; qs.forEach((q) => { const r = A.S.q[q.id]; sum += r ? Math.min(r.box, 3) / 3 : 0; });
    const lesson = C.lessons.filter((l) => l.topic === t), ld = lesson.filter((l) => A.S.lessons[l.id]).length;
    const qp = qs.length ? sum / qs.length : 0, lp = lesson.length ? ld / lesson.length : qp;
    return Math.round((qp * 0.7 + lp * 0.3) * 100);
  };
  A.readiness = () => {
    const lp = Object.keys(A.S.lessons).length / C.lessons.length;
    let qs = 0; C.questions.forEach((q) => { const r = A.S.q[q.id]; qs += r ? Math.min(r.box, 3) / 3 : 0; }); qs /= C.questions.length;
    const qz = A.S.quiz.slice(-8); const qa = qz.length ? qz.reduce((a, b) => a + b.score / b.total, 0) / qz.length : 0;
    const sc = A.S.showcase.slice(-3); const sa = sc.length ? sc.reduce((a, b) => a + b.pct, 0) / sc.length / 100 : 0;
    const files = Object.keys(KB.files).length, viewed = Object.keys(A.S.viewed).filter((f) => KB.files[f]).length / files;
    return Math.round((lp * 0.2 + qs * 0.3 + qa * 0.15 + sa * 0.25 + viewed * 0.1) * 100);
  };
  A.weakTopics = () => Object.keys(C.topics).map((t) => ({ t, m: A.topicMastery(t) })).sort((a, b) => a.m - b.m);
  A.struggling = () => C.questions.filter((q) => { const r = A.S.q[q.id]; return r && (r.box <= 1) && r.wrong > 0; });

  /* -------------------------------------------------------- router */
  const routes = {}; A.route = (name, fn) => (routes[name] = fn);
  A.go = (p) => { if (location.hash === "#" + p) render(); else location.hash = p; };
  A.back = () => (history.length > 1 ? history.back() : A.go("/home"));
  const TABS = [["home", "Home", "/home"], ["learn", "Learn", "/learn"], ["practice", "Practice", "/practice"], ["showcase", "Showcase", "/showcase"], ["me", "Me", "/me"]];
  let cleanup = null;
  function render() {
    const raw = location.hash.slice(1) || "/home";
    const [pathPart, qs] = raw.split("?");
    const parts = pathPart.split("/").filter(Boolean);
    const name = parts[0] || "home", arg = decodeURIComponent(parts.slice(1).join("/"));
    const q = Object.fromEntries(new URLSearchParams(qs || ""));
    const fn = routes[name] || routes.home;
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    A.closeSheet();
    const v = fn(arg, q) || {};
    const tab = v.tab || name;
    const app = $("#app");
    app.innerHTML = (v.large ? `<div class="nav" style="justify-content:flex-end">${v.action ? `<button class="act" data-act="navact">${v.action}</button>` : ""}</div><h1 class="large">${v.title}</h1>${v.sub ? `<p class="sub">${v.sub}</p>` : ""}`
      : `<div class="nav"><button class="back" data-act="back">${A.icon("back").replace("<svg", '<svg width="20" height="20"')}<span>${esc(v.backLabel || "Back")}</span></button><div class="ttl">${esc(v.title || "")}</div><button class="act" data-act="navact">${v.action || ""}</button></div>`) +
      `<div class="page">${v.html || ""}</div>`;
    $("#tabs").innerHTML = `<div class="in">${TABS.map(([id, label, p]) => `<button data-go="${p}" class="${tab === id ? "on" : ""}" aria-label="${label}">${A.icon(id)}<span>${label}</span></button>`).join("")}</div>`;
    wire(document);
    const na = $('[data-act="navact"]'); if (na && v.onAction) na.onclick = v.onAction;
    if (v.mount) cleanup = v.mount(app) || null;
    if (!v.keepScroll) window.scrollTo(0, 0);
  }
  function wire(root) {
    $$("[data-go]", root).forEach((b) => (b.onclick = (e) => { e.preventDefault(); A.go(b.dataset.go); }));
    $$('[data-act="back"]', root).forEach((b) => (b.onclick = A.back));
  }
  A.wire = wire;
  window.addEventListener("hashchange", render);

  /* ============================================================ HOME */
  A.route("home", () => {
    const rd = A.readiness(), weak = A.weakTopics().slice(0, 3), struggle = A.struggling().length;
    const next = C.lessons.find((l) => !A.S.lessons[l.id]);
    const due = C.questions.filter((q) => A.S.q[q.id] && A.isDue("q", q.id)).length;
    const name = A.S.settings.name ? A.S.settings.name.split(" ")[0] : "";
    const hr = new Date().getHours(), greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    return { large: true, title: "UniEnroll Coach", sub: `${greet}${name ? ", " + esc(name) : ""} · 32555 Assessment 1 · Cmp1-07 Group 3`, html: `
      <div class="card"><div class="hero">${A.ring(rd, "ready")}<div style="flex:1">
        <b>Showcase readiness</b><p class="muted small" style="margin:4px 0 8px">Lessons, tutor answers, quizzes, showcase practice and files explored.</p>
        <div class="small">🔥 ${A.S.streak.days || 0}-day streak · ${Object.keys(A.S.lessons).length}/${C.lessons.length} lessons</div></div></div>
        <div class="btns"><button class="btn" data-go="${next ? "/lesson/" + next.id : "/revision"}">${next ? "Continue: " + esc(next.title) : "Revision session"}</button></div></div>
      ${KB.findings.length ? `<div class="card" style="border-left:4px solid var(--orange)"><b>⚠️ Check before your showcase</b><p class="small">The GUI login in your repo does not work as written (verified). ${KB.findings.length - 1} smaller issues were also found.</p><button class="btn small orange" data-go="/findings">See findings</button></div>` : ""}
      <div class="tiles">
        ${tile("/tutor", "chat", "#5856d6", "AI Tutor", "Questions with hints")}
        ${tile("/showcase", "showcase", "#ff2d55", "Showcase sim", "Practise the demo")}
        ${tile("/files", "file", "#007aff", "Explorer", "Every file & line")}
        ${tile("/sim", "term", "#1c1c1e", "Run & predict", "Real CLI outputs")}
        ${tile("/quiz", "check", "#34c759", "Quiz", "Quick test")}
        ${tile("/flash", "cards", "#ff9500", "Flashcards", "Spaced repetition")}
        ${tile("/req", "flag", "#af52de", "Requirements", "Checklist & tests")}
        ${tile("/search", "search", "#8e8e93", "Search", "Code, lessons, Qs")}
      </div>
      <div class="sec-h">Weakest topics</div>
      <div class="group">${weak.map((w) => A.row({ t: C.topics[w.t], d: A.bar(w.m), r: w.m + "%", go: "/tutor?topic=" + w.t })).join("")}</div>
      <div class="sec-h">Today</div>
      <div class="group">
        ${A.row({ icon: "repeat", color: "#ff9500", t: "Revision session", d: `${due} questions due · ${struggle} you struggled with`, go: "/revision" })}
        ${A.row({ icon: "diagram", color: "#30b0c7", t: "Diagrams", d: "Architecture, menus, GUI, data", go: "/diagrams" })}
        ${A.row({ icon: "learn", color: "#34c759", t: "All lessons", d: `${C.lessons.length} short lessons`, go: "/lessons" })}
      </div>
      <p class="sec-f">${esc(A.sourceLabel())}</p>` };
    function tile(go, ic, col, t, d) { return `<button class="tile" data-go="${go}"><span class="ic" style="background:${col}">${A.icon(ic)}</span><b>${t}</b><span>${d}</span></button>`; }
  });

  /* =========================================================== LEARN */
  A.route("learn", () => ({ large: true, title: "Learn", sub: "Short lessons and your real code, explained simply.", html: `
    <div class="group">
      ${A.row({ icon: "learn", color: "#34c759", t: "Lessons", d: `${Object.keys(A.S.lessons).length} of ${C.lessons.length} done`, go: "/lessons" })}
      ${A.row({ icon: "file", color: "#007aff", t: "Repository Explorer", d: "Every file, class, function and line", go: "/files" })}
      ${A.row({ icon: "diagram", color: "#30b0c7", t: "Diagrams", d: "How everything connects", go: "/diagrams" })}
      ${A.row({ icon: "flag", color: "#af52de", t: "Requirements & marking", d: "What is done, with evidence", go: "/req" })}
      ${A.row({ icon: "check", color: "#ff9500", t: "Test cases", d: `${C.tests.length} cases with expected results`, go: "/tests" })}
      ${A.row({ icon: "bug", color: "#ff3b30", t: "Findings (issues in the code)", d: `${KB.findings.length} verified items`, go: "/findings" })}
      ${A.row({ icon: "list", color: "#8e8e93", t: "Glossary", d: "Simple meanings of words", go: "/glossary" })}
      ${A.row({ icon: "search", color: "#5856d6", t: "Search", go: "/search" })}
    </div>
    <div class="sec-h">Lessons by topic</div>
    <div class="group">${Object.entries(C.topics).map(([k, v]) => { const ls = C.lessons.filter((l) => l.topic === k); return ls.length ? A.row({ t: v, d: ls.map((l) => (A.S.lessons[l.id] ? "✓ " : "") + esc(l.title)).join(" · "), r: A.topicMastery(k) + "%", go: "/lesson/" + ls[0].id }) : ""; }).join("")}</div>` }));

  A.route("lessons", () => ({ title: "Lessons", tab: "learn", html: `<div class="sec-h">${C.lessons.length} lessons · about ${C.lessons.reduce((a, l) => a + l.mins, 0)} minutes</div>
    <div class="group">${C.lessons.map((l, i) => A.row({ icon: A.S.lessons[l.id] ? A.icon("check") : String(i + 1), color: A.S.lessons[l.id] ? "var(--green)" : "#8e8e93", t: esc(l.title), d: `${C.topics[l.topic]} · ${l.mins} min`, go: "/lesson/" + l.id })).join("")}</div>` }));

  A.route("lesson", (id) => {
    const L = C.lessons.find((l) => l.id === id) || C.lessons[0]; let i = 0;
    return { title: L.title, tab: "learn", html: `<div id="lc"></div><div class="dots" id="dots"></div>
      <div class="btns" style="margin:0 16px"><button class="btn gray" id="prev">Back</button><button class="btn" id="next">Next</button></div>
      <div class="btns" style="margin:12px 16px 0"><button class="btn gray small" data-go="/tutor?topic=${L.topic}">Practise this topic</button><button class="btn gray small" id="askl">Ask about this lesson</button></div>`,
      mount() {
        const show = () => {
          const c = L.cards[i];
          let code = "";
          if (c.code) { const ls = A.lines(c.code.file) || []; code = `<div class="small muted" style="margin-top:10px">${esc(c.code.file)} · lines ${c.code.from}-${c.code.to} <a href="#/file/${encodeURIComponent(c.code.file)}?l=${c.code.from}">open ›</a></div><pre>${ls.slice(c.code.from - 1, c.code.to).map((l, k) => `<span style="color:var(--muted)">${String(c.code.from + k).padStart(3)}  </span>${A.hl(l, c.code.file)}`).join("\n")}</pre>`; }
          $("#lc").innerHTML = `<div class="lcard${c.say ? " say" : ""}"><h2>${c.h}</h2><div>${c.b}</div>${code}${c.say ? `<p class="small muted">Practise saying this out loud. Then say it again in your own words.</p>` : ""}</div>`;
          $("#dots").innerHTML = L.cards.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("");
          $("#prev").disabled = i === 0;
          $("#next").textContent = i === L.cards.length - 1 ? "Finish ✓" : "Next";
        };
        $("#prev").onclick = () => { if (i > 0) { i--; show(); } };
        $("#next").onclick = () => {
          if (i < L.cards.length - 1) { i++; show(); return; }
          A.S.lessons[L.id] = Date.now(); touchStreak(); A.save(); A.toast("Lesson complete ✓");
          const n = C.lessons[C.lessons.indexOf(L) + 1]; A.go(n ? "/lesson/" + n.id : "/lessons");
        };
        $("#askl").onclick = () => A.go("/tutor?ask=" + encodeURIComponent(`Explain the lesson "${L.title}" again more simply, with an example.`));
        show();
      } };
  });

  /* ======================================================== EXPLORER */
  A.route("files", () => {
    const files = A.files(); const known = new Set();
    const layerRows = KB.layers.map((ly) => {
      const fs = ly.files.filter((f) => files[f] != null); fs.forEach((f) => known.add(f));
      return `<div class="sec-h" style="color:${ly.color}">${esc(ly.name)}</div><p class="sec-f" style="margin-top:-2px;margin-bottom:6px">${esc(ly.plain)}</p>
        <div class="group">${fs.map((f) => fileRow(f)).join("")}</div>`;
    }).join("");
    const other = Object.keys(files).filter((f) => !known.has(f));
    return { title: "Repository Explorer", tab: "learn", html: `<div class="card small"><b>Source:</b> ${esc(A.sourceLabel())}<br><span class="muted">Blue bar = explained line. Orange = known issue. Tap any line.</span>
      <div class="btns"><button class="btn small gray" data-go="/import">Import / update repo</button><button class="btn small gray" data-go="/diagrams">Diagrams</button></div></div>
      ${layerRows}${other.length ? `<div class="sec-h">Other files</div><div class="group">${other.map(fileRow).join("")}</div>` : ""}` };
    function fileRow(f) {
      const info = KB.files[f]; const n = (A.lines(f) || []).length;
      const changed = REPO.files[f] && files[f] !== REPO.files[f].text;
      return A.row({ t: `<span class="mono" style="font-size:15px">${esc(f)}</span>`, d: `${info ? esc(info.role) : f.endsWith("__init__.py") ? "Empty file that makes this folder a Python package" : "Not explained yet — auto explanations only"} · ${n} lines${changed ? ' · <span class="tag warn">changed</span>' : ""}${!REPO.files[f] ? ' · <span class="tag unv">new</span>' : ""}${A.S.viewed[f] ? " · ✓" : ""}`, go: "/file/" + encodeURIComponent(f) });
    }
  });

  A.route("file", (path, q) => {
    const lines = A.lines(path);
    if (!lines) return { title: "Not found", html: `<div class="empty">File not found in the active source.</div>` };
    A.S.viewed[path] = Date.now(); A.save();
    const info = KB.files[path], notes = A.notes(path), syms = A.symbols(path);
    const noted = new Set(), warned = new Set();
    notes.forEach((n) => { for (let k = n.from; k <= n.to; k++) { noted.add(k); if (n.x.w) warned.add(k); } });
    KB.findings.filter((f) => f.file === path).forEach((f) => warned.add(f.line));
    const authors = REPO.files[path] ? Object.entries(REPO.files[path].authors).map(([a, c]) => `${esc(a)} (${c})`).join(", ") : "unknown";
    const changed = REPO.files[path] && A.files()[path] !== REPO.files[path].text;
    const wrap = A.S.settings.wrap !== false;
    return { title: path.split("/").pop(), tab: "learn", action: wrap ? "↔" : "↩", onAction: () => { A.S.settings.wrap = !wrap; A.save(); A.go(location.hash.slice(1)); }, html: `
      <div class="card">
        <div class="mono small muted">${esc(path)}</div>
        <h3 style="margin-top:4px">${info ? esc(info.role) : "File"}</h3>
        ${info ? `<p>${esc(info.summary)}</p>${info.why ? `<p class="small"><b>Why it exists:</b> ${esc(info.why)}</p>` : ""}` : `<div class="unvbox">No hand-written lesson for this file. Tap lines for automatic explanations (cannot be fully verified).</div>`}
        ${changed ? `<div class="warnbox small">This file is different from the snapshot the lessons were written for. Notes were re-matched by their anchor text; anything that could not be matched is marked "not verified".</div>` : ""}
        <p class="small muted">Git authors: ${authors}</p>
        ${info && info.say ? `<div class="say small"><b>🎤 Say it like this:</b> ${esc(info.say)}</div>` : ""}
        <div class="btns"><button class="btn small gray" id="bmf">☆ Bookmark</button><button class="btn small gray" data-go="/tutor?file=${encodeURIComponent(path)}">Quiz me on this file</button></div>
      </div>
      ${syms.length ? `<div class="sec-h">Classes & functions</div><div class="group">${syms.map((s) => A.row({ t: `<span class="mono" style="font-size:15px">${s.kind === "class" ? "class " : ""}${esc(s.full)}${s.kind !== "class" ? "(" + esc(s.sig) + ")" : ""}</span>`, d: `${s.kind} · line ${s.line}`, act: "sym:" + s.line + ":" + s.full, chev: 1 })).join("")}</div>` : ""}
      <div class="sec-h">Code · tap a line</div>
      <div class="code${wrap ? "" : " nowrap"}" id="code">${lines.map((l, i) => `<div class="ln${noted.has(i + 1) ? " noted" : ""}${warned.has(i + 1) ? " warned" : ""}" data-l="${i + 1}" id="L${i + 1}"><span class="n">${i + 1}</span><span class="c">${A.hl(l, path) || " "}</span></div>`).join("")}</div>`,
      mount() {
        $("#code").onclick = (e) => { const ln = e.target.closest(".ln"); if (ln) A.lineSheet(path, +ln.dataset.l); };
        $$('[data-act^="sym:"]').forEach((b) => (b.onclick = () => { const [, l, full] = b.dataset.act.split(":"); A.symbolSheet(path, +l, full); }));
        $("#bmf").onclick = () => { A.bookmark({ type: "file", file: path, title: path }); };
        if (q.l) setTimeout(() => { const el = $("#L" + q.l); if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("sel"); if (q.open) A.lineSheet(path, +q.l); } }, 60);
      } };
  });

  A.bookmark = (b) => {
    const k = b.file + ":" + (b.line || 0);
    if (A.S.bookmarks.some((x) => x.file + ":" + (x.line || 0) === k)) { A.toast("Already bookmarked"); return; }
    A.S.bookmarks.unshift(Object.assign({ at: Date.now() }, b)); A.save(); A.toast("Bookmarked ★");
  };

  A.lineSheet = (path, n) => {
    const lines = A.lines(path), text = lines[n - 1] || "";
    $$(".ln.sel").forEach((e) => e.classList.remove("sel")); const el = $("#L" + n); el && el.classList.add("sel");
    const ns = A.notesAt(path, n);
    const fnd = KB.findings.filter((f) => f.file === path && Math.abs(f.line - n) <= 0 && true);
    const sym = A.symbols(path).filter((s) => s.line <= n).pop();
    const note = ns[0];
    const html = `<div class="card"><pre style="margin:0">${String(n).padStart(3)}  ${A.hl(text, path)}</pre></div>
      <div class="card">
        <div class="small muted">Plain English (this exact line) <span class="tag">auto</span></div>
        <p>${esc(A.explainLine(text, path))}</p>
        ${note ? `<hr style="border:0;border-top:.5px solid var(--sep)">
          <div class="small muted">Lines ${note.from}-${note.to} explained ${note.status === "verified" ? '<span class="tag ok">verified</span>' : note.status === "moved" ? '<span class="tag warn">re-matched</span>' : '<span class="tag unv">not verified</span>'}</div>
          <dl class="kv"><dt>What</dt><dd>${esc(note.t)}</dd>${note.y ? `<dt>Why</dt><dd>${esc(note.y)}</dd>` : ""}${note.x.i ? `<dt>Inputs</dt><dd>${esc(note.x.i)}</dd>` : ""}${note.x.o ? `<dt>Outputs</dt><dd>${esc(note.x.o)}</dd>` : ""}${note.x.d ? `<dt>Depends on</dt><dd>${esc(note.x.d)}</dd>` : ""}${sym ? `<dt>Inside</dt><dd class="mono small">${esc(sym.full)}()</dd>` : ""}</dl>
          ${note.x.w ? `<div class="warnbox small">⚠️ ${esc(note.x.w)}</div>` : ""}
          ${note.x.s ? `<div class="say small"><b>🎤 Say it:</b> ${esc(note.x.s)}</div>` : ""}` : `<div class="unvbox">No hand-written note covers this line. The automatic explanation above is based only on the line's shape.</div>`}
        ${fnd.map((f) => `<div class="warnbox small"><b>${esc(f.title)}</b><br>${esc(f.text)}</div>`).join("")}
      </div>
      <div class="card"><b>Explain it in your own words</b><p class="small muted">The instructor may point at this line. Type (or dictate with the 🎤 on your keyboard) what it does and why.</p>
        <textarea id="own" placeholder="This line…">${esc(A.S.explained[path + ":" + n] || "")}</textarea>
        <div class="btns"><button class="btn small" id="chk">Check my explanation</button></div><div id="fb"></div></div>
      <div class="btns" style="margin:0 16px"><button class="btn gray" id="bm">☆ Bookmark</button><button class="btn gray" id="ask">Ask tutor</button></div>`;
    A.sheet(`${path.split("/").pop()} · line ${n}`, html, (d) => {
      $("#bm", d).onclick = () => A.bookmark({ type: "line", file: path, line: n, title: `${path}:${n}`, text: text.trim() });
      $("#ask", d).onclick = () => { A.closeSheet(); A.go(`/tutor?ask=${encodeURIComponent(`In ${path} line ${n}: "${text.trim()}" — what does it do, why is it there, and what would happen without it?`)}&file=${encodeURIComponent(path)}&line=${n}`); };
      $("#chk", d).onclick = () => {
        const v = $("#own", d).value.trim(); A.S.explained[path + ":" + n] = v; A.save();
        const ref = note ? note.t + " " + (note.y || "") : A.explainLine(text, path);
        const r = A.scoreFree(v, A.keywordsFrom(ref));
        $("#fb", d).innerHTML = A.feedbackHTML(r, ref, note && note.x.s);
      };
    });
  };

  A.symbolSheet = (path, line, full) => {
    const c = A.callsOf(full, path); const ns = A.notesAt(path, line);
    const link = (s) => { const f = A.findSymbol(s); return f && f.line ? `<a href="#/file/${encodeURIComponent(f.path)}?l=${f.line}">${esc(s)}</a>` : `<span>${esc(s)}</span>`; };
    A.sheet(full, `<div class="card">${ns[0] ? `<p>${esc(ns[0].t)}</p>${ns[0].y ? `<p class="small"><b>Why:</b> ${esc(ns[0].y)}</p>` : ""}` : `<p>${esc(A.explainLine((A.lines(path) || [])[line - 1] || "", path))}</p>`}
      <dl class="kv"><dt>Calls</dt><dd>${c.out.length ? c.out.map(link).join("<br>") : '<span class="muted">nothing tracked</span>'}</dd><dt>Called by</dt><dd>${c.in.length ? c.in.map(link).join("<br>") : '<span class="muted">nothing tracked</span>'}</dd></dl>
      <p class="small muted">Call links were traced by hand from the snapshot.</p></div>
      <div class="btns" style="margin:0 16px"><button class="btn" id="goL">Go to line ${line}</button></div>`, (d) => {
      $("#goL", d).onclick = () => { A.closeSheet(); const el = $("#L" + line); if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("sel"); } };
      A.$$("a", d).forEach((a) => a.addEventListener("click", A.closeSheet));
    });
  };

  /* ===================================================== free-text scoring */
  const STOP = new Set("the a an and or of to in on is it its this that for with as be by are was from at so if not then than into when which who what why how does do can will just only also there their they them you your we our more most one each any all has have had but use used uses using line lines code python file value".split(" "));
  A.keywordsFrom = (text) => {
    const words = (text.toLowerCase().match(/[a-z_][a-z0-9_.]{2,}/g) || []).filter((w) => !STOP.has(w));
    const freq = {}; words.forEach((w) => (freq[w] = (freq[w] || 0) + (w.includes("_") || w.includes(".") ? 3 : 1)));
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => [w.replace(/\.$/, "")]);
  };
  A.scoreFree = (ans, groups) => {
    const a = " " + ans.toLowerCase().replace(/[^a-z0-9_.\s"'<>=-]/g, " ") + " ";
    const hit = [], miss = [];
    groups.forEach((g) => (g.some((w) => a.includes(w.toLowerCase().replace(/^(.)/, "$1"))) ? hit : miss).push(g[0]));
    const why = /\bbecause\b|\bso that\b|\bso\b|\bto (make|stop|avoid|keep|let)\b|\bin order\b/.test(a);
    const example = /\be\.?g\.?\b|\bfor example\b|\blike\b|\bif i type\b|"|\d/.test(a);
    const words = ans.trim().split(/\s+/).filter(Boolean).length;
    let pct = groups.length ? hit.length / groups.length : 0;
    if (why) pct += 0.1; if (example) pct += 0.05; if (words < 6) pct -= 0.2;
    pct = Math.max(0, Math.min(1, pct));
    return { pct: Math.round(pct * 100), hit, miss, why, example, words };
  };
  A.feedbackHTML = (r, model, say) => {
    const lvl = r.pct >= 75 ? ["Strong answer", "ok"] : r.pct >= 45 ? ["Good start", "warn"] : ["Needs work", "bad"];
    return `<div class="card" style="margin:12px 0 0;padding:12px;background:var(--card2)"><b>${lvl[0]}</b> <span class="tag ${lvl[1]}">${r.pct}%</span>
      ${r.hit.length ? `<p class="small">✅ You mentioned: ${r.hit.map((w) => `<code>${esc(w)}</code>`).join(" ")}</p>` : ""}
      ${r.miss.length ? `<p class="small">➕ Try to include: ${r.miss.map((w) => `<code>${esc(w)}</code>`).join(" ")}</p>` : ""}
      <p class="small">${r.why ? "✅ You explained WHY." : "➕ Add WHY (use “because…”)."} ${r.example ? "✅ You gave an example." : "➕ Add a small example (an input or a value)."}</p>
      <div class="say small"><b>Model answer:</b> ${esc(model)}</div>${say ? `<div class="say small"><b>🎤 Say it like this:</b> ${esc(say)}</div>` : ""}
      <p class="small muted">Scoring is a keyword guide, not a mark. ${A.getKey() ? "" : "Add your own API key in Settings for AI feedback."}</p></div>`;
  };

  /* ========================================================== SEARCH */
  A.route("search", (_, q) => ({ title: "Search", tab: "learn", html: `<div style="margin:12px 16px"><input type="search" id="sq" placeholder="e.g. pad_id, EnrolmentLimitError, regex, grid" value="${esc(q.q || "")}" autocomplete="off" autocapitalize="off"></div><div id="sr"></div>`,
    mount() {
      const run = () => {
        const t = $("#sq").value.trim().toLowerCase(); if (t.length < 2) { $("#sr").innerHTML = `<div class="empty">Search code lines, explanations, lessons, questions, flashcards and the glossary.</div>`; return; }
        const hl = (s) => esc(s).replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), (m) => `<span class="hl-text">${m}</span>`);
        const code = []; Object.entries(A.files()).forEach(([p, txt]) => txt.split("\n").forEach((l, i) => { if (l.toLowerCase().includes(t)) code.push({ p, i: i + 1, l }); }));
        const notes = []; Object.keys(KB.files).forEach((p) => A.notes(p).forEach((n) => { if ((n.t + " " + n.y).toLowerCase().includes(t)) notes.push({ p, n }); }));
        const ls = C.lessons.filter((l) => (l.title + l.cards.map((c) => c.h + c.b).join(" ")).toLowerCase().includes(t));
        const qs = C.questions.filter((x) => (x.q + x.a).toLowerCase().includes(t));
        const fc = C.flashcards.filter((f) => (f[0] + f[1]).toLowerCase().includes(t)).concat(C.glossary.filter((g) => (g[0] + g[1]).toLowerCase().includes(t)));
        $("#sr").innerHTML =
          (code.length ? `<div class="sec-h">Code (${code.length})</div><div class="group flat">${code.slice(0, 40).map((c) => A.row({ t: `<span class="mono" style="font-size:13px">${hl(c.l.trim())}</span>`, d: `${esc(c.p)}:${c.i}`, go: `/file/${encodeURIComponent(c.p)}?l=${c.i}&open=1` })).join("")}</div>` : "") +
          (notes.length ? `<div class="sec-h">Explanations (${notes.length})</div><div class="group flat">${notes.slice(0, 25).map((x) => A.row({ t: hl(x.n.t.slice(0, 140)), d: `${esc(x.p)}:${x.n.from}`, go: `/file/${encodeURIComponent(x.p)}?l=${x.n.from}&open=1` })).join("")}</div>` : "") +
          (ls.length ? `<div class="sec-h">Lessons</div><div class="group flat">${ls.map((l) => A.row({ t: esc(l.title), go: "/lesson/" + l.id })).join("")}</div>` : "") +
          (qs.length ? `<div class="sec-h">Questions</div><div class="group flat">${qs.map((x) => A.row({ t: hl(x.q), d: hl(x.a.slice(0, 120)), go: "/tutor?id=" + x.id })).join("")}</div>` : "") +
          (fc.length ? `<div class="sec-h">Cards & glossary</div><div class="group flat">${fc.map((f) => A.row({ t: hl(f[0]), d: hl(f[1]) })).join("")}</div>` : "") ||
          `<div class="empty">Nothing found for “${esc(t)}”.</div>`;
        A.wire($("#sr"));
      };
      $("#sq").oninput = run; run(); if (!q.q) setTimeout(() => $("#sq").focus(), 100);
    } }));

  /* ======================================================== DIAGRAMS */
  A.route("diagrams", (_, q) => {
    const tab = q.d || "layers";
    const tabs = [["layers", "Layers"], ["cli", "CLI menus"], ["gui", "GUI"], ["enrol", "Enrol flow"], ["data", "Data model"]];
    const N = (t, k = "") => `<div class="node ${k}">${t}</div>`, AR = `<div class="arrow">↓</div>`;
    let body = "";
    if (tab === "layers") body = `<div class="dia">${KB.layers.map((ly, i) => `<div class="layer" style="background:${ly.color}"><b>${esc(ly.name)}</b><small>${esc(ly.plain)}</small><div class="fs">${ly.files.map((f) => `<button data-go="/file/${encodeURIComponent(f)}">${esc(f.split("/").pop())}</button>`).join("")}</div></div>${i < 4 ? '<div class="arrow">↓ calls</div>' : ""}`).join("")}
      <p class="small muted">Menus/windows call controllers → controllers use models and the database → the database reads/writes students.data. Utilities are used by everyone. Tests check the entry points and database.</p></div>`;
    if (tab === "cli") body = `<div class="dia"><div class="flow">${N("<b>python3 main.py</b><br>Database(\"students.data\")", "k")}${AR}${N("University System: (A)dmin, (S)tudent, or X", "k")}${AR}
      <div class="branch">${N("<b>A</b> → Admin System<br><code>c g p r s x</code>", "")}${N("<b>S</b> → Student system<br><code>l r x</code>", "")}${N("<b>X</b> → Thank You", "e")}</div>${AR}
      <div class="branch">${N("c clear all<br>g group by grade<br>p pass/fail<br>r remove by ID<br>s show<br>x back", "d")}${N("r register<br>l login →", "d")}</div>${AR}
      ${N("Student Course Menu <code>c e r s x</code><br>c change password · e enrol (max 4)<br>r remove subject · s show · x back", "g")}</div>
      <p class="small muted">Only the top menu and the course menu accept uppercase/spaces.</p></div>`;
    if (tab === "gui") body = `<div class="dia"><div class="flow">${N("<b>python3 gui_main.py</b><br>Database + StudentController + EnrolmentController(None)", "k")}${AR}${N("LoginWindow (tk.Tk)<br>Email · Password · Login", "k")}${AR}
      <div class="branch">${N("Correct login<br>→ withdraw() login<br>→ EnrolmentWindow", "g")}${N("Empty / bad email / wrong<br>→ ExceptionWindow<br><small>(intended)</small>", "e")}</div>${AR}
      ${N("EnrolmentWindow (Toplevel)<br>Enrol · Show My Subjects · Logout", "g")}${AR}
      <div class="branch">${N("5th subject → ExceptionWindow \"Enrolment Limit\"", "e")}${N("Show → SubjectWindow (or \"No Subjects\" pop-up)", "d")}${N("Logout → deiconify() login", "")}</div></div>
      <div class="warnbox small">As written today, every login fails because login_gui returns a tuple. The diagram shows the intended flow. <a href="#/lesson/L11">Learn more</a></div></div>`;
    if (tab === "enrol") body = `<div class="dia"><div class="flow">${N("User types <b>e</b>", "")}${AR}${N("<code>EnrolmentMenu.enrol()</code><br>student_system/enrolment_menu.py:49", "k")}${AR}${N("<code>EnrolmentController.enrol()</code><br>count ≥ 4? → raise EnrolmentLimitError", "k")}${AR}
      ${N("<code>create_new_subject(existing_ids)</code><br>generate_subject_id → random free ID<br>generate_mark → 25-100 · calculate_grade", "g")}${AR}${N("<code>save_student()</code> → <code>convert_to_file_data()</code>", "k")}${AR}${N("<code>Database.update_student()</code> → <code>save_students()</code>", "d")}${AR}${N("students.data rewritten (JSON, indent=2)", "d")}${AR}${N("Menu prints \"Enrolling in Subject-XXX\" + count", "")}</div></div>`;
    if (tab === "data") body = `<div class="dia"><div class="uml"><div class="h">Student</div><div>student_id: str (6 digits)<br>name: str<br>email: str<br>password: str<br>subjects: list[Subject]</div><div>__init__(...)<br>convert_to_file_data() → dict<br>@classmethod create_from_file_data(dict) → Student</div></div>
      <div class="arrow">1 student has 0..4 subjects ↓</div>
      <div class="uml"><div class="h">Subject</div><div>id: str (3 digits)<br>mark: int (25-100)<br>grade: str (Z/P/C/D/HD)</div><div>__init__(subject_id, mark, grade=None)<br>to_dict() → dict<br>__str__() → str</div></div>
      <div class="uml"><div class="h">Database</div><div>students: list[dict]<br>file: Path</div><div>save_students · create_student · get_all_students<br>get_student_by_id · get_student_by_email<br>update_student · delete_student · delete_all_students</div></div>
      <p class="small muted">In memory, controllers use Student/Subject objects; in the file (and in the Database list) they are dictionaries.</p></div>`;
    return { title: "Diagrams", tab: "learn", html: `<div class="seg">${tabs.map(([k, l]) => `<button class="${k === tab ? "on" : ""}" data-go="/diagrams?d=${k}">${l}</button>`).join("")}</div>${body}` };
  });

  /* ==================================================== REQUIREMENTS */
  A.route("req", () => {
    const st = { done: ["Done", "ok"], partial: ["Partial", "warn"], issue: ["Issue", "bad"], unverified: ["Check brief", "unv"] };
    const areas = [...new Set(C.requirements.map((r) => r.area))];
    const cnt = (s) => C.requirements.filter((r) => r.status === s).length;
    return { title: "Requirements", tab: "learn", html: `
      <div class="unvbox" style="margin:12px 16px">The assignment brief and marking rubric are <b>not in your repository</b>, so this list is built from the code, its comments and the usual 32555 brief. Items tagged <span class="tag unv">Check brief</span> cannot be verified. ${A.S.settings.brief ? "Your pasted brief is shown at the bottom." : `<a href="#/settings">Paste your brief/rubric in Settings</a> to keep it with you.`}</div>
      <div class="chips"><span class="tag ok">${cnt("done")} done</span><span class="tag warn">${cnt("partial")} partial</span><span class="tag bad">${cnt("issue")} issue</span><span class="tag unv">${cnt("unverified")} check brief</span></div>
      ${areas.map((a) => `<div class="sec-h">${a}</div><div class="group flat">${C.requirements.filter((r) => r.area === a).map((r) => { const [p, l] = r.ev.split(":"); return A.row({ t: esc(r.req), d: `<span class="tag ${st[r.status][1]}">${st[r.status][0]}</span> <span class="mono">${esc(r.ev)}</span>${r.note ? "<br>" + esc(r.note) : ""}`, go: REPO.files[p] ? `/file/${encodeURIComponent(p)}${l ? "?l=" + l + "&open=1" : ""}` : undefined }); }).join("")}</div>`).join("")}
      <div class="sec-h">System features to explain</div>
      <div class="card small"><b>Validation:</b> email/password regex, non-empty name, menu letters, password confirm.<br><b>File handling:</b> create if missing, json.load at start, json.dumps(indent=2) after every change.<br><b>Exceptions:</b> custom classes in utils/exception; raise in controllers, catch in menus/windows.<br><b>CRUD:</b> create_student · get_* · update_student · delete_student / delete_all_students.<br><b>CLI vs GUI:</b> CLI has admin + register; GUI is login + enrolment only, same data and controllers.</div>
      ${A.S.settings.brief ? `<div class="sec-h">Your pasted brief / rubric</div><div class="card small" style="white-space:pre-wrap">${esc(A.S.settings.brief)}</div>` : ""}
      <div class="btns" style="margin:12px 16px"><button class="btn" data-go="/tests">Test cases</button></div>` };
  });

  A.route("tests", () => ({ title: "Test cases", tab: "learn", html: `<p class="sub" style="margin-top:12px">Each case lists the exact inputs. Tap one to run it in the simulator (a copy of the data; your file is safe). Expected results were checked against the real program.</p>
    ${[...new Set(C.tests.map((t) => t.area))].map((a) => `<div class="sec-h">${a}</div><div class="group flat">${C.tests.filter((t) => t.area === a).map((t) => A.row({ t: `<b>${t.id}</b> ${esc(t.title)} <span class="tag">${t.type}</span>`, d: `Inputs: <span class="mono">${t.inputs.map((x) => esc(JSON.stringify(x))).join(" ↵ ")}</span><br>Expected: ${esc(t.expect)}<br>Why: ${esc(t.why)}`, go: "/sim?test=" + t.id })).join("")}</div>`).join("")}
    <div class="sec-h">Automated tests in the repo</div>
    <div class="group">${["tests/test_main.py", "tests/test_gui_main.py", "tests/test_database.py"].map((f) => A.row({ t: f, d: esc(KB.files[f].summary), go: "/file/" + encodeURIComponent(f) })).join("")}</div>
    <p class="sec-f">Run them: <code>python3 -m unittest discover -s tests</code></p>` }));

  A.route("findings", () => ({ title: "Findings", tab: "learn", html: `<p class="sub" style="margin-top:12px">Things an instructor could ask about. The coach does <b>not</b> change your repository — share these with your team if you want to fix them.</p>
    ${KB.findings.map((f) => `<div class="card"><span class="tag ${f.level === "high" ? "bad" : f.level === "medium" ? "warn" : f.level === "info" ? "info" : ""}">${f.level}</span> <b>${esc(f.title)}</b>
      <p class="small mono"><a href="#/file/${encodeURIComponent(f.file)}?l=${f.line}&open=1">${esc(f.file)}:${f.line}</a></p><p>${esc(f.text)}</p>
      <p class="small"><b>How we know:</b> ${esc(f.verified)}</p><p class="small"><b>Possible fix:</b> ${esc(f.fix)}</p><div class="say small"><b>🎤 If asked:</b> ${esc(f.say)}</div></div>`).join("")}` }));

  A.route("glossary", () => ({ title: "Glossary", tab: "learn", html: `<div class="group flat" style="margin-top:12px">${C.glossary.map((g) => A.row({ t: esc(g[0]), d: esc(g[1]) })).join("")}</div>` }));

  /* boot */
  A.applyTheme = () => { const t = A.S.settings.theme; if (t === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t); };
  A.start = () => { A.applyTheme(); render(); if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {}); };
})();
