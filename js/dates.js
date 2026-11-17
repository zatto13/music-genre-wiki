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
