export function activeExportClient(client) {
  if (!client || client.archived === true || client.archive === true) return false;
  return ![client.duplicateOf, client.canonicalClientId].some(id => id && id !== client.id);
}

// Excel can interpret a cell as a formula even after a leading tab or spaces.
export function spreadsheetText(value) {
  const text=String(value ?? '');
  return /^[\s\u0000-\u001f\u007f-\u009f\u200b-\u200f\ufeff]*[=+\-@]/u.test(text) ? `'${text}` : text;
}

export function escapeCsvCell(value) {
  const text=spreadsheetText(value);
  return /["\r\n;,\t]/.test(text) ? `"${text.replace(/"/g,'""')}"` : text;
}
