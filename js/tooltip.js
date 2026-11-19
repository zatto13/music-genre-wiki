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
  const evnode = e.target.closest('.evnode');
  const flag = e.target.closest('.flag');
  
  if (node) {
    const g = gen(node.dataset.go);
    if (g) {
      const { name, aliases } = typeof resolveGenreLabel === 'function'
        ? resolveGenreLabel(g)
        : { name: String(g.name ?? ''), aliases: g.aliases || [] };
      const aliasHtml = aliases.length
        ? `<div style="margin-top:2px;font-size:11.5px;color:var(--hier)">別名: ${esc(aliases.join(' / '))}</div>`
        : '';
      tipEl.innerHTML = `<strong>${esc(name)}</strong>${aliasHtml}${g.desc ? '<div style="margin-top:4px;font-size:12px;color:var(--sub)">' + esc(g.desc) + '</div>' : ''}`;
      tipEl.classList.add('show');
    }
  } else if (work) {
    const w = db.works.find(x => x.id === work.dataset.work);
    if (w) {
      tipEl.innerHTML = `<strong>${esc(w.title || '(無題)')}</strong>${w.artist ? ' / ' + esc(w.artist) : ''}<div style="margin-top:4px;font-size:12px;color:var(--sub)">${tOf(w) != null ? dlabel(w) : ''}${w.desc ? '<br>' + esc(w.desc) : ''}</div>`;
      tipEl.classList.add('show');
    }
  } else if (evnode) {
    const ev = (db.events || []).find(x => x.id === evnode.dataset.event);
    if (ev) {
      tipEl.innerHTML = `<strong>${esc(ev.title || '(無題)')}</strong> <span style="font-size:11px;color:var(--infl)">[出来事]</span><div style="margin-top:4px;font-size:12px;color:var(--sub)">${tOf(ev) != null ? dlabel(ev) : ''}${ev.desc ? '<br>' + esc(ev.desc) : ''}</div>`;
      tipEl.classList.add('show');
    }
  } else if (flag) {
    const m = db.majors.find(x => x.id === flag.dataset.major);
    const sb = m && flag.dataset.sub ? m.subs.find(x => x.id === flag.dataset.sub) : null;
    if (sb) {
      tipEl.innerHTML = `<strong>${esc(sb.name)}</strong> <span style="font-size:11px;color:var(--sub)">[中ジャンル / ${esc(m.name)}]</span>${sb.desc ? '<div style="margin-top:4px;font-size:12px;color:var(--sub)">' + esc(sb.desc) + '</div>' : ''}`;
      tipEl.classList.add('show');
    } else if (m) {
      tipEl.innerHTML = `<strong>${esc(m.name)}</strong> <span style="font-size:11px;color:var(--sub)">[大ジャンル]</span>${m.desc ? '<div style="margin-top:4px;font-size:12px;color:var(--sub)">' + esc(m.desc) + '</div>' : ''}`;
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
  if (e.target.closest('.node') || e.target.closest('.work') || e.target.closest('.evnode') || e.target.closest('.flag')) {
    tipEl.classList.remove('show');
  }
});