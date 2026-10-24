import {validWidth,WIDTH_PRESETS} from './configuration.js';
export function cabinetCombinations(total){
 if(!Number.isInteger(total)||total<=120||total>1000)return [];
 const count=Math.ceil(total/120),common=[40,50,...WIDTH_PRESETS,110],mean=total/count,choices=[...new Set([...common,Math.floor(mean),Math.ceil(mean)])].filter(validWidth);let beam=[[]];
 for(let i=0;i<count;i++){const remaining=count-i-1,seen=new Set(),next=[];for(const row of beam)for(const width of choices){if(width<(row.at(-1)||0))continue;const sum=row.reduce((n,v)=>n+v,0)+width;if(sum+remaining*40>total||sum+remaining*120<total)continue;const value=[...row,width],key=value.join('+');if(!seen.has(key)){seen.add(key);next.push(value);}}beam=next.sort((a,b)=>Math.abs(a.reduce((n,v)=>n+v,0)-(i+1)*mean)-Math.abs(b.reduce((n,v)=>n+v,0)-(i+1)*mean)).slice(0,250);}
 return beam.filter(row=>row.reduce((n,v)=>n+v,0)===total).sort((a,b)=>{const score=r=>(r.at(-1)-r[0])+r.filter(v=>!common.includes(v)).length*25;return score(a)-score(b);}).slice(0,6).map(widths=>widths.sort((a,b)=>b-a));
}
