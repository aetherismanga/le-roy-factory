#!/usr/bin/env python3
"""Apply the reviewed sample-only changes; never modify catalogue or CRM data."""
from pathlib import Path
import re

changes = {}
def read(path):
    return Path(path).read_text()
def once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError('Expected one occurrence: ' + old[:110])
    return text.replace(old, new, 1)
def line_function(text, name, replacement):
    pattern = r'^function ' + re.escape(name) + r'\([^\n]*\n'
    result, count = re.subn(pattern, lambda _: replacement + '\n', text, count=1, flags=re.M)
    if count != 1:
        raise RuntimeError('Function not found: ' + name)
    return result

p='functions/elios-samples-core.cjs'
s=read(p)
s=once(s,"const crypto=require('node:crypto');", "const crypto=require('node:crypto');\nconst {withSampleCharges,sampleChargesHTML,sampleChargesText}=require('./elios-samples-options.cjs');")
s=once(s,"const VERSION='20261113-elios-samples-direct-box-v8';", "const VERSION='20261113-elios-samples-options-v9';")
s=once(s,"if(product.vrac!==true||Number(raw.quantity)!==1)throw fail('Le vrac est limité à une pièce par référence de la liste fabricant.');", "if(product.vrac!==true||![1,2].includes(Number(raw.quantity)))throw fail('Le vrac est limité à 1 ou 2 pièces par référence éligible.');")
s=once(s,"sampleReference:product.sampleReference,quantity:1,label:true", "sampleReference:product.sampleReference,quantity:Number(raw.quantity),label:true")
s=once(s,'function buildQuote(input,catalogue,prices,profiles=0){','function buildQuote(input,catalogue,prices,profiles=0,installationRequested=false){')
s=once(s,' return {rows,profiles:metres,discount:50,budgetYear,',' return withSampleCharges({rows,profiles:metres,discount:50,budgetYear,')
s=once(s,"Vrac : une pièce avec étiquette.'};", "Vrac : 1 ou 2 pièces avec étiquette.'},installationRequested);")
s=once(s,'lines:payload.items,project:payload.project||null,','lines:payload.items,installationRequested:payload.installationRequested===true,project:payload.project||null,')
a=s.index('<p><b>${quote.incomplete?')
b=s.index('${box?',a)
s=s[:a]+'${sampleChargesHTML(quote)}'+s[b:]
s=once(s,"quote.rows.some(r=>r.type==='box')?`Box : ${quote.incomplete?'sous-total':'total'} à payer HT ${money(quote.subtotalHT)}`:''",'sampleChargesText(quote)')
changes[p]=s

p='functions/elios-samples.js';s=read(p)
s=once(s,'C.buildQuote(body.items,catalogue,rates,body.profiles)','C.buildQuote(body.items,catalogue,rates,body.profiles,body.installationRequested??false)')
changes[p]=s

