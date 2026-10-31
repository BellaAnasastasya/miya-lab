/* Miya Lab M2 — draft heuristics, staged buy order and real owned-inventory tracking.
 * Scores are NOT damage calculations or real-time match stats. All item base stats from data.js.
 */
(function (root, factory) {
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.MiyaLogic=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const PHASES=['early','mid','late'], SITUATIONS=['solo','war'];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const val=(h,k)=>Number(h?.traits?.[k]||0);
  const sum=(list,k)=>list.reduce((s,h)=>s+val(h,k),0);
  const role=h=>String(h?.role||'').toLowerCase();
  const hardCC=new Set(['stun','knockup','freeze','suppress','pull','taunt','polymorph','immobilize','fear','displacement']);
  const unique=xs=>[...new Set(xs)];
  const BOOTS=['swift','tough','warrior'];
  const CRITS=['wind','berserker','haas'];
  const VALID_SPELLS=['Inspire','Flicker','Purify'];
  function analyzeDraft(data,enemyNames=[],allyNames=[],options={}){
    const lookup=new Map(data.heroes.map(h=>[h.name,h]));
    const enemies=unique(enemyNames).map(n=>lookup.get(n)).filter(h=>h&&h.name!=='Miya').slice(0,5);
    const allies=unique(allyNames).map(n=>lookup.get(n)).filter(h=>h&&h.name!=='Miya'&&!enemies.includes(h)).slice(0,4);
    const owned=unique(Array.isArray(options.owned)?options.owned:[]).filter(id=>data.items[id]).slice(0,6);
    // Tahap dihitung dari jumlah item lengkap yang ditandai (bukan waktu match).
    const phase=owned.length<=2?'early':owned.length<=4?'mid':'late';
    const en=k=>sum(enemies,k),al=k=>sum(allies,k);
    const controls=enemies.filter(h=>(h.cc||[]).some(cc=>hardCC.has(cc))).length;
    const suppress=enemies.filter(h=>(h.cc||[]).includes('suppress')).length;
    const protection=al('R')*.65+al('F')*.40+al('Q')*.34+al('H')*.25+al('C')*.22;
    const heal=en('H')*1.45+en('S')*.68+en('L')*.4+en('Q')*.42;
    const tank=en('T')*1.03+en('F')*.49;
    const physical=enemies.reduce((n,h)=>{
      const cls=/assassin|fighter|marksman/.test(role(h))&&val(h,'G')<2;
      return n+val(h,'A')*.8+val(h,'P')*.65+(cls?val(h,'D')*.88+val(h,'B')*.56:val(h,'D')*.15);
    },0);
    const magic=en('G')*.82+enemies.reduce((n,h)=>n+(val(h,'G')>=2?val(h,'B')*.46:0),0);
    const dive=clamp(en('D')*.7+en('M')*.37+en('B')*.28+controls*.2-protection*.42,0,40);
    const physicalDanger=clamp(physical*.81+dive*.44-protection*.26,0,50);
    const magicDanger=clamp(magic*.90+en('C')*.13-protection*.23,0,50);
    const crowd=en('C')*.62+controls*.65;
    const hardTank=tank>=4.2,hardHeal=heal>=3.1,hardPhysical=physicalDanger>=4.1;
    const hardMagic=magicDanger>=4, hardControl=crowd>=5.8;
    const antiTank=hardTank||(tank>=3.6&&enemies.length>=3&&en('S')>=3);
    // Mode prioritas internal berdasarkan risiko komposisi draft, BUKAN deteksi solo/war aktual.
    const situation=(dive>=3.6||crowd>=5.3||protection>=3.8)?'war':'solo';
    const signals={heal,tank,dive,physicalDanger,magicDanger,crowd,protection,support:protection,
      controlCount:controls,suppressCount:suppress,hardHeal,hardTank,hardPhysical,hardMagic,
      hardCC:hardControl,antiTank};
    const hasGolden=owned.includes('golden');
    const hasCrit=owned.some(id=>CRITS.includes(id));
    const conflict=hasGolden&&hasCrit;
    // Preserve already-bought investment. Switching to Golden Staff after crit would waste gold.
    const path=hasCrit?'crit':hasGolden?'onhit':antiTank?'onhit':'crit';
    const bootOwned=owned.find(id=>BOOTS.includes(id));
    const boot=bootOwned||(magicDanger>=3.8&&crowd>=3.4?'tough':
      physicalDanger>=5.7&&magicDanger<3.1?'warrior':'swift');
    const threatWeights={
      sea:heal*10+(hardHeal?52:0),
      roar:tank*9+(hardTank?42:0),
      nature:physicalDanger*9+(hardPhysical?45:0),
      meteor:magicDanger*9+(hardMagic?43:0),
      immortal:dive*7+(hardControl?22:0)
    };
    function wishFor(stage,style){
      const isWar=style==='war',isLate=stage==='late',isEarly=stage==='early';
      const emergency=(hardPhysical||hardMagic)&&((isWar&&(dive>2.3||physicalDanger>5.0||magicDanger>5.0))||dive>5.4);
      const threat=Object.keys(threatWeights).filter(id=>{
        if(id==='nature')return hardPhysical;
        if(id==='meteor')return hardMagic;
        if(id==='roar')return hardTank;
        if(id==='sea')return hardHeal;
        return isLate&&isWar&&dive>=6;
      }).sort((a,b)=>{
        const mod=id=>id==='nature'||id==='meteor'?(isWar?18:-8):id==='immortal'?(isLate?30:-100):0;
        return threatWeights[b]+mod(b)-(threatWeights[a]+mod(a));
      });
      const defense=threat.filter(id=>['nature','meteor'].includes(id));
      const vital=threat.filter(id=>id==='sea'||id==='roar');
      const firstDefense=emergency?defense.slice(0,1):[];
      let wish;
      if(path==='onhit'){
        // Never mix Golden Staff with critical-chance equipment.
        // Build on-hit core in a stable sequence, then counter as slots allow.
        const core=['corrosion','dhs','golden'];
        const filler=style==='solo'?['gun','blade','roar','sea','nature','meteor','immortal']:
          ['gun','roar','blade','sea','nature','meteor','immortal'];
        if(isEarly){
          // First complete attack-speed core, then respond to lane sustain/defense.
          wish=[boot,core[0],core[1],core[2],...vital,...defense,...threat,...filler];
        }else if(isWar){
          // Mid teamfight: high-risk defensive counter may be bought before DPS core completes.
          // Late teamfight: core is finished; survival and front-to-back counters go next.
          wish=isLate?[boot,...core,...defense,...vital,...threat,...filler]:
            [boot,core[0],...firstDefense,...(hardHeal?['sea']:[]),core[1],core[2],...vital,...threat,...filler];
        }else{
          wish=[boot,...core,...vital,'gun',...defense,...threat,...filler];
        }
      } else {
        const first=['wind','berserker'];
        const mustSustain=style==='solo'||(!hardHeal&&!emergency);
        const support=mustSustain?['haas','gun']:['gun','haas'];
        const filler=style==='solo'?['haas','gun','blade','sea','roar','nature','meteor','immortal']:
          ['haas','gun','blade','nature','meteor','sea','roar','immortal'];
        if(isEarly){
          wish=[boot,first[0],first[1],...(hardHeal?['sea']:[]),...support,...vital,...defense,...filler];
        }else if(isWar){
          wish=isLate?[boot,...first,...defense,...vital,...support,...threat,...filler]:
            [boot,first[0],...firstDefense,first[1],...vital,...support,...threat,...filler];
        }else{
          wish=[boot,...first,...support,...vital,...defense,...threat,...filler];
        }
      }
      // In late teamfights revive has more value, but it is not an automatic must-buy.
      if(isLate&&isWar&&dive>=6.0)wish=[...wish.slice(0,3),'immortal',...wish.slice(3)];
      if(options.counterMode){
        const mostImportant=threat.filter(id=>id!=='immortal')[0];
        if(mostImportant)wish=[...wish.slice(0,2),mostImportant,...wish.slice(2)];
      }
      if(options.offenseSwap){
        // Manual damage-over-safety option; only one disposable defensive item.
        const replace=wish.findIndex((id,index)=>index>1&&(id==='nature'||id==='meteor'||id==='immortal'));
        if(replace>=0)wish.splice(replace,1);
      }
      const forbidden=path==='onhit'?new Set(CRITS):new Set(['golden']);
      wish=unique(wish.filter(id=>data.items[id]&&!forbidden.has(id)));
      // Protect minimum damage cores from an overly aggressive counter-first ordering.
      const must=path==='onhit'?['corrosion','dhs','golden']:['wind','berserker'];
      for(const id of must){
        if(wish.indexOf(id)>=6){
          const replace=wish.slice(1,6).findLastIndex(x=>!must.includes(x)&&!owned.includes(x));
          if(replace>=0){wish.splice(replace+1,1);wish.splice(Math.min(5,wish.length),0,id);}
        }
      }
      // All owned items stay in the loadout, even if they were off-meta purchases.
      const have=wish.filter(id=>owned.includes(id));
      for(const id of owned)if(!have.includes(id))have.push(id);
      const result=[...have,...wish.filter(id=>!owned.includes(id))].slice(0,6);
      return {order:result,priority:wish,defense,threat,emergency};
    }
    const cur=wishFor(phase,situation);
    const order=cur.order;
    const next=cur.priority.find(id=>!owned.includes(id)&&order.includes(id))||null;
    const pending=order.filter(id=>!owned.includes(id));
    const ownedStats=owned.reduce((s,id)=>s+Number(data.items[id]?.cost||0),0);
    const totalCost=order.reduce((s,id)=>s+Number(data.items[id]?.cost||0),0);
    const stats=order.reduce((s,id)=>{
      const it=data.items[id];
      s.attackSpeed+=Number(it.as||0);s.crit+=Number(it.crit||0);
      s.lifesteal+=Number(it.lifesteal||0);s.physicalAttack+=Number(it.atk||0);
      s.cost+=Number(it.cost||0);
      return s;
    },{attackSpeed:0,crit:0,lifesteal:0,physicalAttack:0,cost:0});
    const spell=hardControl&&suppress===0&&dive>=5.1&&protection<3.5?'Purify':
      (dive>=4.3&&protection<3.8)||(controls>=2&&protection<2.5)?'Flicker':'Inspire';
    const emblem=path==='onhit'?'Marksman · Swift / Weapon Master / Weakness Finder':
      'Marksman · Fatal / Weapon Master / Quantum Charge';
    const tags=[antiTank?'Lawan tank tebal':path==='crit'?'Critical':'On-hit',hardHeal?'Antiheal':null,
      hardPhysical?'Anti-fisik':null,hardMagic?'Anti-magic':null,hardControl?'CC berat':null,
      ].filter(Boolean);
    const plans={};
    const missing=cur.threat.filter(id=>!order.includes(id));
    const lateSwap=(phase==='late'&&owned.length===6&&owned.some(id=>BOOTS.includes(id)))?
      {from:bootOwned||boot,to:(!order.includes('immortal')?'immortal':null),
        reason:'Pertimbangkan jual boots hanya bila 6 slot penuh, mobilitas aman, dan butuh revive. Jika masih sering berpindah posisi, jangan jual.'}:null;
    return {phase,situation,path,order,stats,spell,emblem,tags,signals,missing,plans,
      next,pending,owned,ownedCost:ownedStats,remainingCost:Math.max(0,totalCost-owned.filter(id=>order.includes(id)).reduce((s,id)=>s+Number(data.items[id].cost||0),0)),
      lateSwap,conflict,priority:cur.priority,options:{counterMode:!!options.counterMode,offenseSwap:!!options.offenseSwap}};
  }
  function phaseLabel(x){return {early:'Early',mid:'Mid',late:'Late'}[x]||x;}
  function styleLabel(x){return x==='solo'?'Solo / Push':'War / Teamfight';}
  return {analyzeDraft,phaseLabel,styleLabel,PHASES,SITUATIONS,VALID_SPELLS};
});
