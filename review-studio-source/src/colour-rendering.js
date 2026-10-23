import {SRGBColorSpace,NeutralToneMapping} from 'three';
// Use the same colour transform in the product preview and the workshop.
// The neutral transform retains product saturation in the highlights; colour
// maps are decoded as sRGB by the existing texture loaders in both views.
export function configureColourRendering(renderer){renderer.outputColorSpace=SRGBColorSpace;renderer.toneMapping=NeutralToneMapping;}
