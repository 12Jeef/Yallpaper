#ifdef GL_ES
precision mediump float;
#endif

#define ANGLE 0.2617993878
#define NOISE_SCALE 0.5
#define Y_SCALE 5.0

uniform float u_time;
uniform vec2 u_resolution;

#include "lygia/generative/fbm.glsl"

void main(void) {
  vec2 rotated = vec2(
    cos(ANGLE) * (gl_FragCoord.x - u_resolution.x / 2.0) - sin(ANGLE) * (gl_FragCoord.y - u_resolution.y / 2.0),
    sin(ANGLE) * (gl_FragCoord.x - u_resolution.x / 2.0) + cos(ANGLE) * (gl_FragCoord.y - u_resolution.y / 2.0)
  ) + u_resolution / 2.0;
  vec2 uv = rotated / u_resolution.xy;
  vec2 coord = rotated / 500.0 * NOISE_SCALE * vec2(1.0, Y_SCALE);
  float mag = 1.0 - 2.0 * sqrt(pow(uv.x - 0.5, 2.0) + pow((uv.y - 0.5) * Y_SCALE, 2.0));
  mag = max(mag, 0.0);

  vec4 color = vec4(vec3(0.0), 1.0);
  color = mix(color, vec4(vec3(1.0), 1.0), (pow(fbm(vec3(coord + vec2(u_time * 0.1, 0.0), u_time * 0.1)), 2.0) + 0.1) * mag);

  gl_FragColor = color;
}