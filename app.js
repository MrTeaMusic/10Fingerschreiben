/* Tastenpfad – App-Logik */
(() => {
const C = window.TP_CONTENT;
const $ = (s) => document.querySelector(s);
const de = (n, d = 0) => Number(n).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uniq = (a) => [...new Set(a)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Finger und Tastatur ---------- */
const FINGERS = { lp: 'Linker kleiner Finger', lr: 'Linker Ringfinger', lm: 'Linker Mittelfinger', li: 'Linker Zeigefinger', th: 'Daumen', ri: 'Rechter Zeigefinger', rm: 'Rechter Mittelfinger', rr: 'Rechter Ringfinger', rp: 'Rechter kleiner Finger' };
const FINGER_OF = {};
const assign = (f, chars) => { for (const c of chars) FINGER_OF[c] = f; };
assign('lp', '^1qa<y'); assign('lr', '2wsx'); assign('lm', '3edc'); assign('li', '45rtfgvb');
assign('ri', '67zuhjnm'); assign('rm', '8ik,'); assign('rr', '9ol.'); assign('rp', '0ß´pü+öä#-');
const HOME = { lp: 'a', lr: 's', lm: 'd', li: 'f', ri: 'j', rm: 'k', rr: 'l', rp: 'ö', th: ' ' };
const LEFT = new Set(['lp', 'lr', 'lm', 'li']);

const K = (base, shift) => ({ id: base, base, shift, w: 1 });
const S = (id, label, w, finger) => ({ id, label, w, finger, special: true });
const letterKeys = (s) => s.split('').map((c) => K(c, c.toUpperCase()));
const ROWS = [
  [K('^', '°'), K('1', '!'), K('2', '"'), K('3', '§'), K('4', '$'), K('5', '%'), K('6', '&'), K('7', '/'), K('8', '('), K('9', ')'), K('0', '='), K('ß', '?'), K('´', '`'), S('Backspace', '⌫', 2, 'rp')],
  [S('Tab', '⇥', 1.5, 'lp'), ...letterKeys('qwertzuiopü'), K('+', '*'), S('Enter', '↵', 1.5, 'rp')],
  [S('Caps', '⇪', 1.75, 'lp'), ...letterKeys('asdfghjklöä'), K('#', "'"), S('Enter2', '', 1.25, 'rp')],
  [S('ShiftL', '⇧', 1.25, 'lp'), K('<', '>'), ...letterKeys('yxcvbnm'), K(',', ';'), K('.', ':'), K('-', '_'), S('ShiftR', '⇧', 2.75, 'rp')],
  [S('c1', 'ctrl', 1.5, 'mod'), S('c2', '⌥', 1.25, 'mod'), S('c3', '⌘', 1.5, 'mod'), S('Space', 'Leertaste', 6.5, 'th'), S('c4', '⌘', 1.5, 'mod'), S('c5', '⌥', 1.25, 'mod'), S('c6', 'ctrl', 1.5, 'mod')],
];
const CHAR = {};
ROWS.flat().forEach((k) => {
  if (k.special) return;
  const f = FINGER_OF[k.base];
  CHAR[k.base] = { id: k.id, shift: false, finger: f };
  if (k.shift) CHAR[k.shift] = { id: k.id, shift: true, finger: f };
});
CHAR[' '] = { id: 'Space', shift: false, finger: 'th' };
const isLetter = (c) => /[a-zäöüß]/.test(c);
const LEFT_LETTERS = new Set('qwertasdfgyxcvb'.split(''));
const RIGHT_LETTERS = new Set('zuiopühjklöänm'.split('').concat('ß'));

function renderKeyboard(container, opts = {}) {
  const kb = document.createElement('div');
  kb.className = 'kb' + (opts.mini ? ' mini' : '') + (opts.heat ? ' heat' : '');
  const els = {};
  for (const row of ROWS) {
    const r = document.createElement('div'); r.className = 'r';
    for (const k of row) {
      const el = document.createElement('div');
      const f = k.special ? k.finger : FINGER_OF[k.base];
      el.className = 'k f-' + f + (k.special ? ' sp' : '') + (k.base === 'f' || k.base === 'j' ? ' bump' : '');
      el.style.flexGrow = k.w;
      if (k.special) el.textContent = opts.mini && k.id === 'Space' ? '' : k.label;
      else if (/[a-zäöü]/.test(k.base)) el.textContent = k.shift;
      else el.innerHTML = `<span class="s">${esc(k.shift)}</span><span>${esc(k.base)}</span>`;
      if (opts.heat && !k.special) {
        const h = opts.heat(k.base);
        if (h != null) { el.style.setProperty('--heat', Math.round(h * 100) + '%'); el.title = `${k.shift}: ${de(h * 100)} % Fehler`; }
      }
      (els[k.id] ||= []).push(el);
      r.append(el);
    }
    kb.append(r);
  }
  container.innerHTML = ''; container.append(kb);
  return els;
}

/* ---------- Wortschatz ---------- */
const wordsOf = (s) => s.match(/[A-Za-zÄÖÜäöüß]+/g) || [];
const ALL_SENTENCES = uniq([...C.SENTENCES, ...C.THEMES.flatMap((t) => t.sentences)]);
const ALL_WORDS = uniq([
  ...C.BASE, ...C.FREQ, ...C.THEMES.flatMap((t) => t.words),
  ...ALL_SENTENCES.flatMap(wordsOf), ...C.TEXTS.flatMap(([, t]) => wordsOf(t)),
].filter((w) => w.length > 1 || /^[a-z]$/.test(w)));

const scopeKey = (scope) => [...scope.set].sort().join('') + (scope.shift ? '^' : '');
function fitWord(w, scope) {
  const v = scope.shift ? w : w.toLowerCase();
  for (const c of v) {
    const lc = c.toLowerCase();
    if (c !== lc) { if (!scope.shift || !scope.set.has(lc)) return null; }
    else if (!scope.set.has(c)) return null;
  }
  return v;
}
const poolCache = {};
function poolFor(scope) {
  const k = scopeKey(scope);
  return (poolCache[k] ||= uniq(ALL_WORDS.map((w) => fitWord(w, scope)).filter(Boolean)));
}
function fitsText(s, scope) {
  for (const c of s) {
    if (c === ' ') continue;
    const lc = c.toLowerCase();
    if (c !== lc) { if (!scope.shift || !scope.set.has(lc)) return false; }
    else if (!scope.set.has(c)) return false;
  }
  return true;
}

/* ---------- Textgenerator ---------- */
function drillFor(k) {
  const h = HOME[CHAR[k]?.finger] || 'f';
  if (h === k || h === ' ') return [k + k + k, k + k, k + k + k];
  return [k + k + k, h + k + h, k + h + k, h + h + k];
}
const APOS = ["geht's", "gibt's", "wie geht's", "hat's", "klappt's", "war's", "ist's"];
function genText(o) {
  const scope = o.scope;
  const parts = [];
  const letters = [...scope.set].filter(isLetter);
  const digits = [...scope.set].filter((c) => /\d/.test(c));
  const focusL = (o.focus || []).filter(isLetter);
  const focusD = (o.focus || []).filter((c) => /\d/.test(c));
  const deco = (o.deco || []).filter((c) => scope.set.has(c));
  const bgDeco = [',', '.', '-', '?', '!'].filter((c) => scope.set.has(c));
  const len = o.len || 180;

  for (const k of o.drill || []) parts.push(...drillFor(k));
  if ((o.drill || []).length > 1) for (let i = 0; i < 3; i++) parts.push(shuffle(o.drill.concat(o.drill)).slice(0, 3).join(''));
  for (const cl of o.clusters || []) parts.push(cl, cl, cl);
  if (o.capsDrill) for (const c of shuffle(o.capsDrill).slice(0, 6)) parts.push(c.toUpperCase() + c);

  const pool = o.pool ? uniq(o.pool.map((w) => fitWord(w, scope)).filter(Boolean)) : poolFor(scope);
  let fpool = o.filter ? pool.filter(o.filter) : focusL.length ? pool.filter((w) => [...w.toLowerCase()].some((c) => focusL.includes(c))) : pool;
  if (o.filter && fpool.length === 0 && !o.pseudoOnly) fpool = pool.filter((w) => [...w.toLowerCase()].some((c) => focusL.includes(c)));
  const useReal = !o.pseudoOnly && pool.length >= 8;
  const share = o.share ?? 0.7;
  const pseudoSrc = o.pseudoLetters || letters;
  const pseudo = () => {
    const n = 2 + rnd(4); let s = '';
    for (let i = 0; i < n; i++) s += (focusL.length && Math.random() < 0.5) ? pick(focusL) : pick(pseudoSrc);
    return s;
  };
  const num = (min = 1, max = 3) => { const src = focusD.length ? focusD : digits.length ? digits : ['1']; let s = ''; const n = min + rnd(max - min + 1); for (let i = 0; i < n; i++) s += pick(src); return s.length > 1 && s[0] === '0' ? '1' + s.slice(1) : s; };
  const word = () => {
    if (!useReal) return pseudo();
    return (fpool.length && Math.random() < share) ? pick(fpool) : pick(pool);
  };
  const apply = (p, w) => {
    switch (p) {
      case '-': return w + '-' + word();
      case '"': return '"' + w + '"';
      case "'": { const a = APOS.filter((x) => fitsText(x, scope)); return a.length ? pick(a) : w + "'"; }
      case '§': return '§ ' + num(1, 3);
      case '$': return num(1, 3) + '$';
      case '%': return num(1, 2) + '%';
      case '&': return w + ' & ' + word();
      case '/': return w + '/' + word();
      case '(': case ')': return '(' + w + ')';
      case '=': return num(1, 2) + '=' + num(1, 2);
      case '*': return num(1, 2) + '*' + num(1, 2);
      case '+': return num(1, 2) + '+' + num(1, 2);
      case '#': return '#' + w;
      case '<': return num(1, 2) + '<' + num(1, 2);
      case '>': return num(1, 2) + '>' + num(1, 2);
      case '_': return w + '_' + word();
      default: return /\d/.test(p) ? num() + ' ' + w : w + p;
    }
  };

  let total = parts.join(' ').length, prev = '';
  let guard = 0;
  while (total < len && guard++ < 2000) {
    let w;
    if (o.numbers) w = num(1, 4);
    else if (o.custom && Math.random() < (o.customShare ?? 0.6)) w = o.custom();
    else {
      w = word();
      if (w === prev && pool.length > 3) continue;
      prev = w;
      if (focusD.length && !o.numbers && Math.random() < 0.4) w = num() + ' ' + w;
      else if (deco.length && Math.random() < (o.decoRate ?? 0.4)) w = apply(pick(deco), w);
      else if (!o.noBg && bgDeco.length && Math.random() < 0.1) w = apply(pick(bgDeco), w);
      else if (!o.noBg && digits.length && !focusD.length && Math.random() < 0.04) w = num() + ' ' + w;
    }
    parts.push(w); total += w.length + 1;
  }
  if (scope.shift) for (let i = 1; i < parts.length; i++) if (/[A-Za-zÄÖÜäöüß][.?!]$/.test(parts[i - 1])) parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}
function sentencesText(list, len, scope) {
  const src = shuffle(scope ? list.filter((s) => fitsText(s, scope)) : list);
  const out = []; let t = 0;
  for (const s of src) { out.push(s); t += s.length + 1; if (t >= len) break; }
  while (t < len && src.length) { const s = pick(src); out.push(s); t += s.length + 1; }
  return out.join(' ');
}

/* ---------- Lehrplan ---------- */
const CHAPTERS = [];
const LESSONS = [];
let scope = { set: new Set([' ']), shift: false };
const snap = () => ({ set: new Set(scope.set), shift: scope.shift });
const unlock = (chars) => { for (const c of chars) scope.set.add(c); };
let chapter = null;
const usedIds = new Set();
function lessonId(ck, title, kind) {
  const base = (ck + '-' + title + '-' + kind).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  let id = base, n = 2; while (usedIds.has(id)) id = base + '-' + n++;
  usedIds.add(id); return id;
}
function addChapter(key, title, blurb) { chapter = { key, title, blurb, lessons: [] }; CHAPTERS.push(chapter); }
function add(title, kind, gen, opts = {}) {
  const L = { id: lessonId(chapter.key, title, kind), chapter, title, kind, gen, target: opts.target || 60, minAcc: opts.minAcc || 90, blind: !!opts.blind, time: opts.time || 0, keys: opts.keys || '', note: opts.note || '' };
  L.idx = LESSONS.length; LESSONS.push(L); chapter.lessons.push(L);
  return L;
}
const keyTitle = (keys) => { const u = [...keys].map((c) => ({ ',': 'Komma', '.': 'Punkt', '-': 'Bindestrich', 'ß': 'ß' }[c] || c.toUpperCase())); return u.length === 1 ? u[0] : u.slice(0, -1).join(', ') + ' und ' + u[u.length - 1]; };

let recentKeys = [];
let stageCount = 0;
function letterStage(keys, base) {
  unlock(keys);
  const sc = snap(); const k = [...keys]; const t = keyTitle(keys);
  const deco = k.filter((c) => !isLetter(c));
  const fl = k.filter(isLetter);
  add(t, 'Einführung', () => genText({ scope: sc, focus: k, drill: k, len: 110, pseudoOnly: true }), { target: base, keys });
  add(t, 'Kombinationen', () => genText({ scope: sc, focus: k, pseudoOnly: true, len: 150, deco }), { target: base, keys });
  add(t, 'Wörter', () => genText({ scope: sc, focus: fl.length ? fl : k, share: 0.85, len: 170, deco }), { target: base + 5, keys });
  add(t, 'Genauigkeit', () => genText({ scope: sc, focus: k, share: 0.6, len: 150, deco }), { target: base, minAcc: 96, keys, note: 'Bestanden ab 96 % Genauigkeit' });
  add(t, 'Blind', () => genText({ scope: sc, focus: k, share: 0.6, len: 170, deco, decoRate: 0.2 }), { target: base, blind: true, keys, note: 'Ohne Tastatur-Anzeige' });
  // Wiederholungen: neue Tasten zusammen mit den zuletzt gelernten
  recentKeys = recentKeys.concat(k).slice(-8);
  const rk = recentKeys.slice();
  stageCount++;
  if (stageCount > 1) {
    add(`Wiederholung bis ${t}`, 'Wiederholung', () => genText({ scope: sc, focus: rk, share: 0.55, len: 200, deco, decoRate: 0.15 }), { target: base + 5, keys: rk.filter(isLetter).join('') });
    if (stageCount % 2 === 0) add(`Wiederholung bis ${t}`, 'Tempo', () => genText({ scope: sc, focus: rk, share: 0.4, len: 190, deco, decoRate: 0.15 }), { target: Math.round(base * 1.25), keys: rk.filter(isLetter).join(''), note: 'Höheres Tempoziel' });
  }
}
function chapterReview(name, base, leftRight = true) {
  const sc = snap();
  const ls = [...sc.set].filter(isLetter);
  add(`Wiederholung ${name}`, 'Gemischt', () => genText({ scope: sc, focus: ls, share: 0.3, len: 200 }), { target: base });
  if (leftRight) {
    add(`Wiederholung ${name}`, 'Linke Hand', () => genText({ scope: sc, focus: ls.filter((c) => LEFT_LETTERS.has(c)), share: 0.85, len: 200 }), { target: base });
    add(`Wiederholung ${name}`, 'Rechte Hand', () => genText({ scope: sc, focus: ls.filter((c) => RIGHT_LETTERS.has(c)), share: 0.85, len: 200 }), { target: base });
  }
  add(`Wiederholung ${name}`, 'Genauigkeit', () => genText({ scope: sc, focus: ls, share: 0.3, len: 180 }), { target: base, minAcc: 96, note: 'Bestanden ab 96 % Genauigkeit' });
  add(`Wiederholung ${name}`, 'Tempo', () => genText({ scope: sc, focus: ls, share: 0.3, len: 200 }), { target: Math.round(base * 1.25), note: 'Höheres Tempoziel' });
  add(`Wiederholung ${name}`, 'Blind', () => genText({ scope: sc, focus: ls, share: 0.3, len: 200 }), { target: base, blind: true, note: 'Ohne Tastatur-Anzeige' });
  add(`Kapiteltest ${name}`, 'Test', () => genText({ scope: sc, focus: ls, share: 0.3, len: 300 }), { target: base + 5, minAcc: 94, note: 'Bestanden ab 94 % Genauigkeit' });
}

// 1–3: Buchstaben
addChapter('grund', 'Grundreihe', 'Die acht Grundtasten und G, H. Hier entsteht die Orientierung.');
[['fj', 30], ['dk', 34], ['sl', 38], ['aö', 42], ['gh', 46]].forEach(([k, b]) => letterStage(k, b));
chapterReview('Grundreihe', 50);
addChapter('oben', 'Obere Reihe', 'Von der Grundreihe nach oben greifen und zurück.');
[['ei', 50], ['ru', 54], ['tz', 57], ['wo', 60], ['qp', 62], ['üä', 64]].forEach(([k, b]) => letterStage(k, b));
chapterReview('obere Reihe', 68);
addChapter('unten', 'Untere Reihe', 'Die letzten Buchstaben, Komma, Punkt, ß und Bindestrich.');
[['nm', 66], ['vb', 68], ['c,', 70], ['xy.', 72], ['ß-', 74]].forEach(([k, b]) => letterStage(k, b));
chapterReview('alle Buchstaben', 80);

// 4: Großschreibung
addChapter('gross', 'Großschreibung', 'Umschalttaste immer mit dem kleinen Finger der anderen Hand.');
scope.shift = true;
{
  const sc = snap();
  const capL = [...LEFT_LETTERS], capR = [...RIGHT_LETTERS].filter((c) => c !== 'ß');
  const startsWith = (set) => (w) => /^[A-ZÄÖÜ]/.test(w) && set.has(w[0].toLowerCase());
  add('Großbuchstaben links', 'Umschalt rechts', () => genText({ scope: sc, capsDrill: capL, filter: startsWith(LEFT_LETTERS), share: 0.9, len: 170 }), { target: 70, keys: '⇧' });
  add('Großbuchstaben rechts', 'Umschalt links', () => genText({ scope: sc, capsDrill: capR, filter: startsWith(RIGHT_LETTERS), share: 0.9, len: 170 }), { target: 70, keys: '⇧' });
  add('Ä, Ö und Ü groß', 'Umlaute', () => genText({ scope: sc, capsDrill: ['ä', 'ö', 'ü'], filter: (w) => /^[ÄÖÜ]/.test(w), share: 0.6, len: 150 }), { target: 65, keys: 'ÄÖÜ' });
  add('Nomen', 'Wörter', () => genText({ scope: sc, filter: (w) => /^[A-ZÄÖÜ]/.test(w), share: 0.9, len: 190 }), { target: 75 });
  add('Groß und klein', 'Gemischt', () => genText({ scope: sc, share: 0.5, filter: (w) => /^[A-ZÄÖÜ]/.test(w), len: 200 }), { target: 78 });
  add('Satzanfänge', 'Sätze', () => sentencesText(ALL_SENTENCES, 220, sc), { target: 80 });
  add('Großschreibung', 'Genauigkeit', () => genText({ scope: sc, share: 0.6, filter: (w) => /^[A-ZÄÖÜ]/.test(w), len: 160 }), { target: 72, minAcc: 96, note: 'Bestanden ab 96 % Genauigkeit' });
  add('Großschreibung', 'Tempo', () => genText({ scope: sc, share: 0.5, filter: (w) => /^[A-ZÄÖÜ]/.test(w), len: 180 }), { target: 95 });
  add('Großschreibung', 'Blind', () => sentencesText(ALL_SENTENCES, 220, sc), { target: 80, blind: true });
  add('Kapiteltest Großschreibung', 'Test', () => sentencesText(ALL_SENTENCES, 300, sc), { target: 85, minAcc: 94 });
}

// 5: Satzzeichen
addChapter('zeichen', 'Satzzeichen', 'Fragezeichen, Ausrufezeichen, Doppelpunkt, Semikolon und Anführungszeichen.');
{
  const stage = (keys, title, sentenceList, base) => {
    unlock(keys);
    const sc = snap(); const k = [...keys];
    add(title, 'Einführung', () => genText({ scope: sc, drill: k, focus: k, deco: k, decoRate: 0.6, len: 140 }), { target: base, keys });
    add(title, 'Wörter', () => genText({ scope: sc, deco: k, decoRate: 0.5, share: 0.3, len: 180 }), { target: base + 5, keys });
    if (sentenceList) add(title, 'Sätze', () => sentencesText(sentenceList, 220, sc), { target: base + 10, keys });
    add(title, 'Blind', () => genText({ scope: sc, deco: k, decoRate: 0.4, share: 0.3, len: 180 }), { target: base, blind: true, keys });
  };
  stage('?', 'Fragezeichen', C.QUESTIONS, 75);
  stage('!', 'Ausrufezeichen', C.EXCLAIMS, 75);
  stage(':', 'Doppelpunkt', ALL_SENTENCES.filter((s) => s.includes(':')).concat(C.TEXTS.flatMap(([, t]) => t.split(/(?<=[.!?])\s+/)).filter((s) => s.includes(':'))), 78);
  stage(';', 'Semikolon', null, 75);
  stage('"', 'Anführungszeichen', null, 72);
  stage("'", 'Apostroph', null, 72);
  const sc = snap();
  add('Komma und Punkt', 'Sätze', () => sentencesText(ALL_SENTENCES.filter((s) => s.includes(',')), 240, sc), { target: 85 });
  add('Bindestrich-Wörter', 'Wörter', () => genText({ scope: sc, deco: ['-'], decoRate: 0.6, share: 0.3, len: 200 }), { target: 82 });
  add('Fragen und Ausrufe', 'Sätze', () => sentencesText(C.QUESTIONS.concat(C.EXCLAIMS), 240, sc), { target: 88 });
  add('Alle Satzzeichen', 'Gemischt', () => genText({ scope: sc, deco: [',', '.', '?', '!', ':', ';', '"', '-'], decoRate: 0.45, share: 0.3, len: 220 }), { target: 85 });
  add('Kapiteltest Satzzeichen', 'Test', () => sentencesText(ALL_SENTENCES, 300, sc), { target: 90, minAcc: 94 });
}

// 6: Zahlen
addChapter('zahlen', 'Zahlen', 'Die Zahlenreihe mit festen Fingern, danach Datum, Uhrzeit und Preise.');
{
  const stage = (keys, base) => {
    unlock(keys);
    const sc = snap(); const k = [...keys]; const t = 'Zahlen ' + k.join(', ').replace(/, (\d)$/, ' und $1');
    add(t, 'Einführung', () => genText({ scope: sc, drill: k, focus: k, numbers: true, len: 130 }), { target: base, keys });
    add(t, 'Zahlenreihen', () => genText({ scope: sc, focus: k, numbers: true, len: 160 }), { target: base, keys });
    add(t, 'Zahlen und Wörter', () => genText({ scope: sc, focus: k, share: 0.3, len: 180 }), { target: base + 10, keys });
    add(t, 'Blind', () => genText({ scope: sc, focus: k, share: 0.3, len: 170 }), { target: base, blind: true, keys });
  };
  stage('123', 50); stage('456', 52); stage('789', 54); stage('0', 56);
  const sc = snap();
  const two = (n) => String(n).padStart(2, '0');
  const cities = ['Berlin', 'Hamburg', 'München', 'Köln', 'Leipzig', 'Dresden', 'Bremen', 'Kiel', 'Rostock', 'Erfurt', 'Mainz', 'Freiburg'];
  add('Alle Ziffern', 'Zahlenreihen', () => genText({ scope: sc, numbers: true, len: 180 }), { target: 60 });
  add('Datum', 'Zahlen im Alltag', () => genText({ scope: sc, custom: () => Math.random() < 0.3 ? pick(C.DATES) : `${two(1 + rnd(28))}.${two(1 + rnd(12))}.${1950 + rnd(80)}`, share: 0.2, len: 180, noBg: true }), { target: 60 });
  add('Uhrzeiten', 'Zahlen im Alltag', () => genText({ scope: sc, custom: () => Math.random() < 0.3 ? pick(C.TIMES) : `${two(rnd(24))}:${two(rnd(12) * 5)}`, share: 0.2, len: 180, noBg: true }), { target: 60 });
  add('Jahreszahlen', 'Zahlen im Alltag', () => genText({ scope: sc, custom: () => 'im Jahr ' + (1500 + rnd(530)), customShare: 0.5, len: 190, noBg: true }), { target: 70 });
  add('Preise', 'Zahlen im Alltag', () => genText({ scope: sc, custom: () => `${1 + rnd(99)},${pick(['00', '49', '90', '95', '99'])} Euro`, customShare: 0.5, len: 190, noBg: true }), { target: 65 });
  add('Telefonnummern', 'Zahlen im Alltag', () => genText({ scope: sc, custom: () => `0${pick(['30', '40', '89', '221', '341', '151', '160', '171'])} ${100000 + rnd(9899999)}`, customShare: 0.7, len: 180, noBg: true }), { target: 60 });
  add('Postleitzahlen', 'Zahlen im Alltag', () => genText({ scope: sc, custom: () => `${String(1000 + rnd(98999)).padStart(5, '0')} ${pick(cities)}`, customShare: 0.8, len: 190, noBg: true }), { target: 70 });
  add('Mengenangaben', 'Zahlen im Alltag', () => genText({ scope: sc, custom: () => `${1 + rnd(500)} ${pick(['Gramm', 'Kilo', 'Meter', 'Liter', 'Stück', 'Minuten', 'Seiten', 'Tage'])}`, customShare: 0.6, len: 190, noBg: true }), { target: 72 });
  add('Sätze mit Zahlen', 'Sätze', () => sentencesText(C.NUMBER_SENTENCES, 240, sc), { target: 80 });
  add('Sätze mit Zahlen', 'Blind', () => sentencesText(C.NUMBER_SENTENCES, 240, sc), { target: 75, blind: true });
  add('Kapiteltest Zahlen', 'Test', () => genText({ scope: sc, focus: [...'1234567890'], share: 0.3, len: 260 }), { target: 70, minAcc: 94 });
}

// 7: Sonderzeichen
addChapter('sonder', 'Sonderzeichen', 'Zeichen über den Ziffern und neben dem Ö, alle mit Umschalt.');
{
  const stage = (keys, title, base) => {
    unlock(keys);
    const sc = snap(); const k = [...keys];
    add(title, 'Einführung', () => genText({ scope: sc, drill: k, focus: k, deco: k, decoRate: 0.6, len: 140 }), { target: base, keys });
    add(title, 'Im Text', () => genText({ scope: sc, deco: k, decoRate: 0.45, share: 0.3, len: 180 }), { target: base + 5, keys });
    add(title, 'Blind', () => genText({ scope: sc, deco: k, decoRate: 0.4, share: 0.3, len: 170 }), { target: base, blind: true, keys });
  };
  stage('§$%', 'Paragraf, Dollar, Prozent', 50);
  stage('&/', 'Und-Zeichen und Schrägstrich', 55);
  stage('()', 'Klammern', 58);
  stage('=+*', 'Gleich, Plus, Stern', 52);
  stage('#', 'Raute', 58);
  stage('<>_', 'Spitze Klammern und Unterstrich', 50);
  const sc = snap();
  add('Rechenaufgaben', 'Im Text', () => genText({ scope: sc, custom: () => { const a = 1 + rnd(50), b = 1 + rnd(50); return pick([`${a}+${b}=${a + b}`, `${a}*${b}=${a * b}`, `(${a}+${b})`, `${a}<${a + b}`, `${a + b}>${b}`]); }, customShare: 0.7, len: 180, noBg: true }), { target: 50 });
  add('Alle Sonderzeichen', 'Gemischt', () => genText({ scope: sc, deco: [...'§$%&/()=+*#<>_'], decoRate: 0.45, share: 0.3, len: 220 }), { target: 60 });
  add('Kapiteltest Sonderzeichen', 'Test', () => genText({ scope: sc, deco: [...'§$%&/()=+*#<>_?!:;"'], decoRate: 0.4, share: 0.3, len: 260 }), { target: 62, minAcc: 94 });
}
const FULL = snap();

// 8: Finger-Training
addChapter('finger', 'Finger-Training', 'Jeder Finger einzeln, dann jede Hand für sich.');
{
  const fingerKeys = (f) => Object.keys(FINGER_OF).filter((c) => FINGER_OF[c] === f && isLetter(c));
  ['lp', 'lr', 'lm', 'li', 'ri', 'rm', 'rr', 'rp'].forEach((f) => {
    const k = fingerKeys(f);
    add(FINGERS[f], 'Einzeln', () => genText({ scope: FULL, drill: k, focus: k, pseudoOnly: true, pseudoLetters: k, len: 140 }), { target: 70, keys: k.join('') });
    add(FINGERS[f], 'Wörter', () => genText({ scope: FULL, focus: k, filter: (w) => [...w.toLowerCase()].filter((c) => k.includes(c)).length >= 2, share: 0.85, len: 180, noBg: true }), { target: 90, keys: k.join('') });
  });
  const only = (set) => (w) => [...w.toLowerCase()].every((c) => set.has(c));
  add('Nur linke Hand', 'Wörter', () => genText({ scope: FULL, focus: [...LEFT_LETTERS], filter: only(LEFT_LETTERS), share: 0.95, len: 180, noBg: true }), { target: 90 });
  add('Nur rechte Hand', 'Wörter', () => genText({ scope: FULL, focus: [...RIGHT_LETTERS], filter: only(RIGHT_LETTERS), share: 0.95, len: 180, noBg: true }), { target: 90 });
  add('Zeigefinger strecken', 'Wörter', () => genText({ scope: FULL, focus: [...'tzghbnvm'], filter: (w) => /[tzghbnvm].*[tzghbnvm]/i.test(w), share: 0.9, len: 180, noBg: true }), { target: 95 });
  add('Kleine Finger', 'Wörter', () => genText({ scope: FULL, focus: [...'qaypöäüß'], filter: (w) => /[qaypöäüß]/i.test(w), share: 0.9, len: 180, noBg: true }), { target: 85 });
  add('Handwechsel', 'Wörter', () => genText({ scope: FULL, filter: (w) => { const s = w.toLowerCase(); let ch = 0; for (let i = 1; i < s.length; i++) if (LEFT_LETTERS.has(s[i]) !== LEFT_LETTERS.has(s[i - 1])) ch++; return s.length > 3 && ch >= s.length - 2; }, share: 0.9, len: 190, noBg: true }), { target: 105 });
  add('Gleiche Hand hintereinander', 'Wörter', () => genText({ scope: FULL, filter: (w) => /[qwertasdfgyxcvb]{4,}|[zuiophjklnmöäü]{4,}/i.test(w), share: 0.9, len: 190, noBg: true }), { target: 90 });
}

// 9: Buchstabenfolgen
addChapter('folgen', 'Buchstabenfolgen', 'Typisch deutsche Kombinationen, bis sie als eine Bewegung sitzen.');
{
  const CL = ['sch', 'ch', 'ck', 'ei', 'ie', 'eu', 'äu', 'au', 'en', 'er', 'el', 'ung', 'st', 'sp', 'pf', 'tz', 'qu', 'ß', 'nd', 'ng', 'nk', 'lich', 'keit', 'heit', 'ver', 'ge', 'be', 'ent', 'zu', 'ä', 'ö', 'ü'];
  CL.forEach((cl) => {
    add(cl.length === 1 ? `Wörter mit ${cl.toUpperCase()}` : `Folge „${cl}“`, 'Wörter', () => genText({ scope: FULL, clusters: [cl], filter: (w) => w.toLowerCase().includes(cl), share: 0.9, len: 180, noBg: true }), { target: 95 });
  });
  add('Doppelbuchstaben', 'Wörter', () => genText({ scope: FULL, filter: (w) => /([a-zäöü])\1/i.test(w), share: 0.9, len: 190, noBg: true }), { target: 100 });
  add('Lange Wörter', 'Wörter', () => genText({ scope: FULL, filter: (w) => w.length >= 10, share: 0.9, len: 220, noBg: true }), { target: 100 });
}

// 10: Häufigste Wörter
addChapter('haeufig', 'Häufigste Wörter', 'Die Wörter, die in fast jedem Text vorkommen. Sie lohnen sich am meisten.');
{
  const freq = uniq(C.FREQ);
  for (let i = 0; i < freq.length; i += 25) {
    const chunk = freq.slice(i, i + 25);
    add(`Wörter ${i + 1} bis ${Math.min(i + 25, freq.length)}`, 'Wörter', () => genText({ scope: FULL, pool: chunk, share: 1, len: 190, noBg: true }), { target: 110 });
  }
  add('Top 100', 'Gemischt', () => genText({ scope: FULL, pool: freq.slice(0, 100), len: 220, noBg: true }), { target: 120 });
  add('Top 200', 'Gemischt', () => genText({ scope: FULL, pool: freq.slice(0, 200), len: 220, noBg: true }), { target: 120 });
  add('Alle häufigen Wörter', 'Gemischt', () => genText({ scope: FULL, pool: freq, len: 240 }), { target: 125 });
  add('Alle häufigen Wörter', 'Blind', () => genText({ scope: FULL, pool: freq, len: 240 }), { target: 115, blind: true });
  add('Alle häufigen Wörter', 'Genauigkeit', () => genText({ scope: FULL, pool: freq, len: 200 }), { target: 110, minAcc: 97, note: 'Bestanden ab 97 % Genauigkeit' });
}

// 11: Wortschatz nach Themen
addChapter('themen', 'Wortschatz nach Themen', 'Alltagswörter aus 18 Bereichen, jeweils als Wörter und als Sätze.');
C.THEMES.forEach((t) => {
  add(t.name, 'Wörter', () => genText({ scope: FULL, pool: t.words, share: 1, len: 200, noBg: true }), { target: 110 });
  add(t.name, 'Sätze', () => sentencesText(t.sentences, 260), { target: 120 });
});

// 12: Sätze
addChapter('saetze', 'Sätze', 'Ganze Sätze mit allem, was du kannst.');
{
  add('Kurze Sätze', 'Sätze', () => sentencesText(ALL_SENTENCES.filter((s) => s.length < 45), 220), { target: 120 });
  add('Lange Sätze', 'Sätze', () => sentencesText(ALL_SENTENCES.filter((s) => s.length >= 50), 280), { target: 125 });
  add('Fragen', 'Sätze', () => sentencesText(C.QUESTIONS, 240), { target: 120 });
  add('Ausrufe', 'Sätze', () => sentencesText(C.EXCLAIMS, 220), { target: 120 });
  add('Sätze mit Zahlen', 'Sätze', () => sentencesText(C.NUMBER_SENTENCES, 260), { target: 110 });
  for (let i = 1; i <= 12; i++) add(`Satzmix ${i}`, 'Sätze', () => sentencesText(ALL_SENTENCES, 260 + i * 10), { target: 120 + i * 2 });
  for (let i = 1; i <= 5; i++) add(`Satzmix blind ${i}`, 'Blind', () => sentencesText(ALL_SENTENCES, 280), { target: 120 + i * 2, blind: true });
  for (let i = 1; i <= 3; i++) add(`Sauber schreiben ${i}`, 'Genauigkeit', () => sentencesText(ALL_SENTENCES, 260), { target: 110, minAcc: 98, note: 'Bestanden ab 98 % Genauigkeit' });
}

// 13: Texte
addChapter('texte', 'Texte', 'Zusammenhängende Absätze, von kurz bis anspruchsvoll.');
C.TEXTS.forEach(([title, text], i) => add(title, 'Text', () => text, { target: 120 + Math.round(i * 1.5) }));

// 14: Tempo und Ausdauer
addChapter('tempo', 'Tempo und Ausdauer', 'Läufe auf Zeit. Gezählt wird, was du in der Zeit schaffst.');
{
  const GR = { set: new Set(' asdfghjklö'), shift: false };
  const sprint = (title, sec, gen, target, blind = false) => add(title, sec >= 120 ? `${sec / 60} Minuten` : '1 Minute', gen, { target, time: sec, blind });
  sprint('Sprint Grundreihe', 60, () => genText({ scope: GR, len: 700 }), 120);
  sprint('Sprint Buchstaben', 60, () => genText({ scope: { set: new Set([...'abcdefghijklmnopqrstuvwxyzäöüß ']), shift: false }, len: 700, share: 0.3 }), 130);
  sprint('Sprint häufige Wörter', 60, () => genText({ scope: FULL, pool: C.FREQ, len: 800, noBg: true }), 150);
  sprint('Sprint Sätze', 60, () => sentencesText(ALL_SENTENCES, 800), 140);
  sprint('Sprint Zahlen', 60, () => genText({ scope: FULL, numbers: true, len: 500 }), 90);
  sprint('Sprint Text', 60, () => sentencesText(C.TEXTS.map(([, t]) => t), 900), 140);
  sprint('Sprint blind', 60, () => sentencesText(ALL_SENTENCES, 800), 135, true);
  for (let i = 1; i <= 5; i++) sprint(`Zwei-Minuten-Lauf ${i}`, 120, () => sentencesText(i % 2 ? ALL_SENTENCES : C.TEXTS.map(([, t]) => t), 1600), 140 + i * 3);
  for (let i = 1; i <= 3; i++) sprint(`Drei-Minuten-Lauf ${i}`, 180, () => sentencesText(C.TEXTS.map(([, t]) => t), 2400), 145 + i * 3);
  for (let i = 1; i <= 3; i++) sprint(`Fünf-Minuten-Ausdauer ${i}`, 300, () => sentencesText(C.TEXTS.map(([, t]) => t), 4000), 150 + i * 3);
  for (let i = 1; i <= 5; i++) sprint(`Blindtest ${i}`, 120, () => sentencesText(C.TEXTS.map(([, t]) => t), 1600), 140 + i * 3, true);
}

/* ---------- Speicher ---------- */
const STORE = 'tastenpfad.v2';
const fresh = () => ({ v: 2, lessons: {}, keys: {}, others: {}, history: [], settings: { block: true, keyboard: true }, open: {} });
let state = (() => {
  try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && s.v === 2) return Object.assign(fresh(), s); } catch (e) {}
  const st = fresh();
  try { const old = JSON.parse(localStorage.getItem('tastenpfad.v1')); if (old) { st.keys = old.keys || {}; st.history = old.history || []; st.settings = Object.assign(st.settings, old.settings || {}); } } catch (e) {}
  return st;
})();
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} };
// Fortschritt aus der Version mit nummerierten Lektions-IDs übernehmen
(function migrateIds() {
  if (state.idsV === 3) return;
  const old = state.lessons; const out = {};
  const OLD_KINDS = ['Einführung', 'Kombinationen', 'Wörter', 'Gemischt', 'Genauigkeit', 'Tempo', 'Blind'];
  const OLD_REV = ['Gemischt', 'Linke Hand', 'Rechte Hand', 'Test'];
  const STAGES = { grund: 5, oben: 6, unten: 5 };
  for (const [id, rec] of Object.entries(old)) {
    const m = /^([a-z]+)-(\d+)$/.exec(id);
    if (!m) { out[id] = rec; continue; }
    const ch = CHAPTERS.find((c) => c.key === m[1]); if (!ch) continue;
    const i = +m[2] - 1;
    let L = null;
    if (STAGES[m[1]]) {
      const stage = Math.floor(i / 7), kind = OLD_KINDS[i % 7];
      if (stage < STAGES[m[1]]) {
        const firstOfStage = ch.lessons.filter((l) => l.kind === 'Einführung')[stage];
        if (firstOfStage) L = ch.lessons.find((l) => l.title === firstOfStage.title && l.kind === kind);
      } else {
        const kind2 = OLD_REV[i - STAGES[m[1]] * 7];
        L = ch.lessons.find((l) => (kind2 === 'Test' ? l.kind === 'Test' : l.title.startsWith('Wiederholung ') && !l.title.includes(' bis ') && l.kind === kind2));
      }
    } else L = ch.lessons[i];
    if (L) out[L.id] = rec;
  }
  state.lessons = out; state.idsV = 3; save();
})();
const keyOf = (c) => (c === ' ' ? ' ' : c.toLowerCase());
const ks = (c) => (state.keys[c] ||= { n: 0, err: 0, t: 0, tn: 0 });
const passed = (L) => state.lessons[L.id]?.stars >= 1;

