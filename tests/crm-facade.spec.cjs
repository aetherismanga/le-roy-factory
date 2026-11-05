const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// Exercise the production photo editor in real browser engines, with all network
// traffic intercepted. No Firebase session, client record or real upload is used.
const origin = 'https://crm-audit.invalid';
const root = path.resolve(__dirname, '..');
const crc32 = bytes => {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
};
function photoPng() {
  const width = 2400, height = 1600;
  const chunk = (name, bytes) => {
    const type = Buffer.from(name), size = Buffer.alloc(4), crc = Buffer.alloc(4);
    size.writeUInt32BE(bytes.length); crc.writeUInt32BE(crc32(Buffer.concat([type, bytes])));
    return Buffer.concat([size, type, bytes, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const pixels = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * (width * 3 + 1) + 1 + x * 3;
    pixels[i] = x % 256; pixels[i + 1] = y % 256; pixels[i + 2] = 140;
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}
const inputPhoto = { name: 'facade-test.png', mimeType: 'image/png', buffer: photoPng() };
const html = `<!doctype html><html lang="fr"><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="/assets/css/client-facade.css">
  <style>body{font:16px sans-serif;margin:16px}button{min-height:44px}form{max-width:720px}.modal-grid-edit{display:grid;grid-template-columns:1fr 1fr;gap:16px}</style>
  <button id="open-a">Ouvrir magasin A</button><button id="open-b">Ouvrir magasin B</button>
  <form id="client-form"><div class="modal-grid-edit"></div><input id="edit-societe" aria-label="Société">
  <button type="submit">Enregistrer la fiche</button></form><p id="save-status" role="status"></p>
  <script type="module">
    import '/assets/js/client-facade.js';
    const clients = {a:{societe:'Magasin A'},b:{societe:'Magasin B'}};
    let current;
    function open(id){current=id;document.querySelector('#edit-societe').value=clients[id].societe;
      document.querySelector('#save-status').textContent='';
      window.dispatchEvent(new CustomEvent('lrf-client-opened',{detail:{clientId:id,client:clients[id]}}));}
    document.querySelector('#open-a').onclick=()=>open('a');
    document.querySelector('#open-b').onclick=()=>open('b');
    document.querySelector('#client-form').onsubmit=async event=>{event.preventDefault();const id=current;
      try{const patch=await window.LRFClientFacade.prepareSave({clientId:id});clients[id]={...clients[id],...patch};
        window.dispatchEvent(new CustomEvent('lrf-client-saved',{detail:{clientId:id,patch}}));
        document.querySelector('#save-status').textContent='Fiche '+id+' enregistrée';
      }catch(error){document.querySelector('#save-status').textContent=error.message;}};
    open('a');
  </script></html>`;

async function fixture(page, { failFirstUpload = false, deferUpload = false } = {}) {
  const uploads = [];
  let uploaded, finishUpload;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'us-central1-le-roy-factory.cloudfunctions.net' && url.pathname === '/crmFilesUpload') {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: {'access-control-allow-origin':origin,'access-control-allow-headers':'authorization,content-type'} });
      const payload = route.request().postDataJSON();
      uploads.push(payload);
      if (failFirstUpload && uploads.length === 1) return route.abort('failed');
      if (deferUpload) await new Promise(resolve => { finishUpload = resolve; });
      uploaded = Buffer.from(payload.base64, 'base64');
      return route.fulfill({ json: {success:true,file:{url:'https://crm-photos.invalid/'+payload.parentId+'.jpg',path:'client-documents/'+payload.parentId+'/facade.jpg'}}, headers:{'access-control-allow-origin':origin} });
    }
    if (url.hostname === 'crm-photos.invalid') return route.fulfill({contentType:'image/jpeg',body:uploaded});
    if (url.origin !== origin) return route.abort('blockedbyclient');
    if (url.pathname === '/') return route.fulfill({contentType:'text/html',body:html});
    if (url.pathname === '/assets/js/firebase.js') return route.fulfill({contentType:'text/javascript',body:"export const auth={currentUser:{getIdToken:async()=> 'test-session-only'}};"});
    const allowed = ['/assets/js/client-facade.js','/assets/js/client-facade-core.mjs','/assets/js/client-facade-sources.mjs','/assets/css/client-facade.css'];
    if (!allowed.includes(url.pathname)) return route.abort('blockedbyclient');
    return route.fulfill({contentType:url.pathname.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(path.join(root,url.pathname))});
  });
  await page.goto(origin);
  await expect(page.locator('[data-facade-status]')).toContainText('Touchez');
  return {uploads, finish:()=>finishUpload()};
}

