/* Canonical, serializable STUDIO ONE state. Units: cm. No Three.js or DOM. */
(function () {
  'use strict';
  const C = window.StudioOneCatalog;
  const copy = value => JSON.parse(JSON.stringify(value));
  const uid = () => window.crypto?.randomUUID?.() || 'studio-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const limits = { left: -400, right: 400, floor: 0, ceiling: 300, gap: 3 };
  function dimensions(item) {
    if (item.kind === 'cabinet') return { width: item.width, height: C.models[item.model].height, depth: 46 };
    if (item.kind === 'column') return { width: 38, height: 132, depth: 27 };
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
  function canPlace(item, items) { return inside(item) && !items.some(other => other.id !== item.id && overlaps(item, other)); }
  function place(item, items, preferredX) {
    const d = dimensions(item), xs = [preferredX ?? item.position.x];
    const sorted = [...items].sort((a,b) => a.position.x - b.position.x);
    sorted.forEach(other => { const b = bounds(other); xs.push(b.right + limits.gap + d.width / 2, b.left - limits.gap - d.width / 2); });
    for (const x of xs) { const candidate = { ...item, position: { ...item.position, x } }; if (canPlace(candidate, items)) return candidate; }
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
    const item = { id: uid(), kind, model: 0, width: 60, finish: 'ROBLE', facade: 'Onglet 45°', option: 'top', sink: null, accessories: [], open: false,
      mirror: 'Basic', mirrorSize: '60 × 80 cm', mirrorFinish: 'Noir', position: { x: 0, y: kind === 'mirror' ? 130 : kind === 'column' ? 18 : 28, z: kind === 'column' ? -9.5 : kind === 'mirror' ? -23 : 0 }, ...copy(options) };
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
      unit = (item.option === 'top' ? m.avec : m.sans)[C.sizes.indexOf(bucket)]; basis = 'C1 meuble';
      if (item.width === 40) { ref += ' · à confirmer usine'; }
    } else if (item.kind === 'column') {
      name = C.column.name; ref = C.column.ref + ' ' + item.finish; unit = C.column.price; basis = 'C1 colonne';
    } else {
      const r = C.mirrors[item.mirror].find(r => r[0] === item.mirrorSize);
      name = item.mirror.startsWith('Miroir') ? item.mirror : 'Miroir ' + item.mirror; ref = C.mirrorRefs[item.mirror]?.[item.mirrorSize]?.[item.mirrorFinish] || r[1]; unit = r[2]; basis = 'Public HT indicatif · remise à confirmer';
    }
    const result = [{ id: item.id, title: name, detail: `L ${d.width} × H ${d.height} × P ${d.depth} cm · ${item.kind === 'mirror' ? item.mirrorFinish : finish}` + (item.kind === 'cabinet' ? ' · ' + ({top:'Plateau assorti',bare:'Meuble seul',basin:'Vasque encastrée'})[item.option] : ''), ref, qty: 1, unit, basis }];
    if (item.kind === 'cabinet' && item.sink) {
      const s = item.sink, color = (item.option === 'basin' ? C.insetColors : C.vesselColors).find(c => c.code === s.color);
      const r = item.option === 'basin' ? C.inset[s.model][s.color][String(item.width) + (s.layout === 'double' ? 'double' : '')] : [226, color[s.model]];
      result.push({ id: item.id, title: 'Vasque ' + s.model + (s.layout === 'double' ? ' double' : ''), detail: color.name + ` · ${s.width} × ${s.depth} cm`, ref: r[1], qty: 1, unit: r[0]/2, basis: 'PRO HT · -50 % public HT' });
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
    constructor(project) { this.project = validate(project); this.selectedId = this.project.items[0]?.id || null; this.listeners = new Set(); this.history = []; this.future=[]; }
    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(notices=[], geometry=true) { this.listeners.forEach(fn => fn(this.snapshot(), { notices, geometry })); }
    snapshot() { return copy(this.project); }
    get selected() { return this.project.items.find(i => i.id === this.selectedId); }
    commit(items, notices=[], geometry=true) { this.history.push(this.snapshot()); if(this.history.length>60)this.history.shift();this.future=[];this.project=validate({version:2,items});this.emit(notices,geometry); }
    select(id) { if(id === null || this.project.items.some(i => i.id === id)){if(this.selectedId===id)return;this.selectedId=id;this.emit([],false);} }
    load(project) { this.project=validate(project);this.selectedId=this.project.items[0]?.id||null;this.history=[];this.future=[];this.emit(); }
    add(kind, options={}) {
      if(this.project.items.length>=40) return this.emit(['Limite de 40 éléments atteinte.'],false);
      const item=place(make(kind,options),this.project.items);
      if(!item) return this.emit(['Aucun emplacement disponible dans les 8 mètres de scène. Déplacez ou supprimez un élément.'],false);
      this.selectedId=item.id;this.commit([...this.project.items,item]);return item;
    }
    duplicate(id) { const item=this.project.items.find(i=>i.id===id);if(item)return this.add(item.kind,{...copy(item),id:uid(),open:false,position:{...item.position,x:bounds(item).right+limits.gap+dimensions(item).width/2}}); }
    remove(id) { const items=this.project.items.filter(i=>i.id!==id);if(items.length===this.project.items.length)return;this.selectedId=items[0]?.id||null;this.commit(items); }
    update(id, patch) {
      const items=copy(this.project.items), index=items.findIndex(i=>i.id===id);if(index<0)return false;
      const old=copy(items[index]), notices=[];
      const allowed=['width','model','finish','option','sink','mirror','mirrorSize','mirrorFinish','open'];
      allowed.forEach(k=>{if(Object.prototype.hasOwnProperty.call(patch,k))items[index][k]=copy(patch[k]);});
      const target=compatible(items[index],notices);
      if(!inside(target)){this.emit(['Ces dimensions dépassent les limites de la scène.'],false);return false;}
      // Preserve the edited item. Push only neighbours reached by the enlarged volume, in their original left/right order.
      const queue=[target];let guard=0;
      while(queue.length && guard++<items.length*items.length){const current=queue.shift();for(const other of items){if(other.id===current.id||other.id===id||!overlaps(current,other))continue;
        const was=this.project.items.find(i=>i.id===other.id), side=was.position.x<old.position.x?-1:1,b=bounds(current),d=dimensions(other);
        other.position.x=side<0?b.left-limits.gap-d.width/2:b.right+limits.gap+d.width/2;
        if(!inside(other)){this.emit(['Largeur refusée : espace insuffisant pour repositionner les éléments voisins.'],false);return false;}queue.push(other);
      }}
      if(items.some((a,i)=>items.slice(i+1).some(b=>overlaps(a,b)))){this.emit(['Modification refusée : elle provoquerait une superposition.'],false);return false;}
      try{this.commit(items,notices);return true;}catch(e){this.emit([e.message],false);return false;}
    }
    move(id, x, y) {
      const items=copy(this.project.items),item=items.find(i=>i.id===id);if(!item)return false;
      item.position.x=Math.round(x*10)/10;item.position.y=Math.round(y*10)/10;
      if(!canPlace(item,items))return false;
      this.commit(items,[],false);return true;
    }
    finishAll(finish) {if(!C.finishes.some(c=>c.code===finish))return;const items=copy(this.project.items);items.forEach(i=>{if(i.kind!=='mirror')i.finish=finish;});this.commit(items);}
    openAll(open) {const items=copy(this.project.items);items.forEach(i=>{if(i.kind!=='mirror')i.open=open;});this.commit(items,[],false);}
    undo(){if(!this.history.length)return;this.future.push(this.snapshot());this.project=this.history.pop();this.selectedId=this.project.items.some(i=>i.id===this.selectedId)?this.selectedId:this.project.items[0]?.id;this.emit();}
    redo(){if(!this.future.length)return;this.history.push(this.snapshot());this.project=this.future.pop();this.selectedId=this.project.items[0]?.id;this.emit();}
    quote(){return this.project.items.flatMap(lines);}
    total(){return this.quote().reduce((s,r)=>s+r.unit*r.qty,0);}
  }
  window.StudioOneModel={Store,make,dimensions,bounds,overlaps,canPlace,place,compatible,validate,legacy,lines,limits};
})();
