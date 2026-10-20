// Local test harness matching Vercel rewrites and the serverless API signature.
import http from 'node:http';import {readFile} from 'node:fs/promises';import path from 'node:path';import handler from '../api/commercial.js';
const root=path.resolve('dist');
export const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/commercial'){let chunks='';for await(const chunk of req)chunks+=chunk;if(chunks.length>110000){res.writeHead(413);res.end();return;}req.body=JSON.parse(chunks||'{}');res.status=n=>{res.statusCode=n;return res;};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};await handler(req,res);return;}
 const name=url.pathname==='/'?'accueil.html':url.pathname==='/atelier.html'?'index.html':decodeURIComponent(url.pathname).replace(/^\//,'');const file=path.resolve(root,name);if(!file.startsWith(root+path.sep))throw Error('path');
 const data=await readFile(file);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(data);
 }catch(e){res.statusCode=404;res.end('Not found');}});server.listen(4173,'0.0.0.0',()=>console.log('Preview on http://localhost:4173'));