async function choosePhoto(page, button = 'Choisir une photo') {
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button',{name:button,exact:true}).click();
  await (await choosing).setFiles(inputPhoto);
  await expect(page.locator('[data-facade-status]')).toContainText('Photo prête');
}

test('la photo est décodée, allégée et conservée sur la bonne fiche à la réouverture', async ({ page }) => {
  const state = await fixture(page);
  await expect(page.locator('[data-facade-capture]')).toHaveAttribute('capture','environment');
  await choosePhoto(page,'📷 Prendre une photo');
  await page.getByRole('button',{name:'Enregistrer la fiche',exact:true}).click();
  await expect(page.locator('#save-status')).toHaveText('Fiche a enregistrée');
  expect(state.uploads).toHaveLength(1);
  expect(state.uploads[0]).toMatchObject({scope:'client-documents',parentId:'a',contentType:'image/jpeg'});
  expect(Buffer.from(state.uploads[0].base64,'base64').length).toBeLessThanOrEqual(600*1024);
  await page.getByRole('button',{name:'Ouvrir magasin B',exact:true}).click();
  await expect(page.getByRole('button',{name:'Prendre une photo de la façade du magasin',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Ouvrir magasin A',exact:true}).click();
  const image = page.getByRole('img',{name:'Façade du magasin Magasin A',exact:true});
  await expect(image).toHaveAttribute('src','https://crm-photos.invalid/a.jpg');
  await expect.poll(()=>image.evaluate(img=>img.complete && img.naturalWidth)).toBe(1600);
  expect(await image.evaluate(img=>img.naturalHeight)).toBe(1067);
  await expect(page.locator('[data-facade-status]')).toHaveText('Photo de façade enregistrée.');
});

test('un échec réseau conserve la photo prête et permet de réessayer', async ({ page }) => {
  const state = await fixture(page,{failFirstUpload:true});
  await choosePhoto(page);
  await page.getByRole('button',{name:'Enregistrer la fiche',exact:true}).click();
  await expect(page.locator('[data-facade-status]')).toHaveAttribute('data-error','true');
  await expect(page.getByRole('img',{name:'Façade du magasin Magasin A',exact:true})).toHaveAttribute('src',/^blob:/);
  await page.getByRole('button',{name:'Enregistrer la fiche',exact:true}).click();
  await expect(page.locator('#save-status')).toHaveText('Fiche a enregistrée');
  expect(state.uploads.map(upload=>upload.parentId)).toEqual(['a','a']);
});

test('une réponse tardive ne rattache jamais la photo au magasin ouvert ensuite', async ({ page }) => {
  const state = await fixture(page,{deferUpload:true});
  await choosePhoto(page);
  await page.getByRole('button',{name:'Enregistrer la fiche',exact:true}).click();
  await expect.poll(()=>state.uploads.length).toBe(1);
  await page.getByRole('button',{name:'Ouvrir magasin B',exact:true}).click();
  state.finish();
  await expect(page.locator('#save-status')).toContainText('La fiche ou la photo a changé');
  await expect(page.getByRole('button',{name:'Prendre une photo de la façade du magasin',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Enregistrer la fiche',exact:true}).click();
  await expect(page.locator('#save-status')).toHaveText('Fiche b enregistrée');
  expect(state.uploads).toHaveLength(1);
});
