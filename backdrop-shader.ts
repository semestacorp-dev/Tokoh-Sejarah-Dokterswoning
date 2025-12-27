
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
const vs = `precision highp float;

in vec3 position;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

const fs = `precision highp float;

out vec4 fragmentColor;

uniform vec2 resolution;
uniform float rand;
uniform float time;
uniform vec4 inputData;
uniform vec4 outputData;

// Simple noise function
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  float aspectRatio = resolution.x / resolution.y; 
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 centeredUv = uv - 0.5;
  centeredUv.x *= aspectRatio;

  float intensity = (outputData.x + outputData.y + inputData.x) * 0.33;

  // Layer 1: Nebula effect
  float t = time * 0.15;
  vec2 p = centeredUv * 1.5;
  
  float strength = 0.0;
  for(float i = 1.0; i < 4.0; i++) {
      p.x += 0.4 / i * sin(i * 2.5 * p.y + t + i * 1.5);
      p.y += 0.4 / i * cos(i * 2.5 * p.x + t + i * 2.5);
      strength += abs(0.1 / p.x) * 0.12;
  }

  // Layer 2: Memory Grid (Subtle generative lines)
  vec2 gridUv = centeredUv * (10.0 + intensity * 2.0);
  vec2 grid = abs(fract(gridUv - 0.5) - 0.5) / fwidth(gridUv);
  float line = min(grid.x, grid.y);
  float gridLines = 1.0 - smoothstep(0.0, 1.0, line);

  // Layer 3: Comic Halftone dots
  float dotScale = 40.0;
  vec2 dotUv = fract(centeredUv * dotScale);
  float dist = distance(dotUv, vec2(0.5));
  float dots = 1.0 - smoothstep(0.2 + intensity * 0.2, 0.4 + intensity * 0.2, dist);

  // Indonesian Revolutionary Palettes
  vec3 bg_deep = vec3(15., 2., 2.) / 255.0;     // Deepest void
  vec3 bg_mid = vec3(50., 5., 5.) / 255.0;      // Maroon
  vec3 bg_highlight = vec3(180., 20., 15.) / 255.0; // Glowing spirit

  // Final Mix
  float d = length(centeredUv);
  vec3 color = mix(bg_deep, bg_mid, clamp(strength * 0.4 + (0.8 - d), 0.0, 1.0));
  
  // Apply grid and dots
  color = mix(color, bg_highlight * 0.3, gridLines * 0.15);
  color = mix(color, bg_highlight * 0.5, dots * 0.1 * strength);
  
  // Embers and energy flashes
  float grain = noise(uv + rand);
  color += bg_highlight * pow(strength, 3.5) * (0.2 + intensity * 0.5);
  color += grain * 0.01;
  
  // Pulsing vignette
  color *= (1.0 - d * 0.6) + intensity * 0.1;

  fragmentColor = vec4(color, 1.0);
}
`;

export {fs, vs};