function recommended() { const i = LESSONS.findIndex((l) => !passed(l)); return i === -1 ? LESSONS.length - 1 : i; }
function reachedScope() {
  let m = -1; LESSONS.forEach((l, i) => { if (state.lessons[l.id]) m = i; });
  m = Math.max(m, recommended() - 1, 0);
  const L = LESSONS[m];
  // Scope der Lektion: Buchstaben bis zur erreichten Stelle
  const set = new Set([' ']); let shift = false;
  for (let i = 0; i <= m; i++) { for (const c of LESSONS[i].keys) if (CHAR[c] && !/[A-ZÄÖÜ⇧]/.test(c)) set.add(c); if (LESSONS[i].chapter.key === 'gross') shift = true; }
  if (CHAPTERS.indexOf(L.chapter) >= CHAPTERS.findIndex((c) => c.key === 'finger')) return FULL;
  return { set, shift };
}
// Tastenstatistik aller Geräte: eigene plus die per Sync geladenen
function allKeys() {
  const out = {};
  const addAll = (keys) => { for (const [c, s] of Object.entries(keys || {})) { const o = (out[c] ||= { n: 0, err: 0, t: 0, tn: 0 }); o.n += s.n; o.err += s.err; o.t += s.t; o.tn += s.tn; } };
  addAll(state.keys);
  for (const d of Object.values(state.others || {})) addAll(d.keys);
  return out;
}
function keyScores() {
  const KEYS = allKeys();
  let tsum = 0, tn = 0;
  for (const s of Object.values(KEYS)) { tsum += s.t; tn += s.tn; }
  const avg = tn ? tsum / tn : 0;
  const arr = [];
  for (const [c, s] of Object.entries(KEYS)) {
    if (c === ' ' || s.n < 6) continue;
    const er = Math.min(1, s.err / s.n);
    const sl = avg && s.tn ? (s.t / s.tn) / avg : 1;
    arr.push({ c, er, sl, score: er * 4 + Math.max(0, sl - 1) });
  }
  return arr.sort((a, b) => b.score - a.score);
}


