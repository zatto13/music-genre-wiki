function drawTimeline() {
  const pos = {};
  const wpos = {};
  const epos = {};
  normalize();
  const gName = g => (typeof resolveGenreLabel === 'function' ? resolveGenreLabel(g).name : String(g.name ?? ''));
  const scale = +$('#zoom').value, PAD = 60, LH = 46, H = 30;
  const minS = viewOpt.minScale / 100, thr = viewOpt.minWeight;
  
  const isFocusMode = focusTreeIds !== null;
  const allG = isFocusMode ? db.genres.filter(g => focusTreeIds.has(g.id)) : db.genres;
  const allW = isFocusMode ? db.works.filter(w => w.genres.some(gid => focusTreeIds.has(gid))) : db.works;
  const allE = isFocusMode ? (db.events || []).filter(ev => (ev.genres || []).some(gid => focusTreeIds.has(gid))) : (db.events || []);
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
  const wdated = ws.filter(w => tOf(w) != null), wundated = ws.filter(w => tOf(w) == null);
  const es = allE.filter(ev => viewOpt.showEvents !== false || ev.id === selE);
  const edated = es.filter(ev => tOf(ev) != null), eundated = es.filter(ev => tOf(ev) == null);

  const ys = [...dated.map(g => tOf(g)), ...wdated.map(w => tOf(w)), ...edated.map(ev => tOf(ev))].filter(y => y != null);
  const minY = ys.length ? Math.floor(Math.min(...ys) / 10) * 10 - 10 : 1990;
  const maxY = ys.length ? Math.ceil(Math.max(...ys) / 10) * 10 + 10 : 2010;
  const bandItems = [
    ...undated.map(g => textW(g.name)),
    ...wundated.map(w => textW(w.title || '(無題)') * .88),
    ...eundated.map(ev => textW(ev.title || '(無題)') * .88)
  ];
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
  
  // ジャンル領域の下端を確定
  const gRows = Math.max(row, undated.length);
  const gBottom = TOP + gRows * LH + 20;

  // 作品レーンの配置
  const WH = 22, WL = 30, wl = [];
  const WTOP = gBottom + (ws.length ? 28 : 0);
  wundated.forEach((w, i) => { wpos[w.id] = {x: 24, w: textW(w.title || '(無題)') * .88, y: WTOP + i * WL + WH / 2}; });
  [...wdated].sort((a, b) => (tOf(a)||0) - (tOf(b)||0) || (a.title||'').localeCompare(b.title||'')).forEach(w => {
    const x = X(tOf(w)), ww = textW(w.title || '(無題)') * .88;
    let l = wl.findIndex(iv => iv.every(([a, z]) => z + 8 < x || a - 8 > x + ww));
    if (l < 0) { l = wl.length; wl.push([]); }
    wl[l].push([x, x + ww]);
    wpos[w.id] = {x, w: ww, y: WTOP + l * WL + WH / 2};
  });
  const wRows = Math.max(1, wl.length, wundated.length);
  const wBottom = ws.length ? WTOP + wRows * WL + 16 : gBottom;

  // 出来事レーンの配置（必ず wBottom の下に配置され、Ht に反映される）
  const EH = 24, EL = 32, el = [];
  const ETOP = wBottom + (es.length ? 28 : 0);
  eundated.forEach((ev, i) => { epos[ev.id] = {x: 24, w: textW(ev.title || '(無題)') * .9, y: ETOP + i * EL + EH / 2}; });
  [...edated].sort((a, b) => (tOf(a)||0) - (tOf(b)||0) || (a.title||'').localeCompare(b.title||'')).forEach(ev => {
    const x = X(tOf(ev)), ew = textW(ev.title || '(無題)') * .9;
    let l = el.findIndex(iv => iv.every(([a, z]) => z + 8 < x || a - 8 > x + ew));
    if (l < 0) { l = el.length; el.push([]); }
    el[l].push([x, x + ew]);
    epos[ev.id] = {x, w: ew, y: ETOP + l * EL + EH / 2};
  });
  const eRows = Math.max(1, el.length, eundated.length);
  const eBottom = es.length ? ETOP + eRows * EL + 24 : wBottom;

  const W = BAND + PAD * 2 + (maxY - minY) * scale + 120;
  const Ht = Math.max(gBottom + 10, eBottom);

  const grads = {};
  const fillOf = cols => {
    if (cols.length === 1) return cols[0];
    const key = cols.join();
    if (!grads[key]) grads[key] = 'gr' + Object.keys(grads).length;
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
  } else if (selE) {
    const ev = (db.events || []).find(x => x.id === selE), s = ev && new Set((ev.genres || []).filter(gen));
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
  
  flags.forEach(f => { 
    b += `<g class="flag${f.m.id === selM ? ' sel' : ''}" data-major="${f.m.id}">
    <rect x="${f.x}" y="${f.y}" width="${f.w}" height="18" rx="3" style="fill:${f.m.color}"/>
    <text x="${f.x+7}" y="${f.y+13}" font-size="11.5" style="fill:${textOn([f.m.color])}">${esc(f.m.name)}</text></g>`;
  });
  mflags.forEach(f => { 
    b += `<g class="flag" data-major="${f.m.id}" data-sub="${f.sb.id}">
    <rect x="${f.x}" y="${f.y + 2}" width="${f.w}" height="14" rx="7" style="fill:${f.sb.color}"/>
    <text x="${f.x + 7}" y="${f.y + 12.5}" font-size="10.5" style="fill:${textOn([f.sb.color])}">${esc(f.sb.name)}</text></g>`;
  });
  
  if (ws.length) {
    b += `<rect x="${BAND}" y="${WTOP - 8}" width="${W - BAND}" height="${wBottom - WTOP + 8}" fill="var(--grid)" opacity=".5"/><text x="${BAND + 8}" y="${WTOP - 12}" font-size="11" fill="var(--sub)">作品</text>`;
    ws.forEach(w => {
      if (!(sel ? w.genres.includes(sel) : w.id === selW)) return;
      w.genres.forEach(id => {
        const A = wpos[w.id], B = pos[id]; if (!A || !B || (sel && id !== sel)) return;
        const x1 = A.x + A.w / 2, y1 = A.y - WH / 2, x2 = B.x + B.w / 2, y2 = B.y + H / 2, ym = (y1 + y2) / 2;
        b += `<path d="M${x1} ${y1} C${x1} ${ym},${x2} ${ym},${x2} ${y2}" fill="none" stroke="var(--sub)" stroke-width="1.5" stroke-dasharray="2 3"/>`;
      });
    });
  }

  if (es.length) {
    b += `<rect x="${BAND}" y="${ETOP - 8}" width="${W - BAND}" height="${eBottom - ETOP + 8}" fill="var(--grid)" opacity=".35"/><text x="${BAND + 8}" y="${ETOP - 12}" font-size="11" fill="var(--sub)">出来事</text>`;
    es.forEach(ev => {
      if (!(sel ? (ev.genres || []).includes(sel) : ev.id === selE)) return;
      (ev.genres || []).forEach(id => {
        const A = epos[ev.id], B = pos[id]; if (!A || !B || (sel && id !== sel)) return;
        const x1 = A.x + A.w / 2, y1 = A.y - EH / 2, x2 = B.x + B.w / 2, y2 = B.y + H / 2, ym = (y1 + y2) / 2;
        b += `<path d="M${x1} ${y1} C${x1} ${ym},${x2} ${ym},${x2} ${y2}" fill="none" stroke="var(--infl)" stroke-width="1.8" stroke-dasharray="4 3"/>`;
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
    const isDim = !isFocusMode && (sel || selW || selM || selE) && !on;
    b += `<g class="work${w.id === selW ? ' sel' : ''}${isDim ? ' dim' : ''}" data-work="${w.id}">
      <rect x="${p.x}" y="${p.y - WH / 2}" width="${p.w}" height="${WH}" rx="11"${rs}/>
      <text x="${p.x + 10}" y="${p.y + 4}"${tc ? ` style="fill:${tc}` : ''}>${esc(w.title || '(無題)')}</text></g>`;
  });
  es.forEach(ev => {
    const p = epos[ev.id]; if (!p) return;
    const cols = [...new Set((ev.genres || []).flatMap(id => mapCM[id] || []))];
    const fill = cols.length ? fillOf(cols) : 'var(--node)';
    const tc = cols.length ? textOn(cols, .85) : 'var(--ink)';
    const isSel = ev.id === selE;
    const on = sel ? (ev.genres || []).includes(sel)
             : selE ? isSel
             : selM ? (ev.genres || []).some(id => focus && focus.has(id))
             : true;
    const isDim = !isFocusMode && (sel || selW || selM || selE) && !on;
    const stroke = isSel ? 'var(--sel)' : 'var(--infl)';
    const sw = isSel ? 2.4 : 1.5;
    const dash = isSel ? '' : ' stroke-dasharray="4 2"';
    b += `<g class="evnode${isSel ? ' sel' : ''}${isDim ? ' dim' : ''}" data-event="${ev.id}" style="cursor:pointer">
      <rect x="${p.x}" y="${p.y - EH / 2}" width="${p.w}" height="${EH}" rx="4" style="fill:${fill};fill-opacity:.9;stroke:${stroke};stroke-width:${sw}"${dash}/>
      <text x="${p.x + 10}" y="${p.y + 4}" style="font-size:11.5px;fill:${tc}">${esc(ev.title || '(無題)')}</text></g>`;
  });

  const gradsHTML = Object.keys(grads).map(k => {
    const cols = k.split(',');
    return `<linearGradient id="${grads[k]}" x1="0" x2="1" y1="0" y2="0">${cols.map((c, i) => `<stop offset="${i / (cols.length - 1) * 100}%" stop-color="${c}"/>`).join('')}</linearGradient>`;
  }).join('');

  $('#tl').innerHTML = `<svg id="svg" width="${W}" height="${Ht}" xmlns="http://www.w3.org/2000/svg"><defs>
    <marker id="mh" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--hier)"/></marker>
    <marker id="mi" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--infl)"/></marker>${gradsHTML}</defs>${b}</svg>`;
}