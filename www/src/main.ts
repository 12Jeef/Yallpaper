/// <reference types="@webgpu/types" />

import "./style.css";
import wgsl from "./wsgl/main.wesl?static";

// const cnsl = document.getElementById("console")!;

const dpr = 1; // window.devicePixelRatio || 1;

const possibleSkyCanvas = document.querySelector(
  "#app > canvas#sky",
) as HTMLCanvasElement | null;
if (!(possibleSkyCanvas instanceof HTMLCanvasElement)) {
  document.body.innerHTML = "Canvas Sky: Element not found";
  throw new Error("Canvas Sky: Element not found");
}
const skyCanvas = possibleSkyCanvas;

const possibleGrass1Canvas = document.querySelector(
  "#app > canvas#grass1",
) as HTMLCanvasElement | null;
if (!(possibleGrass1Canvas instanceof HTMLCanvasElement)) {
  document.body.innerHTML = "Canvas Grass1: Element not found";
  throw new Error("Canvas Grass1: Element not found");
}
const grass1Canvas = possibleGrass1Canvas;

const possibleGrass2Canvas = document.querySelector(
  "#app > canvas#grass2",
) as HTMLCanvasElement | null;
if (!(possibleGrass2Canvas instanceof HTMLCanvasElement)) {
  document.body.innerHTML = "Canvas Grass2: Element not found";
  throw new Error("Canvas Grass2: Element not found");
}
const grass2Canvas = possibleGrass2Canvas;

const possibleBlob = document.querySelector(
  "#app > div#blob",
) as HTMLDivElement | null;
if (!(possibleBlob instanceof HTMLDivElement)) {
  document.body.innerHTML = "Div Blob: Element not found";
  throw new Error("Div Blob: Element not found");
}
const blob = possibleBlob;

const possibleBlobLayer3 = document.querySelector(
  "#app > div#blob > div#layer3",
) as HTMLDivElement | null;
if (!(possibleBlobLayer3 instanceof HTMLDivElement)) {
  document.body.innerHTML = "Div Blob Layer3: Element not found";
  throw new Error("Div Blob Layer3: Element not found");
}
const blobLayer3 = possibleBlobLayer3;

const blobFirstChildren = Array.from(
  document.querySelectorAll("#app > div#blob > div > img:first-child"),
) as HTMLElement[];
const blobLastChildren = Array.from(
  document.querySelectorAll("#app > div#blob > div > img:last-child"),
) as HTMLElement[];

function initCanvas(canvas: HTMLCanvasElement, onResize?: () => void) {
  function resize() {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    onResize?.();
  }
  resize();
  new ResizeObserver(resize).observe(document.body);
}

function getToD() {
  return 0; // 0.5 + 0.5 * Math.sin(1 * (Date.now() / 1e3));
}

async function initSky() {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("Canvas Sky: Failed to request GPU adapter");
  const device = await adapter.requestDevice();

  const possibleCtx = skyCanvas.getContext("webgpu");
  if (!possibleCtx) throw new Error("Canvas Sky: Failed to get WebGPU context");
  const ctx = possibleCtx;
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: "opaque" });

  initCanvas(skyCanvas);

  const fragModule = device.createShaderModule({ code: wgsl });
  const vsCode = `@vertex fn vs_main(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4f {
    var pos = array<vec2f, 4>(vec2f(-1.0,-1.0), vec2f(1.0,-1.0), vec2f(-1.0,1.0), vec2f(1.0,1.0));
    let p = pos[idx];
    return vec4f(p, 0.0, 1.0);
  }`;
  const vsModule = device.createShaderModule({ code: vsCode });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: { module: vsModule, entryPoint: "vs_main" },
    fragment: {
      module: fragModule,
      entryPoint: "fs_main",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-strip" },
  });

  const uniformBufferSize = 24; // vec2 (resolution) + float (time) + float (dpr) + float (tod)
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  const u8 = new ArrayBuffer(uniformBufferSize);
  const f32 = new Float32Array(u8);

  const tStart = Date.now();
  async function frame() {
    const t = (Date.now() - tStart) / 1e3;

    f32[0] = skyCanvas.width * (2 / dpr);
    f32[1] = skyCanvas.height * (2 / dpr);
    f32[2] = t;
    f32[3] = dpr;
    f32[4] = getToD();
    device.queue.writeBuffer(uniformBuffer, 0, u8);

    const view = ctx.getCurrentTexture().createView();
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view,
          loadOp: "clear",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(4, 1, 0, 0);
    pass.end();
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
  }
  (async () => {
    while (true) {
      await new Promise((res) => setTimeout(res, (1 / 15) * 1e3));
      frame();
    }
  })();
}