/* ---------- Sync über ein privates GitHub-Gist ---------- */
const SYNC_STORE = 'tastenpfad.sync';
const SYNC_FILE = 'tastenpfad-sync.json';
let sync = (() => { try { return JSON.parse(localStorage.getItem(SYNC_STORE)) || {}; } catch (e) { return {}; } })();
if (!sync.device) sync.device = Math.random().toString(36).slice(2, 10);
if (!sync.name) sync.name = /iPad|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1 ? 'iPad' : /Mac/.test(navigator.platform || navigator.userAgent) ? 'Mac' : 'Gerät';
const saveSync = () => { try { localStorage.setItem(SYNC_STORE, JSON.stringify(sync)); } catch (e) {} };
saveSync();
let syncBusy = false, syncMsg = '';
async function gh(path, opts = {}) {
  const r = await fetch('https://api.github.com' + path, Object.assign({}, opts, { headers: { Authorization: 'Bearer ' + sync.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } }));
  if (r.status === 401) throw new Error('Der Zugangsschlüssel wurde abgelehnt. Prüfe ihn oder erstelle einen neuen mit dem Recht „gist“.');
  if (r.status === 403 || r.status === 404) throw new Error('Kein Zugriff auf Gists. Der Schlüssel braucht das Recht „gist“.');
  if (!r.ok) throw new Error('GitHub antwortet mit Fehler ' + r.status + '. Versuch es gleich noch einmal.');
  return r.json();
}
function exportState() {
  const others = Object.assign({}, state.others || {});
  others[sync.device] = { name: sync.name, keys: state.keys, updated: Date.now() };
  return { app: 'tastenpfad', v: 1, lessons: state.lessons, history: state.history, devices: others };
}
function mergeRemote(remote) {
  if (!remote || remote.app !== 'tastenpfad') return;
  for (const [id, r] of Object.entries(remote.lessons || {})) {
    const l = (state.lessons[id] ||= { stars: 0, bestApm: 0, bestAcc: 0, runs: 0 });
    l.stars = Math.max(l.stars, r.stars || 0); l.bestApm = Math.max(l.bestApm, r.bestApm || 0); l.bestAcc = Math.max(l.bestAcc, r.bestAcc || 0); l.runs = Math.max(l.runs, r.runs || 0);
  }
  const seen = new Set(state.history.map((h) => h.d + '|' + h.l));
  for (const h of remote.history || []) if (!seen.has(h.d + '|' + h.l)) state.history.push(h);
  state.history.sort((a, b) => a.d - b.d);
  if (state.history.length > 500) state.history = state.history.slice(-500);
  state.others = {};
  for (const [dev, d] of Object.entries(remote.devices || {})) if (dev !== sync.device) state.others[dev] = d;
}
async function syncNow(manual) {
  if (!sync.token || syncBusy) return;
  syncBusy = true; syncMsg = 'Synchronisiere …'; refreshSyncUi();
  try {
    if (!sync.gistId) {
      const list = await gh('/gists?per_page=100');
      const g = list.find((x) => x.files && x.files[SYNC_FILE]);
      if (g) sync.gistId = g.id;
      else { const c = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: 'Tastenpfad: Lernfortschritt (Sync)', public: false, files: { [SYNC_FILE]: { content: JSON.stringify(exportState()) } } }) }); sync.gistId = c.id; }
      saveSync();
    }
    const g = await gh('/gists/' + sync.gistId);
    const f = g.files && g.files[SYNC_FILE];
    if (f) {
      const text = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
      try { mergeRemote(JSON.parse(text)); } catch (e) {}
    }
    save();
    await gh('/gists/' + sync.gistId, { method: 'PATCH', body: JSON.stringify({ files: { [SYNC_FILE]: { content: JSON.stringify(exportState()) } } }) });
    sync.last = Date.now(); sync.error = ''; saveSync();
    syncMsg = '';
    if (view === 'home') renderHome();
  } catch (e) {
    sync.error = e.message || 'Keine Verbindung. Der Sync läuft beim nächsten Mal wieder.'; saveSync();
    if (e instanceof TypeError) sync.error = 'Keine Verbindung zu GitHub. Der Sync läuft wieder, sobald du online bist.';
    syncMsg = '';
  } finally { syncBusy = false; refreshSyncUi(); }
}
let syncTimer = null;
const syncSoon = () => { clearTimeout(syncTimer); syncTimer = setTimeout(() => syncNow(), 1500); };
function ago(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'gerade eben'; if (m < 60) return `vor ${m} Min.`; const h = Math.round(m / 60); if (h < 24) return `vor ${h} Std.`; return new Date(t).toLocaleDateString('de-DE');
}
function syncHtml() {
  if (!sync.token) return `
    <div class="label">Sync zwischen iPad und Mac</div>
    <p class="note" style="margin:0">Dein Fortschritt wird in einem privaten Gist in deinem GitHub-Konto gespeichert. Dafür brauchst du einmal einen Zugangsschlüssel mit dem Recht „gist“: <a href="https://github.com/settings/tokens/new?scopes=gist&amp;description=Tastenpfad" target="_blank" rel="noopener">Schlüssel bei GitHub erstellen</a>. Trag ihn auf iPad und Mac ein, beide finden dann dasselbe Gist.</p>
    <div class="row syncrow"><input type="password" id="syncToken" placeholder="ghp_… oder github_pat_…" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn primary" id="syncConnect">Verbinden</button></div>
    ${sync.error ? `<p class="note err" style="margin:0">${esc(sync.error)}</p>` : ''}`;
  const others = Object.values(state.others || {}).map((d) => d.name).filter(Boolean);
  return `
    <div class="label">Sync zwischen iPad und Mac</div>
    <p class="note" style="margin:0" id="syncStatus">${syncStatusText(others)}</p>
    <div class="row"><button class="btn" id="syncNowBtn">Jetzt synchronisieren</button><button class="btn danger" id="syncOff">Trennen</button></div>`;
}
function syncStatusText(others = Object.values(state.others || {}).map((d) => d.name).filter(Boolean)) {
  if (syncMsg) return esc(syncMsg);
  if (sync.error) return `<span class="err">${esc(sync.error)}</span>`;
  return `Verbunden als <b>${esc(sync.name)}</b>. ${sync.last ? 'Zuletzt synchronisiert ' + ago(sync.last) + '.' : ''}${others.length ? ' Weitere Geräte: ' + esc(uniq(others).join(', ')) + '.' : ''}`;
}
function refreshSyncUi() { const el = $('#syncStatus'); if (el) el.innerHTML = syncStatusText(); }
function bindSyncUi() {
  const c = $('#syncConnect');
  if (c) c.onclick = () => { const v = $('#syncToken').value.trim(); if (!v) return; sync.token = v; sync.error = ''; saveSync(); renderHome(); syncNow(true); };
  const n = $('#syncNowBtn'); if (n) n.onclick = () => syncNow(true);
  const o = $('#syncOff'); if (o) o.onclick = () => { delete sync.token; delete sync.gistId; delete sync.last; sync.error = ''; saveSync(); renderHome(); };
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && view === 'home') syncNow(); });

