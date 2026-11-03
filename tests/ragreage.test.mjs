import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculate, matchesBrandSearch } from '../assets/js/ragreage-core.mjs';

const RP = { name:'Primaire absorbant du fabricant', detail:'Fiche du système', rateMin:.15, rateMax:.25, url:'https://example.test/primary' };
const GRIP = { name:'Primaire fermé du fabricant', detail:'Fiche du système', rateMin:.1, rateMax:.2, url:'https://example.test/grip' };
const profile = {
  id:'reference-renovation', name:'Référence rénovation', type:'Ragréage intérieur fibré', rate:1.6, bag:25, min:3, max:30,
  sourceUrl:'https://example.test/technical-sheet', locations:['inside'],
  supports:['tile','concrete','cement','wood','anhydrite'], heating:['none','water','electric'], finishes:['tile','soft','parquet'],
  primaries:{tile:GRIP,wood:GRIP,anhydrite:RP,cementAbsorbent:RP,concreteAbsorbent:RP,cementClosed:GRIP,concreteClosed:GRIP},
};
const outdoor = { ...profile, id:'reference-outdoor',name:'Référence extérieur',rate:1.7,min:3,max:50,locations:['inside','outside'],supports:['tile','concrete','cement'],finishes:['tile','bare'],locationFinishes:{inside:['tile','bare'],outside:['tile']} };
const brands = [{ id:'fr-reference',name:'Marque de référence',country:'fr',products:[profile,outdoor] },
  { id:'it-other',name:'Autre fabricant',country:'it',products:[{...profile,id:'other-product',rate:1.8,bag:23}] },
  { id:'unqualified',name:'Fiches à qualifier',products:[],unverifiedNote:'Les fiches de cette marque doivent être validées avant le calcul.' }];
const base = { brand:'fr-reference',support:'tile',location:'inside',finish:'tile',heating:'none',condition:'sound',area:50,thickness:4,margin:5,minThickness:3,maxThickness:5 };
const run = (changes={}, catalogue=brands) => calculate({...base,...changes},catalogue);
const clearBounds = {minThickness:null,maxThickness:null};

function countryBrands(name) { return JSON.parse(readFileSync(new URL(`../assets/data/ragreage/${name}.json`,import.meta.url),'utf8')).brands; }

test('la marque choisie détermine la formule et le poids réel du sac',()=>{
  const r=run();
  assert.equal(r.valid,true);assert.equal(r.blocked,false);
  assert.equal(r.brand.id,'fr-reference');assert.equal(r.product.id,'reference-renovation');
  assert.equal(r.netKg,320);assert.equal(r.totalKg,336);assert.equal(r.bags,14);
  assert.equal(r.purchasedKg,350);assert.equal(r.surplusKg,14);assert.equal(r.loadKgM2,6.4);
  assert.equal(r.primaryMin,5);assert.equal(r.primaryMax,10);
  const other=run({brand:'it-other'});
  assert.equal(other.rate,1.8);assert.equal(other.bag,23);assert.equal(other.bags,17);
});

test('le moteur ne remplace jamais une marque inconnue ou non qualifiée',()=>{
  for(const brand of [undefined,'','does-not-exist']) {
    const r=run({brand});assert.equal(r.valid,false);assert.equal(r.product,null);assert.equal(r.bags,null);
  }
  const r=run({brand:'unqualified'});assert.equal(r.valid,true);assert.equal(r.blocked,true);assert.equal(r.product,null);assert.equal(r.bags,null);
  assert.match(r.blocks.join(' '),/doivent être validées/);
  const duplicate=run({},[...brands,{...brands[0]}]);assert.equal(duplicate.valid,false);assert.equal(duplicate.product,null);
});

test('une référence incompatible ne déclenche pas une autre marque',()=>{
  const r=run({brand:'it-other',location:'outside',slope:'ready'});
  assert.equal(r.blocked,true);assert.equal(r.product,null);assert.equal(r.bags,null);
  assert.equal(r.brand.id,'it-other');assert.match(r.blocks.join(' '),/Autre fabricant/);
});

test('les anciens paramètres produit et consommation ne peuvent pas modifier le calcul',()=>{
  const r=run({product:'custom',rate:.1,bag:100});
  assert.equal(r.rate,1.6);assert.equal(r.bag,25);assert.equal(r.bags,14);
});

test('marges séparées et arrondi au sac supérieur, sans perte à la frontière',()=>{
  assert.equal(run({margin:0}).bags,13);assert.equal(run({margin:10}).bags,15);
  assert.equal(run({area:5,thickness:3.125,margin:0,...clearBounds}).bags,1);
  assert.equal(run({area:5,thickness:3.126,margin:0,...clearBounds}).bags,2);
  assert.equal(run({area:.000001,margin:0}).bags,1);
  assert.equal(run({area:'12,5',thickness:'4,5'}).netKg,90);
});

