import {
  PDFDocument, PDFName, PDFRawStream, decodePDFRawStream
} from '../vendor/pdf-lib/pdf-lib-1.17.1.min.mjs';

// The October sheet is a single ReportLab page. Move complete vector rows so
// each protected price travels with its label, including in downloaded copies.
// A later manufacturer layout, or a sheet already revised, passes through intact.
const rowHeight = 14.2;
const firstRowTop = 648;
const rowBoundary = /(?=^[.\d ]+ rg\n[.\d ]+ RG\n\.45 w\nn 25 [.\d]+ 265 14\.2 re B\*)/m;
const navy = '.082353 .243137 .380392';
const grey = '.92549 .933333 .937255';
const terracotta = '.54 .23 .13';
const peach = '.98 .90 .85';
const sand = '.94 .80 .71';

function place(block, x, y, scaleX = 1) {
  return 'q\n' + [scaleX, 0, 0, 1, x, y].map(n => Number(n.toFixed(6))).join(' ') +
    ' cm\n' + block.trimEnd() + '\nQ\n';
}

function reviseOctoberSheet(ops) {
  const leftHeading = navy + ' rg\n' + navy + ' RG\n.45 w\nn 25 648 265 17 re f*';
  const rightHeading = leftHeading.replace('25 648 265', '301 648 269');
  const start = ops.indexOf(leftHeading);
  const end = ops.indexOf(rightHeading);
  if (start < 0 || end <= start) return null;

  const [heading, ...rows] = ops.slice(start, end).split(rowBoundary);
  const rest = ops.slice(end);
  const smallFormat = String.raw`(10 \001 10 gr\004s c\003rame)`;
  const stone = String.raw`(Stone Icon : Big Opus non pr\003bo\006t\003\007)`;
  const formatNote = rest.match(/\(\\007 Big Opus non [^:()]+ : ([^()]+)\.\)/);
  const sizes = formatNote?.[1].split(' / ') || [];
  if (rows.length !== 29 || rows.filter(row => row.includes('20 mm')).length !== 3 ||
      sizes.length !== 4 || !rows.some(row => row.includes(stone)) || !rest.includes(smallFormat)) return null;

  const standard = [];
  const thick = [];
  const scaleX = 269 / 265;
  const sectionTop = 323;
  const headingHeight = 17;
  for (const [index, row] of rows.entries()) {
    if (row.includes('20 mm')) {
      const bottomOffset = sectionTop - headingHeight - firstRowTop + (index - thick.length) * rowHeight;
      const coloured = row.replace(/^[.\d ]+ rg/, (thick.length % 2 ? '1 .97 .94' : peach) + ' rg')
        .replace('.968627 .894118 .85098 rg', sand + ' rg');
      thick.push(place(coloured, 301 - 25 * scaleX, bottomOffset, scaleX));
    } else {
      const formats = row.includes(stone)
        ? sizes.map(size => row.replace(stone, String.raw`(Stone Icon ${size} \002 \012 l'unit\003)`))
        : [row];
      for (const format of formats) {
        const labelled = format.replace(/^[.\d ]+ rg/, (standard.length % 2 ? '1 1 1' : grey) + ' rg');
        standard.push(place(labelled, 0, (index - standard.length) * rowHeight));
      }
    }
  }

  const thickHeading = heading.replaceAll(navy, terracotta)
    .replace('FORMATS, FINITIONS ET OPUS', 'DALLES DE 20 MM');
  const newSection = place(thickHeading, 301 - 25 * scaleX,
    sectionTop - (firstRowTop + headingHeight), scaleX) + thick.join('');

  const note = 'BT 1 0 0 1 301 318.4 Tm';
  if (!rest.includes(note)) return null;
  return ops.slice(0, start) + heading + standard.join('') +
    rest.replace(smallFormat, smallFormat.slice(0, -1) + String.raw` \002 Azuli Mood)`)
      .replace(note, newSection + 'BT 1 0 0 1 301 246 Tm')
      .replace(formatNote[0], String.raw`(Stone Icon : le tarif non pr\003bo\006t\003 s'applique \012 chaque format vendu s\003par\003ment.)`)
      .replace('24 novembre 2026', '25 novembre 2026');
}

export async function eliosTariffForDisplay(blob) {
  const doc = await PDFDocument.load(await blob.arrayBuffer(), {updateMetadata: false});
  if (doc.getPageCount() !== 1) return blob;
  const page = doc.getPage(0);
  const stream = page.node.Contents();
  if (!(stream instanceof PDFRawStream)) return blob;
  const ops = new TextDecoder('ascii').decode(decodePDFRawStream(stream).decode());
  const layout = reviseOctoberSheet(ops);
  if (!layout) return blob;
  doc.context.assign(page.node.get(PDFName.of('Contents')), doc.context.flateStream(layout));
  // A library copy may have a signed incremental revision. Export the edited
  // page as a new document instead of retaining provenance for the old bytes.
  const result = await PDFDocument.create();
  const [revisedPage] = await result.copyPages(doc, [0]);
  result.addPage(revisedPage);
  result.setTitle(doc.getTitle() || 'ELIOS · Tarifs nets professionnels');
  result.setAuthor(doc.getAuthor() || 'LE ROY FACTORY');
  return new Blob([await result.save({useObjectStreams: false})], {type: 'application/pdf'});
}
