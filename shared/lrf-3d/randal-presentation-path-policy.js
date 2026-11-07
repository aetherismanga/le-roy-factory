export function progressivePresentationPolicy({mobile=false,memory=8,cores=8,floatTargets=false,maxTextureSize=0,workers=true}={}){
 const enabled=floatTargets&&maxTextureSize>=4096&&workers&&memory>=4&&cores>=4,limited=mobile||memory<8||cores<8;
 return Object.freeze({enabled,pixels:limited?450000:1400000,textureSize:limited?512:1024,maxSamples:limited?64:192,bounces:limited?5:8,tiles:limited?4:3,maxTextureSources:48,maxTriangles:350000,idle:450});
}
