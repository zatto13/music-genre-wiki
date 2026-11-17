const KEY = 'genre-wiki.v1';
const REL = [
  {k:'up',   label:'上位ジャンル', t:'h', me:'b'},
  {k:'down', label:'下位ジャンル', t:'h', me:'a'},
  {k:'src',  label:'源流',         t:'i', me:'b'},
  {k:'inf',  label:'影響先',       t:'i', me:'a'}
];

const seed = () => ({
  genres:[
    {id:'g1',name:'ブルース',born:1890,desc:'(サンプル)アメリカ南部で生まれた音楽。'},
    {id:'g2',name:'ジャズ',born:1900,desc:'(サンプル)'},
    {id:'g3',name:'R&B',born:1940,desc:'(サンプル)'},
    {id:'g4',name:'ロックンロール',born:1950,desc:'(サンプル)'},
    {id:'g5',name:'ロック',born:1960,desc:'(サンプル)'},
    {id:'g6',name:'ハードロック',born:1968,desc:'(サンプル)'},
    {id:'g7',name:'ヘヴィメタル',born:1970,desc:'(サンプル)'},
    {id:'g8',name:'パンク',born:1974,desc:'(サンプル)'},
    {id:'g9',name:'ヒップホップ',born:1973,desc:'(サンプル)'}
  ],
  edges:[
    {t:'h',a:'g5',b:'g6'},{t:'h',a:'g6',b:'g7'},{t:'h',a:'g5',b:'g8'},{t:'h',a:'g4',b:'g5'},
    {t:'i',a:'g1',b:'g2'},{t:'i',a:'g1',b:'g3'},{t:'i',a:'g3',b:'g4'},{t:'i',a:'g1',b:'g6'},{t:'i',a:'g4',b:'g8'}
  ],
  works:[
    {id:'w1',title:'Cross Road Blues',artist:'Robert Johnson',year:1936,genres:['g1'],desc:'(サンプル)'},
    {id:'w2',title:'Rocket 88',artist:'Jackie Brenston and his Delta Cats',year:1951,genres:['g3','g4'],desc:'(サンプル)'},
    {id:'w3',title:'Paranoid',artist:'Black Sabbath',year:1970,genres:['g6','g7'],desc:'(サンプル)'},
    {id:'w4',title:'Never Mind the Bollocks',artist:'Sex Pistols',year:1977,genres:['g8'],desc:'(サンプル)'},
    {id:'w5',title:"Rapper's Delight",artist:'The Sugarhill Gang',year:1979,genres:['g9'],desc:'(サンプル)'}
  ],
  majors:[
    {id:'m1',name:'ブルース系',color:'#2e86de',roots:['g1','g3','g6']},
    {id:'m2',name:'ロック',color:'#e4572e',roots:['g4'],subs:[{id:'s1',name:'ハード/メタル',color:'#9b5de5',roots:['g6']}]}
  ]
});

