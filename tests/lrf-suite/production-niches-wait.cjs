// Read-only release verification. This never triggers a Vercel deployment.
const {readFileSync}=require('node:fs'),{createHash}=require('node:crypto');
const sha=b=>createHash('sha256').update(b).digest('hex');
const apps=[['studio-one','https://studio-one-beta-test-v2.vercel.app'],['randal-general','https://randal-catalogue-general-3d.vercel.app']];
(async()=>{
 for(const [app,origin] of apps){
  const expected=sha(readFileSync(app+'/dist/app.js'));let verified=false,last='';
  for(let attempt=0;attempt<120;attempt++){
   try{const html=await fetch(origin+'/atelier.html?release-check='+expected.slice(0,12),{cache:'no-store',signal:AbortSignal.timeout(10000)});const entry=await html.text();
    const response=await fetch(origin+'/app.js?v='+expected.slice(0,12),{cache:'no-store',signal:AbortSignal.timeout(10000)});const actual=sha(Buffer.from(await response.arrayBuffer()));
    if(html.ok&&response.ok&&entry.includes('app.js?v='+expected.slice(0,12))&&actual===expected){console.log(JSON.stringify({app,origin,verified:true,sha256:actual}));verified=true;break;}last='served bundle does not match this commit';
   }catch(error){last=error.message;}
   if(attempt%6===0)console.log(app+': waiting for the reviewed release ('+last+')');await new Promise(resolve=>setTimeout(resolve,5000));
  }
  if(!verified)throw Error(app+': release not verified: '+last);
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
