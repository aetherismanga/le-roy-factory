import { readSaxsoNetPrices } from './saxso-net-prices.mjs';

const assetRoot = 'assets/img/saxso-tarif/';
const ink = '#242C2A', muted = '#50625B', forest = '#295545', pale = '#F0F3EF';
const key = (row) => `${row.page}-${row.index}`;
const number = (n, digits = 0) => n.toLocaleString('fr-FR', {
  minimumFractionDigits: digits, maximumFractionDigits: 2,
}).replace(/[\u00a0\u202f]/g, ' ');

const groups = [
  { name: 'Quartzite du Brésil et Luserna', use: 'Opus incertum', from: 0, to: 4 },
  { name: 'Plaquettes de parement', use: 'Revêtement mural', from: 4, to: 8 },
  { name: 'Parements sur ciment', use: 'Revêtement mural avec crochet', from: 8, to: 12 },
  { name: 'Pierre d’Orient', use: 'Pavés bruts de clivage', from: 12, to: 14 },
  { name: 'Himalaya Grey et Yellow Brown', use: 'Dalles et modules', from: 14, to: 18 },
  { name: 'Travertin Classic 1er choix', use: 'Finition vieillie', from: 18, to: 23 },
  { name: 'Travertin C. Beige', use: 'Finition vieillie', from: 23, to: 28 },
  { name: 'Travertin Light', use: 'Finition vieillie', from: 28, to: 33 },
  { name: 'Sakkara Grey', use: 'Surface adoucie et vieillie', from: 33, to: 39 },
  { name: 'Desert Light', use: 'Surface adoucie et vieillie', from: 39, to: 46 },
  { name: 'Desert Light', use: 'Surface sablée et brossée', from: 46, to: 53 },
];

function paginate(rows) {
  return groups.flatMap(group => {
    const items = rows.slice(group.from, group.to);
    if (items.length <= 4) return [{ ...group, items }];
    const split = items.length === 5 ? 2 : Math.ceil(items.length / 2);
    return [items.slice(0, split), items.slice(split)].map(items => ({ ...group, items }));
  });
}

