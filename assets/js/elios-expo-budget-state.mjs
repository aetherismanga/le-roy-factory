// Keep asynchronous reads and financial writes bound to the selected budget year.
export function createBudgetYearGate(selectedYear){
 let generation=0,writing=false;
 return {
  beginLoad(){return Object.freeze({generation:++generation,year:Number(selectedYear())});},
  isCurrent(ticket){return ticket.generation===generation&&ticket.year===Number(selectedYear());},
  isWriting(){return writing;},
  beginWrite(data){
   if(writing||!data||data.year!==Number(selectedYear()))return null;
   writing=true;
   return Object.freeze({year:data.year});
  },
  finishWrite(){writing=false;}
 };
}
