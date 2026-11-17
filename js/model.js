function normalize() {
  if (!Array.isArray(db.majors)) db.majors = [];
  if (!Array.isArray(db.works)) db.works = [];
  db.works.forEach(w => { w.title = String(w.title ?? ''); w.artist = String(w.artist ?? ''); w.audio = String(w.audio ?? ''); const y = parseInt(w.year, 10); w.year = isNaN(y) ? null : y; if (!Array.isArray(w.genres)) w.genres = []; });
  db.genres.forEach(g => { const n = parseInt(g.born, 10); g.born = isNaN(n) ? null : n; const w = parseFloat(g.weight); g.weight = isNaN(w) ? null : w; g.name = String(g.name ?? ''); });
  const normD = (o, m, d, p) => {
    const v = (k, lo, hi) => { const n = parseInt(o[k], 10); o[k] = isNaN(n) || n < lo || n > hi ? null : n; };
    v(m, 1, 12); v(d, 1, 31); if (!['d','m','y','q','x','x1','x2','x3','x4','x5'].includes(o[p])) o[p] = null;
  };
  db.genres.forEach(g => normD(g, 'bm', 'bd', 'bp'));
  db.works.forEach(w => normD(w, 'ym', 'yd', 'yp'));
  db.majors.forEach(m => {
    if (!/^#[0-9a-f]{6}$/i.test(m.color)) m.color = '#888888';
    if (!Array.isArray(m.roots)) m.roots = [];
    if (!Array.isArray(m.subs)) m.subs = [];
    m.subs.forEach(sb => { if (!/^#[0-9a-f]{6}$/i.test(sb.color)) sb.color = '#888888'; if (!Array.isArray(sb.roots)) sb.roots = []; sb.name = String(sb.name ?? ''); });
  });
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
