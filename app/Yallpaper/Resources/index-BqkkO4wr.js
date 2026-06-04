(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`

struct Uniforms {
  resolution: vec2f,
  time: f32,
  dpr: f32,
}
;



@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// FBM port matching lygia/generative/fbm.glsl defaults (4 octaves, amplitude 0.5, scale 2.0)


fn fbm3(p_in: vec3f) -> f32 {
  var value: f32 = 0.0;
  var amplitude: f32 = 0.5;
  var pos: vec3f = p_in;
  for (var i: i32 = 0; i < 3; i = i + 1) {
    value = value + amplitude * snoise3(pos);
    pos = pos * 2.5;
    amplitude = amplitude * 0.5;
  }
  return value;
}

fn project(coord: vec2f) -> vec3f {
  let origin = vec2f(uniforms.resolution.x * 1.5, uniforms.resolution.y * 3.5);
  let r = length(coord - origin);
  let theta = atan2(coord.y - origin.y, coord.x - origin.x);
  let theta_low = atan2(-origin.y, uniforms.resolution.x - origin.x);
  let theta_high = atan2(uniforms.resolution.y - origin.y, -origin.x);
  let theta_range = theta_high - theta_low;
  let warp_mult = 1.0 - 1.2 * (r / length(uniforms.resolution * 0.5 - origin) - 0.75);
  let warp_add = 0.02 - 0.2 * (r / length(uniforms.resolution * 0.5 - origin) - 1.0);
  let theta_t = ((theta - theta_low) / theta_range + 0.1 - 0.5) * warp_mult + 0.5 + warp_add;
  let y = theta_t * length(uniforms.resolution);
  return vec3f(r, y, theta_t);
}

fn stars_seed(coord: vec2f, noise_scale: f32) -> vec2f {
  let time_scale = uniforms.time * 0.01;
  let shifted_coord = coord - vec2f(1.0, 2.5) * uniforms.time;
  let size_coord = shifted_coord / 3000.0 / noise_scale;
  let points_coord = shifted_coord / 500.0 / noise_scale;

  let star_size = fbm3(vec3f(size_coord.x, size_coord.y, time_scale));
  let star_points = worley3(vec3f(points_coord.x, points_coord.y, time_scale));

  return vec2f(star_size, star_points);
}

fn stars(seed: vec2f, size: f32, edge: f32) -> f32 {
  let star_size = seed.x;
  let star_points = seed.y * (star_size * 0.75 + mix(0.5, 0.875, size));
  return pow(max(0.0, star_points), edge);
}

fn cloud(coord: vec2f, scale: vec2f, edge: f32) -> f32 {
  let time_scale = uniforms.time * 0.01;
  let noise_coord = coord / 1000.0 / scale;
  return pow(fbm3(vec3f(noise_coord.x, noise_coord.y, time_scale)) * 0.5 + 0.5, edge);
}

@fragment fn fs_main(@builtin(position)pos: vec4f) -> @location(0) vec4f {
  var color = vec3f(0.0, 0.0, 0.1);
  let time_scale = uniforms.time * 0.01;
  let frag = vec2f(pos.x, pos.y) * (2.0 / uniforms.dpr);
  let proj_coord_data = project(frag);
  let proj_coord = proj_coord_data.xy;
  let theta_t = proj_coord_data.z;

  let milky_way_mask = pow(1.0 / (1.0 + abs(theta_t - 0.5) * 2.0), 4.0) * 2.0;
  let time_x200 = vec2f(200.0, 0.0) * uniforms.time;
  let time_x100 = vec2f(100.0, 0.0) * uniforms.time;
  let time_x25 = vec2f(25.0, 0.0) * uniforms.time;
  let time_x10 = vec2f(10.0, 0.0) * uniforms.time;

  let milky_way_1 = cloud(proj_coord + time_x200, vec2f(2.0, 0.5), 5.0) * 0.5 * milky_way_mask + 0.1 * milky_way_mask;
  color = color + milky_way_1 * vec3f(mix(0.4, 0.8, milky_way_1), 0.6, 1.0) * 0.75;

  let milky_way_2 = cloud(proj_coord + time_x100, vec2f(4.0, 2.0), 3.0) * 0.75 * milky_way_mask + 0.1 * milky_way_mask;
  color = color + milky_way_2 * vec3f(mix(0.2, 0.4, milky_way_2), 0.1 * milky_way_2, 0.75) * 1.0;

  var milky_way_3 = cloud(proj_coord + time_x25, vec2f(0.5, 0.5), 3.0) * 0.75 * pow(milky_way_mask / 2.0 + 0.5, 7.0);
  milky_way_3 = clamp(milky_way_3, 0.0, 2.0);
  color = color + milky_way_3 * vec3f(1.0, mix(0.4, 0.8, milky_way_3), mix(0.25, 0.75, milky_way_3)) * 0.5;

  let milky_way = min(2.0, milky_way_1 * 1.5 + milky_way_2 * 0.5);

  let stars_s = stars_seed(frag, 0.05);

  let stars_1 = stars(stars_s, 1.0, 15.0) * milky_way;
  color = color + stars_1 * vec3f(1.0, mix(0.1, 0.8, stars_1), mix(0.0, 1.0, stars_1));

  let stars_2 = stars(stars_s, 2.0, 15.0) * pow(milky_way + 0.25, 10.0);
  color = color + stars_2 * vec3f(mix(0.25, 1.0, stars_2), 0.9, 1.0);

  let milky_way_4 = cloud(proj_coord + time_x10, vec2f(0.5, 0.25), 3.0) * pow(milky_way_mask / 2.0 + 0.75, 4.0);
  color = mix(color, mix(vec3f(0.05, 0.0, 0.2), vec3f(0.0, 0.0, 0.2), pow(clamp(milky_way_4 - 1.0, 0.0, 1.0), 3.0)), clamp(milky_way_4, 0.0, 1.0));

  let gradient_y = frag.y / uniforms.resolution.y - frag.x / uniforms.resolution.x * 0.1 + 0.05;
  color = color + vec3f(0.1, 0.15, 0.25) * clamp(1.0 - 1.5 * (1.0 - gradient_y), 0.0, 1.0);
  color = color + vec3f(0.2, 0.25, 0.5) * clamp(1.0 - 3.5 * (1.0 - gradient_y), 0.0, 1.0);

  return vec4f(color, 1.0);
}

fn snoise3(v: vec3f) -> f32 {
    let C = vec2(1.0/6.0, 1.0/3.0) ;
    let D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    var i  = floor(v + dot(v, C.yyy) );
    let x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
    let g = step(x0.yzx, x0.xyz);
    let l = 1.0 - g;
    let i1 = min( g.xyz, l.zxy );
    let i2 = max( g.xyz, l.zxy );

    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    let x1 = x0 - i1 + C.xxx;
    let x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    let x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = mod289_3(i);
    let p = permute4( permute4( permute4(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    let n_ = 0.142857142857; // 1.0/7.0
    let  ns = n_ * D.wyz - D.xzx;

    let j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

    let x_ = floor(j * ns.z);
    let y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    let x = x_ *ns.x + ns.yyyy;
    let y = y_ *ns.x + ns.yyyy;
    let h = 1.0 - abs(x) - abs(y);

    let b0 = vec4( x.xy, y.xy );
    let b1 = vec4( x.zw, y.zw );

    //let s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
    //let s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
    let s0 = floor(b0)*2.0 + 1.0;
    let s1 = floor(b1)*2.0 + 1.0;
    let sh = -step(h, vec4(0.0));

    let a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    let a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    var p0 = vec3(a0.xy,h.x);
    var p1 = vec3(a0.zw,h.y);
    var p2 = vec3(a1.xy,h.z);
    var p3 = vec3(a1.zw,h.w);

    //Normalise gradients
    let norm = taylorInvSqrt4(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    var m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), vec4(0.0));
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}

fn mod289_3(x: vec3f) -> vec3f { return x - floor(x * (1.0 / 289.0)) * 289.0; }

fn permute4(x: vec4f) -> vec4f { return mod289_4(((x * 34.0) + 1.0) * x); }

fn taylorInvSqrt4(r: vec4f) -> vec4f { return 1.79284291400159 - 0.85373472095314 * r; }

fn mod289_4(x: vec4f) -> vec4f { return x - floor(x * (1.0 / 289.0)) * 289.0; }

fn worley3(p: vec3f) -> f32 { return 1.0-worley32(p).x; }

fn worley32(p: vec3f) -> vec2f {
    let n = floor( p );
    let f = fract( p );

    var distF1 = 1.0;
    var distF2 = 1.0;
    var off1 = vec3(0.0);
    var pos1 = vec3(0.0);
    var off2 = vec3(0.0);
    var pos2 = vec3(0.0);
    for(var k = -1; k <= 1; k++) {
        for(var j = -1; j <= 1; j++) {
            for(var i=-1; i <= 1; i++) {	
                let  g = vec3(f32(i), f32(j), f32(k));
                let  o = random33( n + g ) * WORLEY_JITTER;
                let  p = g + o;
                let d = distEuclidean3(p, f);
                if (d < distF1) {
                    distF2 = distF1;
                    distF1 = d;
                    off2 = off1;
                    off1 = g;
                    pos2 = pos1;
                    pos1 = p;
                }
                else if (d < distF2) {
                    distF2 = d;
                    off2 = g;
                    pos2 = p;
                }
            }
        }
    }

    return vec2(distF1, distF2);
}

fn random33(p_: vec3f) -> vec3f {
    var p = fract(p_ * RANDOM_SCALE.xyz);
    p += dot(p, p.yxz + 19.19);
    return fract((p.xxy + p.yzz) * p.zyx);
}

const WORLEY_JITTER: f32 = 1.0;

fn distEuclidean3(a: vec3f, b: vec3f) -> f32 { return distance(a, b); }

const RANDOM_SCALE: vec4f = vec4f(.1031, .1030, .0973, .1099);`,t=1,n=document.querySelector(`#app > canvas#sky`);if(!(n instanceof HTMLCanvasElement))throw document.body.innerHTML=`Canvas Sky: Element not found`,Error(`Canvas Sky: Element not found`);var r=n,i=document.querySelector(`#app > canvas#grass1`);if(!(i instanceof HTMLCanvasElement))throw document.body.innerHTML=`Canvas Grass1: Element not found`,Error(`Canvas Grass1: Element not found`);var a=i,o=document.querySelector(`#app > canvas#grass2`);if(!(o instanceof HTMLCanvasElement))throw document.body.innerHTML=`Canvas Grass2: Element not found`,Error(`Canvas Grass2: Element not found`);var s=o,c=document.querySelector(`#app > div#blob`);if(!(c instanceof HTMLDivElement))throw document.body.innerHTML=`Div Blob: Element not found`,Error(`Div Blob: Element not found`);var l=c,u=document.querySelector(`#app > div#blob > img#layer3`);if(!(u instanceof HTMLImageElement))throw document.body.innerHTML=`Img Blob Layer3: Element not found`,Error(`Img Blob Layer3: Element not found`);var d=u;function f(e,n){function r(){e.width=Math.floor(window.innerWidth*t),e.height=Math.floor(window.innerHeight*t),e.style.width=`${window.innerWidth}px`,e.style.height=`${window.innerHeight}px`,n?.()}r(),new ResizeObserver(r).observe(document.body)}async function p(){let n=await navigator.gpu.requestAdapter();if(!n)throw Error(`Canvas Sky: Failed to request GPU adapter`);let i=await n.requestDevice(),a=r.getContext(`webgpu`);if(!a)throw Error(`Canvas Sky: Failed to get WebGPU context`);let o=a,s=navigator.gpu.getPreferredCanvasFormat();o.configure({device:i,format:s,alphaMode:`opaque`}),f(r);let c=i.createShaderModule({code:e}),l=i.createShaderModule({code:`@vertex fn vs_main(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4f {
    var pos = array<vec2f, 4>(vec2f(-1.0,-1.0), vec2f(1.0,-1.0), vec2f(-1.0,1.0), vec2f(1.0,1.0));
    let p = pos[idx];
    return vec4f(p, 0.0, 1.0);
  }`}),u=i.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),d=i.createPipelineLayout({bindGroupLayouts:[u]}),p=i.createRenderPipeline({layout:d,vertex:{module:l,entryPoint:`vs_main`},fragment:{module:c,entryPoint:`fs_main`,targets:[{format:s}]},primitive:{topology:`triangle-strip`}}),m=i.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),h=i.createBindGroup({layout:u,entries:[{binding:0,resource:{buffer:m}}]}),g=new ArrayBuffer(16),_=new Float32Array(g),v=Date.now();async function y(){let e=(Date.now()-v)/1e3;_[0]=r.width*(2/t),_[1]=r.height*(2/t),_[2]=e,_[3]=t,i.queue.writeBuffer(m,0,g);let n=o.getCurrentTexture().createView(),a=i.createCommandEncoder(),s=a.beginRenderPass({colorAttachments:[{view:n,loadOp:`clear`,clearValue:{r:0,g:0,b:0,a:1},storeOp:`store`}]});s.setPipeline(p),s.setBindGroup(0,h),s.draw(4,1,0,0),s.end(),i.queue.submit([a.finish()]),await i.queue.onSubmittedWorkDone()}(async()=>{for(;;)await new Promise(e=>setTimeout(e,1/15*1e3)),y()})()}async function m(){let e=a.getContext(`2d`);if(!e)throw Error(`Canvas Grass1: Failed to get 2D context`);let n=e,r=s.getContext(`2d`);if(!r)throw Error(`Canvas Grass2: Failed to get 2D context`);let i=r;function o(e,t){return Math.sign(e)*Math.abs(e)**+t}function c(e,t,n){return e+(t-e)*n}function u(e,t,n){return[c(e[0],t[0],n),c(e[1],t[1],n),c(e[2],t[2],n)]}function p(e){let[t,n,r]=e;return`rgb(${t*255}, ${n*255}, ${r*255})`}let m=[],h=0,g=[];for(let e=0;e<8;e++)g.push({pos:[o(Math.random()-.25,1.5)+.25,Math.random()],r:Math.random(),seed:[Math.random(),Math.random(),Math.random(),Math.random()]});for(let e=0;e<2;e++)g.push({pos:[c(1.5,2.5,Math.random()),c(-.75,.25,Math.random())],r:Math.random(),seed:[Math.random(),Math.random(),Math.random(),Math.random()]});let _=75*t;function v(){m.splice(0,m.length);let e=a.height*.05,n=a.height*.2,r=30*t,i=0;for(let t=0;t<n+_;t+=r*(.02+4*(t/n)**1.5)){i++;for(let o=-(Math.random()+2)*r;o<a.width+2*r;o+=r*c(.9,1.1,Math.random())){let r=o/a.width,s=c(e,n,.5+.5*Math.sin(2.0943951024+-3.6651914292*r)),l=a.height-s+t+30*c(-1,1,Math.random());m.push({pos:[o,l,i],size:_*c(.75,1.25,Math.random()),seed:Math.random()})}}h=i}f(a,()=>{v()}),f(s);let y=Date.now();function b(){let e=(Date.now()-y)/1e3;n.clearRect(0,0,a.width,a.height),i.clearRect(0,0,a.width,a.height);for(let t of m){let{pos:[r,o,s],size:l,seed:d}=t,f=s/h>.5?i:n,m=r/a.width,g=c(15,45,.5+.5*Math.sin(5*m+2*d+.5*e))*(Math.PI/180),_=r-Math.sin(g)*l,v=o-Math.cos(g)*l,y=f.createLinearGradient(r,o,_,v),b=(s/h)**2;y.addColorStop(1,p(u(u([.075,.05,.3],[0,0,.1],b),[0,0,.3],m*.5))),y.addColorStop(0,p(u(u([.1,.1,.5],[.05,.02,.15],b),[0,0,.15],m*.5))),f.fillStyle=y,f.beginPath(),f.moveTo(r-l*.5,a.height),f.lineTo(r-l*.5,o),f.lineTo(r-l*.25,o),f.lineTo(_,v),f.lineTo(r+l*.25,o),f.lineTo(r+l*.5,o),f.lineTo(r+l*.5,a.height),f.closePath(),f.fill()}let r=`#1cff77`;for(let n of g){let{pos:[o,s],r:l,seed:[u,d,f,p]}=n,m=c(.05,.5,o)*a.width,h=(1-c(.2,.4,s))*a.height,g=c(.01,.0075,l)*Math.hypot(a.width,a.height),_=(.5+.5*Math.sin(u*2*Math.PI+c(1.5,3.5,u)*e))**2,v=p*2*Math.PI,y=v+c(.5,5,d)*e,b=v+c(.5,5,f)*e,x=m+Math.cos(y)*g,S=h+Math.sin(b)*g;i.globalAlpha=_,i.fillStyle=r,i.beginPath(),i.arc(x,S,c(1.5,2.5,_)*t,0,2*Math.PI),i.fill(),i.fillStyle=`#ffffff`,i.beginPath(),i.arc(x,S,c(0,1.5,_)*t,0,2*Math.PI),i.fill(),i.globalAlpha=_*.25;let C=c(0,30,_)*t,w=i.createRadialGradient(x,S,0,x,S,C);w.addColorStop(0,r),w.addColorStop(.5,`#1cff7744`),w.addColorStop(1,`#1cff7700`),i.fillStyle=w,i.beginPath(),i.arc(x,S,C,0,2*Math.PI),i.fill(),i.globalAlpha=1}l.style.transform=`translate(-50%, -50%) translateY(${5*Math.sin(1+.5*e)}px)`,d.style.transform=`translate(-50%, -50%) rotate(${c(-5,0,.5+.5*Math.sin(1*e))}deg)`}(async()=>{for(;;)await new Promise(e=>setTimeout(e,1/30*1e3)),b()})()}async function h(){try{await p()}catch(e){document.body.innerHTML=`Canvas Sky: Error: ${e instanceof Error?e.message:String(e)}`;return}try{await m()}catch(e){document.body.innerHTML=`Canvas Grass: Error: ${e instanceof Error?e.message:String(e)}`;return}}h();