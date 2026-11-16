const KEY = 'genre-wiki.v1';
const REL = [
  {k:'up',   label:'上位ジャンル', t:'h', me:'b'},
  {k:'down', label:'下位ジャンル', t:'h', me:'a'},
  {k:'src',  label:'源流',         t:'i', me:'b'},
  {k:'inf',  label:'影響先',       t:'i', me:'a'}
];

const seed = () => ({
  genres:[
    {id:'g1',name:'ブルース',born:1890,desc:'(サンプル)アメリカ南部で生まれた音楽。'},
    {id:'g2',name:'ジャズ',born:1900,desc:'(サンプル)'},
    {id:'g3',name:'R&B',born:1940,desc:'(サンプル)'},
    {id:'g4',name:'ロックンロール',born:1950,desc:'(サンプル)'},
    {id:'g5',name:'ロック',born:1960,desc:'(サンプル)'},
    {id:'g6',name:'ハードロック',born:1968,desc:'(サンプル)'},
    {id:'g7',name:'ヘヴィメタル',born:1970,desc:'(サンプル)'},
    {id:'g8',name:'パンク',born:1974,desc:'(サンプル)'},
    {id:'g9',name:'ヒップホップ',born:1973,desc:'(サンプル)'}
  ],
  edges:[
    {t:'h',a:'g5',b:'g6'},{t:'h',a:'g6',b:'g7'},{t:'h',a:'g5',b:'g8'},{t:'h',a:'g4',b:'g5'},
    {t:'i',a:'g1',b:'g2'},{t:'i',a:'g1',b:'g3'},{t:'i',a:'g3',b:'g4'},{t:'i',a:'g1',b:'g6'},{t:'i',a:'g4',b:'g8'}
  ],
  works:[
    {id:'w1',title:'Cross Road Blues',artist:'Robert Johnson',year:1936,genres:['g1'],desc:'(サンプル)'},
    {id:'w2',title:'Rocket 88',artist:'Jackie Brenston and his Delta Cats',year:1951,genres:['g3','g4'],desc:'(サンプル)'},
    {id:'w3',title:'Paranoid',artist:'Black Sabbath',year:1970,genres:['g6','g7'],desc:'(サンプル)'},
    {id:'w4',title:'Never Mind the Bollocks',artist:'Sex Pistols',year:1977,genres:['g8'],desc:'(サンプル)'},
    {id:'w5',title:"Rapper's Delight",artist:'The Sugarhill Gang',year:1979,genres:['g9'],desc:'(サンプル)'}
  ],
  majors:[
    {id:'m1',name:'ブルース系',color:'#2e86de',roots:['g1','g3','g6']},
    {id:'m2',name:'ロック',color:'#e4572e',roots:['g4'],subs:[{id:'s1',name:'ハード/メタル',color:'#9b5de5',roots:['g6']}]}
  ]
});

let db, sel = null;
try { db = JSON.parse(localStorage.getItem(KEY)); } catch(e) {}
if (!db || !Array.isArray(db.genres) || !Array.isArray(db.edges)) db = seed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch(e) {} };
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const gen = id => db.genres.find(g => g.id === id);
const getEntity = id => db.genres.find(g => g.id === id) || db.majors.find(m => m.id === id);
const textW = s => [...String(s || '')].reduce((w,c) => w + (c.charCodeAt(0) > 255 ? 13 : 7.5), 0) + 26;

let selM = null, selW = null;
let focusTreeIds = null;
let ctxTarget = null;

const PALETTE = ['#e4572e','#2e86de','#3bb273','#9b5de5','#f2b134','#17bebb','#d6336c'];

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

