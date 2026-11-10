import { createHash } from 'node:crypto';
import { reportFingerprint } from '../assets/js/crm-report-core.mjs';
import { normalizeReportPartners, reportPartners, withReportPartners } from '../assets/js/crm-report-partners.mjs';
export const hash = value => createHash('sha256').update(value).digest('hex');
export const reportHash = report => hash(reportFingerprint(report));
export const planKey = (path, report) => hash(path + '\n' + reportHash(report));
export const reportText = raw => String(raw.text || raw.texte || raw.notes || raw.note || '');

export function separateReport(raw, plan, key, at) {
  if (reportHash(raw) !== plan.originalHash) throw Error('The source report changed; the reviewed separation no longer applies.');
  if (!Array.isArray(plan.parts) || plan.parts.length < 2) throw Error('A separation needs at least two factory reports.');
  const text = reportText(raw), known = new Set(reportPartners(raw));
  const parts = plan.parts.map((part, index) => {
    const names = normalizeReportPartners(part.partner);
    if (names.length !== 1) throw Error('Exactly one factory is required for each separated report.');
    const partner = names[0];
    const paragraphs = part.paragraphs.map(spans => spans.map(([start,end]) => {
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > text.length) throw Error('Invalid reviewed text boundary.');
      return text.slice(start,end);
    }).join(''));
    const scoped = paragraphs.join('\n\n').trim();
    if (!scoped) throw Error('An empty factory report is not allowed.');
    const slug = hash(partner).slice(0,12);
    const result = withReportPartners({...raw,text:scoped},partner);
    for (const field of ['texte','notes','note']) if (Object.hasOwn(raw,field)) result[field]=scoped;
    result.id=index===0 && raw.id ? raw.id : `${raw.id||'report-'+key.slice(0,16)}-factory-${slug}`;
    if (index && raw.moovagoId) result.moovagoId=`${raw.moovagoId}-factory-${slug}`;
    Object.assign(result,{splitPlanId:key,splitSourceHash:plan.originalHash,splitFactory:partner,splitVersion:'20261110-single1',splitAt:at});
    known.delete(partner);
    return {report:result,targetPathHash:part.targetPathHash||plan.sourcePathHash};
  });
  if (known.size) throw Error('The plan omits an original factory association.');
  if (new Set(parts.map(p=>p.report.usine+'\n'+p.targetPathHash)).size!==parts.length) throw Error('Duplicate factory/client outputs in a separation.');
  return parts;
}
