'use strict';

const {PDFDocument, StandardFonts, rgb} = require('pdf-lib');
const {failure, text} = require('./configurator-projects-core');

const MAX_SNAPSHOT_LENGTH = 400000;
const MAX_ROWS = 128;
const heading = rgb(.14, .24, .20);
const muted = rgb(.30, .36, .32);
const line = rgb(.85, .86, .82);
const oneLine = (value, max) => text(value, max).replace(/\s+/g, ' ');

function checkedSummary(summary) {
  if (!summary || !Array.isArray(summary.rows) || !summary.rows.length || summary.rows.length > MAX_ROWS) {
    throw failure('Le descriptif des meubles de la composition est incomplet.', 422);
  }
  const rows = summary.rows.map(raw => {
    const name = typeof raw?.name === 'string' ? oneLine(raw.name, 160) : '';
    const reference = typeof raw?.reference === 'string' ? oneLine(raw.reference, 80) : '';
    const details = typeof raw?.details === 'string' ? oneLine(raw.details, 500) : '';
    if (!name || !reference || !Number.isSafeInteger(raw.quantity) || raw.quantity < 1 || raw.quantity > 128) {
      throw failure('Une ligne du descriptif des meubles est invalide.', 422);
    }
    return {quantity: raw.quantity, name, reference, details};
  });
  const {snapshot} = summary;
  if (typeof snapshot !== 'string' || snapshot.length > MAX_SNAPSHOT_LENGTH || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(snapshot)) {
    throw failure('L’aperçu 3D de la composition est manquant ou invalide.', 422);
  }
  const base64 = snapshot.slice('data:image/jpeg;base64,'.length);
  const image = Buffer.from(base64, 'base64');
  if (image.toString('base64') !== base64 || image.length < 4 || image.at(-2) !== 0xff || image.at(-1) !== 0xd9) {
    throw failure('L’aperçu 3D de la composition est invalide.', 422);
  }
  return {rows, image: Uint8Array.from(image)};
}

function fitText(value, font, size, maxWidth) {
  const words = oneLine(value, 500).split(' ');
  const lines = [];
  let current = '';
  function push() { if (current) lines.push(current); current = ''; }
  const fits = candidate => font.widthOfTextAtSize(candidate, size) <= maxWidth;
  for (const word of words) {
    const safe = [...word].map(character => {
      try { font.encodeText(character); return character; } catch { return '?'; }
    }).join('');
    if (fits(current ? `${current} ${safe}` : safe)) {
      current = current ? `${current} ${safe}` : safe;
      continue;
    }
    push();
    for (const character of safe) {
      if (!fits(current + character)) push();
      current += character;
    }
  }
  push();
  return lines;
}

async function orderDocument(record, account, input, order) {
  const {rows, image} = checkedSummary(input);
  const pdf = await PDFDocument.create();
  let snapshot;
  try { snapshot = await pdf.embedJpg(image); } catch {
    throw failure('L’aperçu 3D de la composition est illisible.', 422);
  }
  if (snapshot.width < 200 || snapshot.height < 120 || snapshot.width * snapshot.height > 12000000) {
    throw failure('Les dimensions de l’aperçu 3D sont invalides.', 422);
  }

  pdf.setTitle('Randal — ' + record.number);
  pdf.setAuthor('LE ROY FACTORY');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 40, right = 555, width = right - margin;
  let page, y;
  function newPage() {
    page = pdf.addPage([595.28, 841.89]);
    y = 800;
  }
  function write(value, size, {font = regular, color = heading, x = margin, maxWidth = width, leading = size + 4} = {}) {
    for (const row of fitText(value, font, size, maxWidth)) {
      page.drawText(row, {x, y, size, font, color});
      y -= leading;
    }
  }
  function tableHeading() {
    write('Désignation et référence fabricant', 13, {font: bold});
    y -= 8;
  }

  newPage();
  write('LE ROY FACTORY  /  RANDAL  /  CATALOGUE GÉNÉRAL', 10, {font: bold, color: muted});
  y -= 12;
  write(`${order ? 'Commande' : 'Projet'} ${record.number}`, 24, {font: bold});
  write(record.title, 15);
  y -= 10;
  write(`${account.store} · ${account.code || 'ADMIN'}`, 11, {font: bold});
  if (record.customer.name) write(`Client / chantier  ${record.customer.name}`, 10, {color: muted});
  if (record.customer.site) write(`Référence chantier  ${record.customer.site}`, 10, {color: muted});
  if (record.customer.email) write(`E-mail  ${record.customer.email}`, 10, {color: muted});
  if (record.customer.telephone) write(`Téléphone  ${record.customer.telephone}`, 10, {color: muted});
  y -= 12;
  const size = snapshot.scaleToFit(width, 285);
  page.drawImage(snapshot, {x: margin + (width - size.width) / 2, y: y - size.height, ...size});
  y -= size.height + 24;
  tableHeading();

  for (const row of rows) {
    const ref = `Réf. ${row.reference}`;
    const name = `${row.quantity} × ${row.name}`;
    const descriptionWidth = width - 16;
    const rowHeight = 16 * fitText(name, bold, 11, descriptionWidth).length
      + 13 * (fitText(ref, bold, 9, descriptionWidth).length + fitText(row.details, regular, 9, descriptionWidth).length) + 13;
    if (y - rowHeight < 56) {
      newPage();
      tableHeading();
    }
    page.drawLine({start: {x: margin, y: y + 9}, end: {x: right, y: y + 9}, thickness: .55, color: line});
    write(name, 11, {font: bold, maxWidth: descriptionWidth, leading: 16});
    write(ref, 9, {font: bold, maxWidth: descriptionWidth, leading: 13});
    write(row.details, 9, {color: muted, maxWidth: descriptionWidth, leading: 13});
    y -= 13;
  }

  const pages = pdf.getPages();
  pages.forEach((p, index) => {
    p.drawLine({start: {x: margin, y: 40}, end: {x: right, y: 40}, thickness: .55, color: line});
    p.drawText('Rendu 3D de la composition · Coloris indicatifs', {x: margin, y: 25, size: 8, font: regular, color: muted});
    p.drawText(`${index + 1} / ${pages.length}`, {x: right - 32, y: 25, size: 8, font: regular, color: muted});
  });
  return {rows, attachment: {filename: `${record.number}-Randal-Catalogue-General.pdf`, content: Buffer.from(await pdf.save()), contentType: 'application/pdf'}};
}

module.exports = {orderDocument};