test('la porosité doit être connue avant de prescrire un primaire minéral',()=>{
  const unknown=run({support:'concrete'});assert.equal(unknown.blocked,false);assert.equal(unknown.primaryMin,null);assert.match(unknown.primary.label,/porosité/);
  assert.match(run({support:'cement',porosity:'absorbent'}).primary.label,/absorbant/);
  assert.match(run({support:'concrete',porosity:'closed'}).primary.label,/fermé/);
  assert.equal(run({support:'cement',porosity:'absorbent'}).primaryMin,7.5);
});

test('un primaire absent ou exprimé en litres ne reçoit pas une fausse quantité en kg',()=>{
  const missing=run({},[{...brands[0],products:[{...profile,primaries:{}}]}]);
  assert.equal(missing.blocked,false);assert.equal(missing.primaryMin,null);assert.match(missing.primary.label,/confirmer/);
  const litres=run({},[{...brands[0],products:[{...profile,primaries:{tile:{...GRIP,unit:'L'}}}]}]);
  assert.equal(litres.primary.unit,'L');assert.equal(litres.primaryMin,null);assert.equal(litres.primaryMax,null);
});

test('les épaisseurs admissibles sont propres au support',()=>{
  const limited=[{...brands[0],products:[{...profile,supportLimits:{tile:{min:5,max:10}}}]}];
  const tooThin=run({},limited);assert.equal(tooThin.blocked,true);assert.equal(tooThin.bags,null);
  assert.match(tooThin.blocks.join(' '),/5 à 10 mm/);
  assert.equal(run({thickness:5,minThickness:5,maxThickness:10},limited).blocked,false);
  assert.equal(run({thickness:5,minThickness:5,maxThickness:11},limited).blocked,true);
});

test('les limites parquet et chauffage se combinent avec celles du support',()=>{
  const limited=[{...brands[0],products:[{...profile,finishLimits:{parquet:{min:5}},heatingLimits:{water:{min:6},electric:{min:7}}}]}];
  assert.equal(run({finish:'parquet'},limited).blocked,true);
  assert.equal(run({finish:'parquet',thickness:5,minThickness:5,maxThickness:5},limited).blocked,false);
  assert.equal(run({finish:'parquet',heating:'water',thickness:5,minThickness:5,maxThickness:5},limited).blocked,true);
  assert.equal(run({heating:'water',thickness:6,minThickness:6,maxThickness:6},limited).blocked,false);
  assert.equal(run({heating:'electric',thickness:6,minThickness:6,maxThickness:6},limited).blocked,true);
});

test('un usage chauffant non documenté doit être bloqué, même sur un autre produit admis',()=>{
  const limited=[{...brands[0],products:[{...profile,heating:['none']}]}];
  for(const heating of ['water','electric']) {const r=run({heating},limited);assert.equal(r.blocked,true);assert.equal(r.product,null);}
});

test('le support bois distingue panneaux et lames et refuse une nature inconnue',()=>{
  const limited=[{...brands[0],products:[{...profile,woodPanelsOnly:true}]}];
  assert.equal(run({support:'wood'},limited).blocked,true);
  assert.equal(run({support:'wood',woodType:'planks'},limited).blocked,true);
  const panels=run({support:'wood',woodType:'panels'},limited);assert.equal(panels.blocked,false);assert.ok(panels.warnings.some(x=>/capacité portante/.test(x)));
});

test('un creux peut sélectionner une autre référence de la même marque',()=>{
  const r=run({maxThickness:40});assert.equal(r.blocked,false);assert.equal(r.product.id,'reference-outdoor');assert.equal(r.rate,1.7);
  const tooDeep=run({maxThickness:51});assert.equal(tooDeep.blocked,true);assert.equal(tooDeep.product,null);
});

test('extérieur : pente vérifiée nécessaire, création de pente hors calcul',()=>{
  const good=run({location:'outside',slope:'ready'});assert.equal(good.blocked,false);assert.equal(good.product.id,'reference-outdoor');assert.equal(good.totalKg,357);
  for(const slope of ['unknown','create']) {const r=run({location:'outside',slope});assert.equal(r.blocked,true);assert.equal(r.bags,null);}
  for(const finish of ['parquet','soft']) assert.equal(run({location:'outside',slope:'ready',finish}).blocked,true);
  assert.equal(run({location:'inside',slope:'invalid'}).valid,true);
});

test('un revêtement nu autorisé en annexe ne devient pas autorisé en extérieur',()=>{
  const inside=run({finish:'bare'});assert.equal(inside.blocked,false);assert.equal(inside.product.id,'reference-outdoor');
  const outside=run({finish:'bare',location:'outside',slope:'ready'});assert.equal(outside.blocked,true);assert.equal(outside.product,null);
});

