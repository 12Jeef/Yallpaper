/// <reference types="@webgpu/types" />

import "./style.css";
import wgsl from "./wsgl/main.wesl?static";

const possibleCanvas = document.querySelector(
  "#app > canvas#bg",
) as HTMLCanvasElement | null;
if (!(possibleCanvas instanceof HTMLCanvasElement)) {
  document.body.innerHTML = "Canvas BG: Element not found";
  throw new Error("Canvas BG: Element not found");
}
const canvas = possibleCanvas;

async function initWebGPU() {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("Canvas BG: Failed to request GPU adapter");
  const device = await adapter.requestDevice();

  const possibleCtx = canvas.getContext("webgpu");
  if (!possibleCtx) throw new Error("Canvas BG: Failed to get WebGPU context");
  const ctx = possibleCtx;
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: "opaque" });

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

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }
  resize();
  new ResizeObserver(resize).observe(document.body);

  const tStart = performance.now();
  let tLast = 0;
  function frame() {
    requestAnimationFrame(frame);

    const t = (performance.now() - tStart) / 1e3;
    if (t - tLast < 1 / 15) return;
    tLast = t;

    const u8 = new ArrayBuffer(uniformBufferSize);
    const f32 = new Float32Array(u8);
    f32[0] = canvas.width;
    f32[1] = canvas.height;
    f32[2] = t;
    device.queue.writeBuffer(uniformBuffer, 0, u8);

    const encoder = device.createCommandEncoder();
    const view = ctx.getCurrentTexture().createView();
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
  }
  requestAnimationFrame(frame);
}

async function init() {
  try {
    await initWebGPU();
  } catch (err) {
    document.body.innerHTML = `Canvas BG: WebGPU initialization failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

init();
