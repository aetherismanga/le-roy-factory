import * as T from 'three';

// Anima PDF p.9 shows pale warm grey woven drawer sides. No calibrated colour,
// textile specification or industrial section is printed in the catalogue.
export const ANIMA_DRAWER_APPEARANCE=Object.freeze({color:'#b8b6af',roughness:.86,metalness:0,bumpScale:.000045,physicalPeriod:.016,sourcePdfPage:9,approximate:true});

export function applyAnimaDrawerFinish(asset){
  const material=asset.drawerMetal;if(!material)return;
  if(!material.userData.animaDrawerAppearance){
    const N=128,pixels=new Uint8Array(N*N*4);
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const warp=Math.cos(x/8*Math.PI*2),weft=Math.cos(y/8*Math.PI*2),over=(Math.floor(x/8)+Math.floor(y/8))%2;
      const value=Math.round(128+30*(over?warp*.7+weft*.3:warp*.3+weft*.7)),i=(y*N+x)*4;
      pixels[i]=pixels[i+1]=pixels[i+2]=value;pixels[i+3]=255;
    }
    const bump=new T.DataTexture(pixels,N,N,T.RGBAFormat);bump.name='Anima_gris_textile_microrelief';bump.colorSpace=T.NoColorSpace;bump.wrapS=bump.wrapT=T.RepeatWrapping;bump.magFilter=T.LinearFilter;bump.minFilter=T.LinearMipmapLinearFilter;bump.generateMipmaps=true;bump.needsUpdate=true;
    material.name='Anima_interieur_gris_textile_photo';material.color.set(ANIMA_DRAWER_APPEARANCE.color);material.metalness=0;material.roughness=ANIMA_DRAWER_APPEARANCE.roughness;material.bumpMap=bump;material.bumpScale=ANIMA_DRAWER_APPEARANCE.bumpScale;material.userData.animaDrawerAppearance={...ANIMA_DRAWER_APPEARANCE,note:'Aspect gris textile reconstruit depuis la photographie Anima p.9 ; teinte non calibrée.'};material.needsUpdate=true;
  }
  // Project in physical metres, also on newly rebuilt siphon cutouts. Never
  // stretch one woven patch over a whole drawer or colour the steel runners.
  asset.cabinet.traverse(mesh=>{if(!mesh.isMesh||mesh.material!==material)return;const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,period=ANIMA_DRAWER_APPEARANCE.physicalPeriod;let uv=g.attributes.uv;if(!uv){uv=new T.Float32BufferAttribute(new Float32Array(p.count*2),2);g.setAttribute('uv',uv);}for(let i=0;i<p.count;i++){const x=p.getX(i)+mesh.position.x,y=p.getY(i)+mesh.position.y,z=p.getZ(i)+mesh.position.z;if(Math.abs(n.getX(i))>.6)uv.setXY(i,z/period,y/period);else if(Math.abs(n.getY(i))>.6)uv.setXY(i,x/period,z/period);else uv.setXY(i,x/period,y/period);}uv.needsUpdate=true;mesh.userData.animaDrawerAppearance=material.userData.animaDrawerAppearance;});
}
