import {cabinetFormat,topAvailable} from './configuration.js';
import {continuousPlanGroups,continuousTopContext,continuousTopCompatible} from './projects.js';
import {topSelection} from './anima-data.js';

// The stock cabinet is always the collision object; this context belongs only
// to the single source worktop mounted above its contiguous supports.
export function continuousPlanOption(project,host,mode){
 if(!host||host.type!=='cabinet')return null;
 const s=host.settings,p=host.placement,form=cabinetFormat(s.format);
 const own={span:s.width,offset:0,ids:[host.id],min:p.u-s.width/2,max:p.u+s.width/2};
 if(mode==='bare')return own;
 const surface=p.height+form.height*100;
 const covered=project.items.some(other=>{
  if(other.id===host.id||other.type!=='cabinet'||!(other.settings.topSpan>other.settings.width)||other.settings.top==='bare')return false;
  const os=other.settings,op=other.placement,of=cabinetFormat(os.format);
  if(op.wall!==p.wall||Math.abs(op.height+of.height*100-surface)>.1||Math.abs((op.offset||0)-(p.offset||0))>.1)return false;
  const context=continuousTopContext(project,other);return !!context&&context.ids.includes(host.id);
 });
 if(covered)return null;
 const groups=continuousPlanGroups(project,host.id);
 const selection=topSelection(mode,s.width,s.format);
 if(selection?.top?.configurableWidth){
  const continuous=[...groups].reverse().find(group=>group.span>s.width&&topAvailable(mode,s.width,s.format,group.span)&&continuousTopCompatible(project,host.id,mode,group.span,group.offset));
  if(continuous)return continuous;
 }
 if(topAvailable(mode,s.width,s.format))return own;
 return groups.find(group=>group.span>s.width&&topAvailable(mode,s.width,s.format,group.span)&&continuousTopCompatible(project,host.id,mode,group.span,group.offset))||null;
}

export function validContinuousPlan(project,item){
 return !!continuousTopContext(project,item)&&continuousTopCompatible(project,item.id,item.settings.top,item.settings.topSpan,item.settings.topOffset);
}