test('les restrictions et primaires conditionnels ne sont pas contournés',()=>{
  const restricted={...profile,finishes:['tile','bare'],exclusions:[{when:{support:'tile',finish:'bare'},message:'Primaire spécifique à valider.'}],primaryOverrides:[{when:{finish:'bare'},primaries:{cementAbsorbent:RP}}]};
  const catalogue=[{...brands[0],products:[restricted]}];
  const tile=run({finish:'bare'},catalogue);assert.equal(tile.blocked,true);assert.match(tile.blocks.join(' '),/Primaire spécifique/);
  const cement=run({finish:'bare',support:'cement',porosity:'absorbent'},catalogue);assert.equal(cement.blocked,false);assert.match(cement.primary.label,/absorbant/);
  const closed=run({finish:'bare',support:'cement',porosity:'closed'},catalogue);assert.equal(closed.primaryMin,null);
});

test('humidité, fissures et instabilité bloquent les quantités, pas seulement une note',()=>{
  for(const condition of ['damp','cracks','unstable']) {
    const r=run({condition});assert.equal(r.valid,true);assert.equal(r.blocked,true);assert.equal(r.bags,null);assert.equal(r.primaryMin,null);
  }
  assert.equal(run({support:'unknown'}).blocked,true);
});

test('les données de catalogue incomplètes ne deviennent pas un profil calculable',()=>{
  for(const change of [{rate:null},{bag:0},{min:null},{max:Infinity},{heating:[]},{sourceUrl:undefined}]) {
    const r=run({},[{...brands[0],products:[{...profile,...change}]}]);assert.equal(r.blocked,true);assert.equal(r.product,null);assert.equal(r.bags,null);
  }
});

test('les saisies invalides et débordements ne produisent pas de commande',()=>{
  for(const value of [0,-1,'','abc',NaN,Infinity,null]) for(const key of ['area','thickness']) {
    const r=run({[key]:value});assert.equal(r.valid,false,`${key} ${value}`);assert.equal(r.bags,null);
  }
  for(const change of [{margin:7},{support:'other'},{location:'other'},{finish:'other'},{heating:'other'},{condition:'other'},
    {porosity:'other'},{minThickness:6,maxThickness:3},{minThickness:5},{maxThickness:3},{minThickness:-1},
    {support:'wood',woodType:'invalid'},{location:'outside',slope:'invalid'},{area:1e308}]) {
    const r=run(change);assert.equal(r.valid,false,JSON.stringify(change));assert.equal(r.bags,null);
  }
});

test('Italie : les sacs de 23 kg Mapei et le minimum parquet de 3 mm sont conservés',()=>{
  const catalogue=countryBrands('italy');const brand=catalogue.find(b=>b.name==='Mapei');
  const r=run({brand:brand.id},catalogue);assert.equal(r.blocked,false);assert.equal(r.bag,23);assert.equal(r.rate,1.6);assert.equal(r.bags,15);
  assert.equal(run({brand:brand.id,finish:'parquet',thickness:2,...clearBounds},catalogue).blocked,true);
  assert.equal(run({brand:brand.id,heating:'electric'},catalogue).blocked,true);
});

test('Italie : chauffage Kerakoll minimum 5 mm et anhydrite Benfer maximum 10 mm',()=>{
  const catalogue=countryBrands('italy');const kerakoll=catalogue.find(b=>b.name==='Kerakoll');const benfer=catalogue.find(b=>b.name==='Benfer');
  assert.equal(run({brand:kerakoll.id,heating:'water'},catalogue).blocked,true);
  assert.equal(run({brand:kerakoll.id,heating:'electric',thickness:5,minThickness:5,maxThickness:5},catalogue).blocked,false);
  assert.equal(run({brand:benfer.id,support:'anhydrite',thickness:11,minThickness:11,maxThickness:11},catalogue).blocked,true);
});

test('Italie : Technokolla documente les panneaux bois mais pas les lames',()=>{
  const catalogue=countryBrands('italy');const brand=catalogue.find(b=>b.name==='Technokolla');
  assert.equal(run({brand:brand.id,support:'wood',woodType:'panels'},catalogue).blocked,false);
  assert.equal(run({brand:brand.id,support:'wood',woodType:'planks'},catalogue).blocked,true);
});

test('Espagne : la formule Sika 200 et les limites parquet GECOL restent propres au marché',()=>{
  const catalogue=countryBrands('spain');const sika=catalogue.find(b=>b.name==='Sika');const gecol=catalogue.find(b=>b.name==='GECOL');
  const r=run({brand:sika.id},catalogue);assert.equal(r.rate,1.74);assert.equal(r.bag,25);assert.equal(r.bags,15);
  assert.equal(run({brand:sika.id,finish:'parquet'},catalogue).blocked,true);
  const exact=run({brand:gecol.id,finish:'parquet',thickness:3,minThickness:3,maxThickness:3},catalogue);assert.equal(exact.blocked,false);assert.equal(exact.product.name,'GECOL Nivelante 10-R PLUS');
  assert.equal(run({brand:gecol.id,finish:'parquet'},catalogue).blocked,true);
});

