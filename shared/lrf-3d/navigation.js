// The previously published prototype used negative camera speeds. The new
// default reverses that exact behaviour for both pointer families. Moving an
// object remains separate: it follows the pointer in world coordinates.
export function configureNavigation(controls,inverted=true){
 const direction=inverted?1:-1;
 controls.rotateSpeed=direction;
 controls.panSpeed=.65*direction;
 return controls;
}
