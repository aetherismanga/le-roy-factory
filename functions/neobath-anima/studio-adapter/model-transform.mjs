// Applied only to the Anima compilation of the original Studio One factory.
// The source workspace and default RANDAL behavior remain byte-for-byte intact.
export function transformOriginalModel(source){
  const changes=[
    ["facadeMode='overlay'}={})","facadeMode='overlay',animaPlumbing=null}={})"],
    ['plumbing=basinCenters(chosenLayout,W);','plumbing=Array.isArray(animaPlumbing)?animaPlumbing.slice():basinCenters(chosenLayout,W);'],
    [' const insets={};'," function setBasinCenters(centres){if(!Array.isArray(centres)||!centres.every(Number.isFinite))return false;plumbing.splice(0,plumbing.length,...centres);setTopDrawer(drawerMode,true);return true;}\n const insets={};"],
    ['getBasinCenters,basinLayout:chosenLayout,','getBasinCenters,setBasinCenters,basinLayout:chosenLayout,']
  ];
  for(const [from,to] of changes){if(!source.includes(from))throw Error('Studio One plumbing adapter source contract changed: '+from);source=source.replace(from,to);}
  return source;
}
