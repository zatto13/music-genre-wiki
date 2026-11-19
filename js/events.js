const render = () => {
  const isWiki = viewOpt.mode === 'wiki';
  if ($('#tl')) $('#tl').hidden = isWiki;
  if ($('#wiki')) $('#wiki').hidden = !isWiki;
  if ($('#modeTl')) $('#modeTl').classList.toggle('active', !isWiki);
  if ($('#modeWiki')) $('#modeWiki').classList.toggle('active', isWiki);
  if (isWiki) drawWiki(); else drawTimeline();
  drawPanel();
  drawRelBar();
};

document.addEventListener('click', ev => {
  const t = ev.target,
        go = t.closest('[data-go]'),
        rm = t.closest('[data-rm]'),
        rr = t.closest('[data-rmroot]'),
        mj = t.closest('[data-major]'),
        wk = t.closest('[data-work]'),
        evEl = t.closest('[data-event]'),
        rmwg = t.closest('[data-rmwg]'),
        rmeg = t.closest('[data-rmeg]'),
        rmsub = t.closest('[data-rmsubroot]'),
        delsub = t.closest('[data-delsub]'),
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
  else if (rmwg) {
    const [wid, gid] = rmwg.dataset.rmwg.split(':'), w = db.works.find(x => x.id === wid);
    if (w) w.genres = w.genres.filter(x => x !== gid);
    save(); render();
  }
  else if (rmeg) {
    const [eid, gid] = rmeg.dataset.rmeg.split(':'), eObj = (db.events || []).find(x => x.id === eid);
    if (eObj) eObj.genres = eObj.genres.filter(x => x !== gid);
    save(); render();
  }
  else if (rmsub) {
    const [sid, gid] = rmsub.dataset.rmsubroot.split(':'), m = db.majors.find(x => x.id === selM);
    const sb = m && m.subs.find(x => x.id === sid);
    if (sb) sb.roots = sb.roots.filter(x => x !== gid);
    save(); render();
  }
  else if (delsub) {
    const m = db.majors.find(x => x.id === selM);
    if (m) m.subs = m.subs.filter(x => x.id !== delsub.dataset.delsub);
    save(); render();
  }
  else if (t.id === 'addSub') {
    const m = db.majors.find(x => x.id === selM);
    if (m) {
      m.subs.push({id: 's' + Date.now().toString(36), name: '新しい中ジャンル', color: m.color, desc: '', roots: []});
      save(); render();
    }
  }
  else if (t.id === 'addWG') { addWork(sel); }
  else if (t.id === 'addEG') { addEvent(sel); }
  else if (mj) { selM = mj.dataset.major; sel = selW = selE = null; render(); }
  else if (wk) { selW = wk.dataset.work; sel = selM = selE = null; render(); }
  else if (evEl) { selE = evEl.dataset.event; sel = selM = selW = null; render(); }
  else if (go) {
    const gid = go.dataset.go;
    if (db.majors.some(x => x.id === gid)) {
      selM = gid; sel = selW = selE = null;
    } else if ((db.events || []).some(x => x.id === gid)) {
      selE = gid; sel = selM = selW = null;
    } else {
      sel = gid; selM = selW = selE = null;
    }
    render();
  }
  else if (t.id === 'svg') { sel = selM = selW = selE = null; render(); }
  else if (t.id === 'del') {
    const g = gen(sel);
    if (g && confirm(`「${g.name}」を削除します。関係も一緒に外れます。`)) {
      db.genres = db.genres.filter(x => x.id !== sel);
      db.edges = db.edges.filter(e => e.a !== sel && e.b !== sel);
      db.majors.forEach(m => m.roots = m.roots.filter(x => x !== sel));
      db.works.forEach(w => w.genres = w.genres.filter(x => x !== sel));
      (db.events || []).forEach(e => e.genres = e.genres.filter(x => x !== sel));
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
  else if (t.id === 'delW') {
    const w = db.works.find(x => x.id === selW);
    if (w && confirm(`作品「${w.title}」を削除します。`)) {
      db.works = db.works.filter(x => x.id !== selW);
      selW = null; save(); render();
    }
  }
  else if (t.id === 'delE') {
    const eObj = (db.events || []).find(x => x.id === selE);
    if (eObj && confirm(`出来事「${eObj.title}」を削除します。`)) {
      db.events = db.events.filter(x => x.id !== selE);
      db.edges = db.edges.filter(e => e.a !== selE && e.b !== selE);
      selE = null; save(); render();
    }
  }

  const rmalias = t.closest('[data-rmalias]');
  if (rmalias) {
    const g = gen(sel);
    if (g && Array.isArray(g.aliases)) {
      g.aliases.splice(+rmalias.dataset.rmalias, 1);
      save(); render();
    }
    return;
  }
  if (t.id === 'f-alias-add') {
    const g = gen(sel), inp = $('#f-alias-input');
    if (g && inp && inp.value.trim()) {
      const parts = inp.value.split(/[,、]/).map(s => s.trim()).filter(Boolean);
      g.aliases = [...new Set([...(g.aliases || []), ...parts])];
      inp.value = '';
      save(); render();
      $('#f-alias-input')?.focus();
    }
    return;
  }
});

document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.id === 'f-wpick' && t.files && t.files[0]) {
    const player = $('#wplayer');
    if (player) { player.src = URL.createObjectURL(t.files[0]); player.play(); }
    return;
  }
  if (!t.value) return;
  if (t.dataset.add) {
    const d = REL.find(r => r.k === t.dataset.add);
    const activeId = sel || selM || selE;
    db.edges.push(d.me === 'b' ? {t:d.t, a:t.value, b:activeId} : {t:d.t, a:activeId, b:t.value});
    save(); render();
  } else if (t.dataset.addroot) {
    const fromGenre = t.dataset.addroot === 'g';
    const m = db.majors.find(x => x.id === (fromGenre ? t.value : selM)), gid = fromGenre ? sel : t.value;
    if (m && !m.roots.includes(gid)) m.roots.push(gid);
    save(); render();
  } else if (t.dataset.addsubroot) {
    const m = db.majors.find(x => x.id === selM);
    const sb = m && m.subs.find(x => x.id === t.dataset.addsubroot);
    if (sb && !sb.roots.includes(t.value)) sb.roots.push(t.value);
    save(); render();
  } else if (t.dataset.addwg) {
    const fromGenre = t.dataset.addwg === 'g';
    const w = db.works.find(x => x.id === (fromGenre ? t.value : selW)), gid = fromGenre ? sel : t.value;
    if (w && !w.genres.includes(gid)) w.genres.push(gid);
    save(); render();
  } else if (t.dataset.addeg) {
    const fromGenre = t.dataset.addeg === 'g';
    const eObj = (db.events || []).find(x => x.id === (fromGenre ? t.value : selE)), gid = fromGenre ? sel : t.value;
    if (eObj && !eObj.genres.includes(gid)) eObj.genres.push(gid);
    save(); render();
  }
});

