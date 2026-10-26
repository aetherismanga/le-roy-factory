// Release gate executed on Vercel, where the existing decryption key is present.
// Report coverage only: no rate, token, identity or secret is ever printed.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readAgentTariffs,tariffKey} from '../shared/lrf-server/agent-tariffs.mjs';
export function inspectProfessionalTariffs(data){
 if(!data||!data.elios||!Array.isArray(data.view)||!data.view.length)throw Error('Professional tariff source unavailable');
 const formats=['5x15','10x10'];
 for(const format of formats){
  const quote=data.elios[tariffKey('azuli-mood',format)];
  if(!quote||!Number.isFinite(quote.amount)||quote.amount<0||typeof quote.label!=='string'||!quote.label)throw Error('Required Azuli Mood format missing from validated source: '+format);
 }
 if(!data.view.some(row=>['proPrice','proDetail','proPalette'].some(field=>Number.isFinite(row[field]))))throw Error('VIEW professional tariff source unavailable');
 return {validated:true,eliosQuotes:Object.keys(data.elios).length,viewVariants:data.view.length,azuliFormats:formats};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{console.log(JSON.stringify(inspectProfessionalTariffs(readAgentTariffs(new URL('../randal-general/server/data/agent-tariffs.enc.json',import.meta.url)))));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
