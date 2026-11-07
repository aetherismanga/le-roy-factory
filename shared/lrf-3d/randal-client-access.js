// Only a server-verified account selects this presentation experience.
// Names, URL parameters and project files never confer account permissions.
export const RANDAL_PRESENTATION_CLIENT='LRF-00321';
export function configuratorAccess(identity){
 const restricted=identity?.isAdmin!==true&&identity?.client?.codeClient===RANDAL_PRESENTATION_CLIENT;
 return {mode:restricted?'presentation':'standard',allowWorkshop:!restricted};
}
export function isRandalPresentation(identity){
 return identity?.isAdmin!==true&&identity?.client?.codeClient===RANDAL_PRESENTATION_CLIENT&&identity?.configuratorAccess?.mode==='presentation'&&identity.configuratorAccess.allowWorkshop===false;
}
