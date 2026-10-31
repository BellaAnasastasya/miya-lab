'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),ctx);
const data=ctx.window.MIYA_DATA;
const {analyzeDraft}=require(path.join(root,'logic.js'));
assert.equal(data.heroes.length,133);
assert.equal(Object.keys(data.items).length,16);
function inspect(enemy=[],ally=[],opts={}){
 const a=analyzeDraft(data,enemy,ally,opts);
 assert.equal(a.order.length,6,'must have 6 items');
 assert.equal(new Set(a.order).size,6,'no duplicates');
 assert.ok(a.order.every(id=>!!data.items[id]),'no undefined items');
 assert.ok(a.order.some(id=>['swift','tough','warrior'].includes(id)),'boots');
 assert.ok(!a.order.includes('golden')||(!a.order.includes('berserker')&&!a.order.includes('haas')),'Golden Staff incompatible with crit');
 const totals=a.order.reduce((s,id)=>{
  s.as+=data.items[id].as;s.crit+=data.items[id].crit;s.cost+=data.items[id].cost;return s;
 },{as:0,crit:0,cost:0});
 assert.equal(a.stats.attackSpeed,totals.as);
 assert.equal(a.stats.crit,totals.crit);
 assert.equal(a.stats.cost,totals.cost);
 assert.ok(['crit','onhit'].includes(a.path));
 assert.ok(['Inspire','Flicker','Purify'].includes(a.spell));
 return a;
}
const empty=inspect();assert.equal(empty.path,'crit');
const healing=inspect(['Estes','Floryn']);assert.ok(healing.order.includes('sea'),'antigheal required');
const tank=inspect(['Hylos','Tigreal','Barats']);assert.equal(tank.path,'onhit');
for(const id of ['corrosion','dhs','golden'])assert.ok(tank.order.includes(id),'onhit core '+id);
const physical=inspect(['Fanny','Saber','Ling']);assert.ok(physical.signals.physicalDanger>4,'physical threat');
const magical=inspect(['Eudora','Aurora','Gusion']);assert.ok(magical.signals.magicDanger>4,'magic threat');
const hybrid=inspect(['Estes','Hylos','Tigreal','Saber','Eudora'],['Lolita','Angela']);
const refreshed=inspect(['Estes','Hylos','Tigreal','Saber','Eudora'],['Lolita','Angela'],{counterMode:true});
assert.deepEqual(hybrid.order.slice().sort(),refreshed.order.slice().sort(),'refresh only changes item order');
const alternative=inspect(['Fanny','Saber','Ling'],[],{offenseSwap:true});
assert.ok(alternative.switched,'offenseSwap should replace a defensive item');
const names=data.heroes.map(h=>h.name).filter(n=>n!=='Miya');
let seed=17;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
for(let i=0;i<10000;i++){
 const picks=names.slice();
 for(let k=0;k<9;k++){const j=k+Math.floor(rand()*(picks.length-k));[picks[k],picks[j]]=[picks[j],picks[k]];}
 const en=picks.slice(0,Math.floor(rand()*6));
 const al=picks.slice(5,5+Math.floor(rand()*5));
 inspect(en,al, {counterMode:i%3===0,offenseSwap:i%5===0});
}
console.log('PASS: 10,000 draft combinations + required scenarios, stats, unique slots and synergy.');
