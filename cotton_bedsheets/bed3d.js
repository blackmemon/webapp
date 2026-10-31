import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const HQ=new URLSearchParams(location.search).has('hq');const MODELS={suite:{url:HQ?'./models/hq-new.js':'./models/bed-new.js',ref:0.22,fref:0.12,scale:1.5},round:{url:HQ?'./models/hq-round.js':'./models/bed-round.js',ref:0.466,fref:0.204,scale:1.4},curve:{url:HQ?'./models/hq-curve.js':'./models/bed-curve.js',ref:0.382,fref:0.1,scale:1.4}};
const G={cache:{},cur:null,look:{c1:'#e9ecee',c2:'#9cc5ea',pat:0,k:6,fr:'#E4622E'},pose:{yaw:0,pitch:0,zoom:1,tx:0,ty:-.05},eve:false,dirty:true,ok:false};
function mk(){
  const el=document.getElementById('gl3d');if(!el)return false;
  let r;try{r=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'})}catch(e){return false}
  r.setPixelRatio(Math.min(devicePixelRatio,2));r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.NeutralToneMapping;r.toneMappingExposure=1.05;r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
  el.appendChild(r.domElement);r.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';
  const sc=new THREE.Scene();const pm=new THREE.PMREMGenerator(r);sc.environment=pm.fromScene(new RoomEnvironment(),.04).texture;sc.environmentIntensity=.95;
  const key=new THREE.DirectionalLight('#fff4e2',1.6);key.position.set(2.5,4,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-1.6,right:1.6,top:1.6,bottom:-1.6,near:1,far:14});key.shadow.bias=-.0006;key.shadow.normalBias=.02;key.shadow.radius=5;sc.add(key);
  const rim=new THREE.DirectionalLight('#dbe8ff',.5);rim.position.set(-4,2,-3);sc.add(rim);
  const cam=new THREE.PerspectiveCamera(26,1,.1,50);
  const pivot=new THREE.Group();pivot.rotation.order='YXZ';sc.add(pivot);
  Object.assign(G,{r,sc,cam,pivot,key,rim,el});
  const fit=()=>{const e2=G.el||el,w=e2.clientWidth||600,h=e2.clientHeight||400;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();G.dirty=true};
  G.fit=fit;G.ro=new ResizeObserver(fit);G.ro.observe(el);fit();return true}
function patch(mat,ref,fref){
  const u={uC1:{value:new THREE.Color()},uC2:{value:new THREE.Color()},uPat:{value:0},uK:{value:6},uRef:{value:ref},uFr:{value:new THREE.Color('#E4622E')},uFRef:{value:fref}};mat.userData.u=u;
  mat.onBeforeCompile=s=>{Object.assign(s.uniforms,u);
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vObj;').replace('#include <begin_vertex>','#include <begin_vertex>\nvObj=position;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vObj;uniform vec3 uC1;uniform vec3 uC2;uniform int uPat;uniform float uK;uniform float uRef;uniform vec3 uFr;uniform float uFRef;')
    .replace('#include <map_fragment>',`#include <map_fragment>
    float mk=texture2D(roughnessMap,vRoughnessMapUv).r;
    vec2 q=vObj.xz*uK;float pt=0.;
    if(uPat==1){pt=step(.55,fract(q.x));}
    else if(uPat==2){pt=.5*(step(.5,fract(q.x))+step(.5,fract(q.y)));}
    else if(uPat==3){pt=step(length(fract(q)-.5),.2);}
    else if(uPat==4){vec2 a=abs(fract(q)-.5);pt=step(a.x+a.y,.3);}
    else if(uPat==5){pt=step(.5,fract(q.x*.3));}
    vec3 col=mix(uC1,uC2,pt);
    float lm=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
    float sh=mix(1.,pow(clamp(lm/uRef,0.,1.5),1.2),.8);
    float fx=fwidth(vObj.x*900.);float wt=clamp(1.-fx*.55,0.,1.);float wv=sin(vObj.x*900.)*sin(vObj.z*900.)+.6*sin(vObj.x*1700.+1.)*sin(vObj.z*1500.);col*=1.+.045*wv*wt;
    vec3 fcol=uFr*pow(clamp(lm/uFRef,0.,1.6),.85);
    diffuseColor.rgb=mix(fcol,col*sh,mk);`)};
  mat.customProgramCacheKey=()=>'bedtint';mat.needsUpdate=true}
function load(name){
  if(G.cache[name])return G.cache[name];
  const m=MODELS[name];
  return G.cache[name]=import(m.url).then(x=>{const s=atob(x.default),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u.buffer}).then(buf=>new Promise((ok,no)=>{
    const l=new GLTFLoader();l.setMeshoptDecoder(MeshoptDecoder);
    l.parse(buf,'',g=>{const root=g.scene;const box=new THREE.Box3().setFromObject(root);const c=box.getCenter(new THREE.Vector3()),sz=box.getSize(new THREE.Vector3());
      const holder=new THREE.Group();root.position.sub(c);holder.add(root);holder.scale.setScalar(m.scale/Math.max(sz.x,sz.z));
      const sp=new THREE.Mesh(new THREE.PlaneGeometry(6,6),new THREE.ShadowMaterial({opacity:.24}));sp.rotation.x=-Math.PI/2;sp.receiveShadow=true;holder.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(holder);sp.position.y=bb.min.y-.005;holder.userData.sp=sp;holder.add(sp);sp.scale.setScalar(1/holder.scale.x);sp.position.y=(bb.min.y-.005)/holder.scale.x;root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;const mt=o.material;if(mt.map)mt.map.anisotropy=8;patch(mt,m.ref,m.fref);o.userData.mat=mt}});
      ok(holder)},no)}))}
function apply(){
  if(!G.cur)return;const L=G.look;G.cur.traverse(o=>{if(o.userData.mat){const u=o.userData.mat.userData.u;u.uC1.value.set(L.c1);u.uC2.value.set(L.c2);u.uPat.value=L.pat;u.uK.value=L.k;u.uFr.value.set(L.fr||'#E4622E')}});G.dirty=true}
function frame(){
  requestAnimationFrame(frame);if(!G.dirty||!G.r)return;G.dirty=false;
  const P=G.pose,c=G.cam;const d=(3.3/Math.min(1,c.aspect*.8))/P.zoom;c.position.set(0,d*.5,d*.87);c.lookAt(P.tx,P.ty,0);
  G.pivot.rotation.set(P.pitch,P.yaw,0);G.r.render(G.sc,c)}
const API={
  async init(){if(!G.r&&!mk())return false;G.ok=true;if(!G.started){G.started=true;frame()}return true},
  async setModel(name){const h=await load(name);if(G.cur)G.pivot.remove(G.cur);G.cur=h;G.name=name;G.pivot.add(h);apply();return true},
  setLook(l){Object.assign(G.look,l);apply()},
  setPose(p){Object.assign(G.pose,p);G.dirty=true},
  setLight(eve){G.sc.environmentIntensity=eve?.28:.95;G.key.intensity=eve?2.6:1.6;G.key.color.set(eve?'#ffc98a':'#fff4e2');G.rim.intensity=eve?1.9:.5;G.r.toneMappingExposure=eve?1:1.05;G.dirty=true},
  get ok(){return G.ok},get name(){return G.name},attach(){const el=document.getElementById('gl3d');if(el&&G.r&&G.r.domElement.parentNode!==el){G.ro.disconnect();G.el=el;el.appendChild(G.r.domElement);G.ro=new ResizeObserver(G.fit);G.ro.observe(el)}G.fit&&G.fit()}
};
window.BedGL=API;window.dispatchEvent(new Event('bedgl'));