function text(doc, value, x, y, size, colour = ink, font = 'normal', options) {
  doc.setTextColor(colour);
  doc.setFont('helvetica', font);
  doc.setFontSize(size);
  doc.text(value, x, y, options);
}
function line(doc, x, y, width) {
  doc.setDrawColor('#CDD5CE');
  doc.setLineWidth(0.28);
  doc.line(x, y, x + width, y);
}
function block(doc, value, x, y, width, size = 11, colour = ink) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(value, width);
  text(doc, lines, x, y, size, colour, 'normal', { lineHeightFactor: 1.25 });
  return lines.length * size * 0.441;
}
function naturalImage(doc, img, x, y, width, height) {
  const scale = Math.min(width / img.w, height / img.h);
  const w = scale * img.w, h = scale * img.h;
  doc.addImage(img.bytes, 'JPEG', x + (width - w) / 2, y + (height - h) / 2, w, h, img.file);
}
function pageHeader(doc, assets) {
  naturalImage(doc, assets.get('lrf.jpg'), 13, 8, 13, 13);
  text(doc, 'SAXSO   /   PIERRES NATURELLES', 30, 16.5, 9, muted, 'bold');
  text(doc, 'TARIF DISTRIBUTEURS  2026', 196, 16.5, 9, muted, 'normal', { align: 'right' });
  line(doc, 14, 25, 182);
}
function footer(doc, n, total) {
  line(doc, 14, 279, 182);
  text(doc, 'LE ROY FACTORY  ·  Prix nets HT  ·  Rendu dès 4 palettes mixées', 14, 286, 8, muted);
  text(doc, `${n} / ${total}`, 196, 286, 8, muted, 'bold', { align: 'right' });
  if (n > 1) doc.link(13, 281, 125, 8, { pageNumber: 1 });
}
function cover(doc, pages, assets) {
  pageHeader(doc, assets);
  text(doc, 'Tarif illustré', 14, 47, 37, ink, 'bold');
  text(doc, 'Prix nets distributeurs • 2026', 15, 57, 15, muted);
  const hero = assets.get('terrasse.jpg');
  doc.addImage(hero.bytes, 'JPEG', 14, 65, 182, 83, hero.file);
  text(doc, 'Desert Light  ·  Mise en scène de terrasse', 14, 154, 8, muted);
  text(doc, 'Trouver une pierre', 14, 170, 19, ink, 'bold');
  const entries = [['Lexique et conditions de livraison', 2]];
  for (const group of groups) {
    const firstPage = 3 + pages.findIndex(page => page.from === group.from);
    const title = group.name === 'Desert Light' ? `Desert Light · ${group.from === 39 ? 'adouci vieilli' : 'sablé brossé'}` : group.name;
    entries.push([title, firstPage]);
  }
  for (const [i, [title, dest]] of entries.entries()) {
    const x = i < 6 ? 14 : 109, y = 182 + (i % 6) * 13.2;
    text(doc, title, x, y, 10);
    text(doc, String(dest).padStart(2, '0'), x + 84, y, 10, forest, 'bold', { align: 'right' });
    line(doc, x, y + 3.4, 84);
    doc.link(x, y - 5, 84, 10, { pageNumber: dest });
  }
  text(doc, 'Accéder au catalogue interactif SAXSO', 14, 268, 11, forest, 'bold');
  doc.link(14, 261, 107, 10, { url: 'https://leroyfactory.fr/saxso-catalogue-interactif.html' });
}
function glossary(doc, assets) {
  pageHeader(doc, assets);
  text(doc, 'Lexique et livraison', 14, 44, 29, ink, 'bold');
  const terms = [
    ['Dalle', 'Pièce de sol vendue au mètre carré (m²).'],
    ['Module', 'Ensemble de plusieurs formats de dalles, vendu au m².'],
    ['Opus incertum', 'Pierres de contours irréguliers assemblées pour former un dallage.'],
    ['Parement', 'Revêtement mural en pierre. Les plaquettes sur ciment de ce tarif sont équipées d’un crochet.'],
    ['Pavé', 'Petite pièce de sol. Les pavés Pierre d’Orient de ce tarif font 14 × 14 cm.'],
    ['Margelle', 'Pièce de bord de bassin, vendue au mètre linéaire (ml).'],
    ['Marche', 'Pièce horizontale d’escalier, vendue au mètre linéaire (ml).'],
    ['1/2 rond', 'Bord long arrondi en demi-cercle.'],
    ['Adouci / vieilli', 'L’adoucissage lisse la surface. Le vieillissement atténue les arêtes ou donne un aspect patiné.'],
    ['Sablé / brossé', 'La surface est sablée puis brossée pour obtenir une texture régulière.'],
  ];
  let y = 57;
  for (const [term, definition] of terms) {
    text(doc, term, 14, y, 10.5, forest, 'bold');
    const height = block(doc, definition, 62, y, 134, 10.5);
    y += Math.max(11, height + 5);
  }
  doc.setFillColor(pale); doc.roundedRect(14, 188, 182, 82, 3, 3, 'F');
  text(doc, 'Tarif rendu dès 4 palettes mixées', 20, 200, 16, forest, 'bold');
  let cy = 210;
  for (const paragraph of [
    'Commande minimum de quatre palettes complètes. Plusieurs références peuvent être réunies dans la même commande. Livraison non déchargée, deux points de livraison maximum.',
    'Quartzites du Brésil, Luserna, parements, Pierre d’Orient, Himalaya Grey et Yellow Brown : 04, 05, 06, 13, 30, 83, 84 et Monaco.',
    'Travertins, Sakkara Grey et Desert Light : 04, 06, 13, 30, 34, 83, 84 et Monaco.',
    'Prix nets hors taxes selon la grille SAXSO 2026. Poids moyens de pierre hors emballage. Les masses par palette sont calculées à partir du conditionnement annoncé.',
  ]) cy += block(doc, paragraph, 20, cy, 170, 10.2) + 3;
}

