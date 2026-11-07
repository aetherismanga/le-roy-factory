import * as T from 'three';

// Dimensions describe the closed furniture assembly, excluding its basin,
// handles, LED halo and currently open drawers/doors. Units stay in metres
// until the final, explicit centimetre labels.
export function furnitureDimensionSpec(item,spec=item?.asset?.spec||{}){
 if(!['cabinet','column'].includes(item?.type))return null;
 const width=Number(spec.width),height=Number(spec.totalHeight??spec.height),depth=Number(spec.depth),base=Number(spec.base??(Number(spec.bottom||0)-Number(spec.legHeight||0)));
 if(![width,height,depth,base].every(Number.isFinite)||Math.min(width,height,depth)<=0)return null;
 return {width,height,depth,base,back:-.23};
}
const centimetres=value=>(Math.round(value*1000)/10).toLocaleString('fr-FR',{maximumFractionDigits:1});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Pure camera projection shared by the DOM overlay and CPU geometry checks.
export function projectFurnitureDimensions(item,camera,width,height,spec=item?.asset?.spec){
 const dimensions=furnitureDimensionSpec(item,spec);
 if(!dimensions||!camera||!item.wrapper||!(width>0&&height>0))return [];
 const {width:w,height:h,depth:d,base,back}=dimensions,front=back+d,matrix=item.wrapper.matrixWorld;
 camera.updateMatrixWorld();item.wrapper.updateWorldMatrix(true,false);
 const point=(x,y,z)=>new T.Vector3(x,y,z).applyMatrix4(matrix);
 const centre=point(0,base+h/2,back+d/2),clipCentre=centre.clone().project(camera);
 if(!Number.isFinite(clipCentre.x)||!Number.isFinite(clipCentre.y)||clipCentre.z< -1||clipCentre.z>1||Math.abs(clipCentre.x)>1.15||Math.abs(clipCentre.y)>1.15)return [];
 function screen(p){
  const view=p.clone().applyMatrix4(camera.matrixWorldInverse);if(view.z>=-camera.near)return null;
  const ndc=p.clone().project(camera);if(![ndc.x,ndc.y,ndc.z].every(Number.isFinite)||ndc.z< -1||ndc.z>1)return null;
  return {x:(ndc.x+1)*width/2,y:(1-ndc.y)*height/2};
 }
 const side=item.type==='column'?1:-1,xSide=side*(w/2+.085),zGuide=front+.025;
 const definitions=[
  {axis:'width',label:'L '+centimetres(w)+' cm',a:point(-w/2,base-.07,zGuide),b:point(w/2,base-.07,zGuide),originA:point(-w/2,base,front),originB:point(w/2,base,front),offset:[0,15]},
  {axis:'height',label:'H '+centimetres(h)+' cm',a:point(xSide,base,zGuide),b:point(xSide,base+h,zGuide),originA:point(side*w/2,base,front),originB:point(side*w/2,base+h,front),offset:[side*19,0]},
  {axis:'depth',label:'P '+centimetres(d)+' cm',a:point(w/2+.07,base+.035,back),b:point(w/2+.07,base+.035,front),originA:point(w/2,base+.035,back),originB:point(w/2,base+.035,front),offset:[20,-10]}
 ];
 const marginX=Math.min(34,width/4),marginY=Math.min(16,height/4),result=[];
 for(const definition of definitions){
  const a=screen(definition.a),b=screen(definition.b),originA=screen(definition.originA),originB=screen(definition.originB);if(!a||!b||!originA||!originB)continue;
  const length=Math.hypot(b.x-a.x,b.y-a.y);if(length<1)continue;
  const ux=(b.x-a.x)/length,uy=(b.y-a.y)/length,nx=-uy*4,ny=ux*4;
  result.push({axis:definition.axis,label:definition.label,line:[a,b],extensions:[[originA,a],[originB,b]],ticks:[[{x:a.x-nx,y:a.y-ny},{x:a.x+nx,y:a.y+ny}],[{x:b.x-nx,y:b.y-ny},{x:b.x+nx,y:b.y+ny}]],text:{x:clamp((a.x+b.x)/2+definition.offset[0],marginX,width-marginX),y:clamp((a.y+b.y)/2+definition.offset[1],marginY,height-marginY)}});
 }
 return result;
}

// This screen overlay remains above both the raster and progressive images.
// No guide object, font texture or label enters the ray-traced scene.
export function createPresentationDimensions({host,camera,getItems,getSpecification=item=>item.asset.spec,document=host.ownerDocument||globalThis.document}){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),nodes=new Map();let visible=true,disposed=false;
 svg.setAttribute('class','randal-dimensions-overlay');svg.setAttribute('role','img');svg.setAttribute('aria-label','Cotes du mobilier');
 Object.assign(svg.style,{position:'absolute',inset:'0',width:'100%',height:'100%',overflow:'hidden',pointerEvents:'none',zIndex:'2'});host.append(svg);
 const make=(tag,attributes={})=>{const node=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));return node;};
 function makeAxis(){
  const group=make('g'),lines=Array.from({length:5},()=>make('line',{stroke:'#405044','stroke-width':1,'vector-effect':'non-scaling-stroke'})),text=make('text',{'text-anchor':'middle','dominant-baseline':'central',fill:'#28392e',stroke:'#fffef7','stroke-width':4,'paint-order':'stroke','stroke-linejoin':'round','font-family':'system-ui,Arial,sans-serif','font-weight':600});
  group.append(...lines,text);svg.append(group);return {group,lines,text};
 }
 function refresh(){
  if(disposed)return;svg.style.display=visible?'block':'none';if(!visible)return;
  const width=host.clientWidth,height=host.clientHeight;if(!(width>0&&height>0)){svg.style.display='none';return;}
  svg.setAttribute('viewBox','0 0 '+width+' '+height);const used=new Set(),descriptions=[];
  for(const [index,item]of (getItems()||[]).entries()){
   const spec=getSpecification(item),dimensions=furnitureDimensionSpec(item,spec);if(!dimensions)continue;
   const projected=projectFurnitureDimensions(item,camera,width,height,spec);if(!projected.length)continue;
   descriptions.push((item.type==='column'?'Colonne':'Meuble')+' '+(index+1)+' : largeur '+centimetres(dimensions.width)+' cm, hauteur '+centimetres(dimensions.height)+' cm, profondeur '+centimetres(dimensions.depth)+' cm');
   for(const axis of projected){
    const key=item.id+':'+axis.axis;used.add(key);if(!nodes.has(key))nodes.set(key,makeAxis());const entry=nodes.get(key),segments=[axis.line,...axis.extensions,...axis.ticks];
    for(let i=0;i<segments.length;i++){const [a,b]=segments[i],line=entry.lines[i];line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);line.setAttribute('x2',b.x);line.setAttribute('y2',b.y);}
    entry.text.textContent=axis.label;entry.text.setAttribute('x',axis.text.x);entry.text.setAttribute('y',axis.text.y);entry.text.setAttribute('font-size',width<600?11:12);
   }
  }
  for(const [key,entry]of nodes)if(!used.has(key)){entry.group.remove();nodes.delete(key);}
  svg.setAttribute('aria-label',descriptions.length?'Cotes du mobilier. '+descriptions.join('. '):'Cotes du mobilier');
 }
 return {element:svg,refresh,isVisible:()=>visible&&!disposed,setVisible(value){visible=!!value;refresh();},dispose(){if(disposed)return;disposed=true;nodes.clear();svg.remove();}};
}
