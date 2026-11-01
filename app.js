"use strict";
/* Miya Lab M6 — compact adaptive build + real emblem/spell art below items. */
const DATA=window.MIYA_DATA, byId=id=>document.getElementById(id);
const H=new Map(DATA.heroes.map(h=>[h.name,h])), I=DATA.items;
const selected={enemy:[],ally:[]}, iconsReady=new Map();
const state={counterMode:false,offenseSwap:false};
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>s.toLowerCase().replace(/[.'’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const svgUri=svg=>`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
const heroUrls=name=>{
  const special={"Chang'e":'chang27e','Lapu-Lapu':'lapu-lapu','Yi Sun-shin':'yi_sun-shin'};
  const key=slug(name),file=special[name]||key.replaceAll('-','_');
  return [`https://raw.githubusercontent.com/Ceplin03/database-mlbb.Mobile-Legends-Bang-Bang/master/images-hero/${file}.png`,
    `https://mlbbhub.com/images/heroes/${key}.png`,`./assets/heroes/${key}.svg`];
};
const itemUrls=id=>[...I[id].imgs,`./assets/items/${id}.svg`];
const LOCAL_ICONS={
  emblem:svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8ec5ff"/><stop offset="1" stop-color="#d2adff"/></linearGradient></defs><rect rx="14" width="64" height="64" fill="#15233a"/><circle cx="32" cy="32" r="20" fill="url(#g)" opacity=".95"/><path d="M20 37c8-1 16-7 24-16-1 7-4 12-9 16 3 0 6 2 9 6-7-2-14-2-24-6Z" fill="#10243f" opacity=".92"/><path d="M18 22c6 2 12 6 14 11" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/></svg>`),
  Inspire:svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd76a"/><stop offset="1" stop-color="#ff9855"/></linearGradient></defs><rect rx="14" width="64" height="64" fill="#251a12"/><circle cx="32" cy="32" r="21" fill="url(#g)"/><path d="M32 13l4 10 10-4-4 10 10 3-10 3 4 10-10-4-4 10-4-10-10 4 4-10-10-3 10-3-4-10 10 4z" fill="#fff" fill-opacity=".92"/></svg>`),
  Flicker:svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8fd8ff"/><stop offset="1" stop-color="#4f83ff"/></linearGradient></defs><rect rx="14" width="64" height="64" fill="#10192e"/><circle cx="32" cy="32" r="21" fill="url(#g)"/><path d="M24 18l11 0-6 12h11L28 46l5-12H22z" fill="#fff" fill-opacity=".94"/></svg>`),
  Purify:svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c3f9ff"/><stop offset="1" stop-color="#69d6ff"/></linearGradient></defs><rect rx="14" width="64" height="64" fill="#102631"/><circle cx="32" cy="32" r="21" fill="url(#g)"/><path d="M32 18c6 8 11 14 11 20a11 11 0 1 1-22 0c0-6 5-12 11-20Z" fill="#fff" fill-opacity=".92"/><path d="M27 39c2 3 8 3 10-1" stroke="#3cb3e8" stroke-width="3" stroke-linecap="round"/></svg>`)
};
const EMBLEM_URLS={
  Marksman:[
    'https://raw.githubusercontent.com/Ceplin03/database-mlbb.Mobile-Legends-Bang-Bang/master/logo-emblem/marksman.png',
    'https://raw.githubusercontent.com/Ceplin03/database-mlbb.Mobile-Legends-Bang-Bang/master/logo-emblem/marksman_emblem.png',
    'https://mlbbhub.com/images/emblems/marksman.png',
    'https://mobile-legends.fandom.com/wiki/Special:Redirect/file/Marksman_Emblem.png',
    LOCAL_ICONS.emblem
  ]
};
const SPELL_URLS={
  Inspire:[
    'https://raw.githubusercontent.com/Ceplin03/database-mlbb.Mobile-Legends-Bang-Bang/master/logo-battle-spell/inspire.png',
    'https://mlbbhub.com/images/spells/inspire.png',
    'https://mobile-legends.fandom.com/wiki/Special:Redirect/file/Battle_Spell_Inspire.png',
    LOCAL_ICONS.Inspire
  ],
  Flicker:[
    'https://raw.githubusercontent.com/Ceplin03/database-mlbb.Mobile-Legends-Bang-Bang/master/logo-battle-spell/flicker.png',
    'https://mlbbhub.com/images/spells/flicker.png',
    'https://mobile-legends.fandom.com/wiki/Special:Redirect/file/Battle_Spell_Flicker.png',
    LOCAL_ICONS.Flicker
  ],
  Purify:[
    'https://raw.githubusercontent.com/Ceplin03/database-mlbb.Mobile-Legends-Bang-Bang/master/logo-battle-spell/purify.png',
    'https://mlbbhub.com/images/spells/purify.png',
    'https://mobile-legends.fandom.com/wiki/Special:Redirect/file/Battle_Spell_Purify.png',
    LOCAL_ICONS.Purify
  ]
};
const emblemUrls=name=>EMBLEM_URLS[name]||[LOCAL_ICONS.emblem];
const spellUrls=name=>SPELL_URLS[name]||[LOCAL_ICONS.Flicker];
function artFace(urls,name,small=false){
  const primary=iconsReady.get(name)||urls[0];
  const all=[primary,...urls.filter(u=>u!==primary)];
  return `<span class="face ${small?'sm':''}"><img alt="${esc(name)}" src="${esc(all[0])}" data-urls="${esc(encodeURIComponent(JSON.stringify(all)))}" data-next="1" loading="lazy" referrerpolicy="no-referrer" onerror="retryImage(this)"><span class="letters">${esc(name.slice(0,2).toUpperCase())}</span></span>`;
}
window.retryImage=img=>{
  let all=[];
  try{all=JSON.parse(decodeURIComponent(img.dataset.urls));}catch(e){img.remove();return;}
  const n=Number(img.dataset.next)||0;
  if(n<all.length){img.dataset.next=String(n+1);img.src=all[n];}
  else{img.onerror=null;img.remove();}
};
function saveDraft(){
  try{localStorage.setItem('miya-lab-draft-v1',JSON.stringify(selected));
    localStorage.setItem('miya-lab-match-v2',JSON.stringify(state));}catch(e){}
}
function loadDraft(){
  try{
    const draft=JSON.parse(localStorage.getItem('miya-lab-draft-v1')||'{}');
    const used=new Set(['Miya']);
    for(const type of ['enemy','ally']){
      const limit=type==='enemy'?5:4;
      selected[type]=(Array.isArray(draft[type])?draft[type]:[]).filter(name=>{
        if(!H.has(name)||used.has(name))return false;
        used.add(name);return true;
      }).slice(0,limit);
    }
  }catch(e){}
  try{
    const old=JSON.parse(localStorage.getItem('miya-lab-match-v2')||'{}');
    state.counterMode=!!old.counterMode;state.offenseSwap=!!old.offenseSwap;
  }catch(e){}
}
function metaRank(h){return h.tier==='S'?0:h.tier==='A'?1:h.proMeta?2:3;}
function renderTeam(type){
  const names=selected[type],limit=type==='enemy'?5:4;
  byId(type+'Count').textContent=`${names.length}/${limit}`;
  byId(type+'Slots').innerHTML=Array.from({length:limit},(_,i)=>{
    const name=names[i];return name?`<button type="button" class="slot chosen" data-remove="${i}" title="Hapus ${esc(name)}">${artFace(heroUrls(name),name)}<span>${esc(name)}</span><b class="x">×</b></button>`:'<span class="slot blank">+</span>';
  }).join('');
  byId(type+'Slots').querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{
    names.splice(Number(el.dataset.remove),1);saveDraft();renderTeam('enemy');renderTeam('ally');build();
  });
  const full=names.length>=limit;
  byId(type+'Search').style.display=full?'none':'';
  byId(type+'Matches').style.display=full?'none':'';
  const q=byId(type+'Search').value.trim().toLocaleLowerCase('id');
  const matches=q?DATA.heroes.filter(h=>h.name!=='Miya'&&!selected.enemy.includes(h.name)&&!selected.ally.includes(h.name)&&h.name.toLocaleLowerCase('id').includes(q))
    .sort((a,b)=>metaRank(a)-metaRank(b)||a.name.localeCompare(b.name)).slice(0,12):[];
  const panel=byId(type+'Matches');
  panel.innerHTML=matches.map(h=>`<button class="suggest" type="button" data-name="${esc(h.name)}">${artFace(heroUrls(h.name),h.name,true)}<span>${esc(h.name)}</span>${['S','A'].includes(h.tier)?`<i class="tier">${esc(h.tier)}</i>`:h.proMeta?'<i class="tier">PRO</i>':''}</button>`).join('');
  panel.querySelectorAll('[data-name]').forEach(el=>el.onclick=()=>{
    const name=el.dataset.name;
    if(!H.has(name)||name==='Miya'||full||selected.enemy.includes(name)||selected.ally.includes(name))return;
    names.push(name);byId(type+'Search').value='';saveDraft();renderTeam('enemy');renderTeam('ally');build();
  });
}
function itemNote(id,a){
  const s=a.signals;
  const level=x=>x>=6?'tinggi':x>=3?'sedang':'rendah';
  const notes={
    swift:'AS awal.',tough:'Tahan magic/CC.',warrior:'Lebih aman vs fisik.',wind:'Core crit awal.',berserker:'Damage crit.',haas:'Lifesteal + crit.',
    gun:'Range + kiting.',blade:'Tambah damage mentah.',corrosion:'Slow + attack speed.',dhs:'Kuat lawan HP tebal.',golden:'Core on-hit.',
    roar:`Penetrasi vs tank ${level(s.tank)}.`,sea:`Antiheal ${level(s.heal)}.`,nature:'Tahan burst fisik.',meteor:'Tahan burst magic.',immortal:'Safety late game.'
  };return notes[id]||I[id].why;
}
function loadoutCard(kind,title,sub,urls){
  return `<div class="loadout-card">${artFace(urls,title,true).replace(/<span class="letters">.*?<\/span>/,'')}<div><small>${esc(kind)}</small><b>${esc(title)}</b>${sub?`<span>${esc(sub)}</span>`:''}</div></div>`;
}

function normalizeEmblem(text){
  const parts=String(text||'').split('·').map(s=>s.trim()).filter(Boolean);
  return {title:parts[0]||String(text||'Emblem'),sub:parts.slice(1).join(' / ')};
}
let latest='';
function build(){
  const a=MiyaLogic.analyzeDraft(DATA,selected.enemy,selected.ally,state);
  const result=byId('result');
  const items=a.order.map((id,i)=>`<div class="item ${i<=2?'must':''}"><span class="num">${i+1}</span>${artFace(itemUrls(id),I[id].name)}<b>${esc(I[id].name)}</b><small>${esc(I[id].desc)}</small></div>`).join('');
  const emblem=normalizeEmblem(a.emblem);
  const warn=a.missing.length?`<div class="tip">Alt: ${a.missing.slice(0,3).map(id=>esc(I[id].name)).join(', ')}</div>`:'';
  result.innerHTML=`<div class="row-title"><b>Build Miya</b><span class="actions"><button id="refresh" class="linkbtn" type="button">⟳ Counter</button><button id="copy" class="linkbtn" type="button">Salin ↗</button></span></div>
    <div class="chips"><span class="pill">${a.path==='crit'?'Critical':'On-hit'}</span>${a.tags.filter(t=>t!=='Critical'&&t!=='On-hit').slice(0,3).map(t=>`<span class="pill">${esc(t)}</span>`).join('')}</div>
    <div class="itemgrid">${items}</div>
    <div class="loadout-row">${loadoutCard('Emblem',emblem.title,emblem.sub,emblemUrls(emblem.title))}${loadoutCard('Spell',a.spell,'',spellUrls(a.spell))}</div>
    <div class="chips stats"><span class="pill">AS +${a.stats.attackSpeed}%</span><span class="pill">Crit +${a.stats.crit}%</span><span class="pill">LS +${a.stats.lifesteal}%</span><span class="pill">ATK +${a.stats.physicalAttack}</span><span class="pill">${Number(a.stats.cost).toLocaleString('id-ID')}g</span></div>
    ${warn}<details><summary>Catatan item</summary>${a.order.map((id,i)=>`<div class="why"><b>${i+1}. ${esc(I[id].name)}</b><span>${esc(itemNote(id,a))}</span></div>`).join('')}</details>
    <div class="tip">${state.counterMode?'Counter diprioritaskan lebih awal.':'Core dulu, counter mengikuti draft.'}</div>`;
  byId('refresh').onclick=()=>{state.counterMode=!state.counterMode;saveDraft();build();};
  latest=`Miya Lab · Build Otomatis\nMusuh: ${selected.enemy.join(', ')||'-'}\nTeman: ${selected.ally.join(', ')||'-'}\nJalur: ${a.path}\nUrutan item:\n${a.order.map((id,i)=>`${i+1}. ${I[id].name}`).join('\n')}\nEmblem: ${a.emblem}\nSpell: ${a.spell}`;
  byId('copy').onclick=async()=>{
    try{await navigator.clipboard.writeText(latest);}catch(e){const t=document.createElement('textarea');t.value=latest;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();}
    byId('copy').textContent='Disalin ✓';
  };
  return a;
}
function initialize(){
  const valid=DATA&&DATA.heroes.length===133&&DATA.heroCount===133&&Object.keys(I).length===16&&DATA.heroes.every(h=>h.kit&&h.role&&Array.isArray(h.cc)&&h.traits);
  if(!valid){byId('bootMsg').textContent='Database bermasalah. Periksa data.js';byId('skip').style.display='block';return;}
  loadDraft();
  for(const type of ['enemy','ally']){byId(type+'Search').addEventListener('input',()=>renderTeam(type));renderTeam(type);}
  build();
  byId('progress').style.width='100%';
  byId('bootMsg').textContent='Miya Lab siap.';
  byId('bootCount').textContent='Build dan icon lokal aktif.';
  const enter=()=>document.body.classList.add('ready');byId('skip').onclick=enter;setTimeout(enter,150);
  setupOfflineImages();
}
const OFFLINE_ART='miya-lab-art-v3';
const ART_TASKS=()=>[
  ...Object.entries(I).map(([id,o])=>({name:o.name,urls:itemUrls(id).slice(0,-1)})),
  {name:'Marksman',urls:emblemUrls('Marksman').slice(0,-1)},
  {name:'Inspire',urls:spellUrls('Inspire').slice(0,-1)},
  {name:'Flicker',urls:spellUrls('Flicker').slice(0,-1)},
  {name:'Purify',urls:spellUrls('Purify').slice(0,-1)},
  ...DATA.heroes.filter(h=>h.name==='Miya').map(h=>({name:h.name,urls:heroUrls(h.name).slice(0,-1)})),
  ...DATA.heroes.filter(h=>h.name!=='Miya').map(h=>({name:h.name,urls:heroUrls(h.name).slice(0,-1)}))
];
let artWorking=false;
const setArtStatus=(msg,cur,total)=>{
  byId('artStatus').textContent=msg;
  byId('artProgress').value=cur||0;byId('artProgress').max=total||ART_TASKS().length;
};
function setOfflinePanelVisible(show){const panel=byId('offlinePanel');if(panel)panel.style.display=show?'':'none';}
async function storedArtCount(){
  if(!('caches'in window))return 0;
  const tasks=ART_TASKS(),all=await caches.keys();
  const oldArt=all.filter(k=>k.startsWith('miya-lab-')&&k.includes('art'));
  const urls=new Set();
  for(const k of oldArt){const c=await caches.open(k);for(const r of await c.keys())urls.add(r.url);}
  return tasks.filter(t=>t.urls.some(u=>urls.has(new URL(u,location.href).href))).length;
}
function loadOne(url,timeout=5000){
  return new Promise(resolve=>{
    const img=new Image();let done=false;
    const timer=setTimeout(()=>end(false),timeout);
    function end(ok){if(done)return;done=true;clearTimeout(timer);img.onload=null;img.onerror=null;img.src='';resolve(ok);}
    img.referrerPolicy='no-referrer';img.onload=()=>end(true);img.onerror=()=>end(false);img.src=url;
  });
}
async function saveOne(task,cache){
  for(const url of task.urls){
    if(await cache.match(url)){
      if(await loadOne(url)){iconsReady.set(task.name,url);return true;}
      await cache.delete(url);
    }
    if(!(await loadOne(url)))continue;
    try{
      const cached=await caches.match(url);
      if(!cached){
        const r=await fetch(url,{mode:'no-cors',credentials:'omit'});
        if(r.ok||r.type==='opaque')await cache.put(url,r.clone());
      }else if(!(await cache.match(url)))await cache.put(url,cached.clone());
      if(await caches.match(url)){iconsReady.set(task.name,url);return true;}
    }catch(e){}
  }
  return false;
}
async function downloadArtwork(){
  if(artWorking)return;
  const total=ART_TASKS().length;
  if(!navigator.onLine){setArtStatus('Offline. Icon lokal tetap aktif.',0,total);return;}
  if(!('caches'in window)){setArtStatus('Cache Storage tidak didukung.',0,total);return;}
  artWorking=true;byId('cacheArt').disabled=true;
  let done=0,saved=0,seq=0;
  try{
    const cache=await caches.open(OFFLINE_ART);
    setArtStatus(`Menyimpan 0/${total}...`,0,total);
    async function worker(){
      while(seq<total){
        const t=ART_TASKS()[seq++];
        if(await saveOne(t,cache))saved++;
        done++;setArtStatus(`Tersimpan ${saved}/${total} · Dicek ${done}/${total}`,done,total);
      }
    }
    await Promise.all(Array.from({length:8},worker));
    const count=await storedArtCount();
    if(count>=total){setOfflinePanelVisible(false);}else setArtStatus(`Selesai ${count}/${total}. Sisanya pakai icon lokal.`,total,total);
  }catch(e){setArtStatus(`Gagal: ${String(e.message||e)}`,done,total);}
  finally{artWorking=false;byId('cacheArt').disabled=false;}
}
async function setupOfflineImages(){
  const btn=byId('cacheArt');btn.onclick=downloadArtwork;
  const total=ART_TASKS().length;
  if(!('serviceWorker'in navigator)||!['http:','https:'].includes(location.protocol)){
    setArtStatus('Pakai HTTPS/localhost untuk offline.',0,total);return;
  }
  try{
    await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    if(!navigator.serviceWorker.controller){
      await new Promise(resolve=>{
        const timer=setTimeout(resolve,1800);
        navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timer);resolve();},{once:true});
      });
    }
    const count=await storedArtCount();
    if(count>=total){setOfflinePanelVisible(false);return;}
    setOfflinePanelVisible(true);
    setArtStatus(`${count}/${total} gambar sudah tersimpan.`,count,total);
    if(navigator.onLine && count<total && !navigator.connection?.saveData)downloadArtwork();
  }catch(e){setArtStatus(`SW gagal: ${String(e.message||e)}`,0,total);}
}
initialize();
