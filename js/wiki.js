/* ---------- Wiki View Mode ---------- */
let wikiQuery = '';

const wGLabel = g => (typeof resolveGenreLabel === 'function' ? resolveGenreLabel(g) : { name: String(g?.name ?? ''), aliases: g?.aliases || [] });
const aliasTextOf = a => (a && typeof a === 'object' ? String(a.text ?? '') : String(a ?? ''));
const aliasTagOf = a => {
  if (!a || typeof a !== 'object' || !a.lang) return '';
  return typeof ALIAS_LANG_LABEL === 'object' && ALIAS_LANG_LABEL[a.lang] ? ALIAS_LANG_LABEL[a.lang] : a.lang;
};

function parseInline(raw) {
  let s = esc(raw);

  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code>${c}</code>`);
    return `\x00CODE${codes.length - 1}\x00`;
  });

  s = s.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+\vert{}[^\s)]+)\)/g,
    (_, alt, url) => `<img class="wiki-img" src="${url}" alt="${alt}" loading="lazy">`);

  // [表示名](/work/作品名) 形式の内部作品リンク（単体 [表示名] より先に変換）
  s = s.replace(/\[([^\]]+)\]\((\/work\/[^)]+)\)/g, (_, label, workPath) => {
    const cleanLabel = label.trim();
    const rawQuery = workPath.replace(/^\/work\//i, '').trim();
    const wQuery = rawQuery.toLowerCase();
    const targetW = db.works.find(w =>
      String(w.id || '').toLowerCase() === wQuery ||
      String(w.title || '').toLowerCase() === wQuery
    );
    if (targetW) {
      return `<a class="wlink" data-work="${targetW.id}" title="作品: ${esc(targetW.title || '(無題)')}">${cleanLabel}</a>`;
    }
    return `<a class="wlink missing" data-missing="${esc(rawQuery)}" title="未登録の作品: ${esc(rawQuery)}">${cleanLabel}</a>`;
  });

  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, url) => `<a class="wlink ext" href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`);

  s = s.replace(/\[(\*{1,3})\s+([^\]]+)\]/g, (_, stars, body) => {
    if (stars.length === 3) return `<strong style="font-size:1.25em">${body}</strong>`;
    if (stars.length === 2) return `<strong style="font-size:1.1em">${body}</strong>`;
    return `<strong>${body}</strong>`;
  });
  s = s.replace(/\[\/\s+([^\]]+)\]/g, '<em>$1</em>');
  s = s.replace(/\[-\s+([^\]]+)\]/g, '<del>$1</del>');
  s = s.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g,
    '<a class="wlink ext" href="$1" target="_blank" rel="noopener noreferrer">$2 ↗</a>');

  s = s.replace(/\[([^\]]+)\]/g, (match, inner) => {
    const [targetRaw, aliasRaw] = inner.split('|');
    const name = targetRaw.trim();
    const label = (aliasRaw || targetRaw).trim();
    const low = name.toLowerCase();

    const targetG = db.genres.find(g => {
      const r = wGLabel(g);
      return String(g.name || '').toLowerCase() === low ||
        String(r.name || '').toLowerCase() === low ||
        (g.aliases || []).some(a => aliasTextOf(a).toLowerCase() === low) ||
        (r.aliases || []).some(a => aliasTextOf(a).toLowerCase() === low);
    });
    if (targetG) return `<a class="wlink" data-go="${targetG.id}">${label}</a>`;

    const targetM = db.majors.find(m => String(m.name || '').toLowerCase() === low);
    if (targetM) return `<a class="wlink" data-major="${targetM.id}">${label}</a>`;

    for (const maj of db.majors) {
      const targetSub = (maj.subs || []).find(sb => String(sb.name || '').toLowerCase() === low);
      if (targetSub) return `<a class="wlink" data-major="${maj.id}" title="中ジャンル: ${esc(targetSub.name)}">${label}</a>`;
    }

    const targetE = (db.events || []).find(e => String(e.title || '').toLowerCase() === low);
    if (targetE) return `<a class="wlink" data-event="${targetE.id}">⚡${label}</a>`;

    const targetW = db.works.find(w => String(w.title || '').toLowerCase() === low);
    if (targetW) return `<a class="wlink" data-work="${targetW.id}">💿${label}</a>`;

    return `<a class="wlink missing" data-missing="${esc(name)}" title="未登録の項目（クリックで新規作成）">${label}</a>`;
  });

  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*\s][^*]*)\*/g, '<em>$1</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  s = s.replace(/\x00CODE(\d+)\x00/g, (_, idx) => codes[+idx]);
  return s;
}

function formatWikiText(text, opts = { toc: true }) {
  if (!text || !text.trim()) {
    return '<span class="wiki-body empty">説明文はまだ記述されていません。右側のパネルからマークアップ記法（# 見出し、- リスト、[ジャンル名] リンク等）を使って編集できます。</span>';
  }

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const headings = [];
  let inCode = false, codeBuf = [];
  let listStack = [];
  let inQuote = false, quoteBuf = [];
  let tableBuf = [];

  const closeLists = () => {
    while (listStack.length) out.push(`</${listStack.pop()}>`);
  };
  const closeQuote = () => {
    if (inQuote) {
      out.push(`<blockquote class="wiki-quote">${quoteBuf.join('<br>')}</blockquote>`);
      inQuote = false; quoteBuf = [];
    }
  };
  const closeTable = () => {
    if (!tableBuf.length) return;
    const rows = tableBuf.map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    const hasSep = rows.length >= 2 && rows[1].every(c => /^:?-+:?$/.test(c));
    let html = '<table class="wiki-table">';
    if (hasSep) {
      html += '<thead><tr>' + rows[0].map(c => `<th>${parseInline(c)}</th>`).join('') + '</tr></thead><tbody>';
      rows.slice(2).forEach(r => { html += '<tr>' + r.map(c => `<td>${parseInline(c)}</td>`).join('') + '</tr>'; });
      html += '</tbody>';
    } else {
      html += '<tbody>';
      rows.forEach(r => { html += '<tr>' + r.map(c => `<td>${parseInline(c)}</td>`).join('') + '</tr>'; });
      html += '</tbody>';
    }
    html += '</table>';
    out.push(html);
    tableBuf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    if (/^```/.test(rawLine.trim())) {
      closeLists(); closeQuote(); closeTable();
      if (!inCode) {
        inCode = true; codeBuf = [];
      } else {
        out.push(`<pre class="wiki-pre"><code>${esc(codeBuf.join('\n'))}</code></pre>`);
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(rawLine);
      continue;
    }

    if (/^\|.+\|$/.test(rawLine.trim())) {
      closeLists(); closeQuote();
      tableBuf.push(rawLine.trim());
      continue;
    } else {
      closeTable();
    }

    if (/^>\s?/.test(rawLine)) {
      closeLists();
      inQuote = true;
      quoteBuf.push(parseInline(rawLine.replace(/^>\s?/, '')));
      continue;
    } else {
      closeQuote();
    }

    if (/^(-{3,}|\*{3,})$/.test(rawLine.trim())) {
      closeLists();
      out.push('<hr class="wiki-hr">');
      continue;
    }

    const hm = rawLine.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      closeLists();
      const lvl = hm[1].length;
      const id = 'wiki-h-' + headings.length;
      const cleanTitle = hm[2].trim();
      headings.push({ lvl, text: cleanTitle, id });
      const tag = lvl === 1 ? 'h3' : lvl === 2 ? 'h4' : 'h5';
      out.push(`<${tag} id="${id}" class="wiki-h wiki-h${lvl}">${parseInline(cleanTitle)}</${tag}>`);
      continue;
    }

    const ulm = rawLine.match(/^(\s*)[-*]\s+(.+)$/);
    if (ulm) {
      const depth = ulm[1].length >= 2 ? 2 : 1;
      while (listStack.length < depth) { out.push('<ul>'); listStack.push('ul'); }
      while (listStack.length > depth) { out.push(`</${listStack.pop()}>`); }
      if (listStack[listStack.length - 1] !== 'ul') {
        out.push(`</${listStack.pop()}><ul>`);
        listStack.push('ul');
      }
      out.push(`<li>${parseInline(ulm[2])}</li>`);
      continue;
    }

    const olm = rawLine.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olm) {
      const depth = olm[1].length >= 2 ? 2 : 1;
      while (listStack.length < depth) { out.push('<ol>'); listStack.push('ol'); }
      while (listStack.length > depth) { out.push(`</${listStack.pop()}>`); }
      if (listStack[listStack.length - 1] !== 'ol') {
        out.push(`</${listStack.pop()}><ol>`);
        listStack.push('ol');
      }
      out.push(`<li>${parseInline(olm[2])}</li>`);
      continue;
    }

    closeLists();

    if (!rawLine.trim()) {
      out.push('<div class="wiki-spacer"></div>');
      continue;
    }

    out.push(`<p class="wiki-p">${parseInline(rawLine)}</p>`);
  }

  closeLists(); closeQuote(); closeTable();
  if (inCode) out.push(`<pre class="wiki-pre"><code>${esc(codeBuf.join('\n'))}</code></pre>`);

  let tocHtml = '';
  if (opts.toc && headings.length >= 2) {
    tocHtml = `<nav class="wiki-toc"><strong>目次</strong><ol>` +
      headings.map(h => `<li class="toc-l${h.lvl}"><a href="#${h.id}" onclick="event.preventDefault();document.getElementById('${h.id}')?.scrollIntoView({behavior:'smooth'})">${esc(h.text)}</a></li>`).join('') +
      `</ol></nav>`;
  }

  return `<div class="wiki-body">${tocHtml}${out.join('')}</div>`;
}

