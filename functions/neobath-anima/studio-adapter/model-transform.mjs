// Applied only to the Anima compilation of the original Studio One factory.
// The source workspace and default RANDAL behavior remain byte-for-byte intact.
export function transformOriginalModel(source){
  const changes=[
    ["facadeMode='overlay'}={})","facadeMode='overlay',animaPlumbing=null,animaPlumbingZ=null}={})"],
    ['plumbing=basinCenters(chosenLayout,W);','plumbing=Array.isArray(animaPlumbing)?animaPlumbing.slice():basinCenters(chosenLayout,W),plumbingZ=Array.isArray(animaPlumbingZ)?animaPlumbingZ.map(z=>z-.020):plumbing.map(()=>0);'],
    [' const insets={};'," function setBasinCenters(centres,depths=[]){if(!Array.isArray(centres)||!centres.every(Number.isFinite))return false;plumbing.splice(0,plumbing.length,...centres);plumbingZ.splice(0,plumbingZ.length,...centres.map((_,i)=>(depths[i]??.020)-.020));setTopDrawer(centres.length?'siphon':'full',true);return true;}\n const insets={};"],
    ['getBasinCenters,basinLayout:chosenLayout,','getBasinCenters,setBasinCenters,basinLayout:chosenLayout,'],
    ['for(const x of plumbing){path.lineTo(x-.09,-.176);path.lineTo(x-.09,.015);path.quadraticCurveTo(x-.09,.038,x-.066,.038);path.lineTo(x+.066,.038);path.quadraticCurveTo(x+.09,.038,x+.09,.015);path.lineTo(x+.09,-.176);}', 'for(const [pi,x] of plumbing.entries()){const dz=plumbingZ[pi]||0;path.lineTo(x-.09,-.176);path.lineTo(x-.09,.015+dz);path.quadraticCurveTo(x-.09,.038+dz,x-.066,.038+dz);path.lineTo(x+.066,.038+dz);path.quadraticCurveTo(x+.09,.038+dz,x+.09,.015+dz);path.lineTo(x+.09,-.176);}'],
    ["for(const x of plumbing){const span=x-.09-left;","for(const [pi,x] of plumbing.entries()){const dz=plumbingZ[pi]||0,span=x-.09-left;"],
    ["box(.008,.072,.205,inner,'Passage_siphon_flanc',interior,x+sign*.086,bottom+.036,-.08);box(.172,.072,.008,inner,'Passage_siphon_face',interior,x,bottom+.036,.021);","box(.008,.072,.205+dz,inner,'Passage_siphon_flanc',interior,x+sign*.086,bottom+.036,-.08+dz/2);box(.172,.072,.008,inner,'Passage_siphon_face',interior,x,bottom+.036,.021+dz);"]
  ];
  for(const [from,to] of changes){if(!source.includes(from))throw Error('Studio One plumbing adapter source contract changed: '+from);source=source.replace(from,to);}
  return source;
}
