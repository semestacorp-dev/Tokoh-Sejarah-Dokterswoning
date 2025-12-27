
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
const vs = `#define STANDARD
varying vec3 vViewPosition;
varying vec2 vUv;
#ifdef USE_TRANSMISSION
  varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

uniform float time;
uniform vec4 inputData;
uniform vec4 outputData;

vec3 calc( vec3 pos ) {
  vec3 dir = normalize( pos );
  
  // Data Mapping (from visual-3d.ts):
  // .x = Bass, .y = Mid, .z = Treble
  float bass = max(inputData.x, outputData.x);
  float mid = max(inputData.y, outputData.y);
  float treble = max(inputData.z, outputData.z);

  // Bass: Larger, slower pulses (Low freq sin, higher amp)
  float bassDisp = bass * 1.2 * (0.5 + 0.5 * sin(pos.x * 0.8 + time * 1.5));
  
  // Mid: Medium size and speed
  float midDisp = mid * 0.6 * (0.5 + 0.5 * sin(pos.y * 3.0 + time * 5.0));
  
  // Treble: Smaller, faster pulses (High freq sin, lower amp)
  float trebleDisp = treble * 0.25 * (0.5 + 0.5 * sin(pos.z * 12.0 + time * 15.0));

  return pos + dir * (bassDisp + midDisp + trebleDisp);
}

vec3 spherical( float r, float theta, float phi ) {
  return r * vec3(
    cos( theta ) * cos( phi ),
    sin( theta ) * cos( phi ),
    sin( phi )
  );
}

void main() {
  vUv = uv;
  #include <uv_vertex>
  #include <color_vertex>
  #include <morphinstance_vertex>
  #include <morphcolor_vertex>
  #include <batching_vertex>
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <normal_vertex>
  #include <begin_vertex>

  float inc = 0.001;
  float r = length( position );
  float theta = ( uv.x + 0.5 ) * 2. * PI;
  float phi = -( uv.y + 0.5 ) * PI;

  vec3 np = calc( spherical( r, theta, phi )  );
  vec3 tangent = normalize( calc( spherical( r, theta + inc, phi ) ) - np );
  vec3 bitangent = normalize( calc( spherical( r, theta, phi + inc ) ) - np );
  transformedNormal = -normalMatrix * normalize( cross( tangent, bitangent ) );
  vNormal = normalize( transformedNormal );
  transformed = np;

  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <displacementmap_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>
  vViewPosition = - mvPosition.xyz;
  #include <worldpos_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>
  #ifdef USE_TRANSMISSION
    vWorldPosition = worldPosition.xyz;
  #endif
}`;

export {vs};
