export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function privateMarkup(state,configurator){
 if(!state?.client)return '<span>Mon compte client LRF</span>';
 const ownCode=state.client.codeClient||'';
 const reference=String(state.privateCode||'');
 const allowed=state.referenceAllowed===true&&state.randalAllowed===true&&/^LRF-\d{5}$/.test(ownCode)&&reference.startsWith(ownCode+'-')&&/^LRF-\d{5}-\d+\.\d{2}\.00$/.test(reference);
 const code=allowed?reference:ownCode||'Administrateur';
 return '<small class="pro-reference">'+escapeHTML(code)+'</small><small>'+escapeHTML(configurator)+' · '+escapeHTML(state.client.societe||'')+'</small>'+(state.randalAllowed===false?'<small>Accès RANDAL non autorisé pour ce compte.</small>':'');
}
