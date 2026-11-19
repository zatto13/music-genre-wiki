const isLatinText = s =>
  typeof s === 'string' &&
  /^[A-Za-z0-9\s\-+&/.#:!?'(),]+$/.test(s.trim()) &&
  /[A-Za-z]/.test(s);

const ALIAS_LANGS = ['ja', 'en', 'kan'];
const ALIAS_LANG_LABEL = { ja: '日', en: '英', kan: '漢' };

// js/model.js の detectAliasLang と normalizeAliases 付近を差し替え
const detectAliasLang = txt => {
  const s = String(txt ?? '').trim();
  if (!s) return 'en';
  // 日本語文字（かな・漢字）が含まれる場合は基本 'ja' とする（明示タグ 'kan' は維持される）
  if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(s)) return 'ja';
  return 'en';
};

// g.name を変更・昇格した際、表示モードと矛盾しないように names スロットを同期する
function syncNameToSlots(g, newName, preferredLang = null) {
  if (!g) return;
  const clean = String(newName ?? '').trim();
  if (!clean) return;
  const rawNames = (g.names && typeof g.names === 'object') ? g.names : {};
  const lang = preferredLang || (typeof viewOpt !== 'undefined' && viewOpt.lang) || detectAliasLang(clean);

  g.names = {
    ...rawNames,
    ja: String(rawNames.ja ?? '').trim(),
    en: String(rawNames.en ?? '').trim()
  };

  if (lang === 'ja') {
    g.names.ja = clean;
  } else if (lang === 'en') {
    g.names.en = clean;
  } else if (lang === 'kan') {
    g.names.kan = clean;
  }
}

function normalizeAliases(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    let text = '';
    let lang = '';
    if (item && typeof item === 'object') {
      text = String(item.text ?? '').trim();
      lang = ALIAS_LANGS.includes(item.lang) ? item.lang : '';
    } else {
      text = String(item ?? '').trim();
    }
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text, lang: lang || detectAliasLang(text) });
  }
  return out;
}

