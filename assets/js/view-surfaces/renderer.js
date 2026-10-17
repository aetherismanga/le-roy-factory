/* VIEW metric atlas. ELIOS rendering and validated scene lighting are unchanged. */
(() => {
 'use strict';const Base=window.RandalSurfaceRenderer;
 window.RandalSurfaceRenderer=class extends Base{
  apply(mesh,value){const s=window.RandalSurfaceCatalogue.resolve(value);if(s?.brand==='view'&&!s.surfaces.includes(Math.abs(mesh.rotation.x)>1?'floor':'wall')){this.onError('Ce revêtement est destiné au sol.');return Promise.resolve(false);}return super.apply(mesh,value);}
  async atlas(s){
   if(s.brand!=='view')return super.atlas(s);
   const T=this.T,co=window.ViewSurfaceCollections.find(c=>c.id===s.collection).colors.find(c=>c.id===s.color),mobile=innerWidth<1100,quality=s.quality==='auto'?(mobile?'balanced':'high'):s.quality,urls=quality==='high'?s.faces:co.mobileFaces;
   const ims=await Promise.all(urls.map(url=>new Promise((resolve,reject)=>{const im=new Image();im.decoding='async';im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Échantillon VIEW indisponible : '+url));im.src=url;})));
   let tw=s.width,th=s.height;if(s.orientation==='horizontal'&&th>tw||s.orientation==='vertical'&&tw>th)[tw,th]=[th,tw];
   const grout=s.groutWidth/1000,pw=tw+grout,ph=th+grout;let grid=Math.ceil(Math.sqrt(ims.length));if(s.layout==='staggered')grid=Math.max(2,grid+(grid%2));
   const ww=pw*grid,wh=ph*grid,cap=quality==='high'?2048:quality==='balanced'?1024:768,density=Math.min(cap/Math.max(ww,wh),...ims.map(im=>{let iw=im.width,ih=im.height;if((ih>iw)!==(th>tw))[iw,ih]=[ih,iw];return Math.min(iw/tw,ih/th);}));
   const canvas=document.createElement('canvas'),bump=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(ww*density));canvas.height=Math.max(1,Math.floor(wh*density));bump.width=canvas.width;bump.height=canvas.height;
   const ctx=canvas.getContext('2d'),bx=bump.getContext('2d'),cw=canvas.width/grid,ch=canvas.height/grid,gx=grout/ww*canvas.width,gy=grout/wh*canvas.height;
   ctx.fillStyle=s.groutColor;ctx.fillRect(0,0,canvas.width,canvas.height);bx.fillStyle='#777';bx.fillRect(0,0,bump.width,bump.height);
   function cover(im,w,h){const ratio=w/h,ir=im.width/im.height;let sw=im.width,sh=im.height;if(ir>ratio)sw=sh*ratio;else sh=sw/ratio;ctx.drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,-w/2,-h/2,w,h);}
   for(let row=0;row<grid;row++)for(let col=-1;col<grid+1;col++){const im=ims[(row*grid+(col+grid)%grid)%ims.length],x=col*cw+(s.layout==='staggered'&&row%2?cw/2:0),y=row*ch,w=cw-gx,h=ch-gy;ctx.save();ctx.translate(x+cw/2,y+ch/2);if((im.height>im.width)!==(th>tw)){ctx.rotate(Math.PI/2);cover(im,h,w);}else cover(im,w,h);ctx.restore();bx.fillStyle='#eee';bx.fillRect(x+gx/2,y+gy/2,w,h);}
   const texture=(c,color)=>{const t=new T.CanvasTexture(c);if(color)t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(mobile?4:12,this.renderer.capabilities.getMaxAnisotropy());t.minFilter=T.LinearMipmapLinearFilter;return t;};
   return {map:texture(canvas,true),bump:texture(bump,false),width:canvas.width,height:canvas.height,worldWidth:ww,worldHeight:wh,tileWidth:tw,tileHeight:th};
  }
 };
})();
