
$('#newTop').checked = viewOpt.newTop;
$('#newTop').onchange = e => {
  viewOpt.newTop = e.target.checked;
  saveView();
  drawTimeline();
};


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