test('une étanchéité extérieure obligatoire doit être prévue et validée avant la commande',()=>{
  const catalogue=[{...brands[0],products:[{...outdoor,requiredWaterproofingOutside:true}]}];
  for(const waterproofing of ['unknown','no']) {
    const r=run({location:'outside',slope:'ready',waterproofing},catalogue);
    assert.equal(r.blocked,true);assert.equal(r.bags,null);assert.match(r.blocks.join(' '),/étanchéité/);
  }
  const yes=run({location:'outside',slope:'ready',waterproofing:'yes'},catalogue);
  assert.equal(yes.blocked,false);assert.equal(yes.bags,15);assert.ok(yes.warnings.some(x=>/ordre de mise en œuvre/.test(x)));
});

test('les limites de catalogue mal formées et les sources non web ne sont pas interprétées',()=>{
  const invalid=run({},[{...brands[0],products:[{...profile,supportLimits:{tile:{min:'5'}}}]}]);
  assert.equal(invalid.blocked,true);assert.equal(invalid.bags,null);
  const unsafe=run({},[{...brands[0],products:[{...profile,sourceUrl:'javascript:alert(1)'}]}]);
  assert.equal(unsafe.blocked,true);assert.equal(unsafe.product,null);
  assert.equal(calculate(null,brands).valid,false);
  const huge=run({area:2e307},[{...brands[0],products:[{...profile,bag:1e308}]}]);
  assert.equal(huge.valid,false);assert.equal(huge.bags,null);
});

test('France : Weber et Bostik utilisent leurs consommations respectives',()=>{
  const catalogue=countryBrands('france');const weber=catalogue.find(b=>b.name==='Weber');const bostik=catalogue.find(b=>b.name==='Bostik');
  const a=run({brand:weber.id},catalogue);const b=run({brand:bostik.id},catalogue);
  assert.equal(a.rate,1.6);assert.equal(a.bags,14);assert.equal(b.rate,1.5);assert.equal(b.bags,13);
  assert.match(a.primary.label,/weberprim universel/);
  assert.equal(run({brand:weber.id,location:'outside',slope:'ready',finish:'bare'},catalogue).blocked,true);
});

test('France : Sikafloor 330 conserve ses limites bois et son exclusion anhydrite',()=>{
  const catalogue=countryBrands('france').map(b=>b.name==='Sika'?{...b,products:b.products.filter(p=>p.id==='sika-330')}:b);const brand=catalogue.find(b=>b.name==='Sika');
  assert.equal(run({brand:brand.id,support:'wood',woodType:'panels'},catalogue).blocked,true);
  assert.equal(run({brand:brand.id,support:'wood',woodType:'panels',thickness:5,minThickness:5,maxThickness:10},catalogue).blocked,false);
  assert.equal(run({brand:brand.id,support:'wood',woodType:'panels',thickness:5,minThickness:5,maxThickness:11},catalogue).blocked,true);
  assert.equal(run({brand:brand.id,support:'anhydrite'},catalogue).blocked,true);
});

test('France : le catalogue Parexlanko limite l’anhydrite à 10 mm et le bois commence à 5 mm',()=>{
  const catalogue=countryBrands('france');const brand=catalogue.find(b=>b.name==='Parexlanko');
  assert.equal(run({brand:brand.id,support:'anhydrite',thickness:11,minThickness:11,maxThickness:11},catalogue).blocked,true);
  assert.equal(run({brand:brand.id,support:'wood',woodType:'panels'},catalogue).blocked,true);
  assert.equal(run({brand:brand.id,support:'wood',woodType:'panels',thickness:5,minThickness:5,maxThickness:5},catalogue).blocked,false);
});

test('France : le PRB extérieur ne reprend pas le domaine carrelage intérieur',()=>{
  const catalogue=countryBrands('france');const brand=catalogue.find(b=>b.name==='PRB');
  assert.equal(run({brand:brand.id},catalogue).blocked,false);
  assert.equal(run({brand:brand.id,location:'outside',slope:'ready'},catalogue).blocked,true);
  assert.equal(run({brand:brand.id,location:'outside',slope:'ready',support:'concrete'},catalogue).blocked,false);
});

test('France : Planogel Rheo extérieur exige l’étanchéité du système',()=>{
  const catalogue=countryBrands('france');const brand=catalogue.find(b=>b.name==='Kerakoll');
  const pending=run({brand:brand.id,location:'outside',slope:'ready'},catalogue);
  assert.equal(pending.blocked,true);assert.match(pending.blocks.join(' '),/étanchéité/);assert.equal(pending.bags,null);
  assert.equal(run({brand:brand.id,location:'outside',slope:'ready',waterproofing:'yes'},catalogue).blocked,false);
});

