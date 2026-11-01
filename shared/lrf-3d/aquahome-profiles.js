// Shape families read from product photographs in AQUAHOME 2026.
// Except the documented Flip dimensions, these are reconstruction dimensions,
// not certified manufacturer CAD. Sources remain in aquahome-product-photos.json.
const basinProfiles={
 'Bel Air':{shape:'round-tube',height:.165,xlHeight:.274,reach:.110,xlReach:.138,outlet:.066,xlOutlet:.168,headGap:.075},
 'Flip':{shape:'knurled',height:.165,xlHeight:.302,reach:.093,xlReach:.138,outlet:.063,xlOutlet:.168,headGap:.075,radius:.020},
 'Alsacia':{shape:'round-flat',height:.165,xlHeight:.312,reach:.091,xlReach:.168,headGap:.051,xlOutlet:.264,spoutWidth:.039,leverWidth:.036,radius:.022},
 'Malibú':{shape:'round-flat',height:.157,xlHeight:.242,reach:.1255,xlReach:.125,headGap:.024,outlet:.133,xlOutlet:.215,radius:.020,spoutWidth:.032},
 'Manila':{shape:'swept',height:.162,xlHeight:.2765,reach:.152,xlReach:.178,headGap:.040,outlet:.130,xlOutlet:.254,width:.032,spoutWidth:.038,leverWidth:.037},
 'Bora Bora':{shape:'square',height:.171,xlHeight:.270,reach:.130,xlReach:.170,headGap:.041,outlet:.139,xlOutlet:.245,width:.038,spoutWidth:.049,leverWidth:.042,openLever:true},
 'New Twist':{shape:'square',height:.170,xlHeight:.300,reach:.120,xlReach:.160,outlet:.120,xlOutlet:.260,headGap:.047,width:.038,spoutWidth:.032,leverWidth:.032},
 'Oporto':{shape:'round-flat',height:.159,reach:.110,headGap:.041,radius:.020,spoutWidth:.028,leverWidth:.027},
 'Lyon':{shape:'organic',height:.115,reach:.100,outlet:.090,headGap:.044,radius:.024,spoutWidth:.030,leverWidth:.032},
 'Munich':{shape:'organic',height:.132,reach:.130,headGap:.045,radius:.025,spoutWidth:.033,leverWidth:.033,leverLength:.074},
 'Sprinter':{shape:'organic',height:.115,reach:.115,headGap:.043,radius:.026,spoutWidth:.031,leverWidth:.030,leverLength:.071},
 'Época':{shape:'classic',height:.180,reach:.120,outlet:.135,headGap:.045}
};
export function aquahomeProfile(product){
 if(product.use==='shower-kit')return {key:'piccolo-'+product.sourceName,shape:'round-tube',thermostatic:true,bathSpout:/BAÑO/.test(product.sourceName)};
 if(product.use==='basin-floor')return {key:'floor-'+product.sourceName,shape:/STAR/.test(product.sourceName)?'square':'round-tube'};
 if(product.use==='shower'){
  const name=product.sourceName,model=name.replace(/^COLUMNA (?:TERMOSTÁTICA )?DE (?:DUCHA|BAÑO) /,'');
  return {key:'shower-'+model,thermostatic:/TERMOSTÁTICA/.test(name),squareRain:/TWIST|SUPREMA|HIDROMASAJE/.test(name),squareBody:/TWIST|SUPREMA|HIDROMASAJE/.test(name),slimHandset:/BEL AIR|TWIST|SUPREMA/.test(name),bathSpout:/BAÑO/.test(name),hydromassage:/HIDROMASAJE/.test(name)};
 }
 if(product.use==='island'){const shape=/SQUARE/.test(product.sourceName)?'square':/CURVE/.test(product.sourceName)?'curve':'round';return {key:'island-'+shape,shape};}
 const profile=basinProfiles[product.collection];if(!profile)throw new Error('Modèle AQUA HOME sans profil 3D : '+product.collection);
 return {...profile,key:product.collection+'-'+product.use};
}
