/// <reference types="@webgpu/types" />

import "./style.css";
import wgsl from "./wsgl/main.wesl?static";

// const cnsl = document.getElementById("console")!;

const possibleSkyCanvas = document.querySelector(
  "#app > canvas#sky",
) as HTMLCanvasElement | null;
if (!(possibleSkyCanvas instanceof HTMLCanvasElement)) {
  document.body.innerHTML = "Canvas Sky: Element not found";
  throw new Error("Canvas Sky: Element not found");
}
const skyCanvas = possibleSkyCanvas;

const possibleGrassCanvas = document.querySelector(
  "#app > canvas#grass",
) as HTMLCanvasElement | null;
if (!(possibleGrassCanvas instanceof HTMLCanvasElement)) {
  document.body.innerHTML = "Canvas Grass: Element not found";
  throw new Error("Canvas Grass: Element not found");
}
const grassCanvas = possibleGrassCanvas;

function initCanvas(canvas: HTMLCanvasElement, onResize?: () => void) {
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    onResize?.();
  }
  resize();
  new ResizeObserver(resize).observe(document.body);
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

  const uniformBufferSize = 16; // vec2 + float + padding
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

    f32[0] = skyCanvas.width;
    f32[1] = skyCanvas.height;
    f32[2] = t;
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
  const possibleCtx = grassCanvas.getContext("2d");
  if (!possibleCtx) throw new Error("Canvas Grass: Failed to get 2D context");
  const ctx = possibleCtx;

  // type vec2 = [number, number];
  type vec3 = [number, number, number];
  // type vec4 = [number, number, number, number];

  // function nToVec2(v: number): vec2 {
  //   return [v, v];
  // }
  // function nToVec3(v: number): vec3 {
  //   return [v, v, v];
  // }

  function mixN(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  // function mixVec2(a: vec2, b: vec2, t: number): vec2 {
  //   return [mixN(a[0], b[0], t), mixN(a[1], b[1], t)];
  // }
  function mixVec3(a: vec3, b: vec3, t: number): vec3 {
    return [mixN(a[0], b[0], t), mixN(a[1], b[1], t), mixN(a[2], b[2], t)];
  }
  // function mixVec4(a: vec4, b: vec4, t: number): vec4 {
  //   return [
  //     mixN(a[0], b[0], t),
  //     mixN(a[1], b[1], t),
  //     mixN(a[2], b[2], t),
  //     mixN(a[3], b[3], t),
  //   ];
  // }

  function rgb(v: vec3): string {
    const [r, g, b] = v;
    return `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
  }

  type Grass = {
    pos: vec3;
    seed: number;
    size: number;
  };
  // type Firefly = {
  //   pos: vec2;
  //   r: number;
  //   seed: vec4;
  // };

  const grass: Grass[] = [];
  let zMax = 0;

  // const fireflies: Firefly[] = [];
  // for (let i = 0; i < 3; i++) {
  //   fireflies.push({
  //     pos: [Math.random(), Math.random()],
  //     r: Math.random(),
  //     seed: [Math.random(), Math.random(), Math.random(), Math.random()],
  //   });
  // }

  const size = 75 * (window.devicePixelRatio || 1);

  function generateGrass() {
    grass.splice(0, grass.length);
    const hMin = grassCanvas.height * 0.05;
    const hMax = grassCanvas.height * 0.2;
    const spacing = 30 * (window.devicePixelRatio || 1);
    let z = 0;
    for (
      let yShift = 0;
      yShift < hMax + size;
      yShift += spacing * (0.02 + 4 * Math.pow(yShift / hMax, 1.5))
    ) {
      z++;
      for (
        let x = -(Math.random() + 2) * spacing;
        x < grassCanvas.width + 2 * spacing;
        x += spacing * mixN(0.9, 1.1, Math.random())
      ) {
        const xT = x / grassCanvas.width;
        const yT =
          0.5 +
          0.5 * Math.sin(2.0943951024 + (-1.5707963268 - 2.0943951024) * xT);
        const h = mixN(hMin, hMax, yT);
        const y =
          grassCanvas.height - h + yShift + 30 * mixN(-1, 1, Math.random());
        grass.push({
          pos: [x, y, z],
          size: size * mixN(0.75, 1.25, Math.random()),
          seed: Math.random(),
        });
      }
    }
    zMax = z;
  }

  initCanvas(grassCanvas, () => {
    generateGrass();
  });

  const tStart = Date.now();
  function frame() {
    const t = (Date.now() - tStart) / 1e3;

    ctx.clearRect(0, 0, grassCanvas.width, grassCanvas.height);
    for (const g of grass) {
      const {
        pos: [x, y, z],
        size,
        seed,
      } = g;
      const xT = x / grassCanvas.width;
      const theta =
        mixN(15, 45, 0.5 + 0.5 * Math.sin(5 * xT + 2 * seed + 0.5 * t)) *
        (Math.PI / 180);
      const x0 = x - Math.sin(theta) * size;
      const y0 = y - Math.cos(theta) * size;
      const gr = ctx.createLinearGradient(x, y, x0, y0);
      const zT = Math.pow(z / zMax, 2);
      gr.addColorStop(
        1,
        rgb(
          mixVec3(
            mixVec3([0.075, 0.05, 0.3], [0, 0, 0.1], zT),
            [0, 0, 0.3],
            xT * 0.5,
          ),
        ),
      );
      gr.addColorStop(
        0,
        rgb(
          mixVec3(
            mixVec3([0.1, 0.1, 0.5], [0.05, 0.02, 0.15], zT),
            [0, 0, 0.15],
            xT * 0.5,
          ),
        ),
      );
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(x - size * 0.5, grassCanvas.height);
      ctx.lineTo(x - size * 0.5, y);
      ctx.lineTo(x - size * 0.25, y);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x + size * 0.25, y);
      ctx.lineTo(x + size * 0.5, y);
      ctx.lineTo(x + size * 0.5, grassCanvas.height);
      ctx.closePath();
      ctx.fill();
    }
    // ctx.fillStyle = "";
    // for (const firefly of fireflies) {
    //   const {
    //     pos: [xT, yT],
    //     r: rT,
    //     seed: [blinkT, txT, tyT, tT],
    //   } = firefly;
    // }
  }
  (async () => {
    while (true) {
      await new Promise((res) => setTimeout(res, (1 / 15) * 1e3));
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
