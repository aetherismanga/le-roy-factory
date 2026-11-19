'use strict';
const admin=require('firebase-admin');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {GoogleAuth}=require('google-auth-library');
const version=require('../data/saxso-order-version.json');
const projectId='le-roy-factory';
admin.initializeApp({projectId,storageBucket:projectId+'.firebasestorage.app'});
async function main(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'saxso-orders-'));
  try{
    const bucket=admin.storage().bucket();
    const source=bucket.file('private-tariffs/saxso/distributeurs-nets-ht-2026-20261112.pdf');
    let pdf;
    if((await source.exists())[0]) [pdf]=await source.download();
    else{
      const auth=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/drive.readonly']}).getClient();
      const response=await auth.request({url:'https://www.googleapis.com/drive/v3/files/1JlzPHfHGYD2INpzNwqx0q03E6jW0n6zI?alt=media',responseType:'arraybuffer'});
      pdf=Buffer.from(response.data);
    }
    const privatePdf=path.join(dir,'source.pdf'), out=path.join(dir,'book.json');
    fs.writeFileSync(privatePdf,pdf,{mode:0o600});
    execFileSync('python3',[path.join(__dirname,'prepare-saxso-order.py'),'--pdf',privatePdf,'--out',out],{stdio:'inherit'});
    const bytes=fs.readFileSync(out), target=bucket.file(version.path);
    await target.save(bytes,{resumable:false,contentType:'application/json',metadata:{cacheControl:'private,no-store,max-age=0'}});
    const [stored]=await target.download();
    if(!crypto.createHash('sha256').update(bytes).digest().equals(crypto.createHash('sha256').update(stored).digest())) throw Error('La matrice sauvegardée diffère.');
    console.log('Private SAXSO order matrix checked.');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
