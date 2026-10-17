/* STUDIO ONE scene adapter. Rebuild individual geometry, never scale a basin. */
(function () {
  'use strict';
  const C=window.StudioOneCatalog,M=window.StudioOneModel,T=window.THREE;
  class SceneView {
    constructor(stage,store,onNotice){
      this.stage=stage;this.store=store;this.onNotice=onNotice;this.roots=new Map();this.materials=new Map();this.dimensionsVisible=false;this.reverse=true;this.yaw=.32;this.pitch=.12;this.distance=3.5;this.target=new T.Vector3(0,1,0);this.pointers=new Map();
      this.scene=new T.Scene();this.scene.background=new T.Color('#e6e1d7');this.camera=new T.PerspectiveCamera(38,1,.01,70);
      try{this.renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}catch(e){throw Error('La 3D nécessite WebGL. Activez l’accélération graphique ou essayez un autre navigateur.');}
      const r=this.renderer;r.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<1100?1.5:2));r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=.94;r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;
      this.canvas=r.domElement;this.canvas.setAttribute('aria-label','Composition STUDIO ONE : sélectionner et déplacer les éléments');this.canvas.tabIndex=0;stage.prepend(this.canvas);
      this.scene.add(new T.HemisphereLight('#ffffff','#a3a59c',.75));const light=new T.DirectionalLight('#fff6e5',1.12);light.position.set(-3,5,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-5,right:5,top:5,bottom:-3});light.shadow.normalBias=.025;this.scene.add(light);const fill=new T.DirectionalLight('#e2edff',.28);fill.position.set(4,2,-1);this.scene.add(fill);
      const floor=new T.Mesh(new T.PlaneGeometry(30,20),new T.MeshStandardMaterial({color:'#c6bcae',roughness:.93}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.scene.add(floor);
      const wall=new T.Mesh(new T.PlaneGeometry(30,8),new T.MeshStandardMaterial({color:'#ece7dd',roughness:.95}));wall.position.set(0,3,-.245);wall.receiveShadow=true;this.scene.add(wall);this.mirrorRenderer=new window.RandalMirrorRenderer(T,r,this.scene,()=>{});this.wall=wall;this.floor=floor;this.setTile('floor','creta:ginepro');this.setTile('wall','venere:perla');
      this.dimRoot=new T.Group();this.scene.add(this.dimRoot);this.ray=new T.Raycaster();this.dragPlane=new T.Plane(new T.Vector3(0,0,1),0);
      this.bind();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(stage);store.subscribe((p,meta)=>this.sync(p,meta));this.sync(store.snapshot(),{geometry:true});this.fit();this.resize();this.lastTime=performance.now();this.animate=this.animate.bind(this);requestAnimationFrame(this.animate);
    }

    // ELIOS ambience: tile scale in metres, optional original Creta catalogue texture.
    setTile(surface,key,orientation='horizontal',dimensions){
      const target=surface==='floor'?this.floor:this.wall;
      const palette={zucchero:'#dfcfb6',avena:'#bba78e',biscotto:'#bb8f67',caramello:'#a5734b',matcha:'#89906c',ginepro:'#5f776f',malto:'#a28265',pepe:'#75726c',perla:'#d9d5d0',aura:'#c7c0b8',seta:'#c8b8ac',flora:'#c4a9a3',rugiada:'#b7c3ba',zefiro:'#b5c3c7',mare:'#879eaa',atlante:'#b6a994',avorio:'#d6c9b5',beige:'#bca78b',ivory:'#d9d0bc',sand:'#b9a88d',pearl:'#c4c1b8',oxid:'#897c71',carbon:'#565958',honey:'#b69a6f',amber:'#a8794d',natural:'#b9a888',white:'#d8d4cb',bone:'#d8cbb8','bottle-green':'#37635b',burgundy:'#7d4652',chalk:'#e3e0d7','coffee-bean':'#6e5244',dawn:'#d5b2aa',dusk:'#8c8188',thyme:'#74816d','thyme-green':'#74816d',turquoise:'#5b9a9d',blue:'#4e7799'};
      const [collection,shade]=String(key).split(':');if(!palette[shade])return;
      const fallback={creta:[60,60],venere:[33.3,100],corso:[60,90],'golden-stone':[60,120],yosemite:[23.4,119.5],roma:[40,60],dynasty:[60,120],'azuli-mood-5':[5,15],'azuli-mood-10':[10,10]};
      let [w,h]=dimensions||fallback[collection]||[60,60];if(surface==='wall'&&orientation==='horizontal'&&h>w)[w,h]=[h,w];if(orientation==='vertical'&&w>h)[w,h]=[h,w];
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle=palette[shade];ctx.fillRect(0,0,512,512);
      ctx.strokeStyle='rgba(80,75,70,.3)';ctx.lineWidth=2;ctx.strokeRect(1,1,510,510);
      const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;
      tex.repeat.set(30/(w/100),(surface==='floor'?20:8)/(h/100));tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
      const previous=target.material.map;target.material.map=tex;target.material.color.set('#fff');target.material.roughness=.87;target.material.needsUpdate=true;previous?.dispose();
      target.userData.tileKey=key+'|'+orientation;
      if(collection==='creta'){
        new T.TextureLoader().load('assets/img/elios/creta/textures/'+shade+'.webp',image=>{
          if(target.userData.tileKey!==key+'|'+orientation){image.dispose();return;}
          image.colorSpace=T.SRGBColorSpace;image.wrapS=image.wrapT=T.RepeatWrapping;image.repeat.copy(tex.repeat);image.anisotropy=tex.anisotropy;
          target.material.map=image;target.material.needsUpdate=true;tex.dispose();
        },undefined,()=>{});
      }
    }
    toggleMirrorLED(id){const item=this.store.project.items.find(i=>i.id===id);return item?.kind==='mirror'&&/LED/i.test(item.mirror)?this.store.update(id,{ledOn:!item.ledOn}):false;}
    material(color,roughness=.65){return new T.MeshStandardMaterial({color,roughness,metalness:0});}
    finish(code){
      if(this.materials.has(code))return this.materials.get(code);
      const co=C.finishes.find(c=>c.code===code),side=this.material(co.hex),front=side.clone();this.materials.set(code,{side,front});
      if(co.texture)new T.TextureLoader().load(co.texture,tex=>{tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());side.map=tex;side.color.set('#fff');side.needsUpdate=true;const horizontal=tex.clone();horizontal.center.set(.5,.5);horizontal.rotation=Math.PI/2;horizontal.needsUpdate=true;front.map=horizontal;front.color.set('#fff');front.needsUpdate=true;},undefined,()=>this.onNotice('Texture '+co.name+' indisponible ; teinte de secours affichée.'));
      return {side,front};
    }
    box(parent,w,h,d,x,y,z,mat,name){const o=new T.Mesh(new T.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;if(name)o.name=name;parent.add(o);return o;}
    create(item){
      const root=new T.Group();root.userData.id=item.id;root.name=item.id;const dim=M.dimensions(item),w=dim.width/100,h=dim.height/100,d=dim.depth/100,fin=this.finish(item.finish),inside=this.material('#b7b3a8'),metal=this.material('#454b50',.38),drawerInside=this.material('#454b50',.48);
      root.userData.drawers=[];root.userData.doors=[];root.userData.progress=item.open?1:0;
      if(item.kind==='mirror'){
        const frameColor=({'Noir':'#262829','Doré':'#c0aa6a','Bronze':'#827653','Argent':'#b7b9b8'})[item.mirrorFinish]||'#b7bbb8';const visual=this.mirrorRenderer.create(item.mirror,w,h,{on:!!item.ledOn,frameColor});visual.position.y=h/2;root.add(visual);root.userData.mirrorVisual=visual;
      }else{
        this.box(root,.018,h,d-.02,-w/2+.009,h/2,-.01,fin.side);this.box(root,.018,h,d-.02,w/2-.009,h/2,-.01,fin.side);
        this.box(root,w-.036,.018,d,0,.009,0,fin.side);if(item.kind==='column')this.box(root,w-.036,.018,d,0,h-.009,0,fin.side);else{this.box(root,w-.036,.025,.035,0,h-.025,-d/2+.025,inside);this.box(root,w-.036,.025,.025,0,h-.025,d/2-.025,inside);}this.box(root,w-.036,h-.036,.012,0,h/2,-d/2+.006,inside);
        if(item.kind==='column'){
          for(let k=1;k<=2;k++)this.box(root,w-.036,.015,d-.035,0,h*k/3,0,fin.side,'shelf-'+k);
          const right=item.doorSide==='right',direction=right?-1:1;
          const hinge=new T.Group();hinge.position.set(right?w/2-.009:-w/2+.009,0,d/2-.009);hinge.name='door-hinge';hinge.userData.openDirection=right?1:-1;root.add(hinge);this.box(hinge,w-.018,h-.008,.018,direction*(w-.018)/2,h/2,0,fin.front,'door');
          const bevel=this.box(hinge,w-.03,.019,.018,direction*(w-.018)/2,h-.020,0,fin.front);bevel.rotation.x=-Math.PI/4;root.userData.doors.push(hinge);
        }else{
          const count=C.models[item.model].drawers,dh=(h-.02)/count;
          for(let k=0;k<count;k++){
            const group=new T.Group();group.name='drawer-'+k;root.add(group);root.userData.drawers.push(group);const cy=h-.01-(k+.5)*dh;
            this.box(group,w-.012,dh-.008,.018,0,cy,d/2-.009,fin.front,'front');const bevel=this.box(group,w-.022,.019,.018,0,cy+dh/2-.014,d/2-.013,fin.front);bevel.rotation.x=-Math.PI/4;
            const floorY=cy-dh/2+.035,iw=w-.10,back=-d/2+.05,front=d/2-.035;
            // Top drawer siphon notch is open at the rear, and moves with its own drawer.
            if(k===0){const notch=Math.min(.19,iw*.45),near=back+.16,sideW=(iw-notch)/2;this.box(group,iw,.01,front-near,0,floorY,(front+near)/2,drawerInside);for(const sign of [-1,1]){this.box(group,sideW,.01,.16,sign*(notch+sideW)/2,floorY,back+.08,drawerInside);this.box(group,.01,.09,.16,sign*notch/2,floorY+.05,back+.08,drawerInside);}this.box(group,notch,.09,.01,0,floorY+.05,near,drawerInside);}
            else this.box(group,iw,.01,d-.085,0,floorY,.008,drawerInside);
            for(const sign of [-1,1]){this.box(group,.012,Math.max(.07,dh-.09),d-.09,sign*(w/2-.045),cy-.02,0,drawerInside);this.box(group,.008,.018,d-.10,sign*(w/2-.031),floorY+.025,0,metal);}
            this.box(group,iw,.07,.012,0,floorY+.04,back,drawerInside);
          }
          if(item.option==='top')this.box(root,w,.019,d,0,h+.0095,0,fin.side,'top');
          if(item.sink)this.basin(root,item,w,h,d);
        }
      }
      root.position.set(item.position.x/100,item.position.y/100,item.position.z/100);return root;
    }
    basin(root,item,w,h,d){
      const s=item.sink,co=(item.option==='basin'?C.insetColors:C.vesselColors).find(c=>c.code===s.color),ceramic=new T.MeshPhysicalMaterial({color:co.hex,roughness:s.color==='gloss'?.16:.52,metalness:0,clearcoat:s.color==='gloss'?.25:0,side:T.DoubleSide}),chrome=new T.MeshStandardMaterial({color:'#c3c8cb',metalness:.9,roughness:.2}),basin=new T.Group();basin.name='basin';root.add(basin);
      if(item.option==='top'){
        const radius=.185,vh=s.height/100,profile=[new T.Vector2(.012,0),new T.Vector2(radius*.5,0),new T.Vector2(radius*.78,.01),new T.Vector2(radius*.96,vh*.6),new T.Vector2(radius,vh),new T.Vector2(radius-.008,vh),new T.Vector2(radius*.90,vh*.59),new T.Vector2(radius*.65,vh*.15),new T.Vector2(.012,.018)];
        const shell=new T.Mesh(new T.LatheGeometry(profile,72),ceramic);shell.scale.set(s.width/100/(radius*2),1,s.depth/100/(radius*2));shell.position.y=h+.019;shell.castShadow=true;basin.add(shell);const drain=new T.Mesh(new T.CylinderGeometry(.015,.015,.003,24),chrome);drain.position.y=h+.040;basin.add(drain);return;
      }
      const double=s.layout==='double',centers=double?[-.30,.30]:[0],rw=double?.217:Math.min(.33,(w-.13)/2),rz=s.model==='Sella'?.153:.141,power=s.model==='Sella'?4.5:5.6;
      const contour=(theta,scale)=>[Math.sign(Math.cos(theta))*Math.pow(Math.abs(Math.cos(theta)),2/power)*rw*scale,Math.sign(Math.sin(theta))*Math.pow(Math.abs(Math.sin(theta)),2/power)*rz*scale];
      const shape=new T.Shape();shape.moveTo(-w/2,-d/2);shape.lineTo(w/2,-d/2);shape.lineTo(w/2,d/2);shape.lineTo(-w/2,d/2);shape.closePath();
      centers.forEach(cx=>{const hole=new T.Path();for(let j=0;j<=80;j++){const p=contour(-j*Math.PI*2/80,1);j?hole.lineTo(cx+p[0],.025-p[1]):hole.moveTo(cx+p[0],.025-p[1]);}shape.holes.push(hole);});
      const plate=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.027,steps:1,bevelEnabled:false,curveSegments:48}),ceramic);plate.rotation.x=-Math.PI/2;plate.position.y=h;plate.castShadow=true;basin.add(plate);
      centers.forEach(cx=>{const vertices=[],indices=[],segments=80,rings=16,bowlDepth=s.model==='Sella'?.133:.123;for(let k=0;k<=rings;k++){const scale=1-k/rings*.995;for(let j=0;j<=segments;j++){const p=contour(j*Math.PI*2/segments,scale);vertices.push(cx+p[0],h+.027-bowlDepth*(1-scale*scale),-.025+p[1]);}}for(let k=0;k<rings;k++)for(let j=0;j<segments;j++){const a=k*(segments+1)+j,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const bowl=new T.Mesh(geo,ceramic);basin.add(bowl);const drain=new T.Mesh(new T.CylinderGeometry(.016,.016,.003,24),chrome);drain.position.set(cx,h+.028-bowlDepth,-.025);basin.add(drain);});
    }
    dispose(root){this.mirrorRenderer.release(root);root.traverse(o=>{o.geometry?.dispose();if(o.material){for(const mat of Array.isArray(o.material)?o.material:[o.material])if(![...this.materials.values()].some(v=>v.side===mat||v.front===mat)){mat.map?.dispose();mat.dispose();}}});}
    sync(project,meta){
      const ids=new Set(project.items.map(i=>i.id));for(const [id,root] of this.roots)if(!ids.has(id)){this.scene.remove(root);this.dispose(root);this.roots.delete(id);}
      project.items.forEach(item=>{const signature=JSON.stringify({...item,position:null,open:null,ledOn:null});let root=this.roots.get(item.id);if(!root||root.userData.signature!==signature){if(root){this.scene.remove(root);this.dispose(root);}root=this.create(item);root.userData.signature=signature;this.roots.set(item.id,root);this.scene.add(root);}root.position.set(item.position.x/100,item.position.y/100,item.position.z/100);root.userData.open=item.open;if(root.userData.mirrorVisual)this.mirrorRenderer.setLED(root.userData.mirrorVisual,!!item.ledOn);});
      this.drawDimensions();this.highlight();
    }
    highlight(){if(this.selectionBox){this.scene.remove(this.selectionBox);this.selectionBox.geometry.dispose();this.selectionBox.material.dispose();}const item=this.store.selected;if(!item)return;const b=M.bounds(item),box=new T.Box3(new T.Vector3(b.left/100,b.bottom/100,b.back/100),new T.Vector3(b.right/100,b.top/100,b.front/100));this.selectionBox=new T.Box3Helper(box,'#b08a50');this.scene.add(this.selectionBox);}
    drawDimensions(){
      this.dispose(this.dimRoot);this.dimRoot.clear();this.dimRoot.visible=this.dimensionsVisible;if(!this.dimensionsVisible)return;
      const line=(a,b,color)=>{const o=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(...a),new T.Vector3(...b)]),new T.LineBasicMaterial({color,depthTest:false}));o.renderOrder=20;this.dimRoot.add(o);};
      const label=(text,x,y,z,color)=>{const cv=document.createElement('canvas');cv.width=640;cv.height=128;const ctx=cv.getContext('2d');ctx.fillStyle='#ffffffee';ctx.fillRect(0,0,640,128);ctx.fillStyle=color;ctx.font='bold 56px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,320,64,610);const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;const o=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false}));o.position.set(x,y,z);o.scale.set(.5,.1,1);o.renderOrder=21;this.dimRoot.add(o);};
      const selected=this.store.selected;
      const items=selected?[selected]:this.store.project.items;
      for(const item of items){
        const d=M.dimensions(item),p=item.position,x=p.x/100,y=p.y/100,z=p.z/100,w=d.width/100,h=d.height/100,dep=d.depth/100;
        line([x-w/2,y-.09,z+dep/2+.08],[x+w/2,y-.09,z+dep/2+.08],'#2563a2');
        label('L '+d.width+' cm',x,y-.16,z+dep/2+.08,'#20578a');
        line([x+w/2+.12,y,z+dep/2],[x+w/2+.12,y+h,z+dep/2],'#a4483e');
        label('H '+d.height+' cm',x+w/2+.22,y+h/2,z+dep/2,'#a4483e');
        line([x-w/2-.10,y+h+.11,z-dep/2],[x-w/2-.10,y+h+.11,z+dep/2],'#437749');
        label('P '+d.depth+' cm',x-w/2-.10,y+h+.20,z,'#437749');
        if(selected){
          line([x-w/2-.23,0,z+dep/2],[x-w/2-.23,y,z+dep/2],'#7c3aed');
          label('Sol '+Math.round(y*1000)/10+' cm',x-w/2-.30,Math.max(.08,y/2),z+dep/2,'#6d28d9');
        }
      }
    }
    fit(front=false){const items=this.store.project.items;if(!items.length){this.target.set(0,1,0);this.distance=3.5;return;}const bs=items.map(M.bounds),left=Math.min(...bs.map(b=>b.left))/100,right=Math.max(...bs.map(b=>b.right))/100,bottom=Math.min(...bs.map(b=>b.bottom))/100,top=Math.max(...bs.map(b=>b.top))/100;this.target.set((left+right)/2,(top+bottom)/2,0);const aspect=this.stage.clientWidth/Math.max(1,this.stage.clientHeight),v=Math.tan(this.camera.fov*Math.PI/360);this.distance=Math.max((top-bottom+.6)/(2*v),(right-left+.7)/(2*v*aspect))*1.24;if(front){this.yaw=0;this.pitch=.04;}else{this.yaw=.24;this.pitch=.1;}}
    resize(){const w=this.stage.clientWidth,h=this.stage.clientHeight;this.camera.aspect=w/Math.max(1,h);this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
    point(e){const r=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);return this.ray;}
    hit(e){const hits=this.point(e).intersectObjects([...this.roots.values()],true);for(const hit of hits){for(let o=hit.object;o;o=o.parent)if(o.userData.id)return o.userData.id;}return null;}
    bind(){
      const canvas=this.canvas;
      canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('dblclick',e=>{const id=this.hit(e);if(id&&this.toggleMirrorLED(id)){e.preventDefault();this.store.select(id);}});let lastTap={id:null,time:0};canvas.addEventListener('pointerup',e=>{if(e.pointerType!=='touch'||this.drag?.moved||this.multiTouch)return;const id=this.hit(e),now=performance.now();if(id&&id===lastTap.id&&now-lastTap.time<360){this.toggleMirrorLED(id);lastTap={id:null,time:0};}else lastTap={id,time:now};});
      canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();if(!this.pointers.size)this.multiTouch=false;canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(this.pointers.size===2){this.multiTouch=true;this.drag=null;this.pinch=this.pinchDistance();return;}
        const id=this.hit(e);this.store.select(id || null);const item=this.store.selected;
        if(e.pointerType==='touch'&&!id){const sx=e.clientX,sy=e.clientY;clearTimeout(this.ambienceTimer);this.ambienceTimer=setTimeout(()=>{if(!this.pointers.has(e.pointerId)||!this.drag||this.drag.moved)return;const hits=this.point({clientX:sx,clientY:sy}).intersectObjects([this.floor,this.wall]);const surface=hits[0]?.object===this.floor?'floor':hits[0]?.object===this.wall?'wall':null;if(surface){this.cancel();this.onAmbienceLongPress?.(surface,sx,sy);}},650);}
const hitPoint=new T.Vector3();this.dragPlane.constant=-(id?item.position.z/100:0);this.point(e).ray.intersectPlane(this.dragPlane,hitPoint);this.drag={id,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,origin:id?{...item.position}:null,point:hitPoint,moved:false};
      });
      canvas.addEventListener('pointermove',e=>{if(!this.pointers.has(e.pointerId)){if(e.pointerType==='mouse')canvas.style.cursor=this.hit(e)?'move':'grab';return;}if(e.pointerType==='mouse'&&!(e.buttons&1)){this.cancel();return;}this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(this.pointers.size>=2){const n=this.pinchDistance();if(this.pinch&&n)this.distance=Math.max(.7,Math.min(30,this.distance*this.pinch/n));this.pinch=n;return;}
        const drag=this.drag;if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>8){drag.moved=true;clearTimeout(this.ambienceTimer);}
        if(drag.id&&drag.moved){const p=new T.Vector3();if(this.point(e).ray.intersectPlane(this.dragPlane,p)){const x=drag.origin.x+(p.x-drag.point.x)*100,y=drag.origin.y+(p.y-drag.point.y)*100;if(!this.store.move(drag.id,x,y)){canvas.style.cursor='not-allowed';this.blocked=true;}else{canvas.style.cursor='grabbing';this.blocked=false;}}}
        else if(!drag.id){this.yaw=Math.max(-1.2,Math.min(1.2,this.yaw+dx*.007*(this.reverse?-1:1)));this.pitch=Math.max(-.2,Math.min(.65,this.pitch+dy*.004));}
        drag.x=e.clientX;drag.y=e.clientY;
      });
      const end=e=>{clearTimeout(this.ambienceTimer);this.pointers.delete(e.pointerId);if(this.blocked){this.onNotice('Déplacement limité : un élément ou la limite de la scène bloque cette position.');this.blocked=false;}this.drag=null;this.pinch=null;canvas.style.cursor='grab';if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
      canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',e=>{this.pointers.delete(e.pointerId);this.drag=null;this.pinch=null;});
      canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=Math.max(.7,Math.min(30,this.distance*Math.exp(e.deltaY*.001)));},{passive:false});
      canvas.addEventListener('keydown',e=>{const item=this.store.selected;if(!item)return;const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];if(steps){e.preventDefault();this.store.move(item.id,item.position.x+steps[0]*(e.shiftKey?10:1),item.position.y+steps[1]*(e.shiftKey?10:1));}});
      window.addEventListener('blur',()=>this.cancel());
    }
    pinchDistance(){const a=[...this.pointers.values()];return a.length>1?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0;}
    cancel(){clearTimeout(this.ambienceTimer);this.pointers.clear();this.drag=null;this.pinch=null;}
    animate(time){const dt=Math.min(.05,(time-this.lastTime)/1000);this.lastTime=time;this.mirrorRenderer.tick(dt);for(const root of this.roots.values()){const u=root.userData,target=u.open?1:0;u.progress+=(target-u.progress)*(1-Math.exp(-dt*8));if(Math.abs(u.progress-target)<.001)u.progress=target;const smooth=u.progress*u.progress*(3-2*u.progress);u.drawers.forEach((g,index)=>{g.position.z=smooth*(index===0?.19:.27);});u.doors.forEach(hinge=>hinge.rotation.y=(hinge.userData.openDirection||-1)*Math.PI/2*smooth);}

      this.camera.position.set(this.target.x+Math.sin(this.yaw)*this.distance,this.target.y+Math.sin(this.pitch)*this.distance,this.target.z+Math.cos(this.yaw)*Math.cos(this.pitch)*this.distance);this.camera.lookAt(this.target);this.renderer.render(this.scene,this.camera);requestAnimationFrame(this.animate);}
    inspect(){return {mirrors:this.mirrorRenderer.diagnostics(),pixelRatio:this.renderer.getPixelRatio(),renderer:this.renderer.info.render,objects:[...this.roots].map(([id,root])=>({id,position:root.position.toArray(),drawers:root.userData.drawers.map(g=>g.position.z),doors:root.userData.doors.map(g=>g.rotation.y),shelves:root.children.filter(o=>o.name.startsWith('shelf-')).length,scale:root.scale.toArray(),screen:(()=>{const item=this.store.project.items.find(i=>i.id===id),d=M.dimensions(item),p=root.position.clone().add(new T.Vector3(0,d.height/200,d.depth/200+.025)).project(this.camera),r=this.canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};})(),bounds:new T.Box3().setFromObject(root).getSize(new T.Vector3()).toArray()})),camera:{yaw:this.yaw,pitch:this.pitch,distance:this.distance}};}
  }
  window.StudioOneScene=SceneView;
})();
