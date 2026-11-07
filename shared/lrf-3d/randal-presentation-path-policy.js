export function progressivePresentationPolicy({mobile=false,memory=8,cores=8,floatTargets=false,maxTextureSize=0,workers=true}={}){
 const enabled=floatTargets&&maxTextureSize>=4096&&workers&&memory>=4&&cores>=4,limited=mobile||memory<8||cores<8;
 // A time limit is a cancellation budget, never a substitute for convergence.
 // In particular, eight samples after a long compile are not a finished photo.
 return Object.freeze({enabled,pixels:limited?450000:1400000,textureSize:limited?512:1024,maxSamples:limited?128:512,bounces:limited?5:8,tiles:limited?4:3,maxTextureSources:48,maxTriangles:350000,maxTimeMs:limited?300000:600000,compileTimeMs:60000,maxTileMs:500,slowTiles:6});
}
