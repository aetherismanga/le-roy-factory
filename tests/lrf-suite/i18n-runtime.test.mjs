import test from 'node:test';
import assert from 'node:assert/strict';
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
