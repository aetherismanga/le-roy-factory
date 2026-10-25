export function activeClients(records) {
  return records.filter(record=>record.archived!==true&&record.archive!==true);
}

// Customer-controlled values must stay text when opened by a spreadsheet app.
export function csvCell(value) {
  let text=String(value??'');
  if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text="'"+text;
  return /["\r\n;,\t]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;
}

