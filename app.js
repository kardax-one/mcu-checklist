'use strict';
const {titles,chronology}=window.MCU_DATA;
const byId=Object.fromEntries(titles.map(t=>[t.id,t]));
const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const posters=Object.fromEntries(Object.entries(window.MCU_POSTERS||{}).map(([k,v])=>[normalize(k),v]));
const doomTitles = new Set([
  'Captain America: The First Avenger', 'The Avengers', 'Avengers: Infinity War',
  'Avengers: Endgame', 'Loki', 'Shang-Chi and the Legend of the Ten Rings',
  'Spider-Man: No Way Home', 'Doctor Strange in the Multiverse of Madness',
  'Black Panther: Wakanda Forever', 'Loki season 2', 'Deadpool & Wolverine',
  'Captain America: Brave New World', 'Thunderbolts*',
  'The Fantastic Four: First Steps', 'VisionQuest'
]);
// Phase assignments follow the MCU Wiki; legacy TV and unphased animation stay separate.
function phaseFor(t) {
  if (t.kind === 'movie') {
    if (t.release <= 7) return 1;
    if (t.release <= 20) return 2;
    if (t.release <= 56) return 3;
    if (t.release <= 75) return 4;
    if (t.release <= 90) return 5;
    return 6;
  }
  if (t.kind === 'short') return t.year <= 2012 ? 1 : t.year <= 2014 ? 2 : 3;
  if (t.year < 2021 || ['Eyes of Wakanda', 'Marvel Zombies'].includes(t.title)) return 0;
  return t.year <= 2022 ? 4 : t.year <= 2025 ? 5 : 6;
}
const phaseNames = {1:'Phase 1',2:'Phase 2',3:'Phase 3',4:'Phase 4',5:'Phase 5',6:'Phase 6',0:'Outside the phases'};
let watched=new Set(),order='release',groupPhases=true,collapsed=new Set();
try{const state=JSON.parse(localStorage.getItem('mcu-archive-v1')||'{}');watched=new Set(Array.isArray(state.watched)?state.watched:[]);order=state.order==='chronological'?'chronological':'release';groupPhases=state.groupPhases!==false;collapsed=new Set(Array.isArray(state.collapsed)?state.collapsed:[])}catch{}
const $=s=>document.querySelector(s),track=$('#track'),timeline=$('#timeline');
function save(){try{localStorage.setItem('mcu-archive-v1',JSON.stringify({watched:[...watched],order,groupPhases,collapsed:[...collapsed]}))}catch{$('#status').textContent='Browser storage is unavailable. Progress is saved only until this page closes.'}}
function isDone(t){return t.units.every(u=>watched.has(u))}
function updateProgress(){updatePhaseHeaders();const done=titles.filter(isDone).length;$('#done').textContent=done;$('#total').textContent=titles.length;$('#percent').textContent=Math.round(done/titles.length*100)+'%';$('#progress-fill').style.width=done/titles.length*100+'%'}
function posterFor(t){return posters[normalize(t.title)]||posters[normalize(t.title.replace(/ season \d+$/,''))]}
function makeCard(t,units,episode,index,axisLabel){const complete=units.every(u=>watched.has(u));const slot=document.createElement('article');slot.className=`slot ${t.kind==='movie'?'movie':'lower'}${complete?' watched':''}${doomTitles.has(t.title)?' doom-story':''}`;const card=document.createElement('div');card.className='card';const poster=document.createElement('div');poster.className='poster';const fallback=document.createElement('div');fallback.className='fallback';fallback.textContent=t.title;poster.append(fallback);const art=posterFor(t);if(art?.url){const img=document.createElement('img');img.src=art.url;img.alt=t.title+' poster';img.loading=index<9?'eager':'lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>{img.remove();fallback.title='Poster unavailable'});poster.append(img)}const badge=document.createElement('span');badge.className='badge';badge.textContent=t.kind==='movie'?'FILM':t.kind.toUpperCase();poster.append(badge);const label=document.createElement('label');label.className='watch';const check=document.createElement('input');check.type='checkbox';check.checked=complete;check.indeterminate=!complete&&units.some(u=>watched.has(u));check.setAttribute('aria-label',`Watched ${t.title}${episode?' — '+episode:''}`);label.append(check,document.createTextNode('Watched'));poster.append(label);const heading=document.createElement('h2');heading.textContent=t.title;heading.title=t.title;const meta=document.createElement('div');meta.className='meta';const year=document.createElement('span');year.textContent=t.year;const detail=document.createElement('span');detail.textContent=episode;meta.append(year,detail);card.append(poster,heading,meta);const stem=document.createElement('div');stem.className='stem';const node=document.createElement('span');node.className='node';const axis=document.createElement('span');axis.className='axis-year';axis.textContent=axisLabel;slot.append(stem,node,axis,card);check.addEventListener('change',()=>{units.forEach(u=>check.checked?watched.add(u):watched.delete(u));check.indeterminate=false;slot.classList.toggle('watched',check.checked);save();updateProgress();$('#status').textContent=`${t.title} marked ${check.checked?'watched':'unwatched'}.`;if($('#unwatched').checked)render()});return slot}
function updatePhaseHeaders() {
  document.querySelectorAll('.phase-toggle').forEach(button => {
    const phase=Number(button.dataset.phase);
    const members=titles.filter(t=>phaseFor(t)===phase);
    const done=members.filter(isDone).length;
    button.querySelector('.phase-count').textContent=`${done} / ${members.length} watched`;
    button.classList.toggle('complete',done===members.length);
  });
}
function render() {
  const query=normalize($('#search').value),type=$('#type').value;
  const rows=order==='release'
    ? [...titles].sort((a,b)=>a.release-b.release).map((t,i)=>({t,units:t.units,episode:'',rank:i+1}))
    : chronology.map(c=>({t:byId[c.titleId],units:[c.unit],episode:c.episode,rank:c.rank+1}));
  const filtered=rows.filter(({t,units})=>(type==='all'||t.kind===type||type==='other'&&['short','special'].includes(t.kind))&&normalize(t.title).includes(query)&&(!$('#unwatched').checked||!units.every(u=>watched.has(u))));
  const grouping=order==='release'&&groupPhases;
  track.classList.toggle('grouped',grouping);
  finaleObserver.disconnect();
  track.replaceChildren();
  const years=new Set();
  function appendRows(parent,list) {
    list.forEach(({t,units,episode,rank})=>{
      const axis=order==='release'?(years.has(t.year)?'':String(t.year)):String(rank).padStart(2,'0');
      years.add(t.year);
      parent.append(makeCard(t,units,episode,rank-1,axis));
    });
  }
  if(grouping) {
    for(const phase of [1,2,3,4,5,6,0]) {
      const members=filtered.filter(({t})=>phaseFor(t)===phase);
      if(!members.length) continue;
      const group=document.createElement('section');group.className='phase-group';
      const button=document.createElement('button');button.className='phase-toggle';button.dataset.phase=phase;
      button.setAttribute('aria-expanded',String(!collapsed.has(phase)));
      button.setAttribute('aria-controls',`phase-stories-${phase}`);
      const name=document.createElement('strong');name.textContent=phaseNames[phase];
      const count=document.createElement('span');count.className='phase-count';
      const chevron=document.createElement('span');chevron.className='phase-chevron';chevron.textContent=collapsed.has(phase)?'▸':'▾';
      button.append(chevron,name,count);
      const content=document.createElement('div');content.className='phase-stories';content.id=`phase-stories-${phase}`;
      content.hidden=collapsed.has(phase);
      group.classList.toggle('collapsed',collapsed.has(phase));
      if(!content.hidden) appendRows(content,members);
      button.addEventListener('click',()=>{
        const left=timeline.scrollLeft;
        collapsed.has(phase)?collapsed.delete(phase):collapsed.add(phase);
        save();render();timeline.scrollLeft=left;
        document.querySelector(`.phase-toggle[data-phase="${phase}"]`)?.focus({preventScroll:true});
      });
      group.append(button,content);track.append(group);
    }
  } else appendRows(track,filtered);
  if(filtered.length) {
    const finale=document.createElement('div');finale.className='doom-finale';
    finale.setAttribute('aria-label','The road leads to Avengers: Doomsday');
    const image=document.createElement('img');image.src='https://static.wikia.nocookie.net/marvelcinematicuniverse/images/0/07/Doctor_Doom_Infobox.png/revision/latest?cb=20260726013713';image.alt='Doctor Doom';image.loading='lazy';image.referrerPolicy='no-referrer';
    const text=document.createElement('div');text.className='doom-caption';
    const eyebrow=document.createElement('span');eyebrow.textContent='EVERY ROAD LEADS HERE';
    const title=document.createElement('strong');title.textContent='DOOMSDAY';text.append(eyebrow,title);finale.append(image,text);track.append(finale);
    finaleObserver.observe(finale);
  }
  $('#empty').hidden=filtered.length>0;
  $('#showing').textContent=`${filtered.length} ${order==='release'?'STORIES':'CHAPTERS'} TO EXPLORE`;
  $('#group-phases').checked=groupPhases;
  $('#group-control').hidden=order!=='release';
  $('#collapse-all').disabled=!grouping||Object.keys(phaseNames).every(p=>collapsed.has(Number(p)));
  $('#expand-all').disabled=!grouping||collapsed.size===0;
  document.querySelectorAll('[data-order]').forEach(b=>{b.classList.toggle('active',b.dataset.order===order);b.setAttribute('aria-pressed',String(b.dataset.order===order))});
  $('#order-note').textContent=order==='release'
    ? grouping?'Grouped by wiki phase; stories within each group follow release order.':'Follow the universe as it unfolded, one release at a time.'
    : 'Follow the story timeline. Split seasons use episode groups; years show original release.';
  updateProgress();
}
const finaleObserver=new IntersectionObserver(entries=>{
  for(const entry of entries) if(entry.isIntersecting) entry.target.classList.add('revealed');
},{root:timeline,threshold:0.15});
function setAllPhases(isCollapsed) {
  collapsed=isCollapsed?new Set(Object.keys(phaseNames).map(Number)):new Set();
  save();render();timeline.scrollLeft=0;
  $('#status').textContent=isCollapsed?'All phases collapsed.':'All phases expanded.';
}
$('#collapse-all').addEventListener('click',()=>setAllPhases(true));
$('#expand-all').addEventListener('click',()=>setAllPhases(false));
$('#group-phases').addEventListener('change',()=>{groupPhases=$('#group-phases').checked;save();render();timeline.scrollLeft=0});
document.querySelectorAll('[data-order]').forEach(b=>b.addEventListener('click',()=>{order=b.dataset.order;save();render();timeline.scrollLeft=0}));['#type','#unwatched'].forEach(s=>$(s).addEventListener('change',()=>{render();timeline.scrollLeft=0}));$('#search').addEventListener('input',()=>{render();timeline.scrollLeft=0});$('#previous').addEventListener('click',()=>timeline.scrollBy({left:-timeline.clientWidth*.75}));$('#next').addEventListener('click',()=>timeline.scrollBy({left:timeline.clientWidth*.75}));timeline.addEventListener('keydown',e=>{if(e.target!==timeline)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();timeline.scrollBy({left:e.key==='ArrowRight'?206:-206})}});$('#reset').addEventListener('click',()=>{if(confirm('Reset all watched progress in this browser?')){watched.clear();save();render();$('#status').textContent='Watch progress reset.'}});const sources=new Set();for(const t of titles){const p=posterFor(t);if(p?.source&&!sources.has(p.source)){sources.add(p.source);const a=document.createElement('a');a.href=p.source;a.textContent=t.title;a.target='_blank';a.rel='noreferrer';$('#credits').append(a)}}render();