test('les formules Mapei françaises et italiennes ne sont pas confondues',()=>{
  const fr=countryBrands('france'),it=countryBrands('italy');const france=fr.find(b=>b.name==='Mapei'),italy=it.find(b=>b.name==='Mapei');
  const catalogue=[...fr,...it];const a=run({brand:france.id},catalogue),b=run({brand:italy.id},catalogue);
  assert.equal(a.rate,1.4);assert.equal(a.bag,25);assert.equal(a.bags,12);
  assert.equal(b.rate,1.6);assert.equal(b.bag,23);assert.equal(b.bags,15);
});

test('les consommations d’un tableau fabricant sont exactes aux points et estimées entre les points',()=>{
  const catalogue=[{...brands[0],products:[{...profile,rate:1.7,consumptionPoints:[{thickness:3,kgM2:5.2},{thickness:5,kgM2:8.5}]}]}];
  const at3=run({thickness:3,minThickness:3,maxThickness:3},catalogue);
  assert.equal(at3.consumptionPerM2,5.2);assert.equal(at3.netKg,260);assert.equal(at3.bags,11);assert.equal(at3.consumptionMode,'table-exact');
  const at4=run({thickness:4,minThickness:4,maxThickness:4},catalogue);
  assert.equal(at4.consumptionPerM2,6.85);assert.equal(at4.netKg,342.5);assert.equal(at4.bags,15);assert.equal(at4.consumptionMode,'table-interpolated');assert.match(at4.consumptionDescription,/Estimation par interpolation/);
  const at5=run({thickness:5,minThickness:5,maxThickness:5},catalogue);
  assert.equal(at5.consumptionPerM2,8.5);assert.equal(at5.netKg,425);assert.equal(at5.bags,18);assert.equal(at5.consumptionMode,'table-exact');
  const at20=run({thickness:20,minThickness:20,maxThickness:20},catalogue);
  assert.equal(at20.rate,5.2/3);assert.equal(at20.bags,73);assert.equal(at20.consumptionMode,'table-extrapolated');assert.match(at20.consumptionDescription,/Extrapolation prudente/);
});

test('un tableau incomplet ou contradictoire ne bascule pas silencieusement vers une consommation forfaitaire',()=>{
  for(const consumptionPoints of [[],[{thickness:3,kgM2:null}],[{thickness:3,kgM2:5.2},{thickness:3,kgM2:8.5}]]) {
    const r=run({},[{...brands[0],products:[{...profile,consumptionPoints}]}]);
    assert.equal(r.blocked,true);assert.equal(r.bags,null);assert.equal(r.product,null);
  }
});

test('France : les vrais tableaux Sika 330 et CEGESOL F pilotent les calculs à 3, 4, 5 et 20 mm',()=>{
  const catalogue=countryBrands('france');
  for(const name of ['Sika','Cégécol']) {
    const brand=catalogue.find(item=>item.name===name);
    for(const [thickness,kgM2,bags,mode] of [[3,5.2,11,'table-exact'],[4,6.85,15,'table-interpolated'],[5,8.5,18,'table-exact'],[20,20*(5.2/3),73,'table-extrapolated']]) {
      const r=run({brand:brand.id,support:'concrete',thickness,minThickness:thickness,maxThickness:thickness},catalogue);
      assert.equal(r.blocked,false,`${name} ${thickness} mm`);assert.equal(r.consumptionPerM2,kgM2);assert.equal(r.bags,bags);assert.equal(r.consumptionMode,mode);
    }
  }
});

test('toutes les solutions compatibles ont leur propre quantité, sans formule partagée arbitraire',()=>{
  const r=run();
  assert.equal(r.alternatives.length,2);
  const a=r.alternatives.find(item=>item.id==='reference-renovation');
  const b=r.alternatives.find(item=>item.id==='reference-outdoor');
  assert.equal(a.selected,true);assert.equal(b.selected,false);
  assert.equal(a.bags,14);assert.equal(a.totalKg,336);assert.equal(a.rate,1.6);
  assert.equal(b.bags,15);assert.equal(b.totalKg,357);assert.equal(b.rate,1.7);
  assert.equal(a.product.id,a.id);assert.equal(b.product.id,b.id);
  assert.equal(a.primaryMin,5);assert.equal(a.primaryMax,10);
  assert.equal(r.selectionChanged,false);assert.equal(r.selectionMessage,'');
});

test('un choix explicite conserve la référence, sa consommation et son primaire',()=>{
  const special={...GRIP,name:'Primaire propre à la deuxième solution',rateMin:.2,rateMax:.3};
  const catalogue=[{...brands[0],products:[profile,{...outdoor,primaries:{tile:special}}]}];
  const r=run({productId:'reference-outdoor',product:'custom',rate:.1,bag:100},catalogue);
  assert.equal(r.product.id,'reference-outdoor');assert.equal(r.rate,1.7);assert.equal(r.bag,25);assert.equal(r.bags,15);
  assert.equal(r.primary.label,special.name);assert.equal(r.primaryMin,10);assert.equal(r.primaryMax,15);
  assert.equal(r.alternatives.find(item=>item.id===r.product.id).selected,true);
  assert.equal(r.selectionChanged,false);
});

