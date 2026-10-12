/* UniEnroll Learning Coach — practice, tutor, showcase, simulators, progress, settings. */
(function () {
  const A = window.App, $ = A.$, $$ = A.$$, esc = A.esc;
  const LEVEL = ["", "Basic", "Intermediate", "Advanced", "Unexpected"];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ========================================================= PRACTICE */
  A.route("practice", () => ({ large: true, title: "Practice", sub: "Short, active practice. Mistakes come back until you know them.", html: `
    <div class="group">
      ${A.row({ icon: "chat", color: "#5856d6", t: "Interactive Tutor", d: "Instructor-style questions, hints first", go: "/tutor" })}
      ${A.row({ icon: "repeat", color: "#ff9500", t: "Revision session", d: `${A.struggling().length} questions you struggled with`, go: "/revision" })}
      ${A.row({ icon: "check", color: "#34c759", t: "Quiz", d: `${C.mcq.length} multiple-choice questions`, go: "/quiz" })}
      ${A.row({ icon: "cards", color: "#ff9500", t: "Flashcards", d: `${C.flashcards.length} cards`, go: "/flash" })}
    </div>
    <div class="sec-h">Run and predict</div>
    <div class="group">
      ${A.row({ icon: "term", color: "#1c1c1e", t: "CLI simulator", d: "Type like in the terminal · see which code ran", go: "/sim" })}
      ${A.row({ icon: "bolt", color: "#ff2d55", t: "Predict the output", d: "Guess, then run", go: "/predict" })}
      ${A.row({ icon: "window", color: "#007aff", t: "GUI simulator", d: "Login, enrol, subjects, errors", go: "/gui" })}
    </div>
    <div class="sec-h">Read code like an expert</div>
    <div class="group">
      ${A.row({ icon: "trace", color: "#30b0c7", t: "Code tracing", d: `${C.traces.length} step-by-step exercises`, go: "/trace" })}
      ${A.row({ icon: "bug", color: "#ff3b30", t: "Debugging", d: `${C.debug.length} exercises (some are real issues)`, go: "/debug" })}
      ${A.row({ icon: "file", color: "#007aff", t: "Explain a line", d: "Pick a random line and explain it", go: "/randomline" })}
    </div>` }));

  /* ============================================================ TUTOR */
  function pickQuestion(filter) {
    let pool = C.questions.filter(filter || (() => true));
    if (!pool.length) pool = C.questions;
    const due = pool.filter((q) => A.isDue("q", q.id));
    const weak = due.filter((q) => A.S.q[q.id] && A.S.q[q.id].box <= 1);
    const fresh = due.filter((q) => !A.S.q[q.id]).sort((a, b) => a.level - b.level);
    const src = weak.length && Math.random() < 0.6 ? weak : fresh.length ? fresh.slice(0, 6) : due.length ? due : pool;
    return src[Math.floor(Math.random() * src.length)];
  }
  function lineQuestion(path) {
    const ns = (path ? [path] : Object.keys(KB.files).filter((f) => f.endsWith(".py"))).flatMap((p) => A.notes(p).filter((n) => n.status !== "unverified").map((n) => ({ p, n })));
    const { p, n } = ns[Math.floor(Math.random() * ns.length)];
    const L = A.lines(p); const code = L.slice(n.from - 1, Math.min(n.to, n.from + 5)).join("\n");
    return { id: `line:${p}:${n.from}`, topic: "line", level: 2, file: p, line: n.from, code,
      q: `Look at ${p}, line${n.to > n.from ? "s " + n.from + "-" + n.to : " " + n.from}. What does this code do, and why is it there?`,
      hints: [`Read it word by word. ${A.explainLine(L[n.from - 1], p)}`, n.y ? `Think about the reason: ${n.y.split(".")[0]}.` : "What would break without it?"],
      a: n.t + (n.y ? " Why: " + n.y : ""), k: A.keywordsFrom(n.t + " " + (n.y || "")), say: n.x.s };
  }

  A.route("tutor", (_, q) => {
    if ("ask" in q) return chatView(q.ask, q);
    const topic = q.topic || "", lineMode = "file" in q, file = q.file || undefined;
    let cur = q.id ? C.questions.find((x) => x.id === q.id) : lineMode ? lineQuestion(file) : pickQuestion(topic ? (x) => x.topic === topic : null);
    let hints = 0, answered = false;
    return { title: "Tutor", tab: "practice", action: "Ask", onAction: () => A.go("/tutor?ask="), html: `
      <div class="chips">${[["", "Mixed"], ...Object.entries(C.topics)].map(([k, v]) => `<button class="chip ${k === topic && !lineMode ? "on" : ""}" data-go="/tutor${k ? "?topic=" + k : ""}">${v}</button>`).join("")}<button class="chip ${lineMode ? "on" : ""}" data-go="/tutor?file=">Code lines</button></div>
      <div id="tq"></div>`,
      mount() {
        const show = () => {
          hints = 0; answered = false; const rec = A.S.q[cur.id];
          $("#tq").innerHTML = `<div class="card">
            <div class="small muted">👩‍🏫 Instructor · ${cur.topic === "line" ? "Code line" : esc(C.topics[cur.topic])} · ${LEVEL[cur.level]}${rec ? ` · seen ${rec.seen}×` : ""}</div>
            <h3 style="margin:8px 0">${esc(personal(cur.q))}</h3>
            ${cur.code ? `<pre>${cur.code.split("\n").map((l) => A.hl(l, cur.file)).join("\n")}</pre><a class="small" href="#/file/${encodeURIComponent(cur.file)}?l=${cur.line}">Open in Explorer ›</a>` : ""}
            ${cur.ref ? `<a class="small" href="#/file/${encodeURIComponent(cur.ref.split(":")[0])}?l=${cur.ref.split(":")[1]}">Related code: ${esc(cur.ref)} ›</a>` : ""}
            <textarea id="ans" placeholder="Answer in your own words. Use the 🎤 on your keyboard to speak." style="margin-top:10px"></textarea>
            <div id="hintbox"></div>
            <div class="btns"><button class="btn gray" id="hint">💡 Hint</button><button class="btn" id="check">Check answer</button></div>
            <div class="btns" style="margin-top:6px"><button class="btn gray small" id="idk">I don't know — teach me</button>${A.getKey() ? '<button class="btn gray small" id="ai">✨ AI feedback</button>' : ""}</div>
            <div id="res"></div></div>`;
          $("#hint").onclick = () => {
            if (hints >= cur.hints.length) { A.toast("No more hints — try an answer, or tap “teach me”"); return; }
            $("#hintbox").insertAdjacentHTML("beforeend", `<div class="say small" style="border-color:var(--orange);background:rgba(255,149,0,.1)">💡 Hint ${hints + 1}: ${esc(cur.hints[hints])}</div>`); hints++;
          };
          $("#check").onclick = () => {
            const v = $("#ans").value.trim(); if (!v) { A.toast("Type an answer first (or ask for a hint)"); return; }
            const r = A.scoreFree(v, cur.k); finish(r.pct >= 70 && hints === 0 ? true : r.pct >= 45 ? "half" : false, A.feedbackHTML(r, cur.a, cur.say));
          };
          $("#idk").onclick = () => finish(false, `<div class="say small"><b>Answer:</b> ${esc(cur.a)}</div>${cur.say ? `<div class="say small"><b>🎤 Say it like this:</b> ${esc(cur.say)}</div>` : ""}<p class="small muted">This question will come back soon so you can try again.</p>`);
          const ai = $("#ai"); if (ai) ai.onclick = async () => {
            const v = $("#ans").value.trim(); if (!v) { A.toast("Type an answer first"); return; }
            $("#res").innerHTML = `<div class="card" style="margin:12px 0 0;background:var(--card2)"><div id="aiout" style="white-space:pre-wrap">Thinking…</div></div>`;
            try { await A.ai([{ role: "user", content: `The instructor asked: "${cur.q}"\nModel answer (from the repository notes): "${cur.a}"\nMy answer: "${v}"\n\nEvaluate my answer like a UTS tutor at a project showcase. Give: 1) a mark out of 4, 2) what I got right, 3) what is missing or wrong, 4) a better answer in simple first-person English I can say out loud (max 4 sentences).` }], (t) => ($("#aiout").textContent = t)); }
            catch (e) { $("#aiout").textContent = "AI error: " + e.message; }
          };
        };
        const finish = (ok, html) => {
          if (answered) return; answered = true;
          if (cur.topic !== "line") A.grade("q", cur.id, ok);
          $("#res").innerHTML = html + `<div class="btns"><button class="btn gray" id="rate-miss">I missed it</button><button class="btn green" id="next">Next question</button></div>`;
          $("#rate-miss").onclick = () => { if (cur.topic !== "line") A.grade("q", cur.id, false); A.toast("Marked to repeat"); };
          $("#next").onclick = () => { cur = lineMode ? lineQuestion(file) : pickQuestion(topic ? (x) => x.topic === topic : null); show(); window.scrollTo(0, 0); };
        };
        show();
      } };
  });
  function personal(q) {
    const n = A.S.settings.name; return n && /your individual contribution|you wrote|your team/i.test(q) ? q + ` (${n.split(" ")[0]})` : q;
  }

  /* ---------------------------------------------------- AI (optional) */
  let sdk = null;
  A.ai = async (messages, onText) => {
    const key = A.getKey(); if (!key) throw new Error("No API key. Add one in Settings.");
    if (!sdk) sdk = (await import("https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm")).default;
    const client = new sdk({ apiKey: key, dangerouslyAllowBrowser: true });
    const repo = Object.entries(A.files()).filter(([p]) => !p.endsWith("__init__.py")).map(([p, t]) => `=== FILE: ${p} ===\n${t.split("\n").map((l, i) => `${i + 1}: ${l}`).join("\n")}`).join("\n\n");
    const findings = KB.findings.map((f) => `- ${f.title} (${f.file}:${f.line}): ${f.text} Verification: ${f.verified}`).join("\n");
    const system = [
      { type: "text", text: `You are a patient UTS tutor helping a student in 32555 Fundamentals of Software Development (Assessment 1 Part 2 & 3, group Cmp1-07 Group 3) prepare for a project showcase about their University Enrolment System.
Rules:
- Use very simple English, short paragraphs, beginner-friendly. Never assume the student already understands a term; explain it.
- Base every statement on the repository files below. Quote file paths and line numbers (e.g. models/subject.py:72).
- If something cannot be verified from the repository (e.g. the assignment brief, marking rubric, sample output, or how the program behaves on the student's computer), say clearly: "I can't verify this from your repository."
- When the student asks you to quiz them, give a hint before revealing the answer.
- Help them explain the code in their own words; finish explanations with a short "Say it like this:" line in first person.
- You cannot and must not modify the repository; suggest changes only as advice for the team.
Known verified findings:\n${findings}` },
      { type: "text", text: `REPOSITORY (${A.sourceLabel()}):\n\n${repo}${A.S.settings.brief ? `\n\nASSIGNMENT BRIEF / RUBRIC PASTED BY THE STUDENT:\n${A.S.settings.brief}` : ""}`, cache_control: { type: "ephemeral" } },
    ];
    const stream = client.beta.messages.stream({
      model: A.S.settings.model || "claude-opus-5-5", max_tokens: 8000, system, messages,
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
    });
    let text = "";
    stream.on("text", (t) => { text += t; onText && onText(text); });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") { text += "\n\n(The model declined to answer this request.)"; onText && onText(text); }
    return text;
  };

  /* Ask anything (chat). Offline: searches the notes. Online: Claude with your key. */
  const chat = [];
  function chatView(initial, q) {
    return { title: "Ask the tutor", tab: "practice", html: `
      ${A.getKey() ? `<p class="sub" style="margin-top:10px">AI mode on (${esc(A.S.settings.model)}). Your key stays on this device.</p>` : `<div class="unvbox" style="margin:12px 16px">Offline mode: answers come from the hand-written notes, lessons and question bank. For free-form AI answers, add your own Anthropic API key in <a href="#/settings">Settings</a>.</div>`}
      <div class="chat" id="chat"></div>
      <div style="margin:12px 16px;display:flex;gap:8px"><textarea id="cq" style="min-height:52px" placeholder="Ask about any file, line, output or design choice…"></textarea><button class="btn" id="send">Send</button></div>
      <div class="chips">${["Explain the GUI login fix simply", "What happens when a student enrols?", "Quiz me on database.py with hints", "Why use custom exceptions?", "Explain the password regex"].map((s) => `<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div>`,
      mount() {
        const draw = () => { $("#chat").innerHTML = chat.map((m) => `<div class="msg ${m.role === "user" ? "me" : "ai"}">${m.role === "user" ? "" : '<div class="who">Tutor</div>'}${esc(m.content)}</div>`).join("") || `<div class="empty">Ask anything about your project.</div>`; };
        const send = async (text) => {
          text = text.trim(); if (!text) return; $("#cq").value = "";
          chat.push({ role: "user", content: text }); chat.push({ role: "assistant", content: "…" }); draw();
          const last = chat[chat.length - 1];
          if (A.getKey()) {
            try { await A.ai(chat.slice(0, -1).map((m) => ({ role: m.role, content: m.content })), (t) => { last.content = t; draw(); window.scrollTo(0, document.body.scrollHeight); }); }
            catch (e) { last.content = "AI error: " + e.message + "\n\n" + offline(text); }
          } else last.content = offline(text);
          draw(); window.scrollTo(0, document.body.scrollHeight);
        };
        $("#send").onclick = () => send($("#cq").value);
        $$("[data-s]").forEach((b) => (b.onclick = () => send(b.dataset.s)));
        draw(); if (initial) send(initial);
      } };
  }
  function offline(text) {
    const t = text.toLowerCase();
    const words = (t.match(/[a-z_][a-z0-9_.]{2,}/g) || []).filter((w) => !["what", "does", "the", "and", "why", "how", "this", "line", "explain", "about", "there", "would", "happen", "without"].includes(w));
    const m = text.match(/in ([\w/.]+\.\w+) line (\d+)/i);
    const out = [];
    if (m && A.lines(m[1])) {
      const p = m[1], n = +m[2], note = A.notesAt(p, n)[0];
      out.push(`📄 ${p}:${n}\n${(A.lines(p)[n - 1] || "").trim()}\n\nIn plain English: ${A.explainLine(A.lines(p)[n - 1] || "", p)}`);
      if (note) { out.push(`What (lines ${note.from}-${note.to}): ${note.t}`); if (note.y) out.push(`Why: ${note.y}`); if (note.x.w) out.push(`⚠️ ${note.x.w}`); if (note.x.s) out.push(`🎤 Say it like this: ${note.x.s}`); }
      else out.push("I can't verify more about this line: there is no hand-written note for it.");
      out.push("Without it: think about what the next lines need from this one — that is usually what would break.");
      return out.join("\n\n");
    }
    const score = (s) => words.reduce((a, w) => a + (s.toLowerCase().includes(w) ? (w.includes("_") ? 3 : 1) : 0), 0);
    const cands = [];
    C.questions.forEach((x) => cands.push({ s: score(x.q + " " + x.a) * 1.2, t: `Q: ${x.q}\nA: ${x.a}` }));
    Object.keys(KB.files).forEach((p) => { cands.push({ s: score(p + " " + KB.files[p].summary) * 1.1, t: `📄 ${p}: ${KB.files[p].summary}${KB.files[p].say ? "\n🎤 " + KB.files[p].say : ""}` }); A.notes(p).forEach((n) => cands.push({ s: score(n.t + " " + n.y), t: `📄 ${p}:${n.from} — ${n.t}${n.y ? " Why: " + n.y : ""}` })); });
    KB.findings.forEach((f) => cands.push({ s: score(f.title + " " + f.text) * 1.3, t: `⚠️ ${f.title}: ${f.text}\nFix idea: ${f.fix}` }));
    const best = cands.filter((c) => c.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
    if (!best.length) return "I couldn't find that in the notes. Try naming a file, class or function (e.g. “pad_id”, “EnrolmentController”, “students.data”). I can't verify anything that isn't in your repository.";
    return "Here is what your project notes say:\n\n" + best.map((b) => b.t).join("\n\n— — —\n\n") + "\n\n(Offline answer from hand-written notes.)";
  }

  A.route("randomline", () => { const q = lineQuestion(); A.go(`/file/${encodeURIComponent(q.file)}?l=${q.line}&open=1`); return { title: "…" }; });

  /* ============================================================= QUIZ */
  A.route("quiz", (_, q) => {
    const pool = shuffle(q.topic ? C.mcq.filter((m) => m.topic === q.topic) : C.mcq).slice(0, 10);
    let i = 0, score = 0;
    return { title: "Quiz", tab: "practice", html: `<div id="qz"></div>`, mount() {
      const show = () => {
        if (i >= pool.length) {
          A.S.quiz.push({ at: Date.now(), kind: "mcq", score, total: pool.length }); A.save();
          $("#qz").innerHTML = `<div class="card center"><div class="score">${score}/${pool.length}</div><p>${score === pool.length ? "Perfect! 🎉" : score >= pool.length * 0.7 ? "Great work." : "Keep going — review the explanations."}</p><div class="btns"><button class="btn" data-go="/quiz?r=${Date.now()}">New quiz</button><button class="btn gray" data-go="/practice">Done</button></div></div>`; A.wire($("#qz")); return;
        }
        const m = pool[i], ord = shuffle(m.o.map((o, k) => [o, k]));
        $("#qz").innerHTML = `<p class="sub" style="margin-top:12px">Question ${i + 1} of ${pool.length} · ${esc(C.topics[m.topic])}</p><div style="margin:0 16px"><h3>${esc(m.q)}</h3>${ord.map(([o, k]) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join("")}<div id="ex"></div></div>`;
        $$(".opt").forEach((b) => (b.onclick = () => {
          if ($(".opt.right")) return;
          const ok = +b.dataset.k === m.c; if (ok) score++;
          $$(".opt").forEach((x) => { if (+x.dataset.k === m.c) x.classList.add("right"); }); if (!ok) b.classList.add("wrong");
          A.grade("q", "mcq:" + C.mcq.indexOf(m), ok);
          $("#ex").innerHTML = `<div class="card" style="margin:8px 0"><b>${ok ? "✅ Correct" : "❌ Not quite"}</b><p>${esc(m.e)}</p></div><button class="btn block" id="nx">${i === pool.length - 1 ? "See score" : "Next"}</button>`;
          $("#nx").onclick = () => { i++; show(); };
        }));
      };
      show();
    } };
  });

  /* ======================================================= FLASHCARDS */
  A.route("flash", () => {
    const due = C.flashcards.map((f, i) => i).filter((i) => A.isDue("fc", i));
    const deck = shuffle(due.length ? due : C.flashcards.map((_, i) => i)).slice(0, 15);
    let i = 0;
    return { title: "Flashcards", tab: "practice", html: `<p class="sub" style="margin-top:12px">${due.length} cards due. Tap the card to flip. Cards you miss come back sooner.</p><div id="fcw"></div>`, mount() {
      const show = () => {
        if (i >= deck.length) { $("#fcw").innerHTML = `<div class="card center"><h3>Deck done 🎉</h3><button class="btn" data-go="/practice">Back to practice</button></div>`; A.wire($("#fcw")); return; }
        const [f, b] = C.flashcards[deck[i]]; const r = A.S.fc[deck[i]];
        $("#fcw").innerHTML = `<div class="flash" id="card"><div class="in"><div class="f"><small>${i + 1}/${deck.length} · box ${r ? r.box : 0}</small>${esc(f)}</div><div class="b"><small>answer</small><div class="mono" style="font-size:16px">${esc(b)}</div></div></div></div>
          <div class="btns" style="margin:14px 16px"><button class="btn red" id="no">Didn't know</button><button class="btn orange" id="half">Almost</button><button class="btn green" id="yes">Knew it</button></div>`;
        $("#card").onclick = () => $("#card").classList.toggle("flip");
        const rate = (v) => { A.grade("fc", deck[i], v); i++; show(); };
        $("#no").onclick = () => rate(false); $("#half").onclick = () => rate("half"); $("#yes").onclick = () => rate(true);
      };
      show();
    } };
  });

  /* ======================================================== TRACING */
  A.route("trace", (id) => {
    if (!id) return { title: "Code tracing", tab: "practice", html: `<p class="sub" style="margin-top:12px">Follow the code one step at a time, like the computer does. All code is from your repository.</p><div class="group">${C.traces.map((t) => A.row({ t: esc(t.title), d: `${t.file}:${t.from}-${t.to}${A.S.q["trace:" + t.id] ? " · ✓ done" : ""}`, go: "/trace/" + t.id })).join("")}</div>` };
    const t = C.traces.find((x) => x.id === id); let step = 0;
    const L = A.lines(t.file) || [];
    return { title: t.title, tab: "practice", html: `<div class="card"><div class="small muted">${esc(t.file)} lines ${t.from}-${t.to}</div><pre>${L.slice(t.from - 1, t.to).map((l, k) => `<span style="color:var(--muted)">${String(t.from + k).padStart(3)} </span>${A.hl(l, t.file)}`).join("\n")}</pre><p><b>Start:</b> <span class="mono small">${esc(t.setup)}</span></p></div>
      <div class="card"><b>${esc(t.q)}</b><div id="opts" style="margin-top:8px">${t.o.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join("")}</div></div>
      <div class="sec-h">Step by step</div><div class="group flat" id="steps"></div>
      <div class="btns" style="margin:12px 16px"><button class="btn gray" id="stp">Show next step</button></div>`,
      mount() {
        const drawSteps = () => { $("#steps").innerHTML = t.steps.slice(0, step).map((s, k) => A.row({ t: `<span class="mono" style="font-size:14px">${k + 1}. ${esc(s[0])}</span>`, d: `<span class="mono">${esc(s[1])}</span>` })).join("") || `<div class="row noicon"><span class="muted small">Try to answer first, or reveal the steps one by one.</span></div>`; };
        $("#stp").onclick = () => { if (step < t.steps.length) step++; drawSteps(); };
        $$("#opts .opt").forEach((b) => (b.onclick = () => {
          if ($("#opts .right")) return; const ok = +b.dataset.k === t.c;
          $$("#opts .opt").forEach((x) => +x.dataset.k === t.c && x.classList.add("right")); if (!ok) b.classList.add("wrong");
          A.grade("q", "trace:" + t.id, ok && step === 0 ? true : ok ? "half" : false); step = t.steps.length; drawSteps();
        }));
        drawSteps();
      } };
  });

  /* ======================================================== DEBUGGING */
  A.route("debug", (id) => {
    if (!id) return { title: "Debugging", tab: "practice", html: `<p class="sub" style="margin-top:12px"><span class="tag bad">real</span> = the problem exists in your repository. <span class="tag">practice</span> = a deliberately broken copy, NOT your code.</p><div class="group">${C.debug.map((d) => A.row({ t: esc(d.title), d: `${d.real ? '<span class="tag bad">real</span>' : '<span class="tag">practice</span>'} ${esc(d.file)}${A.S.q["debug:" + d.id] ? " · ✓" : ""}`, go: "/debug/" + d.id })).join("")}</div>` };
    const d = C.debug.find((x) => x.id === id);
    return { title: d.title, tab: "practice", html: `<div class="card">${d.real ? '<span class="tag bad">Real code from your repository</span>' : '<span class="tag">Practice snippet — changed on purpose, not your real code</span>'}<div class="small muted" style="margin-top:6px">${esc(d.file)}</div><pre>${d.code.split("\n").map((l) => A.hl(l, d.file)).join("\n")}</pre></div>
      <div style="margin:0 16px"><h3>What is the bug?</h3>${d.o.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join("")}<div id="ex"></div></div>`,
      mount() { $$(".opt").forEach((b) => (b.onclick = () => {
        if ($(".opt.right")) return; const ok = +b.dataset.k === d.c;
        $$(".opt").forEach((x) => +x.dataset.k === d.c && x.classList.add("right")); if (!ok) b.classList.add("wrong");
        A.grade("q", "debug:" + d.id, ok);
        const nxt = C.debug[C.debug.indexOf(d) + 1];
        $("#ex").innerHTML = `<div class="card" style="margin:8px 0"><b>${ok ? "✅ Correct" : "❌ Not quite"}</b><p>${esc(d.e)}</p><a href="#/file/${encodeURIComponent(d.file)}">Open the real file ›</a></div>${nxt ? `<button class="btn block" data-go="/debug/${nxt.id}">Next exercise</button>` : ""}`; A.wire($("#ex"));
      })); } };
  });

  /* ==================================================== CLI SIMULATOR */
  A.simDB = null;
  A.route("sim", (_, q) => {
    const tc = q.test ? C.tests.find((t) => t.id === q.test) : null;
    let aborted = false, pending = null, queue = tc ? tc.inputs.slice() : [];
    if (!A.simDB || q.reset || tc) A.simDB = new SIM.SimDB(A.files()["students.data"] || "[]");
    const db = A.simDB;
    return { title: tc ? tc.id + " · " + tc.title : "CLI simulator", tab: "practice", action: "Reset", onAction: () => A.go("/sim?reset=" + Date.now()), html: `
      ${tc ? `<div class="card small"><b>Expected:</b> ${esc(tc.expect)}<br><span class="muted">${esc(tc.why)}</span></div>` : `<p class="sub" style="margin-top:10px">Runs a JavaScript copy of your CLI on a <b>copy</b> of students.data. Outputs match the real program for every test case without random IDs or marks.</p>`}
      <div class="term" id="term"></div>
      <div class="termin"><input type="text" id="tin" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="type and press return"><button class="btn" id="tgo">↵</button></div>
      <div class="quick" id="quick"></div>
      <div class="seg" style="margin-top:8px"><button class="on" data-pane="trace">What ran</button><button data-pane="data">students.data</button><button data-pane="logins">Logins</button></div>
      <div id="pane"></div>`,
      mount() {
        const term = $("#term"), trace = [], changes = []; let pane = "trace";
        const add = (html) => { term.insertAdjacentHTML("beforeend", html); term.scrollTop = term.scrollHeight; };
        const io = {
          input: (p, c) => new Promise((res) => {
            if (aborted) return res(null);
            add(`<span class="${c || ""}">${esc(p)}</span>`);
            const give = (v) => { add(`<span class="inp">${esc(v)}</span>\n`); res(v); };
            if (queue.length) { const v = queue.shift(); setTimeout(() => give(v), 120); }
            else { pending = give; quick(p); $("#tin").focus({ preventScroll: true }); }
          }),
          print: (t, c) => add(`<span class="${c || ""}">${esc(t)}</span>\n`),
          trace: (f, l, n) => { trace.push({ f, l, n }); if (pane === "trace") drawPane(); },
          changed: (n) => { changes.push(n); if (pane === "data") drawPane(); },
          end: () => add(`<span class="sys">— program ended — tap Reset to start again —</span>\n`),
        };
        const quick = (p) => {
          const sets = [[/University System/, ["A", "S", "X", "s"]], [/Admin System/, ["s", "g", "p", "r", "c", "x"]], [/Student system/, ["l", "r", "x"]], [/Course Menu/, ["s", "e", "r", "c", "x"]], [/Email/, ["john.smith@university.com", "sarah.lee@university.com", "alen.jones@university.com"]], [/Password/, ["Password123", "Universe789", "Sunshine456", "wrong"]], [/REMOVE BY ID/, ["104582", "999"]], [/Remove Subject/, ["097", "97", "5"]]];
          const s = sets.find(([re]) => re.test(p)); $("#quick").innerHTML = (s ? s[1] : []).map((v) => `<button>${esc(v)}</button>`).join("");
          $$("#quick button").forEach((b) => (b.onclick = () => submit(b.textContent)));
        };
        const submit = (v) => { if (!pending) return; const f = pending; pending = null; $("#tin").value = ""; $("#quick").innerHTML = ""; f(v); };
        $("#tgo").onclick = () => submit($("#tin").value);
        $("#tin").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); submit($("#tin").value); } };
        const drawPane = () => {
          if (pane === "trace") $("#pane").innerHTML = `<div class="trace">${trace.slice(-12).reverse().map((t) => `<div data-f="${esc(t.f)}" data-l="${t.l}"><b>${esc(t.f)}:${t.l}</b><br>${esc(t.n)}</div>`).join("") || '<p class="muted small">Each step will appear here with the file and line that produced it. Tap one to open the code.</p>'}</div>`;
          if (pane === "data") $("#pane").innerHTML = `<div class="card small">${changes.length ? "<b>Changes this run:</b><br>" + changes.map(esc).join("<br>") : "No changes yet."}<p class="muted">Real program: these changes would be written to students.data immediately.</p></div><div class="code nowrap"><pre style="margin:0;background:none">${esc(db.toText())}</pre></div>`;
          if (pane === "logins") $("#pane").innerHTML = `<div class="group flat">${db.students.map((s) => A.row({ t: esc(s.name), d: `<span class="mono">${esc(s.email)} · ${esc(s.password)}</span><br>${SIM.EMAIL.test(s.email) && SIM.PASSWORD.test(s.password) ? '<span class="tag ok">can log in</span>' : '<span class="tag bad">fails regex – cannot log in</span>'} ${s.subjects.length} subjects` })).join("")}</div>`;
          $$("#pane .trace div").forEach((d) => (d.onclick = () => A.go(`/file/${encodeURIComponent(d.dataset.f)}?l=${d.dataset.l}&open=1`)));
        };
        $$("[data-pane]").forEach((b) => (b.onclick = () => { pane = b.dataset.pane; $$("[data-pane]").forEach((x) => x.classList.toggle("on", x === b)); drawPane(); }));
        drawPane();
        SIM.runCLI(db, io).then(() => { if (tc) add(`<span class="sys">— expected: ${esc(tc.expect)} —</span>\n`); });
        return () => { aborted = true; if (pending) pending(null); };
      } };
  });

  /* ==================================================== PREDICT MODE */
  A.route("predict", () => {
    const cases = shuffle(C.tests.filter((t) => !["T08", "T09", "T11", "T22"].includes(t.id)));
    let i = 0;
    return { title: "Predict the output", tab: "practice", html: `<p class="sub" style="margin-top:12px">Read the inputs. Say or type what the program will print. Then run the real logic.</p><div id="pr"></div>`, mount() {
      const show = () => {
        const t = cases[i % cases.length];
        $("#pr").innerHTML = `<div class="card"><div class="small muted">${t.id} · ${esc(t.area)} · ${t.type}</div><h3>${esc(t.title)}</h3><p class="small">Inputs typed, in order:</p><pre>${t.inputs.map((x) => esc(JSON.stringify(x))).join("\n")}</pre>
          <textarea id="pg" placeholder="What will it print? What changes in students.data?"></textarea><div class="btns"><button class="btn" id="run">Run it</button></div><div id="po"></div></div>`;
        $("#run").onclick = async () => {
          const r = await SIM.runScripted(A.files()["students.data"] || "[]", t.inputs);
          const cls = { red: "red", yellow: "yellow", cyan: "cyan" };
          const out = r.out.map((o) => `<span class="${o.input ? "" : cls[o.c] || ""}">${esc(o.t)}</span>`).join("\n");
          const g = $("#pg").value.trim(); const hit = g && r.out.some((o) => !o.input && g.toLowerCase().includes(o.t.trim().toLowerCase().slice(0, 18)) && o.t.trim().length > 3);
          $("#po").innerHTML = `<div class="term" style="margin:10px 0;min-height:0">${out}</div><p class="small"><b>Key result:</b> ${esc(t.expect)}<br><b>Why:</b> ${esc(t.why)}</p>${g ? `<p>${hit ? "✅ Your prediction matches part of the output." : "🤔 Compare your prediction with the output above."}</p>` : ""}
            <div class="trace">${r.trace.slice(0, 8).map((x) => `<div data-f="${esc(x.f)}" data-l="${x.l}"><b>${esc(x.f)}:${x.l}</b> ${esc(x.n)}</div>`).join("")}</div>
            <div class="btns"><button class="btn gray" id="bad">I got it wrong</button><button class="btn green" id="nx">Next</button></div>`;
          $$("#po .trace div").forEach((d) => (d.onclick = () => A.go(`/file/${encodeURIComponent(d.dataset.f)}?l=${d.dataset.l}&open=1`)));
          $("#bad").onclick = () => { A.grade("q", "predict:" + t.id, false); i++; show(); };
          $("#nx").onclick = () => { A.grade("q", "predict:" + t.id, true); i++; show(); };
        };
      };
      show();
    } };
  });

  /* ==================================================== GUI SIMULATOR */
  A.route("gui", (_, q) => {
    const mode = q.mode || "fixed";
    const db = new SIM.SimDB(A.files()["students.data"] || "[]");
    let student = null, popup = null, view = "login", status = ["", "green"], term = [];
    return { title: "GUI simulator", tab: "practice", html: `
      <div class="seg"><button class="${mode === "fixed" ? "on" : ""}" data-go="/gui?mode=fixed">Now (with your fix)</button><button class="${mode === "before" ? "on" : ""}" data-go="/gui?mode=before">Before the fix</button></div>
      ${mode === "before" ? `<div class="warnbox small" style="margin:0 16px 12px">This shows what the <b>old</b> code did before the login fix (verified with a stand-in Tkinter). Useful for explaining the bug.</div>` : `<div class="say small" style="margin:0 16px 12px">This follows your <b>fixed</b> code. Try a correct login, empty fields, a bad email and a wrong password. Check the real windows with <code>python3 gui_main.py</code> too.</div>`}
      <div id="gw"></div><div class="sec-h">Terminal output</div><div class="term" id="gt" style="min-height:60px"></div>`,
      mount() {
        const draw = () => {
          let h = "";
          if (view === "login") h += win("GUIUniApp - Login", `<div style="font-size:20px">GUIUniApp</div><fieldset><legend>Student Login</legend><div class="grid"><span>Email:</span><input id="ge" value="john.smith@university.com" autocapitalize="off"><span>Password:</span><input id="gp" type="password" value="Password123"></div><div style="text-align:right;margin-top:8px"><button id="gl" style="min-width:90px">Login</button></div></fieldset><div style="color:${status[1]}">${esc(status[0])}</div>`);
          if (view === "broken") h += win("GUIUniApp - Enrolment", `<div style="height:150px;display:grid;place-items:center;color:#888;font-size:13px;text-align:center">(empty window — build_widgets() crashed on<br>get_student_name(); the login window is hidden)</div>`, true);
          if (view === "enrol") h += win("GUIUniApp - Enrolment", `<div style="font-size:18px">Welcome ${esc(student.name)}</div><div>Student ID: ${esc(student.id)}</div><div style="font-size:15px;margin:8px 0">Enrolled in ${student.subjects.length} out of 4 subjects</div><button id="ben">Enrol in a Subject</button><button id="bsh">Show My Subjects</button><button id="blo">Logout</button><div style="color:green;max-width:340px;text-align:center">${esc(status[0])}</div>`, true);
          if (view === "subjects") h += win("GUIUniApp - My Subjects", `<div style="font-size:18px">Enrolled Subjects</div><div class="courier" style="font-weight:bold">   ID        Mark      Grade</div>${student.subjects.map((s) => `<div class="courier"> ${esc(s.id)}        ${String(s.mark).padStart(3)}         ${esc(s.grade)}</div>`).join("")}<div style="margin-top:10px">Total: ${student.subjects.length} out of 4 subjects</div><button id="bcl" style="min-width:90px">Close</button>`);
          if (popup) h += win(popup[0], `<div style="white-space:pre-wrap;max-width:260px;padding:8px">${esc(popup[1])}</div><button id="bok" style="min-width:90px">OK</button>`);
          $("#gw").innerHTML = h; $("#gt").textContent = term.join("\n") || "(nothing printed)";
          const on = (id, f) => { const e = $("#" + id); if (e) e.onclick = f; };
          on("gl", login); on("bok", () => { popup = null; draw(); });
          on("ben", () => {
            if (student.subjects.length >= 4) { popup = ["Enrolment Limit", "Students are allowed to enrol in 4 subjects only."]; return draw(); }
            const used = student.subjects.map((s) => s.id); let id; do { id = SIM.pad_id(1 + Math.floor(Math.random() * 999)); } while (used.includes(id));
            const mark = 25 + Math.floor(Math.random() * 76), s = { id, mark, grade: SIM.calculate_grade(mark) }; student.subjects.push(s);
            status = [`Enrolled in Subject-${id}  (mark ${mark}, grade ${s.grade})`, "green"]; draw();
          });
          on("bsh", () => { if (!student.subjects.length) { popup = ["No Subjects", "You are not enrolled in any subjects yet."]; return draw(); } view = "subjects"; status = ["Showing your enrolled subjects", "green"]; draw(); });
          on("bcl", () => { view = "enrol"; draw(); });
          on("blo", () => { view = "login"; status = ["You have logged out", "green"]; draw(); });
          $$(".win .bar2 i:first-child").forEach((x) => (x.onclick = () => { if (x.dataset.close) { term.push("(handle_close → whole app destroyed)"); view = "gone"; draw(); $("#gw").innerHTML = '<div class="empty">The application has closed. <a href="#/gui?mode=' + mode + '&r=' + Date.now() + '">Start again</a></div>'; } }));
        };
        const win = (t, body, closesApp) => `<div class="win"><div class="bar2"><i ${closesApp ? 'data-close="1"' : ""}></i><i></i><i></i><span>${esc(t)}</span></div><div class="body">${body}</div></div>`;
        function login() {
          const e = $("#ge").value.trim(), p = $("#gp").value;
          let err = null, rec = null;
          if (e === "" || p === "") err = ["Missing Details", "Please enter both your email and your password.", "LoginEmailOrPasswordEmptyError"];
          else if (!SIM.EMAIL.test(e)) err = ["Invalid Email", "Incorrect email format.\n\nEmails must look like:\nfirstname.lastname@university.com", "LoginEmailFormatInvalidError"];
          else { rec = db.byEmail(e); if (!rec || rec.password !== p) err = ["Login Failed", "Incorrect email or password.\n\nOnly registered students can use GUIUniApp.", "LoginStudentNotFoundError"]; }
          if (mode === "before") {
            if (err) term.push("error loging in using GUI: ");
            term.push("error logging in in login window: 'tuple' object has no attribute 'name'");
            view = "broken"; draw(); A.toast(err ? `${err[2]} was caught inside login_gui, so no pop-up` : "Correct login — but the window still breaks"); return;
          }
          if (err) { status = ["Login failed", "red"]; popup = err; draw(); return; }
          student = JSON.parse(JSON.stringify(rec)); status = ["", "green"]; view = "enrol"; draw();
        }
        draw();
      } };
  });

  /* ======================================================= REVISION */
  A.route("revision", () => {
    const weak = A.struggling(); const dueQ = C.questions.filter((q) => A.S.q[q.id] && A.isDue("q", q.id) && !weak.includes(q));
    const items = [...weak.slice(0, 4).map((q) => ["q", q]), ...dueQ.slice(0, 3).map((q) => ["q", q]),
      ...shuffle(C.flashcards.map((f, i) => i).filter((i) => A.isDue("fc", i))).slice(0, 4).map((i) => ["fc", i]),
      ...shuffle(C.mcq).slice(0, 3).map((m) => ["mcq", m])];
    if (items.length < 6) shuffle(C.questions.filter((q) => !A.S.q[q.id])).slice(0, 6 - items.length).forEach((q) => items.push(["q", q]));
    const list = shuffle(items); let i = 0, good = 0;
    return { title: "Revision session", tab: "practice", html: `<p class="sub" style="margin-top:12px">${list.length} items: ${weak.length ? "questions you struggled with first, then " : ""}due cards and mixed checks.</p><div id="rv"></div>`, mount() {
      const next = (ok) => { if (ok === true) good++; i++; show(); };
      const show = () => {
        if (i >= list.length) { A.S.quiz.push({ at: Date.now(), kind: "revision", score: good, total: list.length }); A.save(); $("#rv").innerHTML = `<div class="card center"><div class="score">${good}/${list.length}</div><p>Revision done. Items you missed will come back first next time.</p><button class="btn" data-go="/home">Home</button></div>`; A.wire($("#rv")); return; }
        const [k, it] = list[i];
        if (k === "fc") {
          $("#rv").innerHTML = `<div class="flash" id="card"><div class="in"><div class="f"><small>Flashcard · ${i + 1}/${list.length}</small>${esc(C.flashcards[it][0])}</div><div class="b"><div class="mono" style="font-size:16px">${esc(C.flashcards[it][1])}</div></div></div></div><div class="btns" style="margin:14px 16px"><button class="btn red" id="a0">Didn't know</button><button class="btn green" id="a1">Knew it</button></div>`;
          $("#card").onclick = () => $("#card").classList.toggle("flip");
          $("#a0").onclick = () => { A.grade("fc", it, false); next(false); }; $("#a1").onclick = () => { A.grade("fc", it, true); next(true); };
        } else if (k === "mcq") {
          $("#rv").innerHTML = `<div style="margin:0 16px"><div class="small muted">Quick check · ${i + 1}/${list.length}</div><h3>${esc(it.q)}</h3>${it.o.map((o, j) => `<button class="opt" data-k="${j}">${esc(o)}</button>`).join("")}<div id="ex"></div></div>`;
          $$(".opt").forEach((b) => (b.onclick = () => { if ($(".opt.right")) return; const ok = +b.dataset.k === it.c; $$(".opt").forEach((x) => +x.dataset.k === it.c && x.classList.add("right")); if (!ok) b.classList.add("wrong"); $("#ex").innerHTML = `<p class="small">${esc(it.e)}</p><button class="btn block" id="nx">Next</button>`; $("#nx").onclick = () => next(ok); }));
        } else {
          $("#rv").innerHTML = `<div class="card"><div class="small muted">${A.S.q[it.id] && A.S.q[it.id].wrong ? "🔁 You struggled with this · " : ""}${esc(C.topics[it.topic])} · ${i + 1}/${list.length}</div><h3>${esc(it.q)}</h3><textarea id="ra" placeholder="Answer in your own words"></textarea><div id="rh"></div>
            <div class="btns"><button class="btn gray" id="rhb">💡 Hint</button><button class="btn" id="rc">Check</button></div><div id="rr"></div></div>`;
          let h = 0;
          $("#rhb").onclick = () => { if (h < it.hints.length) $("#rh").insertAdjacentHTML("beforeend", `<div class="say small">💡 ${esc(it.hints[h++])}</div>`); };
          $("#rc").onclick = () => { const r = A.scoreFree($("#ra").value, it.k); const ok = r.pct >= 70 && h === 0 ? true : r.pct >= 45 ? "half" : false; A.grade("q", it.id, ok); $("#rr").innerHTML = A.feedbackHTML(r, it.a, it.say) + `<button class="btn block" id="nx" style="margin-top:10px">Next</button>`; $("#nx").onclick = () => next(ok); };
        }
      };
      show();
    } };
  });

  /* ======================================================= SHOWCASE */
  A.route("showcase", (_, q) => {
    if (q.run) return showcaseRun(q);
    const hist = A.S.showcase.slice(-5).reverse();
    return { large: true, title: "Showcase", sub: "A practice run of your UTS project demonstration.", html: `
      <div class="card"><h3>🎓 Practice demonstration</h3><p class="small">The “instructor” asks a mix of questions: a specific line, a function, what an input does, a design choice, a requirement, and your own contribution. You answer by typing or dictating. Each answer gets feedback and a better version to say.</p>
        <div class="sec-h" style="margin:12px 0 6px">Length</div><div class="seg" style="margin:0" id="len"><button data-v="5">Quick · 5</button><button class="on" data-v="8">Standard · 8</button><button data-v="12">Full · 12</button></div>
        <div class="sec-h" style="margin:12px 0 6px">Focus</div><div class="seg" style="margin:0" id="foc"><button class="on" data-v="mix">Everything</button><button data-v="mine">My files</button><button data-v="hard">Hard only</button></div>
        <label class="small" style="display:flex;gap:8px;align-items:center;margin-top:12px"><input type="checkbox" id="tim" checked> 90-second timer per question (like the real thing)</label>
        ${A.S.settings.name ? `<p class="small muted">Your name: ${esc(A.S.settings.name)}</p>` : `<div class="unvbox small">Set your name in <a href="#/settings">Settings</a> so “my files” and contribution questions use your real commits.</div>`}
        <div class="btns"><button class="btn block" id="start">Start the showcase</button></div></div>
      <div class="sec-h">Before the real showcase</div>
      <div class="group">
        ${A.row({ icon: "bug", color: "#ff3b30", t: "Know the findings", d: "The GUI login fix and smaller items", go: "/findings" })}
        ${A.row({ icon: "term", color: "#1c1c1e", t: "Rehearse the live demo", d: "Use the test cases in the simulator", go: "/tests" })}
        ${A.row({ icon: "me", color: "#5856d6", t: "My contribution", d: "Facts from git history", go: "/contrib" })}
        ${A.row({ icon: "list", color: "#8e8e93", t: "Demo checklist", go: "/checklist" })}
      </div>
      ${hist.length ? `<div class="sec-h">Recent runs</div><div class="group flat">${hist.map((h) => A.row({ t: `${h.pct}% · ${h.n} questions`, d: new Date(h.at).toLocaleString() + (h.weak ? " · weak: " + esc(h.weak) : "") })).join("")}</div>` : ""}`,
      mount() {
        const pick = (id) => $(`#${id} .on`).dataset.v;
        $$("#len button,#foc button").forEach((b) => (b.onclick = () => { $$("button", b.parentNode).forEach((x) => x.classList.toggle("on", x === b)); }));
        $("#start").onclick = () => A.go(`/showcase?run=1&n=${pick("len")}&f=${pick("foc")}&t=${$("#tim").checked ? 1 : 0}`);
      } };
  });

  function myFiles() {
    const n = (A.S.settings.name || "").toLowerCase(); if (!n) return [];
    return Object.entries(REPO.files).filter(([p, v]) => KB.files[p] && Object.keys(v.authors).some((a) => a.toLowerCase().includes(n.split(" ")[0]))).map(([p]) => p);
  }
  function buildShowcase(n, focus) {
    const mine = myFiles(); const out = [];
    const bank = shuffle(C.questions.filter((x) => x.topic !== "contrib" && (focus !== "hard" || x.level >= 3)));
    const tests = shuffle(C.tests.filter((t) => !["T08", "T09", "T11", "T22"].includes(t.id)));
    out.push(Object.assign({}, C.questions.find((x) => x.id === "q1"), { kind: "Opening" }));
    const contrib = C.questions.filter((x) => x.topic === "contrib");
    let li = 0;
    while (out.length < n - 1) {
      const r = out.length % 4;
      if (r === 1) { const lq = lineQuestion(focus === "mine" && mine.length ? mine[li++ % mine.length] : undefined); lq.kind = "Point at a line"; out.push(lq); }
      else if (r === 2 && tests.length) { const t = tests.pop(); out.push({ id: "pred:" + t.id, kind: "What happens if…", topic: "main", level: 2, q: `I'll type these inputs: ${t.inputs.map((x) => JSON.stringify(x)).join(", ")}. What does the program show, and why?`, hints: [t.why], a: `${t.expect}. Why: ${t.why}`, k: A.keywordsFrom(t.expect + " " + t.why) }); }
      else { const b = bank.pop(); if (b) out.push(Object.assign({ kind: b.level === 4 ? "Unexpected question" : "Design & code" }, b)); }
    }
    const c = shuffle(contrib)[0];
    out.push(Object.assign({ kind: "Your contribution" }, c, mine.length ? { a: `Talk about your files: ${mine.slice(0, 5).join(", ")}. Explain one function line by line, one decision (why), and one improvement.`, k: [mine.map((f) => f.split("/").pop().replace(".py", "")).concat(["file"]), ["because", "decid", "why"], ["improve", "fix", "would"]] } : {}));
    return out;
  }
  function showcaseRun(q) {
    const n = +q.n || 8; const qs = buildShowcase(n, q.f); const res = []; let i = 0, timer = null, left = 90, showRef = null;
    return { title: "Showcase", tab: "showcase", action: "End", onAction: () => { if (showRef && confirm("End the showcase now?")) { i = qs.length; showRef(); } }, html: `<div id="sc"></div>`, mount() {
      const stopT = () => { if (timer) clearInterval(timer); timer = null; };
      const show = () => {
        stopT();
        if (i >= qs.length) return report();
        const x = qs[i]; left = 90;
        $("#sc").innerHTML = `<div style="margin:12px 16px">${A.bar((i / qs.length) * 100)}</div>
          <div class="card"><div style="display:flex;justify-content:space-between" class="small muted"><span>👩‍🏫 ${esc(x.kind || "Question")} · ${i + 1}/${qs.length}</span><span id="clock">${+q.t ? "1:30" : ""}</span></div>
          <h3 style="margin:10px 0">${esc(personal(x.q))}</h3>${x.code ? `<pre>${x.code.split("\n").map((l) => A.hl(l, x.file)).join("\n")}</pre>` : ""}
          <textarea id="sa" placeholder="Answer as you would say it to the instructor…"></textarea>
          <div class="btns"><button class="btn gray" id="sh">💡 Hint (−1)</button><button class="btn" id="ss">Submit answer</button></div><div id="shb"></div><div id="sr"></div></div>`;
        let hints = 0;
        if (+q.t) timer = setInterval(() => { left--; const c = $("#clock"); if (c) c.textContent = `${Math.floor(Math.max(0, left) / 60)}:${String(Math.max(0, left) % 60).padStart(2, "0")}`; if (left === 0) { A.toast("Time! Finish your sentence and submit."); } }, 1000);
        $("#sh").onclick = () => { if (hints < (x.hints || []).length) $("#shb").insertAdjacentHTML("beforeend", `<div class="say small">💡 ${esc(x.hints[hints++])}</div>`); };
        $("#ss").onclick = () => {
          stopT(); const v = $("#sa").value.trim(); const r = A.scoreFree(v, x.k || []);
          let pts = r.pct >= 75 ? 4 : r.pct >= 55 ? 3 : r.pct >= 35 ? 2 : v ? 1 : 0; pts = Math.max(0, pts - hints); if (left < 0) pts = Math.max(0, pts - 1);
          res.push({ x, pts, r });
          if (x.id && !String(x.id).includes(":")) A.grade("q", x.id, pts >= 3 ? true : pts >= 2 ? "half" : false);
          $("#ss").disabled = true; $("#sh").disabled = true;
          $("#sr").innerHTML = `<p><b>Instructor's mark: ${pts}/4</b> ${["😬", "🙂", "👍", "💪", "🌟"][pts]}</p>` + A.feedbackHTML(r, x.a, x.say) + `<div class="btns">${A.getKey() ? '<button class="btn gray" id="sai">✨ AI coach</button>' : ""}<button class="btn green" id="sn">${i === qs.length - 1 ? "Finish" : "Next question"}</button></div><div id="saio"></div>`;
          $("#sn").onclick = () => { i++; show(); window.scrollTo(0, 0); };
          const ai = $("#sai"); if (ai) ai.onclick = async () => { $("#saio").innerHTML = `<div class="card" style="margin:10px 0 0;background:var(--card2);white-space:pre-wrap" id="saiot">Thinking…</div>`; try { await A.ai([{ role: "user", content: `Showcase practice. Instructor asked: "${x.q}". Reference answer: "${x.a}". My answer: "${v}". As a UTS instructor, give a mark out of 4, one sentence on what was good, what was missing, then "Say it like this:" with a confident first-person answer in max 4 short sentences.` }], (t) => ($("#saiot").textContent = t)); } catch (e) { $("#saiot").textContent = "AI error: " + e.message; } };
        };
      };
      const report = () => {
        const tot = res.reduce((a, b) => a + b.pts, 0), pct = res.length ? Math.round((tot / (res.length * 4)) * 100) : 0;
        const byKind = {}; res.forEach((r) => { const k = r.x.kind || "Other"; (byKind[k] = byKind[k] || []).push(r.pts); });
        const weakest = Object.entries(byKind).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => a[1] - b[1]);
        A.S.showcase.push({ at: Date.now(), pct, n: res.length, weak: weakest[0] ? weakest[0][0] : "" }); A.save();
        $("#sc").innerHTML = `<div class="card center"><div class="small muted">Showcase result</div><div class="score">${pct}%</div><p>${pct >= 80 ? "You are ready. Keep it fresh with a revision session." : pct >= 55 ? "Good. Practise the weak parts below once more." : "Keep practising — repeat the lessons for the weak parts."}</p></div>
          <div class="sec-h">By question type</div><div class="group flat">${weakest.map(([k, v]) => A.row({ t: esc(k), d: A.bar((v / 4) * 100), r: v.toFixed(1) + "/4" })).join("")}</div>
          <div class="sec-h">Review your answers</div><div class="group flat">${res.map((r) => A.row({ t: esc(r.x.q), d: `${r.pts}/4 · Better answer: ${esc(r.x.a)}` })).join("")}</div>
          <div class="btns" style="margin:12px 16px"><button class="btn" data-go="/showcase?run=1&n=${n}&f=${q.f}&t=${q.t}&r=${Date.now()}">Try again</button><button class="btn gray" data-go="/revision">Revise weak items</button></div>`;
        A.wire($("#sc"));
      };
      showRef = show; show();
      return stopT;
    } };
  }

  A.route("checklist", () => {
    const items = ["Back up students.data (admin “c” deletes everything, with no question)", "Run python3 main.py from the project root and try A, S, X", "Have 2 working logins ready: john.smith@university.com / Password123 and sarah.lee@university.com / Universe789", "Know that John already has 4 subjects (good for showing the limit)", "Test python3 gui_main.py on YOUR computer: correct login, empty fields, bad email, wrong password", "Run python3 -m unittest discover -s tests", "Know which files you wrote and one function you can explain line by line", "Prepare one design decision and one improvement", "Know the regex rules by heart", "Close other apps; increase terminal font size"];
    const st = A.S.settings.check || {};
    return { title: "Demo checklist", tab: "showcase", html: `<div class="group flat" style="margin-top:12px">${items.map((t, k) => `<label class="row noicon"><input type="checkbox" data-k="${k}" ${st[k] ? "checked" : ""} style="width:22px;height:22px"><span class="main"><div class="t" style="font-size:16px">${esc(t)}</div></span></label>`).join("")}</div>`,
      mount() { $$("[data-k]").forEach((c) => (c.onchange = () => { A.S.settings.check = Object.assign(A.S.settings.check || {}, { [c.dataset.k]: c.checked }); A.save(); })); } };
  });

  /* ============================================================== ME */
  A.route("me", () => {
    const rd = A.readiness();
    return { large: true, title: "Me", sub: A.S.settings.name ? esc(A.S.settings.name) : "Set your name in Settings", html: `
      <div class="card"><div class="hero">${A.ring(rd, "ready")}<div><b>Showcase readiness</b><p class="small muted">${Object.keys(A.S.lessons).length}/${C.lessons.length} lessons · ${Object.keys(A.S.q).length} items practised · ${A.S.showcase.length} showcase runs · ${Object.keys(A.S.viewed).length} files opened</p></div></div></div>
      <div class="group">
        ${A.row({ icon: "bolt", color: "#34c759", t: "Progress & weak areas", go: "/progress" })}
        ${A.row({ icon: "me", color: "#5856d6", t: "My contribution", d: "From git history and code comments", go: "/contrib" })}
        ${A.row({ icon: "star", color: "#ffcc00", t: "Bookmarks", r: A.S.bookmarks.length, go: "/bookmarks" })}
        ${A.row({ icon: "cloud", color: "#007aff", t: "Import / update repository", d: A.S.imported ? esc(A.S.imported.label) : "Using built-in snapshot", go: "/import" })}
        ${A.row({ icon: "gear", color: "#8e8e93", t: "Settings", d: "Name, theme, AI key, brief", go: "/settings" })}
        ${A.row({ icon: "flag", color: "#af52de", t: "About & what is verified", go: "/about" })}
      </div>` };
  });

  A.route("progress", () => {
    const topics = A.weakTopics(); const hist = A.S.quiz.slice(-10).reverse(); const struggle = A.struggling();
    const comp = (t) => C.lessons.filter((l) => l.topic === t && A.S.lessons[l.id]).length + "/" + C.lessons.filter((l) => l.topic === t).length;
    return { title: "Progress", tab: "me", html: `
      <div class="sec-h">Understanding by topic (weakest first)</div>
      <div class="group flat">${topics.map((t) => A.row({ t: C.topics[t.t], d: A.bar(t.m, t.m >= 70 ? "var(--green)" : t.m >= 40 ? "var(--orange)" : "var(--red)") + `<div style="margin-top:3px">lessons ${comp(t.t)}</div>`, r: t.m + "%", go: "/tutor?topic=" + t.t })).join("")}</div>
      <div class="sec-h">Questions you struggle with (${struggle.length})</div>
      <div class="group flat">${struggle.length ? struggle.map((x) => A.row({ t: esc(x.q), d: `missed ${A.S.q[x.id].wrong}× · ${C.topics[x.topic]}`, go: "/tutor?id=" + x.id })).join("") : A.row({ t: "None yet — great!", d: "Missed questions appear here and come back in revision." })}</div>
      <div class="sec-h">Quiz & revision scores</div>
      <div class="group flat">${hist.length ? hist.map((h) => A.row({ t: `${h.kind === "mcq" ? "Quiz" : "Revision"}: ${h.score}/${h.total}`, d: new Date(h.at).toLocaleString(), r: Math.round((h.score / h.total) * 100) + "%" })).join("") : A.row({ t: "No quizzes yet", go: "/quiz" })}</div>
      <div class="sec-h">Showcase runs</div>
      <div class="group flat">${A.S.showcase.length ? A.S.showcase.slice(-10).reverse().map((h) => A.row({ t: h.pct + "%", d: new Date(h.at).toLocaleString() + (h.weak ? " · weakest: " + esc(h.weak) : "") })).join("") : A.row({ t: "No showcase practice yet", go: "/showcase" })}</div>
      <div class="sec-h">Files explored</div>
      <div class="group flat">${Object.keys(KB.files).map((f) => A.row({ t: `<span class="mono" style="font-size:14px">${esc(f)}</span>`, r: A.S.viewed[f] ? "✓" : "", go: "/file/" + encodeURIComponent(f) })).join("")}</div>` };
  });

  A.route("contrib", () => {
    const people = {}; REPO.commits.forEach((c) => { (people[c.author] = people[c.author] || []).push(c); });
    const me = (A.S.settings.name || "").split(" ")[0].toLowerCase();
    return { title: "Contribution", tab: "me", html: `<p class="sub" style="margin-top:12px">Facts from the git history of <span class="mono">main</span> (merge commits excluded) and from code comments such as “Rafeed's code”. Contribution claims beyond this cannot be verified.</p>
      ${KB.team.map((t) => { const cs = people[t.name] || []; const mine = me && t.name.toLowerCase().includes(me);
        const files = Object.entries(REPO.files).filter(([, v]) => v.authors[t.name]).map(([p, v]) => `${p} (${v.authors[t.name]})`);
        return `<div class="card" ${mine ? 'style="border:2px solid var(--blue)"' : ""}><h3>${esc(t.name)} ${mine ? '<span class="tag info">you</span>' : ""}</h3><p class="small muted">${cs.length} commits · GitHub @${esc(t.github)}</p>
        <p class="small"><b>Main areas:</b> ${t.areas.map(esc).join(" · ")}</p><details><summary class="small">Files touched (${files.length})</summary><p class="small mono">${files.map(esc).join("<br>")}</p></details>
        <details><summary class="small">Commits</summary><p class="small">${cs.map((c) => `<span class="mono">${c.hash}</span> ${c.date} ${esc(c.subject)}`).join("<br>")}</p></details></div>`; }).join("")}
      <div class="card"><b>Practise saying it</b><p class="small">Use STAR: Situation → Task → Action (classes/functions + one decision) → Result (+ one improvement).</p><button class="btn" data-go="/tutor?id=q73">Practise “What was your contribution?”</button></div>` };
  });

  A.route("bookmarks", () => ({ title: "Bookmarks", tab: "me", html: A.S.bookmarks.length ? `<div class="group flat" style="margin-top:12px">${A.S.bookmarks.map((b, k) => A.row({ t: `<span class="mono" style="font-size:14px">${esc(b.title)}</span>`, d: b.text ? `<span class="mono">${esc(b.text)}</span>` : b.type, go: `/file/${encodeURIComponent(b.file)}${b.line ? "?l=" + b.line + "&open=1" : ""}` })).join("")}</div><div class="btns" style="margin:12px 16px"><button class="btn gray" id="clr">Clear all bookmarks</button></div>` : `<div class="empty">No bookmarks yet. Tap ☆ on a file or line.</div>`,
    mount() { const c = $("#clr"); if (c) c.onclick = () => { if (confirm("Remove all bookmarks?")) { A.S.bookmarks = []; A.save(); A.go("/bookmarks"); } }; } }));

  A.route("settings", () => ({ title: "Settings", tab: "me", html: `
    <div class="sec-h">You</div><div class="card"><label class="small muted">Your name (used for contribution questions)</label>
      <select id="nm"><option value="">— choose —</option>${KB.team.map((t) => `<option ${A.S.settings.name === t.name ? "selected" : ""}>${esc(t.name)}</option>`).join("")}<option value="__other" ${A.S.settings.name && !KB.team.some((t) => t.name === A.S.settings.name) ? "selected" : ""}>Someone else…</option></select>
      <input type="text" id="nmo" placeholder="Your name" style="margin-top:8px;${A.S.settings.name && !KB.team.some((t) => t.name === A.S.settings.name) ? "" : "display:none"}" value="${esc(A.S.settings.name)}"></div>
    <div class="sec-h">Appearance</div><div class="seg" id="th">${["auto", "light", "dark"].map((t) => `<button class="${A.S.settings.theme === t ? "on" : ""}" data-v="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div>
    <div class="sec-h">Assignment brief / marking rubric</div><div class="card"><p class="small muted">Not in your repository, so the coach can't verify it. Paste the parts you have (requirements, sample output, rubric). It is shown on the Requirements page and given to the AI tutor.</p><textarea id="br" style="min-height:140px">${esc(A.S.settings.brief)}</textarea><div class="btns"><button class="btn small" id="brs">Save brief</button></div></div>
    <div class="sec-h">AI tutor (optional)</div><div class="card"><p class="small">Everything works offline. If you add your own Anthropic API key, the tutor can answer free questions and coach your answers. The key is stored only in this browser and sent only to api.anthropic.com. Usage is billed to your account.</p>
      <input type="password" id="key" placeholder="sk-ant-…" value="${A.getKey() ? "••••••••" : ""}" autocomplete="off">
      <select id="mdl" style="margin-top:8px">${[["claude-opus-5-5", "Claude Opus 5.5 (best)"], ["claude-sonnet-5-5", "Claude Sonnet 5.5 (cheaper)"], ["claude-haiku-5-5", "Claude Haiku 5.5 (cheapest)"]].map(([v, l]) => `<option value="${v}" ${A.S.settings.model === v ? "selected" : ""}>${l}</option>`).join("")}</select>
      <div class="btns"><button class="btn small" id="ks">Save key</button><button class="btn small gray" id="kt">Test</button><button class="btn small red" id="kd">Remove</button></div><div id="kr" class="small"></div></div>
    <div class="sec-h">Data</div><div class="group flat">${A.row({ t: "Export progress (backup)", act: "exp", chev: 1 })}${A.row({ t: "Import progress", act: "imp", chev: 1 })}${A.row({ t: '<span style="color:var(--red)">Reset all progress</span>', act: "rst" })}</div>
    <input type="file" id="impf" accept="application/json" hidden>`,
    mount() {
      $("#nm").onchange = () => { const v = $("#nm").value; if (v === "__other") { $("#nmo").style.display = ""; $("#nmo").focus(); } else { $("#nmo").style.display = "none"; A.S.settings.name = v; A.save(); A.toast("Saved"); } };
      $("#nmo").onchange = () => { A.S.settings.name = $("#nmo").value.trim(); A.save(); A.toast("Saved"); };
      $$("#th button").forEach((b) => (b.onclick = () => { A.S.settings.theme = b.dataset.v; A.save(); A.applyTheme(); $$("#th button").forEach((x) => x.classList.toggle("on", x === b)); }));
      $("#brs").onclick = () => { A.S.settings.brief = $("#br").value; A.save(); A.toast("Brief saved"); };
      $("#mdl").onchange = () => { A.S.settings.model = $("#mdl").value; A.save(); };
      $("#ks").onclick = () => { const v = $("#key").value.trim(); if (v && !v.startsWith("•")) { A.setKey(v); $("#key").value = "••••••••"; A.toast("Key saved on this device"); } };
      $("#kd").onclick = () => { A.setKey(""); $("#key").value = ""; A.toast("Key removed"); };
      $("#kt").onclick = async () => { $("#kr").textContent = "Testing…"; try { const t = await A.ai([{ role: "user", content: "In one short sentence: what is students.data in this project?" }], (x) => ($("#kr").textContent = x)); if (!t) $("#kr").textContent = "No reply."; } catch (e) { $("#kr").textContent = "❌ " + e.message; } };
      $$("[data-act]").forEach((r) => (r.onclick = () => {
        const a = r.dataset.act;
        if (a === "exp") { const b = new Blob([JSON.stringify(A.S, null, 1)], { type: "application/json" }); const u = URL.createObjectURL(b); const l = document.createElement("a"); l.href = u; l.download = "unienroll-coach-progress.json"; l.click(); }
        if (a === "imp") $("#impf").click();
        if (a === "rst" && confirm("Delete all progress, bookmarks and settings on this device?")) { localStorage.removeItem("uec.v1"); location.reload(); }
      }));
      $("#impf").onchange = async () => { try { const d = JSON.parse(await $("#impf").files[0].text()); Object.assign(A.S, d); A.save(); A.toast("Progress imported"); } catch (e) { A.toast("Not a valid backup file"); } };
    } }));

  /* ============================================================ IMPORT */
  A.route("import", () => ({ title: "Import repository", tab: "me", html: `
    <p class="sub" style="margin-top:12px">The app ships with a snapshot of <span class="mono">${REPO.repo}@${REPO.commit}</span>. If your team changes the code, import the new version. Lessons are re-matched to the new lines; anything that no longer matches is marked <span class="tag unv">not verified</span>. Importing only <b>reads</b> files — nothing is ever written to your repository.</p>
    <div class="sec-h">From GitHub (public repo)</div><div class="card">
      <input type="text" id="gh" value="${esc((A.S.imported && A.S.imported.repo) || REPO.repo)}" placeholder="owner/repo" autocapitalize="off" autocorrect="off">
      <input type="text" id="gb" value="${esc((A.S.imported && A.S.imported.branch) || "main")}" placeholder="branch" style="margin-top:8px" autocapitalize="off">
      <div class="btns"><button class="btn" id="ghgo">Import from GitHub</button></div><div id="ghs" class="small"></div></div>
    <div class="sec-h">From files on this phone</div><div class="card"><p class="small muted">Pick .py / .data / .md files (e.g. from the Files app). Files with the same name as a project file replace it.</p><input type="file" id="lf" multiple accept=".py,.data,.md,.txt,.json"><div id="lfs" class="small"></div></div>
    ${A.S.imported ? `<div class="sec-h">Current import</div><div class="card small"><b>${esc(A.S.imported.label)}</b><br>${Object.keys(A.S.imported.files).length} files · imported ${new Date(A.S.imported.at).toLocaleString()}<br>${diffSummary()}<div class="btns"><button class="btn small red" id="rev">Go back to the built-in snapshot</button></div></div>` : ""}`,
    mount() {
      $("#ghgo").onclick = async () => {
        const repo = $("#gh").value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, ""), br = $("#gb").value.trim() || "main", s = $("#ghs");
        try {
          s.textContent = "Reading file list…";
          const tr = await fetch(`https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(br)}?recursive=1`); if (!tr.ok) throw new Error(`GitHub said ${tr.status}. Is the repo public and the branch name right?`);
          const tree = (await tr.json()).tree.filter((t) => t.type === "blob" && /\.(py|data|md|txt|json)$/.test(t.path) && !t.path.startsWith("docs/") && t.size < 300000);
          const files = {}; let k = 0;
          for (const t of tree) { s.textContent = `Downloading ${++k}/${tree.length}: ${t.path}`; const r = await fetch(`https://raw.githubusercontent.com/${repo}/${encodeURIComponent(br)}/${t.path.split("/").map(encodeURIComponent).join("/")}`); if (r.ok) files[t.path] = await r.text(); }
          A.S.imported = { label: `${repo}@${br}`, repo, branch: br, files, at: Date.now() }; A.save(); A.toast("Imported ✓"); A.go("/import?d=" + Date.now());
        } catch (e) { s.textContent = "❌ " + e.message; }
      };
      $("#lf").onchange = async () => {
        const base = Object.assign({}, A.files()); const names = Object.keys(base); const log = [];
        for (const f of $("#lf").files) { const m = names.filter((p) => p.split("/").pop() === f.name); const p = m.length === 1 ? m[0] : "imported/" + f.name; base[p] = await f.text(); log.push(`${f.name} → ${p}`); }
        A.S.imported = { label: "Local files", files: base, at: Date.now() }; A.save(); $("#lfs").innerHTML = log.map(esc).join("<br>"); A.toast("Imported ✓");
      };
      const r = $("#rev"); if (r) r.onclick = () => { A.S.imported = null; A.save(); A.toast("Using the snapshot"); A.go("/import?d=" + Date.now()); };
    } }));
  function diffSummary() {
    const snap = A.snapshotFiles(), cur = A.files(); const ch = [], add = [], gone = [];
    Object.keys(cur).forEach((p) => (snap[p] == null ? add : snap[p] !== cur[p] ? ch : []).push(p)); Object.keys(snap).forEach((p) => cur[p] == null && gone.push(p));
    let unv = 0; Object.keys(KB.files).forEach((p) => A.notes(p).forEach((n) => n.status === "unverified" && unv++));
    return `Changed: ${ch.length ? ch.map(esc).join(", ") : "none"}<br>New: ${add.length ? add.map(esc).join(", ") : "none"}<br>Missing: ${gone.length ? gone.map(esc).join(", ") : "none"}<br>Notes that could not be re-matched: <b>${unv}</b>`;
  }

  A.route("about", () => ({ title: "About", tab: "me", html: `<div class="card"><h3>UniEnroll Learning Coach</h3><p class="small">A study app for UTS 32555 Fundamentals of Software Development, Assessment 1 (Parts 2 & 3), Cmp1-07 Group 3. Built from the real repository <span class="mono">${REPO.repo}</span> at commit <span class="mono">${REPO.commit}</span> (${REPO.snapshotDate})${REPO.note ? " " + esc(REPO.note) : ""}.</p></div>
    <div class="sec-h">What is verified</div><div class="card small">
      ✅ <b>Code explanations</b> — written from the actual source; every note is tied to an anchor line, checked automatically.<br>
      ✅ <b>CLI simulator outputs</b> — compared with the real Python program for all ${C.tests.length - 2} test cases without random IDs or marks (identical, including colours).<br>
      ✅ <b>GUI login bug</b> — reproduced with a stand-in Tkinter, and the fixed version tested the same way (all four login cases).<br>
      ✅ <b>Contribution facts</b> — from git history and code comments.<br><br>
      <span class="tag unv">Cannot verify</span> the assignment brief, sample output, marking rubric, and how the GUI looks on your computer. These are clearly marked where they appear.<br><br>
      🔒 The app never modifies your repository. Progress is stored only on this device.</div>` }));
})();
