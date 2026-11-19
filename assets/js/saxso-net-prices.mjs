export function extractPriceColumns(pages){
  const counts=[18,15,20];
  if(pages.length!==counts.length)throw Error('La grille nette SAXSO ne correspond pas à la version vérifiée.');
  return pages.map((items,page)=>{
    const prices=items.filter(item=>item.transform?.[4]>480&&/^\d+,\d{2}$/.test(item.str.trim()))
      .sort((a,b)=>b.transform[5]-a.transform[5]).map(item=>Number(item.str.replace(',','.')));
    if(prices.length!==counts[page]||prices.some(value=>!Number.isFinite(value)||value<=0))throw Error('La grille nette SAXSO n’a pas pu être lue. Consultez le PDF dans l’Accès PRO.');
    return prices;
  });
}

export async function readSaxsoNetPrices(index,{requestBlob=globalThis.window?.LRF_SECURE_TARIFFS?.requestBlob,extractText}={}){
  if(!requestBlob&&typeof window!=='undefined'){
    await import('./pro-session-bridge.js?v=20261119-saxso-net1');
    await import('./secure-tariff-links.js?v=20261119-saxso-net1');
    requestBlob=window.LRF_SECURE_TARIFFS?.requestBlob;
  }
  if(!requestBlob)throw Error('L’accès aux tarifs est momentanément indisponible. Réessayez.');
  const blob=await requestBlob(index.tariffId);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==index.documentSha256)throw Error('La grille SAXSO a changé. Consultez le tarif PDF actualisé dans l’Accès PRO.');
  const extract=extractText||(await import('./secure-pdf-viewer.mjs?v=20261119-saxso-net1')).extractSecurePdfText;
  const columns=extractPriceColumns(await extract(blob));
  const rows=index.rows.map(row=>({...row,amount:columns[row.page-1][row.index]}));
  return {rows,byVariant:new Map(rows.flatMap(row=>row.variantIds.map(id=>[id,row])))};
}

export const netPriceLabel=row=>row?`${row.amount.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} € HT / ${row.unit}`:'Tarif net sur demande';