p='assets/js/elios-samples.js';s=read(p)
s="import {PRICING_VERSION,sampleTileMatches,sampleFacetValues,sampleChargesSummary,printSampleRecap} from './elios-samples-options.mjs?v=20261113-9';\n"+s
s=once(s,"owner:'guest',quote:null,", "owner:'guest',installationRequested:false,quote:null,")
s=once(s,'function markChanged(){clearPrepared();','function markChanged(){if(!hasBox())state.installationRequested=false;clearPrepared();')
s=once(s,"detailsUpdatedAt:state.detailsUpdatedAt||''}));", "detailsUpdatedAt:state.detailsUpdatedAt||'',installationRequested:state.installationRequested}));")
s=once(s,'state.box=box;const useLocal=', 'state.box=box;state.installationRequested=saved?.installationRequested===true&&hasBox();const useLocal=')
s=once(s,'state.items=[];state.box=null;state.draft=null;', 'state.items=[];state.box=null;state.installationRequested=false;state.draft=null;')
s=once(s,"[p.collection,p.color,p.format,p.reference].filter(Boolean)","[p.collection,p.color,p.format,p.finish,p.reference].filter(Boolean)")
s=line_function(s,'filtered',"""function filterValues(){return {mode:state.mode,query:$('#es-search').value,collection:$('#es-collection').value,format:$('#es-format').value,color:$('#es-color').value,finish:$('#es-finish').value};}
function filtered(){const filters=filterValues();if(state.mode==='merchandising'){const query=norm(filters.query);return state.catalogue.merchandising.filter(p=>(!filters.collection||p.collection===filters.collection)&&(!query||norm([p.reference,p.collection,p.description].join(' ')).includes(query)));}return state.catalogue.products.filter(p=>sampleTileMatches(p,filters));}""")
s=line_function(s,'fillFormats',"""function fillFormats(){if(state.mode==='merchandising')return;for(let pass=0;pass<2;pass++)for(const [key,label] of [['format','Tous les formats'],['color','Toutes les couleurs'],['finish','Toutes les finitions']]){const select=$('#es-'+key),prior=select.value,values=sampleFacetValues(state.catalogue.products,filterValues(),key);select.replaceChildren(new Option(label,''),...values.map(value=>new Option(value,value)));select.value=values.includes(prior)?prior:'';}}""")
s=line_function(s,'fillFilters',"""function fillFilters(){const source=state.mode==='merchandising'?state.catalogue.merchandising:state.catalogue.products.filter(p=>!p.legacy&&(state.mode==='box'||p.vrac));$('#es-collection').replaceChildren(new Option('Toutes les collections',''),...[...new Set(source.map(p=>p.collection))].sort((a,b)=>a.localeCompare(b,'fr')).map(value=>new Option(value,value)));for(const key of ['format','color','finish']){$('#es-'+key).value='';$('#es-'+key+'-label').hidden=state.mode==='merchandising';}fillFormats();}""")
s=once(s,"state.mode==='vrac'?'Offert · 1 pièce'", "state.mode==='vrac'?'Offert · 1 à 2 pièces'")
s=once(s,"if(state.mode==='box'){const compose=", """if(state.mode==='vrac'){const label=document.createElement('label');label.className='es-vrac-choice';label.textContent='Quantité avec étiquette';const select=document.createElement('select');select.setAttribute('aria-label','Quantité '+p.reference);select.append(new Option('1 pièce','1'),new Option('2 pièces','2'));select.value=String(state.items.find(i=>i.type==='vrac'&&i.key===key)?.quantity||1);select.onchange=()=>{const item=state.items.find(i=>i.type==='vrac'&&i.key===key);if(item){item.quantity=Number(select.value);markChanged();}};label.append(select);card.querySelector('.es-card-body').insertBefore(label,card.querySelector('.es-card-bottom'));}
 if(state.mode==='box'){const compose=""")