function rowCard(doc, row, asset, y, height) {
  const unit = row.unit;
  const parts = row.label.split(/\s+·\s+/);
  const name = parts.shift();
  const details = parts.join(' · ');
  const left = 14, info = 84;
  const imgHeight = Math.min(44, height - 12);
  naturalImage(doc, asset, left, y, 64, imgHeight);
  block(doc, asset.caption, left, y + imgHeight + 3, 65, 7.5, muted);
  text(doc, name, info, y + 5, 15, ink, 'bold');
  const descriptionHeight = block(doc, details, info, y + 12, 109, 10.3);
  const priceY = y + 18 + descriptionHeight;
  text(doc, `${number(row.amount, 2)} € HT / ${unit}`, info, priceY, 16, forest, 'bold');
  text(doc, `${number(row.perPallet)} ${unit} / ${row.packType}`, info, priceY + 8, 10.8, ink, 'bold');
  text(doc, `${number(row.weightPerUnit)} kg/${unit}  ·  env. ${number(Math.round(row.weightPerUnit * row.perPallet))} kg/${row.packType}`, info, priceY + 14, 9.5, muted);
  line(doc, left, y + height - 1, 182);
}

export function composeSaxsoTariff(jsPDF, rows, manifest, assets) {
  const complete = row => [row.amount, row.perPallet, row.weightPerUnit].every(value => Number.isFinite(value) && value > 0);
  if (rows.length !== 53 || rows.some(row => !complete(row) || manifest.rows[key(row)]?.label !== row.label)) {
    throw Error('Les données du tarif illustré sont incomplètes.');
  }
  const pages = paginate(rows), total = pages.length + 2;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  doc.setProperties({ title: 'SAXSO · Tarif illustré distributeurs 2026', author: 'LE ROY FACTORY', subject: 'Prix nets HT, poids et conditionnements des pierres naturelles' });
  cover(doc, pages, assets); footer(doc, 1, total);
  doc.addPage(); glossary(doc, assets); footer(doc, 2, total);
  pages.forEach((page, i) => {
    doc.addPage(); pageHeader(doc, assets);
    text(doc, page.name, 14, 43, 25, ink, 'bold');
    text(doc, page.use, 14, 52, 12, muted);
    const h = Math.min(69, 209 / page.items.length);
    page.items.forEach((row, j) => {
      const entry = manifest.rows[key(row)], asset = assets.get(entry.file);
      rowCard(doc, row, { ...asset, caption: entry.caption }, 62 + j * h, h);
    });
    footer(doc, i + 3, total);
  });
  return doc;
}

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw Error('Chargement du tarif illustré impossible. Réessayez.');
  return response.json();
}
export async function illustratedSaxsoBlob(original) {
  const [index, manifest] = await Promise.all([
    loadJson('assets/data/saxso-net-index.json'), loadJson(`${assetRoot}photos.json`),
  ]);
  const { rows } = await readSaxsoNetPrices(index, { requestBlob: () => Promise.resolve(original) });
  await import('../vendor/randal-catalogue/jspdf.umd.min.js');
  const assets = new Map();
  await Promise.all(Object.entries(manifest.images).map(async ([file, shape]) => {
    const response = await fetch(assetRoot + file);
    if (!response.ok) throw Error('Une photo du tarif illustré n’a pas pu être chargée.');
    assets.set(file, { file, ...shape, bytes: new Uint8Array(await response.arrayBuffer()) });
  }));
  return composeSaxsoTariff(window.jspdf.jsPDF, rows, manifest, assets).output('blob');
}
