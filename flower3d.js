'use strict';
// A dependency-free, lit 3D bloom. The SVG remains available as a fallback.
(() => {
  const stage = document.querySelector('.flower-stage');
  const canvas = document.createElement('canvas');
  canvas.id = 'bloom-3d'; canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!gl) return;
  const vs = `attribute vec3 position;attribute vec3 normal;attribute vec2 uv;
  uniform mat4 projection;uniform mat4 model;uniform vec2 wind;uniform float bendable;varying vec3 n;varying vec3 pos;varying vec2 tex;
  void main(){vec3 bent=position;
  float height=clamp((position.y+3.45)/2.65,0.,1.);
  bent.x+=wind.x*height*height*bendable;
  bent.z+=wind.y*height*height*bendable;
  vec4 p=model*vec4(bent,1.);pos=p.xyz;n=mat3(model)*normal;tex=uv;gl_Position=projection*p;}`;
  const fs = `precision ${gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT).precision ? 'highp' : 'mediump'} float;varying vec3 n;varying vec3 pos;varying vec2 tex;
  uniform vec3 color;uniform float opacity;uniform float petal;uniform float terrain;uniform float plantX;uniform sampler2D groundPhoto;
  void main(){vec3 N=normalize(n);if(!gl_FrontFacing)N=-N;
  vec3 L=normalize(vec3(-.85,1.25,1.65));float diffuse=max(dot(N,L),0.);
  float rim=pow(1.-abs(dot(N,normalize(-pos))),3.);
  float spec=pow(max(dot(reflect(-L,N),normalize(-pos)),0.),24.);
  float vein=sin(tex.y*115.+sin(tex.x*9.)*1.5)*.012*petal;
  float ridge=cos(tex.y*3.14159*2.)*.065*petal;
  vec3 c=color*(.20+diffuse*.68+vein+ridge)+vec3(.13,.15,.17)*rim+vec3(.13)*spec;
  if(petal>.5){
    vec3 moonlight=vec3(.69,.79,.94);
    float edge=smoothstep(.77,1.,abs(tex.y*2.-1.))*sin(tex.x*3.14159);
    float fineVeins=pow(.5+.5*cos(tex.y*101.+sin(tex.x*6.)*.65),8.)*.028;
    float silk=pow(max(dot(reflect(-L,N),normalize(-pos)),0.),38.);
    float translucence=pow(max(dot(-N,L),0.),2.)*.075;
    c=color*vec3(.91,.99,1.12)*(.17+diffuse*.84+ridge+fineVeins)+moonlight*(rim*.14+silk*.18+edge*.085+translucence);
  }
  float alpha=opacity;
  if(terrain>.5){
    vec2 photoUV=fract(vec2(pos.x/7.3+.5,(pos.z+7.8)/6.+.5));
    vec3 photograph=texture2D(groundPhoto,photoUV).rgb;
    float luminance=dot(photograph,vec3(.2126,.7152,.0722));
    float shadow=1.-.20*exp(-length(vec2(pos.x-plantX,pos.z+8.6))*2.2);
    c=(vec3(.009,.008,.007)+vec3(luminance*.012))*shadow;
    alpha*=smoothstep(-17.,-8.,pos.z);
  }
  gl_FragColor=vec4(c,alpha);}`;
  function shader(type, src) { const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('3D shader compilation failed');return s; }
  try {
    const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
    gl.useProgram(program);
    const attrs=Object.fromEntries(['position','normal','uv'].map(n=>[n,gl.getAttribLocation(program,n)]));
    const uniforms=Object.fromEntries(['projection','model','color','opacity','petal','terrain','wind','bendable','plantX','groundPhoto'].map(n=>[n,gl.getUniformLocation(program,n)]));
    let loadedPhotos=0;
    function photoTexture(url,unit,uniform){
      const texture=gl.createTexture();
      gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([65,49,35,255]));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.uniform1i(uniform,unit);
      const photo=new Image();
      photo.onload=()=>{
        gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,photo);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');
        if(anisotropy)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        canvas.dataset.groundPhotos=String(++loadedPhotos);
        window.dispatchEvent(new Event('resize'));
      };
      photo.onerror=()=>console.warn('Ground photograph did not load:',url);
      photo.src=url;
      return texture;
    }
    const groundTexture=photoTexture('assets/brown_mud_02.jpg',0,uniforms.groundPhoto);
    const I=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
    const mul=(a,b)=>Array.from({length:16},(_,i)=>{let v=0;for(let k=0;k<4;k++)v+=a[k*4+i%4]*b[Math.floor(i/4)*4+k];return v;});
    const tr=(x,y,z)=>{const m=I();m[12]=x;m[13]=y;m[14]=z;return m;};
    const scale=(x,y,z)=>[x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1];
    const rx=a=>[1,0,0,0,0,Math.cos(a),Math.sin(a),0,0,-Math.sin(a),Math.cos(a),0,0,0,0,1];
    const ry=a=>[Math.cos(a),0,-Math.sin(a),0,0,1,0,0,Math.sin(a),0,Math.cos(a),0,0,0,0,1];
    const rz=a=>[Math.cos(a),Math.sin(a),0,0,-Math.sin(a),Math.cos(a),0,0,0,0,1,0,0,0,0,1];
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const sub=(a,b)=>a.map((x,i)=>x-b[i]);
    function mesh(fn,nu,nv){const data=[];const point=(u,v)=>{const p=fn(u,v);const a=fn(Math.min(1,u+.001),v),b=fn(u,Math.min(1,v+.001));let n=cross(sub(a,p),sub(b,p));const l=Math.hypot(...n)||1;n=n.map(x=>x/l);return [...p,...n,u,v];};
      for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=point(i/nu,j/nv),b=point((i+1)/nu,j/nv),c=point(i/nu,(j+1)/nv),d=point((i+1)/nu,(j+1)/nv);data.push(...a,...b,...c,...b,...d,...c);}
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return {buffer,count:data.length/8};}
    const petalMesh=mesh((u,v)=>{
      const w=Math.pow(Math.sin(Math.PI*u*.52),.8)*.38*(1+.012*Math.cos(u*35));
      const x=(v*2-1)*w;
      const y=.12+u*1.25-.20*Math.pow(v*2-1,2)*u*u*u+.020*Math.cos(v*19)*u*u*u;
      const z=.055+.25*u*u+.07*Math.pow(v*2-1,2)*Math.sin(Math.PI*u)+.0018*Math.sin(v*39)*Math.sin(Math.PI*u);
      return [x,y,z];
    },36,20);
    const spherePoint=(u,v)=>{const a=u*Math.PI,b=v*Math.PI*2;return [Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];};
    const sphere=mesh(spherePoint,22,32),bead=mesh(spherePoint,6,8);
    const stemX=y=>.055*Math.sin(-y*2.1);
    function tube(path,radius,steps=12){return mesh((u,v)=>{
      const p=path(u),q=path(Math.min(1,u+.001));
      let tangent=sub(q,p),len=Math.hypot(...tangent)||1;tangent=tangent.map(x=>x/len);
      let n=cross(tangent,[0,0,1]);len=Math.hypot(...n)||1;n=n.map(x=>x/len);
      const b=cross(tangent,n),a=v*Math.PI*2;
      return p.map((x,i)=>x+radius*(Math.cos(a)*n[i]+Math.sin(a)*b[i]));
    },steps,6);}
    const stem=tube(u=>[stemX(-.8-u*2.65),-.8-u*2.65,-.055],.018,30);
    const leafY=-2.03;
    const leaf=mesh((u,v)=>{
      const span=(v*2-1)*Math.sin(Math.PI*u)*.18;
      return [stemX(leafY)+u*1.04,leafY+u*.47+span,-.055+Math.sin(Math.PI*u)*.055+span*.45];
    },22,10);
    const leafVein=tube(u=>[stemX(leafY)+u*1.04,leafY+u*.47,-.047+Math.sin(Math.PI*u)*.055],.004,16);
    const secondLeafY=-2.47;
    const secondLeaf=mesh((u,v)=>{
      const span=(v*2-1)*Math.sin(Math.PI*u)*.16;
      return [stemX(secondLeafY)-u*.91,secondLeafY+u*.38+span,-.055+Math.sin(Math.PI*u)*.06+span*.38];
    },22,10);
    const secondLeafVein=tube(u=>[stemX(secondLeafY)-u*.91,secondLeafY+u*.38,-.047+Math.sin(Math.PI*u)*.06],.004,16);
    function soilNoise(x,z){
      const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
      const sx=fx*fx*(3-2*fx),sz=fz*fz*(3-2*fz);
      const h=(a,b)=>{const v=Math.sin(a*127.1+b*311.7)*43758.5453;return v-Math.floor(v);};
      return (h(ix,iz)*(1-sx)+h(ix+1,iz)*sx)*(1-sz)+(h(ix,iz+1)*(1-sx)+h(ix+1,iz+1)*sx)*sz;
    }
    const soilHeight=(x,z)=>-3.49+(soilNoise(x*1.2,z*1.2)-.5)*.035;
    const ground=mesh((u,v)=>{
      const x=(u-.5)*22,z=(v-.5)*18;
      return [x,soilHeight(x,z),z];
    },130,110);
    function draw(mesh,model,color,opacity=1,petal=0,terrain=0,bendable=0){if(opacity<.008)return;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);for(const [name,size,offset] of [['position',3,0],['normal',3,12],['uv',2,24]]){gl.enableVertexAttribArray(attrs[name]);gl.vertexAttribPointer(attrs[name],size,gl.FLOAT,false,32,offset);}gl.uniformMatrix4fv(uniforms.model,false,new Float32Array(model));gl.uniform3fv(uniforms.color,color);gl.uniform1f(uniforms.opacity,opacity);gl.uniform1f(uniforms.petal,petal);gl.uniform1f(uniforms.terrain,terrain);gl.uniform1f(uniforms.bendable,bendable);gl.drawArrays(gl.TRIANGLES,0,mesh.count);}
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    stage.appendChild(canvas);stage.classList.add('has-3d');
    let w=0,h=0;
    window.cosmosBloom={draw(states,t,paused,pointer){
      const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.7);
      const nw=Math.round(rect.width*dpr),nh=Math.round(rect.height*dpr);
      if(!nw||!nh)return;
      if(w!==nw||h!==nh){w=nw;h=nh;canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,groundTexture);
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      const f=1/Math.tan(.56),aspect=w/h,near=.1,far=30;
      gl.uniformMatrix4fv(uniforms.projection,false,new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]));
      const px=pointer.x<0?0:(pointer.x/innerWidth-.5)*.09;
      const py=pointer.y<0?0:(pointer.y/innerHeight-.5)*.06;
      const breeze=paused?0:Math.sin(t*.00105)*.14+Math.sin(t*.00181+.8)*.045;
      const windDepth=paused?0:Math.sin(t*.00086+.4)*.045;
      gl.uniform2f(uniforms.wind,breeze,windDepth);
      const plantX=-2.85*aspect*(8.6/7.8);
      gl.uniform1f(uniforms.plantX,plantX);
      const earth=tr(plantX,1.,-8.6);
      const tip=mul(tr(breeze,-.8,windDepth),rz(-2*breeze/2.65));
      const root=mul(earth,mul(tip,mul(ry(-.04+px),mul(rx(-.16+py+windDepth),scale(.55,.55,.55)))));
      draw(ground,tr(0,1.,-7.8),[.17,.133,.095],1,0,1);
      draw(stem,earth,[.25,.29,.20],1,0,0,1);
      draw(leaf,earth,[.19,.25,.17],1,0,0,1);
      draw(leafVein,earth,[.27,.32,.21],1,0,0,1);
      draw(secondLeaf,earth,[.19,.25,.17],1,0,0,1);
      draw(secondLeafVein,earth,[.27,.32,.21],1,0,0,1);
      draw(sphere,mul(root,mul(tr(0,0,-.02),scale(.30,.30,.12))),[.16,.22,.13]);
      states.forEach((s,i)=>{
        const offset=mul(tr(s.x/135,-s.y/135,Math.sin(s.fall*Math.PI+i)*s.fall*.65),mul(rz(-s.angle*Math.PI/180),mul(rx(-s.fall*Math.PI*.48),mul(ry(Math.sin(s.fall*Math.PI)*3.5),scale(s.tilt,1,1)))));
        draw(petalMesh,mul(root,offset),[.35+(i%3)*.022,.36+(i%3)*.022,.34+(i%3)*.022],s.opacity,1);
      });
      draw(sphere,mul(root,mul(tr(0,0,.18),scale(.29,.29,.17))),[.26,.28,.21]);
      for(let i=0;i<110;i++){const r=Math.sqrt(i/110)*.27,a=i*2.39996;const x=Math.cos(a)*r,y=Math.sin(a)*r,z=.18+.16*Math.sqrt(1-r*r/.085);draw(bead,mul(root,mul(tr(x,y,z),scale(.017,.022,.022))),i%3?[.42,.43,.33]:[.55,.54,.40]);}
    }};
  } catch { canvas.remove();stage.classList.remove('has-3d'); }
})();