function getAncestors(gid) {
  const ups = [];
  let cur = gid;
  const visited = new Set([cur]);
  while (true) {
    const parentEdge = db.edges.find(e => e.t === 'h' && e.b === cur && gen(e.a));
    if (!parentEdge || visited.has(parentEdge.a)) break;
    visited.add(parentEdge.a);
    ups.unshift(gen(parentEdge.a));
    cur = parentEdge.a;
  }
  return ups;
}

const entityLabel = x => {
  if (!x) return '';
  if (gen(x.id)) return wGLabel(x).name;
  return x.name || x.title || '';
};

function drawWiki() {
  const box = $('#wiki');
  if (!box || viewOpt.mode !== 'wiki') return;

  const navHtml = `
    <div class="wiki-nav">
      <button id="wikiHome">📚 全ジャンル目次</button>
      <input type="search" id="wikiSearch" placeholder="ジャンル・作品・出来事を検索..." value="${esc(wikiQuery)}">
      ${(sel || selM || selW || selE) ? `<button id="jumpToTl" title="この項目を選択した状態で年表に戻ります">📍 年表上の位置を見る</button>` : ''}
    </div>`;

  // 1. ジャンルが選択されている場合
  const g = gen(sel);
  if (g && !wikiQuery) {
    const curLabel = wGLabel(g);
    const mList = majorMap()[g.id] || [];
    const cols = colorMap()[g.id] || [];
    const headBg = cols.length ? cols[0] : 'var(--grid)';
    const headFg = cols.length ? textOn([cols[0]]) : 'var(--ink)';
    const ancestors = getAncestors(g.id);

    const upG = relList(g, REL[0]).map(r => getEntity(r.e.a)).filter(Boolean);
    const downG = relList(g, REL[1]).map(r => getEntity(r.e.b)).filter(Boolean);
    const srcG = relList(g, REL[2]).map(r => getEntity(r.e.a)).filter(Boolean);
    const infG = relList(g, REL[3]).map(r => getEntity(r.e.b)).filter(Boolean);
    const relWorks = db.works.filter(w => (w.genres || []).includes(g.id)).sort((a,b) => (tOf(a)||0) - (tOf(b)||0));
    const relEvents = (db.events || []).filter(e => (e.genres || []).includes(g.id)).sort((a,b) => (tOf(a)||0) - (tOf(b)||0));

    const chipLinks = arr => arr.length
      ? arr.map(x => `<a class="wlink" data-go="${x.id}">${esc(entityLabel(x))}</a>`).join('、')
      : '<span class="hint">—</span>';

    const aliasHtml = (curLabel.aliases || []).length
      ? curLabel.aliases.map(a => {
          const txt = esc(aliasTextOf(a));
          const tag = aliasTagOf(a);
          return tag ? `${txt} <span class="hint">[${esc(tag)}]</span>` : txt;
        }).join('、')
      : '<span class="hint">—</span>';

    box.innerHTML = `<div class="wiki-wrap">${navHtml}
      <article class="wiki-article">
        <div class="wiki-main">
          ${ancestors.length ? `<div class="wiki-sub">${ancestors.map(a => `<a class="wlink" data-go="${a.id}">${esc(wGLabel(a).name)}</a>`).join(' › ')} › ${esc(curLabel.name)}</div>` : ''}
          <h2 class="wiki-title">
            ${esc(curLabel.name)}
            ${mList.map(m => `<span class="wiki-badge" data-major="${m.id}" style="background:${m.color};color:${textOn([m.color])}">${esc(m.name)}</span>`).join('')}
          </h2>
          <div class="wiki-sub">成立時期: <strong>${dlabel(g)}</strong></div>
          ${formatWikiText(g.desc)}

          ${relEvents.length ? `<div class="wiki-section"><h3>⚡ 関連する出来事</h3><div class="wiki-cards">
            ${relEvents.map(ev => `<div class="wiki-card" data-event="${ev.id}">
              <h4><span>${esc(ev.title)}</span><span class="hint">${dlabel(ev)}</span></h4>
              ${ev.desc ? `<p>${esc(ev.desc)}</p>` : ''}
            </div>`).join('')}
          </div></div>` : ''}

          ${relWorks.length ? `<div class="wiki-section"><h3>💿 代表的な作品 (${relWorks.length})</h3><div class="wiki-cards">
            ${relWorks.map(w => {
              const u = typeof audioUrl === 'function' ? audioUrl(w) : '';
              return `<div class="wiki-card" data-work="${w.id}">
                <h4><span>${esc(w.title || '(無題)')}</span><span class="hint">${dlabel(w)}</span></h4>
                <div class="hint">${esc(w.artist || '')}</div>
                ${w.desc ? `<p>${esc(w.desc)}</p>` : ''}
                ${u ? `<audio controls preload="none" src="${esc(u)}" style="width:100%;height:28px;margin-top:8px" onclick="event.stopPropagation()"></audio>` : ''}
              </div>`;
            }).join('')}
          </div></div>` : ''}
        </div>

        <aside class="wiki-infobox">
          <div class="wiki-infobox-head" style="background:${headBg};color:${headFg}">${esc(curLabel.name)}</div>
          <table>
            <tr><th>誕生時期</th><td>${dlabel(g)}</td></tr>
            <tr><th>別名</th><td>${aliasHtml}</td></tr>
            <tr><th>大ジャンル</th><td>${mList.length ? mList.map(m => `<a class="wlink" data-major="${m.id}">${esc(m.name)}</a>`).join('、') : '<span class="hint">未所属</span>'}</td></tr>
            <tr><th>上位系統</th><td>${chipLinks(upG)}</td></tr>
            <tr><th>下位派生</th><td>${chipLinks(downG)}</td></tr>
            <tr><th>音楽的源流</th><td>${chipLinks(srcG)}</td></tr>
            <tr><th>影響先</th><td>${chipLinks(infG)}</td></tr>
          </table>
        </aside>
      </article>
    </div>`;
    return;
  }

  // 2. 大ジャンルが選択されている場合
  const m = db.majors.find(x => x.id === selM);
  if (m && !wikiQuery) {
    const mem = [...membersOf(m)].map(gen).filter(Boolean).sort(byBorn);
    const memIds = new Set(mem.map(g => g.id));
    const upM = relList(m, REL[0]).map(r => getEntity(r.e.a)).filter(Boolean);
    const downM = relList(m, REL[1]).map(r => getEntity(r.e.b)).filter(Boolean);
    const srcM = relList(m, REL[2]).map(r => getEntity(r.e.a)).filter(Boolean);
    const infM = relList(m, REL[3]).map(r => getEntity(r.e.b)).filter(Boolean);
    const chipLinks = arr => arr.length
      ? arr.map(x => `<a class="wlink" data-go="${x.id}">${esc(entityLabel(x))}</a>`).join('、')
      : '<span class="hint">—</span>';

    const majEvents = (db.events || [])
      .filter(ev => (ev.genres || []).some(gid => memIds.has(gid)))
      .sort((a, b) => (tOf(a) ?? 1e9) - (tOf(b) ?? 1e9) || String(a.title || '').localeCompare(String(b.title || '')));

    box.innerHTML = `<div class="wiki-wrap">${navHtml}
      <article class="wiki-article">
        <div class="wiki-main">
          <div class="wiki-sub">大ジャンル</div>
          <h2 class="wiki-title"><span class="dot" style="background:${m.color};width:18px;height:18px"></span>${esc(m.name)}</h2>
          ${formatWikiText(m.desc)}

          ${m.subs && m.subs.length ? `<div class="wiki-section"><h3>🎨 中ジャンル (${m.subs.length})</h3>
            <div style="display:flex;flex-direction:column;gap:12px">
              ${m.subs.map(sb => {
                const sbMem = [...subMembers(m, sb)].map(gen).filter(Boolean).sort(byBorn);
                return `<div style="background:var(--bg);border:1px solid var(--line);border-left:4px solid ${sb.color};border-radius:6px;padding:12px 16px">
                  <h4 style="margin:0 0 6px;font-size:15px;display:flex;align-items:center;gap:8px">
                    <span class="dot" style="background:${sb.color}"></span>${esc(sb.name)}
                    <span class="hint" style="font-weight:normal;font-size:12px">（所属 ${sbMem.length} 件）</span>
                  </h4>
                  ${sb.desc ? `<div style="font-size:13.5px;line-height:1.7;margin-bottom:8px">${formatWikiText(sb.desc, { toc: false })}</div>` : '<div class="hint" style="margin-bottom:8px">（説明未入力）</div>'}
                  <div style="font-size:12.5px;color:var(--sub)"><strong>所属:</strong> ${sbMem.map(g => `<a class="wlink" data-go="${g.id}">${esc(wGLabel(g).name)}</a>`).join('、') || 'なし'}</div>
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}

          ${majEvents.length ? `<div class="wiki-section"><h3>⚡ 関連する出来事 (${majEvents.length})</h3>
            <div class="wiki-cards">
              ${majEvents.map(ev => {
                const linkedGs = (ev.genres || []).filter(gid => memIds.has(gid)).map(gen).filter(Boolean);
                return `<div class="wiki-card" data-event="${ev.id}">
                  <h4><span>${esc(ev.title || '(無題)')}</span><span class="hint">${dlabel(ev)}</span></h4>
                  ${ev.desc ? `<p>${esc(ev.desc)}</p>` : ''}
                  ${linkedGs.length ? `<div style="margin-top:8px;font-size:11.5px;color:var(--sub)" onclick="event.stopPropagation()">関連: ${linkedGs.map(g => `<a class="wlink" data-go="${g.id}">${esc(wGLabel(g).name)}</a>`).join('、')}</div>` : ''}
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}

          <div class="wiki-section"><h3>所属ジャンル一覧（全 ${mem.length} 件・年代順）</h3>
            <div class="wiki-cards">
              ${mem.map(x => `<div class="wiki-card" data-go="${x.id}">
                <h4><span>${esc(wGLabel(x).name)}</span><span class="hint">${yr(x)}</span></h4>
                <p>${esc(x.desc || '（説明未入力）')}</p>
              </div>`).join('')}
            </div>
          </div>
        </div>

        <aside class="wiki-infobox">
          <div class="wiki-infobox-head" style="background:${m.color};color:${textOn([m.color])}">${esc(m.name)}</div>
          <table>
            <tr><th>種別</th><td>大ジャンル</td></tr>
            <tr><th>起点</th><td>${m.roots.map(gen).filter(Boolean).map(x => `<a class="wlink" data-go="${x.id}">${esc(wGLabel(x).name)}</a>`).join('、') || '<span class="hint">なし</span>'}</td></tr>
            <tr><th>所属数</th><td>${mem.length} ジャンル</td></tr>
            <tr><th>出来事数</th><td>${majEvents.length} 件</td></tr>
            <tr><th>上位系統</th><td>${chipLinks(upM)}</td></tr>
            <tr><th>下位派生</th><td>${chipLinks(downM)}</td></tr>
            <tr><th>音楽的源流</th><td>${chipLinks(srcM)}</td></tr>
            <tr><th>影響先</th><td>${chipLinks(infM)}</td></tr>
          </table>
        </aside>
      </article>
    </div>`;
    return;
  }

  // 3. 出来事または作品が選択されている場合
  const ev = (db.events || []).find(x => x.id === selE);
  if (ev && !wikiQuery) {
    const gl = (ev.genres || []).map(gen).filter(Boolean);
    box.innerHTML = `<div class="wiki-wrap">${navHtml}
      <article class="wiki-article" style="grid-template-columns:1fr">
        <div>
          <div class="wiki-sub">⚡ 出来事</div>
          <h2 class="wiki-title">${esc(ev.title)}</h2>
          <div class="wiki-sub">発生時期: <strong>${dlabel(ev)}</strong></div>
          ${formatWikiText(ev.desc)}
          <div class="wiki-section"><h3>関連するジャンル</h3>
            <p>${gl.map(x => `<a class="wlink" data-go="${x.id}">${esc(wGLabel(x).name)} (${yr(x)})</a>`).join('、') || '<span class="hint">なし</span>'}</p>
          </div>
        </div>
      </article>
    </div>`;
    return;
  }

  const wk = db.works.find(x => x.id === selW);
  if (wk && !wikiQuery) {
    const gl = (wk.genres || []).map(gen).filter(Boolean);
    const u = typeof audioUrl === 'function' ? audioUrl(wk) : '';
    box.innerHTML = `<div class="wiki-wrap">${navHtml}
      <article class="wiki-article" style="grid-template-columns:1fr">
        <div>
          <div class="wiki-sub">💿 作品</div>
          <h2 class="wiki-title">${esc(wk.title || '(無題)')}</h2>
          <div class="wiki-sub">アーティスト: <strong>${esc(wk.artist || '不明')}</strong> ／ 発表: <strong>${dlabel(wk)}</strong></div>
          ${u ? `<audio controls preload="none" src="${esc(u)}" style="width:100%;max-width:420px;margin:8px 0 16px"></audio>` : ''}
          ${formatWikiText(wk.desc)}
          <div class="wiki-section"><h3>ジャンル</h3>
            <p>${gl.map(x => `<a class="wlink" data-go="${x.id}">${esc(wGLabel(x).name)} (${yr(x)})</a>`).join('、') || '<span class="hint">なし</span>'}</p>
          </div>
        </div>
      </article>
    </div>`;
    return;
  }

  // 4. 未選択時 または 検索時：全ジャンルのポータル目次を表示
  const q = wikiQuery.trim().toLowerCase();
  const filteredG = [...db.genres].sort(byBorn).filter(x => {
    const r = wGLabel(x);
    return !q ||
      String(x.name || '').toLowerCase().includes(q) ||
      String(r.name || '').toLowerCase().includes(q) ||
      String(x.desc || '').toLowerCase().includes(q) ||
      (x.aliases || []).some(a => aliasTextOf(a).toLowerCase().includes(q)) ||
      (r.aliases || []).some(a => aliasTextOf(a).toLowerCase().includes(q));
  });
  const filteredE = (db.events || []).filter(x => q && (String(x.title || '').toLowerCase().includes(q) || String(x.desc || '').toLowerCase().includes(q)));
  const filteredW = db.works.filter(x => q && (String(x.title || '').toLowerCase().includes(q) || String(x.artist || '').toLowerCase().includes(q)));

  let portalHtml = `<div class="wiki-wrap">${navHtml}`;
  if (!q) {
    portalHtml += `<div class="wiki-section" style="margin-top:0;border-top:0"><h3>大ジャンルから探す</h3><div class="chips" style="gap:8px;margin-bottom:20px">
      ${db.majors.map(m => `<span class="wiki-badge" data-major="${m.id}" style="background:${m.color};color:${textOn([m.color])};font-size:13px;padding:4px 12px">${esc(m.name)} (${membersOf(m).size})</span>`).join('')}
    </div></div>`;
  }
  portalHtml += `<div class="wiki-section" style="margin-top:0;border-top:0"><h3>ジャンル一覧 (${filteredG.length}件)</h3><div class="wiki-cards">
    ${filteredG.map(x => `<div class="wiki-card" data-go="${x.id}">
      <h4><span>${esc(wGLabel(x).name)}</span><span class="hint">${yr(x)}</span></h4>
      <p>${esc(x.desc || '（説明未入力）')}</p>
    </div>`).join('')}
  </div></div>`;

  if (filteredE.length) {
    portalHtml += `<div class="wiki-section"><h3>一致した出来事 (${filteredE.length}件)</h3><div class="wiki-cards">
      ${filteredE.map(x => `<div class="wiki-card" data-event="${x.id}"><h4><span>⚡ ${esc(x.title)}</span><span class="hint">${dlabel(x)}</span></h4><p>${esc(x.desc || '')}</p></div>`).join('')}
    </div></div>`;
  }
  if (filteredW.length) {
    portalHtml += `<div class="wiki-section"><h3>一致した作品 (${filteredW.length}件)</h3><div class="wiki-cards">
      ${filteredW.map(x => `<div class="wiki-card" data-work="${x.id}"><h4><span>💿 ${esc(x.title)}</span><span class="hint">${dlabel(x)}</span></h4><p>${esc(x.artist || '')}</p></div>`).join('')}
    </div></div>`;
  }
  portalHtml += `</div>`;
  box.innerHTML = portalHtml;

  const sInput = $('#wikiSearch');
  if (sInput && q) { sInput.focus(); sInput.setSelectionRange(sInput.value.length, sInput.value.length); }
}

document.addEventListener('click', e => {
  if (e.target.id === 'modeTl') { setMode('tl'); return; }
  if (e.target.id === 'modeWiki') { setMode('wiki'); return; }
  if (e.target.id === 'wikiHome') { wikiQuery = ''; sel = selM = selW = selE = null; render(); return; }
  if (e.target.id === 'jumpToTl') { setMode('tl'); return; }

  const miss = e.target.closest('[data-missing]');
  if (miss) {
    const newName = miss.dataset.missing;
    if (confirm(`未登録のジャンル「${newName}」を新規作成しますか？`)) {
      const id = 'g' + Date.now().toString(36);
      const curG = gen(sel);
      db.genres.push({ id, name: newName, born: curG && curG.born != null ? curG.born : 2000, desc: '' });
      sel = id; selM = selW = selE = null;
      save(); render();
    }
    return;
  }

  if (viewOpt.mode === 'wiki' && (e.target.closest('[data-go]') || e.target.closest('[data-major]') || e.target.closest('[data-work]') || e.target.closest('[data-event]'))) {
    wikiQuery = '';
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'wikiSearch') {
    wikiQuery = e.target.value;
    drawWiki();
  }
});

document.addEventListener('dblclick', e => {
  const node = e.target.closest('.node');
  const evnode = e.target.closest('.evnode');
  const work = e.target.closest('.work');
  if (node) { sel = node.dataset.go; selM = selW = selE = null; setMode('wiki'); }
  else if (evnode) { selE = evnode.dataset.event; sel = selM = selW = null; setMode('wiki'); }
  else if (work) { selW = work.dataset.work; sel = selM = selE = null; setMode('wiki'); }
});

function setMode(m) {
  viewOpt.mode = m;
  saveView();
  const isWiki = m === 'wiki';
  if ($('#tl')) $('#tl').hidden = isWiki;
  if ($('#wiki')) $('#wiki').hidden = !isWiki;
  if ($('#modeTl')) $('#modeTl').classList.toggle('active', !isWiki);
  if ($('#modeWiki')) $('#modeWiki').classList.toggle('active', isWiki);
  document.body.classList.toggle('wiki-mode', isWiki);
  render();
}

function syncModeClass() {
  const isWiki = (typeof viewOpt !== 'undefined' && viewOpt.mode === 'wiki');
  document.body.classList.toggle('wiki-mode', isWiki);
}
syncModeClass();

function syncReadonlyMode() {
  const isReadonly = Boolean(typeof viewOpt !== 'undefined' && viewOpt.readonly);
  document.body.classList.toggle('readonly-mode', isReadonly);
  if ($('#modeRead')) {
    $('#modeRead').classList.toggle('active', isReadonly);
    $('#modeRead').setAttribute('aria-pressed', isReadonly ? 'true' : 'false');
  }
  if ($('#modeEdit')) {
    $('#modeEdit').classList.toggle('active', !isReadonly);
    $('#modeEdit').setAttribute('aria-pressed', !isReadonly ? 'true' : 'false');
  }
}

document.addEventListener('click', ev => {
  const btn = ev.target.closest('[data-readonly]');
  if (!btn) return;
  viewOpt.readonly = btn.dataset.readonly === '1';
  if (typeof saveView === 'function') saveView();
  syncReadonlyMode();
});

// 初期ロード時にも反映
if (typeof viewOpt !== 'undefined' && viewOpt.readonly === undefined) {
  viewOpt.readonly = false;
}
syncReadonlyMode();