function drawTimeline() {
  const pos = {};
  const wpos = {};
  normalize();
  const scale = +$('#zoom').value, PAD = 60, LH = 46, H = 30;
  const minS = viewOpt.minScale / 100, thr = viewOpt.minWeight;
  
  const isFocusMode = focusTreeIds !== null;
  const allG = isFocusMode ? db.genres.filter(g => focusTreeIds.has(g.id)) : db.genres;
  const allW = isFocusMode ? db.works.filter(w => w.genres.some(gid => focusTreeIds.has(gid))) : db.works;
  const allM = isFocusMode ? activeMajors().filter(m => focusTreeIds.has(m.id) || [...membersOf(m)].some(id => focusTreeIds.has(id))) : activeMajors();

  const autoW = {};
  allG.forEach(g => { autoW[g.id] = 1.0; });
  allM.forEach(m => { autoW[m.id] = 1.0; });
  for(let step = 0; step < 3; step++) {
    const nextW = {};
    allG.forEach(g => { nextW[g.id] = 1.0; });
    allM.forEach(m => { nextW[m.id] = 1.0; });
    db.edges.forEach(e => {
      if (nextW[e.a] !== undefined && autoW[e.b] !== undefined) {
        nextW[e.a] += autoW[e.b] * (e.t === 'h' ? 0.8 : 0.4);
      }
    });
    Object.assign(autoW, nextW);
  }
  let maxW = 1, minW = 1;
  Object.values(autoW).forEach(v => { if(v > maxW) maxW = v; if(v < minW) minW = v; });
  const logMax = Math.log(maxW), logMin = Math.log(minW);
  
  const wOf = g => {
    if (g.weight != null) return g.weight;
    if (logMax === logMin) return 100;
    return 30 + ((Math.log(autoW[g.id] || 1) - logMin) / (logMax - logMin)) * 70;
  };
  const fOf = g => minS + (1 - minS) * Math.max(0, Math.min(100, wOf(g))) / 100;
  
  const gs = [...allG].filter(g => g.id === sel || wOf(g) >= thr).sort(byBorn), vis = new Set(gs.map(g => g.id));
  if (!gs.length && allG.length > 0) { 
    $('#tl').innerHTML = '<p class="hint" style="padding:20px">表示条件を満たす要素がありません。</p>'; 
    return; 
  } else if (!gs.length) { 
    $('#tl').innerHTML = '<p class="hint" style="padding:20px">ジャンルがありません。「追加する...」から作成してください。</p>'; 
    return; 
  }
  
  const dated = gs.filter(g => g.born != null), undated = gs.filter(g => g.born == null);
  const ws = allW.filter(w => viewOpt.showWorks || w.id === selW);
  const wdated = ws.filter(w => w.year != null), wundated = ws.filter(w => w.year == null);
  const ys = [...dated.map(g => tOf(g)), ...wdated.map(w => tOf(w))];
  const minY = ys.length ? Math.floor(Math.min(...ys) / 10) * 10 - 10 : 1990;
  const maxY = ys.length ? Math.ceil(Math.max(...ys) / 10) * 10 + 10 : 2010;
  const bandItems = [...undated.map(g => textW(g.name)), ...wundated.map(w => textW(w.title || '(無題)') * .88)];
  const BAND = bandItems.length ? Math.max(...bandItems) + 48 : 0;
  
  const T0 = maxY + Math.max(2, (maxY - minY) * 0.03), mode = viewOpt.axis;
  const fz = t => { t = Math.min(t, maxY); return mode === 'log' ? -Math.log(T0 - t) : mode === 'sqrt' ? -Math.sqrt(T0 - t) : t; };
  const f0 = fz(minY), f1 = fz(maxY), span = (maxY - minY) * scale;
  const X = t => BAND + PAD + (fz(t) - f0) / (f1 - f0) * span;
  
  const mapMM = {}, mapCM = {};
  allM.forEach(m => {
    const subs = m.subs.map(sb => ({sb, set: subMembers(m, sb)}));
    membersOf(m).forEach(id => {
      if (!isFocusMode || focusTreeIds.has(id)) {
        (mapMM[id] = mapMM[id] || []).push(m);
        const cs = subs.filter(x => x.set.has(id)).map(x => x.sb.color);
        (mapCM[id] = mapCM[id] || []).push(...(cs.length ? cs : [m.color]));
      }
    });
  });
  Object.keys(mapCM).forEach(id => { mapCM[id] = [...new Set(mapCM[id])]; });

  const flags = [], rowEnd = [];
  allM.map((m, idx) => ({m, idx, mem: membersOf(m)})).filter(o => o.mem.size)
    .map(o => ({...o, ys: [...o.mem].filter(id => vis.has(id) && (!isFocusMode || focusTreeIds.has(id))).map(id => tOf(gen(id))).filter(y => y != null)})).filter(o => o.ys.length)
    .map(o => ({...o, start: Math.min(...o.ys)}))
    .sort((a,b) => viewOpt.majorSort === 'manual' ? a.idx - b.idx : a.start - b.start)
    .forEach(o => {
      const x = X(o.start), w = textW(o.m.name) - 6;
      let r = rowEnd.findIndex(end => end + 6 < x);
      if (r < 0) { r = rowEnd.length; rowEnd.push(0); }
      rowEnd[r] = x + w;
      flags.push({m: o.m, x, w, y: 26 + r * 22, start: o.start});
    });
  const mflags = [];
  allM.forEach(m => m.subs.forEach(sb => {
    const ys = [...subMembers(m, sb)].filter(id => vis.has(id) && (!isFocusMode || focusTreeIds.has(id))).map(id => tOf(gen(id))).filter(y => y != null);
    if (ys.length) mflags.push({m, sb, start: Math.min(...ys)});
  }));
  mflags.sort((a, b) => a.start - b.start).forEach(o => {
    const x = X(o.start), w = textW(o.sb.name) - 8;
    let r = rowEnd.findIndex(end => end + 6 < x);
    if (r < 0) { r = rowEnd.length; rowEnd.push(0); }
    rowEnd[r] = x + w; Object.assign(o, {x, w, y: 26 + r * 22});
  });
  const TOP = 26 + rowEnd.length * 22 + 20;

  flags.forEach(f => { pos[f.m.id] = {x: f.x + f.w / 2, w: 0, y: f.y + 9}; });
  mflags.forEach(f => { pos[f.sb.id] = {x: f.x + f.w / 2, w: 0, y: f.y + 7}; });

  undated.forEach((g, i) => { pos[g.id] = {x: 24, w: textW(g.name) * fOf(g), y: TOP + i * LH + H / 2}; });
  
  const fi = new Map(flags.map((f, i) => [f.m.id, i]));
  const bandOf = id => Math.max(-1, ...(mapMM[id] || []).map(m => fi.has(m.id) ? fi.get(m.id) : -1));
  const stack = [];
  if (viewOpt.bandOrder === 'topDown' || viewOpt.majorSort === 'manual') {
    for (let i = 0; i < flags.length; i++) stack.push(i);
  } else {
    for (let i = flags.length - 1; i >= 1; i--) if (i % 2) stack.push(i);
    if (flags.length) stack.push(0);
    for (let i = 2; i < flags.length; i += 2) stack.push(i);
  }
  if (dated.some(g => bandOf(g.id) < 0)) stack.push(-1);
  const bornCmp = viewOpt.newTop ? (a, b) => byBorn(b, a) : byBorn;
  const bandBox = []; let row = 0;
  stack.forEach(k => {
    const lanes = [];
    dated.filter(g => bandOf(g.id) === k).sort(bornCmp).forEach(g => {
      const x = X(tOf(g)), w = textW(g.name) * fOf(g);
      let l = lanes.findIndex(iv => iv.every(([a, z]) => z + 10 < x || a - 10 > x + w));
      if (l < 0) { l = lanes.length; lanes.push([]); }
      lanes[l].push([x, x + w]);
      pos[g.id] = {x, w, y: TOP + (row + l) * LH + H / 2};
    });
    const n = Math.max(1, lanes.length);
    bandBox.push({k, y: TOP + row * LH - 5, h: (n - 1) * LH + 40});
    row += n + 0.4;
  });
  
  const WH = 22, WL = 30, wl = [];
  const gRows = Math.max(row, undated.length), WTOP = TOP + gRows * LH + (ws.length ? 34 : 0);
  wundated.forEach((w, i) => { wpos[w.id] = {x: 24, w: textW(w.title || '(無題)') * .88, y: WTOP + i * WL + WH / 2}; });
  [...wdated].sort((a, b) => (tOf(a)||0) - (tOf(b)||0) || a.title.localeCompare(b.title)).forEach(w => {
    const x = X(tOf(w)), ww = textW(w.title || '(無題)') * .88;
    let l = wl.findIndex(iv => iv.every(([a, z]) => z + 8 < x || a - 8 > x + ww));
    if (l < 0) { l = wl.length; wl.push([]); }
    wl[l].push([x, x + ww]);
    wpos[w.id] = {x, w: ww, y: WTOP + l * WL + WH / 2};
  });
  const wEnd = ws.length ? WTOP + Math.max(wl.length, wundated.length) * WL + 20 : 0;
  const W = BAND + PAD * 2 + (maxY - minY) * scale + 120, Ht = Math.max(TOP + gRows * LH + 30, wEnd);

  const grads = {}; let gdefs = '';
  const fillOf = cols => {
    if (cols.length === 1) return cols[0];
    const key = cols.join();
    if (!grads[key]) {
      grads[key] = 'gr' + Object.keys(grads).length;
      gdefs += `<linearGradient id="${grads[key]}" x1="0" x2="1" y1="0" y2="0">` +
        cols.map((c, i) => `<stop offset="${i / (cols.length - 1) * 100}%" stop-color="${c}"/>`).join('') + '</linearGradient>';
    }
    return `url(#${grads[key]})`;
  };

  let focus = null;
  if (sel) {
    focus = new Set([sel]);
    db.edges.forEach(e => { if (e.a === sel) focus.add(e.b); if (e.b === sel) focus.add(e.a); });
  } else if (selM) {
    const m = db.majors.find(x => x.id === selM), s = m && membersOf(m);
    if (s && s.size) focus = s;
  } else if (selW) {
    const w = db.works.find(x => x.id === selW), s = w && new Set(w.genres.filter(gen));
    if (s && s.size) focus = s;
  }
  const edgeOn = e => sel ? (e.a === sel || e.b === sel) : !!(focus && focus.has(e.a) && focus.has(e.b));

  let b = '';
  bandBox.forEach(o => { if (o.k >= 0) b += `<rect x="${BAND}" y="${o.y}" width="${W - BAND}" height="${o.h}" fill="${flags[o.k].m.color}" opacity=".07"/>`; });
  if (BAND) b += `<rect x="0" y="22" width="${BAND}" height="${Ht-22}" fill="var(--grid)" opacity=".6"/><line x1="${BAND}" x2="${BAND}" y1="22" y2="${Ht}" stroke="var(--line)"/><text x="24" y="16" font-size="11" fill="var(--sub)">年代未分類</text>`;
  
  const cand = [];
  for (let y = Math.ceil(minY); y <= maxY && cand.length < 6000; y++) {
    const r = y % 100 === 0 ? 0 : y % 50 === 0 ? 1 : y % 25 === 0 ? 2 : y % 10 === 0 ? 3 : y % 5 === 0 ? 4 : 5;
    cand.push({y, r, x: X(y)});
  }
  const ticks = [];
  cand.sort((p, q) => p.r - q.r || p.y - q.y).forEach(c => { if (ticks.every(t => Math.abs(t.x - c.x) >= 60)) ticks.push(c); });
  ticks.forEach(({y, x}) => {
    b += `<line x1="${x}" x2="${x}" y1="22" y2="${Ht}" stroke="var(--grid)"/><text x="${x+4}" y="16" font-size="11" fill="var(--sub)">${y}</text>`;
  });
  
  // 修正: 大ジャンルのバー（flags）の表示条件を修正
  flags.forEach(f => { 
    b += `<g class="flag${f.m.id === selM ? ' sel' : ''}" data-major="${f.m.id}">
    <rect x="${f.x}" y="${f.y}" width="${f.w}" height="18" rx="3" style="fill:${f.m.color}"/>
    <text x="${f.x+7}" y="${f.y+13}" font-size="11.5" style="fill:${textOn([f.m.color])}">${esc(f.m.name)}</text></g>`;
  });
  mflags.forEach(f => { 
    b += `<g class="flag" data-major="${f.m.id}">
    <rect x="${f.x}" y="${f.y + 2}" width="${f.w}" height="14" rx="7" style="fill:${f.sb.color}"/>
    <text x="${f.x + 7}" y="${f.y + 12.5}" font-size="10.5" style="fill:${textOn([f.sb.color])}">${esc(f.sb.name)}</text></g>`;
  });
  
  if (ws.length) {
    b += `<rect x="${BAND}" y="${WTOP - 8}" width="${W - BAND}" height="${Ht - WTOP + 8}" fill="var(--grid)" opacity=".5"/><text x="${BAND + 8}" y="${WTOP - 12}" font-size="11" fill="var(--sub)">作品</text>`;
    ws.forEach(w => {
      if (!(sel ? w.genres.includes(sel) : w.id === selW)) return;
      w.genres.forEach(id => {
        const A = wpos[w.id], B = pos[id]; if (!A || !B || (sel && id !== sel)) return;
        const x1 = A.x + A.w / 2, y1 = A.y - WH / 2, x2 = B.x + B.w / 2, y2 = B.y + H / 2, ym = (y1 + y2) / 2;
        b += `<path d="M${x1} ${y1} C${x1} ${ym},${x2} ${ym},${x2} ${y2}" fill="none" stroke="var(--sub)" stroke-width="1.5" stroke-dasharray="2 3"/>`;
      });
    });
  }

  let displayEdges = db.edges.filter(e => {
    if (e.t === 'h' && !viewOpt.showHier) return false;
    if (e.t === 'i' && !viewOpt.showInfl) return false;
    if (isFocusMode && (!focusTreeIds.has(e.a) || !focusTreeIds.has(e.b))) return false;
    return true;
  });
  if (viewOpt.prune) {
    const adjH = {}, adjI = {};
    allG.forEach(g => { adjH[g.id] = new Set(); adjI[g.id] = new Set(); });
    allM.forEach(m => { adjH[m.id] = new Set(); adjI[m.id] = new Set(); });
    displayEdges.forEach(e => {
      if (e.t === 'h' && adjH[e.a]) adjH[e.a].add(e.b);
      if (e.t === 'i' && adjI[e.a]) adjI[e.a].add(e.b);
    });
    const hasPath = (adj, start, target) => {
      const q = [start]; const vis = new Set([start]);
      while(q.length > 0) {
        const cur = q.shift();
        if (!adj[cur]) continue;
        for (const nxt of adj[cur]) {
          if (nxt === target) return true;
          if (!vis.has(nxt)) { vis.add(nxt); q.push(nxt); }
        }
      }
      return false;
    };
    displayEdges = displayEdges.filter(e => {
      const adj = e.t === 'h' ? adjH : adjI;
      if (!adj[e.a]) return true;
      adj[e.a].delete(e.b);
      const redundant = hasPath(adj, e.a, e.b);
      adj[e.a].add(e.b);
      return !redundant;
    });
  }
  displayEdges.forEach(e => {
    const A = pos[e.a], B = pos[e.b]; if (!A || !B) return;
    const sx = A.x + A.w, sy = A.y, ex = B.x, ey = B.y, d = Math.max(40, Math.abs(ex - sx) / 2), on = edgeOn(e);
    const isDim = !isFocusMode && focus && !on;
    b += `<path class="e ${e.t}${on ? ' on' : ''}${isDim ? ' dim' : ''}" marker-end="url(#m${e.t})" d="M${sx} ${sy} C${sx+d} ${sy},${ex-d} ${ey},${ex} ${ey}"/>`;
  });

  gs.forEach(g => {
    const p = pos[g.id], f = fOf(g), cols = mapCM[g.id] || [];
    const rs = cols.length ? ` style="fill:${fillOf(cols)}"` : '', tc = cols.length ? textOn(cols, .7) : '';
    const isDim = !isFocusMode && focus && !focus.has(g.id);
    b += `<g class="node${g.id === sel ? ' sel' : ''}${isDim ? ' dim' : ''}" data-go="${g.id}">
      <rect x="${p.x}" y="${p.y-H*f/2}" width="${p.w}" height="${H*f}" rx="${6*f}"${rs}/>
      <text class="n" x="${p.x+12*f}" y="${p.y-f}" style="font-size:${13*f}px${tc ? `;fill:${tc}` : ''}">${esc(g.name)}</text>
      <text class="y" x="${p.x+12*f}" y="${p.y+11*f}" style="font-size:${10*f}px${tc ? `;fill:${tc};opacity:.8` : ''}">${tOf(g) != null ? dlabel(g) : ''}</text></g>`;
  });
  ws.forEach(w => {
    const p = wpos[w.id]; if (!p) return;
    const cols = [...new Set(w.genres.flatMap(id => mapCM[id] || []))];
    const rs = cols.length ? ` style="fill:${fillOf(cols)}"` : '', tc = cols.length ? textOn(cols, .7) : '';
    const on = sel ? w.genres.includes(sel) : selW ? w.id === selW : selM ? w.genres.some(id => focus && focus.has(id)) : true;
    const isDim = !isFocusMode && (sel || selW || selM) && !on;
    b += `<g class="work${w.id === selW ? ' sel' : ''}${isDim ? ' dim' : ''}" data-work="${w.id}">
      <rect x="${p.x}" y="${p.y - WH / 2}" width="${p.w}" height="${WH}" rx="11"${rs}/>
      <text x="${p.x + 10}" y="${p.y + 4}"${tc ? ` style="fill:${tc}` : ''}>${esc(w.title || '(無題)')}</text></g>`;
  });

  const gradsHTML = Object.keys(grads).map(k => {
    const cols = k.split(',');
    return `<linearGradient id="${grads[k]}" x1="0" x2="1" y1="0" y2="0">${cols.map((c, i) => `<stop offset="${i / (cols.length - 1) * 100}%" stop-color="${c}"/>`).join('')}</linearGradient>`;
  }).join('');

  $('#tl').innerHTML = `<svg id="svg" width="${W}" height="${Ht}" xmlns="http://www.w3.org/2000/svg"><defs>
    <marker id="mh" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--hier)"/></marker>
    <marker id="mi" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--infl)"/></marker>${gradsHTML}</defs>${b}</svg>`;
}

