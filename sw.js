'use strict';
/* Miya Lab M5: versioned offline app shell + local icon fallbacks + original-art caches. */
const CACHE='miya-lab-m5-shell-1';
const ART='miya-lab-art-v3';
const SHELL=['./','./index.html','./data.js','./logic.js','./app.js','./manifest.webmanifest','./favicon.png','./icon.svg','./icon-180.png','./icon-192.png','./icon-512.png'];
const HERO_SLUGS=["aamon","akai","aldous","alice","alpha","alucard","angela","argus","arlott","atlas","aulus","aurora","badang","balmond","bane","barats","baxia","beatrix","belerick","benedetta","brody","bruno","carmilla","cecilion","change","chip","chou","cici","claude","clint","cyclops","diggie","dyrroth","edith","esmeralda","estes","eudora","fanny","faramis","floryn","franco","fredrinn","freya","gatotkaca","gloo","gord","granger","grock","guinevere","gusion","hanabi","hanzo","harith","harley","hayabusa","helcurt","hilda","hirara","hylos","irithel","ixia","jawhead","johnson","joy","julian","kadita","kagura","kaja","kalea","karina","karrie","khaleed","khufra","kimmy","lancelot","lapu-lapu","layla","leomord","lesley","ling","lolita","lukas","lunox","luo-yi","lylia","marcel","martis","masha","mathilda","melissa","minotaur","minsitthar","miya","moskov","nana","natalia","natan","nolan","novaria","obsidia","odette","paquito","pharsa","phoveus","popol-and-kupa","rafaela","roger","ruby","saber","selena","silvanna","sora","sun","suyou","terizla","thamuz","tigreal","uranus","vale","valentina","valir","vexana","wanwan","xborg","xavier","yi-sun-shin","yin","yu-zhong","yve","zetian","zhask","zhuxin","zilong"];
const ITEM_IDS=['berserker','blade','corrosion','dhs','golden','gun','haas','immortal','meteor','nature','roar','sea','swift','tough','warrior','wind'];
const FALLBACKS=[...HERO_SLUGS.map(s=>`./assets/heroes/${s}.svg`),...ITEM_IDS.map(s=>`./assets/items/${s}.svg`)];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // Shell must succeed; every fallback is attempted individually so one absent thumbnail
  // cannot prevent the entire service worker from installing.
  await cache.addAll(SHELL);
  for(let i=0;i<FALLBACKS.length;i+=24){
    await Promise.allSettled(FALLBACKS.slice(i,i+24).map(url=>cache.add(url)));
  }
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(k=>k.startsWith('miya-lab-')&&k.includes('shell')&&k!==CACHE).map(k=>caches.delete(k)));
  // Preserve older art caches, because users may have saved real images there.
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const resp=await fetch(req);
        if(resp.ok){
          const cache=await caches.open(CACHE);
          await cache.put(new URL('./index.html',self.registration.scope).href,resp.clone()).catch(()=>{});
        }
        return resp;
      }catch(e){return await caches.match(new URL('./index.html',self.registration.scope).href)||Response.error();}
    })());return;
  }
  if(req.destination==='image'){
    event.respondWith((async()=>{
      // Same origin local SVG fallback is already in shell; remote original art may be
      // in the older M1 cache or the new explicitly downloaded art cache.
      const hit=await caches.match(req);
      if(hit)return hit;
      try{
        const resp=await fetch(req);
        if(resp.ok||resp.type==='opaque'){
          const art=await caches.open(ART);
          await art.put(req,resp.clone()).catch(()=>{});
        }
        return resp;
      }catch(e){return (await caches.match(req))||Response.error();}
    })());return;
  }
  if(url.origin===self.location.origin){
    event.respondWith((async()=>{
      const hit=await caches.match(req);
      if(hit)return hit;
      try{return await fetch(req);}catch(e){return Response.error();}
    })());
  }
});