function normalize() {
  if (!Array.isArray(db.majors)) db.majors = [];
  if (!Array.isArray(db.works)) db.works = [];
  if (!Array.isArray(db.events)) db.events = [];

  db.works.forEach(w => {
    w.title = String(w.title ?? '');
    w.artist = String(w.artist ?? '');
    w.audio = String(w.audio ?? '');
    const y = parseInt(w.year, 10);
    w.year = isNaN(y) ? null : y;
    if (!Array.isArray(w.genres)) w.genres = [];
  });

  db.events.forEach(ev => {
    ev.title = String(ev.title ?? '');
    ev.desc = String(ev.desc ?? '');
    const y = parseInt(ev.year, 10);
    ev.year = isNaN(y) ? null : y;
    if (!Array.isArray(ev.genres)) ev.genres = [];
  });

  db.genres.forEach(g => {
    const n = parseInt(g.born, 10);
    g.born = isNaN(n) ? null : n;
    const w = parseFloat(g.weight);
    g.weight = isNaN(w) ? null : w;
    g.name = String(g.name ?? '');

    g.aliases = normalizeAliases(g.aliases);

    // 言語ごとのスロット (ja / en) の正規化
    const rawNames = (g.names && typeof g.names === 'object') ? g.names : {};
    const ja = String(rawNames.ja ?? '').trim();
    let en = String(rawNames.en ?? '').trim();

    // enスロットが未設定で、元のg.nameが英語表記ならenスロットに補完する
    if (!en && isLatinText(g.name)) {
      en = g.name.trim();
    }

    g.names = {
      ...rawNames,
      ja,
      en
    };
  });

  const normD = (o, m, d, p) => {
    const v = (k, lo, hi) => {
      const n = parseInt(o[k], 10);
      o[k] = isNaN(n) || n < lo || n > hi ? null : n;
    };
    v(m, 1, 12);
    v(d, 1, 31);
    if (!['d','m','y','q','x','x1','x2','x3','x4','x5'].includes(o[p])) o[p] = null;
  };
  db.genres.forEach(g => normD(g, 'bm', 'bd', 'bp'));
  db.works.forEach(w => normD(w, 'ym', 'yd', 'yp'));
  db.events.forEach(ev => normD(ev, 'ym', 'yd', 'yp'));

  db.majors.forEach(m => {
    if (!/^#[0-9a-f]{6}$/i.test(m.color)) m.color = '#888888';
    m.desc = String(m.desc ?? '');
    if (!Array.isArray(m.roots)) m.roots = [];
    if (!Array.isArray(m.subs)) m.subs = [];
    m.subs.forEach(sb => {
      if (!/^#[0-9a-f]{6}$/i.test(sb.color)) sb.color = '#888888';
      if (!Array.isArray(sb.roots)) sb.roots = [];
      sb.name = String(sb.name ?? '');
      sb.desc = String(sb.desc ?? '');
    });
  });
}

// 現在の言語モードに応じた「主表示名」と「別名リスト」を返す
// ルール: 指定言語スロット -> 英語(en)スロット -> 既存 g.name の順でフォールバック
function resolveGenreLabel(g, langMode = (typeof viewOpt !== 'undefined' && viewOpt.lang) || 'en') {
  if (!g) return { name: '', aliases: [] };

  const baseName = String(g.name ?? '').trim();
  const names = (g.names && typeof g.names === 'object') ? g.names : {};
  const ja = String(names.ja ?? '').trim();
  const en = String(names.en ?? '').trim();
  const kan = String(names.kan ?? '').trim();
  const aliasObjs = normalizeAliases(g.aliases);

  const enAlias = aliasObjs.find(a => a.lang === 'en')?.text || '';
  const jaAlias = aliasObjs.find(a => a.lang === 'ja')?.text || '';
  const kanAlias = aliasObjs.find(a => a.lang === 'kan')?.text || '';

  let primary = '';
  if (langMode === 'ja') {
    // 日本語スロット / 日本語別名 -> 現在のメイン名 -> 英語スロット / 英語別名 -> その他
    primary = ja || jaAlias || baseName || en || enAlias || kan || kanAlias;
  } else if (langMode === 'en') {
    // 英語スロット / 英語別名 -> 現在のメイン名 -> 日本語 / 漢語
    primary = en || enAlias || baseName || ja || jaAlias || kan || kanAlias;
  } else if (langMode === 'kan') {
    // 漢語スロット / 漢語別名 -> 現在のメイン名 -> 英語 -> 日本語
    primary = kan || kanAlias || baseName || en || enAlias || ja || jaAlias;
  } else {
    primary = String(names[langMode] ?? '').trim() || baseName || en || ja;
  }
  if (!primary) primary = '(無名)';

  const pool = [];
  const pushAlias = (text, lang) => {
    const t = String(text ?? '').trim();
    if (!t || t.toLowerCase() === primary.toLowerCase()) return;
    if (pool.some(x => x.text.toLowerCase() === t.toLowerCase())) return;
    pool.push({ text: t, lang: lang || detectAliasLang(t) });
  };

  aliasObjs.forEach(a => pushAlias(a.text, a.lang));
  if (en) pushAlias(en, 'en');
  if (ja) pushAlias(ja, 'ja');
  if (kan) pushAlias(kan, 'kan');
  if (baseName) pushAlias(baseName, detectAliasLang(baseName));

  return { name: primary, aliases: pool };
}

function getConnected(startIds) {
  const visited = new Set(startIds);
  const q = [...startIds];
  while (q.length) {
    const cur = q.shift();
    db.edges.forEach(e => {
      if (e.a === cur && !visited.has(e.b)) { visited.add(e.b); q.push(e.b); }
      if (e.b === cur && !visited.has(e.a)) { visited.add(e.a); q.push(e.a); }
    });
  }
  return visited;
}

function activeMajors() { return viewOpt.release ? db.majors.filter(m => !viewOpt.released.includes(m.id)) : db.majors; }

function membersOf(m) {
  const set = new Set(), q = [];
  m.roots.forEach(r => { if (gen(r) && !set.has(r)) { set.add(r); q.push(r); } });
  while (q.length) {
    const id = q.pop();
    db.edges.forEach(e => { if (e.t === 'h' && e.a === id && gen(e.b) && !set.has(e.b)) { set.add(e.b); q.push(e.b); } });
  }
  return set;
}

function subMembers(m, sb) {
  const base = membersOf(m), set = new Set(), q = [];
  sb.roots.forEach(r => { if (base.has(r) && !set.has(r)) { set.add(r); q.push(r); } });
  while (q.length) {
    const id = q.pop();
    db.edges.forEach(e => { if (e.t === 'h' && e.a === id && base.has(e.b) && !set.has(e.b)) { set.add(e.b); q.push(e.b); } });
  }
  return set;
}

function colorMap() {
  const map = {};
  activeMajors().forEach(m => {
    const subs = m.subs.map(sb => ({sb, set: subMembers(m, sb)}));
    membersOf(m).forEach(id => {
      const cs = subs.filter(x => x.set.has(id)).map(x => x.sb.color);
      (map[id] = map[id] || []).push(...(cs.length ? cs : [m.color]));
    });
  });
  Object.keys(map).forEach(id => { map[id] = [...new Set(map[id])]; });
  return map;
}

function majorMap() {
  const map = {};
  activeMajors().forEach(m => membersOf(m).forEach(id => (map[id] = map[id] || []).push(m)));
  return map;
}

const rgb = c => [1,3,5].map(i => parseInt(c.slice(i, i + 2), 16));
function textOn(cols, a = 1) {
  const dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches, bg = dark ? [20,26,34] : [238,241,244];
  const v = [0,1,2].map(k => cols.reduce((s, c) => s + rgb(c)[k], 0) / cols.length * a + bg[k] * (1 - a));
  return (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) > 150 ? '#14191f' : '#fff';
}