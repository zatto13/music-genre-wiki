function addWork(genreId) {
  const id = 'w' + Date.now().toString(36);
  const g = genreId ? gen(genreId) : null;
  db.works.push({
    id,
    title: '新しい作品',
    artist: '',
    year: g && g.born != null ? g.born : 2000,
    ym: null, yd: null, yp: null,
    genres: g ? [g.id] : [],
    desc: '',
    audio: ''
  });
  selW = id; sel = selM = selE = null;
  save(); render();
  const f = $('#f-wtitle'); if (f) { f.focus(); f.select(); }
}

function addEvent(genreId) {
  const id = 'e' + Date.now().toString(36);
  const g = genreId ? gen(genreId) : null;
  if (!Array.isArray(db.events)) db.events = [];
  db.events.push({
    id,
    title: '新しい出来事',
    year: g && g.born != null ? g.born : 2000,
    ym: null, yd: null, yp: null,
    genres: g ? [g.id] : [],
    desc: ''
  });
  selE = id; sel = selM = selW = null;
  save(); render();
  const f = $('#f-etitle'); if (f) { f.focus(); f.select(); }
}

if ($('#addMenu')) $('#addMenu').onchange = (e) => {
  const val = e.target.value;
  e.target.value = "";

  if (val === 'genre') {
    const id = 'g' + Date.now().toString(36);
    db.genres.push({id, name:'新しいジャンル', born:2000, desc:''});
    sel = id; selM = selW = selE = null; save(); render();
    const f = $('#f-name'); if (f) { f.focus(); f.select(); }

  } else if (val === 'major') {
    const id = 'm' + Date.now().toString(36);
    db.majors.push({id, name:'新しい大ジャンル', color: PALETTE[db.majors.length % PALETTE.length], roots:[], subs:[]});
    selM = id; sel = selW = selE = null; save(); render();
    const f = $('#f-mname'); if (f) { f.focus(); f.select(); }

  } else if (val === 'work') {
    addWork(sel);

  } else if (val === 'event') {
    addEvent(sel);
  }
};