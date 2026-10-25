import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ES_UI,ES_PATTERNS} from '../i18n/es-ui.js';
import {translateText} from '../i18n/index.js';
import {auditSourceUI} from './i18n-source-audit.mjs';

// Reproducible presentation-boundary audit. Source catalogues and saved project
// values are not translated. This complements interactive desktop/mobile QA;
// it does not claim to explore every possible 3D configuration.
const root=fileURLToPath(new URL('../../../',import.meta.url));
const normalize=value=>value.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const decode=value=>value.replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:x[0-9a-f]+|\d+);/gi,entity=>{
 const named={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '};
 return named[entity]??String.fromCodePoint(entity[2]?.toLowerCase()==='x'?parseInt(entity.slice(3,-1),16):parseInt(entity.slice(2,-1),10));
});
const htmlFiles=['studio-one/src/atelier.html','randal-general/src/atelier.html','studio-one/src/commerce/home.html','randal-general/src/commerce/home.html'];
const preserved=new Set(['STUDIO ONE','RANDAL','Studio One','LE ROY FACTORY','ELIOS','VIEW','AQUA HOME','Aruba','Roble Amazona','Shell','Creta','Corso','Golden Stone','Avena','Beige','Horizontal','Vertical','Showroom premium','Gmail','Outlook','LRF-XXXXX','RANDAL · STUDIO ONE · LE ROY FACTORY','RANDAL STUDIO ONE · LE ROY FACTORY','← RANDAL','s','o','Shell Beige · 60 × 120 cm','Creta Avena · 60 × 120 cm']);
const numericOrSymbol=value=>!/[A-Za-zÀ-ÿ]/.test(value)||/^[\d\s.,×/Ø+−–—%°()XYm²clK↺·|:→]+$/.test(value)||/^[XY] \(cm\)$/.test(value);
const ignoredSource=new Set(['Créole_argent','Butée_porte','Gorge_BRUNEI_reculée','Época','Aruba rainuré','Vert céladon · or vieilli','Vert céladon · argent vieilli']);
const isFrench=value=>/[éèêëàâùûçôîïœ]/i.test(value)||/\b(?:votre|vos|les|des|une|pour|dans|sur|avec|le|la|du|choisir|modifier|projet|meuble|vasque|tiroir|colonne|carrelage|calepinage)\b/i.test(value);
const omissions=[];let htmlNodes=0,translatedNodes=0;
for(const file of htmlFiles){
 const source=fs.readFileSync(path.join(root,file),'utf8').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi,'');
 const strings=[];
 for(const match of source.matchAll(/>([^<>]+)</g))strings.push({kind:'text',text:match[1]});
 for(const match of source.matchAll(/\b(title|aria-label|alt|placeholder)\s*=\s*(["'])([\s\S]*?)\2/gi))strings.push({kind:match[1],text:match[3]});
 for(const {kind,text}of strings){const value=normalize(decode(text));if(!value)continue;htmlNodes++;const es=translateText(value,'es');if(es!==value){translatedNodes++;continue;}if(!preserved.has(value)&&!numericOrSymbol(value))omissions.push({file,kind,text:value});}
}

const exactCases=[
 ['Meuble 1 → M2 : 40 cm','Mueble 1 → P2: 40 cm'],
 ['En 85 cm, le plan assorti remplace la vasque encastrée.','En 85 cm, la encimera a juego sustituye al lavabo integrado.'],
 ['Plan vide · 2 niveaux · ouvertures, pierre et piscine conservées','Plano vacío · 2 plantas · aberturas, piedra y piscina conservadas'],
 ['Fermer les portes','Cerrar las puertas'],['Haut : ouvrir','Superior: abrir'],['Vasque Sella','Lavabo Sella'],
 ['Nouveau projet','Nuevo proyecto'],['Mes projets','Mis proyectos'],['Choisir un meuble','Elegir un mueble'],
 ['Plan vasque','Encimera con lavabo'],['Enregistrer','Guardar'],['Récapitulatif','Resumen'],['Visite 3D','Visita 3D'],
 ['Charnières à droite · inverser ↔','Bisagras a la derecha · invertir ↔'],
 ['Meuble 2 · 85 cm','Mueble 2 · 85 cm'],['Baignoire 1 · 170 × 75 cm','Bañera 1 · 170 × 75 cm'],
 ['Douche 2 · 120 × 80 cm','Ducha 2 · 120 × 80 cm'],['Cloison 2 · face 1','Tabique 2 · cara 1'],
 ['2 tiroirs · H 54 cm','2 cajones · A 54 cm'],['1 tiroir XL · H 37,5 cm','1 cajón XL · A 37,5 cm'],
 ['Surface réelle : 15,25 m² · avec marge : 16,47 m²','Superficie real: 15,25 m² · con margen: 16,47 m²'],
 ['10 entiers + 4 à découper · chutes théoriques 0,20 m²','10 enteras + 4 para cortar · sobrantes teóricos 0,20 m²'],
 ['4 boîtes · 16 pièces · 11,52 m²','4 cajas · 16 piezas · 11,52 m²'],
 ['8 pièces / 1,44 m² par boîte','8 piezas / 1,44 m² por caja'],
 ['Plan + Neris','Encimera + Neris'],['RANDAL · Réf. TR2217R','RANDAL · Ref. TR2217R'],
];
for(const [fr,es]of exactCases){assert.equal(translateText(fr,'es'),es,fr);assert.equal(translateText(fr,'fr'),fr,`French unchanged: ${fr}`);}
const representativeUI=[
 'Verrouillez les positions pour éviter un déplacement. Le calepinage s’équilibre automatiquement ; vous pouvez ensuite l’ajuster mur par mur.',
 'Le tapis est créé au centre du sol. Glissez-le avec la souris ; sur téléphone, maintenez le doigt puis glissez. Largeur et profondeur se modifient ici.',
 'Cloison ajoutée. Glissez-la dans la 3D ; réglez ses dimensions à droite.',
 'Vue HD de votre salle de bain configurée','Accès RANDAL non autorisé pour ce compte.',
 'Photo catalogue · détail · finition présentée : Chrome brillant',
 'Déverrouillez cet élément pour modifier ses dimensions.','Dimensions et position de la cloison',
 'Modifier le tapis de carrelage','Receveur à carreler','Ouvrir l’abattant','Finition des poignées',
 'Enregistrer le projet','Imprimer / PDF','Votre projet en photoréalisme','Fermer le calepinage',
 'Revêtement du bâti-support','Carrelage du receveur','Couleur du joint','Mon compte client LRF',
 'Fermer les options du tapis','Ajouter une niche','Exporter le relevé CSV',
 'Déplacement annulé.','Position appliquée.','Image HD prête.',
 'La référence ABC-123 n’existe pas dans le catalogue partagé.',
 'Le visuel 3D de Stone Icon Francese n’est pas validé. Le plan et sa référence sont conservés.',
 'Mur 1 : référence et finition conservées, aperçu de la couleur fabricant ivory.',
 'Zone 2 : échantillon fabricant de définition limitée ; référence et finition conservées.',
 'Choisissez des dimensions entre 20 et 1 000 cm.','La 3D n’a pas pu démarrer.',
];
for(const fr of representativeUI)assert.notEqual(translateText(fr,'es'),fr,`Missing representative UI translation: ${fr}`);
for(const value of ['LRF-00317-668.88.00','TR2217R','13692','9567','Stone Icon Francese','Yosemite','Allure','Slate','Nogal Lincoln','668.88','765 €','120 × 60 cm'])assert.equal(translateText(value,'es'),value,`Identifier/amount must stay unchanged: ${value}`);
assert.equal(translateText('  Nouveau projet  ','es'),'  Nuevo proyecto  ');
assert.equal(translateText('Clé absente de la traduction 987654','es'),'Clé absente de la traduction 987654','Explicit French fallback');

// Parse JavaScript and inert HTML, including templates and sentences with ';'.
const sourceAudit=await auditSourceUI({root,translateText,preserved,isFrench,numericOrSymbol});
const report={dictionaryEntries:Object.keys(ES_UI).length,patterns:ES_PATTERNS.length,htmlFiles:htmlFiles.length,htmlNodes,translatedNodes,htmlOmissions:omissions,...sourceAudit,dynamicCases:exactCases.length+representativeUI.length,identifierCases:12};
console.log(JSON.stringify(report,null,2));
assert.equal(omissions.length,0,'Untranslated HTML UI strings (see report)');

assert.equal(sourceAudit.parseErrors.length,0,'JavaScript inventory parse errors');
assert.equal(sourceAudit.sourceFragmentsToReview.length,0,'Untranslated source UI fragments (see report; composed templates also need interactive QA)');
