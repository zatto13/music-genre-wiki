if($('#addMenu')) $('#addMenu').onchange = (e) => {
  const val = e.target.value;
  e.target.value = "";
  if (val === 'genre') {
    const id = 'g' + Date.now().toString(36);
    db.genres.push({id, name:'新しいジャンル', born:2000, desc:''});
    sel = id; selM = selW = null; save(); render();
    const f = $('#f-name'); if (f) { f.focus(); f.select(); }
  } else if (val === 'major') {
    const id = 'm' + Date.now().toString(36);
    db.majors.push({id, name:'新しい大ジャンル', color: PALETTE[db.majors.length % PALETTE.length], roots:[], subs:[]});
    selM = id; sel = selW = null; save(); render();
    const f = $('#f-mname'); if (f) { f.focus(); f.select(); }
  } else if (val === 'work') {
    addWork(sel);
  }
};

