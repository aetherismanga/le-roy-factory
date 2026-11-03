import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, PRODUCTS } from '../assets/js/ragreage-core.mjs';

const base = { support: 'tile', location: 'inside', finish: 'tile', heating: 'none', condition: 'sound', area: 50, thickness: 4, margin: 5, product: 'auto', minThickness: 3, maxThickness: 5 };

test('50 m² carrelés à 4 mm : calcul et primaire issus du profil réel', () => {
  const r = calculate(base);
  assert.equal(r.valid, true);
  assert.equal(r.blocked, false);
  assert.equal(r.product.id, 'for');
  assert.equal(r.netKg, 320);
  assert.equal(r.totalKg, 336);
  assert.equal(r.bags, 14);
  assert.equal(r.purchasedKg, 350);
  assert.equal(r.surplusKg, 14);
  assert.equal(r.loadKgM2, 6.4);
  assert.equal(r.primaryMin, 5);
  assert.equal(r.primaryMax, 10);
  assert.match(r.primary.label, /universel/);
});

test('marges distinctes et arrondi au sac supérieur', () => {
  assert.equal(calculate({ ...base, margin: 0 }).bags, 13);
  assert.equal(calculate({ ...base, margin: 10 }).bags, 15);
  assert.equal(calculate({ ...base, area: 5, thickness: 3.125, minThickness: null, maxThickness: null, margin: 0 }).bags, 1);
  assert.equal(calculate({ ...base, area: 5, thickness: 3.126, minThickness: null, maxThickness: null, margin: 0 }).bags, 2);
});

test('saisie décimale française et surface en très petite quantité', () => {
  const r = calculate({ ...base, area: '12,5', thickness: '4,5' });
  assert.equal(r.netKg, 90);
  assert.equal(r.bags, 4);
  assert.equal(calculate({ ...base, area: 0.000001, margin: 0 }).bags, 1);
});

test('les profils réels ne sont pas altérés par des paramètres libres', () => {
  const r = calculate({ ...base, rate: 0.1, bag: 100 });
  assert.equal(r.rate, 1.6);
  assert.equal(r.bag, 25);
  assert.equal(PRODUCTS.for.min, 3);
});

test('produit libre : calcul seul, aucun primaire prescrit', () => {
  const r = calculate({ ...base, product: 'custom', rate: 1.8, bag: 20 });
  assert.equal(r.totalKg, 378);
  assert.equal(r.bags, 19);
  assert.equal(r.blocked, false);
  assert.equal(r.primaryMin, null);
  assert.equal(r.primary.rateMin, null);
  assert.ok(r.warnings.some(x => /calcul de quantité uniquement/.test(x)));
});

test('extérieur couvert : dur+, pente existante vérifiée obligatoire', () => {
  const r = calculate({ ...base, location: 'outside', slope: 'ready' });
  assert.equal(r.product.id, 'dur');
  assert.equal(r.blocked, false);
  assert.equal(r.totalKg, 357);
  for (const slope of ['unknown', 'create']) assert.equal(calculate({ ...base, location: 'outside', slope }).blocked, true);
  assert.equal(calculate({ ...base, location: 'outside' }).blocked, true);
});

test('extérieur : supports et revêtements incompatibles bloqués', () => {
  for (const support of ['wood', 'anhydrite']) assert.equal(calculate({ ...base, location: 'outside', slope: 'ready', support }).blocked, true);
  for (const finish of ['soft', 'parquet']) assert.equal(calculate({ ...base, location: 'outside', slope: 'ready', finish }).blocked, true);
  assert.equal(calculate({ ...base, location: 'outside', slope: 'ready', product: 'for' }).blocked, true);
});

test('finition nue : lex2 sur ciment, primaire RP et limite continue 10 mm', () => {
  const r = calculate({ ...base, support: 'cement', porosity: 'absorbent', location: 'outside', slope: 'ready', finish: 'bare' });
  assert.equal(r.blocked, false);
  assert.equal(r.product.id, 'lex');
  assert.match(r.primary.label, /RP/);
  assert.equal(r.primaryMin, 7.5);
  assert.equal(r.primaryMax, 12.5);
  assert.equal(calculate({ ...base, support: 'cement', location: 'outside', slope: 'ready', finish: 'bare', maxThickness: 11 }).blocked, true);
});

test('finition nue sur ancien carrelage réclame une validation du primaire', () => {
  const r = calculate({ ...base, finish: 'bare', location: 'outside', slope: 'ready' });
  assert.equal(r.blocked, true);
  assert.ok(r.blocks.some(x => /4716/.test(x)));
  assert.equal(r.primaryMin, null);
  assert.equal(calculate({ ...base, location: 'outside', finish: 'bare', slope: 'ready', product: 'dur' }).blocked, true);
});