/* ---------- Übersicht ---------- */
let view = 'home';
const starsHtml = (n) => `<span class="stars" aria-label="${n} von 3 Sternen">${[1, 2, 3].map((i) => `<span class="${i <= n ? 'on' : ''}">★</span>`).join('')}</span>`;
const capsHtml = (str) => `<span class="keys">${[...str].map((c) => `<span class="cap">${esc(c === ' ' ? '␣' : c.toUpperCase())}</span>`).join('')}</span>`;
const lessonName = (L) => `${L.title} · ${L.kind}`;

function renderHome() {
  view = 'home';
  $('#home').hidden = false; $('#practice').hidden = true; $('#homeBtn').hidden = true;
  const rec = recommended(); const L = LESSONS[rec];
  const h = state.history;
  const last5 = h.slice(-5);
  const avgApm = last5.length ? Math.round(last5.reduce((a, b) => a + b.apm, 0) / last5.length) : null;
  const avgAcc = last5.length ? last5.reduce((a, b) => a + b.acc, 0) / last5.length : null;
  const today = new Date().toDateString();
  const todayMin = h.filter((x) => new Date(x.d).toDateString() === today).reduce((a, b) => a + b.ms, 0) / 60000;
  const done = LESSONS.filter(passed).length;
  const weak = keyScores().filter((k) => k.er > 0.02 || k.sl > 1.25).slice(0, 6);
  const recCh = L.chapter;

  const chapters = CHAPTERS.map((ch, ci) => {
    const n = ch.lessons.length, d = ch.lessons.filter(passed).length;
    const stars = ch.lessons.reduce((a, l) => a + (state.lessons[l.id]?.stars || 0), 0);
    const open = state.open[ch.key] ?? ch === recCh;
    const rows = ch.lessons.map((l) => {
      const r = state.lessons[l.id];
      const keys = l.keys && l.chapter.key !== 'finger' ? capsHtml(l.keys) : '';
      return `<button class="lesson${l.idx === rec ? ' rec' : ''}" data-l="${l.idx}">
        <span class="num">${l.idx + 1}</span>
        <span class="t"><span>${esc(l.title)}</span>${keys}<span class="kind">${esc(l.kind)}${l.blind ? ' · ohne Tastatur' : ''}</span></span>
        <span class="meta">${r ? `${de(r.bestApm)} A/Min` : ''}${starsHtml(r?.stars || 0)}</span></button>`;
    }).join('');
    return `<details class="chapter" data-ch="${ch.key}"${open ? ' open' : ''}>
      <summary><span class="chn">${ci + 1}</span><span class="cht"><b>${esc(ch.title)}</b><span>${esc(ch.blurb)}</span></span>
        <span class="chp"><span class="bar"><i style="width:${(100 * d) / n}%"></i></span><span>${d}/${n} · ${stars} ★</span></span></summary>
      <div class="lessons">${rows}</div></details>`;
  }).join('');

  $('#home').innerHTML = `
  <div class="home">
    <div class="col">
      <section class="next">
        <span class="label">${done ? 'Als Nächstes' : 'Hier geht es los'} · Lektion ${rec + 1} von ${LESSONS.length} · ${esc(recCh.title)}</span>
        <h2>${esc(L.title)} <span class="kindbig">${esc(L.kind)}</span></h2>
        <div class="row">${L.keys && L.chapter.key !== 'finger' ? capsHtml(L.keys) : ''}<span class="note">${esc(L.note || recCh.blurb)}</span></div>
        <div class="row">
          <button class="btn primary" id="go">Lektion starten <span class="kbd">↵</span></button>
          <button class="btn" id="weakBtn">Schwache Tasten üben</button>
        </div>
      </section>
      <section class="chapters">${chapters}</section>
    </div>
    <div class="col">
      <div class="tiles">
        <div class="tile"><b>${avgApm ?? '–'}</b><span>Ø Anschläge/Min</span></div>
        <div class="tile"><b>${avgAcc != null ? de(avgAcc, 1) + ' %' : '–'}</b><span>Ø Genauigkeit</span></div>
        <div class="tile"><b>${done}<small>/${LESSONS.length}</small></b><span>Lektionen</span></div>
        <div class="tile"><b>${de(todayMin, todayMin < 10 ? 1 : 0)}</b><span>Minuten heute</span></div>
      </div>
      <section class="panel chart"><div class="label">Tempo der letzten Übungen</div>${chartSvg(h.slice(-20))}</section>
      <section class="panel" style="display:flex;flex-direction:column;gap:12px">
        <div class="label">Fehlerkarte deiner Tasten</div>
        <div id="heat"></div>
        ${weak.length ? `<div class="weaklist">${weak.map((k) => `<span class="weak"><span class="cap">${esc(k.c.toUpperCase())}</span>${de(k.er * 100)} % Fehler${k.sl > 1.25 ? ' · langsam' : ''}</span>`).join('')}</div>`
          : '<p class="note" style="margin:0">Nach ein paar Übungen siehst du hier, welche Tasten dir schwerfallen. „Schwache Tasten üben“ baut daraus eine eigene Übung.</p>'}
      </section>
      <section class="panel settings">
        <div class="label">Einstellungen</div>
        <label class="toggle"><input type="checkbox" id="setBlock" ${state.settings.block ? 'checked' : ''}> Bei Fehler anhalten, bis die richtige Taste kommt</label>
        <label class="toggle"><input type="checkbox" id="setKb" ${state.settings.keyboard ? 'checked' : ''}> Tastatur und Hände beim Üben anzeigen</label>
        <p class="note" style="margin:0">Am iPad brauchst du eine <b>Hardware-Tastatur</b> (z. B. Magic Keyboard). Ohne Sync bleibt der Fortschritt auf diesem Gerät.</p>
        <div class="row" id="resetRow"><button class="btn danger" id="reset">Fortschritt löschen</button></div>
      </section>
      <section class="panel settings" id="syncPanel">${syncHtml()}</section>
    </div>
  </div>`;

  const sc = Object.fromEntries(keyScores().map((k) => [k.c, k.er]));
  renderKeyboard($('#heat'), { mini: true, heat: (c) => (c in sc ? Math.min(1, sc[c] * 3) : null) });
  $('#go').onclick = () => startLesson(rec);
  $('#weakBtn').onclick = startWeak;
  document.querySelectorAll('.lesson').forEach((b) => (b.onclick = () => startLesson(+b.dataset.l)));
  document.querySelectorAll('.chapter').forEach((d) => d.addEventListener('toggle', () => { state.open[d.dataset.ch] = d.open; save(); }));
  $('#setBlock').onchange = (e) => { state.settings.block = e.target.checked; save(); };
  $('#setKb').onchange = (e) => { state.settings.keyboard = e.target.checked; save(); };
  bindSyncUi();
  $('#reset').onclick = () => {
    $('#resetRow').innerHTML = '<span class="note" style="align-self:center">Alle Lektionen und Statistiken löschen?</span><button class="btn danger" id="resetYes">Ja, löschen</button><button class="btn" id="resetNo">Abbrechen</button>';
    $('#resetYes').onclick = () => { state = fresh(); state.idsV = 3; save(); renderHome(); };
    $('#resetNo').onclick = renderHome;
  };
  const recEl = document.querySelector('.lesson.rec');
  if (recEl && !renderHome.scrolled) { renderHome.scrolled = true; }
}

