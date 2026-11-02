// ANIMA catalogue dimensions are authoritative. Internal joinery and sanitary
// curves are visual reconstructions, not manufacturing CAD or cutting plans.
// The renderer is injected, so geometry and openings can be tested without WebGL.

const cm = value => Number(value) / 100;
const clamp = value => Math.min(1, Math.max(0, Number(value) || 0));
const isRibelle = item => /ribelle|arib/i.test(item.facade || item.front || item.ref || item.reference || '');

export function createAnimaModel(T, item, finish = {}, options = {}) {
  if (!T?.Group || !item) throw new Error('Modèle Anima indisponible.');
  const W = cm(item.width), H = cm(item.height), D = cm(item.depth);
  if (![W,H,D].every(value => Number.isFinite(value) && value > 0 && value < 7)) throw new Error('Dimensions Anima invalides.');
  const root = new T.Group();
  root.name = `ANIMA_${item.ref || item.reference || item.id || 'module'}`;
  root.position.y = Number(options.bottom) || 0;
  root.userData = {anima: true, itemId: item.id, ref: item.ref || item.reference, source: item.source, width: W, height: H, depth: D};
  let disposed=false;
  const attachments = [], openings = [], materials = new Set(), geometries = new Set(), textures = new Set();
  const color = typeof finish === 'string' ? finish : finish.color || finish.hex || '#b5a898';
  const wood = mat({color, roughness: .63, metalness: .025});
  const inner = mat({color: '#555957', roughness: .58});
  const carcass = wood;
  const metal = mat({color: '#9da3a3', roughness: .28, metalness: .83});
  const dark = mat({color: '#252827', roughness: .55, metalness: .16});
  const glass = mat({color: '#c9e3df', transparent: true, opacity: .28, roughness: .13, metalness: .05, depthWrite: false});
  const ceramic = mat({color: options.basinColor || item.color || '#f6f5ef', roughness: .21, metalness: .025, side: T.DoubleSide});
  const panel = Math.min(.019, W / 10, H / 7, D / 5);
  const category = item.category === 'module' ? item.subtype : item.category || item.subtype;
  const front = isRibelle(item);

  function mat(p) {const m = new T.MeshStandardMaterial(p); materials.add(m); return m;}
  function mesh(g, m, name, parent = root, x = 0, y = 0, z = 0) {
    geometries.add(g); const o = new T.Mesh(g, m); o.name = name; o.position.set(x,y,z);
    o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
  }
  function box(w,h,d,m,name,parent = root,x = 0,y = 0,z = 0) {
    return mesh(new T.BoxGeometry(Math.max(.0001,w), Math.max(.0001,h), Math.max(.0001,d)),m,name,parent,x,y,z);
  }
  function cylinder(r,h,m,name,parent=root,x=0,y=0,z=0,segments=24) {
    return mesh(new T.CylinderGeometry(r,r,h,segments),m,name,parent,x,y,z);
  }
  function frontFace(w,h,parent,x,y,z,style=front) {
    const frontRoot = new T.Group(); frontRoot.name = style ? 'Facade_Ribelle_cannelee' : 'Facade_Pura_lisse';
    frontRoot.position.set(x,y,z-(style?.0033:0)); parent.add(frontRoot);
    // Actual façade height 25.6 cm for H26 drawers, matching the technical sheet.
    // The small top rebate follows the recessed grip visible in catalogue photos.
    const grip = Math.min(.019,h*.09);
    const cross = new T.Shape();
    cross.moveTo(-panel/2,-h/2); cross.lineTo(panel/2,-h/2);
    cross.lineTo(panel/2,h/2-grip); cross.lineTo(-panel/2,h/2); cross.closePath();
    const core = new T.ExtrudeGeometry(cross,{depth:w,bevelEnabled:false,steps:1});
    core.rotateY(-Math.PI/2);core.translate(w/2,0,0);
    mesh(core,wood,'Facade_prise_integree',frontRoot);
    if (style) {
      // One shared profile avoids hundreds of draw calls for vertical fluting.
      const height = h - grip - .002, shape = new T.Shape(), pitch = .0065;
      const count = Math.max(1,Math.round(w/pitch)), p = w/count;
      shape.moveTo(-w/2,0); shape.lineTo(w/2,0); shape.lineTo(w/2,.001);
      for(let i=count-1;i>=0;i--) {
        const right=-w/2+(i+1)*p, left=right-p;
        for(let k=0;k<=6;k++) {
          const fraction=k/6, xx=right-fraction*p;
          shape.lineTo(xx,.001 + .0023*Math.sin(Math.PI*fraction));
        }
        shape.lineTo(left,.001);
      }
      shape.closePath();
      const ribs=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1,curveSegments:2});
      ribs.rotateX(Math.PI/2); ribs.translate(0,height/2-grip/2,panel/2);
      mesh(ribs,wood,'Cannelures_verticales',frontRoot);
    }
    return frontRoot;
  }
  function backAndSides() {
    const sideD = D-panel;
    box(panel,H,sideD,carcass,'Cote_gauche',root,-W/2+panel/2,H/2,-panel/2);
    box(panel,H,sideD,carcass,'Cote_droit',root,W/2-panel/2,H/2,-panel/2);
    box(W-2*panel,panel,sideD,carcass,'Plancher',root,0,panel/2,-panel/2);
    box(W-2*panel,H-2*panel,.008,carcass,'Fond',root,0,H/2,-D/2+.004);
    box(W-2*panel,.055,panel,carcass,'Traverse_arriere',root,0,H-.0275,-D/2+panel/2);
    box(W-2*panel,.048,panel,carcass,'Traverse_avant',root,0,H-.024,D/2-panel*1.5);
    for (const x of [-W/2+.05,W/2-.05]) box(.032,.038,.018,metal,'Fixation_murale',root,x,H-.045,-D/2+.017);
  }
  function makeDrawer(index,count) {
    const moving=new T.Group(); moving.name=`Tiroir_${index+1}`; root.add(moving);
    const cell=H/count, centre=H-(index+.5)*cell, h=cell-.004;
    frontFace(W-.004,h,moving,0,centre,D/2-panel/2);
    const boxW=W-2*panel-.024, boxD=D-.070, bottom=H-(index+1)*cell+.030;
    const drawerH=Math.min(cell-.075,.150);
    const drawerBack=-D/2+.020, drawerFront=drawerBack+boxD;
    const undercut=category==='vanity'&&index===0&&options.siphon!==false;
    const fshape=new T.Shape();
    fshape.moveTo(-boxW/2,drawerBack); fshape.lineTo(-boxW/2,drawerFront); fshape.lineTo(boxW/2,drawerFront);fshape.lineTo(boxW/2,drawerBack);
    if (undercut) {
      const notchW=Math.min(.18,boxW*.37), notchFront=Math.min(drawerFront-.04,drawerBack+.19);
      fshape.lineTo(notchW/2,drawerBack);fshape.lineTo(notchW/2,notchFront);
      fshape.lineTo(-notchW/2,notchFront);fshape.lineTo(-notchW/2,drawerBack);
    }
    fshape.closePath();
    const fg=new T.ExtrudeGeometry(fshape,{depth:.008,bevelEnabled:false});fg.rotateX(Math.PI/2);
    mesh(fg,inner,'Fond_tiroir',moving,0,bottom+.008,0);
    for(const side of [-1,1]) {
      box(.011,drawerH,boxD,inner,'Flanc_tiroir',moving,side*(boxW/2-.0055),bottom+drawerH/2,(drawerBack+drawerFront)/2);
      box(.009,.022,boxD+.008,metal,'Coulisse_mobile',moving,side*(boxW/2+.008),bottom+.010,(drawerBack+drawerFront)/2);
      box(.008,.025,boxD,metal,'Coulisse_fixe',root,side*(W/2-panel-.004),bottom+.003,(drawerBack+drawerFront)/2);
    }
    box(boxW,drawerH,.013,inner,'Contre_facade',moving,0,bottom+drawerH/2,drawerFront-.0065);
    if (undercut) {
      const notchW=Math.min(.18,boxW*.37), notchFront=Math.min(drawerFront-.04,drawerBack+.19), segment=(boxW-notchW)/2;
      for(const side of [-1,1]) {
        box(segment,drawerH,.011,inner,'Dos_tiroir_siphon',moving,side*(notchW/2+segment/2),bottom+drawerH/2,drawerBack+.0055);
        box(.008,drawerH,notchFront-drawerBack,inner,'Passage_siphon_flanc',moving,side*(notchW/2),bottom+drawerH/2,(drawerBack+notchFront)/2);
      }
      box(notchW+.008,drawerH,.008,inner,'Passage_siphon_face',moving,0,bottom+drawerH/2,notchFront);
    } else box(boxW,drawerH,.011,inner,'Dos_tiroir',moving,0,bottom+drawerH/2,drawerBack+.0055);
    const opening={type:'drawer',object:moving,travel:Math.min(D*.76,.38),value:0};
    moving.userData.openingIndex=openings.length; openings.push(opening);
  }
  function makeDoor(index,count) {
    const doorW=(W-.004-(count-1)*.003)/count, left=index===0, reversed=options.hinge==='right';
    const hingeSide=count===2?(left?-1:1):(reversed?1:-1), hingeX=count===2?hingeSide*(W/2-.002):hingeSide*(W/2-.002);
    const pivot=new T.Group(); pivot.name=`Porte_${index+1}`; pivot.position.set(hingeX,0,D/2-panel/2);root.add(pivot);
    const cx=-hingeSide*doorW/2;
    if(category==='column') {
      // The 140 cm reversible door is described as ONE door. Its two visible
      // decorative panels and centre grip stay attached to the same hinge.
      const dh=(H-.030)/2;
      frontFace(doorW,dh,pivot,cx,H-dh/2-.002,0);
      const lower=frontFace(doorW,dh,pivot,cx,dh/2+.002,0);
      lower.rotation.z=Math.PI;
    } else frontFace(doorW,H-.004,pivot,cx,H/2,0);
    const hingeYs=H>.9?[.13,H/2,H-.13]:[.075,H-.075];
    for(const y of hingeYs) {
      const barrel=cylinder(.006,.035,metal,'Charniere',pivot,-hingeSide*.015,y,-panel*.8,12);
      box(.024,.035,.035,metal,'Platine_charniere',root,hingeX-hingeSide*.015,y,D/2-.039);
      barrel.castShadow=false;
    }
    const opening={type:'door',object:pivot,angle:hingeSide*Math.PI*.55,value:0};
    pivot.userData.openingIndex=openings.length; openings.push(opening);
  }
  function shelfAt(y) {box(W-2*panel-.004,.006,D-panel-.028,glass,'Etagere_verre',root,0,y,-.008);}

  function worktop(product) {
    const w=cm(product.width),h=cm(product.height),d=cm(product.depth), y=Number(options.surfaceY) || 0;
    const label=String(product.label||product.ref||'');
    const hasBasin=product.subtype==='integrated'||product.integratedBasin===true||product.basinCount>0||product.basins>0||/TK\d|TA\d|PIC|JUST|OC\d|BENT|vasque|lavabo|integrat/i.test(label+' '+(product.ref||''));
    if (!hasBasin || options.withBasin===false) {box(w,h,d,options.topMaterial==='wood'?wood:ceramic,'Plan_de_couverture',root,0,y+h/2,0);return;}
    const double=product.basinCount===2||product.basins===2||/DV|doppia|double/i.test(label+' '+(product.ref||''));
    const offset=product.basinPosition==='right'||/DX$/.test(product.ref||'')?w*.22:product.basinPosition==='left'||/SX$/.test(product.ref||'')?-w*.22:0;
    const centres=double?[-w*.25,w*.25]:[offset], wellW=double?Math.min(.43,w*.38):Math.min(.55,w-.15), wellD=Math.min(.30,d-.14);
    const shape=new T.Shape();shape.moveTo(-w/2,-d/2);shape.lineTo(w/2,-d/2);shape.lineTo(w/2,d/2);shape.lineTo(-w/2,d/2);shape.closePath();
    for(const x of centres) {
      const hole=new T.Path();const points=roundedContour(wellW,wellD,.055,10);
      points.reverse().forEach(([xx,zz],i)=>{if(i)hole.lineTo(xx+x,zz+.012);else hole.moveTo(xx+x,zz+.012);});hole.closePath();shape.holes.push(hole);
    }
    const geom=new T.ExtrudeGeometry(shape,{depth:Math.min(.018,h),bevelEnabled:false,curveSegments:10});geom.rotateX(Math.PI/2);
    mesh(geom,ceramic,'Plan_perce_cuve',root,0,y+h,0);
    if(h>.02) {
      box(w,h-.018,.018,ceramic,'Bandeau_avant_plan',root,0,y+(h-.018)/2,d/2-.009);
      for(const side of [-1,1])box(.018,h-.018,d-.036,ceramic,'Bandeau_lateral_plan',root,side*(w/2-.009),y+(h-.018)/2,0);
    }
    for(const x of centres) {
      bowl(wellW,wellD,Math.min(.14,Math.max(.095,h)),ceramic,root,x,y+h,.012,false);
      const drain=cylinder(.017,.002,metal,'Bonde',root,x,y+h-Math.min(.14,Math.max(.095,h))+.004,.012,24);
      drain.userData.illustrative=true;
      if(options.faucet!==false) faucet(x,y+h,-d/2+.045);
    }
  }
  function roundedContour(w,d,r,segments=8) {
    const pts=[], centers=[[w/2-r,d/2-r],[-w/2+r,d/2-r],[-w/2+r,-d/2+r],[w/2-r,-d/2+r]];
    for(let q=0;q<4;q++)for(let i=0;i<=segments;i++){const a=q*Math.PI/2+i/segments*Math.PI/2;pts.push([centers[q][0]+Math.cos(a)*r,centers[q][1]+Math.sin(a)*r]);}
    return pts;
  }
  function bowl(w,d,h,material,parent,x,y,z,oval=true) {
    const n=80, rings=[{scale:1,y:0},{scale:.96,y:-.02},{scale:.70,y:-h*.76},{scale:.38,y:-h},{scale:0,y:-h}], positions=[],indices=[];
    const rect=roundedContour(w,d,Math.min(.055,d/4),19);
    for(const ring of rings)for(let i=0;i<n;i++) {
      const a=i/n*Math.PI*2, p=oval?[Math.cos(a)*w/2,Math.sin(a)*d/2]:rect[i];
      positions.push(p[0]*ring.scale,ring.y,p[1]*ring.scale);
    }
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n,c=(j+1)*n+i,e=(j+1)*n+(i+1)%n;indices.push(a,b,c,b,e,c);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
    return mesh(g,material,'Cuve_reconstituee',parent,x,y,z);
  }
  function vessel(product) {
    const w=cm(product.width),h=cm(product.height),d=cm(product.depth), y=Number(options.surfaceY)||0;
    const round=product.shape==='round'||/tonda|rond|FO01|B578|132690|ECLISSE116/i.test(product.label+' '+product.ref)||Math.abs(w-d)<.001&&product.shape!=='square';
    const oval=round||/ovale|FO02|B571|149380/i.test(product.label+' '+product.ref);
    // Double skin: inner bowl, outer bowl and a continuous thin rim.
    bowl(w,d,h-.012,ceramic,root,0,y+h,0,oval);
    const outer=ceramic.clone();outer.side=T.DoubleSide;materials.add(outer);
    bowl(w+.008,d+.008,h,outer,root,0,y+h,0,oval);
    const pts=oval?Array.from({length:80},(_,i)=>[Math.cos(i/80*Math.PI*2)*(w/2+.003),Math.sin(i/80*Math.PI*2)*(d/2+.003)]):roundedContour(w+.006,d+.006,.055,19);
    const positions=[],indices=[];
    pts.forEach(([x,z])=>positions.push(x,0,z,x*.97,-.004,z*.97));
    for(let i=0;i<pts.length;i++){const a=i*2,b=((i+1)%pts.length)*2;indices.push(a,b,a+1,b,b+1,a+1);}
    const rim=new T.BufferGeometry();rim.setAttribute('position',new T.Float32BufferAttribute(positions,3));rim.setIndex(indices);rim.computeVertexNormals();mesh(rim,ceramic,'Rebord_vasque',root,0,y+h,0);
    cylinder(.017,.002,metal,'Bonde',root,0,y+.015,0);
  }
  function faucet(x,y,z) {
    const g=new T.Group();g.name='Mitigeur_illustratif_non_chiffre';g.position.set(x,y,z);root.add(g);g.userData.illustrative=true;
    cylinder(.022,.006,metal,'Embase',g,0,.003,0);
    cylinder(.016,.14,metal,'Corps',g,0,.073,0);
    const spout=cylinder(.010,.11,metal,'Bec',g,0,.145,.045);spout.rotation.x=Math.PI/2;
    box(.012,.005,.052,metal,'Levier',g,0,.165,-.012);
  }
  function mirror(product) {
    const w=cm(product.width),h=cm(product.height),d=Math.max(.012,cm(product.depth)), circular=['round','oval'].includes(product.shape)||/tond|rond|circle|round|ovale/i.test(product.label||'');
    const reflect=mat({color:'#bcc8c5',metalness:.95,roughness:.065});
    if (circular) {
      const outline=new T.Shape();outline.absellipse(0,0,w/2,h/2,0,Math.PI*2,false,0);
      const back=new T.ExtrudeGeometry(outline,{depth:d,bevelEnabled:false,curveSegments:40});mesh(back,dark,'Dos_miroir',root,0,h/2,-d/2);
      const face=mesh(new T.CircleGeometry(w/2-.003,80),reflect,'Miroir',root,0,h/2,d/2+.001);face.scale.y=h/w;face.castShadow=false;
    } else {
      box(w,h,d,dark,'Dos_miroir',root,0,h/2,0);
      const face=box(w-.004,h-.004,.002,reflect,'Miroir',root,0,h/2,d/2+.001);face.castShadow=false;
    }
  }
  function lighting() {
    const led=mat({color:'#fff1c9',emissive:'#fff0bd',emissiveIntensity:.65});
    if (/BARLED/i.test(item.ref||'')) {
      box(W,H,D,metal,'Corps_eclairage',root,0,H/2,0);
      box(W-.006,.002,D*.7,led,'Diffuseur_LED',root,0,.001,0);
    } else {
      const lampDepth=Math.min(.030,D),bodyHeight=Math.min(.015,H);
      box(Math.min(.024,W),H,Math.min(.012,D),metal,'Fixation_eclairage',root,0,H/2,-D/2+.006);
      box(Math.min(.015,W),bodyHeight,D,metal,'Bras_eclairage',root,0,H-bodyHeight/2,0);
      box(W,bodyHeight,lampDepth,metal,'Corps_eclairage',root,0,H-bodyHeight/2,D/2-lampDepth/2);
      box(W-.004,.002,lampDepth*.7,led,'Diffuseur_LED',root,0,H-bodyHeight-.001,D/2-lampDepth/2);
    }
  }
  function towelBar() {
    const diameter=Math.min(.010,H*.4);
    for(const side of [-1,1])box(diameter,H,D,metal,'Support_porte_serviette',root,side*(W/2-diameter/2),H/2,0);
    box(W,diameter,diameter,metal,'Barre_porte_serviette',root,0,H/2,D/2-diameter/2);
  }
  function bench() {
    const leg=.020;
    for(const side of [-1,1]){
      for(const z of [-D/2+leg/2,D/2-leg/2])box(leg,H,leg,dark,'Pied_structure',root,side*(W/2-leg/2),H/2,z);
      box(leg,leg,D,dark,'Traverse_structure',root,side*(W/2-leg/2),H-leg/2,0);
    }
    for(const z of [-D/2+leg/2,D/2-leg/2])box(W,leg,leg,dark,'Longeron_structure',root,0,H-leg/2,z);
  }

  if(['vanity','base','wall','column'].includes(category)) {
    backAndSides();
    let count=Number(item.drawers)||(String(item.opening||'').includes('drawer')?parseInt(item.opening,10):0);
    const doorCount=Number(item.doors)||(String(item.opening||'').includes('door')?parseInt(item.opening,10):0);
    if(count)for(let i=0;i<count;i++)makeDrawer(i,count);
    else {
      const n=doorCount||1;
      box(W-2*panel,panel,D-panel,carcass,'Dessus_caisson',root,0,H-panel/2,-panel/2);
      for(let i=0;i<n;i++)makeDoor(i,n);
      const shelves=Number.isInteger(item.shelves)?item.shelves:category==='column'?4:category==='wall'||category==='base'&&W<.5?1:0;
      for(let i=0;i<shelves;i++)shelfAt((i+1)*H/(shelves+1));
    }
  } else if(category==='worktop'||category==='top')worktop(item);
  else if(category==='basin')vessel(item);
  else if(category==='mirror')mirror(item);
  else if(category==='bench'||item.subtype==='frame'||/BRIDGE/i.test(item.ref||'')||/panca|structure|metal frame|base.*metal/i.test(item.label||''))bench();
  else if(category==='lighting') lighting();
  else if(category==='accessory'&&item.ref==='SIDEBAR')towelBar(); else {
    box(W,H,D,wood,'Accessoire_reconstitue',root,0,H/2,0);
  }

  // Composition attachments retain their own catalogue dimensions and geometry.
  // UI supplies an explicit finished width for per-metre / made-to-measure tops.
  // No 3D proxy is invented for ancillaries whose dimensions are absent.
  if (['vanity','base'].includes(category)) {
    let surface=H;
    const topOffset=(Number(options.topOffset)||0)/100;
    const validProduct=product=>product&&['width','height','depth'].every(key=>Number.isFinite(Number(product[key]))&&Number(product[key])>0);
    for (const [kind,product] of [['top',options.top],['basin',options.basin],['mirror',options.mirror],['light',options.light],['accessory',options.accessory]]) if(validProduct(product)) {
      const opts={...options,top:null,basin:null,mirror:null,light:null,accessory:null,bottom:0};
      if(kind==='top'){opts.surfaceY=H;if(product.subtype==='cover')opts.topMaterial='wood';}
      else if(kind==='basin')opts.surfaceY=surface;
      const child=createAnimaModel(T,product,kind==='top'&&(product.material==='melamine'||product.subtype==='cover')?finish:{color:options.basinColor||'#f6f5ef'},opts);
      child.root.userData.attachmentKind=kind;
      if(kind==='top'){surface=H+cm(product.height);child.root.position.x=topOffset;}
      if(kind==='basin')child.root.position.x=topOffset;
      if(kind==='mirror')child.root.position.set(0,surface+.22,-D/2+cm(product.depth)/2);
      if(kind==='light') {
        const mirrorHeight=options.mirror&&Number(options.mirror.height)>0?cm(options.mirror.height):.70;
        child.root.position.set(0,surface+.22+mirrorHeight,-D/2+cm(product.depth)/2);
      }
      if(kind==='accessory') {
        if(product.ref==='SIDEBAR') {
          child.root.rotation.y=Math.PI/2;
          child.root.position.set(W/2+cm(product.depth)/2,Math.max(0,H-.085),0);
        } else if(product.subtype==='frame'||/BRIDGE/i.test(product.ref||'')) {
          // Local bottom is negative to put the whole catalogue-height frame
          // directly under the cabinet. The composition's bottom positions it.
          child.root.position.set(0,-cm(product.height),0);
        } else if(product.ref==='STF40')child.root.position.set(W/2-.05,H-.08,-D/2+cm(product.depth)/2);
        else child.root.position.set(0,surface,0);
      }
      root.add(child.root); attachments.push(child);
    }
  }

  if (typeof finish==='object'&&finish.texture) {
    try {
      new T.TextureLoader().load(finish.texture,texture=>{
        if(disposed){texture.dispose();return;}textures.add(texture);if(texture.colorSpace!==undefined)texture.colorSpace=T.SRGBColorSpace||'srgb';else texture.encoding=T.sRGBEncoding;
        texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(Math.max(.4,W),Math.max(.4,H));wood.map=texture;wood.color.set('#ffffff');wood.needsUpdate=true;
      },undefined,()=>{});
    } catch (_) { /* A texture failure keeps the selected finish colour. */ }
  }
  return {
    root, openings, attachments, dimensions:{width:W,height:H,depth:D},
    setOpen(value,index) {
      const amount=clamp(value);
      for(let i=0;i<openings.length;i++)if(index===undefined||i===index){const o=openings[i];o.value=amount;if(o.type==='drawer')o.object.position.z=o.travel*amount;else o.object.rotation.y=o.angle*amount;}
      return amount;
    },
    setFinish(value) {if(value?.color||value?.hex||typeof value==='string'){wood.color.set(typeof value==='string'?value:value.color||value.hex);wood.needsUpdate=true;}},
    dispose() {if(disposed)return;disposed=true;attachments.forEach(child=>child.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent?.();}
  };
}