/* ---------- detail / edit panel ---------- */
function relList(g, d) {
  const other = d.me === 'a' ? 'b' : 'a';
  return db.edges.map((e,i) => ({e,i})).filter(x => x.e.t === d.t && x.e[d.me] === g.id && gen(x.e[other]));
}
const PL = {d: 0, m: 1, y: 2, q: 3, x1: 3, x2: 3, x3: 3, x4: 3, x5: 3, x: 4};
const OFFS = [0, 0, 2, 5, 7, 9], PN = ['', '初期', '前期', '中期', '後期', '末期'];
const isDecade = p => p === 'x' || p === 'q' || /^x[1-5]$/.test(p);
function partOf(p, y) {
  if (p === 'x') return 0;
  if (p !== 'q') return +p[1];
  const o = ((y % 10) + 10) % 10; let best = 1;
  for (let i = 2; i <= 5; i++) if (Math.abs(o - OFFS[i]) < Math.abs(o - OFFS[best])) best = i;
  return best;
}
const dd = o => 'title' in o ? {y: o.year, m: o.ym, d: o.yd, p: o.yp} : {y: o.born, m: o.bm, d: o.bd, p: o.bp};
function effPrec(o) {
  const D = dd(o), own = D.d != null && D.m != null ? 'd' : D.m != null ? 'm' : 'y';
  let p = D.p || own;
  if (PL[p] < PL[own]) p = own;
  const cap = viewOpt.precCap || 'd';
  return PL[cap] > PL[p] ? cap : p;
}
function tOf(o) {
  const D = dd(o); if (D.y == null) return null;
  const p = effPrec(o);
  if (isDecade(p)) return Math.floor(D.y / 10) * 10 + OFFS[partOf(p, D.y)];
  if (p === 'y' || D.m == null) return D.y;
  const dim = new Date(D.y, D.m, 0).getDate(), frac = p === 'm' || D.d == null ? 0 : (Math.min(D.d, dim) - 1) / dim;
  return D.y + (D.m - 1 + frac) / 12;
}
function dlabel(o) {
  const D = dd(o); if (D.y == null) return '未分類';
  const p = effPrec(o);
  if (isDecade(p)) return Math.floor(D.y / 10) * 10 + '年代' + PN[partOf(p, D.y)];
  if (p === 'y' || D.m == null) return String(D.y);
  return p === 'm' || D.d == null ? `${D.y}/${D.m}` : `${D.y}/${D.m}/${D.d}`;
}
const dprev = o => dd(o).y == null ? '年が空欄のため、年代未分類です。' : '年表上の表示: ' + dlabel(o);
const updatePrev = o => { const pv = $('#dprev'); if (pv) pv.textContent = dprev(o); };
const DMAP = {'f-born':'born','f-bm':'bm','f-bd':'bd','f-bp':'bp','f-wyear':'year','f-wm':'ym','f-wd':'yd','f-wp':'yp'};
function setDateField(o, id, v) {
  const k = DMAP[id];
  if (k === 'bp' || k === 'yp') o[k] = v || null;
  else { const n = parseInt(v, 10); o[k] = isNaN(n) ? null : n; }
}
function dateFieldsHtml(o, lead, ids) {
  const D = dd(o), pOpt = [['', '自動(入力した細かさまで)'], ['d', 'すべて(日まで)'], ['m', '月まで'], ['y', '年まで'], ['q', '年代の時期(年から自動)'], ['x1', '年代・初期'], ['x2', '年代・前期'], ['x3', '年代・中期'], ['x4', '年代・後期'], ['x5', '年代・末期'], ['x', '年代まで']];
  return `<div class="dgrid">
    <label>${lead}年<input id="${ids[0]}" type="number" value="${D.y ?? ''}" placeholder="例: 1985"></label>
    <label>月<select id="${ids[1]}"><option value="">—</option>${Array.from({length: 12}, (_, i) => `<option value="${i+1}"${D.m === i + 1 ? ' selected' : ''}>${i+1}</option>`).join('')}</select></label>
    <label>日<input id="${ids[2]}" type="number" min="1" max="31" value="${D.d ?? ''}"></label></div>
  <label>精度(曖昧さ)<select id="${ids[3]}">${pOpt.map(([v, t]) => `<option value="${v}"${(D.p || '') === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
  <p class="hint" style="margin-top:-4px">年代の時期は、その年代の 初期=+0年・前期=+2年・中期=+5年・後期=+7年・末期=+9年 の位置に置きます。</p>
  <p class="hint" id="dprev" style="margin-top:-4px">${dprev(o)}</p>`;
}
const byBorn = (a, b) => (tOf(a) ?? 1e9) - (tOf(b) ?? 1e9) || a.name.localeCompare(b.name);
const yr = g => dlabel(g);
function subsHtml(m, mem) {
  const cards = m.subs.map(sb => {
    const roots = sb.roots.map(gen).filter(Boolean);
    return `<div style="border:1px solid var(--line);border-radius:8px;padding:8px;margin-bottom:8px">
      <div style="display:flex;gap:6px;align-items:center"><input type="color" data-subcolor="${sb.id}" value="${sb.color}" style="width:44px;height:32px;padding:2px;flex:none"><input data-subname="${sb.id}" value="${esc(sb.name)}" style="flex:1;min-width:0;padding:5px 8px;background:var(--bg);border:1px solid var(--line);border-radius:6px"><button data-delsub="${sb.id}" aria-label="この中ジャンルを削除">削除</button></div>
      <div class="chips" style="margin-top:6px">${roots.map(g => `<span class="chip"><span data-go="${g.id}">${esc(g.name)}</span><button data-rmsubroot="${sb.id}:${g.id}" title="起点から外す" aria-label="起点から外す">×</button></span>`).join('')}</div>
      <select data-addsubroot="${sb.id}" style="width:100%;padding:5px;background:var(--bg);border:1px solid var(--line);border-radius:6px"><option value="">起点にするジャンルを選ぶ</option>${mem.filter(g => !sb.roots.includes(g.id)).map(g => `<option value="${g.id}">${esc(g.name)}(${yr(g)})</option>`).join('')}</select></div>`;
  }).join('');
  return `<div class="rel"><h4>中ジャンル(色を変える)</h4>${cards}<button id="addSub">中ジャンルを追加</button><p class="hint">この大ジャンルに属するジャンルのうち、起点とその下位ジャンルの色を変えます。大ジャンルの外のジャンルは対象外です。</p></div>`;
}

function enhanceSelects() {
  document.querySelectorAll('#panel select').forEach(sel => {
    if (sel.dataset.enhanced) return;
    if (!sel.dataset.add && !sel.dataset.addroot && !sel.dataset.addwg && !sel.dataset.addsubroot) return;
    sel.dataset.enhanced = '1';
    
    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    wrap.style.marginBottom = '4px';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = sel.options[0] ? sel.options[0].text : '検索して追加...';
    input.style.width = '100%';
    input.style.padding = '6px 8px';
    input.style.background = 'var(--bg)';
    input.style.border = '1px solid var(--line)';
    input.style.borderRadius = '6px';
    input.style.fontSize = '14px';
    input.style.outline = 'none';
    input.style.color = 'var(--ink)';
    
    const list = document.createElement('div');
    list.style.position = 'absolute';
    list.style.zIndex = '1000';
    list.style.width = '100%';
    list.style.maxHeight = '240px';
    list.style.overflowY = 'auto';
    list.style.background = 'var(--panel)';
    list.style.border = '1px solid var(--hier)';
    list.style.borderRadius = '6px';
    list.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
    list.style.display = 'none';
    list.style.top = '100%';
    list.style.left = '0';
    list.style.marginTop = '4px';

    const renderList = () => {
      list.innerHTML = '';
      const q = input.value.toLowerCase();
      Array.from(sel.options).forEach(opt => {
        if (!opt.value) return; 
        if (q && !opt.text.toLowerCase().includes(q)) return;
        
        const item = document.createElement('div');
        item.textContent = opt.text;
        item.style.padding = '8px 10px';
        item.style.cursor = 'pointer';
        item.style.borderBottom = '1px solid var(--grid)';
        item.style.fontSize = '13px';
        item.style.color = 'var(--ink)';
        
        if (opt.parentElement.tagName === 'OPTGROUP') {
          const badge = document.createElement('span');
          badge.textContent = opt.parentElement.label;
          badge.style.fontSize = '10px';
          badge.style.background = 'var(--grid)';
          badge.style.padding = '2px 6px';
          badge.style.borderRadius = '4px';
          badge.style.marginLeft = '8px';
          badge.style.color = 'var(--sub)';
          item.appendChild(badge);
        }

        item.addEventListener('mouseenter', () => item.style.background = 'var(--bg)');
        item.addEventListener('mouseleave', () => item.style.background = '');
        item.addEventListener('mousedown', e => {
          e.preventDefault(); 
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', {bubbles: true}));
          list.style.display = 'none';
          input.value = '';
        });
        list.appendChild(item);
      });
    };

    input.addEventListener('focus', () => {
      renderList();
      list.style.display = 'block';
      input.style.borderColor = 'var(--hier)';
    });
    input.addEventListener('blur', () => {
      list.style.display = 'none';
      input.style.borderColor = 'var(--line)';
    });
    input.addEventListener('input', renderList);

    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(input);
    wrap.appendChild(list);
    sel.style.display = 'none';
  });
}

function drawMajorPanel(m) {
  const mem = [...membersOf(m)].map(gen).sort(byBorn), roots = m.roots.map(gen).filter(Boolean);
  const mIdx = db.majors.findIndex(x => x.id === m.id);
  let h = (viewOpt.release && viewOpt.released.includes(m.id) ? '<p class="hint" style="color:#c0392b">一時解除中です。年表には反映されていません。</p>' : '') + 
  `<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;">
     <span style="font-size:13px;color:var(--sub)">リスト順序:</span>
     <button data-mvm="${mIdx - 1}" ${mIdx <= 0 ? 'disabled' : ''}>← 前へ</button>
     <button data-mvm="${mIdx + 1}" ${mIdx >= db.majors.length - 1 ? 'disabled' : ''}>次へ →</button>
     <span class="hint" style="margin:0">※手動モード時に反映</span>
   </div>
  <label>大ジャンル名<input id="f-mname" value="${esc(m.name)}"></label>
  <label>色<input id="f-mcolor" type="color" value="${m.color}" style="height:34px;padding:2px"></label>
  <p class="hint" style="margin-top:-4px">年表では、現れた順に 中央 → 上 → 下 → さらに上 … の帯に並びます。複数の大ジャンルに属するジャンルは、最も新しい大ジャンルの帯に置かれます。</p>
  <div class="rel"><h4>起点のジャンル</h4><div class="chips">` +
    roots.map(g => `<span class="chip"><span data-go="${g.id}">${esc(g.name)}</span><button data-rmroot="${m.id}:${g.id}" title="起点から外す" aria-label="起点から外す">×</button></span>`).join('') +
    `</div><select data-addroot="m"><option value="">起点にするジャンルを選ぶ</option>` +
    [...db.genres].sort(byBorn).filter(g => !m.roots.includes(g.id)).map(g => `<option value="${g.id}">${esc(g.name)}(${yr(g)})</option>`).join('') +
    `</select><p class="hint">起点の下位ジャンルは、すべて自動でこの大ジャンルに属します。年表の線は、属するジャンルのうち最も早い誕生年に引かれます。</p></div>
  ${subsHtml(m, mem)}`;
  
  REL.forEach(d => {
    const other = d.me === 'a' ? 'b' : 'a', rows = relList(m, d), used = new Set(rows.map(r => r.e[other]));
    h += `<div class="rel ${d.t}"><h4><b></b>${d.label}</h4><div class="chips">` +
      rows.map(r => `<span class="chip"><span data-go="${r.e[other]}">${esc(getEntity(r.e[other]).name)}</span><button data-rm="${r.i}" title="関係を外す" aria-label="関係を外す">×</button></span>`).join('') +
      `</div><select data-add="${d.k}"><option value="">追加する要素を選ぶ</option>` +
      `<optgroup label="ジャンル">` +
      [...db.genres].sort(byBorn).filter(o => o.id !== m.id && !used.has(o.id)).map(o => `<option value="${o.id}">${esc(o.name)}(${yr(o)})</option>`).join('') + 
      `</optgroup><optgroup label="大ジャンル">` +
      db.majors.filter(o => o.id !== m.id && !used.has(o.id)).map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('') +
      `</optgroup></select></div>`;
  });

  h += `<div class="rel"><h4>属するジャンル(${mem.length})</h4><div class="chips">` +
    mem.map(g => `<span class="chip"><span data-go="${g.id}">${esc(g.name)}</span></span>`).join('') +
    `</div></div><button class="del" id="delM">この大ジャンルを削除</button>`;
  $('#panel').innerHTML = h;
  enhanceSelects();
}

function audioUrl(w) {
  let p = (w.audio || '').trim().replace(/\\/g, '/'); if (!p) return '';
  if (!/^([a-zA-Z]:\/|\/|[a-zA-Z][a-zA-Z0-9+.-]+:)/.test(p)) {
    const b = (viewOpt.audioBase || '').trim().replace(/\\/g, '/');
    if (b) p = b.replace(/\/*$/, '/') + p;
  }
  if (/^[a-zA-Z]:\//.test(p)) p = 'file:///' + p;
  return /^blob:/.test(p) ? p : encodeURI(p);
}

function drawWorkPanel(wk) {
  const url = audioUrl(wk);
  const gl = wk.genres.map(gen).filter(Boolean);
  $('#panel').innerHTML = `<label>作品名<input id="f-wtitle" value="${esc(wk.title)}"></label>
  <label>アーティスト<input id="f-wartist" value="${esc(wk.artist || '')}"></label>
  ${dateFieldsHtml(wk, '発表', ['f-wyear', 'f-wm', 'f-wd', 'f-wp'])}
  <label>説明<textarea id="f-wdesc">${esc(wk.desc || '')}</textarea></label>
  <div class="rel"><h4>音声</h4>
    <label>音声ファイルの場所(フルパス、または音声フォルダからの相対パス)<input id="f-waudio" value="${esc(wk.audio || '')}" placeholder="例: paranoid.mp3 / D:/Music/paranoid.mp3"></label>
    <audio id="wplayer" controls preload="none" style="width:100%"${url ? ` src="${esc(url)}" onerror="this.nextElementSibling.hidden=false"` : ''}></audio>
    <p class="hint" hidden>読み込めませんでした。場所の指定と「音声フォルダ」、そしてこのHTMLファイルをPCから直接開いていることを確認してください。</p>
    <label>音声フォルダ(全作品共通。この端末のブラウザにだけ保存)<input id="f-abase" value="${esc(viewOpt.audioBase || '')}" placeholder="例: audio/ または D:/Music"></label>
    <label>ファイルを選んで再生(今回のみ。場所は保存されません)<input id="f-wpick" type="file" accept="audio/*"></label>
  </div>
  <div class="rel"><h4>ジャンル</h4><div class="chips">` +
    gl.map(g => `<span class="chip"><span data-go="${g.id}">${esc(g.name)}</span><button data-rmwg="${wk.id}:${g.id}" title="ジャンルから外す" aria-label="ジャンルから外す">×</button></span>`).join('') +
    `</div><select data-addwg="w"><option value="">追加するジャンルを選ぶ</option>` +
    [...db.genres].sort(byBorn).filter(g => !wk.genres.includes(g.id)).map(g => `<option value="${g.id}">${esc(g.name)}(${yr(g)})</option>`).join('') +
    `</select></div><button class="del" id="delW">この作品を削除</button>`;
  enhanceSelects();
}

function drawPanel() {
  const m = db.majors.find(x => x.id === selM);
  const wk = db.works.find(x => x.id === selW);
  if (wk) return drawWorkPanel(wk);
  if (m) return drawMajorPanel(m);
  const g = gen(sel);
  if (!g) {
    let h = '<p class="hint">年表上の要素、または下のリストから選んで編集できます。</p>';
    if (db.majors.length) {
      h += '<div class="rel" style="margin-top:0; border-top:0"><h4>大ジャンル (ドラッグで順序入替)</h4><div id="major-list" style="display:flex;flex-direction:column;gap:6px;">';
      h += db.majors.map(m => `<div class="chip major-item" draggable="true" data-mid="${m.id}" style="cursor:grab;padding:6px 12px;justify-content:flex-start;"><span data-major="${m.id}" style="flex:1;"><i class="dot" style="background:${m.color}"></i>${esc(m.name)}</span><span style="color:var(--sub);font-size:16px;cursor:grab;">≡</span></div>`).join('');
      h += '</div></div>';
    }
    if (db.works.length) {
      h += '<div class="rel"><h4>作品一覧</h4><div class="chips">';
      h += db.works.map(w => `<span class="chip"><span data-work="${w.id}">${esc(w.title || '(無題)')}</span></span>`).join('');
      h += '</div></div>';
    }
    if (!db.majors.length && !db.works.length) h += '<p class="hint">大ジャンルや作品がありません。</p>';
    $('#panel').innerHTML = h;

    const list = $('#major-list');
    if (list) {
      let dragged = null;
      list.querySelectorAll('.major-item').forEach(el => {
        el.addEventListener('dragstart', function(e) {
          dragged = this;
          e.dataTransfer.effectAllowed = 'move';
          setTimeout(() => this.style.opacity = '0.4', 0);
        });
        el.addEventListener('dragend', function() {
          dragged = null;
          this.style.opacity = '1';
          list.querySelectorAll('.major-item').forEach(x => { x.style.borderTop = ''; x.style.borderBottom = ''; });
        });
        el.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (this === dragged) return;
          const rect = this.getBoundingClientRect();
          const mid = rect.top + rect.height / 2;
          if (e.clientY < mid) {
            this.style.borderTop = '2px solid var(--hier)';
            this.style.borderBottom = '';
            this.dataset.drop = 'before';
          } else {
            this.style.borderTop = '';
            this.style.borderBottom = '2px solid var(--hier)';
            this.dataset.drop = 'after';
          }
        });
        el.addEventListener('dragleave', function(e) {
          if (this !== dragged) {
            this.style.borderTop = '';
            this.style.borderBottom = '';
          }
        });
        el.addEventListener('drop', function(e) {
          e.preventDefault();
          if (dragged && dragged !== this) {
            const dragId = dragged.dataset.mid;
            const dropId = this.dataset.mid;
            const dragIdx = db.majors.findIndex(x => x.id === dragId);
            let dropIdx = db.majors.findIndex(x => x.id === dropId);
            if (dragIdx >= 0 && dropIdx >= 0) {
              const [item] = db.majors.splice(dragIdx, 1);
              dropIdx = db.majors.findIndex(x => x.id === dropId);
              if (this.dataset.drop === 'after') dropIdx++;
              db.majors.splice(dropIdx, 0, item);
              save(); render();
            }
          }
        });
      });
    }
    return;
  }
  let h = `<label>名前<input id="f-name" value="${esc(g.name)}"></label>
  ${dateFieldsHtml(g, '誕生', ['f-born', 'f-bm', 'f-bd', 'f-bp'])}
  <label>重要度(0〜100。小さいほど年表で小さく、下限未満は非表示)<input id="f-weight" type="number" min="0" max="100" value="${g.weight ?? 100}"></label>
  ${(g.weight ?? 100) < viewOpt.minWeight ? '<p class="hint" style="margin-top:-4px">現在の下限では非表示ですが、選択中なので表示しています。</p>' : ''}
  <label>説明<textarea id="f-desc">${esc(g.desc || '')}</textarea></label>`;
  REL.forEach(d => {
    const other = d.me === 'a' ? 'b' : 'a', rows = relList(g, d), used = new Set(rows.map(r => r.e[other]));
    h += `<div class="rel ${d.t}"><h4><b></b>${d.label}</h4><div class="chips">` +
      rows.map(r => `<span class="chip"><span data-go="${r.e[other]}">${esc(gen(r.e[other]).name)}</span><button data-rm="${r.i}" title="関係を外す" aria-label="関係を外す">×</button></span>`).join('') +
      `</div><select data-add="${d.k}"><option value="">追加するジャンルを選ぶ</option>` +
      [...db.genres].sort(byBorn).filter(o => o.id !== g.id && !used.has(o.id))
        .map(o => `<option value="${o.id}">${esc(o.name)}(${yr(o)})</option>`).join('') + `</select></div>`;
  });
  const mem = majorMap()[g.id] || [];
  h += `<div class="rel"><h4>大ジャンル</h4><div class="chips">` +
    mem.map(m => m.roots.includes(g.id)
      ? `<span class="chip"><span data-major="${m.id}"><i class="dot" style="background:${m.color}"></i>${esc(m.name)}</span><button data-rmroot="${m.id}:${g.id}" title="起点から外す" aria-label="起点から外す">×</button></span>`
      : `<span class="chip inh" title="上位ジャンルから自動で属しています" style="padding-right:10px"><span data-major="${m.id}"><i class="dot" style="background:${m.color}"></i>${esc(m.name)}</span></span>`).join('') +
    `</div><select data-addroot="g"><option value="">このジャンルを起点にする大ジャンル</option>` +
    db.majors.filter(m => !m.roots.includes(g.id)).map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('') + `</select></div>`;
  h += `<div class="rel"><h4>作品</h4><div class="chips">` +
    db.works.filter(w => w.genres.includes(g.id)).map(w => `<span class="chip"><span data-work="${w.id}">${esc(w.title || '(無題)')}</span><button data-rmwg="${w.id}:${g.id}" title="このジャンルから外す" aria-label="このジャンルから外す">×</button></span>`).join('') +
    `</div><select data-addwg="g"><option value="">既存の作品をこのジャンルに加える</option>` +
    db.works.filter(w => !w.genres.includes(g.id)).map(w => `<option value="${w.id}">${esc(w.title || '(無題)')}</option>`).join('') +
    `</select><button id="addWG" style="margin-top:6px">このジャンルの作品を新規追加</button></div>`;
  h += `<p class="hint">関係は片側だけ登録すれば、反対側にも自動で表示されます。</p><button class="del" id="del">このジャンルを削除</button>`;
  $('#panel').innerHTML = h;
  enhanceSelects();
}

const render = () => { drawTimeline(); drawPanel(); drawRelBar(); };

document.addEventListener('click', ev => {
  const t = ev.target, go = t.closest('[data-go]'), rm = t.closest('[data-rm]'),
        rr = t.closest('[data-rmroot]'), mj = t.closest('[data-major]'),
        mvm = t.closest('[data-mvm]');
  
  if (mvm && !mvm.hasAttribute('disabled')) {
    const currentIdx = db.majors.findIndex(x => x.id === selM);
    const targetIdx = parseInt(mvm.dataset.mvm, 10);
    if (currentIdx >= 0 && targetIdx >= 0 && targetIdx < db.majors.length) {
      const tmp = db.majors[currentIdx];
      db.majors[currentIdx] = db.majors[targetIdx];
      db.majors[targetIdx] = tmp;
      save(); render();
    }
    return;
  }
  if (rm) { db.edges.splice(+rm.dataset.rm, 1); save(); render(); }
  else if (rr) {
    const [mid, gid] = rr.dataset.rmroot.split(':'), m = db.majors.find(x => x.id === mid);
    if (m) m.roots = m.roots.filter(x => x !== gid);
    save(); render();
  }
  else if (mj) { selM = mj.dataset.major; sel = selW = null; render(); }
  else if (go) {
    const gid = go.dataset.go;
    if (db.majors.some(x => x.id === gid)) {
      selM = gid; sel = selW = null;
    } else {
      sel = gid; selM = selW = null;
    }
    render();
  }
  else if (t.id === 'svg') { sel = selM = selW = null; render(); }
  else if (t.id === 'del') {
    const g = gen(sel);
    if (g && confirm(`「${g.name}」を削除します。関係も一緒に外れます。`)) {
      db.genres = db.genres.filter(x => x.id !== sel);
      db.edges = db.edges.filter(e => e.a !== sel && e.b !== sel);
      db.majors.forEach(m => m.roots = m.roots.filter(x => x !== sel));
      db.works.forEach(w => w.genres = w.genres.filter(x => x !== sel));
      sel = null; save(); render();
    }
  }
  else if (t.id === 'delM') {
    const m = db.majors.find(x => x.id === selM);
    if (m && confirm(`大ジャンル「${m.name}」を削除します。ジャンル自体は残ります。`)) {
      db.majors = db.majors.filter(x => x.id !== selM);
      selM = null; save(); render();
    }
  }
});

document.addEventListener('change', ev => {
  const t = ev.target;
  if (!t.value) return;
  if (t.dataset.add) {
    const d = REL.find(r => r.k === t.dataset.add);
    db.edges.push(d.me === 'b' ? {t:d.t, a:t.value, b:sel} : {t:d.t, a:sel, b:t.value});
    save(); render();
  } else if (t.dataset.addroot) {
    const fromGenre = t.dataset.addroot === 'g';
    const m = db.majors.find(x => x.id === (fromGenre ? t.value : selM)), gid = fromGenre ? sel : t.value;
    if (m && !m.roots.includes(gid)) m.roots.push(gid);
    save(); render();
  }
});

document.addEventListener('input', ev => {
  const id = ev.target.id, v = ev.target.value, g = gen(sel), m = db.majors.find(x => x.id === selM);
  if (id === 'f-name' && g) g.name = v || '(無名)';
  else if (DMAP[id] && g) { setDateField(g, id, v); updatePrev(g); }
  else if (id === 'f-desc' && g) g.desc = v;
  else if (id === 'f-weight' && g) { const n = parseFloat(v); g.weight = isNaN(n) ? null : Math.max(0, Math.min(100, n)); }
  else if (id === 'f-mname' && m) m.name = v || '(無名)';
  else if (id === 'f-mcolor' && m) m.color = v;
  else return;
  save(); drawTimeline();
});

if($('#addMenu')) $('#addMenu').onchange = (e) => {
  const val = e.target.value;
  e.target.value = "";
  if (val === 'genre') {
    const id = 'g' + Date.now().toString(36);
    db.genres.push({id, name:'新しいジャンル', born:2000, desc:''});
    sel = id; selM = selW = null; save(); render();
    const f = $('#f-name'); if (f) { f.focus(); f.select(); }
  } else if (val === 'major') {
    const id = 'm' + Date.now().toString(36);
    db.majors.push({id, name:'新しい大ジャンル', color: PALETTE[db.majors.length % PALETTE.length], roots:[], subs:[]});
    selM = id; sel = selW = null; save(); render();
    const f = $('#f-mname'); if (f) { f.focus(); f.select(); }
  } else if (val === 'work') {
    addWork(sel);
  }
};

let viewOpt = {newTop: true, release: false, released: [], minWeight: 0, minScale: 55, showWorks: true, precCap: 'd', axis: 'log', audioBase: '', showHier: true, showInfl: true, prune: true, majorSort: 'auto', bandOrder: 'center'};
try { Object.assign(viewOpt, JSON.parse(localStorage.getItem('genre-wiki.view')) || {}); } catch(e) {}

$('#newTop').checked = viewOpt.newTop;
$('#newTop').onchange = e => {
  viewOpt.newTop = e.target.checked;
  saveView();
  drawTimeline();
};

if (!Array.isArray(viewOpt.released)) viewOpt.released = [];
const saveView = () => { try { localStorage.setItem('genre-wiki.view', JSON.stringify(viewOpt)); } catch(e) {} };

function drawRelBar() {
  const bar = $('#relbar'), on = !!viewOpt.release;
  $('#rel').setAttribute('aria-pressed', on);
  bar.hidden = !on;
  if (!on) return;
  bar.innerHTML = '<span class="hint">一時解除する大ジャンルを選びます(解除中は線・色・帯が外れます。データは変わりません)</span>' +
    (db.majors.length ? db.majors.map(m => { const off = viewOpt.released.includes(m.id);
      return `<button class="rchip${off ? ' off' : ''}" data-rel="${m.id}" aria-pressed="${off}"><i class="dot" style="background:${m.color}"></i>${esc(m.name)}</button>`; }).join('')
      : '<span class="hint">大ジャンルがありません</span>');
}

$('#rel').onclick = () => { viewOpt.release = !viewOpt.release; saveView(); render(); };

document.addEventListener('click', ev => {
  const c = ev.target.closest('[data-rel]'); if (!c) return;
  const i = viewOpt.released.indexOf(c.dataset.rel);
  if (i < 0) viewOpt.released.push(c.dataset.rel); else viewOpt.released.splice(i, 1);
  saveView(); render();
});

const syncView = () => { $('#minWv').textContent = viewOpt.minWeight; $('#minSv').textContent = viewOpt.minScale + '%'; };
$('#minW').value = viewOpt.minWeight; $('#minS').value = viewOpt.minScale; syncView();
$('#minW').oninput = e => { viewOpt.minWeight = +e.target.value; saveView(); syncView(); render(); };
$('#minS').oninput = e => { viewOpt.minScale = +e.target.value; saveView(); syncView(); drawTimeline(); };
$('#precCap').value = viewOpt.precCap;
$('#precCap').onchange = e => { viewOpt.precCap = e.target.value; saveView(); render(); };
$('#axisMode').value = viewOpt.axis;
$('#axisMode').onchange = e => { viewOpt.axis = e.target.value; saveView(); drawTimeline(); };
$('#showW').checked = viewOpt.showWorks;
$('#showW').onchange = e => { viewOpt.showWorks = e.target.checked; saveView(); render(); };
$('#showHier').checked = viewOpt.showHier;
$('#showHier').onchange = e => { viewOpt.showHier = e.target.checked; saveView(); drawTimeline(); };
$('#showInfl').checked = viewOpt.showInfl;
$('#showInfl').onchange = e => { viewOpt.showInfl = e.target.checked; saveView(); drawTimeline(); };
$('#prune').checked = viewOpt.prune;
$('#prune').onchange = e => { viewOpt.prune = e.target.checked; saveView(); drawTimeline(); };
$('#majorSort').value = viewOpt.majorSort;
$('#majorSort').onchange = e => { viewOpt.majorSort = e.target.value; saveView(); drawTimeline(); };
$('#bandOrder').value = viewOpt.bandOrder;
$('#bandOrder').onchange = e => { viewOpt.bandOrder = e.target.value; saveView(); drawTimeline(); };

normalize();
render();

// --- Tooltip Event Listeners ---
let tipEl = document.getElementById('tooltip');
if (!tipEl) {
  tipEl = document.createElement('div');
  tipEl.id = 'tooltip';
  document.body.appendChild(tipEl);
}

document.addEventListener('mouseover', e => {
  const node = e.target.closest('.node');
  const work = e.target.closest('.work');
  const flag = e.target.closest('.flag');
  
  if (node) {
    const g = gen(node.dataset.go);
    if (g) {
      tipEl.innerHTML = `<strong>${esc(g.name)}</strong>${g.desc ? '<div style="margin-top:4px;font-size:12px;color:var(--sub)">' + esc(g.desc) + '</div>' : ''}`;
      tipEl.classList.add('show');
    }
  } else if (work) {
    const w = db.works.find(x => x.id === work.dataset.work);
    if (w) {
      tipEl.innerHTML = `<strong>${esc(w.title || '(無題)')}</strong>${w.artist ? ' / ' + esc(w.artist) : ''}<div style="margin-top:4px;font-size:12px;color:var(--sub)">${tOf(w) != null ? dlabel(w) : ''}${w.desc ? '<br>' + esc(w.desc) : ''}</div>`;
      tipEl.classList.add('show');
    }
  } else if (flag) {
    const m = db.majors.find(x => x.id === flag.dataset.major);
    if (m) {
      tipEl.innerHTML = `<strong>${esc(m.name)}</strong><div style="margin-top:4px;font-size:12px;color:var(--sub)">大ジャンル</div>`;
      tipEl.classList.add('show');
    }
  }
});

document.addEventListener('mousemove', e => {
  if (tipEl.classList.contains('show')) {
    let x = e.pageX + 12;
    let y = e.pageY + 12;
    if (x + tipEl.offsetWidth > window.innerWidth) x = e.pageX - tipEl.offsetWidth - 12;
    if (y + tipEl.offsetHeight > window.innerHeight) y = e.pageY - tipEl.offsetHeight - 12;
    tipEl.style.left = x + 'px';
    tipEl.style.top = y + 'px';
  }
});

document.addEventListener('mouseout', e => {
  if (e.target.closest('.node') || e.target.closest('.work') || e.target.closest('.flag')) {
    tipEl.classList.remove('show');
  }
});

// --- Context Menu Logic ---
let ctxMenu = document.getElementById('context-menu');
if (!ctxMenu) {
  ctxMenu = document.createElement('div');
  ctxMenu.id = 'context-menu';
  document.body.appendChild(ctxMenu);
}

document.addEventListener('contextmenu', e => {
  const node = e.target.closest('.node');
  const major = e.target.closest('.flag');
  if (node || major) {
    e.preventDefault();
    const id = node ? node.dataset.go : major.dataset.major;
    ctxTarget = { id, type: node ? 'genre' : 'major' };
    
    ctxMenu.innerHTML = `
      <div class="menu-item ctx-focus-tree">この系統のみ表示 (繋がっている要素)</div>
      <div class="menu-item ctx-focus-off">通常表示に戻す</div>
    `;
    ctxMenu.style.display = 'block';
    ctxMenu.style.left = e.pageX + 'px';
    ctxMenu.style.top = e.pageY + 'px';
  } else {
    ctxMenu.style.display = 'none';
  }
});

document.addEventListener('click', e => {
  if (ctxMenu.style.display === 'block' && !e.target.closest('#context-menu')) {
    ctxMenu.style.display = 'none';
  }
  
  if (e.target.classList.contains('ctx-focus-tree')) {
    let startIds = [];
    if (ctxTarget.type === 'genre') {
      startIds = [ctxTarget.id];
      sel = ctxTarget.id; selM = selW = null;
    } else {
      const m = db.majors.find(x => x.id === ctxTarget.id);
      const s = m && membersOf(m);
      if (s && s.size) startIds = Array.from(s);
      selM = ctxTarget.id; sel = selW = null;
    }
    focusTreeIds = getConnected(startIds);
    if (ctxTarget.type === 'major') focusTreeIds.add(ctxTarget.id);
    
    saveView(); render();
    ctxMenu.style.display = 'none';
  }
  
  if (e.target.classList.contains('ctx-focus-off')) {
    focusTreeIds = null;
    saveView(); render();
    ctxMenu.style.display = 'none';
  }
});