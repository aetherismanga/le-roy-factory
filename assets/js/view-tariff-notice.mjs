import {PDFDocument, StandardFonts, degrees, rgb} from '../vendor/pdf-lib/pdf-lib-1.17.1.min.mjs';
import {withSecurePdfDocument} from './secure-pdf-viewer.mjs?v=20261101-compact1';

const title = 'VIEW — Majoration de 5 % sur les prix nets';
const detail = 'Ajoutez 5 % aux prix nets de cette grille. Les lots et les promotions VIEW sont exclus.';

export async function addViewTariffNotice(bytes) {
  const doc = await PDFDocument.load(bytes, {updateMetadata: false});
  const page = doc.getPage(0);
  const {x, y, width, height} = page.getCropBox();
  const angle = ((page.getRotation().angle % 360) + 360) % 360;
  // The notice adds space above the visible first page even if it includes a
  // crop or rotation. The original contents, pages and links stay in place.
  const [left, top, rightX, rightY, upX, upY, lineWidth] = {
    0: [x, y + height, 1, 0, 0, 1, width],
    90: [x, y, 0, 1, -1, 0, height],
    180: [x + width, y, -1, 0, 0, -1, width],
    270: [x + width, y + height, 0, -1, 1, 0, height],
  }[angle];
  const point = (across, above) => ({x: left + across * rightX + above * upX, y: top + across * rightY + above * upY});
  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
  const inset = Math.min(24, lineWidth * 0.06);
  const available = lineWidth - 2 * inset;
  const titleSize = Math.min(15, available / titleFont.widthOfTextAtSize(title, 1));
  const detailSize = Math.min(11, available / bodyFont.widthOfTextAtSize(detail, 1));
  const bannerHeight = 53;
  const ends = [point(0, bannerHeight), point(lineWidth, bannerHeight)];
  const cropLeft = Math.min(x, ...ends.map(p => p.x));
  const cropBottom = Math.min(y, ...ends.map(p => p.y));
  const cropRight = Math.max(x + width, ...ends.map(p => p.x));
  const cropTop = Math.max(y + height, ...ends.map(p => p.y));
  const media = page.getMediaBox();
  const mediaLeft = Math.min(media.x, cropLeft);
  const mediaBottom = Math.min(media.y, cropBottom);
  page.setMediaBox(mediaLeft, mediaBottom, Math.max(media.x + media.width, cropRight) - mediaLeft,
    Math.max(media.y + media.height, cropTop) - mediaBottom);
  page.setCropBox(cropLeft, cropBottom, cropRight - cropLeft, cropTop - cropBottom);

  const rotate = degrees(angle);
  page.drawRectangle({...point(0, 0), width: lineWidth, height: bannerHeight, rotate, color: rgb(.98, .95, .88)});
  page.drawText(title, {...point(inset, 31), rotate, font: titleFont, size: titleSize, color: rgb(.26, .19, .09)});
  page.drawText(detail, {...point(inset, 13), rotate, font: bodyFont, size: detailSize, color: rgb(.26, .19, .09)});
  return doc.save();
}

export async function viewTariffWithNotice(blob) {
  const alreadyHasNotice = await withSecurePdfDocument(blob, async pdf => {
    const page = await pdf.getPage(1);
    const {items} = await page.getTextContent();
    const text = items.map(item => item.str).join(' ').toLowerCase().replace(/\s+/g, ' ');
    return text.includes(title.toLowerCase()) && text.includes(detail.toLowerCase());
  }).catch(() => false);
  if (alreadyHasNotice) return blob;
  return new Blob([await addViewTariffNotice(await blob.arrayBuffer())], {type: 'application/pdf'});
}
