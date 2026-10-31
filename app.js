'use strict';
/* UI based on the uploaded Gord Lab PWA; Miya logic lives in logic.js. */
const DATA = window.MIYA_DATA;
const byId = id => document.getElementById(id);
const H = new Map(DATA.heroes.map(h => [h.name,h]));
const I = DATA.items;
const selected = {enemy:[],ally:[]};
const iconsReady = new Map();
const esc = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const heroSlug = s=>s.toLowerCase().replace(/[.'’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const heroUrls = name => {
  const special = {"Chang'e":'chang27e','Lapu-Lapu':'lapu-lapu','Yi Sun-shin':'yi_sun-shin'};
  const slug = heroSlug(name), file = special[name] || slug.replaceAll('-','_');
  return [`https://raw.githubusercontent.com/Ceplin03/database-mlbb.Mobile-Legends-Bang-Bang/master/images-hero/${file}.png`,
          `https://mlbbhub.com/images/heroes/${slug}.png`,
          `./assets/heroes/${slug}.svg`];
};
const itemUrls = id => [...I[id].imgs,`./assets/items/${id}.svg`];
function face(urls,name,small=false){
  const pick = (navigator.onLine === false) ? urls[urls.length-1] : (iconsReady.get(name)||urls[0]);
  const list=[pick,...urls.filter(u=>u!==pick)];
  return `<span class="face ${small?'sm':''}"><img alt="${esc(name)}" src="${esc(list[0])}" data-next="1" data-urls="${esc(encodeURIComponent(JSON.stringify(list)))}" loading="lazy" referrerpolicy="no-referrer" onerror="retryImage(this)"><span class="letters">${esc(name.slice(0,2).toUpperCase())}</span></span>`;
}
window.retryImage = img => {
  let urls=[];
  try { urls=JSON.parse(decodeURIComponent(img.dataset.urls)); } catch(e) {img.remove();return;}
  const pos=Number(img.dataset.next)||0;
  if(pos<urls.length) {img.dataset.next=String(pos+1);img.src=urls[pos];}
  else {img.onerror=null;img.remove();}
};
function metaRank(h){return h.tier==='S'?0:h.tier==='A'?1:h.proMeta?2:3;}
function saveDraft(){
  try {localStorage.setItem('miya-lab-draft-v1',JSON.stringify(selected));} catch(e) {}
}
function loadDraft(){
  try {
    const raw=JSON.parse(localStorage.getItem('miya-lab-draft-v1')||'{}');
    const used=new Set(['Miya']);
    for(const type of ['enemy','ally']) {
      const limit=type==='enemy'?5:4;
      selected[type]=(Array.isArray(raw[type])?raw[type]:[]).filter(n=>{
        if(typeof n!=='string'||!H.has(n)||used.has(n))return false;
        used.add(n);return true;
      }).slice(0,limit);
    }
  } catch(e) {}
}
function renderTeam(type) {
  const names=selected[type],limit=type==='enemy'?5:4;
  byId(type+'Count').textContent=`${names.length}/${limit}`;
  byId(type+'Slots').innerHTML=Array.from({length:limit},(_,i)=>{
    const name=names[i];
    return name ? `<button type="button" class="slot chosen" data-remove="${i}" title="Hapus ${esc(name)}">${face(heroUrls(name),name)}<span>${esc(name)}</span><b class="x">×</b></button>`
      : '<span class="slot blank">+</span>';
  }).join('');
  byId(type+'Slots').querySelectorAll('button[data-remove]').forEach(el => el.onclick=()=>{
    names.splice(Number(el.dataset.remove),1);saveDraft();renderTeam('enemy');renderTeam('ally');autoBuild();
  });
  const full=names.length>=limit;
  byId(type+'Search').style.display=full?'none':'';
  byId(type+'Matches').style.display=full?'none':'';
  const q=byId(type+'Search').value.trim().toLocaleLowerCase('id');
  const allowed=DATA.heroes.filter(h=>h.name!=='Miya'&&!selected.enemy.includes(h.name)&&!selected.ally.includes(h.name));
  const matches=q?allowed.filter(h=>h.name.toLocaleLowerCase('id').includes(q))
    .sort((a,b)=>metaRank(a)-metaRank(b)||a.name.localeCompare(b.name)).slice(0,12):[];
  const panel=byId(type+'Matches');
  panel.innerHTML=full?'<span class="tip">Slot penuh; hapus hero untuk mengganti.</span>' : matches.map(h=>`<button type="button" class="suggest" data-name="${esc(h.name)}">${face(heroUrls(h.name),h.name,true)}<span>${esc(h.name)}</span>${h.tier==='S'||h.tier==='A'?`<i class="tier">${esc(h.tier)}</i>`:h.proMeta?'<i class="tier">PRO</i>':''}</button>`).join('');
  panel.querySelectorAll('button[data-name]').forEach(el=>el.onclick=()=>{
    const name=el.dataset.name;
    if(!H.has(name)||name==='Miya'||selected.enemy.includes(name)||selected.ally.includes(name)||names.length>=limit)return;
    names.push(name);saveDraft();byId(type+'Search').value='';
    renderTeam('enemy');renderTeam('ally');autoBuild();
  });
}
function strength(x){return x>=6?'tinggi':x>=3?'sedang':'rendah';}
function itemNote(id,a){
  const s=a.signals;
  const custom={
    swift:'Attack speed awal untuk stack pasif dan clear wave.',
    tough:`Magic burst ${strength(s.magicDanger)} dan tekanan CC ${strength(s.crowd)}.`,
    warrior:`Ancaman damage fisik ${strength(s.physicalDanger)}; aman saat laning.`,
    wind:'Mempercepat basic attack dan clear wave; core jalur crit.',
    berserker:'Physical critical damage; dipakai di jalur crit saja.',
    haas:'Sustain dan critical chance untuk teamfight panjang.',
    gun:'Jaga jarak serang agar Miya tak mudah tertangkap.',
    blade:'Damage tambahan ketika slot situasional lebih longgar.',
    corrosion:'Serangan cepat dan efek slow untuk melawan frontline.',
    dhs:'Damage berdasar HP untuk lawan tebal; cocok untuk on-hit.',
    golden:'Menaikkan frekuensi pemicu attack effects, tidak dicampur item crit.',
    roar:`Frontline ${strength(s.tank)}; periksa armor yang benar-benar mereka beli saat match.`,
    sea:`Sinyal heal/sustain/shield ${strength(s.heal)}; lawan pemulihan tinggi.`,
    nature:`Physical burst/dive ${strength(s.physicalDanger)}; aktifkan secara manual sebelum terkena damage fisik.`,
    meteor:`Magic burst ${strength(s.magicDanger)}; perlindungan bukan berarti kebal magic.`,
    immortal:'Opsi revive, ideal dipertimbangkan di late game.'
  };
  return custom[id] || I[id].why;
}
function profileChip(name){
  const h=H.get(name);
  if(!h)return '';
  return `<div class="heroline"><b>${esc(h.name)} <small>${esc(h.tier)}${h.proMeta?' · Pro':''}</small></b><span>${esc(h.kit)}</span><small>CC: ${esc(h.cc.length?h.cc.join(', '):'tidak dominan')} · ${esc(h.role)}</small></div>`;
}
let counterMode=false,offenseSwap=false,latest='';
function build(shouldScroll=false){
  let a=MiyaLogic.analyzeDraft(DATA,selected.enemy,selected.ally,{counterMode,offenseSwap});
  // When safety has become an unavailable swap, reset the unused toggle.
  if(offenseSwap&&!a.switched){offenseSwap=false;a=MiyaLogic.analyzeDraft(DATA,selected.enemy,selected.ally,{counterMode,offenseSwap});}
  const itemView=(id,idx)=>`<div class="item ${idx<=2?'must':''}" data-id="${esc(id)}"><span class="num">${idx+1}</span>${face(itemUrls(id),I[id].name)}<b>${esc(I[id].name)}</b><small>${esc(I[id].desc)}</small></div>`;
  const showStats = a.stats;
  const note=a.order.map((id,index)=>`<div class="why"><b>${index+1}. ${esc(I[id].name)}</b><span>${esc(itemNote(id,a))}</span></div>`).join('');
  const availableSafety=a.order.find(id=>id==='nature'||id==='meteor');
  const defensiveSwapAvailable = !!a.switched || (!!availableSafety && ['haas','gun','blade','sea','roar'].some(id=>!a.order.includes(id)));
  const warn=a.missing.length?`<div class="tip"><strong>Trade-off 6 slot:</strong> ${a.missing.map(id=>esc(I[id].name)).join(', ')} juga relevan, tetapi tidak cukup slot. Pertimbangkan ganti item sesuai kondisi asli.</div>`:'';
  byId('result').innerHTML=`<div class="row-title"><b>Build buat Miya</b><span style="display:flex;gap:8px;align-items:center"><button id="refresh" class="linkbtn" type="button">⟳ Refresh urutan</button><button id="copy" class="linkbtn" type="button">Salin ↗</button></span></div>
  <div class="chips"><span class="pill">${a.path==='crit'?'Critical':'On-hit anti-tank'}</span>${a.tags.map(t=>`<span class="pill">${esc(t)}</span>`).join('')}</div>
  <div class="itemgrid">${a.order.map(itemView).join('')}</div>
  <div class="chips stats"><span class="pill">AS item +${showStats.attackSpeed}%</span><span class="pill">Crit item +${showStats.crit}%</span><span class="pill">Lifesteal item +${showStats.lifesteal}%</span><span class="pill">ATK item +${showStats.physicalAttack}</span><span class="pill">${showStats.cost.toLocaleString('id-ID')} gold</span></div>
  <div class="micro"><b>Emblem:</b> ${esc(a.emblem)}<div><b>Spell:</b> ${esc(a.spell)}</div></div>
  <details><summary>Kenapa pilih item ini?</summary>${note}</details>
  <details><summary>Analisis hero (${selected.enemy.length} musuh + ${selected.ally.length} teman)</summary><div class="tiny-head">Musuh</div>${selected.enemy.map(profileChip).join('')||'<div class="tip">Belum ada hero.</div>'}<div class="tiny-head">Teman</div>${selected.ally.map(profileChip).join('')||'<div class="tip">Belum ada hero.</div>'}<div class="tip">Heal ${a.signals.heal.toFixed(1)} · Tank ${a.signals.tank.toFixed(1)} · Dive ${a.signals.dive.toFixed(1)} · Fisik ${a.signals.physicalDanger.toFixed(1)} · Magic ${a.signals.magicDanger.toFixed(1)} · Protection tim ${a.signals.support.toFixed(1)}. Ini skor heuristik draft, bukan stat musuh asli.</div></details>
  ${warn}<div class="tip">${counterMode?'Mode refresh: counter paling mendesak dinaikkan ke slot 3 jika memungkinkan.':'Mode standar: core lebih awal, counter mengikuti kebutuhan draft.'} ${defensiveSwapAvailable?'Titik biru pada item bertahan bisa diketuk untuk mencoba slot ofensif.':''} Statistik di atas hanya penjumlahan stat dasar item, <strong>bukan DPS atau damage final</strong>; tidak mencakup pasif, emblem, buff, level hero, dan situasi match.</div>`;
  if(defensiveSwapAvailable){
    // The item that becomes offensive stays tappable to restore the protective choice.
    const defensiveId = a.switched ? a.switched.to : availableSafety;
    const card = Array.from(byId('result').querySelectorAll('.item')).find(el=>el.dataset.id===defensiveId);
    if(card){
      const dot=document.createElement('span');dot.setAttribute('aria-hidden','true');
      dot.style.cssText='position:absolute;top:5px;right:5px;width:12px;height:12px;border-radius:50%;background:#42a5ff;border:2px solid #d7edff;pointer-events:none';
      card.appendChild(dot);card.style.cursor='pointer';card.setAttribute('role','button');card.tabIndex=0;
      card.setAttribute('aria-label','Ganti slot bertahan / ofensif');
      const toggle=()=>{offenseSwap=!offenseSwap;build(false);};
      card.onclick=toggle;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}};
    }
  }
  latest=`Miya vs ${selected.enemy.join(', ')||'(belum dipilih)'}\nTim ${selected.ally.join(', ')||'(belum dipilih)'}\nMode ${a.path==='crit'?'Critical':'On-hit'}\n${a.order.map((id,i)=>`${i+1}. ${I[id].name}`).join('\n')}\nAS item ${a.stats.attackSpeed}% · Crit item ${a.stats.crit}% · Lifesteal item ${a.stats.lifesteal}% · ${a.stats.cost} gold\nEmblem ${a.emblem} · Spell ${a.spell}`;
  byId('copy').onclick=async()=>{
    try{await navigator.clipboard.writeText(latest);}catch(e){const t=document.createElement('textarea');t.value=latest;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();}
    byId('copy').textContent='Disalin ✓';
  };
  byId('refresh').onclick=()=>{counterMode=!counterMode;build(false);};
  if(shouldScroll)byId('result').scrollIntoView({behavior:'smooth',block:'start'});
  return a;
}
function autoBuild(){
  counterMode=false;offenseSwap=false;
  if(!selected.enemy.length&&!selected.ally.length){latest='';byId('result').innerHTML='<div class="empty">Pilih hero musuh atau teman untuk melihat build otomatis.</div>';return;}
  build(false);
}
function initialize(){
  const valid=DATA&&DATA.heroes.length===DATA.heroCount&&DATA.heroCount===133&&Object.keys(I).length===16&&DATA.heroes.every(h=>h.kit&&h.role&&Array.isArray(h.cc)&&h.traits);
  if(!valid){byId('bootMsg').textContent='Database bermasalah. Periksa data.js';byId('skip').style.display='block';return;}
  loadDraft();
  for(const type of ['enemy','ally']){
    byId(type+'Search').addEventListener('input',()=>renderTeam(type));
    renderTeam(type);
  }
  autoBuild();
  byId('progress').style.width='100%';
  byId('bootMsg').textContent='133 profil hero + 16 item siap. Build berjalan tanpa internet.';
  byId('bootCount').textContent='Gambar fallback lokal tersedia; gambar game asli dimuat saat online.';
  const enter=()=>document.body.classList.add('ready');
  byId('skip').onclick=enter;
  setTimeout(enter,450);
  registerPwa();
}
function registerPwa(){
  if(!('serviceWorker' in navigator)||!['https:','http:'].includes(location.protocol))return;
  navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{
    // Capture original artwork for future offline visits, when the user has connectivity.
    if(navigator.serviceWorker.controller) warmIcons();
    else navigator.serviceWorker.addEventListener('controllerchange',warmIcons,{once:true});
  }).catch(e=>console.warn('PWA SW:',e));
}
let warming=false;
async function warmIcons(){
  if(warming||navigator.onLine===false)return;
  warming=true;
  // Image requests from a controlled page are cached in sw.js when they load successfully.
  const tasks=[...DATA.heroes.map(h=>[h.name,heroUrls(h.name).slice(0,2)]), ...Object.entries(I).map(([id,it])=>[it.name,it.imgs])];
  let cursor=0;
  const tryImage=url=>new Promise(resolve=>{
    const img=new Image();let done=false;
    const timer=setTimeout(()=>finish(false),1800);
    function finish(ok){if(done)return;done=true;clearTimeout(timer);img.onload=null;img.onerror=null;resolve(ok);}
    img.referrerPolicy='no-referrer';img.onload=()=>finish(true);img.onerror=()=>finish(false);img.src=url;
  });
  async function worker(){
    while(cursor<tasks.length){
      const [name,urls]=tasks[cursor++];
      for(const url of urls){if(await tryImage(url)){iconsReady.set(name,url);break;}}
    }
  }
  await Promise.all(Array.from({length:5},worker));
  warming=false;
}
initialize();
