import lygia::generative::snoise::snoise3;
import lygia::generative::worley::worley3;

struct Uniforms {
  resolution: vec2f,
  time: f32,
  dpr: f32,
};

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

@toy @fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  var color = vec3f(0.0, 0.0, 0.1);

  let frag = vec2f(pos.x, pos.y) * (2.0 / uniforms.dpr);
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

  let stars_1 = stars(vec2f(frag.x, frag.y), 0.05, 1.0, 15.0) * milky_way;
  color = color + stars_1 * vec3f(1.0, mix(0.1, 0.8, stars_1), mix(0.0, 1.0, stars_1));

  let stars_2 = stars(vec2f(frag.x, frag.y), 0.05, 2.0, 15.0) * pow(milky_way + 0.25, 10.0);
  color = color + stars_2 * vec3f(mix(0.25, 1.0, stars_2), 0.9, 1.0);

  let milky_way_4 = cloud(proj_coord + vec2f(10.0, 0.0) * uniforms.time, vec2f(0.5, 0.25), 3.0) * pow(milky_way_mask / 2.0 + 0.75, 4.0);
  color = mix(color, mix(vec3f(0.05, 0.0, 0.2), vec3f(0.0, 0.0, 0.2), pow(clamp(milky_way_4 - 1.0, 0.0, 1.0), 3.0)), clamp(milky_way_4, 0.0, 1.0));

  let gradient_y = frag.y / uniforms.resolution.y - frag.x / uniforms.resolution.x * 0.1 + 0.05;
  color = color + vec3f(0.0, 0.15, 0.2) * clamp(1.0 - 1.5 * (1.0 - gradient_y), 0.0, 1.0);
  color = color + vec3f(0.05, 0.15, 0.2) * clamp(1.0 - 3.5 * (1.0 - gradient_y), 0.0, 1.0);

  return vec4f(color, 1.0);
}
