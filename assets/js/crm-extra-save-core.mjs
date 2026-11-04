// Shared draft/import comparisons: special Firestore values are retained intact.
export function cloneExtra(value) {
  if (Array.isArray(value)) return value.map(cloneExtra);
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneExtra(item)]));
  }
  return value;
}

export function extraSignature(value) {
  if (Array.isArray(value)) return `[${value.map(extraSignature).join(",")}]`;
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${extraSignature(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function extraPatch(before, after) {
  return Object.fromEntries(Object.entries(after).filter(([key, value]) =>
    key !== "id" && extraSignature(before?.[key]) !== extraSignature(value)
  ).map(([key, value]) => [key, cloneExtra(value)]));
}

export function assertImportUnchanged(current, baseline, patch) {
  for (const [key, desired] of Object.entries(patch)) {
    const now = extraSignature(current?.[key]);
    if (now !== extraSignature(baseline?.[key]) && now !== extraSignature(desired)) {
      throw new Error(`La fiche a changé depuis l’analyse (${key}). Relancez l’analyse pour conserver les modifications récentes.`);
    }
  }
}
