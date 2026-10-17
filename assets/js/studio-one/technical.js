/* Shared STUDIO ONE technical line drawings: vector artwork, no opaque background. */
(function(){
 'use strict';
 const C=window.StudioOneCatalog,M=window.StudioOneModel;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const num=n=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:1});
 function dimensions(item,part){
   if(part==='sink'&&item.sink){
     const sink=item.sink,base=M.dimensions(item);
     return {width:item.option==='basin'?base.width:sink.width||46,height:sink.height||15,depth:item.option==='basin'?46:sink.depth||33};
   }
   return M.dimensions(item);
 }
 function color(item){
   const finish=C.finishes.find(f=>f.code===item.finish);
   return finish?.solid||finish?.wood?.[0]||'#b7ab98';
 }
 function drawing(item,part='item'){
   if(!item)return '';
   const d=dimensions(item,part),w=Math.max(1,Number(d.width)),h=Math.max(1,Number(d.height)),depth=Math.max(1,Number(d.depth));
   const isSink=part==='sink',isMirror=item.kind==='mirror'&&!isSink,isCol=item.kind==='column'&&!isSink;
   const scale=Math.min(118/w,98/h),sw=w*scale,sh=h*scale,x=26+(118-sw)/2,y=28+(105-sh)/2;
   const finish=isMirror?'#b5c4ce':isSink?'#dce5e9':color(item);
   const rect=(rx,ry,rw,rh,more='')=>`<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" ${more}/>`;
   const line=(x1,y1,x2,y2,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
   const label=(x,y,text,fill='#52606a',anchor='middle')=>`<text x="${x}" y="${y}" font-size="8.4" fill="${fill}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-weight="600">${esc(text)}</text>`;
   let shape='';
   const stroke='stroke="#63716b" stroke-width="1.6"';
   if(isSink){
     if(item.option==='basin'){
       shape+=rect(x,y,sw,sh,`fill="#d5e3e7" fill-opacity=".20" ${stroke} rx="3"`);
       const cx=x+sw/2,cy=y+sh/2;
       const cups=item.sink?.layout==='double'?2:1,rx=(sw/cups)*.32;
       for(let i=0;i<cups;i++){
         const cc=x+sw*(i+.5)/cups;
         shape+=`<ellipse cx="${cc}" cy="${cy}" rx="${rx}" ry="${Math.max(3,sh*.26)}" fill="#b4c8d1" fill-opacity=".18" stroke="#607984" stroke-width="1.4"/>`;
         shape+=`<circle cx="${cc}" cy="${cy}" r="2" fill="#8b9a9d"/>`;
       }
     }else{
       shape+=`<ellipse cx="${x+sw/2}" cy="${y+sh*.38}" rx="${sw/2}" ry="${Math.max(3,sh*.28)}" fill="#c5d5dc" fill-opacity=".20" stroke="#72828c" stroke-width="1.6"/>`;
       shape+=`<path d="M ${x} ${y+sh*.38} Q ${x+sw*.1} ${y+sh*1.13} ${x+sw/2} ${y+sh*.97} Q ${x+sw*.9} ${y+sh*1.13} ${x+sw} ${y+sh*.38}" fill="#afc8d4" fill-opacity=".14" stroke="#72828c" stroke-width="1.6"/>`;
     }
   }else if(isMirror){
     const rounded=/rond|capsul|cápsul/i.test(item.mirror||'');
     if(rounded){
       shape+=`<ellipse cx="${x+sw/2}" cy="${y+sh/2}" rx="${sw/2}" ry="${sh/2}" fill="#b9cbd3" fill-opacity=".18" stroke="#607984" stroke-width="2"/>`;
       shape+=`<ellipse cx="${x+sw/2}" cy="${y+sh/2}" rx="${Math.max(1,sw/2-4)}" ry="${Math.max(1,sh/2-4)}" fill="none" stroke="#7f929b" stroke-opacity=".55"/>`;
     }else{
       shape+=rect(x,y,sw,sh,`rx="2" fill="#b9cbd3" fill-opacity=".20" stroke="#657780" stroke-width="2"`);
       shape+=rect(x+4,y+4,Math.max(1,sw-8),Math.max(1,sh-8),`fill="none" stroke="#80949d" stroke-opacity=".6" rx="1"`);
     }
     shape+=line(x+sw*.18,y+sh*.8,x+sw*.78,y+sh*.22,'stroke="#9bb1bc" stroke-opacity=".55" stroke-width="2"');
   }else{
     shape+=rect(x,y,sw,sh,`fill="${finish}" fill-opacity=".22" ${stroke} rx="1.5"`);
     shape+=`<path d="M ${x+sw} ${y} l 7 -5 v ${sh} l -7 5 z" fill="${finish}" fill-opacity=".14" stroke="#63716b" stroke-width="1.1"/>`;
     if(isCol){
       shape+=line(x+sw*.12,y+sh*.06,x+sw*.12,y+sh*.94,'stroke="#8f988b" stroke-opacity=".7"');
       shape+=`<circle cx="${x+sw*.84}" cy="${y+sh*.52}" r="2" fill="#818a81"/>`;
     }else{
       const drawers=C.models[item.model]?.drawers||2;
       for(let i=1;i<drawers;i++)shape+=line(x,y+sh*i/drawers,x+sw,y+sh*i/drawers,'stroke="#63716b" stroke-width="1.15"');
       for(let i=0;i<drawers;i++)shape+=line(x+sw*.26,y+sh*(i+.5)/drawers-2,x+sw*.74,y+sh*(i+.5)/drawers-2,'stroke="#73807a" stroke-width=".9"');
       if(item.option==='top')shape+=rect(x-2,y-3,sw+4,3,`fill="${finish}" fill-opacity=".32" stroke="#63716b" stroke-width=".7"`);
       if(item.sink){
         if(item.option==='basin')shape+=`<ellipse cx="${x+sw/2}" cy="${y+2}" rx="${sw*.25}" ry="3.5" fill="#dce5e7" fill-opacity=".6" stroke="#617b8b"/>`;
         else shape+=`<ellipse cx="${x+sw/2}" cy="${y-6}" rx="${Math.min(sw*.28,22)}" ry="5" fill="#d1dfe8" fill-opacity=".65" stroke="#617b8b"/>`;
       }
     }
   }
   const topY=16,rightX=x+sw+14,bottomY=148;
   const technical=`<g fill="none" stroke-linecap="round" stroke-width="1.1">
      ${line(x,topY,x+sw,topY,'stroke="#28649a"')}${line(x,topY-3,x,topY+3,'stroke="#28649a"')}${line(x+sw,topY-3,x+sw,topY+3,'stroke="#28649a"')}
      ${line(rightX,y,rightX,y+sh,'stroke="#ad6347"')}${line(rightX-3,y,rightX+3,y,'stroke="#ad6347"')}${line(rightX-3,y+sh,rightX+3,y+sh,'stroke="#ad6347"')}
     </g>
     ${label(x+sw/2,10,'L '+num(w)+' cm','#28649a')}
     ${label(rightX+7,y+sh/2,'H '+num(h)+' cm','#ad6347','start')}
     ${label(85,bottomY+6,'P '+num(depth)+' cm','#427e6b')}`;
   const title=isSink?'Vasque '+(item.sink?.model||''):isMirror?'Miroir '+item.mirror:isCol?'Colonne STUDIO ONE':'Meuble STUDIO ONE '+(C.models[item.model]?.name||'');
   return `<figure class="studio-technical-figure" aria-label="${esc(title)} : largeur ${num(w)} cm, hauteur ${num(h)} cm, profondeur ${num(depth)} cm">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 166" role="img" aria-label="${esc(title)} avec dimensions">
       <title>${esc(title)} · L ${num(w)} × H ${num(h)} × P ${num(depth)} cm</title>
       ${shape}${technical}
      </svg><figcaption>Schéma coté · visuel indicatif</figcaption></figure>`;
 }
 function fromOrder(row,project,st){
   const items=project?.items;
   if(items?.length){
     const item=items.find(i=>i.id===row.id);
     if(item)return drawing(item,/^Vasque\s/i.test(row.title)?'sink':'item');
   }
   if(!st)return '';
   try{
     const build=(kind,extra={})=>M.make(kind,{finish:st.color||'ROBLE',...extra});
     if(/^Vasque\s/i.test(row.title)){
       const item=build('cabinet',{width:Number(st.width)||60,model:Math.max(0,Number(st.model)||0),option:st.option,
         sink:{model:st.sinkModel,color:st.sinkColor,layout:st.sinkLayout||'single'}});
       return drawing(item,'sink');
     }
     if(/Colonne/i.test(row.title))return drawing(build('column'));
     if(/Miroir/i.test(row.title))return drawing(build('mirror',{mirror:st.mirror,mirrorSize:st.mirrorSize,mirrorFinish:st.mirrorFinish||'Noir'}));
     return drawing(build('cabinet',{width:Number(st.width)||60,model:Math.max(0,Number(st.model)||0),option:st.option||'top'}));
   }catch(e){return ''}
 }
 window.StudioOneTechnical=Object.freeze({drawing,fromOrder,dimensions});
})();