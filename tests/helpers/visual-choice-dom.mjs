// Small DOM fixture for behavioural tests of the real surface and zone editors.
// Images remain URLs: these tests exercise selection, persistence and identity.
const camel=value=>value.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
const decode=value=>String(value).replace(/&(?:amp|lt|gt|quot|#39);/g,entity=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[entity]));
export const descendants=element=>[element,...(element.children||[]).flatMap(descendants)];
export const isVisible=element=>!!element&&!element.hidden&&(!element.parentElement||isVisible(element.parentElement));

function matches(element,selector){
 if(element.nodeType!==1)return false;
 selector=selector.trim();
 const attributes=[...selector.matchAll(/\[([^\]=]+)(?:=["']?([^\]"']*)["']?)?\]/g)];
 selector=selector.replace(/\[[^\]]+\]/g,'');
 const id=selector.match(/#([\w-]+)/)?.[1],classes=[...selector.matchAll(/\.([\w-]+)/g)].map(match=>match[1]),tag=selector.match(/^[\w-]+/)?.[0];
 return (!id||element.id===id)&&(!tag||element.tagName===tag.toUpperCase())&&classes.every(name=>element.classList.contains(name))&&attributes.every(([,name,value])=>{const actual=element.getAttribute(name);return value===undefined?actual!==null:actual===value;});
}

class TestElement {
 constructor(tag,document){
  this.nodeType=1;this.tag=tag;this.tagName=tag.toUpperCase();this.ownerDocument=document;this.children=[];this.parentElement=null;this.attrs={};this.dataset={};this.listeners=new Map();this.className='';this._text='';this._html='';this.value='';this.hidden=false;this.disabled=false;this.scrollTop=0;
  this.style={setProperty:(key,value)=>{this.style[key]=String(value);},removeProperty:key=>{delete this.style[key];}};
  this.classList={contains:name=>this.className.split(/\s+/).includes(name),add:(...names)=>{this.className=[...new Set([...this.className.split(/\s+/),...names])].filter(Boolean).join(' ');},remove:(...names)=>{this.className=this.className.split(/\s+/).filter(name=>!names.includes(name)).join(' ');},toggle:(name,force)=>{const enabled=force??!this.classList.contains(name);this.classList[enabled?'add':'remove'](name);return enabled;}};
 }
 get parentNode(){return this.parentElement;}get childNodes(){return this.children;}get firstChild(){return this.children[0]||null;}get nextSibling(){const siblings=this.parentElement?.children||[];return siblings[siblings.indexOf(this)+1]||null;}get options(){return this.children.filter(child=>child.tagName==='OPTION');}get isConnected(){return this.ownerDocument?.body?.contains(this)||this.ownerDocument?.head?.contains(this);}
 get textContent(){return this._text+this.children.map(child=>child.textContent||'').join('');}set textContent(value){this._text=String(value??'');this.replaceChildren();}
 get innerHTML(){return this._html;}set innerHTML(value){
  this.replaceChildren();this._text='';this._html=String(value);const stack=[this];
  for(const token of this._html.match(/<\/?[^>]+>|[^<]+/g)||[]){
   if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}
   if(token.startsWith('<')){const tag=token.match(/^<([\w:-]+)/)?.[1];if(!tag)continue;const element=this.ownerDocument.createElement(tag);for(const [,name,,double,single,plain]of token.matchAll(/([\w:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g)){if(name===tag)continue;element.setAttribute(name,decode(double??single??plain??''));}stack.at(-1).append(element);if(!/\/>$/.test(token)&&!['img','input','br','hr','source','meta','link'].includes(tag))stack.push(element);}
   else stack.at(-1).append(this.ownerDocument.createTextNode(decode(token)));
  }
 }
 append(...nodes){for(let node of nodes){if(typeof node==='string')node=this.ownerDocument.createTextNode(node);node.parentElement?.removeChild(node);node.parentElement=this;this.children.push(node);}this.ownerDocument?.notifyMutation?.();}
 appendChild(node){this.append(node);return node;}prepend(...nodes){for(const node of [...nodes].reverse()){node.parentElement?.removeChild(node);node.parentElement=this;this.children.unshift(node);}}
 removeChild(node){this.children=this.children.filter(child=>child!==node);node.parentElement=null;this.ownerDocument?.notifyMutation?.();return node;}replaceChildren(...nodes){for(const node of this.children)node.parentElement=null;this.children=[];this.append(...nodes);}
 insertBefore(node,reference){if(!reference)return this.append(node);node.parentElement?.removeChild(node);node.parentElement=this;this.children.splice(this.children.indexOf(reference),0,node);return node;}
 before(...nodes){for(const node of nodes)this.parentElement?.insertBefore(node,this);}after(...nodes){const reference=this.nextSibling;for(const node of nodes)this.parentElement?.insertBefore(node,reference);}remove(){this.parentElement?.removeChild(this);}contains(node){return descendants(this).includes(node);}
 setAttribute(name,value){value=String(value);this.attrs[name]=value;if(name==='id')this.id=value;else if(name==='class')this.className=value;else if(name.startsWith('data-'))this.dataset[camel(name.slice(5))]=value;else if(name==='hidden')this.hidden=true;else if(name==='disabled')this.disabled=true;else if(name==='open'){this.open=true;this.ownerDocument?.notifyMutation?.();}else if(['src','alt','type','role','value','name'].includes(name))this[name]=value;}
 getAttribute(name){if(name==='id')return this.id||null;if(name==='class')return this.className||null;if(name.startsWith('data-'))return this.dataset[camel(name.slice(5))]??null;if(name==='hidden')return this.hidden?'':null;if(name==='disabled')return this.disabled?'':null;if(name==='open')return this.open?'':null;return this.attrs[name]??null;}removeAttribute(name){delete this.attrs[name];if(name==='hidden')this.hidden=false;else if(name==='disabled')this.disabled=false;else if(name==='open'){this.open=false;this.ownerDocument?.notifyMutation?.();}else if(name.startsWith('data-'))delete this.dataset[camel(name.slice(5))];else if(name==='src')this.src='';}toggleAttribute(name,force){const enabled=force??this.getAttribute(name)===null;enabled?this.setAttribute(name,''):this.removeAttribute(name);return enabled;}
 querySelectorAll(selector){const parts=selector.split(',').map(value=>value.trim());return descendants(this).slice(1).filter(element=>parts.some(part=>matches(element,part)));}querySelector(selector){return this.querySelectorAll(selector)[0]||null;}closest(selector){for(let element=this;element;element=element.parentElement)if(matches(element,selector))return element;return null;}
 addEventListener(type,fn){const handlers=this.listeners.get(type)||[];handlers.push(fn);this.listeners.set(type,handlers);}removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(handler=>handler!==fn));}
 dispatchEvent(event){
  if(!event.target)Object.defineProperty(event,'target',{value:this,configurable:true});
  if(!event.preventDefault)event.preventDefault=()=>{event.defaultPrevented=true;};if(!event.stopPropagation)event.stopPropagation=()=>{event.cancelBubble=true;};
  for(let current=this;current;current=event.bubbles&&!event.cancelBubble?current.parentElement:null){Object.defineProperty(event,'currentTarget',{value:current,configurable:true});for(const handler of current.listeners?.get(event.type)||[])handler(event);current['on'+event.type]?.(event);}
  return !event.defaultPrevented;
 }
 click(){if(!this.disabled)this.dispatchEvent({type:'click',bubbles:true});}focus(){const prior=this.ownerDocument.activeElement;if(prior===this)return;prior?.dispatchEvent({type:'focusout',bubbles:true,relatedTarget:this});this.ownerDocument.activeElement=this;this.dispatchEvent({type:'focus'});this.dispatchEvent({type:'focusin',bubbles:true,relatedTarget:prior});}blur(){this.ownerDocument.activeElement=null;this.dispatchEvent({type:'blur'});this.dispatchEvent({type:'focusout',bubbles:true});}scrollIntoView(){}getBoundingClientRect(){return this.rect||{left:0,top:0,right:1000,bottom:700,width:1000,height:700};}setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=null;}
 showModal(){this.setAttribute('open','');}close(){this.removeAttribute('open');this.dispatchEvent({type:'close'});}
}

