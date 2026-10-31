'use strict';
/* Miya Lab M2 — draft, stages, solo/war, owned items, visible offline art downloader. */
const DATA=window.MIYA_DATA, byId=id=>document.getElementById(id);
const H=new Map(DATA.heroes.map(h=>[h.name,h])), I=DATA.items;
const selected={enemy:[],ally:[]}, iconsReady=new Map();
const state={phase:'early',situation:'solo',owned:[],gold:'',counterMode:false,offenseSwap:false};
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>s.toLowerCase().replace(/[.'’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const heroUrls=name=>{
  const special={"Chang'e":'chang27e','Lapu-Lapu':'lapu-lapu','Yi Sun-shin':'yi_sun-shin'};
  const key=slug(name),file=special[name]||key.replaceAll('-','_');
  return [`https://raw.githubusercontent.com/Ceplin03/database-mlbb.Mobile-Legends-Bang-Bang/master/images-hero/${file}.png`,
    `https://mlbbhub.com/images/heroes/${key}.png`,`./assets/heroes/${key}.svg`];
};
const itemUrls=id=>[...I[id].imgs,`./assets/items/${id}.svg`];
// Important: do NOT switch to fallback merely because navigator.onLine is false.
// A service worker can serve the original image from cache when offline.
function face(urls,name,small=false){
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
    if(MiyaLogic.PHASES.includes(old.phase))state.phase=old.phase;
    if(MiyaLogic.SITUATIONS.includes(old.situation))state.situation=old.situation;
    if(Array.isArray(old.owned))state.owned=[...new Set(old.owned)].filter(id=>I[id]).slice(0,6);
    if(old.gold!==''&&Number.isFinite(Number(old.gold)))state.gold=String(Math.max(0,Math.floor(Number(old.gold))));
    state.counterMode=!!old.counterMode;state.offenseSwap=!!old.offenseSwap;
  }catch(e){}
}
function metaRank(h){return h.tier==='S'?0:h.tier==='A'?1:h.proMeta?2:3;}
function renderTeam(type){
  const names=selected[type],limit=type==='enemy'?5:4;
  byId(type+'Count').textContent=`${names.length}/${limit}`;
  byId(type+'Slots').innerHTML=Array.from({length:limit},(_,i)=>{
    const name=names[i];return name?`<button type="button" class="slot chosen" data-remove="${i}" title="Hapus ${esc(name)}">${face(heroUrls(name),name)}<span>${esc(name)}</span><b class="x">×</b></button>`:'<span class="slot blank">+</span>';
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
  panel.innerHTML=matches.map(h=>`<button class="suggest" type="button" data-name="${esc(h.name)}">${face(heroUrls(h.name),h.name,true)}<span>${esc(h.name)}</span>${['S','A'].includes(h.tier)?`<i class="tier">${esc(h.tier)}</i>`:h.proMeta?'<i class="tier">PRO</i>':''}</button>`).join('');
  panel.querySelectorAll('[data-name]').forEach(el=>el.onclick=()=>{
    const name=el.dataset.name;
    if(!H.has(name)||name==='Miya'||full||selected.enemy.includes(name)||selected.ally.includes(name))return;
    names.push(name);byId(type+'Search').value='';saveDraft();renderTeam('enemy');renderTeam('ally');build();
  });
}
const strength=x=>x>=6?'tinggi':x>=3?'sedang':'rendah';
function itemNote(id,a){
  const s=a.signals;
  const notes={
    swift:'Attack speed awal untuk farming dan stack pasif Miya.',
    tough:`Lebih tahan magic dan CC; ancaman magic ${strength(s.magicDanger)}.`,
    warrior:`Tekanan fisik ${strength(s.physicalDanger)}; opsi sepatu aman saat laning.`,
    wind:'Attack speed, critical chance, dan clear wave; core jalur crit.',
    berserker:'Critical damage; jangan dicampur dengan Golden Staff.',
    haas:'Critical chance dan lifesteal untuk bertahan dalam duel panjang.',
    gun:'Jarak serang dan kiting; lebih aman menyerang dari belakang.',
    blade:'Physical attack besar untuk slot damage jika ancaman terkendali.',
    corrosion:'Attack speed dan slow; membantu duel dan mengejar target.',
    dhs:'Pasif damage berdasar HP target; berguna lawan frontline ber-HP tinggi.',
    golden:'Mengoptimalkan attack effects, tetapi mengubah critical chance; bukan untuk build crit.',
    roar:`Physical penetration; tank draft ${strength(s.tank)}, cek armor musuh di match.`,
    sea:`Sinyal heal/sustain/shield ${strength(s.heal)}; anti-pemulihan.`,
    nature:'Aktifkan Wind of Nature untuk ancaman physical damage; tidak menangkal magic.',
    meteor:'Shield/pertahanan terhadap magic burst; bukan pengganti positioning.',
    immortal:'Revive situasional untuk late teamfight; pastikan efek siap.'
  };return notes[id]||I[id].why;
}
function heroInfo(name){
  const h=H.get(name);return h?`<div class="heroline"><b>${esc(h.name)} <small>${esc(h.tier)}${h.proMeta?' · Pro':''}</small></b><span>${esc(h.kit)}</span><small>CC: ${esc(h.cc.length?h.cc.join(', '):'tidak dominan')} · ${esc(h.role)}</small></div>`:'';
}
const nfmt=n=>Number(n).toLocaleString('id-ID');
let latest='',inventoryOpen=false,helpOpen=false,notice='';
function toggleOwned(id){
  if(!I[id])return;
  if(state.owned.includes(id))state.owned=state.owned.filter(x=>x!==id);
  else if(state.owned.length>=6){notice='Inventori sudah 6/6. Hapus satu item dulu sebelum menandai pembelian lain.';}
  else{state.owned.push(id);notice='';}
  saveDraft();build();
}
function build(){
  const a=MiyaLogic.analyzeDraft(DATA,selected.enemy,selected.ally,state);
  const result=byId('result'),gold=state.gold===''?null:Number(state.gold);
  const items=a.order.map((id,i)=>{
    const owned=state.owned.includes(id);
    return `<button type="button" class="item ${i<=2?'must':''} ${owned?'owned':''}" data-item="${esc(id)}" aria-pressed="${owned}" title="${owned?'Batalkan tanda dibeli':'Tandai sudah dibeli'}: ${esc(I[id].name)}"><span class="num">${i+1}</span><span class="owned-flag">${owned?'✓ Milik':'＋ Beli'}</span>${face(itemUrls(id),I[id].name)}<b>${esc(I[id].name)}</b><small>${esc(I[id].desc)}</small></button>`;
  }).join('');
  const next=a.next?I[a.next]:null;
  const goldText=next&&gold!==null?` <span class="${gold>=next.cost?'enough':'short'}">${gold>=next.cost?'Gold cukup untuk harga item penuh':`Kurang ${nfmt(next.cost-gold)}g dari harga item penuh`}</span>`:'';
  const tipNext=state.owned.length>=6?'<b>6/6 item dimiliki.</b> Jika ingin mengganti, lepas tanda item yang dijual dan pilih penggantinya.':
    next?`<b>Prioritas beli berikutnya:</b> ${esc(next.name)} (${nfmt(next.cost)}g).${goldText}`:'<b>Belum ada item berikutnya.</b>';
  const planNames=Object.entries(a.plans).map(([p,ids])=>`<div class="phase-plan ${p===state.phase?'is-current':''}"><strong>${MiyaLogic.phaseLabel(p)}</strong><span>${ids.map(id=>esc(I[id].name)).join(' → ')}</span></div>`).join('');
  const ownedGrid=Object.entries(I).map(([id,it])=>`<button type="button" data-own="${esc(id)}" class="ownership ${state.owned.includes(id)?'selected':''}" aria-pressed="${state.owned.includes(id)}">${state.owned.includes(id)?'✓':'＋'} ${esc(it.name)}</button>`).join('');
  const warn=a.missing.length?`<div class="tip"><b>Trade-off slot:</b> ${a.missing.map(id=>esc(I[id].name)).join(', ')} juga cocok menghadapi draft, tetapi ruang item terbatas.</div>`:'';
  const lateSwap=a.lateSwap?.to?`<div class="tip"><b>Opsi late:</b> ${esc(a.lateSwap.reason)} Pengganti yang bisa dipertimbangkan: ${esc(I[a.lateSwap.to].name)}. Bukan auto-swap.</div>`:'';
  const mismatch=a.conflict?'<div class="alert">Inventori mencampur Golden Staff dengan item critical chance. Sinerginya tidak optimal; periksa barang yang sudah dibeli, jangan otomatis mengganti core.</div>':'';
  const situTips=a.situation==='solo'?(
    a.phase==='early'?'Solo early: utamakan last hit, clear wave, turret aman dan pantau map. Jangan memaksakan duel sebelum core.':
    a.phase==='mid'?'Solo mid: manfaatkan duel saat musuh terlihat di map; simpan ultimate untuk lepas CC/kabur, jangan split push buta.':
    'Solo late: push setelah melihat posisi diver, jangan berjalan sendiri tanpa vision; kematian late bisa menentukan match.'):(
    a.phase==='early'?'War early: prioritas selamat dan farm, ambil fight hanya jika posisi aman atau tim unggul jumlah.':
    a.phase==='mid'?'War mid: serang target terdekat dari belakang frontline; aktifkan defensive item sesuai jenis damage dan jangan buka war.':
    'War late: main front-to-back, jaga jarak dan simpan ultimate untuk reposition/cleanse; satu kali tertangkap bisa kalah war.');
  result.innerHTML=`<div class="row-title"><b>Build Miya · ${MiyaLogic.phaseLabel(a.phase)}</b><span class="actions"><button id="refresh" class="linkbtn" type="button">⟳ Counter dulu</button><button id="copy" class="linkbtn" type="button">Salin ↗</button></span></div>
    <div class="chips"><span class="pill">${a.path==='crit'?'Critical':'On-hit anti-tank'}</span>${a.tags.filter(t=>t!=='Critical'&&t!=='On-hit').map(t=>`<span class="pill">${esc(t)}</span>`).join('')}</div>
    ${mismatch}<div class="itemgrid">${items}</div>
    <div class="nextitem">${tipNext}<div class="tip">Sudah beli? Ketuk kartu item (✓). Sisa harga item penuh: <b>${nfmt(a.remainingCost)}g</b>. Komponen yang sudah dibeli belum diperhitungkan.</div></div>
    ${notice?`<div class="alert">${esc(notice)}</div>`:''}
    <div class="chips stats"><span class="pill">AS item +${a.stats.attackSpeed}%</span><span class="pill">Crit item +${a.stats.crit}%</span><span class="pill">Lifesteal item +${a.stats.lifesteal}%</span><span class="pill">Physical ATK item +${a.stats.physicalAttack}</span><span class="pill">Total ${nfmt(a.stats.cost)}g</span></div>
    <div class="micro"><b>Emblem:</b> ${esc(a.emblem)}<div><b>Spell (pilih sebelum match):</b> ${esc(a.spell)}</div><div class="playtip">${esc(situTips)}</div></div>
    <details id="inventory" ${inventoryOpen?'open':''}><summary>Inventori: tandai 16 item yang sudah dibeli (${state.owned.length}/6)</summary><div class="own-grid">${ownedGrid}</div><div class="tip">Pilihan tersimpan di perangkat. Beri tanda hanya untuk item yang benar-benar ada dalam 6 slot Miya.</div></details>
    <details><summary>Rencana pembelian Early → Mid → Late</summary>${planNames}<div class="tip">Urutan setiap fase merupakan prioritas situasional berdasarkan draft dan kondisi Solo/War. Item yang sudah dibeli tetap dipertahankan; saran late tidak otomatis menjual barang.</div></details>
    <details><summary>Alasan pemilihan item</summary>${a.order.map((id,i)=>`<div class="why"><b>${i+1}. ${esc(I[id].name)}${state.owned.includes(id)?' ✓':''}</b><span>${esc(itemNote(id,a))}</span></div>`).join('')}</details>
    <details><summary>Analisis hero (${selected.enemy.length} musuh + ${selected.ally.length} teman)</summary><div class="tiny-head">Musuh</div>${selected.enemy.map(heroInfo).join('')||'<div class="tip">Belum ada musuh dipilih — build default.</div>'}<div class="tiny-head">Teman</div>${selected.ally.map(heroInfo).join('')||'<div class="tip">Belum ada teman dipilih.</div>'}<div class="tip">Heal ${a.signals.heal.toFixed(1)} · Tank ${a.signals.tank.toFixed(1)} · Dive ${a.signals.dive.toFixed(1)} · Fisik ${a.signals.physicalDanger.toFixed(1)} · Magic ${a.signals.magicDanger.toFixed(1)} · Protection ${a.signals.protection.toFixed(1)}. Skor draft, bukan stat musuh di pertandingan.</div></details>
    ${warn}${lateSwap}<div class="tip">${state.counterMode?'Counter penting diprioritaskan lebih awal, tanpa membuang item yang sudah dibeli.':'Mode core dulu; counter mengikuti urgensi.'} Stat hanya atribut dasar item dari data.js, <b>bukan simulasi DPS/kerusakan nyata</b>. Perhatikan gold, level, armor, efek pasif, durasi fight, dan build musuh yang sebenarnya.</div>`;
  result.querySelectorAll('[data-item]').forEach(el=>el.onclick=()=>toggleOwned(el.dataset.item));
  result.querySelectorAll('[data-own]').forEach(el=>el.onclick=()=>toggleOwned(el.dataset.own));
  byId('inventory').ontoggle=e=>{inventoryOpen=e.target.open;};
  byId('refresh').onclick=()=>{state.counterMode=!state.counterMode;saveDraft();build();};
  latest=`Miya Lab · ${MiyaLogic.phaseLabel(a.phase)} · ${MiyaLogic.styleLabel(a.situation)}\nMusuh: ${selected.enemy.join(', ')||'-'}\nTeman: ${selected.ally.join(', ')||'-'}\nJalur: ${a.path}\n${a.order.map((id,i)=>`${i+1}. ${I[id].name}${state.owned.includes(id)?' [milik]':''}`).join('\n')}\nBeli berikutnya: ${next?.name||'-'}\nSisa gold harga penuh: ${a.remainingCost}\nEmblem: ${a.emblem}\nSpell: ${a.spell}`;
  byId('copy').onclick=async()=>{
    try{await navigator.clipboard.writeText(latest);}catch(e){const t=document.createElement('textarea');t.value=latest;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();}
    byId('copy').textContent='Disalin ✓';
  };
  return a;
}
function controls(){
  byId('phase').value=state.phase;byId('situation').value=state.situation;
  byId('gold').value=state.gold;
  byId('phase').onchange=e=>{state.phase=e.target.value;notice='';saveDraft();build();};
  byId('situation').onchange=e=>{state.situation=e.target.value;notice='';saveDraft();build();};
  byId('gold').oninput=e=>{state.gold=e.target.value===''?'':String(Math.max(0,Math.floor(Number(e.target.value)||0)));saveDraft();build();};
  byId('clearOwned').onclick=()=>{state.owned=[];notice='';saveDraft();build();};
}
function initialize(){
  const valid=DATA&&DATA.heroes.length===133&&DATA.heroCount===133&&Object.keys(I).length===16&&DATA.heroes.every(h=>h.kit&&h.role&&Array.isArray(h.cc)&&h.traits);
  if(!valid){byId('bootMsg').textContent='Database bermasalah. Periksa data.js';byId('skip').style.display='block';return;}
  loadDraft();
  for(const type of ['enemy','ally']){
    byId(type+'Search').addEventListener('input',()=>renderTeam(type));renderTeam(type);
  }
  controls();build();
  byId('progress').style.width='100%';byId('bootMsg').textContent='Database dan icon fallback lokal siap.';
  byId('bootCount').textContent='Gambar asli bisa disimpan untuk offline lewat tombol di bawah.';
  const enter=()=>document.body.classList.add('ready');byId('skip').onclick=enter;
  setTimeout(enter,150);
  setupOfflineImages();
}
// External artwork cannot be guaranteed offline until saved at least once while ONLINE.
// Unlike M1, cached originals are ALWAYS tried first even when navigator.onLine=false.
const OFFLINE_ART='miya-lab-art-v3';
const ART_TASKS=()=>[
  ...Object.entries(I).map(([id,o])=>({name:o.name,urls:itemUrls(id).slice(0,-1)})),
  ...DATA.heroes.filter(h=>h.name==='Miya').map(h=>({name:h.name,urls:heroUrls(h.name).slice(0,-1)})),
  ...DATA.heroes.filter(h=>h.name!=='Miya').map(h=>({name:h.name,urls:heroUrls(h.name).slice(0,-1)}))
];
let artWorking=false;
const setArtStatus=(msg,cur,total)=>{
  byId('artStatus').textContent=msg;
  byId('artProgress').value=cur||0;byId('artProgress').max=total||149;
};
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
    // Even an opaque cached 404 must not count as a valid offline icon.
    if(await cache.match(url)){
      if(await loadOne(url)){iconsReady.set(task.name,url);return true;}
      await cache.delete(url);
    }
    // Image decoding checks success even for opaque third-party images.
    if(!(await loadOne(url)))continue;
    try{
      // SW saves originals on image requests; force an explicit cache write if
      // the browser returned an image from its own memory cache instead.
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
  if(!navigator.onLine){setArtStatus('Tidak ada internet. Icon fallback lokal tetap tersedia; gambar asli perlu disimpan saat online.',0,149);return;}
  if(!('caches'in window)){setArtStatus('Browser tidak mendukung Cache Storage. Mode gambar asli offline tidak tersedia.',0,149);return;}
  artWorking=true;byId('cacheArt').disabled=true;
  const tasks=ART_TASKS(),total=tasks.length;
  let done=0,saved=0,seq=0;
  try{
    const cache=await caches.open(OFFLINE_ART);
    setArtStatus(`Menyimpan gambar asli 0/${total}... Jangan tutup halaman.`,0,total);
    async function worker(){
      while(seq<tasks.length){
        const t=tasks[seq++];if(await saveOne(t,cache))saved++;
        done++;setArtStatus(`Gambar asli tersimpan ${saved}/${total} · Diperiksa ${done}/${total}.`,done,total);
      }
    }
    await Promise.all(Array.from({length:8},worker));
    const count=await storedArtCount();
    setArtStatus(`Selesai: ${count}/${total} gambar asli tersedia offline. Sisanya memakai icon fallback lokal.`,total,total);
  }catch(e){setArtStatus(`Penyimpanan gambar terhenti: ${String(e.message||e)}. Coba lagi saat online.`,done,total);}
  finally{artWorking=false;byId('cacheArt').disabled=false;}
}
async function setupOfflineImages(){
  const btn=byId('cacheArt');btn.onclick=downloadArtwork;
  if(!('serviceWorker'in navigator)||!['http:','https:'].includes(location.protocol)){
    setArtStatus('PWA offline memerlukan HTTPS/localhost. Jangan buka file:// secara langsung.',0,149);
    return;
  }
  try{
    await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    // First uncontrolled visit: navigation may not yet be cached; activation now claims clients.
    if(!navigator.serviceWorker.controller){
      await new Promise(resolve=>{
        const timer=setTimeout(resolve,1800);
        navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timer);resolve();},{once:true});
      });
    }
    const count=await storedArtCount();
    setArtStatus(`${count}/149 gambar asli sudah tersimpan. ${navigator.onLine?'Memeriksa sisanya untuk offline…':'Sedang offline: gambar yang belum disimpan memakai icon lokal.'}`,count,149);
    // Match the Gord boot preload approach without blocking access to the app.
    // Respect users who enabled data saving. The button can retry manually.
    if(navigator.onLine && count<ART_TASKS().length && !navigator.connection?.saveData){
      downloadArtwork();
    }
  }catch(e){setArtStatus(`Service worker gagal: ${String(e.message||e)}. Periksa HTTPS dan file sw.js.`,0,149);}
}
initialize();
