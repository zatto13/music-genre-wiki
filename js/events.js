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
        mvm = t.closest('[data-mvm]'),
        rmalias = t.closest('[data-rmalias]'),
        promotealias = t.closest('[data-promotealias]');

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

  if (rm) { db.edges.splice(+rm.dataset.rm, 1); save(); render(); return; }

  if (rr) {
    const [mid, gid] = rr.dataset.rmroot.split(':'), m = db.majors.find(x => x.id === mid);
    if (m) m.roots = m.roots.filter(x => x !== gid);
    save(); render(); return;
  }

  if (rmwg) {
    const [wid, gid] = rmwg.dataset.rmwg.split(':'), w = db.works.find(x => x.id === wid);
    if (w) w.genres = w.genres.filter(x => x !== gid);
    save(); render(); return;
  }

  if (rmeg) {
    const [eid, gid] = rmeg.dataset.rmeg.split(':'), eObj = (db.events || []).find(x => x.id === eid);
    if (eObj) eObj.genres = eObj.genres.filter(x => x !== gid);
    save(); render(); return;
  }

  if (rmsub) {
    const [sid, gid] = rmsub.dataset.rmsubroot.split(':'), m = db.majors.find(x => x.id === selM);
    const sb = m && m.subs.find(x => x.id === sid);
    if (sb) sb.roots = sb.roots.filter(x => x !== gid);
    save(); render(); return;
  }

  if (delsub) {
    const m = db.majors.find(x => x.id === selM);
    if (m) m.subs = m.subs.filter(x => x.id !== delsub.dataset.delsub);
    save(); render(); return;
  }

  if (t.id === 'addSub') {
    const m = db.majors.find(x => x.id === selM);
    if (m) {
      m.subs.push({ id: 's' + Date.now().toString(36), name: '新しい中ジャンル', color: m.color, desc: '', roots: [] });
      save(); render();
    }
    return;
  }

  if (t.id === 'addWG') { addWork(sel); return; }
  if (t.id === 'addEG') { addEvent(sel); return; }

  if (rmalias) {
    const g = gen(sel);
    if (g) {
      g.aliases = normalizeAliases(g.aliases);
      g.aliases.splice(+rmalias.dataset.rmalias, 1);
      save(); render();
    }
    return;
  }

  if (promotealias) {
    const g = gen(sel);
    const idx = +promotealias.dataset.promotealias;
    if (g) {
      g.aliases = normalizeAliases(g.aliases);
      const target = g.aliases[idx];
      if (target) {
        const oldName = g.name;
        const newName = target.text;
        g.name = newName;
        g.aliases[idx] = { text: oldName, lang: detectAliasLang(oldName) };
        g.aliases = normalizeAliases(g.aliases).filter(a => a.text !== newName);

        const escReg = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`\\[${escReg(oldName)}(\\|[^\\]]*)?\\]`, 'gi');
        const syncText = txt => txt ? txt.replace(re, (_, aliasPart) => `[${newName}${aliasPart || ''}]`) : txt;

        db.genres.forEach(x => { if (x.desc) x.desc = syncText(x.desc); });
        db.majors.forEach(m => {
          if (m.desc) m.desc = syncText(m.desc);
          (m.subs || []).forEach(sb => { if (sb.desc) sb.desc = syncText(sb.desc); });
        });
        (db.events || []).forEach(e => { if (e.desc) e.desc = syncText(e.desc); });
        db.works.forEach(w => { if (w.desc) w.desc = syncText(w.desc); });

        save(); render();
      }
    }
    return;
  }

  if (t.id === 'f-alias-add') {
    const g = gen(sel), inp = $('#f-alias-input'), langSel = $('#f-alias-lang');
    if (g && inp && inp.value.trim()) {
      const chosenLang = (langSel && ALIAS_LANGS.includes(langSel.value)) ? langSel.value : 'en';
      const parts = inp.value.split(/[,、]/).map(s => s.trim()).filter(Boolean);
      const next = [
        ...normalizeAliases(g.aliases),
        ...parts.map(text => ({ text, lang: chosenLang }))
      ];
      g.aliases = normalizeAliases(next);
      inp.value = '';
      save(); render();
      $('#f-alias-input')?.focus();
    }
    return;
  }

  if (mj) {
    selM = mj.dataset.major;
    sel = selW = selE = null;
    render();
    return;
  }
  if (wk) {
    selW = wk.dataset.work;
    sel = selM = selE = null;
    render();
    return;
  }
  if (evEl) {
    selE = evEl.dataset.event;
    sel = selM = selW = null;
    render();
    return;
  }
  if (go) {
    const gid = go.dataset.go;
    if (db.majors.some(x => x.id === gid)) {
      selM = gid; sel = selW = selE = null;
    } else if ((db.events || []).some(x => x.id === gid)) {
      selE = gid; sel = selM = selW = null;
    } else if ((db.works || []).some(x => x.id === gid)) {
      selW = gid; sel = selM = selE = null;
    } else {
      sel = gid; selM = selW = selE = null;
    }
    render();
    return;
  }

  if (t.id === 'svg') { sel = selM = selW = selE = null; render(); return; }

  if (t.id === 'del') {
    const g = gen(sel);
    if (g && confirm(`「${g.name}」を削除します。関係も一緒に外れます。`)) {
      db.genres = db.genres.filter(x => x.id !== sel);
      db.edges = db.edges.filter(e => e.a !== sel && e.b !== sel);
      db.majors.forEach(m => m.roots = m.roots.filter(x => x !== sel));
      db.works.forEach(w => w.genres = w.genres.filter(x => x !== sel));
      (db.events || []).forEach(e => e.genres = e.genres.filter(x => x !== sel));
      sel = null; save(); render();
    }
    return;
  }

  if (t.id === 'delM') {
    const m = db.majors.find(x => x.id === selM);
    if (m && confirm(`大ジャンル「${m.name}」を削除します。ジャンル自体は残ります。`)) {
      db.majors = db.majors.filter(x => x.id !== selM);
      selM = null; save(); render();
    }
    return;
  }

  if (t.id === 'delW') {
    const w = db.works.find(x => x.id === selW);
    if (w && confirm(`作品「${w.title}」を削除します。`)) {
      db.works = db.works.filter(x => x.id !== selW);
      selW = null; save(); render();
    }
    return;
  }

  if (t.id === 'delE') {
    const eObj = (db.events || []).find(x => x.id === selE);
    if (eObj && confirm(`出来事「${eObj.title}」を削除します。`)) {
      db.events = db.events.filter(x => x.id !== selE);
      db.edges = db.edges.filter(e => e.a !== selE && e.b !== selE);
      selE = null; save(); render();
    }
    return;
  }

  const newRelBtn = t.closest('[data-newrel-add]');
  if (newRelBtn) {
    const k = newRelBtn.dataset.newrelAdd;
    const d = REL.find(r => r.k === k);
    const g = gen(sel);
    const inp = document.querySelector(`[data-newrel-name="${k}"]`);
    const title = inp ? inp.value.trim() : '';
    if (g && d && title) {
      const newId = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      const newGenre = {
        id: newId,
        name: title,
        born: g.born != null ? g.born : null,
        desc: '',
        aliases: [],
        names: typeof isLatinText === 'function' && isLatinText(title) ? { ja: '', en: title } : { ja: title, en: '' }
      };
      db.genres.push(newGenre);
      db.edges.push(d.me === 'b' ? { t: d.t, a: newId, b: g.id } : { t: d.t, a: g.id, b: newId });
      if (typeof normalize === 'function') normalize();
      save();
      render();
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

  if (t.dataset && t.dataset.aliaslang !== undefined) {
    const g = gen(sel);
    const idx = +t.dataset.aliaslang;
    if (g && ALIAS_LANGS.includes(t.value)) {
      g.aliases = normalizeAliases(g.aliases);
      if (g.aliases[idx]) {
        g.aliases[idx].lang = t.value;
        save(); render();
      }
    }
    return;
  }

  if (!t.value) return;

  if (t.dataset.add) {
    const d = REL.find(r => r.k === t.dataset.add);
    const activeId = sel || selM || selE;
    db.edges.push(d.me === 'b' ? { t: d.t, a: t.value, b: activeId } : { t: d.t, a: activeId, b: t.value });
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
  if (!ev.target || ev.isComposing || ev.key !== 'Enter') return;
  if (ev.target.id === 'f-alias-input') {
    ev.preventDefault();
    $('#f-alias-add')?.click();
  } else if (ev.target.dataset && ev.target.dataset.newrelName) {
    ev.preventDefault();
    const k = ev.target.dataset.newrelName;
    document.querySelector(`[data-newrel-add="${k}"]`)?.click();
  }
});