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