async function initGrass() {
  const possibleCtx1 = grass1Canvas.getContext("2d");
  if (!possibleCtx1) throw new Error("Canvas Grass1: Failed to get 2D context");
  const ctx1 = possibleCtx1;
  const possibleCtx2 = grass2Canvas.getContext("2d");
  if (!possibleCtx2) throw new Error("Canvas Grass2: Failed to get 2D context");
  const ctx2 = possibleCtx2;

  function sigpow(x: number, v: number): number {
    return Math.sign(x) * Math.pow(Math.abs(x), v);
  }

  type vec2 = [number, number];
  type vec3 = [number, number, number];
  type vec4 = [number, number, number, number];

  function mixN(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  function mixVec3(a: vec3, b: vec3, t: number): vec3 {
    return [mixN(a[0], b[0], t), mixN(a[1], b[1], t), mixN(a[2], b[2], t)];
  }
  function multiMixN(t: number, values: number[]): number {
    if (values.length <= 0) return 0;
    if (values.length === 1) return values[0];
    const n = values.length;
    const i = Math.floor(t * (n - 1));
    if (i < 0) return values[0];
    if (i + 1 > n - 1) return values[n - 1];
    return mixN(values[i], values[i + 1], t * (n - 1) - i);
  }
  function multiMixVec3(t: number, values: vec3[]): vec3 {
    const x = values.map((v) => v[0]);
    const y = values.map((v) => v[1]);
    const z = values.map((v) => v[2]);
    return [multiMixN(t, x), multiMixN(t, y), multiMixN(t, z)];
  }

  function rgb(v: vec3): string {
    const [r, g, b] = v;
    return `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
  }

  type Grass = {
    pos: vec3;
    seed: number;
    size: number;
  };
  type Firefly = {
    pos: vec2;
    r: number;
    seed: vec4;
  };

  const grass: Grass[] = [];
  let zMax = 0;

  const fireflies: Firefly[] = [];
  for (let i = 0; i < 10; i++) {
    fireflies.push({
      pos: [sigpow(Math.random() - 0.35, 1.5) + 0.35, Math.random()],
      r: Math.random(),
      seed: [Math.random(), Math.random(), Math.random(), Math.random()],
    });
  }
  for (let i = 0; i < 3; i++) {
    fireflies.push({
      pos: [mixN(1.5, 2.5, Math.random()), mixN(-0.75, 0.25, Math.random())],
      r: Math.random(),
      seed: [Math.random(), Math.random(), Math.random(), Math.random()],
    });
  }

  const size = 75 * dpr;

  function generateGrass() {
    grass.splice(0, grass.length);
    const hMin = grass1Canvas.height * 0.05;
    const hMax = grass1Canvas.height * 0.2;
    const spacing = 30 * dpr;
    let z = 0;
    for (
      let yShift = 0;
      yShift < hMax + size;
      yShift += spacing * (0.02 + 4 * Math.pow(yShift / hMax, 1.5))
    ) {
      z++;
      for (
        let x = -(Math.random() + 2) * spacing;
        x < grass1Canvas.width + 2 * spacing;
        x += spacing * mixN(0.9, 1.1, Math.random())
      ) {
        const xT = x / grass1Canvas.width;
        const yT =
          0.5 +
          0.5 * Math.sin(2.0943951024 + (-1.5707963268 - 2.0943951024) * xT);
        const h = mixN(hMin, hMax, yT);
        const y =
          grass1Canvas.height - h + yShift + 30 * mixN(-1, 1, Math.random());
        grass.push({
          pos: [x, y, z],
          size: size * mixN(0.75, 1.25, Math.random()),
          seed: Math.random(),
        });
      }
    }
    zMax = z;
  }

  initCanvas(grass1Canvas, () => {
    generateGrass();
  });
  initCanvas(grass2Canvas);

  const tStart = Date.now();
  function frame() {
    const t = (Date.now() - tStart) / 1e3;

    const tod = getToD();

    ctx1.clearRect(0, 0, grass1Canvas.width, grass1Canvas.height);
    ctx2.clearRect(0, 0, grass1Canvas.width, grass1Canvas.height);
    for (const g of grass) {
      const {
        pos: [x, y, z],
        size,
        seed,
      } = g;
      const ctx = z / zMax > 0.5 ? ctx2 : ctx1;
      const xT = x / grass1Canvas.width;
      const theta =
        mixN(15, 45, 0.5 + 0.5 * Math.sin(5 * xT + 2 * seed + 0.5 * t)) *
        (Math.PI / 180);
      const x0 = x - Math.sin(theta) * size;
      const y0 = y - Math.cos(theta) * size;
      const gr = ctx.createLinearGradient(x, y, x0, y0);
      const zT = Math.pow(z / zMax, 2);
      const darkTip = mixVec3(
        mixVec3([0.075, 0.05, 0.3], [0, 0, 0.1], zT),
        [0, 0, 0.3],
        xT * 0.5,
      );
      const darkBase = mixVec3(
        mixVec3([0.1, 0.1, 0.5], [0.05, 0.02, 0.15], zT),
        [0, 0, 0.15],
        xT * 0.5,
      );
      const lightTip = mixVec3(
        mixVec3([0.75, 1, 0.1], [0.5, 0.75, 0.1], zT),
        [0.75, 1, 0.5],
        xT * 0.5,
      );
      const lightBase = mixVec3(
        mixVec3([0.5, 0.75, 0.3], [0.1, 0.5, 0.5], zT),
        [0.75, 1, 0.5],
        xT * 0.5,
      );
      gr.addColorStop(
        1,
        rgb(
          multiMixVec3(tod, [
            darkTip,
            mixVec3(
              mixVec3([1, 0.5, 0.1], [0.5, 0.1, 0.25], zT),
              [0.25, 0, 0.25],
              xT * 0.5,
            ),
            mixVec3(
              mixVec3([1, 0.75, 0.1], [1, 0.5, 0.1], zT),
              [0.5, 0.1, 0.25],
              xT * 0.5,
            ),
            lightTip,
          ]),
        ),
      );
      gr.addColorStop(
        0,
        rgb(
          multiMixVec3(tod, [
            darkBase,
            mixVec3(
              mixVec3([0.5, 0.1, 0.25], [0.25, 0.1, 0.25], zT),
              [0.25, 0, 0.25],
              xT * 0.5,
            ),
            mixVec3(
              mixVec3([1, 0.5, 0.1], [0.5, 0.1, 0.25], zT),
              [0.5, 0.1, 0.25],
              xT * 0.5,
            ),
            lightBase,
          ]),
        ),
      );
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(x - size * 0.5, grass1Canvas.height);
      ctx.lineTo(x - size * 0.5, y);
      ctx.lineTo(x - size * 0.25, y);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x + size * 0.25, y);
      ctx.lineTo(x + size * 0.5, y);
      ctx.lineTo(x + size * 0.5, grass1Canvas.height);
      ctx.closePath();
      ctx.fill();
    }
    const green = "#1cff77";
    for (const firefly of fireflies) {
      const {
        pos: [xT, yT],
        r: rT,
        seed: [blinkT, txT, tyT, tT],
      } = firefly;
      const cx = mixN(0, 0.5, xT) * grass1Canvas.width;
      const cy = (1 - mixN(0.2, 0.4, yT)) * grass1Canvas.height;
      const r =
        mixN(0.01, 0.0075, rT) *
        Math.hypot(grass1Canvas.width, grass1Canvas.height);
      const blink =
        Math.pow(
          0.5 +
            0.5 * Math.sin(blinkT * 2 * Math.PI + mixN(1.5, 3.5, blinkT) * t),
          2,
        ) * mixN(1, 0, tod);
      const tBase = tT * 2 * Math.PI;
      const tx = tBase + mixN(0.5, 5, txT) * t;
      const ty = tBase + mixN(0.5, 5, tyT) * t;
      const x = cx + Math.cos(tx) * r;
      const y = cy + Math.sin(ty) * r;
      ctx2.globalAlpha = blink;
      ctx2.fillStyle = green;
      ctx2.beginPath();
      ctx2.arc(x, y, mixN(1.5, 2.5, blink) * dpr, 0, 2 * Math.PI);
      ctx2.fill();
      ctx2.fillStyle = "#ffffff";
      ctx2.beginPath();
      ctx2.arc(x, y, mixN(0, 1.5, blink) * dpr, 0, 2 * Math.PI);
      ctx2.fill();
      ctx2.globalAlpha = blink * 0.25;
      const bloom = mixN(0, 30, blink) * dpr;
      const gr = ctx2.createRadialGradient(x, y, 0, x, y, bloom);
      gr.addColorStop(0, green);
      gr.addColorStop(0.5, green + "44");
      gr.addColorStop(1, green + "00");
      ctx2.fillStyle = gr;
      ctx2.beginPath();
      ctx2.arc(x, y, bloom, 0, 2 * Math.PI);
      ctx2.fill();
      ctx2.globalAlpha = 1;
    }

    blob.style.transform = `translate(-50%, -50%) translateY(${5 * Math.sin(1 + 0.5 * t)}px)`;
    blobLayer3.style.transform = `translate(-50%, -50%) rotate(${mixN(-5, 0, 0.5 + 0.5 * Math.sin(1 * t))}deg)`;

    blob.style.filter = `contrast(${multiMixN(tod, [1.2, 1.3, 1.1])}) hue-rotate(${multiMixN(tod, [5, -25, -25])}deg) brightness(${multiMixN(tod, [1, 0.85, 1.1])})`;

    blobFirstChildren.forEach(
      (child) => (child.style.opacity = String(multiMixN(tod, [1, 0.25, 0]))),
    );
    blobLastChildren.forEach(
      (child) => (child.style.opacity = String(multiMixN(tod, [0, 0.75, 1]))),
    );
  }
  (async () => {
    while (true) {
      await new Promise((res) => setTimeout(res, (1 / 30) * 1e3));
      frame();
    }
  })();
}

async function init() {
  try {
    await initSky();
  } catch (err) {
    document.body.innerHTML = `Canvas Sky: Error: ${err instanceof Error ? err.message : String(err)}`;
    return;
  }
  try {
    await initGrass();
  } catch (err) {
    document.body.innerHTML = `Canvas Grass: Error: ${err instanceof Error ? err.message : String(err)}`;
    return;
  }
}

init();