s=once(s,"else state.items.push({type:state.mode,key,quantity:1});markChanged();renderGrid();", "else{if(allItems().length>=200){status('La sélection contient déjà 200 références.');return;}state.items.push({type:state.mode,key,quantity:Number(card.querySelector('.es-vrac-choice select')?.value||1)});}markChanged();renderGrid();")
s=once(s,"selected?'Ajouté ✓':'Ajouter +'", "selected?'Retirer':'Ajouter +'")
s=once(s,"'<small>1 pièce offerte · étiquette incluse</small>'", "'<small>Étiquette incluse · offert</small><label>Quantité (1 ou 2 pièces)<input type=\"number\" min=\"1\" max=\"2\" step=\"1\" value=\"'+item.quantity+'\" aria-label=\"Quantité '+esc(p.reference)+'\"></label>'")
s=once(s,"v<1||v>50){e.target.value=item.quantity;return;}item.quantity=v;markChanged();", "v<1||v>(item.type==='vrac'?2:50)){e.target.value=item.quantity;return;}item.quantity=v;markChanged();renderGrid();")
s=once(s,"${esc(p.format||p.description)}</small>","${esc(p.format||p.description)}${p.finish?' · '+esc(p.finish):''}</small>")
s=once(s,"Sélectionnez une pièce par référence de la liste fabricant. L’étiquette est incluse.","Sélectionnez 1 ou 2 pièces par référence éligible. L’étiquette est incluse ; demande soumise à validation Elios.")
s=once(s,"payload={items:allItems(),profiles:state.box?.profiles||0}","payload={items:allItems(),profiles:state.box?.profiles||0,installationRequested:state.installationRequested===true}")
s=once(s,"state.quote=result.quote;renderCart();return result.quote;", "if(result.quote?.pricingVersion!==PRICING_VERSION)throw Error('Le service de chiffrage doit être actualisé pour calculer la taxe et la pose. Réessayez avant tout envoi.');state.quote=result.quote;renderCart();return result.quote;")
s=once(s,"item.type==='vrac'?'Vrac · 1 pièce avec étiquette'", "item.type==='vrac'?'Vrac · '+item.quantity+' pièce(s) avec étiquette'")
s=once(s,"${p.format?' · '+esc(p.format):''}</span>", "${p.format?' · '+esc(p.format):''}${p.finish?' · '+esc(p.finish):''}</span>")
s=once(s,"b.disabled=true;state.reviewRevision=null;$('#es-send').disabled=true;", "b.disabled=true;state.reviewRevision=null;$('#es-send').disabled=true;$('#es-print').disabled=true;$('#es-installation-panel').hidden=!hasBox();$('#es-installation-request').checked=state.installationRequested===true;")
s=once(s,"${hasBox()?'<p class=\"es-recap-total\">'+(q.incomplete?'Sous-total HT connu':'Total à payer HT')+' <strong>'+money(q.subtotalHT)+'</strong></p>':''}","${sampleChargesSummary(q)}")
s=once(s,"$('#es-send-status').textContent='';$('#es-send').disabled=false;", "$('#es-send-status').textContent='';$('#es-send').disabled=false;$('#es-print').disabled=false;")
s=once(s,"items:allItems(),profiles:state.box?.profiles||0,project:state.box?.project", "items:allItems(),profiles:state.box?.profiles||0,installationRequested:state.installationRequested===true,project:state.box?.project")
s=once(s,"for(const id of ['es-search','es-collection','es-format'])", "for(const id of ['es-search','es-collection','es-format','es-color','es-finish'])")
s=once(s,"state.limit=30;if(id!=='es-format')fillFormats();renderGrid();", "state.limit=30;if(id==='es-collection')for(const key of ['format','color','finish'])$('#es-'+key).value='';fillFormats();renderGrid();")
s=once(s,'const reviewTable=sampleReviewTable;',"""$('#es-installation-request').onchange=async event=>{state.installationRequested=event.target.checked&&hasBox();markChanged();$('#es-send-form').querySelector('[type=checkbox]').checked=false;await review();};
$('#es-print').onclick=async()=>{if(!state.quote||state.reviewRevision!==state.revision){$('#es-send-status').textContent='Vérifiez à nouveau le chiffrage avant d’imprimer.';return;}const button=$('#es-print');button.disabled=true;try{await printSampleRecap({customer:state.customer,details:formDetails(),quote:state.quote,visual:state.box?.visual||'',title:state.box?.title||'Votre récapitulatif Elios'});}catch(error){$('#es-send-status').textContent=error.message;}finally{button.disabled=false;}};
const reviewTable=sampleReviewTable;""")
s=once(s,"$('#es-total-note').textContent=state.quote?.incomplete?", "$('#es-total-note').textContent=state.quote?.incomplete?")
# Preserve the existing note and add the new charged components without a second total.
marker="'Le merchandising reste hors montant à payer, sous réserve d’attribution par Elios. Les box sont vérifiés avec votre compte LRF et arrondis aux boîtes complètes.';"
s=once(s,marker,marker+"if(state.quote?.energyTax&&hasBox())$('#es-total-note').textContent+=' Taxe énergétique incluse : '+money(state.quote.energyTax.amountHT)+'.'+(state.quote.installation?.requested?' Pose LRF incluse : '+money(state.quote.installation.amountHT)+' HT, règlement séparé.':'');")
changes[p]=s

p='echantillons-elios.html';s=read(p)
s=once(s,'Une pièce offerte, avec étiquette','1 ou 2 pièces offertes, avec étiquette')
s=once(s,'Sélectionnez une pièce par référence de la liste fabricant. L’étiquette est incluse.','Sélectionnez 1 ou 2 pièces par référence éligible. L’étiquette est incluse ; demande soumise à validation Elios.')
s=once(s,'</select></label></div><p class="es-results"','</select></label><label id="es-color-label">Couleur<select id="es-color"><option value="">Toutes les couleurs</option></select></label><label id="es-finish-label">Finition<select id="es-finish"><option value="">Toutes les finitions</option></select></label></div><p class="es-results"')
s=once(s,'<h2>Votre récapitulatif Elios</h2><div id="es-review-summary">','<h2>Votre récapitulatif Elios</h2><div class="es-review-actions"><button class="es-button" type="button" id="es-print" disabled>Imprimer le récapitulatif</button></div><section class="es-installation-panel" id="es-installation-panel" hidden><label class="es-check"><input type="checkbox" id="es-installation-request">Je veux la pose</label><p>Jusqu’à 8 m² inclus : forfait 160 € HT. Au-delà de 8 m² : 16 € HT/m².</p><p>Calcul sur les m² de carrelage des box commandés, boîtes complètes et pertes incluses.</p><p><strong>Règlement de la pose à voir avec LE ROY FACTORY.</strong> Hors fournitures et sur support prêt à carreler.</p></section><div id="es-review-summary">')
s=s.replace('elios-samples.css?v=20261113-8','elios-samples.css?v=20261113-9').replace('elios-samples.js?v=20261113-8','elios-samples.js?v=20261113-9')
changes[p]=s

