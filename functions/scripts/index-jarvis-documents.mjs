import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const pdfDir = path.join(repoRoot, 'assets', 'pdf');

const API_KEY = String(process.env.OPENAI_API_KEY || '').trim();
if (!API_KEY) {
  console.error('OPENAI_API_KEY manquant. Charge la clé dans la variable d’environnement avant de lancer ce script.');
  process.exit(1);
}

const OPENAI = 'https://api.openai.com/v1';
const headers = { Authorization: `Bearer ${API_KEY}` };

const externalDocuments = [
  { manufacturer:'Elios Ceramica', type:'catalogue', year:2026, name:'ELIOS Catalogue Général 2026', url:'https://eliosceramica.com/wp-content/uploads/2018/02/ELIOS_CATALOGO-GENERALE-2026-1.pdf' },
  { manufacturer:'Elios Ceramica', type:'catalogue', year:2026, name:'ELIOS Coverings 2026', url:'https://eliosceramica.com/wp-content/uploads/2001/04/ELIOS_CATALOGO-COVERINGS-2026.pdf' },
  { manufacturer:'Elios Ceramica', type:'catalogue', year:2026, name:'ELIOS Outdoor 2026', url:'https://eliosceramica.com/wp-content/uploads/2026/07/ELIOS_CATALOGO_OUTDOOR_2026.pdf' },
  { manufacturer:'View Ceramica', type:'catalogue', year:2026, name:'VIEW Corso', url:'https://viewceramiche.com/wp-content/uploads/2023/12/View_catalogo_serie_Corso_2024_LR.pdf' },
  { manufacturer:'View Ceramica', type:'catalogue', year:2026, name:'VIEW Tibur', url:'https://viewceramiche.com/wp-content/uploads/2023/11/Catalogo-Tibur_01-2025_LR.pdf' },
  { manufacturer:'View Ceramica', type:'catalogue', year:2026, name:'VIEW Golden Stone', url:'https://viewceramiche.com/wp-content/uploads/2025/10/View_catalogo_serie_Golden_Stone_2026_LR.pdf' },
  { manufacturer:"Petracer's", type:'catalogue', year:2026, name:"Petracer's Interno", url:'https://petracer.it/wp-content/uploads/2026/07/Interno_Cat_PET_bassa.pdf' },
  { manufacturer:"Petracer's", type:'catalogue', year:2026, name:"Petracer's Général", url:'https://petracer.it/wp-content/uploads/2026/07/Low-catalogo-OII-mail-.pdf' }
];

function localMeta(file) {
  const n = file.toLowerCase();
  if (n === 'elios2026.pdf') return { manufacturer:'Elios Ceramica', type:'tarif', year:2026 };
  if (n === 'view2026.pdf') return { manufacturer:'View Ceramica', type:'tarif', year:2026 };
  if (n === 'lafenice2026.pdf') return { manufacturer:'La Fenice', type:'tarif', year:2026 };
  if (n === 'reviglass2026.pdf') return { manufacturer:'Reviglass', type:'tarif', year:2026 };
  if (n === 'biopietra2026.pdf') return { manufacturer:'Biopietra', type:'tarif_catalogue', year:2026 };
  if (n === 'biopietracodeprix.pdf') return { manufacturer:'Biopietra', type:'code_prix', year:2026 };
  if (n === 'bulbo2026.pdf') return { manufacturer:'Bulbo', type:'tarif', year:2026 };
  if (n === 'randal03.pdf') return { manufacturer:'Randal Pro', type:'catalogue_tarif', year:null };
  if (n === 'neobathanima.pdf') return { manufacturer:'Neobath', type:'catalogue_tarif', year:null, collection:'ANIMA' };
  if (n === 'neobathdna.pdf') return { manufacturer:'Neobath', type:'catalogue_tarif', year:null, collection:'DNA' };
  if (n === 'aquahome.pdf') return { manufacturer:'Aquahome', type:'catalogue_tarif', year:null };
  if (n === 'bilt.pdf') return { manufacturer:'Bilt', type:'catalogue_tarif', year:null };
  if (n === 'petracer2023.pdf') return { manufacturer:"Petracer's", type:'tarif', year:2023 };
  if (n === 'pecchioli2022.pdf') return { manufacturer:'Pecchioli Firenze', type:'tarif', year:2022 };
  if (n === 'pecchioli.pdf') return { manufacturer:'Pecchioli Firenze', type:'catalogue', year:null };
  return { manufacturer:'LE ROY FACTORY', type:'document', year:null };
}

