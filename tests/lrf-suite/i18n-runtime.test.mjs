import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {buildPhotorealPrompt} from '../../shared/lrf-3d/photoreal-export.js';
import {ES_UI,ES_PATTERNS} from '../../shared/lrf-3d/i18n/es-ui.js';
import {FR_UI,translateText as t,getLocale,setLocale,localeTag,onLocaleChange} from '../../shared/lrf-3d/i18n/index.js';

test('French fallback, locale validation and Spanish sector vocabulary',()=>{
 assert.equal(getLocale(),'fr');
 assert.equal(t('Nouveau projet'),'Nouveau projet');
 assert.equal(setLocale('de'),false);
 const events=[];const unsubscribe=onLocaleChange(locale=>events.push(locale));
 setLocale('es');assert.equal(localeTag(),'es-ES');
 assert.equal(t('Nouveau projet'),'Nuevo proyecto');
 assert.equal(t('Tiroir supérieur'),'Cajón superior');
 assert.equal(t('  Mur 4 · 450 cm  '),'  Pared 4 · 450 cm  ');
 assert.equal(t(' · Enregistré sur cet appareil · '),' · Guardado en este dispositivo · ');
 assert.equal(t('Catalogue général · '),'Catálogo general · ');
 assert.match(t('La matière n’a pas pu être chargée. Une future erreur fabricant.'),/^No se ha podido cargar el material\./);
 const notice='échantillon fabricant de définition limitée ; référence et finition conservées.';
 const combined=t('Sol : '+notice+' Mur 1 : '+notice+' Mur 2 : '+notice+' Mur 3 : '+notice);
 assert.doesNotMatch(combined,/échantillon|référence|finition|conservées|Mur [1-3]/);
 assert.match(combined,/Suelo:/);assert.match(combined,/Pared 1:/);assert.match(combined,/Pared 2:/);assert.match(combined,/Pared 3:/);
 assert.equal(t('Une future aide non traduite'),'Une future aide non traduite');
 setLocale('es');assert.deepEqual(events,['es']);unsubscribe();setLocale('fr');
});

test('Product identity, references and numeric values remain exact',()=>{
 for(const value of ['LRF-00317-668.88.00','Allure','Yosemite','Slate','Icon','Roble Amazona','Nogal Valentina','TR2217R','60x90','765,00 €','60 × 90 × 46 cm'])assert.equal(t(value,'es'),value);
 const project={title:'Nouveau projet',items:[{type:'cabinet',settings:{format:'two',width:100,finish:'ROBLE',top:'neris'},placement:{wall:1,u:165,height:28}}],reference:'LRF-00317-668.88.00'};
 const before=JSON.stringify(project);for(const item of project.items)t(item.settings.finish,'es');assert.equal(JSON.stringify(project),before);
});

test('Versioned dictionaries contain no empty translations or confidential commercial explanation',()=>{
 assert(Object.keys(ES_UI).length>2000);
 assert.equal(Object.keys(FR_UI).length,Object.keys(ES_UI).length);
 for(const [key,value] of Object.entries(ES_UI)){
  assert.equal(typeof value,'string',key);assert(value.trim(),key);
  assert.equal(FR_UI[key],key);
  assert.doesNotMatch(value,/LRF.{0,80}(?:precio de compra|prix d’achat|prix d'achat)|divid(?:ir|ido) por (?:2|dos)/i);
 }
 assert(ES_PATTERNS.length>100);
});


test('Spanish photorealistic instructions keep visual data and official names intact',()=>{
 const project={items:[{type:'cabinet',settings:{format:'two',width:80,finish:'ROBLE',top:'neris'},placement:{wall:1,u:100,height:28}}],room:{height:260,points:[[0,0],[450,0],[450,450],[0,450]]}};
 const before=JSON.stringify(project);setLocale('es');const text=buildPhotorealPrompt(project,{name:'RANDAL STUDIO ONE'});
 assert.match(text,/^Crea directamente una imagen fotorrealista/);assert.match(text,/RANDAL STUDIO ONE/);assert.match(text,/DATOS VISUALES DEL PROYECTO/);assert.match(text,/"width": 80/);assert.equal(JSON.stringify(project),before);setLocale('fr');
});

test('A direct Spanish demo link works when persistent browser storage is unavailable',()=>{
 const moduleURL=new URL('../../shared/lrf-3d/i18n/index.js',import.meta.url).href;
 const child=spawnSync(process.execPath,['--input-type=module'],{encoding:'utf8',input:`
  import assert from 'node:assert/strict';
  globalThis.location={search:'?lang=es&demo=randal'};
  Object.defineProperty(globalThis,'localStorage',{get(){throw new Error('Storage blocked');}});
  const i18n=await import(${JSON.stringify(moduleURL)});
  assert.equal(i18n.getLocale(),'es');assert.equal(i18n.translateText('Nouveau projet'),'Nuevo proyecto');
 `});assert.equal(child.status,0,child.stderr);
});

test('Only the trusted site parent receives the language preference, without project data',()=>{
 const moduleURL=new URL('../../shared/lrf-3d/i18n/index.js',import.meta.url).href;
 const child=spawnSync(process.execPath,['--input-type=module'],{encoding:'utf8',input:`
  import assert from 'node:assert/strict';const messages=[];
  globalThis.document={referrer:'https://leroyfactory.fr/studio-one-configurateur.html'};
  globalThis.parent={postMessage:(payload,origin)=>messages.push({payload,origin})};
  const i18n=await import(${JSON.stringify(moduleURL)});i18n.setLocale('es');
  assert.deepEqual(messages,[{payload:{type:'lrf-ui-language',locale:'es'},origin:'https://leroyfactory.fr'}]);
  document.referrer='https://untrusted.example/';i18n.setLocale('fr');assert.equal(messages.length,1);
 `});assert.equal(child.status,0,child.stderr);
});
