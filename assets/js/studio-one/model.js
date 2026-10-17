/* Canonical, serializable STUDIO ONE state. Units: cm. No Three.js or DOM. */
(function () {
  'use strict';
  const C = window.StudioOneCatalog;
  const copy = value => JSON.parse(JSON.stringify(value));
  const uid = () => window.crypto?.randomUUID?.() || 'studio-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const limits = { left: -400, right: 400, floor: 0, ceiling: 300, gap: 0 };
  function dimensions(item) {
    if (item.kind === 'cabinet') return { width: item.width, height: C.models[item.model].height, depth: 46 };
    if (item.kind === 'column') return { width: 38, height: 132, depth: 27 };
    if(item.mirror==='Basic'&&item.mirrorSize==='60 × 80 cm'&&item.mirrorRotated)return {width:80,height:60,depth:3};
    const v = (item.mirrorSize.match(/\d+/g) || []).map(Number);
    return { width: v[0], height: v[1] || v[0], depth: 3 };
  }
  function bounds(item) {
    const d = dimensions(item), p = item.position;
    const top = item.kind === 'cabinet' ? (item.option === 'basin' ? 2.7 : item.option === 'top' ? 1.9 + (item.sink ? C.vessels[item.sink.model].height : 0) : 0) : 0;
    return { left: p.x - d.width / 2, right: p.x + d.width / 2, bottom: p.y, top: p.y + d.height + top, back: p.z - d.depth / 2, front: p.z + d.depth / 2 };
  }
  function overlaps(a, b, gap = limits.gap) {
    const x = bounds(a), y = bounds(b);
    return x.left < y.right + gap - .001 && x.right > y.left - gap + .001 && x.bottom < y.top + gap - .001 && x.top > y.bottom - gap + .001 && x.back < y.front - .001 && x.front > y.back + .001;
  }
  function inside(item) {
    const b = bounds(item);
    return b.left >= limits.left && b.right <= limits.right && b.bottom >= 0 && b.top <= limits.ceiling;
  }
  // Furniture is constrained by the configured bathroom rather than the old ±4m staging area.
  // All room dimensions are centimetres; the rear wall is located at Z = -24.5 cm.
  function roomInside(item,room){
    if(!room)return true;
    const b=bounds(item),back=-24.5;
    return b.left>=-room.width/2+0.5 && b.right<=room.width/2-0.5 &&
      b.bottom>=0 && b.top<=room.height+0.2 &&
      b.back>=back-0.3 && b.front<=back+room.depth-0.5;
  }
  function roomPlace(item,items,room){
    const d=dimensions(item), min=-room.width/2+d.width/2+0.5,max=room.width/2-d.width/2-0.5;
    if(min>max||bounds(item).back<-24.8||bounds(item).front>room.depth-25||bounds(item).top>room.height+0.2)return null;
    const clip=x=>Math.round(Math.min(max,Math.max(min,x))*10)/10;
    const candidates=[clip(item.position.x),min,max,0,...items.flatMap(other=>{const b=bounds(other);return [b.right+d.width/2+0.1,b.left-d.width/2-0.1]})];
    candidates.sort((a,b)=>Math.abs(a-item.position.x)-Math.abs(b-item.position.x));
    for(const x of candidates){const candidate={...item,position:{...item.position,x:clip(x)}};if(roomInside(candidate,room)&&canPlace(candidate,items))return candidate;}
    return null;
  }
  function arrangeRoom(items,room){
    const sorted=[...items].sort((a,b)=>a.position.x-b.position.x),placed=[];
    for(const item of sorted){const p=roomPlace(item,placed,room);if(!p)return null;placed.push(p);}
    const byId=new Map(placed.map(p=>[p.id,p]));return items.map(i=>byId.get(i.id));
  }
  function canPlace(item, items) { return inside(item) && !items.some(other => other.id !== item.id && overlaps(item, other)); }
  function place(item, items, preferredX, room) {
    const d = dimensions(item), xs = [preferredX ?? item.position.x];
    const sorted = [...items].sort((a,b) => a.position.x - b.position.x);
    sorted.forEach(other => { const b = bounds(other); xs.push(b.right + limits.gap + d.width / 2, b.left - limits.gap - d.width / 2); });
    for (const x of xs) { const candidate = { ...item, position: { ...item.position, x } }; if (canPlace(candidate, items)&&roomInside(candidate,room)) return candidate; }
    if(room)return roomPlace(item,items,room);
    return null;
  }
  function compatible(item, notices = []) {
    if (item.kind !== 'cabinet') return item;
    if (item.option === 'bare') item.sink = null;
    if (item.option === 'basin' && ![60,70,80,90,100,120].includes(item.width)) {
      item.sink = null; item.option = 'bare';
      notices.push('Vasque encastrée retirée : aucun format fabricant en ' + item.width + ' cm. Choisissez un plateau sur mesure, avec ou sans vasque à poser.');
    }
    if (!item.sink) { if (item.option === 'basin') item.option = 'bare'; return item; }
    const s = item.sink;
    if (item.option === 'basin') {
      if (!C.insetColors.some(c=>c.code===s.color) || !C.inset[s.model]?.[s.color]) { item.sink = null; item.option = 'bare'; notices.push('Vasque retirée : modèle ou couleur non compatible.'); return item; }
      if (s.layout === 'double' && item.width !== 120) {
        item.sink = null; item.option = 'bare'; notices.push('Double vasque retirée : disponible uniquement sur 120 cm.'); return item;
      }
      s.width = item.width; s.depth = 46; s.height = s.model === 'Sella' ? 16 : 15;
    } else if (item.option === 'top') {
      const v = C.vessels[s.model];
      if (!v || item.width < v.minWidth || !C.vesselColors.some(c => c.code === s.color)) {
        item.sink = null; notices.push('Vasque à poser retirée : dimensions ou couleur non compatibles avec ce meuble.'); return item;
      }
      Object.assign(s, { width: v.width, depth: v.depth, height: v.height, layout: 'single' });
    }
    return item;
  }
  function make(kind, options = {}) {
    const item = { id: uid(), kind, model: 0, width: 60, finish: 'ROBLE', facade: 'Onglet 45°', option: 'top', sink: null, accessories: [], open: false, doorSide: 'left',
      ledOn:false,mirrorRotated:false,mirror: 'Basic', mirrorSize: '60 × 80 cm', mirrorFinish: 'Noir', position: { x: 0, y: kind === 'mirror' ? 130 : kind === 'column' ? 18 : 28, z: kind === 'column' ? -9.5 : kind === 'mirror' ? -23 : 0 }, ...copy(options) };
    if (kind === 'cabinet' && item.model === 1) item.position.y = 0;
    Object.assign(item,dimensions(item));item.drawers=kind==='cabinet'?C.models[item.model].drawers:0;
    return compatible(item);
  }
  function validate(raw) {
    if (!raw || raw.version !== 2 || !Array.isArray(raw.items) || raw.items.length > 40) throw Error('Projet STUDIO ONE invalide.');
    const ids = new Set();
    const items = raw.items.map(value => {
      const item = copy(value);
      if (!['cabinet','column','mirror'].includes(item.kind) || typeof item.id !== 'string' || !/^[a-zA-Z0-9-]{1,90}$/.test(item.id) || ids.has(item.id)) throw Error('Identifiants de projet invalides.');
      ids.add(item.id);
      if (!C.finishes.some(c => c.code === item.finish) || !Number.isInteger(item.model) || !C.models[item.model]) throw Error('Modèle ou finition invalide.');
      if ((item.kind==='cabinet'&&(!Number.isInteger(item.width)||item.width<40||item.width>120)) || !['top','bare','basin'].includes(item.option)) throw Error('Dimensions ou plateau invalides.');
      if (!item.position || !['x','y','z'].every(k => Number.isFinite(item.position[k])) || Math.abs(item.position.z) > 24) throw Error('Position invalide.');
      if (item.kind === 'mirror' && (!(C.mirrors[item.mirror] || []).some(r => r[0] === item.mirrorSize) || !['Noir','Doré','Bronze','Argent'].includes(item.mirrorFinish))) throw Error('Miroir invalide.');
      if(item.kind==='column' && item.doorSide!==undefined && !['left','right'].includes(item.doorSide)) throw Error('Sens d’ouverture de porte invalide.');
      if(item.kind==='column' && !item.doorSide)item.doorSide='left';
      if(item.ledOn!==undefined&&typeof item.ledOn!=='boolean'||item.mirrorRotated!==undefined&&typeof item.mirrorRotated!=='boolean')throw Error('État du miroir invalide.');
      if(typeof item.open!=='boolean')throw Error('État d’ouverture invalide.');
      item.facade='Onglet 45°';
      if (item.sink && (!['Sella','Tampa','Neris','Torne'].includes(item.sink.model) || !['single','double'].includes(item.sink.layout))) throw Error('Vasque invalide.');
      Object.assign(item,dimensions(item));item.drawers=item.kind==='cabinet'?C.models[item.model].drawers:0;
      compatible(item);
      if (!inside(item)) throw Error('Un élément dépasse les limites de la scène.');
      return item;
    });
    if (items.some((a,i) => items.slice(i+1).some(b => overlaps(a,b)))) throw Error('Le projet contient des éléments superposés.');
    return { version: 2, items };
  }
  function lines(item) {
    const d = dimensions(item), finish = C.finishes.find(c => c.code === item.finish).name;
    let name, ref, unit, basis;
    if (item.kind === 'cabinet') {
      const m = C.models[item.model], bucket = C.sizes.find(s => item.width >= s.lo && item.width <= s.hi);
      name = 'STUDIO ONE · ' + m.name; ref = (item.option === 'top' ? m.top : m.base) + ' ' + bucket.ref + '@' + item.finish;
      unit = (item.option === 'top' ? m.avec : m.sans)[C.sizes.indexOf(bucket)]; basis = 'Prix indicatif';
      if (item.width === 40) { ref += ' · à confirmer usine'; }
    } else if (item.kind === 'column') {
      name = C.column.name; ref = C.column.ref + ' ' + item.finish; unit = C.column.price; basis = 'Prix indicatif';
    } else {
      const r = C.mirrors[item.mirror].find(r => r[0] === item.mirrorSize);
      name = item.mirror.startsWith('Miroir') ? item.mirror : 'Miroir ' + item.mirror; ref = C.mirrorRefs[item.mirror]?.[item.mirrorSize]?.[item.mirrorFinish] || r[1]; unit = r[2]; basis = 'Prix indicatif';
    }
    const result = [{ id: item.id, title: name, detail: `L ${d.width} × H ${d.height} × P ${d.depth} cm · ${item.kind === 'mirror' ? item.mirrorFinish : finish}` + (item.kind === 'cabinet' ? ' · ' + ({top:'Plateau assorti',bare:'Meuble seul',basin:'Vasque encastrée'})[item.option] : ''), ref, qty: 1, unit, basis }];
    if (item.kind === 'cabinet' && item.sink) {
      const s = item.sink, color = (item.option === 'basin' ? C.insetColors : C.vesselColors).find(c => c.code === s.color);
      const r = item.option === 'basin' ? C.inset[s.model][s.color][String(item.width) + (s.layout === 'double' ? 'double' : '')] : [226, color[s.model]];
      result.push({ id: item.id, title: 'Vasque ' + s.model + (s.layout === 'double' ? ' double' : ''), detail: color.name + ` · ${s.width} × ${s.depth} cm`, ref: r[1], qty: 1, unit: r[0]/2, basis: 'Prix indicatif' });
    }
    return result;
  }
  function legacy(q) {
    const get = (key, fallback) => q.get(key) || fallback;
    const model = Math.max(0, C.models.findIndex(m => m.name === get('model','2 tiroirs')));
    const initial = make('cabinet',{ model, width: Number(get('width',60)), finish: get('code','ROBLE'), option: 'top' });
    initial.option=get('option','top');
    if (initial.option === 'basin' || initial.option === 'top' && get('vessel','false') === 'true') initial.sink = { model:get('sinkModel',initial.option === 'basin'?'Sella':'Neris'), color:get('sinkColor','gloss'), layout:get('sinkLayout','single') };
    compatible(initial); const items = [initial];
    const add = item => { const p = place(item,items); if (p) items.push(p); };
    for(let i=0;i<Math.min(2,Number(get('extraCabinets',0)));i++) add(make('cabinet',{...initial,id:uid()}));
    if(get('column','false') === 'true') for(let i=0;i<Math.min(3,Number(get('columnQty',1)));i++) add(make('column',{finish:initial.finish}));
    if(C.mirrors[get('mirror','')]) for(let i=0;i<Math.min(3,Number(get('mirrorQty',1)));i++) add(make('mirror',{mirror:get('mirror','Basic'),mirrorSize:get('mirrorSize',C.mirrors[get('mirror','Basic')][0][0]),mirrorFinish:get('mirrorFinish','Noir')}));
    return { version: 2, items };
  }
  class Store {
    constructor(project) { this.room={width:300,depth:300,height:250}; this.project = validate(project); this.selectedId = this.project.items[0]?.id || null; this.listeners = new Set(); this.history = []; this.future=[]; }
    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(notices=[], geometry=true) { this.listeners.forEach(fn => fn(this.snapshot(), { notices, geometry })); }
    snapshot() { return copy(this.project); }
    setRoom(size,expand=false){
      const input=size||{},room={
        width:Math.min(700,Math.max(250,Math.round(Number(input.width||3)*100))),
        depth:Math.min(700,Math.max(250,Math.round(Number(input.depth||3)*100))),
        height:Math.min(350,Math.max(250,Math.round(Number(input.height||2.5)*100)))
      };
      let next=arrangeRoom(this.project.items,room);
      if(!next&&expand){
        for(let w=room.width+1;w<=700&&!next;w++)next=arrangeRoom(this.project.items,{...room,width:w})&&arrangeRoom(this.project.items,{...room,width:w});
        if(next){const left=Math.min(...next.map(i=>bounds(i).left)),right=Math.max(...next.map(i=>bounds(i).right));room.width=Math.min(700,Math.max(room.width,Math.ceil(right-left+2)));}
      }
      if(!next)return false;
      // Keep arrangements on screen and stored whenever the room shrinks or an old project is opened.
      const changed=next.some((it,i)=>it.position.x!==this.project.items[i].position.x);
      this.room=room;
      if(changed)this.commit(next,['Composition repositionnée à l’intérieur des murs.'],false);
      return true;
    }
    fitSavedRoom(){
      if(this.setRoom({width:this.room.width/100,depth:this.room.depth/100,height:this.room.height/100},true))return true;
      return false;
    }
    dragPreview(id,x,y){
      const item=this.project.items.find(i=>i.id===id);
      if(!item)return null;
      const d=dimensions(item),r=this.room;
      return {x:Math.min(r.width/2-d.width/2-0.5,Math.max(-r.width/2+d.width/2+0.5,x)),
        y:Math.min(r.height-d.height,Math.max(0,y))};
    }
    get selected() { return this.project.items.find(i => i.id === this.selectedId); }
    commit(items, notices=[], geometry=true) { this.history.push(this.snapshot()); if(this.history.length>60)this.history.shift();this.future=[];this.project=validate({version:2,items});this.emit(notices,geometry); }
    select(id) { if(id === null || this.project.items.some(i => i.id === id)){if(this.selectedId===id)return;this.selectedId=id;this.emit([],false);} }
    load(project) { const previous=this.project;this.project=validate(project);if(!this.fitSavedRoom()){this.project=previous;throw Error('Composition trop large pour une pièce de 700 cm.');}this.selectedId=this.project.items[0]?.id||null;this.history=[];this.future=[];this.emit(); }
    add(kind, options={}) {
      if(this.project.items.length>=40) return this.emit(['Limite de 40 éléments atteinte.'],false);
      const item=place(make(kind,options),this.project.items,undefined,this.room);
      if(!item) return this.emit(['Aucun emplacement libre dans la pièce. Agrandissez-la ou déplacez un élément.'],false);
      this.selectedId=item.id;this.commit([...this.project.items,item]);return item;
    }
    duplicate(id) { const item=this.project.items.find(i=>i.id===id);if(item)return this.add(item.kind,{...copy(item),id:uid(),open:false,position:{...item.position,x:bounds(item).right+limits.gap+dimensions(item).width/2}}); }
    remove(id) { const items=this.project.items.filter(i=>i.id!==id);if(items.length===this.project.items.length)return;this.selectedId=items[0]?.id||null;this.commit(items); }
    update(id, patch) {
      const items=copy(this.project.items), index=items.findIndex(i=>i.id===id);if(index<0)return false;
      const old=copy(items[index]), notices=[];
      const allowed=['width','model','finish','option','sink','mirror','mirrorSize','mirrorFinish','open','doorSide','ledOn','mirrorRotated'];
      allowed.forEach(k=>{if(Object.prototype.hasOwnProperty.call(patch,k))items[index][k]=copy(patch[k]);});
      const target=compatible(items[index],notices);
      if(!inside(target)||!roomInside(target,this.room)){this.emit(['Ces dimensions dépassent les limites de la scène.'],false);return false;}
      // Preserve the edited item. Push only neighbours reached by the enlarged volume, in their original left/right order.
      const queue=[target];let guard=0;
      while(queue.length && guard++<items.length*items.length){const current=queue.shift();for(const other of items){if(other.id===current.id||other.id===id||!overlaps(current,other))continue;
        const was=this.project.items.find(i=>i.id===other.id), side=was.position.x<old.position.x?-1:1,b=bounds(current),d=dimensions(other);
        other.position.x=side<0?b.left-limits.gap-d.width/2:b.right+limits.gap+d.width/2;
        if(!inside(other)||!roomInside(other,this.room)){this.emit(['Largeur refusée : espace insuffisant pour repositionner les éléments voisins.'],false);return false;}queue.push(other);
      }}
      if(items.some((a,i)=>items.slice(i+1).some(b=>overlaps(a,b)))){this.emit(['Modification refusée : elle provoquerait une superposition.'],false);return false;}
      try{this.commit(items,notices);return true;}catch(e){this.emit([e.message],false);return false;}
    }
    move(id, x, y) {
      const items=copy(this.project.items),item=items.find(i=>i.id===id);if(!item)return false;
      item.position.x=Math.round(x*10)/10;item.position.y=Math.round(y*10)/10;
      // Aimantation bord à bord (2 cm) : meubles et colonnes, sans chevauchement.
      if(item.kind!=='mirror'){
        const d=dimensions(item), snapDistance=2;
        const candidates=items.filter(other=>other.id!==id&&other.kind!=='mirror').flatMap(other=>{
          const b=bounds(other),a=bounds(item);
          if(a.bottom>=b.top||a.top<=b.bottom||a.back>=b.front||a.front<=b.back)return [];
          return [b.right+d.width/2,b.left-d.width/2];
        }).filter(target=>Math.abs(target-item.position.x)<=snapDistance)
          .sort((a,b)=>Math.abs(a-item.position.x)-Math.abs(b-item.position.x));
        for(const target of candidates){
          const original=item.position.x;
          item.position.x=Math.round(target*10)/10;
          if(canPlace(item,items))break;
          item.position.x=original;
        }
      }
      if(!canPlace(item,items)||!roomInside(item,this.room))return false;
      this.commit(items,[],false);return true;
    }
    // Preview may cross the mirror; only the final placement must be collision-free.
    drop(id,x,y){
      if(!Number.isFinite(x)||!Number.isFinite(y))return false;
      if(this.move(id,x,y))return true;
      const item=this.project.items.find(i=>i.id===id);
      if(item?.kind!=='column')return false;
      const candidate=copy(item);candidate.position.x=Math.round(x*10)/10;candidate.position.y=Math.round(y*10)/10;
      const mirrors=this.project.items.filter(other=>other.kind==='mirror'&&overlaps(candidate,other));
      if(!mirrors.length)return false;
      const width=dimensions(item).width;
      const sides=[...new Set(mirrors.flatMap(other=>{const b=bounds(other);return [b.left-width/2-2,b.right+width/2+2]}))]
        .sort((a,b)=>Math.abs(a-x)-Math.abs(b-x));
      for(const next of sides)if(this.move(id,next,y))return true;
      return false;
    }
    finishAll(finish) {if(!C.finishes.some(c=>c.code===finish))return;const items=copy(this.project.items);items.forEach(i=>{if(i.kind!=='mirror')i.finish=finish;});this.commit(items);}
    openAll(open) {const items=copy(this.project.items);items.forEach(i=>{if(i.kind!=='mirror')i.open=open;});this.commit(items,[],false);}
    undo(){if(!this.history.length)return;this.future.push(this.snapshot());this.project=this.history.pop();this.fitSavedRoom();this.selectedId=this.project.items.some(i=>i.id===this.selectedId)?this.selectedId:this.project.items[0]?.id;this.emit();}
    redo(){if(!this.future.length)return;this.history.push(this.snapshot());this.project=this.future.pop();this.fitSavedRoom();this.selectedId=this.project.items[0]?.id;this.emit();}
    quote(){return this.project.items.flatMap(lines);}
    total(){return this.quote().reduce((s,r)=>s+r.unit*r.qty,0);}
  }
  window.StudioOneModel={Store,make,dimensions,bounds,overlaps,canPlace,place,compatible,validate,legacy,lines,limits,roomInside,arrangeRoom};
})();