test('une référence inconnue ou appartenant à une autre marque déclenche un repli explicite',()=>{
  for(const productId of ['other-product','invented-product']){
    const r=run({productId});
    assert.equal(r.valid,true);assert.equal(r.blocked,false);
    assert.equal(r.product.id,'reference-renovation');assert.equal(r.bags,14);
    assert.equal(r.selectionChanged,true);assert.match(r.selectionMessage,/actualisée avec Référence rénovation/);
    assert.ok(r.alternatives.every(item=>item.id!=='other-product'));
  }
});

test('un choix devenu incompatible est remplacé explicitement par une solution de la même marque',()=>{
  const r=run({productId:'reference-renovation',maxThickness:40});
  assert.equal(r.blocked,false);assert.equal(r.product.id,'reference-outdoor');
  assert.equal(r.selectionChanged,true);assert.equal(r.alternatives.length,1);
  assert.match(r.selectionMessage,/plus compatible/);
  const stillValid=run({productId:'reference-outdoor',maxThickness:40});
  assert.equal(stillValid.product.id,'reference-outdoor');assert.equal(stillValid.selectionChanged,false);
  const none=run({productId:'reference-renovation',maxThickness:51});
  assert.equal(none.blocked,true);assert.equal(none.product,null);assert.equal(none.bags,null);
  assert.deepEqual(none.alternatives,[]);assert.equal(none.selectionChanged,true);
});

test('un diagnostic global bloque aussi les quantités de chaque alternative',()=>{
  for(const changes of [{condition:'damp'},{condition:'cracks'},{condition:'unstable'},{location:'outside',slope:'unknown'}]){
    const r=run(changes);assert.equal(r.blocked,true);assert.equal(r.bags,null);
    assert.ok(r.alternatives.length>0);
    for(const option of r.alternatives){
      assert.equal(option.blocked,true);assert.equal(option.bags,null);assert.equal(option.netKg,null);
      assert.equal(option.totalKg,null);assert.equal(option.purchasedKg,null);assert.equal(option.primaryMin,null);assert.equal(option.primaryMax,null);
    }
  }
  const invalid=run({area:0});assert.equal(invalid.valid,false);
  assert.ok(invalid.alternatives.every(option=>!option.valid&&option.bags===null));
});

test('une option sous condition reste visible mais ne fournit aucune quantité tant que la condition manque',()=>{
  const withWaterproofing={...outdoor,id:'waterproofing-required',name:'Système avec étanchéité',requiredWaterproofingOutside:true};
  const catalogue=[{...brands[0],products:[outdoor,withWaterproofing]}];
  const input={location:'outside',slope:'ready',waterproofing:'unknown'};
  const r=run(input,catalogue);
  assert.equal(r.blocked,false);assert.equal(r.bags,15);assert.equal(r.alternatives.length,2);
  const option=r.alternatives.find(item=>item.id==='waterproofing-required');
  assert.equal(option.blocked,true);assert.equal(option.bags,null);assert.match(option.requirements.join(' '),/étanchéité/);
  const chosen=run({...input,productId:option.id},catalogue);
  assert.equal(chosen.product.id,option.id);assert.equal(chosen.blocked,true);assert.equal(chosen.bags,null);assert.equal(chosen.selectionChanged,false);
  const confirmed=run({...input,productId:option.id,waterproofing:'yes'},catalogue);
  assert.equal(confirmed.blocked,false);assert.equal(confirmed.bags,15);
  assert.equal(confirmed.alternatives.find(item=>item.id===option.id).bags,15);
});

test('les alternatives utilisant un tableau fabricant suivent le même calcul que la sélection',()=>{
  const fromTable={...profile,id:'from-table',name:'Référence avec tableau',consumptionPoints:[{thickness:3,kgM2:5.2},{thickness:5,kgM2:8.5}]};
  const catalogue=[{...brands[0],products:[profile,fromTable]}];
  const r=run({productId:'from-table'},catalogue);
  const option=r.alternatives.find(item=>item.id==='from-table');
  assert.equal(r.bags,15);assert.equal(r.consumptionPerM2,6.85);
  for(const key of ['bags','totalKg','netKg','rate','consumptionPerM2','consumptionMode','primaryMin','primaryMax'])assert.equal(option[key],r[key],key);
  assert.equal(option.consumptionMode,'table-interpolated');
});

test('France : les alternatives Weber permettent de choisir dur+ avec son vrai nombre de sacs',()=>{
  const catalogue=countryBrands('france');const weber=catalogue.find(item=>item.name==='Weber');
  const first=run({brand:weber.id},catalogue);
  const dur=first.alternatives.find(item=>/dur/i.test(item.name));
  assert.ok(first.alternatives.length>=2);assert.ok(dur);assert.equal(dur.bags,15);
  const chosen=run({brand:weber.id,productId:dur.id},catalogue);
  assert.equal(chosen.product.id,dur.id);assert.equal(chosen.bags,15);assert.equal(chosen.selectionChanged,false);
  assert.equal(chosen.alternatives.find(item=>item.selected).id,dur.id);
});

