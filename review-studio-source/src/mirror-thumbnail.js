// Product-choice drawings only. The scene's reflective 3D mirrors are unchanged.
// Proportions and light strips match the existing catalogue models in mirrors.js.
const MODELS=Object.freeze({
 round:{width:60,height:60,radius:30,metal:true},
 'metal-rect':{width:80,height:60,radius:2.5,metal:true},
 basic:{width:60,height:80,radius:0},
 zen:{width:60,height:80,radius:0,led:'top'},
 ilse:{width:60,height:80,radius:0,led:'sides'},
 capsule:{width:45,height:90,radius:22.5,led:'rim'}
});
export function mirrorThumbnail(id='capsule'){
 const model=MODELS[id]||MODELS.capsule,scale=Math.min(540/model.width,460/model.height),w=model.width*scale,h=model.height*scale,x=(800-w)/2,y=(600-h)/2,r=model.radius*scale;
 const shape=(inset=0,attrs='')=>`<rect x="${x+inset}" y="${y+inset}" width="${w-2*inset}" height="${h-2*inset}" rx="${Math.max(0,r-inset)}" ${attrs}/>`;
 const led=model.led==='top'?`<rect x="${x+w*.115}" y="${y+3.5*scale}" width="${w*.77}" height="${1.2*scale}" rx="1" fill="#fff3dd"/>`:model.led==='sides'?[-1,1].map(sign=>`<rect x="${400+sign*(w/2-1.8*scale)-.45*scale}" y="${y+2.25*scale}" width="${.9*scale}" height="${h-4.5*scale}" rx="1" fill="#fff3dd"/>`).join(''):model.led==='rim'?shape(.8*scale,'fill="none" stroke="#fff0d4" stroke-width="'+(.4*scale)+'"'):'';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" role="img" aria-label="Miroir sur fond neutre"><defs><linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e6ebea"/><stop offset=".43" stop-color="#f7f9f6"/><stop offset=".68" stop-color="#dce3e1"/><stop offset="1" stop-color="#c5d0ce"/></linearGradient><linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#bac4c2"/><stop offset=".5" stop-color="#f8fbf9"/><stop offset="1" stop-color="#8b9995"/></linearGradient><filter id="shadow" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="7" dy="11" stdDeviation="7" flood-color="#353e36" flood-opacity=".18"/></filter></defs><rect width="800" height="600" fill="#f4f2eb"/>${shape(0,'fill="'+(model.metal?'#303734':'url(#edge)')+'" filter="url(#shadow)"')}${shape(model.metal?4:2.2,'fill="url(#glass)" stroke="'+(model.metal?'#626d67':'#a4afaa')+'" stroke-width="1"')}${led}</svg>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
