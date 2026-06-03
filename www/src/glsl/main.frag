#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;

#include "lygia/generative/fbm.glsl"
#include "lygia/generative/worley.glsl"

vec2 rotate(vec2 coord, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return vec2(coord.x * c - coord.y * s, coord.x * s + coord.y * c);
}

vec3 project(vec2 coord) {
  vec2 origin = u_resolution * vec2(1.5, 3.5);
  float r = length(coord - origin);
  float theta = atan(coord.y - origin.y, coord.x - origin.x);
  float theta_low = atan(0.0 - origin.y, u_resolution.x - origin.x);
  float theta_high = atan(u_resolution.y - origin.y, 0.0 - origin.x);
  float theta_t = (theta - theta_low) / (theta_high - theta_low) + 0.1;
  float y = theta_t * length(u_resolution);
  return vec3(r, y, theta_t);
}

float stars(vec2 coord, float noise_scale, float size, float edge) {
  vec2 size_coord = coord / 3000.0 / noise_scale;
  vec2 points_coord = coord / 500.0 / noise_scale;

  float star_size = fbm(vec3(size_coord, u_time * 0.01));
  float star_points = worley(vec3(points_coord, u_time * 0.01)) * (star_size * 0.75 + mix(0.5, 0.875, size));

  return pow(max(0.0, star_points), edge);
}

float stars(vec2 coord, float noise_scale, float size) {
  return stars(coord, noise_scale, size, 15.0);
}

float cloud(vec2 coord, vec2 scale, float edge) {
  vec2 noise_coord = coord / 1000.0 / scale;
  return pow(fbm(vec3(noise_coord, u_time * 0.01)) * 0.5 + 0.5, edge);
}

void main(void) {
  vec4 color = vec4(0.0, 0.0, 0.1, 1.0);

  vec3 proj_coord_data = project(vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y));
  vec2 proj_coord = proj_coord_data.xy;
  float theta_t = proj_coord_data.z;

  float milky_way_mask = pow(1.0 / (1.0 + abs(theta_t - 0.5) * 2.0), 4.0) * 2.0;

  float milky_way_1 = cloud(proj_coord + vec2(200.0, 0.0) * u_time, vec2(2.0, 0.5), 5.0) * 0.5 * milky_way_mask + 0.1 * milky_way_mask;
  color += milky_way_1 * vec4(mix(0.4, 0.8, milky_way_1), 0.6, 1.0, 1.0) * 0.75;

  float milky_way_2 = cloud(proj_coord + vec2(100.0, 0.0) * u_time, vec2(4.0, 2.0), 3.0) * 0.75 * milky_way_mask + 0.1 * milky_way_mask;
  color += milky_way_2 * vec4(mix(0.2, 0.4, milky_way_2), 0.1 * milky_way_2, 0.75, 1.0) * 1.0;

  float milky_way_3 = cloud(proj_coord + vec2(25.0, 0.0) * u_time, vec2(0.5, 0.5), 3.0) * 0.75 * pow(milky_way_mask / 2.0 + 0.5, 7.0);
  milky_way_3 = clamp(milky_way_3, 0.0, 2.0);
  color += milky_way_3 * vec4(1.0, mix(0.4, 0.8, milky_way_3), mix(0.25, 0.75, milky_way_3), 1.0) * 0.5;

  float milky_way = min(2.0, milky_way_1 * 1.5 + milky_way_2 * 0.5);

  float stars_1 = stars(gl_FragCoord.xy, 0.05, 1.0) * milky_way;
  color += stars_1 * vec4(1.0, mix(0.1, 0.8, stars_1), mix(0.0, 1.0, stars_1), 1.0);

  float stars_2 = stars(gl_FragCoord.xy, 0.05, 2.0) * pow(milky_way + 0.25, 10.0);
  color += stars_2 * vec4(mix(0.25, 1.0, stars_2), 0.9, 1.0, 1.0);

  float milky_way_4 = cloud(proj_coord + vec2(10.0, 0.0) * u_time, vec2(0.5, 0.25), 3.0) * pow(milky_way_mask / 2.0 + 0.75, 4.0);
  color.xyz = mix(color.xyz, mix(vec3(0.05, 0.0, 0.2), vec3(0.0, 0.0, 0.2), pow(clamp(milky_way_4 - 1.0, 0.0, 1.0), 3.0)), clamp(milky_way_4, 0.0, 1.0));

  color.xyz += vec3(0.0, 0.15, 0.2) * clamp(1.0 - 1.5 * (gl_FragCoord.y / u_resolution.y), 0.0, 1.0);
  color.xyz += vec3(0.05, 0.15, 0.2) * clamp(1.0 - 3.5 * (gl_FragCoord.y / u_resolution.y), 0.0, 1.0);

  gl_FragColor = color;
}