async function api(pathname, options={}) {
  const r = await fetch(`${OPENAI}${pathname}`, { ...options, headers:{ ...headers, ...(options.headers||{}) } });
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${r.status}`);
  return data;
}

async function createVectorStore() {
  const existing = String(process.env.JARVIS_VECTOR_STORE_ID || '').trim();
  if (existing) return existing;
  const store = await api('/vector_stores', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ name:'LE ROY FACTORY — JARVIS DOCUMENTS' })
  });
  return store.id;
}

async function uploadBytes(bytes, filename) {
  const form = new FormData();
  form.append('purpose','assistants');
  form.append('file', new Blob([bytes], {type:'application/pdf'}), filename);
  const r = await fetch(`${OPENAI}/files`, { method:'POST', headers, body:form });
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data?.error?.message || `Upload ${filename}: HTTP ${r.status}`);
  return data.id;
}

async function attach(vectorStoreId, fileId, meta) {
  const attributes = {};
  for (const [k,v] of Object.entries(meta)) if (v !== null && v !== undefined && v !== '') attributes[k] = v;
  return api(`/vector_stores/${vectorStoreId}/files`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ file_id:fileId, attributes })
  });
}

async function waitForStoreFile(vectorStoreId, vectorStoreFileId, label) {
  for (let i=0;i<120;i++) {
    const data = await api(`/vector_stores/${vectorStoreId}/files/${vectorStoreFileId}`);
    if (data.status === 'completed') return;
    if (data.status === 'failed' || data.status === 'cancelled') throw new Error(`${label}: indexation ${data.status}`);
    await new Promise(r=>setTimeout(r,2500));
  }
  throw new Error(`${label}: délai d’indexation dépassé`);
}

async function indexOne(vectorStoreId, bytes, filename, meta) {
  console.log(`→ ${filename}`);
  const fileId = await uploadBytes(bytes, filename);
  const vsFile = await attach(vectorStoreId, fileId, meta);
  await waitForStoreFile(vectorStoreId, vsFile.id || fileId, filename);
  console.log(`  ✓ indexé (${meta.manufacturer} / ${meta.type})`);
}

async function main() {
  const vectorStoreId = await createVectorStore();
  console.log(`Vector Store: ${vectorStoreId}`);

  const files = (await fs.readdir(pdfDir)).filter(x=>x.toLowerCase().endsWith('.pdf')).sort();
  let ok=0, skipped=0, failed=0;

  for (const file of files) {
    try {
      const full = path.join(pdfDir,file);
      const stat = await fs.stat(full);
      if (stat.size < 1024) { console.log(`– ${file} ignoré (vide/factice)`); skipped++; continue; }
      const bytes = await fs.readFile(full);
      await indexOne(vectorStoreId, bytes, file, { ...localMeta(file), source:'leroyfactory_local', filename:file });
      ok++;
    } catch (e) { failed++; console.error(`  ✗ ${file}: ${e.message}`); }
  }

  for (const doc of externalDocuments) {
    try {
      console.log(`↓ téléchargement ${doc.name}`);
      const r = await fetch(doc.url, { redirect:'follow' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const ct = String(r.headers.get('content-type')||'');
      if (!ct.includes('pdf')) console.warn(`  ! type reçu: ${ct || 'inconnu'}`);
      const bytes = new Uint8Array(await r.arrayBuffer());
      const filename = `${doc.manufacturer}-${doc.name}`.replace(/[^a-z0-9._-]+/gi,'_')+'.pdf';
      await indexOne(vectorStoreId, bytes, filename, { manufacturer:doc.manufacturer, type:doc.type, year:doc.year, source:'site_fabricant', source_url:doc.url, title:doc.name });
      ok++;
    } catch (e) { failed++; console.error(`  ✗ ${doc.name}: ${e.message}`); }
  }

  console.log('\n========================================');
  console.log(`INDEXATION TERMINÉE — OK:${ok} / ignorés:${skipped} / erreurs:${failed}`);
  console.log(`JARVIS_VECTOR_STORE_ID=${vectorStoreId}`);
  console.log('Conserve cet identifiant : Jarvis doit l’utiliser pour File Search.');
  console.log('========================================');
}

main().catch(e=>{ console.error('\nERREUR FATALE:',e.message); process.exit(1); });