document.addEventListener('input', ev => {
  const t = ev.target, id = t.id, v = t.value;
  const g = gen(sel), m = db.majors.find(x => x.id === selM),
        w = db.works.find(x => x.id === selW), eObj = (db.events || []).find(x => x.id === selE);

  if (id === 'f-name' && g) g.name = v || '(無名)';
  else if (DMAP[id] && g && id.startsWith('f-b')) { setDateField(g, id, v); updatePrev(g); }
  else if (id === 'f-desc' && g) g.desc = v;
  else if (id === 'f-weight' && g) { const n = parseFloat(v); g.weight = isNaN(n) ? null : Math.max(0, Math.min(100, n)); }
  else if (id === 'f-mname' && m) m.name = v || '(無名)';
  else if (id === 'f-mcolor' && m) m.color = v;
  else if (id === 'f-mdesc' && m) m.desc = v;
  else if (t.dataset.subdesc && m) { const sb = m.subs.find(x => x.id === t.dataset.subdesc); if (sb) sb.desc = v; }
  else if (t.dataset.subname && m) { const sb = m.subs.find(x => x.id === t.dataset.subname); if (sb) sb.name = v; }
  else if (t.dataset.subcolor && m) { const sb = m.subs.find(x => x.id === t.dataset.subcolor); if (sb) sb.color = v; }
  else if (id === 'f-wtitle' && w) w.title = v;
  else if (id === 'f-wartist' && w) w.artist = v;
  else if (DMAP[id] && w && id.startsWith('f-w')) { setDateField(w, id, v); updatePrev(w); }
  else if (id === 'f-wdesc' && w) w.desc = v;
  else if (id === 'f-waudio' && w) w.audio = v;
  else if (id === 'f-abase') { viewOpt.audioBase = v; saveView(); }
  else if (id === 'f-etitle' && eObj) eObj.title = v;
  else if (DMAP[id] && eObj && id.startsWith('f-e')) { setDateField(eObj, id, v); updatePrev(eObj); }
  else if (id === 'f-edesc' && eObj) eObj.desc = v;
  else return;
  save();
  if (viewOpt.mode === 'wiki') drawWiki(); else drawTimeline();
});

document.addEventListener('keydown', ev => {
  if (ev.target && ev.target.id === 'f-alias-input' && ev.key === 'Enter' && !ev.isComposing) {
    ev.preventDefault();
    $('#f-alias-add')?.click();
  }
});