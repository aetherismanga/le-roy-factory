const round = amount => Math.round((amount + Number.EPSILON) * 100) / 100;

export const ELIOS_ENERGY_NOTICE = 'Taxe énergétique en sus des tarifs : actuellement 1,20 €/m² pour les carreaux de 10 mm d’épaisseur.';

export function tileEnergyTax(rows) {
  const areas = new Map();
  for (const {brand, finish, orderArea} of rows) {
    if (!(orderArea > 0)) continue;
    const mm = String(finish || '').match(/(?:^|[^\d,.])(\d+(?:[,.]\d+)?)\s*mm\b/i)?.[1];
    const isElios = String(brand || '').toUpperCase() === 'ELIOS';
    const rateHT = isElios ? (Number(mm?.replace(',', '.')) === 10 ? 1.20 : 0) : 0.70;
    if (rateHT) areas.set(rateHT, (areas.get(rateHT) || 0) + orderArea);
  }
  const lines = [...areas].sort(([a], [b]) => b-a).map(([rateHT, surface]) => {
    const area = Number(surface.toFixed(4)), rateTTC = round(rateHT * 1.2);
    return {area, rateHT, rateTTC, amountHT: round(area * rateHT), amountTTC: round(area * rateTTC)};
  });
  return {
    area: Number(lines.reduce((sum, row) => sum + row.area, 0).toFixed(4)),
    rateHT: lines.length === 1 ? lines[0].rateHT : null,
    rateTTC: lines.length === 1 ? lines[0].rateTTC : null,
    amountHT: round(lines.reduce((sum, row) => sum + row.amountHT, 0)),
    amountTTC: round(lines.reduce((sum, row) => sum + row.amountTTC, 0)),
    lines
  };
}
