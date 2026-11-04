export function activeMapClient(client,id) {
  if(!client||client.archived===true||client.archive===true)return false;
  return ![client.duplicateOf,client.canonicalClientId].some(value=>value&&value!==id);
}

export function mapText(value) {
  return String(value??'').replace(/[&<>"']/g,character=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[character]));
}

export function mapPhone(value) {
  return String(value??'').replace(/[^+\d]/g,'');
}
