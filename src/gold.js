/* ---------- (Dominic, t575s2576 / Art's chat 2574: 'Gold coins should be separate as an inventory item and nothing in game should be outside that') gold = the
   'Gold coins' backpack item (Craft ITEMS 'coin:gold', one slot, no stack limit) and nothing else: no purse / balance anywhere. Every price (the Lumen Crystal shop,
   the Theus pickaxe exchange, the Exchange, Mosby's fare, the Skill Tree reset when it gets a price) reads and spends the coins in the backpack; anything that pays
   gold pays coins into it (monster kills: COIN_DROPS). Public API (the only place gold is read or changed):
     Gold.getGold()      -> whole coins in the backpack
     Gold.canAfford(n)   -> getGold() >= n
     Gold.spendGold(n)   -> true and n coins taken, or false and nothing taken
     Gold.addGold(n)     -> coins credited (never lost: a full backpack with no coin slot still gets one, past its last slot, as an old over-full save keeps its stacks)
     Gold.migrate(s)     -> once per save (GOLD_COINS.MIGRATE_V): the old S.gold purse -> coins in the backpack; S.gold removed ---------- */
const GOLD_COINS = {
  ITEM: 'coin:gold',   // the backpack item (src/craft.js ITEMS, t566s2525)
  START: 2500,         // coins a save starts with: the old purse's seed (S.gold defaulted to 2500 the first time anything read it), so old and new players keep it
  MIGRATE_V: 1,        // S.goldV once the purse has been moved into the backpack
};
const Gold = (() => {
  const T = () => GOLD_COINS, st = (s) => s || (typeof S !== 'undefined' ? S : null);
  const bagOf = (s) => (s.backpack && typeof s.backpack === 'object' ? s.backpack : (s.backpack = {}));
  // the purse -> coins: its balance (or the old lazy 2500 seed when it was never read) into the coin stack; past a full backpack it takes a slot past the last one
  function migrate(s) { s = st(s); if (!s || (s.goldV || 0) >= T().MIGRATE_V) return s; const n = s.gold == null ? T().START : Math.max(0, Math.floor(+s.gold || 0)); delete s.gold; s.goldV = T().MIGRATE_V;
    if (n > 0) force(s, n); s.goldMigrated = n; return s; }
  function force(s, n) { const b = bagOf(s), id = T().ITEM; b[id] = Math.min(Number.MAX_SAFE_INTEGER, Math.floor(b[id] || 0) + n); if (s === (typeof S !== 'undefined' ? S : null) && typeof Craft !== 'undefined' && Craft.order) Craft.order('bag'); return n; }
  function getGold(s) { s = migrate(st(s)); if (!s) return 0; return Math.max(0, Math.floor((bagOf(s)[T().ITEM]) || 0)); }
  const canAfford = (n, s) => getGold(s) >= Math.max(0, Math.ceil(+n || 0));
  function spendGold(n, s) { s = migrate(st(s)); n = Math.ceil(+n || 0); if (!s || !(n >= 0) || getGold(s) < n) return false; if (!n) return true; const b = bagOf(s), id = T().ITEM; b[id] = getGold(s) - n; if (b[id] <= 0) delete b[id];
    if (s === (typeof S !== 'undefined' ? S : null) && typeof Craft !== 'undefined' && Craft.order) Craft.order('bag'); return true; }
  function addGold(n, s) { s = migrate(st(s)); n = Math.floor(+n || 0); if (!s || !(n > 0)) return 0; if (typeof Craft !== 'undefined' && Craft.add && s === S && Craft.add('bag', T().ITEM, n) === n) return n; return force(s, n); }
  return { getGold, canAfford, spendGold, addGold, migrate, get ITEM() { return T().ITEM; } };
})();
