'use strict';

// Local browser QA has no authenticated account. A session probe still returns
// the same anonymous 200 profile as the production gateway, so the workshop can
// distinguish a guest from an unavailable authentication service. Protected
// operations keep their original 401 response.
const LIMIT=8192;
const unauthorized={success:false,error:'Guest test: authentication required'};
const profile={client:null,isAdmin:false,randalAllowed:false,configuratorAccess:{mode:'standard',allowWorkshop:true},proHT:null,proRows:[],referenceAllowed:false};

function responseFor(method,pathname,raw){
 if(method!=='POST'||typeof pathname!=='string'||!pathname.endsWith('/api/commercial'))return null;
 let body;
 try{if(typeof raw!=='string'||Buffer.byteLength(raw)>LIMIT)throw Error('Invalid fixture request');body=JSON.parse(raw);}catch{return reply(401,unauthorized);}
 if(!body||typeof body!=='object'||Array.isArray(body)||body.action!=='session')return reply(401,unauthorized);
 return reply(200,profile);
}
function reply(status,value){return {status,contentType:'application/json',headers:{'Cache-Control':'no-store'},body:JSON.stringify(value)};}
function handle(req,res,pathname){
 if(req.method!=='POST'||typeof pathname!=='string'||!pathname.endsWith('/api/commercial'))return false;
 let raw='',bytes=0,overflow=false;
 req.setEncoding('utf8');
 req.on('data',chunk=>{bytes+=Buffer.byteLength(chunk);if(bytes>LIMIT){overflow=true;raw='';}else if(!overflow)raw+=chunk;});
 const finish=result=>{if(res.destroyed||res.writableEnded)return;res.writeHead(result.status,{'Content-Type':result.contentType,...result.headers});res.end(result.body);};
 req.on('end',()=>finish(responseFor(req.method,pathname,overflow?'':raw)));
 req.on('error',()=>finish(reply(401,unauthorized)));
 return true;
}

module.exports={handle,responseFor};
