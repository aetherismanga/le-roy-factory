export const COLUMN_HANDLE_CHOICES = Object.freeze([
 ['standard','Prise de main intégrée'],
 ['black','Poignée noire']
]);
export const COLUMN_HANDLE_SIDES = Object.freeze([
 ['right','Droite'],
 ['left','Gauche']
]);

export const columnHandleColor=settings=>settings?.handleColor==='black'?'black':'standard';
export const columnHandleSide=settings=>settings?.hingeSide==='right'?'left':'right';
export const columnHingeSide=handleSide=>handleSide==='left'?'right':'left';

export function columnHandleRequest(settings){
 if(columnHandleColor(settings)!=='black')return '';
 const side=columnHandleSide(settings)==='left'?'gauche':'droite';
 return 'Poignée noire latérale demandée à '+side+' · à confirmer par RANDAL';
}
