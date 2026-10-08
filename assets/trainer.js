// Shared engine for the conjugation trainers; each tense page sets window.TRAINER
(() => {
  const T = window.TRAINER;
  // forms come in the source order: yo, nosotros, tú, vosotros, él, ellos
  const VERBS = T.verbs.map(([inf, ru, en, g, src]) => {
    // endings: the verb gives only its stem and every person adds the shared ending
    const s = T.endings ? [0, 3, 1, 4, 2, 5].map((i) => src + T.endings[i]) : src.split(":");
    const forms = [s[0], s[2], s[4], s[1], s[3], s[5]].map((f) => {
      const sp = f.lastIndexOf(" ");
      return sp > 0 ? { pron: f.slice(0, sp), word: f.slice(sp + 1) } : { pron: "", word: f };
    });
    return { inf, ru, en, g, forms };
  });
  const ALT = T.alt || {};
  const GROUPS = T.groups;
  const GORDER = T.groupOrder;
  // accent keys: only the accented letters that occur in this tense's answers
  const ACC = T.accents;
  // ending shortcuts for persons whose ending is the same for every verb in the tense
  const SUFFIX = T.suffix || {};
  // order of persons inside a verb, and which persons share a stem (persons with the same slot number)
  const ORDER = T.personOrder || [0, 1, 2, 3, 4, 5];
  const SLOT = T.stemSlots || [0, 0, 0, 0, 0, 0];
  // endFirst: the stem is optional, every form starts in the ending field
  // perVerb: one card per verb in a random person, progress kept per verb; a single input field
  const PER_VERB = !!T.perVerb;
  const STEM_FIRST = !T.endFirst && !PER_VERB;
  const PERSONS = ["yo", "tú", "él · ella · usted", "nosotros", "vosotros", "ellos · ustedes"];
  const PSHORT = ["yo", "tú", "él", "nos", "vos", "ell"];
  const HARD = 0.3;
  // translations shown only for languages the browser lists, in its order of preference
  const GLOSS = (navigator.languages || [navigator.language || ""]).map((l) => l.slice(0, 2).toLowerCase())
    .filter((l, i, a) => (l === "ru" || l === "en") && a.indexOf(l) === i);
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const BRAND = `${esc(T.brand.slice(0, -1))}<b>${esc(T.brand.slice(-1))}</b>`;
  document.body.classList.add("on-train");
  document.body.insertAdjacentHTML("afterbegin", `
<div class="wrap" lang="es">
  <header class="top">
    <a class="brand" href="../" aria-label="Todos los tiempos"><span class="arr">←</span><span class="bt">${BRAND}</span></a>
    <nav class="tabs" role="tablist">
      <button id="tab-train" role="tab" aria-selected="true" data-v="train">Practicar</button>
      <button id="tab-verbs" role="tab" aria-selected="false" data-v="verbs">Verbos</button>
      <button id="tab-stats" role="tab" aria-selected="false" data-v="stats">Progreso</button>
    </nav>
  </header>

  <!-- TRAIN -->
  <section id="v-train">
    <div id="train-col" style="gap:10px">
      <div class="card" id="card">
        <div class="head">
          <div>
            <div class="verb" id="verb">decir</div>
            <div class="mean" id="mean"></div>
          </div>
          <button class="gtag" id="gtag" type="button"></button>
        </div>
        <div class="person" id="person">yo</div>
        <div class="field" id="field">
          <span class="pron" id="pron" hidden></span>
          <input id="stem" placeholder="+" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" lang="es" enterkeyhint="go" aria-label="Raíz común">
          <input id="end" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" lang="es" enterkeyhint="go" aria-label="Forma verbal" placeholder="forma">
        </div>
        <div class="hint" id="hint">Campo azul: la raíz común. Escríbela una vez (p. ej., <b>${esc(T.stemExample)}</b>), pulsa Enter o espacio y escribe solo la terminación.</div>
        <div class="fb" id="fb" aria-live="polite"></div>
        <div class="keys" id="keys"></div>
        <div class="acts">
          <button class="btn ghost" id="skip">No lo sé</button>
          <button class="btn primary" id="go">Comprobar</button>
        </div>
      </div>

      <div class="card done" id="done" hidden>
        <h2 id="doneTitle">Listo</h2>
        <p id="doneText"></p>
        <div class="missed" id="doneMissed"></div>
        <div class="row2">
          <button class="btn" id="again">Otra vez</button>
          <button class="btn primary" id="toHard">Difíciles</button>
        </div>
      </div>

      <div class="prog"><div class="bar" title="Formas dominadas"><i id="bar"></i></div><span id="pcount" title="Formas dominadas">0 / 0</span><span>hoy</span><span class="ok-c" id="pok">✓ 0</span><span class="bad-c" id="pbad">✗ 0</span></div>
      <div class="modes" id="modes"></div>
    </div>
  </section>

  <!-- VERBS -->
  <section id="v-verbs" hidden>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="panel">
        <div class="setrow"><label>Orden</label>
          <div class="seg" id="seg-order">
            <button data-o="verb">por verbo</button><button data-o="mix">mezclado</button>
          </div>
        </div>
        <div class="setrow"><label>Forma vosotros</label>
          <div class="seg" id="seg-vos"><button data-v="1">incluir</button><button data-v="0">omitir</button></div>
        </div>
        <div class="setrow"><span class="selcount" id="selcount"></span>
          <span><button class="mini" id="selAll">todos</button> · <button class="mini" id="selNone">ninguno</button></span>
        </div>
      </div>
      <div id="groups" style="display:flex;flex-direction:column;gap:10px"></div>
    </div>
  </section>

  <!-- STATS -->
  <section id="v-stats" hidden>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="tiles">
        <div class="tile"><b id="t-acc">—</b><span>aciertos a la primera</span></div>
        <div class="tile"><b id="t-ans">0</b><span>respuestas, <span id="t-today">0</span> hoy</span></div>
        <div class="tile"><b id="t-hard">0</b><span>formas difíciles</span></div>
      </div>
      <div class="panel">
        <h3>Verbos por persona
          <span class="seg" id="seg-sort"><button data-s="hard">difíciles</button><button data-s="abc">a–z</button></span>
        </h3>
        <div class="legend">
          <span><i class="cell" style="width:12px;height:12px"></i>sin practicar</span>
          <span><i class="c0"></i>dominada</span>
          <span><i class="c1"></i>insegura</span>
          <span><i class="c2"></i>fallo</span>
        </div>
        <div class="grid" id="sgrid"></div>
        <p class="gdesc" style="margin:0">Toca un verbo para practicar solo ese. A la derecha, el porcentaje de errores total.</p>
      </div>
      <button class="btn ghost danger" id="reset">Borrar progreso</button>
      <p class="foot">Todo se guarda solo en este navegador.</p>
    </div>
  </section>
</div>
<span class="measure" id="measure"></span>
<span class="measure" id="measure"></span>
`);

  const VI = Object.fromEntries(VERBS.map((v, i) => [v.inf, i]));

  // ---------- storage ----------
  const LS = `vdb.${T.key}.v1`;
  let db;
  try { db = JSON.parse(localStorage.getItem(LS) || "null"); } catch (e) { db = null; }
  db = Object.assign({ f: {}, sel: null, vos: true, order: "verb", sort: "hard", days: {} }, db || {});
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(db)); } catch (e) {} };
  const selected = () => (db.sel ? db.sel.filter((n) => n in VI) : VERBS.map((v) => v.inf));
  const persons = () => ORDER.filter((p) => db.vos || p !== 4);
  const today = () => new Date().toISOString().slice(0, 10);
  const hardKeys = () => Object.entries(db.f).filter(([k, r]) => r.s >= HARD && (db.vos || !k.endsWith(".4")))
    .sort((a, b) => b[1].s - a[1].s).map(([k]) => k);

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const norm = (s) => s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rec = (k) => (PER_VERB ? k.split(".")[0] : k);
  const randomCard = (inf) => { const ps = persons(); return `${inf}.${ps[Math.floor(Math.random() * ps.length)]}`; };
  const parseKey = (k) => { const [inf, p] = k.split("."); return { v: VERBS[VI[inf]], p: +p }; };

  function diff(a, b) {
    const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const ka = [], kb = []; let i = 0, j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { ka.push([a[i], 0]); kb.push([b[j], 0]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { ka.push([a[i], 1]); i++; }
      else { kb.push([b[j], 1]); j++; }
    }
    while (i < n) ka.push([a[i++], 1]);
    while (j < m) kb.push([b[j++], 1]);
    const paint = (arr, cls) => arr.reduce((h, [c, x]) => h + (x ? `<span class="${cls}">${esc(c)}</span>` : esc(c)), "");
    return { a: paint(ka, "d-bad"), b: paint(kb, "d-miss") };
  }

  // keep the phone keyboard open: act on touchstart/mousedown and cancel the focus change
  function tap(el, fn) {
    let touched = false;
    // touched only swallows the mouse event emulated right after a touch, not a later real click
    el.addEventListener("touchstart", (e) => { e.preventDefault(); touched = true; setTimeout(() => (touched = false), 800); fn(); }, { passive: false });
    el.addEventListener("mousedown", (e) => { e.preventDefault(); if (touched) { touched = false; return; } fn(); });
    el.addEventListener("click", (e) => { if (e.detail === 0) fn(); });
  }

  // ---------- session ----------
  const S = { mode: "all", only: null, queue: [], cur: null, answered: false, okFirst: 0, bad: 0, done: 0, total: 0, missed: new Set(), seenWrong: new Set(), timer: null, stems: {} };
  let lastField = null;

  function buildDeck() {
    const ps = persons();
    if (PER_VERB) {
      const verbs = S.mode === "hard" ? hardKeys().slice(0, 30) : S.mode === "verb" ? [S.only] : selected();
      const seen = (inf) => (db.f[inf] && db.f[inf].t) || 0;
      return shuffle(verbs.slice()).sort((a, b) => seen(a) - seen(b)).map(randomCard);
    }
    if (S.mode === "hard") {
      const keys = hardKeys().slice(0, 30);
      return db.order === "verb" ? groupByVerb(keys) : shuffle(keys);
    }
    const verbs = S.mode === "verb" ? [S.only] : selected();
    // never-practised first, then least recently practised; random among equals
    const seen = (k) => (db.f[k] && db.f[k].t) || 0;
    if (db.order === "verb") {
      const last = (inf) => Math.max(...ps.map((p) => seen(`${inf}.${p}`)));
      return shuffle(verbs.slice()).sort((a, b) => last(a) - last(b)).flatMap((inf) => ps.map((p) => `${inf}.${p}`));
    }
    return shuffle(verbs.flatMap((inf) => ps.map((p) => `${inf}.${p}`))).sort((a, b) => seen(a) - seen(b));
  }
  function groupByVerb(keys) {
    const by = {};
    keys.forEach((k) => (by[k.split(".")[0]] ||= []).push(k));
    const pos = (k) => ORDER.indexOf(+k.split(".")[1]);
    return shuffle(Object.keys(by)).flatMap((inf) => by[inf].sort((a, b) => pos(a) - pos(b)));
  }

  function startSession(mode, only) {
    S.cur = null;
    S.mode = mode; S.only = only || null;
    if (mode !== "verb" && db.mode !== mode) { db.mode = mode; save(); }
    S.queue = buildDeck(); S.total = S.queue.length; S.done = 0; S.okFirst = 0; S.bad = 0;
    S.missed = new Set(); S.seenWrong = new Set();
    renderModes();
    next();
  }

  function next() {
    clearTimeout(S.timer);
    S.answered = false;
    const f = $("field"); f.classList.remove("ok", "bad");
    $("fb").innerHTML = "";
    if (!S.queue.length) return finish();
    $("card").hidden = false; $("done").hidden = true;
    const prev = S.cur && parseKey(S.cur);
    S.cur = S.queue.shift();
    const { v, p } = parseKey(S.cur);
    const form = v.forms[p];
    $("verb").textContent = v.inf;
    renderMean();
    renderGtag();
    $("person").textContent = (T.personPrefix || "") + PERSONS[p];
    $("suf").hidden = !SUFFIX[p]; $("suf").textContent = SUFFIX[p] || "";
    $("suf").setAttribute("aria-label", `insertar ${SUFFIX[p] || ""}`);
    $("pron").hidden = !form.pron; $("pron").textContent = form.pron;
    // stems live only while the same verb continues, one per stem slot; a new verb starts empty
    if (!prev || prev.v !== v) S.stems = {};
    const slotChanged = !prev || prev.v !== v || SLOT[prev.p] !== SLOT[p];
    if (slotChanged) {
      // stemCarry: a slot without its own stem yet starts from the previous slot's stem
      const carried = T.stemCarry && prev && prev.v === v ? S.stems[SLOT[prev.p]] : "";
      $("stem").value = S.stems[SLOT[p]] ?? carried ?? "";
    }
    $("end").value = "";
    sizeStem();
    $("go").textContent = "Comprobar";
    updateGo();
    $("hint").hidden = PER_VERB || !!db.stemUsed;
    renderProgress();
    if (STEM_FIRST && slotChanged && !$("stem").value && S.mode !== "hard") focusStem(); else focusEnd();
  }

  function renderGtag() {
    const g = $("gtag"), on = db.hint !== false;
    g.classList.toggle("off", !on);
    g.textContent = on ? GROUPS[parseKey(S.cur).v.g].name : "?";
    g.setAttribute("aria-label", on ? "Ocultar pista" : "Mostrar pista");
  }

  function focusStem() { const s = $("stem"); s.focus({ preventScroll: true }); s.setSelectionRange(s.value.length, s.value.length); lastField = s; }
  function focusEnd() { const e = $("end"); e.focus({ preventScroll: true }); lastField = e; }

  function check(giveUp) {
    if (S.answered) return next();
    const { v, p } = parseKey(S.cur);
    const form = v.forms[p];
    const stem = $("stem").value.trim();
    let typed = norm(stem + $("end").value.trim());
    if (form.pron && typed.startsWith(form.pron + " ")) typed = typed.slice(form.pron.length + 1);
    // an empty ending is an accidental tap, even with a stem filled in
    if (!giveUp && !$("end").value.trim()) { focusEnd(); return; }
    if (stem) db.stemUsed = true;
    S.stems[SLOT[p]] = stem;

    const accepted = [form.word, ...(ALT[S.cur] || [])].map(norm);
    const ok = !giveUp && accepted.includes(typed);
    S.answered = true;

    const firstTry = !S.seenWrong.has(rec(S.cur));
    const r = db.f[rec(S.cur)] || (db.f[rec(S.cur)] = { a: 0, w: 0, s: 0 });
    r.a++; r.t = Date.now();
    const d = db.days[today()] || (db.days[today()] = { a: 0, w: 0 });
    d.a++;
    if (ok) {
      r.s = r.s * 0.5; if (r.s < 0.02) r.s = 0;
      S.done++; if (firstTry) S.okFirst++;
      $("field").classList.add("ok");
      $("fb").innerHTML = `<span class="good">✓ ${esc((form.pron ? form.pron + " " : "") + form.word)}</span>`;
      $("go").textContent = "Siguiente"; updateGo();
      S.timer = setTimeout(next, 750);
    } else {
      r.w++; r.s = Math.min(r.s + 1, 5); d.w++;
      S.bad++; S.seenWrong.add(rec(S.cur)); S.missed.add(S.cur);
      // perVerb: the verb comes back in another random person
      S.queue.splice(requeueAt(v.inf), 0, PER_VERB ? randomCard(v.inf) : S.cur);
      $("field").classList.add("bad");
      const pr = form.pron ? esc(form.pron) + " " : "";
      if (typed) {
        const dd = diff(typed, form.word);
        $("fb").innerHTML = `<div><span class="lbl">tú</span><span class="w">${pr}${dd.a}</span></div><div><span class="lbl">correcto</span><span class="w">${pr}${dd.b}</span></div>`;
      } else {
        $("fb").innerHTML = `<div><span class="lbl">correcto</span><span class="w"><span class="d-miss">${pr}${esc(form.word)}</span></span></div>`;
      }
      $("go").textContent = "Siguiente"; updateGo();
    }
    save();
    renderProgress(); renderModes();
  }

  // grouped by verb: a missed form comes back at the end of the verb's block,
  // so the next verb starts only after all its forms are right
  function requeueAt(inf) {
    if (PER_VERB || (db.order !== "verb" && S.mode !== "verb")) return Math.min(3, S.queue.length);
    let n = 0;
    while (n < S.queue.length && S.queue[n].split(".")[0] === inf) n++;
    return n;
  }

  function finish() {
    $("card").hidden = true; $("done").hidden = false;
    const n = S.total;
    $("doneTitle").textContent = S.bad ? "Ronda terminada" : "Sin errores";
    $("doneText").textContent = n ? `A la primera: ${S.okFirst} de ${n}.` + (S.missed.size ? " Fallaste en:" : "")
      : (S.mode === "hard" ? "No hay formas difíciles. Practica primero los verbos seleccionados." : "No hay verbos seleccionados. Márcalos en la pestaña «Verbos».");
    $("doneMissed").innerHTML = [...S.missed].map((k) => { const { v, p } = parseKey(k); const f = v.forms[p];
      return `<span>${esc((f.pron ? f.pron + " " : "") + f.word)} <em>${esc(v.inf)}, ${PSHORT[p] === "ell" ? "ellos" : PSHORT[p]}</em></span>`; }).join("");
    $("toHard").disabled = !hardKeys().length;
    renderProgress();
    $("end").blur();
  }

  // ---------- render ----------
  // overall: forms of the selected verbs that are answered and not shaky; plus today's answers
  function renderProgress() {
    const keys = PER_VERB ? selected() : selected().flatMap((inf) => persons().map((p) => `${inf}.${p}`));
    const known = keys.filter((k) => level(db.f[k]) === "c0").length;
    $("bar").style.width = (keys.length ? (known / keys.length) * 100 : 0) + "%";
    $("pcount").textContent = `${known} / ${keys.length}`;
    const d = db.days[today()] || { a: 0, w: 0 };
    $("pok").textContent = `✓ ${d.a - d.w}`;
    $("pbad").textContent = `✗ ${d.w}`;
  }

  function renderModes() {
    const h = hardKeys().length;
    const parts = [
      `<button class="pill" data-m="all" aria-pressed="${S.mode === "all"}">Seleccionados <span class="n">${selected().length}</span></button>`,
      `<button class="pill hard" data-m="hard" aria-pressed="${S.mode === "hard"}" ${h || S.mode === "hard" ? "" : "disabled"}>Difíciles <span class="n">${h}</span></button>`,
    ];
    if (S.mode === "verb") parts.push(`<button class="pill" data-m="all" aria-pressed="true" aria-label="Volver a todos">${esc(S.only)} <span class="x">×</span></button>`);
    $("modes").innerHTML = parts.join("");
  }
  $("modes").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-m]"); if (!b || b.disabled) return;
    startSession(b.dataset.m);
  });

  function sizeStem() {
    const s = $("stem"), m = $("measure");
    m.textContent = s.value || "+";
    s.style.width = Math.max(m.offsetWidth + 16, s.value ? 0 : 44) + "px";
  }

  $("keys").innerHTML = ACC.map((c) => `<button class="key" type="button" aria-label="insertar ${c}">${c}</button>`).join("")
    + `<button class="key suf" id="suf" type="button" hidden></button>`;
  [...$("keys").children].forEach((b, i) => tap(b, () => insert(ACC[i] ?? b.textContent, b)));
  function updateGo() { $("go").classList.toggle("idle", !S.answered && !$("end").value.trim()); }

  function insert(ch, btn) {
    if (S.answered) return;
    const el = lastField && document.body.contains(lastField) ? lastField : $("end");
    const st = el.selectionStart ?? el.value.length, en = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, st) + ch + el.value.slice(en);
    el.focus({ preventScroll: true });
    el.setSelectionRange(st + ch.length, st + ch.length);
    if (el.id === "stem") sizeStem();
    updateGo();
    btn.classList.add("flash"); setTimeout(() => btn.classList.remove("flash"), 120);
  }

  ["stem", "end"].forEach((id) => {
    const el = $(id);
    el.addEventListener("focus", () => (lastField = el));
    el.addEventListener("input", updateGo);
    el.addEventListener("beforeinput", (e) => { if (S.answered && e.inputType !== "insertLineBreak") e.preventDefault(); });
    el.addEventListener("keydown", (e) => {
      // from the stem, Enter/space jumps to the ending while the ending is still empty
      if (id === "stem" && !S.answered && (e.key === "Enter" || e.key === " ") && !$("end").value.trim()) { e.preventDefault(); return focusEnd(); }
      // Backspace in an empty ending goes back to the stem
      if (id === "end" && !PER_VERB && !S.answered && (e.key === "Backspace" || e.keyCode === 8) && !el.value) { e.preventDefault(); return focusStem(); }
      if (e.key === "Enter") { e.preventDefault(); check(false); }
    });
  });
  function renderMean() {
    const m = $("mean"), on = db.meaning !== false;
    const v = parseKey(S.cur).v;
    m.hidden = !GLOSS.length || !on;
    $("verb").classList.toggle("tg", GLOSS.length > 0);
    m.innerHTML = GLOSS.map((l) => `<span lang="${l}">${esc(l === "ru" ? v.ru : v.en)}</span>`).join(" · ");
  }
  const toggleMean = () => { if (!S.cur || !GLOSS.length) return; db.meaning = db.meaning === false; save(); renderMean(); };
  tap($("verb"), toggleMean);
  tap($("mean"), toggleMean);
  tap($("gtag"), () => { if (!S.cur) return; db.hint = db.hint === false; save(); renderGtag(); });
  $("stem").addEventListener("input", () => {
    const st = $("stem");
    // Android keyboards don't report space in keydown, so catch it here
    if (st.value.endsWith(" ")) { st.value = st.value.trimEnd(); sizeStem(); return focusEnd(); }
    sizeStem();
  });
  tap($("go"), () => check(false));
  tap($("skip"), () => { if (!S.answered) check(true); else next(); });
  $("again").addEventListener("click", () => { startSession(S.mode, S.only); });
  $("toHard").addEventListener("click", () => startSession("hard"));

  // ---------- tabs ----------
  let dirty = false;
  function show(view) {
    document.body.classList.toggle("on-train", view === "train");
    ["train", "verbs", "stats"].forEach((v) => {
      $("v-" + v).hidden = v !== view;
      $("tab-" + v).setAttribute("aria-selected", v === view);
    });
    if (view === "verbs") renderVerbs();
    if (view === "stats") renderStats();
    if (view === "train") {
      if (dirty && S.mode === "all") { dirty = false; startSession("all"); }
      else { renderModes(); if ($("done").hidden) focusEnd(); }
    }
  }
  document.querySelector(".tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(b.dataset.v); });

  // ---------- verbs view ----------
  function renderVerbs() {
    const sel = new Set(selected());
    $("selcount").textContent = `${sel.size} de ${VERBS.length} seleccionados`;
    $("groups").innerHTML = GORDER.map((g) => {
      const vs = VERBS.filter((v) => v.g === g);
      const all = vs.every((v) => sel.has(v.inf));
      return `<div class="panel"><h3>${GROUPS[g].name} <button class="mini" data-g="${g}">${all ? "ninguno" : "todos"}</button></h3>
        <p class="gdesc">${GROUPS[g].desc}</p>
        <div class="chips">${vs.map((v) => `<button class="chip" data-v="${v.inf}" aria-pressed="${sel.has(v.inf)}">${v.inf}</button>`).join("")}</div></div>`;
    }).join("");
    [...$("seg-order").children].forEach((b) => b.setAttribute("aria-pressed", b.dataset.o === db.order));
    [...$("seg-vos").children].forEach((b) => b.setAttribute("aria-pressed", (b.dataset.v === "1") === db.vos));
  }
  function setSel(set) { db.sel = VERBS.map((v) => v.inf).filter((n) => set.has(n)); dirty = true; save(); renderVerbs(); }
  $("groups").addEventListener("click", (e) => {
    const sel = new Set(selected());
    const c = e.target.closest(".chip");
    if (c) { sel.has(c.dataset.v) ? sel.delete(c.dataset.v) : sel.add(c.dataset.v); return setSel(sel); }
    const g = e.target.closest("[data-g]");
    if (g) {
      const vs = VERBS.filter((v) => v.g === g.dataset.g).map((v) => v.inf);
      const all = vs.every((n) => sel.has(n));
      vs.forEach((n) => (all ? sel.delete(n) : sel.add(n)));
      setSel(sel);
    }
  });
  $("selAll").addEventListener("click", () => setSel(new Set(VERBS.map((v) => v.inf))));
  $("selNone").addEventListener("click", () => setSel(new Set()));
  $("seg-order").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; db.order = b.dataset.o; dirty = true; save(); renderVerbs(); });
  $("seg-vos").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; db.vos = b.dataset.v === "1"; dirty = true; save(); renderVerbs(); });

  // ---------- stats view ----------
  function level(r) { if (!r) return ""; return r.s >= 0.6 ? "c2" : r.s >= 0.15 ? "c1" : "c0"; }
  function renderStats() {
    let a = 0, w = 0;
    Object.values(db.f).forEach((r) => { a += r.a; w += r.w; });
    // accuracy = share of answers that were right
    $("t-acc").textContent = a ? Math.round(((a - w) / a) * 100) + "%" : "—";
    $("t-ans").textContent = a;
    $("t-today").textContent = (db.days[today()] || { a: 0 }).a;
    $("t-hard").textContent = hardKeys().length;
    [...$("seg-sort").children].forEach((b) => b.setAttribute("aria-pressed", b.dataset.s === db.sort));

    const rows = VERBS.map((v) => {
      const rs = PER_VERB ? [db.f[v.inf]] : [0, 1, 2, 3, 4, 5].map((p) => db.f[`${v.inf}.${p}`]);
      const sa = rs.reduce((x, r) => x + (r ? r.a : 0), 0), sw = rs.reduce((x, r) => x + (r ? r.w : 0), 0);
      const score = rs.reduce((x, r) => x + (r ? r.s : 0), 0);
      return { v, rs, sa, sw, score };
    });
    if (db.sort === "hard") rows.sort((x, y) => y.score - x.score || (y.sa ? y.sw / y.sa : 0) - (x.sa ? x.sw / x.sa : 0) || x.v.inf.localeCompare(y.v.inf));
    $("sgrid").innerHTML =
      `<div class="srow hdr"><span>verbo</span>${(PER_VERB ? [""] : PSHORT).map((p, i) => `<span class="hc"${!db.vos && i === 4 ? ' style="opacity:.4"' : ""}>${p}</span>`).join("")}<span class="pc">err.</span></div>` +
      rows.map(({ v, rs, sa, sw }) => `<button class="srow" data-v="${v.inf}"><span class="nm">${v.inf}</span>${rs.map((r, p) =>
        `<span class="cell ${level(r)}" title="${PER_VERB ? "" : PERSONS[p] + ": "}${r ? `${r.a} resp., ${r.w} err.` : "sin practicar"}"></span>`).join("")}<span class="pc">${sa ? Math.round((sw / sa) * 100) + "%" : "—"}</span></button>`).join("");
  }
  $("seg-sort").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; db.sort = b.dataset.s; save(); renderStats(); });
  $("sgrid").addEventListener("click", (e) => { const r = e.target.closest(".srow[data-v]"); if (!r) return; show("train"); startSession("verb", r.dataset.v); });
  let resetArmed = null;
  $("reset").addEventListener("click", () => {
    const b = $("reset");
    if (!resetArmed) { b.textContent = "¿Seguro? Toca otra vez"; resetArmed = setTimeout(() => { resetArmed = null; b.textContent = "Borrar progreso"; }, 3500); return; }
    clearTimeout(resetArmed); resetArmed = null;
    db.f = {}; db.days = {}; save(); b.textContent = "Progreso borrado";
    setTimeout(() => (b.textContent = "Borrar progreso"), 2000);
    renderStats(); renderModes();
  });

  if (PER_VERB) {
    document.body.classList.add("per-verb");
    $("seg-order").closest(".setrow").hidden = true;
    $("sgrid").closest(".panel").querySelector("h3").firstChild.textContent = "Verbos ";
    $("t-hard").nextElementSibling.textContent = "verbos difíciles";
    $("bar").parentNode.title = $("pcount").title = "Verbos dominados";
  }
  startSession(db.mode === "hard" && hardKeys().length ? "hard" : "all");
})();
