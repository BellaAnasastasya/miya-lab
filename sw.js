'use strict';
const CACHE='miya-lab-m1-shell-2';
const ART='miya-lab-m1-art-2';
const FILES=['./','./index.html','./data.js','./logic.js','./app.js','./manifest.webmanifest','./favicon.png','./icon.svg','./icon-180.png','./icon-192.png','./icon-512.png'];
// Offline fallback thumbnails for all 133 heroes and 16 equipment items.
const HERO_SLUGS = [
"aamon","akai","aldous","alice","alpha","alucard","angela","argus","arlott","atlas","aulus","aurora","badang","balmond","bane","barats","baxia","beatrix","belerick","benedetta","brody","bruno","carmilla","cecilion","change","chip","chou","cici","claude","clint","cyclops","diggie","dyrroth","edith","esmeralda","estes","eudora","fanny","faramis","floryn","franco","fredrinn","freya","gatotkaca","gloo","gord","granger","grock","guinevere","gusion","hanabi","hanzo","harith","harley","hayabusa","helcurt","hilda","hirara","hylos","irithel","ixia","jawhead","johnson","joy","julian","kadita","kagura","kaja","kalea","karina","karrie","khaleed","khufra","kimmy","lancelot","lapu-lapu","layla","leomord","lesley","ling","lolita","lukas","lunox","luo-yi","lylia","marcel","martis","masha","mathilda","melissa","minotaur","minsitthar","miya","moskov","nana","natalia","natan","nolan","novaria","obsidia","odette","paquito","pharsa","phoveus","popol-and-kupa","rafaela","roger","ruby","saber","selena","silvanna","sora","sun","suyou","terizla","thamuz","tigreal","uranus","vale","valentina","valir","vexana","wanwan","xborg","xavier","yi-sun-shin","yin","yu-zhong","yve","zetian","zhask","zhuxin","zilong"];
const ITEM_IDS = ["berserker","blade","corrosion","dhs","golden","gun","haas","immortal","meteor","nature","roar","sea","swift","tough","warrior","wind"];
const OFFLINE=[...FILES,...HERO_SLUGS.map(s=>`./assets/heroes/${s}.svg`),...ITEM_IDS.map(s=>`./assets/items/${s}.svg`)];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(OFFLINE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('miya-lab-')&&k!==CACHE&&k!==ART).map(k=>caches.delete(k)))),
  self.clients.claim()
])));
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(resp=>{
      if(resp.ok){const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy)).catch(()=>{});}
      return resp;
    }).catch(()=>caches.match('./index.html')));return;
  }
  if(req.destination==='image'){
    event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(resp=>{
      if(resp.ok||resp.type==='opaque'){
        const copy=resp.clone();caches.open(ART).then(cache=>cache.put(req,copy)).catch(()=>{});
      }
      return resp;
    }).catch(()=>caches.match(req).then(hit=>hit||Response.error()))));return;
  }
  if(url.origin===self.location.origin){
    event.respondWith(caches.match(req).then(hit=>hit||fetch(req)));return;
  }
});