test('anhydrite : RP ; bois : universel et charge à contrôler ; minimum réel 3 mm', () => {
  for (const product of ['for', 'dur']) {
    const r = calculate({ ...base, support: 'anhydrite', product });
    assert.equal(r.blocked, false);
    assert.match(r.primary.label, /RP/);
  }
  const wood = calculate({ ...base, support: 'wood', thickness: 3, minThickness: 3, maxThickness: 3 });
  assert.equal(wood.blocked, false);
  assert.match(wood.primary.label, /universel/);
  assert.ok(wood.warnings.some(x => /capacité portante/.test(x)));
});

test('chauffage à eau et PRE admis avec for / dur, lex à faire valider', () => {
  for (const product of ['for', 'dur']) for (const heating of ['water', 'electric']) {
    const r = calculate({ ...base, product, heating });
    assert.equal(r.blocked, false);
    assert.ok(r.warnings.some(x => /48 h/.test(x)));
  }
  assert.equal(calculate({ ...base, support: 'cement', product: 'lex', heating: 'electric' }).blocked, true);
});

test('peinture : auto dur+, for explicitement non documenté', () => {
  assert.equal(calculate({ ...base, support: 'paint' }).product.id, 'dur');
  assert.equal(calculate({ ...base, support: 'paint' }).blocked, false);
  assert.equal(calculate({ ...base, support: 'paint', product: 'for' }).blocked, true);
});

test('les bornes sont locales et le creux peut déclencher dur+ automatiquement', () => {
  const r = calculate({ ...base, maxThickness: 40 });
  assert.equal(r.product.id, 'dur');
  assert.equal(r.blocked, false);
  assert.equal(calculate({ ...base, product: 'for', minThickness: 2 }).blocked, true);
  assert.equal(calculate({ ...base, maxThickness: 51 }).blocked, true);
  assert.equal(calculate({ ...base, product: 'for', maxThickness: 31 }).blocked, true);
  assert.ok(calculate({ ...base, minThickness: null, maxThickness: null }).warnings.some(x => /points hauts/.test(x)));
});

test('humidités, fissures, instabilité et support inconnu bloquent aussi le mode libre', () => {
  for (const condition of ['damp', 'cracks', 'unstable']) for (const product of ['auto', 'custom']) {
    const r = calculate({ ...base, condition, product });
    assert.equal(r.valid, true);
    assert.equal(r.blocked, true);
    assert.equal(r.primaryMin, null);
  }
  assert.equal(calculate({ ...base, support: 'unknown' }).blocked, true);
});

test('saisies non valides ne produisent pas de nombre de sacs', () => {
  for (const value of [0, -1, '', 'abc', NaN, Infinity]) {
    for (const key of ['area', 'thickness']) {
      const r = calculate({ ...base, [key]: value });
      assert.equal(r.valid, false, `${key} ${value}`);
      assert.equal(r.bags, null);
    }
  }
  for (const changes of [
    { margin: 7 }, { support: 'arbitrary' }, { location: 'arbitrary' },
    { finish: 'arbitrary' }, { heating: 'arbitrary' }, { condition: 'arbitrary' },
    { product: 'arbitrary' }, { minThickness: 6, maxThickness: 3 },
    { minThickness: 5 }, { maxThickness: 3 }, { minThickness: -1 },
    { product: 'custom', rate: 0 }, { product: 'custom', bag: 0 },
    { product: 'custom', rate: null }, { product: 'custom', bag: null },
    { area: 1e308 }, { location: 'outside', slope: 'invalid' },
  ]) assert.equal(calculate({ ...base, ...changes }).valid, false, JSON.stringify(changes));
});

test('un état extérieur invalide ne pénalise pas un chantier intérieur', () => {
  assert.equal(calculate({ ...base, slope: 'invalid' }).valid, true);
});

test('la porosité minérale est nécessaire avant de prescrire le primaire', () => {
  const unknown = calculate({ ...base, support: 'concrete' });
  assert.equal(unknown.blocked, false);
  assert.equal(unknown.primaryMin, null);
  assert.match(unknown.primary.label, /porosité/);
  assert.match(calculate({ ...base, support:'concrete', porosity:'absorbent' }).primary.label, /RP/);
  assert.match(calculate({ ...base, support:'concrete', porosity:'closed' }).primary.label, /universel/);
  const bare = calculate({ ...base, support:'concrete', porosity:'closed', location:'outside', slope:'ready', finish:'bare' });
  assert.equal(bare.primaryMin, null);
  assert.match(bare.primary.detail, /4716/);
});

test('une annexe nue intérieure peut utiliser dur+ à 20 mm et sur carrelage', () => {
  const thick = calculate({ ...base, support:'cement', finish:'bare', thickness:20, minThickness:20, maxThickness:20 });
  assert.equal(thick.product.id, 'dur');
  assert.equal(thick.blocked, false);
  const tile = calculate({ ...base, finish:'bare' });
  assert.equal(tile.blocked, false);
  assert.match(tile.primary.label, /universel/);
});