p='assets/css/elios-samples.css';s=read(p)
s+='''
/* Elios recap options, 2026-11-13: taxes, installation, print and exact facets. */
.es-filters{grid-template-columns:minmax(170px,1.3fr) repeat(4,minmax(110px,1fr))}.es-filters label{min-width:0}.es-filters select{max-width:100%}.es-vrac-choice{margin-top:12px}.es-vrac-choice select{min-height:42px;padding:8px}.es-review-actions{display:flex;justify-content:flex-end;margin:12px 0 20px}.es-installation-panel{padding:17px;background:#edf0e5;border:1px solid var(--line);border-radius:6px;margin-bottom:20px}.es-installation-panel .es-check{font-size:15px;font-weight:700}.es-installation-panel p{margin:8px 0 0;font-size:11px}.es-charge-summary{margin:20px 0;border-top:1px solid var(--line);padding-top:12px}.es-charge-summary dl{margin:0}.es-charge-summary dl>div{display:flex;justify-content:space-between;gap:15px;border-bottom:1px solid var(--line);padding:11px 0;font-size:12px}.es-charge-summary dt{min-width:0}.es-charge-summary dt small{display:block;color:var(--muted);font-size:11px;margin-top:3px}.es-charge-summary dd{margin:0;white-space:nowrap;text-align:right;font-weight:600}.es-charge-summary .es-recap-total{margin:15px 0}.es-installation-terms{padding:12px;background:#edf0e5}.es-charge-basis{font-size:10px!important;line-height:1.5!important}@media(max-width:1150px){.es-filters{grid-template-columns:1fr 1fr}.es-filters label:first-child{grid-column:1/-1}}@media(max-width:480px){.es-review-actions .es-button{width:100%}.es-charge-summary dl>div{gap:8px;font-size:11px}.es-installation-panel{padding:12px}.es-vrac-choice{font-size:10px}}
'''
changes[p]=s

# Update assertions only where the newly requested surcharge changes totals.
p='functions/test/elios-samples.test.cjs';s=read(p)
s=s.replace('q.totalHT,17.28','q.totalHT,19.3').replace('changed.totalHT,15.84','changed.totalHT,16.85').replace('q.totalHT,8.64','q.totalHT,9.65')
s=once(s,"test('vrac permits exactly one labelled piece on the supplier allowlist'", "test('vrac permits one or two labelled pieces on the supplier allowlist'")
s=once(s,"for(const input of [{type:'vrac',key:'ELIOS|synthetic',quantity:2}", "assert.equal(C.buildQuote([{type:'vrac',key:'ELIOS|synthetic',quantity:2}],catalogue).rows[0].quantity,2);\n for(const input of [{type:'vrac',key:'ELIOS|synthetic',quantity:3}")
changes[p]=s
p='tests/elios-mysterium-dynasty.test.mjs';s=read(p)
s=once(s,'quote.totalHT,43.2','quote.totalHT,45.22')
changes[p]=s
p='.github/workflows/deploy-firebase-functions.yml';s=read(p)
s=once(s,"response.headers.get('x-lrf-elios-samples-version')!=='20261113-elios-samples-direct-box-v8'", "response.headers.get('x-lrf-elios-samples-version')!=='20261113-elios-samples-options-v9'")
# Keep production gates intact; extend existing sample checks with the new rules.
s=once(s,'node --test test/elios-samples.test.cjs test/elios-expo-budget.test.cjs','node --test test/elios-samples.test.cjs test/elios-expo-budget.test.cjs ../tests/elios-samples-options.test.mjs')
changes[p]=s

for path, value in changes.items():
    if not value or value == read(path):
        raise RuntimeError('Empty or unchanged patch: '+path)
for path, value in changes.items():
    Path(path).write_text(value)
    print(path)