test('Planidur Pro et Plus sont proposés avec Planifibre et conservent leurs vrais domaines',()=>{
  const catalogue=countryBrands('france');const prb=catalogue.find(b=>b.id==='prb');
  const r=run({brand:'prb',support:'cement',thickness:5,...clearBounds},catalogue);
  assert.equal(r.alternatives.length,3);
  const selected=run({brand:'prb',support:'cement',thickness:5,...clearBounds,productId:'prb-planidur-pro'},catalogue);
  assert.equal(selected.product.id,'prb-planidur-pro');assert.equal(selected.bags,16);
  const heated=run({brand:'prb',support:'cement',heating:'electric',thickness:5,...clearBounds},catalogue);
  assert.equal(heated.product.id,'prb-planifibre');
  assert.ok(heated.excludedProducts.find(x=>x.product.id==='prb-planidur-pro').reasons.some(s=>s.includes('plancher rayonnant électrique')));
  const outside=run({brand:'prb',support:'cement',location:'outside',slope:'ready',finish:'bare',thickness:5,...clearBounds},catalogue);
  assert.equal(outside.product.id,'prb-planidur-plus');assert.equal(outside.bags,16);
  assert.ok(outside.excludedProducts.find(x=>x.product.id==='prb-planidur-pro').reasons.some(s=>s.includes('extérieur')));
});

test('Litokol permet de choisir 1–20 et 3–40, et explique le refus de la couche fine',()=>{
  const catalogue=countryBrands('italy');
  const r=run({brand:'it-litokol',support:'cement',thickness:2,...clearBounds},catalogue);
  assert.equal(r.product.id,'it-litokol-xplan120');assert.equal(r.bag,20);assert.equal(r.bags,9);
  assert.equal(r.excludedProducts.length,1);assert.match(r.excludedProducts[0].reasons.join(' '),/3 à 40 mm/);
  const thick=run({brand:'it-litokol',support:'cement',thickness:25,productId:'it-litokol-xplan120',...clearBounds},catalogue);
  assert.equal(thick.product.id,'it-litokol-xplan340');assert.equal(thick.selectionChanged,true);
  const parquet=run({brand:'it-litokol',support:'cement',thickness:2,finish:'parquet',...clearBounds},catalogue);
  assert.equal(parquet.blocked,true);assert.equal(parquet.bags,null);assert.equal(parquet.excludedProducts.length,2);
});

test('Bostik offre le choix puis exclut C780 au-delà de 10 mm sur chauffage',()=>{
  const catalogue=countryBrands('france');
  const r=run({brand:'bostik',support:'cement',thickness:5,...clearBounds},catalogue);
  assert.equal(r.alternatives.length,5);
  const selected=run({brand:'bostik',support:'cement',thickness:5,productId:'bostik-c910',...clearBounds},catalogue);
  assert.equal(selected.product.id,'bostik-c910');assert.equal(selected.bags,16);
  const high=run({brand:'bostik',support:'cement',thickness:15,heating:'water',...clearBounds},catalogue);
  assert.equal(high.product.id,'bostik-c510');assert.ok(high.excludedProducts.some(x=>x.product.id==='bostik-c780'&&x.reasons.some(s=>s.includes('3 à 10 mm'))));
});

test('Sikafloor 200 France garde 1,8 kg et choisit la barbotine selon les points hauts',()=>{
  const catalogue=countryBrands('france');const defaults={brand:'sika',productId:'sika-200',support:'cement',porosity:'absorbent',...clearBounds};
  const thin=run({...defaults,thickness:5},catalogue);assert.equal(thin.rate,1.8);assert.equal(thin.bags,19);assert.match(thin.primary.label,/18 Primaire/);
  const thick=run({...defaults,thickness:35},catalogue);assert.match(thick.primary.label,/Barbotine/);
  const variable=run({...defaults,thickness:25,maxThickness:35},catalogue);assert.match(variable.primary.label,/Barbotine/);
  const electric=run({...defaults,heating:'electric'},catalogue);assert.notEqual(electric.product?.id,'sika-200');assert.ok(electric.excludedProducts.some(x=>x.product.id==='sika-200'));
});

test('Mapei Maxi Fibre utilise la fiche France à 1,5 kg et non une formule Maxi historique',()=>{
  const catalogue=countryBrands('france');
  const r=run({brand:'mapei',support:'cement',thickness:20,productId:'mapei-maxi-fibre',...clearBounds},catalogue);
  assert.equal(r.product.id,'mapei-maxi-fibre');assert.equal(r.rate,1.5);assert.equal(r.bags,63);
});

