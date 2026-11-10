import { shortReportDate, reportPeriodLabel } from './crm-report-export-core.mjs?v=20261110-client2';

// Local, text-based A4 PDF: searchable text, wrapped paragraphs and page numbers.
export function createReportPDF(model, JsPDF = globalThis.jspdf?.jsPDF) {
  if (!JsPDF) throw new Error('Le module PDF ne s’est pas chargé. Actualisez la page puis réessayez.');
  const pdf = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({ title: `Comptes-rendus - ${model.filters.usine || 'Toutes les usines'}`, author: 'LE ROY FACTORY' });
  const margin = 17, width = 176, bottom = 278;
  let y = 20;
  // Helvetica covers French accents. Remove symbols unsupported by its encoding.
  const plain = value => String(value ?? '').normalize('NFC').replace(/\u00a0/g, ' ').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/[^\x09\x0a\x0d\x20-\xff€]/g, '');
  function page() { pdf.addPage(); y = 20; }
  function room(mm) { if (y + mm > bottom) page(); }
  function text(value, size = 10, bold = false, color = '#26313b') {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); pdf.setTextColor(color);
    const lines = pdf.splitTextToSize(plain(value), width);
    const height = size * 0.3528 * 1.45;
    for (const line of lines) { room(height); pdf.text(line, margin, y); y += height; }
  }
  function heading(value) { room(23); y += 5; text(value, 13, true); y += 2; }
  function visit(report) {
    room(23);
    text(`${shortReportDate(report.date)} | ${report.author || 'Agent'}${report.usine ? ` | ${report.usine}` : ''}`, 9, true, '#776127');
    text(report.text || 'Sans texte', 10); y += 5;
  }
  text('LE ROY FACTORY', 17, true);
  text('Comptes-rendus commerciaux', 14, true); y += 3;
  text(`Usine : ${model.filters.usine || 'Toutes les usines'}`, 11, true);
  text(reportPeriodLabel(model.filters));
  if (model.filters.clientLabel) text(`Client : ${model.filters.clientLabel}`);
  if (model.filters.agent) text(`Agent : ${model.filters.agent}`);
  if (model.filters.search) text(`Recherche : ${model.filters.search}`);
  text(`${model.count} compte(s)-rendu(s) | ${model.clients.length} client(s) | ${model.campaigns.length} action(s) générale(s)`);
  heading('Récapitulatif des clients');
  if (!model.clients.length) text('Aucun compte-rendu rattaché à un client dans cette sélection.');
  model.clients.forEach(client => {
    room(19);
    text(`${client.societe} - ${[client.codePostal, client.ville].filter(Boolean).join(' ')}`, 10, true);
    text(`${client.reports.length} compte(s)-rendu(s) | ${[...new Set(client.reports.map(report => shortReportDate(report.date)))].join(', ')}`, 9);
    y += 2;
  });
  if (model.clients.length) { page(); text('Détail par client', 16, true); }
  model.clients.forEach(client => {
    heading(client.societe);
    const address = [client.codePostal, client.ville].filter(Boolean).join(' ');
    if (address) { text(address, 9); y += 2; }
    client.reports.forEach(visit);
  });
  if (model.campaigns.length) {
    heading('Actions générales / campagnes');
    model.campaigns.forEach(report => { text(report.societe || 'Action générale', 11, true); visit(report); });
  }
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor('#666666');
    pdf.text('LE ROY FACTORY - Comptes-rendus', margin, 288);
    pdf.text(`${i} / ${total}`, 193, 288, { align: 'right' });
  }
  return pdf;
}
