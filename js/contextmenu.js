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