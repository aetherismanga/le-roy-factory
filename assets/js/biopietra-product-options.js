(() => {
  'use strict';
  if (window.BIOPIETRA_PRODUCT_OPTIONS) return;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const DATA={
    'acropoli':{q:'Acropoli',colors:['B81','B82','Beige Credaro','D0','G85','G87','M92','M94','M95','M96','Mix ACR 01','Terra','Zolfo']},
    'bergamo mix ber':{q:'Bergamo',colors:['650 Bianco','B80','Beige Credaro','C58','G85','G86','M95','M96','Mix BER 01','O91']},
    'brick design':{q:'Brick Design',colors:['Agata','Bianco','Bianco pose verticale','G86','G88','Mattone','Rosso Vintage']},
    'ciottolo river mix cio':{q:'Ciottolo River',colors:['B82','Granito','Grigio','Mix CIO 01','Quarzo','Terra']},
    'credaro mix cre':{q:'Credaro',colors:['B80','B81','B82','C54 Beige','G85','G86','M92','M95','M96','Mix CRE 01','Mix CRE 02','Mix CRE 03','Mix CRE 04','O91','Zolfo']},
    'listello mattone antico':{q:'Mattone Antico',colors:['Agata','Beige','Bianco','C58 Cromite','Mattone Antico Mokka 50% / C58 Cromite 50%','Mattone Antico Rosso 50% / Beige 50%','Mix C58 Cromite 50% / Beige 50%','Mokka','Rosso','Rosso Vintage']},
    'listello toscana 1 5 cm':{q:'Listello Toscana',colors:['Beige','Beige Vintage','Bianco','B0','C58','Cenere','G88','P2','R0','Rosso','Rosso Vintage','Terracotta']},
    'listello toscana 3 cm':{q:'Listello Toscana',colors:['Beige','Beige Vintage','Bianco','B0','C58','Cenere','G88','P2','R0','Rosso','Rosso Vintage','Terracotta']},
    'ortisei mix ort':{q:'Ortisei',colors:['Beige Credaro','B80','B82','B82 pose à sec','G85','G86','G87','M92','M94','M95','M96','O91','Mix ORT 17','Mix ORT 18','Mix ORT 19','Mix ORT 20','Mix ORT 21','Mix ORT 22','Mix ORT 23','Mix ORT 24','Mix ORT 25','Mix ORT 26','Mix ORT 27','Mix ORT 28','Mix ORT 29','Mix ORT 30','Mix ORT 31','Mix ORT 32','Mix ORT 33','Zolfo']},
    'roccia mix roc':{q:'Roccia',colors:['B80','C54 Beige','Granito','M92','M95','Mix ROC 01','Mix ROC 02','Mix ROC 03','Mix ROC 04','Mix ROC 05','Mix ROC 06','Quarzo','S44 Castagno','Terra','S43 Ruggine','V1','V8','Zolfo']},
    'roma':{q:'Roma Biopietra',colors:['Ardesia','Naturale','Quarzo']},
    'scaglia carsica':{q:'Scaglia Carsica',colors:['Antracite','Arena','Cromo','Bianco','Granito','Grigio','Malva','Melange','Sabbia']},
    'scaglia marmolada':{q:'Scaglia Marmolada',colors:['Ardesia','C58','Beige Credaro','G85','G86','G87','Ghiaccio','M34','O91','Quarzo','Zolfo']},
    'scaglia montebello':{q:'Scaglia Montebello',colors:['C58','G85','G86','Quarzo']},
    'sierra nevada mix sie':{q:'Sierra Nevada',colors:['B80','B81','B82','G85','Beige Credaro','G86','M92','M95','M96','Mix SIE 00','Mix SIE 19','Mix SIE 20','Mix SIE 21','Mix SIE 22','Mix SIE 23','Mix SIE 30','Mix SIE 40','O91','S40 Bianco','Quarzo','S43','Terra','V913','Zolfo']},
    'spaccatello mix spc':{q:'Spaccatello',colors:['B80','B82','C58','Carrara','Carrara pose irrégulière','G85','G86 à sec','G86 avec joint','Granito','M95','M96','Mix SPA 01','Mix SPA 02','Mix SPA 03','Naturale','Naturale pose irrégulière','O91','Zolfo']},
    'stelvio mix ste':{q:'Stelvio',colors:['C55','B5','Mix STE 00','Mix STE 10','602','B80','Beige Credaro','B81','B82','C54','C58','G85','G86','G87','Granito','M92','M95','M96','O91','Mix STE 11','Mix STE 23','Mix STE 24','Mix STE 25','Mix STE 26','Mix STE 27','Mix STE 28','Mix STE 29','Mix STE 30','Mix STE 31','Mix STE 32','Mix STE 33','Mix STE 34 Biostucco Terra','Mix STE 34 Biostucco Fango','Mix STE 35','Mix STE 37','Mix STE 38','Mix STE 39','Mix STE 40','Mix STE 41','Mix STE 42','Mix STE 43','Mix STE 44','Mix STE 45','Mix STE 46','Mix STE 47','Mix STE 48','Terra','V913','Zolfo']},
    'travertino':{q:'Travertino',colors:['C58 Cromite','Grigio Vintage','Naturale','Quarzo']}
  };
  const cache=new Map();
  function entry(product){return DATA[norm(product)]||null}
  async function mediaSearch(q){
    const key='m:'+norm(q); if(cache.has(key)) return cache.get(key);
    const p=fetch('https://biopietra.com/wp-json/wp/v2/media?media_type=image&per_page=20&search='+encodeURIComponent(q),{mode:'cors',credentials:'omit'})
      .then(r=>r.ok?r.json():[]).catch(()=>[]).then(items=>items.map(m=>({
        url:m?.media_details?.sizes?.full?.source_url||m?.media_details?.sizes?.large?.source_url||m?.source_url||'',
        title:String(m?.title?.rendered||m?.caption?.rendered||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
      })).filter(x=>x.url));
    cache.set(key,p); return p;
  }
  async function imageFor(product,color){
    const e=entry(product); const q=(e?.q||product)+' '+color;
    const exact=await mediaSearch(q); if(exact[0]) return exact[0];
    const all=await mediaSearch(e?.q||product); const nc=norm(color);
    return all.find(x=>norm(x.title+' '+x.url).includes(nc))||null;
  }
  window.BIOPIETRA_PRODUCT_OPTIONS={DATA,entry,norm,mediaSearch,imageFor};
})();