test('la liste des exclusions couvre aussi une marque sans solution et ne fournit aucune fausse quantité',()=>{
  const r=run({location:'outside',support:'wood',woodType:'panels',slope:'ready'});
  assert.equal(r.alternatives.length,0);assert.equal(r.excludedProducts.length,2);assert.equal(r.bags,null);
  assert.ok(r.excludedProducts.every(x=>x.reasons.length>0&&!Object.hasOwn(x,'bags')));
});

test('le catalogue public contient tous les nouveaux médias et la carte est entre Reviglass et BILT',async()=>{
  const {BRANDS}=await import('../assets/js/ragreage-catalog.mjs');
  assert.equal(BRANDS.flatMap(b=>b.products).length,48);
  for(const b of BRANDS){if(b.products.length)assert.ok(b.logoPath || /^https:\/\//.test(b.logoUrl || ''),`${b.name}: logo fabricant`);}
  assert.equal(BRANDS.filter(b=>b.logoPath).length,23);
  const page=readFileSync(new URL('../configurateurs.html',import.meta.url),'utf8');
  const titles=[...page.matchAll(/<article class="config-card">(.*?)<\/article>/gs)].map(x=>x[1]);
  const index=titles.findIndex(x=>x.includes('configurateur-ragreage.html'));
  assert.ok(titles[index-1].includes('myvirtualpool.reviglass.es'));assert.ok(titles[index+1].includes('configurateur-croisillons.html'));
  assert.equal(titles.filter(x=>x.includes('configurateur-ragreage.html')).length,1);
});

test('Solbau propose ses deux produits avec leurs vraies consommations et primaires',()=>{
  const catalogue=countryBrands('spain');
  const input={brand:'solbau',support:'cement',porosity:'absorbent',thickness:10,...clearBounds};
  const r=run(input,catalogue);
  assert.deepEqual(r.alternatives.map(x=>[x.id,x.rate,x.bag,x.bags]),[
    ['solbau-level-03',1.8,25,38],['solbau-level-05',1.9,25,40]
  ]);
  assert.equal(r.primary.label,'SOLBAU Primer');assert.equal(r.primaryMin,null);
  const closed=run({...input,productId:'solbau-level-05',porosity:'closed'},catalogue);
  assert.equal(closed.product.id,'solbau-level-05');assert.equal(closed.primary.label,'SOLBAU Grip');
  const thin=run({...input,thickness:5},catalogue);
  assert.equal(thin.product.id,'solbau-level-03');assert.ok(thin.excludedProducts.some(x=>x.product.id==='solbau-level-05'));
});

test('Solbau ne reçoit pas de compatibilités non documentées',()=>{
  const catalogue=countryBrands('spain');
  const input={brand:'solbau',support:'cement',thickness:10,...clearBounds};
  for(const change of [{support:'tile'},{heating:'water'},{heating:'electric'},{location:'outside',slope:'ready'},{finish:'parquet'}]){
    const r=run({...input,...change},catalogue);
    assert.equal(r.alternatives.length,0);assert.equal(r.bags,null);assert.equal(r.excludedProducts.length,2);
  }
});

test('Propamsa garde son identifiant favori et répond aux anciennes appellations',async()=>{
  const {BRANDS}=await import('../assets/js/ragreage-catalog.mjs');
  for(const query of ['PROPAMSA',' propensa ','PROPAM','mólins']){
    const matches=BRANDS.filter(b=>b.country==='es'&&matchesBrandSearch(b,query));
    assert.deepEqual(matches.map(b=>b.id),['es-propam-molins']);
    assert.equal(matches[0].name,'Propamsa / Molins');
  }
  assert.equal(BRANDS.filter(b=>matchesBrandSearch(b,'SOLBAU'))[0].id,'es-solbau');
  assert.equal(BRANDS.some(b=>matchesBrandSearch(b,'fabricant inexistant')),false);
});

test('Propamsa permet de comparer Level 10, 15, 30 et 100 sans mélanger les quantités',()=>{
  const catalogue=countryBrands('spain');
  const input={brand:'propam-molins',support:'cement',porosity:'closed',thickness:10,...clearBounds};
  const r=run(input,catalogue);
  assert.deepEqual(r.alternatives.map(x=>[x.id,x.rate,x.bags]),[
    ['propam-floor-level-10',1.5,32],['propam-floor-level-15',1.6,34],
    ['propam-floor-level-30',1.7,36],['propam-floor-level-100',1.75,37]
  ]);
  assert.equal(run({...input,productId:'propam-floor-level-30'},catalogue).primary.label,'PROPAM PRIMER GRIP +');
  assert.equal(run({...input,thickness:50},catalogue).product.id,'propam-floor-level-100');
  const floating=run({...input,thickness:60},catalogue);
  assert.equal(floating.bags,null);assert.ok(floating.excludedProducts.some(x=>x.product.id==='propam-floor-level-100'));
});
