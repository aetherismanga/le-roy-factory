(()=>{
'use strict';
const root=document.getElementById('elios-pose-app');if(!root||!window.ELIOS_POSE_V1)return;
const hero=document.querySelector('.ep-hero p'),intro=document.querySelector('.ep-intro p');
if(hero)hero.textContent='Choisissez d’abord votre collection, la finition R10 ou R11, votre modèle et le conditionnement : le configurateur affiche ensuite uniquement les schémas de pose compatibles.';
if(intro)intro.textContent='Sélectionnez le carreau et sa finition avant le schéma. Les compositions proposées sont filtrées selon les formats réellement disponibles en R10 ou R11 et le conditionnement choisi, puis les quantités sont calculées et arrondies à la boîte complète.';
const st=document.createElement('style');st.textContent='.ep-result-actions #ep-order{background:#161511;color:#f3d16b}.ep-result-actions #ep-print{background:#fff;color:#54420f}';document.head.appendChild(st);
const files=[
'assets/js/inspirations-elios-pricing.js?v=20260911-pose3',
'assets/js/pro-session-bridge.js?v=20260911-pose3',
'assets/js/elios-pose-v2-base.js?v=20260911-pose3',
'assets/js/elios-pose-v2-finishes.js?v=20260911-pose3',
'assets/js/elios-pose-v2-selection.js?v=20260911-pose3',
'assets/js/elios-pose-v2-calc.js?v=20260911-pose3',
'assets/js/elios-pose-v2-order-style.js?v=20260911-pose3',
'assets/js/elios-pose-v2-order-summary.js?v=20260911-pose3',
'assets/js/elios-pose-v2-order-context.js?v=20260911-pose3',
'assets/js/elios-pose-v2-order-send.js?v=20260911-pose3',
'assets/js/elios-pose-v2-init.js?v=20260911-pose3'];
const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error(`Chargement impossible : ${src}`));document.head.appendChild(s)});
files.reduce((p,src)=>p.then(()=>load(src)),Promise.resolve()).then(()=>setTimeout(()=>document.querySelector('#ep-pattern-grid .ep-pattern')?.click(),250)).catch(e=>{console.error(e);root.innerHTML='<div style="padding:18px;background:#fff3cd;border:1px solid #e1c56e;border-radius:12px">Le configurateur n’a pas pu se charger. Actualisez la page.</div>'});
})();
