// A full upper drawer is offered only with a separate countertop.
// Missing and legacy values keep the manufacturer's siphon passage.
export const fullTopDrawerAvailable=top=>['plain','neris','torne'].includes(top);
export const normalizeTopDrawer=(value,top)=>value==='full'&&fullTopDrawerAvailable(top)?'full':'siphon';
// Repeat a selected manufacturing option in the recap/order without changing tariffs.
export function drawerDescription(project,rows,row){
 const item=project?.items?.find(item=>item.id===row.itemId);
 return item?.type==='cabinet'&&normalizeTopDrawer(item.settings?.topDrawer,item.settings?.top)==='full'&&rows.find(entry=>entry.itemId===row.itemId)===row?' · Tiroir supérieur plein (sans découpe siphon)':'';
}
