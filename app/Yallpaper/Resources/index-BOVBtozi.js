(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`

struct Uniforms {
  resolution: vec2f,
  time: f32,
  _pad: f32,
}
;



@group(0) @binding(0) var<uniform> uniforms: Uniforms;

const PI: f32 = 3.141592653589793;

// FBM port matching lygia/generative/fbm.glsl defaults (4 octaves, amplitude 0.5, scale 2.0)


fn fbm3(p_in: vec3f) -> f32 {
  var value: f32 = 0.0;
  var amplitude: f32 = 0.5;
  var pos: vec3f = p_in;
  for (var i: i32 = 0; i < 4; i = i + 1) {
    value = value + amplitude * snoise3(pos);
    pos = pos * 2.0;
    amplitude = amplitude * 0.5;
  }
  return value;
}

fn project(coord: vec2f) -> vec3f {
  let origin = uniforms.resolution * vec2f(1.5, 3.5);
  let r = length(coord - origin);
  let theta = atan2(coord.y - origin.y, coord.x - origin.x);
  let theta_low = atan2(0.0 - origin.y, uniforms.resolution.x - origin.x);
  let theta_high = atan2(uniforms.resolution.y - origin.y, 0.0 - origin.x);
  let theta_t = ((theta - theta_low) / (theta_high - theta_low) + 0.1 - 0.5) * (1.0 - 0.25 * r / length(uniforms.resolution * 0.5 - origin)) + 0.5;
  let y = theta_t * length(uniforms.resolution);
  return vec3f(r, y, theta_t);
}

fn atan2(y: f32, x: f32) -> f32 {
  if (x > 0.0) {
    return atan(y / x);
  } else if (x < 0.0 && y >= 0.0) {
    return atan(y / x) + PI;
  } else if (x < 0.0 && y < 0.0) {
    return atan(y / x) - PI;
  } else if (x == 0.0 && y > 0.0) {
    return PI * 0.5;
  } else if (x == 0.0 && y < 0.0) {
    return -PI * 0.5;
  }
  return 0.0;
}

fn stars(coord: vec2f, noise_scale: f32, size: f32, edge: f32) -> f32 {
  let size_coord = coord / 3000.0 / noise_scale;
  let points_coord = coord / 500.0 / noise_scale;

  let star_size = fbm3(vec3f(size_coord.x, size_coord.y, uniforms.time * 0.01));
  let star_points = worley3(vec3f(points_coord.x, points_coord.y, uniforms.time * 0.01)) * (star_size * 0.75 + mix(0.5, 0.875, size));

  return pow(max(0.0, star_points), edge);
}

fn cloud(coord: vec2f, scale: vec2f, edge: f32) -> f32 {
  let noise_coord = coord / 1000.0 / scale;
  return pow(fbm3(vec3f(noise_coord.x, noise_coord.y, uniforms.time * 0.01)) * 0.5 + 0.5, edge);
}

@fragment fn fs_main(@builtin(position)pos: vec4f) -> @location(0) vec4f {
  var color = vec3f(0.0, 0.0, 0.1);

  let frag = vec2f(pos.x, pos.y);
  let proj_coord_data = project(frag);
  let proj_coord = proj_coord_data.xy;
  let theta_t = proj_coord_data.z;

  let milky_way_mask = pow(1.0 / (1.0 + abs(theta_t - 0.5) * 2.0), 4.0) * 2.0;

  let milky_way_1 = cloud(proj_coord + vec2f(200.0, 0.0) * uniforms.time, vec2f(2.0, 0.5), 5.0) * 0.5 * milky_way_mask + 0.1 * milky_way_mask;
  color = color + milky_way_1 * vec3f(mix(0.4, 0.8, milky_way_1), 0.6, 1.0) * 0.75;

  let milky_way_2 = cloud(proj_coord + vec2f(100.0, 0.0) * uniforms.time, vec2f(4.0, 2.0), 3.0) * 0.75 * milky_way_mask + 0.1 * milky_way_mask;
  color = color + milky_way_2 * vec3f(mix(0.2, 0.4, milky_way_2), 0.1 * milky_way_2, 0.75) * 1.0;

  var milky_way_3 = cloud(proj_coord + vec2f(25.0, 0.0) * uniforms.time, vec2f(0.5, 0.5), 3.0) * 0.75 * pow(milky_way_mask / 2.0 + 0.5, 7.0);
  milky_way_3 = clamp(milky_way_3, 0.0, 2.0);
  color = color + milky_way_3 * vec3f(1.0, mix(0.4, 0.8, milky_way_3), mix(0.25, 0.75, milky_way_3)) * 0.5;

  let milky_way = min(2.0, milky_way_1 * 1.5 + milky_way_2 * 0.5);

  let stars_1 = stars(vec2f(pos.x, pos.y), 0.05, 1.0, 15.0) * milky_way;
  color = color + stars_1 * vec3f(1.0, mix(0.1, 0.8, stars_1), mix(0.0, 1.0, stars_1));

  let stars_2 = stars(vec2f(pos.x, pos.y), 0.05, 2.0, 15.0) * pow(milky_way + 0.25, 10.0);
  color = color + stars_2 * vec3f(mix(0.25, 1.0, stars_2), 0.9, 1.0);

  let milky_way_4 = cloud(proj_coord + vec2f(10.0, 0.0) * uniforms.time, vec2f(0.5, 0.25), 3.0) * pow(milky_way_mask / 2.0 + 0.75, 4.0);
  color = mix(color, mix(vec3f(0.05, 0.0, 0.2), vec3f(0.0, 0.0, 0.2), pow(clamp(milky_way_4 - 1.0, 0.0, 1.0), 3.0)), clamp(milky_way_4, 0.0, 1.0));

  let gradient_y = pos.y / uniforms.resolution.y - pos.x / uniforms.resolution.x * 0.1 + 0.05;
  color = color + vec3f(0.0, 0.15, 0.2) * clamp(1.0 - 1.5 * (1.0 - gradient_y), 0.0, 1.0);
  color = color + vec3f(0.05, 0.15, 0.2) * clamp(1.0 - 3.5 * (1.0 - gradient_y), 0.0, 1.0);

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

const RANDOM_SCALE: vec4f = vec4f(.1031, .1030, .0973, .1099);`,t=document.querySelector(`#app > canvas#sky`);if(!(t instanceof HTMLCanvasElement))throw document.body.innerHTML=`Canvas Sky: Element not found`,Error(`Canvas Sky: Element not found`);var n=t,r=document.querySelector(`#app > canvas#grass`);if(!(r instanceof HTMLCanvasElement))throw document.body.innerHTML=`Canvas Grass: Element not found`,Error(`Canvas Grass: Element not found`);var i=r;function a(e,t){function n(){let n=window.devicePixelRatio||1;e.width=Math.floor(window.innerWidth*n),e.height=Math.floor(window.innerHeight*n),e.style.width=`${window.innerWidth}px`,e.style.height=`${window.innerHeight}px`,t?.()}n(),new ResizeObserver(n).observe(document.body)}async function o(){let t=await navigator.gpu.requestAdapter();if(!t)throw Error(`Canvas Sky: Failed to request GPU adapter`);let r=await t.requestDevice(),i=n.getContext(`webgpu`);if(!i)throw Error(`Canvas Sky: Failed to get WebGPU context`);let o=i,s=navigator.gpu.getPreferredCanvasFormat();o.configure({device:r,format:s,alphaMode:`opaque`}),a(n);let c=r.createShaderModule({code:e}),l=r.createShaderModule({code:`@vertex fn vs_main(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4f {
    var pos = array<vec2f, 4>(vec2f(-1.0,-1.0), vec2f(1.0,-1.0), vec2f(-1.0,1.0), vec2f(1.0,1.0));
    let p = pos[idx];
    return vec4f(p, 0.0, 1.0);
  }`}),u=r.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),d=r.createPipelineLayout({bindGroupLayouts:[u]}),f=r.createRenderPipeline({layout:d,vertex:{module:l,entryPoint:`vs_main`},fragment:{module:c,entryPoint:`fs_main`,targets:[{format:s}]},primitive:{topology:`triangle-strip`}}),p=r.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),m=r.createBindGroup({layout:u,entries:[{binding:0,resource:{buffer:p}}]}),h=performance.now(),g=0;function _(){requestAnimationFrame(_);let e=(performance.now()-h)/1e3;if(e-g<1/15)return;g=e;let t=new ArrayBuffer(16),i=new Float32Array(t);i[0]=n.width,i[1]=n.height,i[2]=e,r.queue.writeBuffer(p,0,t);let a=r.createCommandEncoder(),s=o.getCurrentTexture().createView(),c=a.beginRenderPass({colorAttachments:[{view:s,loadOp:`clear`,clearValue:{r:0,g:0,b:0,a:1},storeOp:`store`}]});c.setPipeline(f),c.setBindGroup(0,m),c.draw(4,1,0,0),c.end(),r.queue.submit([a.finish()])}requestAnimationFrame(_)}async function s(){let e=i.getContext(`2d`);if(!e)throw Error(`Canvas Grass: Failed to get 2D context`);let t=e;function n(e,t,n){return e+(t-e)*n}function r(e,t,r){return[n(e[0],t[0],r),n(e[1],t[1],r),n(e[2],t[2],r)]}function o(e){let[t,n,r]=e;return`rgb(${t*255}, ${n*255}, ${r*255})`}let s=[],c=0,l=75*(window.devicePixelRatio||1);function u(){s.splice(0,s.length);let e=i.height*.05,t=i.height*.2,r=30*(window.devicePixelRatio||1),a=0;for(let o=0;o<t+l;o+=r*(.02+4*(o/t)**1.5)){a++;for(let c=-(Math.random()+2)*r;c<i.width+2*r;c+=r*n(.9,1.1,Math.random())){let r=c/i.width,u=n(e,t,.5+.5*Math.sin(2.0943951024+-3.6651914292*r)),d=i.height-u+o+30*n(-1,1,Math.random());s.push({pos:[c,d,a],size:l*n(.75,1.25,Math.random()),seed:Math.random()})}}c=a}a(i,()=>{u()});let d=performance.now(),f=0;function p(){requestAnimationFrame(p);let e=(performance.now()-d)/1e3;if(!(e-f<1/15)){f=e,t.clearRect(0,0,i.width,i.height);for(let a of s){let{pos:[s,l,u],size:d,seed:f}=a,p=s/i.width,m=n(15,45,.5+.5*Math.sin(5*p+2*f+.5*e))*(Math.PI/180),h=s-Math.sin(m)*d,g=l-Math.cos(m)*d,_=t.createLinearGradient(s,l,h,g),v=(u/c)**2;_.addColorStop(1,o(r(r([.075,.05,.2],[0,0,.1],v),[0,0,.15],p*.5))),_.addColorStop(0,o(r(r([.1,.1,.5],[.05,.02,.15],v),[0,0,.15],p*.5))),t.fillStyle=_,t.beginPath(),t.moveTo(s-d*.5,i.height),t.lineTo(s-d*.5,l),t.lineTo(s-d*.25,l),t.lineTo(h,g),t.lineTo(s+d*.25,l),t.lineTo(s+d*.5,l),t.lineTo(s+d*.5,i.height),t.closePath(),t.fill()}}}requestAnimationFrame(p)}async function c(){try{await o()}catch(e){document.body.innerHTML=`Canvas Sky: Error: ${e instanceof Error?e.message:String(e)}`;return}try{await s()}catch(e){document.body.innerHTML=`Canvas Grass: Error: ${e instanceof Error?e.message:String(e)}`;return}}c();