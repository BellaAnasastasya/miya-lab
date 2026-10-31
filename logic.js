/* Miya Lab M1 — deterministic draft heuristics. Not live in-match inventory or damage simulator. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MiyaLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const val = (h, key) => Number((h && h.traits && h.traits[key]) || 0);
  const sum = (team, key) => team.reduce((total, h) => total + val(h, key), 0);
  const role = h => String(h.role || '').toLowerCase();
  const antiCC = new Set(['stun','knockup','freeze','suppress','pull','taunt','polymorph','immobilize','fear','displacement']);
  function analyzeDraft(data, enemyNames = [], allyNames = [], options = {}) {
    const lookup = new Map(data.heroes.map(h => [h.name, h]));
    const enemies = enemyNames.map(n => lookup.get(n)).filter(Boolean).filter(h => h.name !== 'Miya').slice(0, 5);
    const allies = allyNames.map(n => lookup.get(n)).filter(Boolean).filter(h => h.name !== 'Miya').slice(0, 4);
    const es = key => sum(enemies, key), as = key => sum(allies, key);
    const controlCount = enemies.filter(h => (h.cc || []).some(cc => antiCC.has(cc))).length;
    const suppressCount = enemies.filter(h => (h.cc || []).includes('suppress')).length;
    const support = as('R') * .65 + as('F') * .40 + as('Q') * .34 + as('H') * .25 + as('C') * .22;
    const heal = es('H') * 1.45 + es('S') * .68 + es('L') * .40 + es('Q') * .42;
    const tank = es('T') * 1.03 + es('F') * .49;
    const physical = enemies.reduce((n, h) => {
      const attack = val(h,'A') * .8 + val(h,'P') * .65;
      const physicalClass = /assassin|fighter|marksman/.test(role(h)) && val(h,'G') < 2;
      return n + attack + (physicalClass ? val(h,'D') * .88 + val(h,'B') * .56 : val(h,'D') * .15);
    }, 0);
    const magic = es('G') * .82 + enemies.reduce((n,h) => n + (val(h,'G') >= 2 ? val(h,'B') * .46 : 0),0);
    const dive = clamp(es('D') * .7 + es('M') * .37 + es('B') * .28 + controlCount * .2 - support * .42, 0, 40);
    const physicalDanger = clamp(physical * .81 + dive * .44 - support * .26, 0, 50);
    const magicDanger = clamp(magic * .9 + es('C') * .13 - support * .23, 0, 50);
    const crowd = es('C') * .62 + controlCount * .65;
    const hardTank = tank >= 4.2;
    const hardHeal = heal >= 3.1;
    const hardPhysical = physicalDanger >= 4.1;
    const hardMagic = magicDanger >= 4.0;
    const hardCC = crowd >= 5.8;
    const antiTank = hardTank || (tank >= 3.6 && enemies.length >= 3 && es('S') >= 3);
    const s = {heal,tank,dive,physicalDanger,magicDanger,crowd,support,controlCount,suppressCount,hardHeal,hardTank,hardPhysical,hardMagic,hardCC,antiTank};
    const boot = magicDanger >= 3.8 && crowd >= 3.4 ? 'tough' : physicalDanger >= 5.7 && magicDanger < 3.1 ? 'warrior' : 'swift';
    const threats = [
      {id:'sea',need:hardHeal,score:75+heal*7,reason:'Prediksi sustain / heal / shield musuh tinggi'},
      {id:'roar',need:hardTank,score:69+tank*7,reason:'Prediksi frontline tebal; physical defense lawan harus dicek langsung'},
      {id:'nature',need:hardPhysical,score:75+physicalDanger*7,reason:'Ancaman physical burst / dive tinggi'},
      {id:'meteor',need:hardMagic,score:75+magicDanger*7,reason:'Ancaman magic burst tinggi'}
    ];
    // For two simultaneous defensive threats prefer the dominant type; neither protects from everything.
    if (hardPhysical && hardMagic) {
      const dominant = physicalDanger >= magicDanger ? 'nature' : 'meteor';
      const minor = dominant === 'nature' ? 'meteor' : 'nature';
      const m = threats.find(x=>x.id===minor);
      m.score -= 36;
    }
    const sorted = threats.filter(x=>x.need).sort((a,b)=>b.score-a.score);
    let path, order, missing = [];
    if (antiTank) {
      path = 'onhit';
      // No crit items alongside Golden Staff; fixed synergy trio.
      const fixed = [boot,'corrosion','dhs','golden'];
      const flex = [];
      // Roar is preferred when armor threat is clearly signalled by the draft.
      if (hardTank) flex.push('roar');
      for (const t of sorted) if (!flex.includes(t.id)) flex.push(t.id);
      for (const id of ['sea','gun','nature','meteor','roar']) if (!flex.includes(id)) flex.push(id);
      order = [...fixed,...flex.slice(0,2)];
      missing = sorted.filter(x => !order.includes(x.id)).map(x => x.id);
    } else {
      path = 'crit';
      const fixed = [boot,'wind','berserker'];
      const flex = [...sorted.map(x=>x.id)];
      for (const id of ['haas','gun','nature','blade']) if (!flex.includes(id)) flex.push(id);
      order = [...fixed,...flex.slice(0,3)];
      missing = sorted.filter(x => !order.includes(x.id)).map(x => x.id);
    }
    // Optional manual attack-oriented swap, only when safety item exists.
    let switched = null;
    if (options.offenseSwap) {
      const at = order.findIndex(id => id === 'nature' || id === 'meteor');
      if (at > 0) {
        const replacement = ['haas','gun','blade','sea','roar'].find(id => !order.includes(id) && (path === 'crit' || id !== 'haas'));
        if (replacement) { switched = {from:order[at],to:replacement,index:at}; order[at] = replacement; }
      }
    }
    if (options.counterMode) {
      const protectedId = sorted.map(x=>x.id).find(id => order.includes(id));
      if (protectedId) {
        const index = order.indexOf(protectedId);
        if (index > 2) {
          order.splice(index,1);
          order.splice(2,0,protectedId);
        }
      }
    }
    const stats = order.reduce((all,id)=>{
      const item = data.items[id];
      if (!item) return all;
      all.attackSpeed += item.as || 0; all.crit += item.crit || 0;
      all.lifesteal += item.lifesteal || 0; all.physicalAttack += item.atk || 0;
      all.cost += item.cost || 0; return all;
    },{attackSpeed:0,crit:0,lifesteal:0,physicalAttack:0,cost:0});
    // Includes only permanent printed item base stats; excludes passives, hero levels, emblem, spell and buffs.
    const spell = ((hardCC && suppressCount === 0 && dive >= 5.1 && support < 3.5) ? 'Purify'
      : ((dive >= 4.3 && support < 3.8) || (controlCount >= 2 && support < 2.5) ? 'Flicker' : 'Inspire'));
    const emblem = path === 'onhit' ? 'Marksman · Swift / Weapon Master / Weakness Finder' : 'Marksman · Fatal / Weapon Master / Quantum Charge';
    const tags = [antiTank?'Anti-tank':'Critical',hardHeal?'Antiheal':null,hardPhysical?'Anti-fisik':null,hardMagic?'Anti-magic':null,hardCC?'Waspada CC':null].filter(Boolean);
    const verdict = sorted.map(x=>x.reason);
    return {path,order,stats,spell,emblem,tags,signals:s,missing,switched,verdict,options:{counterMode:!!options.counterMode,offenseSwap:!!options.offenseSwap}};
  }
  return { analyzeDraft };
});
