import test from 'node:test';
import assert from 'node:assert/strict';
import {getSessionCredential,commercialRequest,projectRequest} from '../functions/neobath-anima/studio-adapter/commerce/client.js';

function globals(values){
 const original=Object.fromEntries(Object.keys(values).map(key=>[key,{present:Object.hasOwn(globalThis,key),value:globalThis[key]}]));
 Object.assign(globalThis,values);
 return ()=>{for(const [key,before] of Object.entries(original))if(before.present)globalThis[key]=before.value;else delete globalThis[key];};
}

test('shared composition credential accessor never exports Anima host or unrelated RANDAL session tokens',async()=>{
 const restore=globals({NEOBATH_ANIMA_AGENT:{uid:'agent-uid',email:'jerome@leroyfactory.fr',token:'private-firebase-token',credential:'private-session'},sessionStorage:{getItem(){throw Error('Anima must not read RANDAL credentials');}},animaAPI(){throw Error('Reading a credential must not call the private host');}});
 try{
  assert.equal(getSessionCredential(),'');
  const state=await commercialRequest('state');assert.equal(state.isAdmin,true);assert.equal(state.client.id,'agent-uid');assert.equal(getSessionCredential(),'');
 }finally{restore();}
});

test('private project operations keep using the Anima host after sharing the credential accessor contract',async()=>{
 const calls=[],record={id:'project-1',project:{title:'Anima'}};
 const restore=globals({NEOBATH_ANIMA_AGENT:{uid:'agent-uid',email:'jerome@leroyfactory.fr'},animaAPI:async(kind,payload)=>{calls.push({kind,payload});return {project:payload.project};}});
 try{
  const result=await projectRequest('save',{record});assert.equal(result.record,record);assert.equal(calls.length,1);assert.equal(calls[0].kind,'projects-save');assert.equal(calls[0].payload.profile,'studio-one');assert.equal(calls[0].payload.project,record);assert.equal(getSessionCredential(),'');
 }finally{restore();}
});
