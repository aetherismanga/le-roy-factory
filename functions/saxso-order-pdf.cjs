'use strict';
const {PDFDocument,StandardFonts,rgb} = require('pdf-lib');

const money = cents => (cents/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const number = value => value.toLocaleString('fr-FR',{maximumFractionDigits:4});
const ink=rgb(.13,.16,.15), accent=rgb(.15,.31,.25), muted=rgb(.32,.36,.34);
const width=595, height=842, left=40,right=555;
async function createOrderPdf(order,{draft=false,date=new Date()}={}) {
  const pdf=await PDFDocument.create();
  const normal=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const supported=new Set(normal.getCharacterSet());
  const clean=value=>Array.from(String(value).normalize('NFC').replace(/[\u2007\u202f]/g,' '),c=>supported.has(c.codePointAt(0))?c:'?').join('');
  let page,y;
  const write=(value,x,top,size=10,font=normal,color=ink)=>{
    page.drawText(clean(value),{x,y:height-top,size,font,color});
  };
  const newPage=()=>{
    page=pdf.addPage([width,height]);
    write('LE ROY FACTORY   /   SAXSO',left,43,12,bold,accent);
    write(draft?'Projet de commande':'Bon de commande',left,76,24,bold);
    write(order.orderId,left,97,9,normal,muted);
    write(date.toLocaleDateString('fr-FR',{timeZone:'Europe/Paris'}),493,43,9,normal,muted);
    page.drawLine({start:{x:left,y:height-108},end:{x:right,y:height-108},thickness:1,color:accent});
    y=134;
  };
  function ensure(space){if(y+space>789) newPage();}
  function wrap(value,maxWidth,size,font) {
    const result=[];
    for (const paragraph of String(value).split(/\n/)) {
      let line='';
      for(const word of clean(paragraph).split(/\s+/)){
        const joined=line?line+' '+word:word;
        if(line && font.widthOfTextAtSize(joined,size)>maxWidth) {result.push(line);line='';}
        if(font.widthOfTextAtSize(word,size)>maxWidth){
          let part='';
          for(const char of word){
            if(part && font.widthOfTextAtSize(part+char,size)>maxWidth) {result.push(part);part='';}
            part+=char;
          }
          line=part;
        } else line=line?line+' '+word:word;
      }
      result.push(line);
    }
    return result;
  }
  function block(value,{size=10.5,font=normal,color=ink,x=left,maxWidth=right-x}={}){
    for(const line of wrap(value,maxWidth,size,font)){ensure(size+4);write(line,x,y,size,font,color);y+=size+4;}
  }
  const title=value=>{ensure(55);y+=8;block(value,{size:13,font:bold,color:accent});};
  newPage();
  title(order.customer.store);
  block('Contact magasin : '+order.customer.contact+'   •   '+order.customer.phone);
  block(order.customer.email);
  title('Adresse de livraison');
  block(order.customer.address);
  title('Produits commandés');
  block('Tarif net HT rendu pour 4 palettes minimum, références panachables.',{size:9,color:muted});y+=7;
  for(const line of order.lines){
    const text=wrap(line.label,370,11,bold);
    ensure(47+text.length*15);
    const top=y;
    block(line.label,{size:11,font:bold,maxWidth:370});
    const amount=clean(money(line.cents));
    write(amount,right-bold.widthOfTextAtSize(amount,12),top,12,bold,accent);
    block(number(line.palettes)+' pal. × '+number(line.perPallet)+' '+line.unit+'/pal.   =   '+number(line.quantity)+' '+line.unit+
      '   •   '+money(line.unitCents)+' HT/'+line.unit,{size:10});
    if(line.weightKg!==null) block('Poids produit : '+number(line.weightKg)+' kg',{size:9,color:muted});
    y+=3;
    page.drawLine({start:{x:left,y:height-y},end:{x:right,y:height-y},color:rgb(.84,.86,.84),thickness:.6});y+=14;
  }
  ensure(48);
  block('Total HT    '+money(order.cents)+'     /     '+number(order.pallets)+' palette'+(order.pallets>1?'s':''),{size:16,font:bold,color:accent});
  if(order.comment){title('Commentaire du magasin');block(order.comment);}
  const pages=pdf.getPages();
  pages.forEach((p,i)=>p.drawText('SAXSO  /  '+order.orderId+'                                         '+(i+1)+' / '+pages.length,{x:left,y:24,size:8,font:normal,color:muted}));
  pdf.setTitle('SAXSO — '+order.orderId);
  return Buffer.from(await pdf.save());
}
module.exports={createOrderPdf};