export function installVisualDOM(){
 const previous=Object.fromEntries(['document','Option','matchMedia','window','CustomEvent'].map(key=>[key,globalThis[key]]));
 const document={activeElement:null,listeners:new Map(),createElement(tag){return new TestElement(tag,this);},createTextNode(text){return {nodeType:3,textContent:String(text),children:[],parentElement:null};},addEventListener:TestElement.prototype.addEventListener,removeEventListener:TestElement.prototype.removeEventListener,dispatchEvent:TestElement.prototype.dispatchEvent};
 document.head=document.createElement('head');document.body=document.createElement('body');document.documentElement=document.createElement('html');document.documentElement.append(document.head,document.body);document.documentElement.parentElement=document;document.children=[document.documentElement];document.querySelectorAll=selector=>document.documentElement.querySelectorAll(selector);document.querySelector=selector=>document.querySelectorAll(selector)[0]||null;document.getElementById=id=>document.querySelector('#'+id);
 const observers=new Set();document.notifyMutation=()=>{for(const observer of observers){if(observer.queued)continue;observer.queued=true;queueMicrotask(()=>{observer.queued=false;if(observers.has(observer))observer.callback([]);});}};
 const Event=class {constructor(type,options={}){this.type=type;Object.assign(this,options);}preventDefault(){this.defaultPrevented=true;}stopPropagation(){this.cancelBubble=true;}};
 const MutationObserver=class {constructor(callback){this.callback=callback;}observe(){observers.add(this);}disconnect(){observers.delete(this);}};
 const window={innerWidth:1000,innerHeight:700,listeners:new Map(),addEventListener:TestElement.prototype.addEventListener,removeEventListener:TestElement.prototype.removeEventListener,matchMedia:()=>({matches:true}),Event,MutationObserver};document.defaultView=window;
 globalThis.document=document;globalThis.window=window;globalThis.matchMedia=()=>({matches:true});globalThis.Option=function(text,value){const option=document.createElement('option');option.textContent=text;option.value=value;return option;};globalThis.CustomEvent=class {constructor(type,options={}){this.type=type;Object.assign(this,options);}};
 return {document,element:tag=>document.createElement(tag),restore(){for(const [key,value]of Object.entries(previous))value===undefined?delete globalThis[key]:globalThis[key]=value;}};
}

export function fire(element,type,extra={}){element.dispatchEvent({type,bubbles:false,...extra});}
export const createVisualChoiceDOM=installVisualDOM;
