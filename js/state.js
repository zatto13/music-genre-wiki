let db, sel = null;
try { db = JSON.parse(localStorage.getItem(KEY)); } catch(e) {}
if (!db || !Array.isArray(db.genres) || !Array.isArray(db.edges)) db = seed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch(e) {} };
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const gen = id => db.genres.find(g => g.id === id);
const getEntity = id => db.genres.find(g => g.id === id) || db.majors.find(m => m.id === id);
const textW = s => [...String(s || '')].reduce((w,c) => w + (c.charCodeAt(0) > 255 ? 13 : 7.5), 0) + 26;

let selM = null, selW = null;
let focusTreeIds = null;
let ctxTarget = null;

const PALETTE = ['#e4572e','#2e86de','#3bb273','#9b5de5','#f2b134','#17bebb','#d6336c'];

/* ---------- 表示設定 ---------- */
let viewOpt = {newTop: true, release: false, released: [], minWeight: 0, minScale: 55, showWorks: true, precCap: 'd', axis: 'log', audioBase: '', showHier: true, showInfl: true, prune: true, majorSort: 'auto', bandOrder: 'center'};
try { Object.assign(viewOpt, JSON.parse(localStorage.getItem('genre-wiki.view')) || {}); } catch(e) {}
if (!Array.isArray(viewOpt.released)) viewOpt.released = [];
const saveView = () => { try { localStorage.setItem('genre-wiki.view', JSON.stringify(viewOpt)); } catch(e) {} };