function chartSvg(h) {
  if (h.length < 2) return '<p class="note">Sobald du zwei Übungen gemacht hast, erscheint hier dein Tempoverlauf.</p>';
  const W = 320, H = 120, L = 30, R = 8, T = 10, B = 18;
  const max = Math.max(20, Math.ceil(Math.max(...h.map((x) => x.apm)) / 20) * 20);
  const x = (i) => L + (i * (W - L - R)) / (h.length - 1);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, max / 2, max];
  const pts = h.map((p, i) => `${x(i).toFixed(1)},${y(p.apm).toFixed(1)}`).join(' ');
  const lastI = h.length - 1;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Anschläge pro Minute, letzte ${h.length} Übungen">
    ${ticks.map((t) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${L - 5}" y="${y(t) + 3}" text-anchor="end">${t}</text>`).join('')}
    <polygon class="area" points="${x(0)},${y(0)} ${pts} ${x(lastI)},${y(0)}"/>
    <polyline class="lineA" points="${pts}"/>
    <circle class="dot" cx="${x(lastI)}" cy="${y(h[lastI].apm)}" r="4"/>
    <text class="ax" x="${L}" y="${H - 4}">älter</text><text class="ax" x="${W - R}" y="${H - 4}" text-anchor="end">zuletzt: ${h[lastI].apm} A/Min</text>
  </svg>`;
}

/* ---------- Übung ---------- */
let P = null, spans = [], kbEls = {}, ticker = null;
const handsOrder = [['lp', 34], ['lr', 44], ['lm', 50], ['li', 44], ['th', 26], ['th', 26], ['ri', 44], ['rm', 50], ['rr', 44], ['rp', 34]];
const fcol = { lp: 'f-lp', lr: 'f-lr', lm: 'f-lm', li: 'f-li', th: 'f-th', ri: 'f-li', rm: 'f-lm', rr: 'f-lr', rp: 'f-lp' };

function startLesson(i) {
  const L = LESSONS[i];
  begin({ mode: 'lesson', idx: i, title: `Lektion ${i + 1} · ${lessonName(L)}`, target: L.target, text: L.gen(), blind: L.blind, time: L.time, note: L.note });
}
function startWeak() {
  const weak = keyScores().filter((k) => isLetter(k.c)).slice(0, 5).map((k) => k.c);
  if (weak.length < 2) { startLesson(recommended()); return; }
  const base = reachedScope();
  const sc = { set: new Set(base.set), shift: base.shift };
  weak.forEach((c) => sc.set.add(c));
  begin({ mode: 'weak', title: 'Schwache Tasten: ' + weak.map((c) => c.toUpperCase()).join(' '), target: 0, text: genText({ scope: sc, focus: weak, drill: weak, share: 0.85, len: 220 }) });
}
function begin(cfg) {
  view = 'practice';
  clearInterval(ticker);
  P = Object.assign(cfg, { pos: 0, correct: 0, wrong: 0, errPos: new Set(), start: 0, last: 0, done: false });
  $('#home').hidden = true; $('#practice').hidden = false; $('#homeBtn').hidden = false;
  $('#pTitle').textContent = cfg.title;
  $('#result').hidden = true; $('#typebox').hidden = false; $('#startHint').hidden = false;
  $('#startExtra').textContent = cfg.time ? `Lauf auf Zeit: ${cfg.time >= 120 ? cfg.time / 60 + ' Minuten' : '1 Minute'}. Die Zeit startet mit dem ersten Zeichen.` : cfg.blind ? 'Diese Lektion läuft ohne Tastatur-Anzeige.' : (cfg.note || '');
  const showKb = state.settings.keyboard && !cfg.blind;
  $('#kbWrap').hidden = !showKb; $('#hands').hidden = !showKb; $('#fhint').hidden = !showKb;
  $('#lTimeLabel').textContent = cfg.time ? 'übrig' : 'Zeit';
  kbEls = renderKeyboard($('#kbWrap'));
  $('#hands').innerHTML = '<div class="hand">' + handsOrder.slice(0, 5).map(([f, h]) => `<div class="fing ${fcol[f]}" data-f="${f}" style="height:${h}px"></div>`).join('') + '</div><div class="hand">' + handsOrder.slice(5).map(([f, h]) => `<div class="fing ${fcol[f]}" data-f="${f}" style="height:${h}px"></div>`).join('') + '</div>';
  renderText(cfg.text);
  updateLive(); highlightNext(); focusSink();
  window.scrollTo({ top: 0 });
}
function renderText(text) {
  const inner = $('#text'); inner.innerHTML = ''; inner.style.transform = '';
  spans = [];
  let word = null;
  const frag = document.createDocumentFragment();
  for (const ch of text) {
    const sp = document.createElement('span'); sp.className = 'ch';
    if (ch === ' ') { sp.classList.add('sp'); sp.textContent = ' '; word = null; frag.append(sp); }
    else { if (!word) { word = document.createElement('span'); frag.append(word); } sp.textContent = ch; word.append(sp); }
    spans.push(sp);
  }
  inner.append(frag);
  spans[0]?.classList.add('cur');
}
function scrollText() {
  const sp = spans[Math.min(P.pos, spans.length - 1)]; if (!sp) return;
  const inner = $('#text');
  const lh = parseFloat(getComputedStyle(inner).lineHeight) || 40;
  const y = Math.max(0, sp.offsetTop - lh);
  inner.style.transform = `translateY(${-y}px)`;
}
let lastKeys = [];
function highlightNext() {
  lastKeys.forEach((el) => el.classList.remove('next')); lastKeys = [];
  document.querySelectorAll('.fing.on').forEach((el) => el.classList.remove('on'));
  if (!P || P.done) { $('#fhint').textContent = ''; return; }
  const ch = P.text[P.pos]; const info = CHAR[ch];
  if (!info) { $('#fhint').textContent = ''; return; }
  const addK = (id) => (kbEls[id] || []).forEach((el) => { el.classList.add('next'); lastKeys.push(el); });
  addK(info.id);
  let shiftTxt = '';
  if (info.shift) {
    const left = LEFT.has(info.finger);
    addK(left ? 'ShiftR' : 'ShiftL');
    shiftTxt = ` + Umschalt mit dem ${left ? 'rechten' : 'linken'} kleinen Finger`;
    document.querySelector(`.fing[data-f="${left ? 'rp' : 'lp'}"]`)?.classList.add('on');
  }
  document.querySelectorAll(`.fing[data-f="${info.finger}"]`).forEach((el) => el.classList.add('on'));
  $('#fhint').innerHTML = esc(FINGERS[info.finger]) + (ch === ' ' ? ' <span>· Leertaste</span>' : '') + (shiftTxt ? ` <span>${esc(shiftTxt)}</span>` : '');
}
function flashWrong(ch) {
  const info = CHAR[ch]; if (!info) return;
  (kbEls[info.id] || []).forEach((el) => { el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 220); });
}
const fmtTime = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function updateLive() {
  const ms = P.start ? performance.now() - P.start : 0;
  if (P.time && ms >= P.time * 1000 && !P.done) { finish(); return; }
  const apm = ms > 1500 ? Math.round(P.correct / (ms / 60000)) : 0;
  const acc = P.correct + P.wrong ? (100 * P.correct) / (P.correct + P.wrong) : 100;
  $('#lApm').textContent = apm; $('#lAcc').textContent = de(acc, acc === 100 ? 0 : 1);
  $('#lTime').textContent = P.time ? fmtTime(P.time * 1000 - ms) : fmtTime(ms);
  $('#pBar').style.width = (P.time ? (100 * ms) / (P.time * 1000) : (100 * P.pos) / P.text.length) + '%';
}
function typeChar(ch) {
  if (!P || P.done) return;
  const exp = P.text[P.pos]; const now = performance.now();
  if (!P.start) { P.start = now; P.last = now; $('#startHint').hidden = true; ticker = setInterval(updateLive, 250); }
  const k = keyOf(exp);
  const advance = (ok) => {
    const sp = spans[P.pos];
    sp.classList.remove('cur', 'miss'); sp.classList.add(ok && !P.errPos.has(P.pos) ? 'ok' : 'bad');
    P.pos++; P.last = now;
    if (P.pos >= P.text.length) { finish(); return; }
    spans[P.pos].classList.add('cur'); scrollText(); highlightNext();
  };
  if (ch === exp) {
    P.correct++;
    const st = ks(k); st.n++;
    const dt = now - P.last;
    if (P.pos > 0 && !P.errPos.has(P.pos) && dt < 3000) { st.t += dt; st.tn++; }
    advance(true);
  } else {
    P.wrong++;
    if (!P.errPos.has(P.pos)) { P.errPos.add(P.pos); ks(k).err++; }
    flashWrong(ch);
    spans[P.pos].classList.add('miss');
    if (!state.settings.block) { ks(k).n++; advance(false); }
  }
  if (!P.done) updateLive();
}
function finish() {
  P.done = true; clearInterval(ticker);
  const ms = P.time ? Math.min(performance.now() - P.start, P.time * 1000) : performance.now() - P.start;
  const apm = Math.round(P.correct / (ms / 60000));
  const acc = P.correct + P.wrong ? Math.round((1000 * P.correct) / (P.correct + P.wrong)) / 10 : 0;
  let stars = 0;
  const L = P.mode === 'lesson' ? LESSONS[P.idx] : null;
  if (L) {
    const min = L.minAcc;
    stars = acc < min ? 0 : acc >= Math.max(97, min + 1) && apm >= L.target * 1.25 ? 3 : acc >= Math.max(94, min) && apm >= L.target ? 2 : 1;
    const r = (state.lessons[L.id] ||= { stars: 0, bestApm: 0, bestAcc: 0, runs: 0 });
    r.stars = Math.max(r.stars, stars); r.bestApm = Math.max(r.bestApm, apm); r.bestAcc = Math.max(r.bestAcc, acc); r.runs++;
  }
  state.history.push({ d: Date.now(), l: L ? L.id : 'weak', apm, acc, ms: Math.round(ms) });
  if (state.history.length > 500) state.history = state.history.slice(-500);
  save(); syncSoon();

  const missed = {};
  P.errPos.forEach((i) => { const c = P.text[i]; missed[c] = (missed[c] || 0) + 1; });
  const missedList = Object.entries(missed).sort((a, b) => b[1] - a[1]).slice(0, 8);
  let msg;
  if (!L) msg = 'Gut gemacht. Deine Fehlerstatistik ist aktualisiert, die nächste Runde passt sich daran an.';
  else if (stars === 0) msg = `Unter ${L.minAcc} % Genauigkeit. Tippe langsamer und gleichmäßig, Tempo kommt von selbst, wenn die Finger sicher sind.`;
  else if (stars === 1) msg = acc < Math.max(94, L.minAcc) ? `Bestanden. Für den zweiten Stern brauchst du mindestens ${Math.max(94, L.minAcc)} % Genauigkeit und ${L.target} Anschläge pro Minute.` : `Bestanden. Für den zweiten Stern fehlt noch etwas Tempo: Ziel sind ${L.target} Anschläge pro Minute.`;
  else if (stars === 2) msg = `Stark. Drei Sterne gibt es ab ${Math.max(97, L.minAcc + 1)} % Genauigkeit und ${Math.round(L.target * 1.25)} Anschlägen pro Minute.`;
  else msg = 'Drei Sterne. Weiter so!';
  const hasNext = L && stars >= 1 && P.idx < LESSONS.length - 1;
  const nextL = hasNext ? LESSONS[P.idx + 1] : null;

  $('#typebox').hidden = true; $('#fhint').textContent = '';
  highlightNext();
  const res = $('#result'); res.hidden = false;
  res.innerHTML = `
    ${L ? starsHtml(stars) : '<span class="label">Übung beendet</span>'}
    <div class="big">
      <div><b>${apm}</b><span>Anschläge pro Minute (≈ ${Math.round(apm / 5)} Wörter/Min)</span></div>
      <div><b>${de(acc, 1)} %</b><span>Genauigkeit</span></div>
      <div><b>${fmtTime(ms)}</b><span>Zeit</span></div>
    </div>
    <p class="msg" style="margin:0">${esc(msg)}</p>
    ${missedList.length ? `<div class="row" style="align-items:center"><span class="label">Vertippt bei</span>${missedList.map(([c, n]) => `<span class="weak"><span class="cap">${esc(c === ' ' ? '␣' : c)}</span>${n}×</span>`).join('')}</div>` : ''}
    <div class="row">
      ${hasNext ? `<button class="btn primary" id="rNext">Weiter: ${esc(lessonName(nextL))} <span class="kbd">↵</span></button><button class="btn" id="rAgain">Nochmal</button>`
        : `<button class="btn primary" id="rAgain">Nochmal <span class="kbd">↵</span></button>`}
      <button class="btn ghost" id="rHome">Zur Übersicht</button>
    </div>`;
  P.primary = hasNext ? () => startLesson(P.idx + 1) : again;
  $('#rAgain').onclick = again;
  if (hasNext) $('#rNext').onclick = P.primary;
  $('#rHome').onclick = renderHome;
  focusSink();
}
function again() { if (P.mode === 'lesson') startLesson(P.idx); else startWeak(); }
function focusSink() { try { $('#sink').focus({ preventScroll: true }); } catch (e) {} }

/* ---------- Eingabe ---------- */
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey) return;
  if (view === 'home') {
    const t = e.target;
    if (e.key === 'Enter' && !(t instanceof HTMLButtonElement) && !(t instanceof HTMLInputElement) && !(t instanceof HTMLElement && t.tagName === 'SUMMARY')) { e.preventDefault(); startLesson(recommended()); }
    return;
  }
  if (e.key === 'Escape') { e.preventDefault(); clearInterval(ticker); renderHome(); return; }
  if (P.done) { if (e.key === 'Enter') { e.preventDefault(); P.primary(); } return; }
  if (e.key === 'Dead') { e.preventDefault(); $('#fhint').innerHTML = 'Tote Taste <span>(´ ^ `) kommt in den Übungen nicht vor</span>'; return; }
  if (e.key === 'Unidentified' || e.key === 'Process') return;
  if (e.key.length !== 1) { if (['Backspace', 'Tab', 'Enter'].includes(e.key)) e.preventDefault(); return; }
  e.preventDefault();
  typeChar(e.key);
});
$('#sink').addEventListener('input', () => {
  const v = $('#sink').value; $('#sink').value = '';
  if (view === 'practice' && P && !P.done) for (const ch of v) if (ch !== '\n') typeChar(ch);
});
$('#typebox').addEventListener('pointerdown', focusSink);
$('#homeBtn').onclick = () => { clearInterval(ticker); renderHome(); };
window.addEventListener('resize', () => { if (view === 'practice' && P && !P.done) scrollText(); });

window.TP = { LESSONS, CHAPTERS, CHAR, genText, fitsText, FULL, mergeRemote, exportState };
renderHome();
syncNow();
})();
