/* ---------- detail / edit panel ---------- */
function relList(g, d) {
  const other = d.me === 'a' ? 'b' : 'a';
  return db.edges.map((e,i) => ({e,i})).filter(x => x.e.t === d.t && x.e[d.me] === g.id && getEntity(x.e[other]));
}
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
    if (!sel.dataset.add && !sel.dataset.addroot && !sel.dataset.addwg && !sel.dataset.addeg && !sel.dataset.addsubroot) return;
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
      rows.map(r => `<span class="chip"><span data-go="${r.e[other]}">${esc(getEntity(r.e[other]).name || getEntity(r.e[other]).title)}</span><button data-rm="${r.i}" title="関係を外す" aria-label="関係を外す">×</button></span>`).join('') +
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

function drawEventPanel(ev) {
  const gl = (ev.genres || []).map(gen).filter(Boolean);
  let h = `<label>出来事名<input id="f-etitle" value="${esc(ev.title)}"></label>
  ${dateFieldsHtml(ev, '発生', ['f-eyear', 'f-em', 'f-ed', 'f-ep'])}
  <label>説明<textarea id="f-edesc">${esc(ev.desc || '')}</textarea></label>
  <div class="rel"><h4>関連ジャンル</h4><div class="chips">` +
    gl.map(g => `<span class="chip"><span data-go="${g.id}">${esc(g.name)}</span><button data-rmeg="${ev.id}:${g.id}" title="関連から外す" aria-label="関連から外す">×</button></span>`).join('') +
    `</div><select data-addeg="e"><option value="">関連づけるジャンルを選ぶ</option>` +
    [...db.genres].sort(byBorn).filter(g => !ev.genres.includes(g.id)).map(g => `<option value="${g.id}">${esc(g.name)}(${yr(g)})</option>`).join('') +
    `</select></div>`;
  h += `<button class="del" id="delE">この出来事を削除</button>`;
  $('#panel').innerHTML = h;
  enhanceSelects();
}

function drawPanel() {
  const m = db.majors.find(x => x.id === selM);
  const wk = db.works.find(x => x.id === selW);
  const ev = (db.events || []).find(x => x.id === selE);
  if (wk) return drawWorkPanel(wk);
  if (ev) return drawEventPanel(ev);
  if (m) return drawMajorPanel(m);
  const g = gen(sel);
  if (!g) {
    let h = '<p class="hint">年表上の要素、または下のリストから選んで編集できます。</p>';
    if (db.majors.length) {
      h += '<div class="rel" style="margin-top:0; border-top:0"><h4>大ジャンル (ドラッグで順序入替)</h4><div id="major-list" style="display:flex;flex-direction:column;gap:6px;">';
      h += db.majors.map(m => `<div class="chip major-item" draggable="true" data-mid="${m.id}" style="cursor:grab;padding:6px 12px;justify-content:flex-start;"><span data-major="${m.id}" style="flex:1;"><i class="dot" style="background:${m.color}"></i>${esc(m.name)}</span><span style="color:var(--sub);font-size:16px;cursor:grab;">≡</span></div>`).join('');
      h += '</div></div>';
    }
    if (db.events && db.events.length) {
      h += '<div class="rel"><h4>出来事一覧</h4><div class="chips">';
      h += db.events.map(e => `<span class="chip"><span data-event="${e.id}">${esc(e.title || '(無題)')}</span></span>`).join('');
      h += '</div></div>';
    }
    if (db.works.length) {
      h += '<div class="rel"><h4>作品一覧</h4><div class="chips">';
      h += db.works.map(w => `<span class="chip"><span data-work="${w.id}">${esc(w.title || '(無題)')}</span></span>`).join('');
      h += '</div></div>';
    }
    if (!db.majors.length && !db.works.length && !(db.events && db.events.length)) h += '<p class="hint">大ジャンルや作品・出来事がありません。</p>';
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
      rows.map(r => `<span class="chip"><span data-go="${r.e[other]}">${esc(getEntity(r.e[other]).name || getEntity(r.e[other]).title)}</span><button data-rm="${r.i}" title="関係を外す" aria-label="関係を外す">×</button></span>`).join('') +
      `</div><select data-add="${d.k}"><option value="">追加するジャンルを選ぶ</option>` +
      [...db.genres].sort(byBorn).filter(o => o.id !== g.id && !used.has(o.id))
        .map(o => `<option value="${o.id}">${esc(o.name)}(${yr(o)})</option>`).join('') + `</select></div>`;
  });

  const aliases = g.aliases || [];
  h += `<div class="rel"><h4>別名・表記揺れ</h4><div class="chips">` +
    aliases.map((a, idx) => `<span class="chip"><span>${esc(a)}</span><button data-promotealias="${idx}" title="この別名をメインの名前にする" aria-label="メインにする" style="color:var(--hier);font-weight:bold">↑</button><button data-rmalias="${idx}" title="別名を削除" aria-label="別名を削除">×</button></span>`).join('') +
    `</div><div style="display:flex;gap:6px"><input id="f-alias-input" placeholder="例: IDM, 略称（カンマ区切り可）" style="flex:1;min-width:0;padding:5px 8px;background:var(--bg);border:1px solid var(--line);border-radius:6px;font-size:13px"><button id="f-alias-add" type="button">追加</button></div><p class="hint">↑ を押すと別名をメイン名に昇格し、元の名前を別名へ移します。</p></div>`;

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
  h += `<div class="rel"><h4>関連する出来事</h4><div class="chips">` +
    (db.events || []).filter(e => e.genres.includes(g.id)).map(e => `<span class="chip"><span data-event="${e.id}">${esc(e.title || '(無題)')}</span><button data-rmeg="${e.id}:${g.id}" title="このジャンルから外す" aria-label="このジャンルから外す">×</button></span>`).join('') +
    `</div><select data-addeg="g"><option value="">既存の出来事をこのジャンルに関連づける</option>` +
    (db.events || []).filter(e => !e.genres.includes(g.id)).map(e => `<option value="${e.id}">${esc(e.title || '(無題)')}(${yr(e)})</option>`).join('') +
    `</select><button id="addEG" style="margin-top:6px">このジャンルの出来事を新規追加</button></div>`;
  h += `<p class="hint">関係は片側だけ登録すれば、反対側にも自動で表示されます。</p><button class="del" id="del">このジャンルを削除</button>`;
  $('#panel').innerHTML = h;
  enhanceSelects();
}