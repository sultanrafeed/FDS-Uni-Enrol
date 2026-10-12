/* A faithful JavaScript re-creation of the CLIUniApp, used ONLY for learning.
   Every printed string is copied from the Python source. Each step also emits a
   "trace" (file + line) so you can see which code produced which output.
   It works on an in-memory COPY of students.data — your real file is never touched. */
(function () {
  const RED = "red", YELLOW = "yellow", CYAN = "cyan";
  const EMAIL = /^[a-zA-Z]+\.[a-zA-Z]+@university\.com$/;
  const PASSWORD = /^[A-Z][a-zA-Z]{4,}[0-9]{3,}$/;

  // Python str(float): 55 -> "55.0", 68.25 -> "68.25"
  const pyFloat = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));
  // Python str.zfill(3), including the sign rule
  function zfill(s, w) {
    s = String(s);
    let sign = "";
    if (s[0] === "+" || s[0] === "-") { sign = s[0]; s = s.slice(1); }
    while (sign.length + s.length < w) s = "0" + s;
    return sign + s;
  }
  // Python str.strip() also removes tabs/newlines; JS trim() is equivalent here.
  const pad_id = (n) => zfill(n, 3);
  function calculate_grade(m) {
    if (m < 50) return "Z"; if (m < 65) return "P"; if (m < 75) return "C"; if (m < 85) return "D"; return "HD";
  }
  const subjectStr = (s) => "[ Subject::" + s.id + " -- mark = " + s.mark + " -- grade = " + s.grade.padStart(3) + " ]";
  const randint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  class SimDB {
    constructor(json) { this.students = JSON.parse(json); }
    toText() { return JSON.stringify(this.students, null, 2); }
    byId(id) { return this.students.find((s) => s.id === id) || null; }
    byEmail(e) { return this.students.find((s) => s.email === e) || null; }
  }

  function averageAndGrade(st) {
    let total = 0; for (const s of st.subjects) total += s.mark;
    const avg = st.subjects.length === 0 ? 0.0 : total / st.subjects.length;
    return [avg, calculate_grade(avg)];
  }
  function outputString(list) {
    return list.map((st) => { const [a, g] = averageAndGrade(st); return `${st.name} :: ${st.id} --> GRADE: ${g} - MARK: ${pyFloat(a)}`; }).join(", ");
  }

  /* io = { input(prompt, color) -> Promise<string>, print(text, color), trace(file, line, note), changed(note) } */
  async function runCLI(db, io) {
    const T = io.trace;
    T("main.py", 14, "Database(filename=\"students.data\") loads " + db.students.length + " students");
    while (true) {
      T("main.py", 26, "University System prompt");
      let u = await io.input("University System: (A)dmin, (S)tudent, or X : ");
      if (u === null) return;
      u = u.trim().toUpperCase();
      T("main.py", 30, `strip().upper() → "${u}"`);
      if (u === "S") { T("main.py", 32, "student_menu.run()"); if ((await studentMenu(db, io)) === null) return; }
      else if (u === "A") { T("main.py", 34, "admin_menu.run()"); if ((await adminMenu(db, io)) === null) return; }
      else if (u === "X") { T("main.py", 36, "print Thank You, break"); io.print("Thank You"); io.end && io.end(); return; }
      else { T("main.py", 39, "else → Invalid input"); io.print("Invalid input"); }
    }
  }

  async function adminMenu(db, io) {
    const T = io.trace, F = "admin_system/admin_controller.py";
    while (true) {
      const u = await io.input("Admin System (c/g/p/r/s/x): ");
      if (u === null) return null;
      if (u === "c") {
        T("admin_system/admin_menu.py", 13, "clear_database()");
        T("database/database.py", 124, "self.students = [] then save_students()");
        db.students = []; io.changed("All students deleted"); io.print("successfully cleared database");
      } else if (u === "g") {
        T("admin_system/admin_menu.py", 15, "group_students()");
        io.print("GRADE GROUPING");
        if (db.students.length === 0) { T(F, 63, "no students"); io.print("<Nothing to display>"); continue; }
        const groups = { Z: [], P: [], C: [], D: [], HD: [] };
        for (const st of db.students) groups[calculate_grade(averageAndGrade(st)[0])].push(st);
        T(F, 71, "each student goes into the list for their AVERAGE grade");
        for (const g of ["Z", "P", "C", "D", "HD"]) if (groups[g].length) {
          io.print(`${g}${g === "Z" ? " -- > " : " --> "}[${outputString(groups[g])}]`);
        }
      } else if (u === "p") {
        T("admin_system/admin_menu.py", 17, "partition_student()");
        io.print("PASS/FAIL PARTITIONING");
        const pass = [], fail = [];
        for (const st of db.students) (averageAndGrade(st)[0] < 50 ? fail : pass).push(st);
        T(F, 121, "average < 50 → FAIL, otherwise PASS");
        io.print(`FAIL --> [${outputString(fail)}]`); io.print(`PASS --> [${outputString(pass)}]`);
      } else if (u === "r") {
        T("admin_system/admin_menu.py", 19, "input REMOVE BY ID (not stripped, not padded)");
        const id = await io.input("REMOVE BY ID: "); if (id === null) return null;
        const st = db.byId(id);
        if (!st) { T(F, 145, `get_student_by_id("${id}") → None`); io.print("Student does not exist"); }
        else { T("database/database.py", 114, `delete_student("${id}") → pop + save`); db.students.splice(db.students.indexOf(st), 1); io.changed(`Removed ${st.name}`); }
      } else if (u === "s") {
        T("admin_system/admin_menu.py", 22, "show_students()");
        if (db.students.length === 0) io.print("<Nothing to display>"); else io.print(`[${outputString(db.students)}]`);
      } else if (u === "x") { T("admin_system/admin_menu.py", 24, "break → back to main menu"); return true; }
      else { T("admin_system/admin_menu.py", 26, "case-sensitive comparison failed"); io.print("invalid input"); }
    }
  }

  async function askCreds(io) {
    const F = "student_system/student_controller.py";
    while (true) {
      const e = await io.input("\tEmail: "); if (e === null) return null;
      const p = await io.input("\tPassword: "); if (p === null) return null;
      if (EMAIL.test(e) && PASSWORD.test(p)) { io.trace(F, 35, "both regex match"); io.print("\temail and password formats acceptable", YELLOW); return [e, p]; }
      io.trace(F, 38, `email ${EMAIL.test(e) ? "OK" : "BAD"}, password ${PASSWORD.test(p) ? "OK" : "BAD"} → ask again`);
      io.print("\tIncorrect email or password format", RED);
    }
  }

  async function studentMenu(db, io) {
    const T = io.trace, F = "student_system/student_controller.py";
    while (true) {
      const u = await io.input("Student system (l/r/x): ");
      if (u === null) return null;
      if (u === "l") {
        T(F, 67, "login()"); io.print("\tStudent Sign In");
        const c = await askCreds(io); if (!c) return null;
        const rec = db.byEmail(c[0]);
        if (!rec || rec.password !== c[1]) { T(F, 72, rec ? "password does not match" : "email not found"); io.print("\tStudent does not exist"); continue; }
        T(F, 75, `Student.create_from_file_data → ${rec.name}`);
        T("student_system/student_menu.py", 32, "EnrolmentController(student, database) + EnrolmentMenu.run()");
        if ((await enrolmentMenu(db, io, rec)) === null) return null;
      } else if (u === "r") {
        T(F, 47, "register()"); io.print("\tStudent Sign Up");
        const c = await askCreds(io); if (!c) return null;
        const ex = db.byEmail(c[0]);
        if (ex) { T(F, 52, "email already registered"); io.print(`\tStudent ${ex.name} already exists`); continue; }
        let name = "";
        while (name === "") { const n = await io.input("\tName: "); if (n === null) return null; name = n.trim(); }
        let id; do { id = zfill(randint(1, 999999), 6); } while (db.byId(id));
        T(F, 42, `generate_unique_id → "${id}"`);
        db.students.push({ id, name, email: c[0], password: c[1], subjects: [] });
        T("database/database.py", 54, "create_student → append + save_students");
        io.changed(`Added ${name}`); io.print(`\tEnrolling Student ${name}`);
      } else if (u === "x") { T("student_system/student_menu.py", 24, "break → back to main menu"); return true; }
      else { T("student_system/student_menu.py", 26, "case-sensitive comparison failed"); io.print("Invalid input"); }
    }
  }

  async function enrolmentMenu(db, io, rec) {
    // The Student object is a COPY rebuilt from the dict; saving replaces the dict.
    const student = JSON.parse(JSON.stringify(rec));
    const T = io.trace, C = "student_system/enrolment_controller.py", M = "student_system/enrolment_menu.py";
    const save = (why) => {
      const i = db.students.findIndex((s) => s.id === student.id);
      const data = { id: student.id, name: student.name, email: student.email, password: student.password, subjects: student.subjects.map((s) => ({ id: s.id, mark: s.mark, grade: s.grade })) };
      if (i >= 0) db.students[i] = data;
      T(C, 80, "save_student → update_student → save_students");
      io.changed(why);
    };
    const count = () => io.print("\t\tYou are now enrolled in " + student.subjects.length + " out of 4 subjects", YELLOW);
    while (true) {
      let ch = await io.input("\t\tStudent Course Menu (c/e/r/s/x): ", CYAN);
      if (ch === null) return null;
      ch = ch.trim().toLowerCase();
      if (ch === "c") {
        T(M, 90, "change_password()"); io.print("\t\tUpdating Password", YELLOW);
        let np;
        while (true) { np = await io.input("\t\tNew Password: "); if (np === null) return null; if (PASSWORD.test(np)) break; T(M, 97, "regex failed"); io.print("\t\tIncorrect password format", RED); }
        while (true) { const cp = await io.input("\t\tConfirm Password: "); if (cp === null) return null; if (cp === np) break; T(M, 106, "confirmation differs"); io.print("\t\tPassword does not match - try again", RED); }
        student.password = np; save("Password changed for " + student.name);
      } else if (ch === "e") {
        T(M, 52, "controller.enrol()");
        if (student.subjects.length >= 4) { T(C, 35, "count >= 4 → raise EnrolmentLimitError"); io.print("\t\tStudents are allowed to enrol in 4 subjects only.", RED); continue; }
        const used = student.subjects.map((s) => pad_id(s.id));
        const free = []; for (let n = 1; n <= 999; n++) { const p = pad_id(n); if (!used.includes(p)) free.push(p); }
        const id = free[Math.floor(Math.random() * free.length)], mark = randint(25, 100);
        const subj = { id, mark, grade: calculate_grade(mark) };
        T("models/subject.py", 116, `create_new_subject → id "${id}", mark ${mark}, grade ${subj.grade}`);
        student.subjects.push(subj); save(`${student.name} enrolled in ${id}`);
        io.print("\t\tEnrolling in Subject-" + id, YELLOW); count();
      } else if (ch === "r") {
        const sid = await io.input("\t\tRemove Subject by ID: "); if (sid === null) return null;
        const raw = sid.trim(), want = pad_id(raw);
        T(C, 54, `pad_id("${raw}") → "${want}"`);
        let found = null; for (const s of student.subjects) if (s.id === want) found = s;
        if (!found) { T(C, 64, "raise SubjectNotFoundError"); io.print("\t\tSubject " + raw + " does not exist", RED); continue; }
        student.subjects.splice(student.subjects.indexOf(found), 1); save(`${student.name} dropped ${want}`);
        io.print("\t\tDropping Subject-" + raw, YELLOW); count();
      } else if (ch === "s") {
        T(M, 80, "show()");
        io.print("\t\tShowing " + student.subjects.length + " subjects", YELLOW);
        for (const s of student.subjects) io.print("\t\t" + subjectStr(s));
      } else if (ch === "x") { T(M, 44, "break → Student system menu"); return true; }
      else { T(M, 46, "no match"); io.print("\t\tInvalid choice", RED); }
    }
  }

  /* Run with a fixed list of inputs (for test cases / predict mode). */
  async function runScripted(dbJson, inputs) {
    const db = new SimDB(dbJson); const out = []; const trace = []; let i = 0; let cur = "";
    const io = {
      input: async (p) => { if (i >= inputs.length) { out.push({ t: cur + p, c: null }); return null; } const v = inputs[i++]; out.push({ t: p + v, c: null, input: true }); return v; },
      print: (t, c) => out.push({ t, c }), trace: (f, l, n) => trace.push({ f, l, n }), changed: () => {}, end: () => {},
    };
    await runCLI(db, io);
    return { out, trace, db, usedAll: i >= inputs.length };
  }

  window.SIM = { SimDB, runCLI, runScripted, EMAIL, PASSWORD, calculate_grade, pyFloat, pad_id, averageAndGrade, subjectStr };
})();
