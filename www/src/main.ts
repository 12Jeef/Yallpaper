import "./style.css";
import vertexShaderSource from "./glsl/main.vert";
import fragmentShaderSource from "./glsl/main.frag";

const canvasBg = document.querySelector("#app > canvas#bg");
if (!(canvasBg instanceof HTMLCanvasElement)) {
  document.body.innerHTML = "Canvas (BG) element not found";
  throw new Error("Canvas (BG) element not found");
}
const gl = canvasBg.getContext("webgl");
if (!gl) {
  document.body.innerHTML = "Failed to get canvas (BG) context";
  throw new Error("Failed to get canvas (BG) context");
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Failed to create shader");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    document.body.innerHTML =
      "Failed to compile shader: " + gl.getShaderInfoLog(shader);
    throw new Error("Failed to compile shader" + gl.getShaderInfoLog(shader));
  }
  return shader;
}

const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);

gl.useProgram(program);

const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

const positionLoc = gl.getAttribLocation(program, "u_position");
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

const timeLoc = gl.getUniformLocation(program, "u_time");
const resolutionLoc = gl.getUniformLocation(program, "u_resolution");

const tStart = Date.now() / 1e3;
const render = () => {
  const t = Date.now() / 1e3 - tStart;

  gl.viewport(0, 0, canvasBg.width, canvasBg.height);

  gl.uniform1f(timeLoc, t);
  gl.uniform2f(resolutionLoc, canvasBg.width, canvasBg.height);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};
const update = () => {
  window.requestAnimationFrame(update);
  render();
};
update();

const onResize = () => {
  canvasBg.style.width = `${window.innerWidth}px`;
  canvasBg.style.height = `${window.innerHeight}px`;
  canvasBg.width = window.innerWidth * window.devicePixelRatio;
  canvasBg.height = window.innerHeight * window.devicePixelRatio;
  render();
};
onResize();
const observer = new ResizeObserver(() => {
  onResize();
});
observer.observe(document.body);
