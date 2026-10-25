// Authentication and quotation share one request coordinator. Changing a room
// or opening a drawer must never cancel an authentication already in progress.
export function createIdentityState({getProject,getKey,request,changed=()=>{},settled=()=>{},delay=280}){
 let state={client:null,proHT:null,proRows:[],known:false,pending:false},generation=0,knownKey='',timer,queryFlight=null,authFlight=null,authStamp='',requote=false;
 const current=()=>{const project=getProject();return {project,key:getKey(project)};};
 function publish(next,done=false){state=next;changed(state);if(done)settled(state);return state;}
 function failed(error){return publish({...state,...([401,403].includes(error.status)?{client:null,isAdmin:false}:{}),proHT:null,proRows:[],privateCode:state.client?.codeClient||'',referenceAllowed:false,pending:false,known:true,error:error.message},true);}
 function apply(data,key){const same=current().key===key;knownKey=key;return publish({...data,...(!same?{proHT:null,proRows:[],privateCode:data.client?.codeClient||'',referenceAllowed:false}:{}),known:true,pending:false,error:''},true);}
 function query(action='quote',force=false){
  if(authFlight)return authFlight.promise.then(()=>query(action,force));
  const {project,key}=current();
  if(queryFlight?.key===key)return queryFlight.promise;
  if(!force&&state.known&&!state.error&&knownKey===key)return Promise.resolve(state);
  const turn=++generation,same=knownKey===key;
  publish({...state,...(!same?{proHT:null,proRows:[],privateCode:state.client?.codeClient||'',referenceAllowed:false}:{}),pending:true,error:''});
  const flight={key,promise:null};queryFlight=flight;
  flight.promise=Promise.resolve().then(()=>request(action,project?{project}:{})).then(data=>{if(turn!==generation)return state;return apply(data,key);}).catch(error=>turn===generation?failed(error):state).finally(()=>{if(queryFlight===flight)queryFlight=null;if(turn===generation&&current().key!==key)schedule();});
  return flight.promise;
 }
 function schedule(){
  clearTimeout(timer);
  if(authFlight){requote=true;return;}
  const {key}=current();
  if(state.known&&!state.client||knownKey===key&&!state.error&&!state.pending)return;
  if(queryFlight?.key===key)return;
  if(knownKey!==key)publish({...state,proHT:null,proRows:[],privateCode:state.client?.codeClient||'',referenceAllowed:false,pending:true,error:''});
  timer=setTimeout(()=>query().catch(()=>{}),delay);
 }
 function authenticate(action,payload){
  clearTimeout(timer);const stamp=action+':'+JSON.stringify(payload);
  if(authFlight?.stamp===stamp)return authFlight.promise;
  if(authStamp===stamp&&state.client&&!state.error){schedule();return Promise.resolve(state);}
  const {project,key}=current(),turn=++generation;requote=false;
  publish({client:null,proHT:null,proRows:[],privateCode:'',referenceAllowed:false,pending:true,known:false,error:''});
  const flight={stamp,promise:null};authFlight=flight;
  flight.promise=Promise.resolve().then(()=>request(action,{...payload,...(project?{project}:{})})).then(data=>{if(turn!==generation)return state;authStamp=stamp;return apply(data,key);}).catch(error=>turn===generation?failed(error):state).finally(()=>{if(authFlight===flight){authFlight=null;if(requote||current().key!==key){requote=false;schedule();}}});
  return flight.promise;
 }
 return {get state(){return state;},load(){if(authFlight)return authFlight.promise;if(queryFlight)return queryFlight.promise;if(state.known)return Promise.resolve(state);return query('session');},refresh(){return query('quote',true);},schedule,authenticate,resync(){clearTimeout(timer);authStamp='';return query('session',true);},async logout(){clearTimeout(timer);const turn=++generation;authStamp='';publish({client:null,proHT:null,proRows:[],privateCode:'',referenceAllowed:false,known:true,pending:true});await request('logout',{});if(turn!==generation)return state;knownKey='';return publish({client:null,proHT:null,proRows:[],privateCode:'',referenceAllowed:false,known:true,pending:false},true);}};
}
