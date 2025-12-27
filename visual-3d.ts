
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// tslint:disable:organize-imports
// tslint:disable:ban-malformed-import-paths
// tslint:disable:no-new-decorators

import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {Analyser} from './analyser';

import * as THREE from 'three';
import {EXRLoader} from 'three/addons/loaders/EXRLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {fs as backdropFS, vs as backdropVS} from './backdrop-shader';
import {vs as sphereVS} from './sphere-shader';

const PARTICLE_COUNT = 2000;

/**
 * 3D live audio visual.
 */
@customElement('gdm-live-audio-visuals-3d')
export class GdmLiveAudioVisuals3D extends LitElement {
  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
  private camera!: THREE.PerspectiveCamera;
  private backdrop!: THREE.Mesh;
  private composer!: EffectComposer;
  private sphere!: THREE.Mesh;
  private particles!: THREE.Points;
  private particlePositions!: Float32Array;
  private particleVelocities!: Float32Array;
  private particleLifes!: Float32Array;
  private prevTime = 0;
  private rotation = new THREE.Vector3(0, 0, 0);
  private elapsedTime = 0;

  private _outputNode!: AudioNode;

  @property()
  set outputNode(node: AudioNode) {
    this._outputNode = node;
    this.outputAnalyser = new Analyser(this._outputNode);
  }

  get outputNode() {
    return this._outputNode;
  }

  private _inputNode!: AudioNode;

  @property()
  set inputNode(node: AudioNode) {
    this._inputNode = node;
    this.inputAnalyser = new Analyser(this._inputNode);
  }

  get inputNode() {
    return this._inputNode;
  }

  private canvas!: HTMLCanvasElement;
  private waveformCanvas!: HTMLCanvasElement;
  private circularCanvas!: HTMLCanvasElement;
  private waveformCtx!: CanvasRenderingContext2D;
  private circularCtx!: CanvasRenderingContext2D;

  static styles = css`
    :host {
      display: block;
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    #three-canvas {
      width: 100% !important;
      height: 100% !important;
      position: absolute;
      inset: 0;
      image-rendering: pixelated;
    }
    #waveform-canvas {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 140px;
      pointer-events: none;
      z-index: 5;
      opacity: 0.8;
    }
    #circular-canvas {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 800px;
      height: 800px;
      pointer-events: none;
      z-index: 2;
    }
    @media (max-width: 768px) {
      #circular-canvas {
        width: 100vw;
        height: 100vw;
      }
    }
  `;

  private init() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x100c14);

    const backdrop = new THREE.Mesh(
      new THREE.IcosahedronGeometry(10, 5),
      new THREE.RawShaderMaterial({
        uniforms: {
          resolution: {value: new THREE.Vector2(1, 1)},
          rand: {value: 0},
          time: {value: 0},
          inputData: {value: new THREE.Vector4()},
          outputData: {value: new THREE.Vector4()},
        },
        vertexShader: backdropVS,
        fragmentShader: backdropFS,
        glslVersion: THREE.GLSL3,
      }),
    );
    backdrop.material.side = THREE.BackSide;
    scene.add(backdrop);
    this.backdrop = backdrop;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(2, -2, 5);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Particle System
    const particleGeometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.particleVelocities = new Float32Array(PARTICLE_COUNT * 3);
    this.particleLifes = new Float32Array(PARTICLE_COUNT);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.resetParticle(i, true);
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffde00,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(this.particles);

    const geometry = new THREE.IcosahedronGeometry(1, 10);

    new EXRLoader().load('piz_compressed.exr', (texture: THREE.Texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      const exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
      sphereMaterial.envMap = exrCubeRenderTarget.texture;
      sphere.visible = true;
    });

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      metalness: 0.9,
      roughness: 0.05,
      emissive: 0x880000,
      emissiveIntensity: 2.0,
    });

    sphereMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.time = {value: 0};
      shader.uniforms.inputData = {value: new THREE.Vector4()};
      shader.uniforms.outputData = {value: new THREE.Vector4()};
      sphereMaterial.userData.shader = shader;
      shader.vertexShader = sphereVS;
    };

    const sphere = new THREE.Mesh(geometry, sphereMaterial);
    scene.add(sphere);
    sphere.visible = false;
    this.sphere = sphere;

    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      2.5, 
      0.4, 
      0.1  
    );

    const composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    this.composer = composer;

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      const dPR = renderer.getPixelRatio();
      const w = window.innerWidth;
      const h = window.innerHeight;
      backdrop.material.uniforms.resolution.value.set(w * dPR, h * dPR);
      renderer.setSize(w, h);
      composer.setSize(w, h);

      this.waveformCanvas.width = w;
      this.waveformCanvas.height = 140;

      this.circularCanvas.width = 800;
      this.circularCanvas.height = 800;
    }

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    this.animation();
  }

  private resetParticle(i: number, randomDist = false) {
    const i3 = i * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = randomDist ? Math.random() * 6.0 : 0.1;

    this.particlePositions[i3] = r * Math.sin(phi) * Math.cos(theta);
    this.particlePositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    this.particlePositions[i3 + 2] = r * Math.cos(phi);

    const speed = randomDist ? 0.01 : 0.05 + Math.random() * 0.1;
    this.particleVelocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
    this.particleVelocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
    this.particleVelocities[i3 + 2] = Math.cos(phi) * speed;

    this.particleLifes[i] = 1.0;
  }

  private drawWaveforms() {
    this.drawLinearWaveform();
    this.drawCircularWaveform();
  }

  private drawLinearWaveform() {
    if (!this.waveformCtx) return;
    const ctx = this.waveformCtx;
    const w = this.waveformCanvas.width;
    const h = this.waveformCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const outputData = this.outputAnalyser.timeData;
    const inputData = this.inputAnalyser.timeData;
    const bufferLength = outputData.length;
    const sliceWidth = w / bufferLength;

    // Draw Input (User) - Bottom thin line
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.beginPath();
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = inputData[i] / 128.0;
      const y = (v * h / 2) + 20;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();

    // Draw Output (Hero) - Primary bottom line
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffde00';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffde00';
    ctx.beginPath();
    x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = outputData[i] / 128.0;
      const y = v * h / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawCircularWaveform() {
    if (!this.circularCtx) return;
    const ctx = this.circularCtx;
    const w = this.circularCanvas.width;
    const h = this.circularCanvas.height;
    const centerX = w / 2;
    const centerY = h / 2;

    ctx.clearRect(0, 0, w, h);

    const inputTimeData = this.inputAnalyser.timeData;
    const outputTimeData = this.outputAnalyser.timeData;
    const bufferLength = inputTimeData.length;

    // Radius constants
    const baseRadiusOut = 220;
    const baseRadiusIn = 180;

    // Draw Input Circular Ring (Cyan)
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00ffff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();
    for (let i = 0; i < bufferLength; i++) {
      const angle = (i / bufferLength) * Math.PI * 2;
      const amplitude = (inputTimeData[i] - 128) / 128.0;
      const r = baseRadiusOut + amplitude * 60;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw Output Circular Ring (Yellow)
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffde00';
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#ffde00';
    ctx.beginPath();
    for (let i = 0; i < bufferLength; i++) {
      const angle = (i / bufferLength) * Math.PI * 2;
      const amplitude = (outputTimeData[i] - 128) / 128.0;
      const r = baseRadiusIn + amplitude * 100;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw a subtle "Radar" grid circle
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadiusIn, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadiusOut, 0, Math.PI * 2);
    ctx.stroke();
  }

  private getAverageRange(data: Uint8Array, start: number, end: number): number {
    let sum = 0;
    const actualEnd = Math.min(end, data.length - 1);
    for (let i = start; i <= actualEnd; i++) {
      sum += data[i];
    }
    return sum / (actualEnd - start + 1) / 255;
  }

  private animation() {
    requestAnimationFrame(() => this.animation());

    if (this.inputAnalyser) this.inputAnalyser.update();
    if (this.outputAnalyser) this.outputAnalyser.update();

    if (this.inputAnalyser && this.outputAnalyser) {
        this.drawWaveforms();
    }

    const t = performance.now();
    const dt = (t - this.prevTime) / (1000 / 60);
    this.prevTime = t;
    this.elapsedTime += dt * 0.016; 

    const backdropMaterial = this.backdrop.material as THREE.RawShaderMaterial;
    const sphereMaterial = this.sphere.material as THREE.MeshStandardMaterial;

    backdropMaterial.uniforms.rand.value = Math.random() * 10000;
    backdropMaterial.uniforms.time.value = this.elapsedTime;

    const iBass = this.inputAnalyser ? this.getAverageRange(this.inputAnalyser.data, 0, 8) : 0;
    const oBass = this.outputAnalyser ? this.getAverageRange(this.outputAnalyser.data, 0, 8) : 0;
    const oMid = this.outputAnalyser ? this.getAverageRange(this.outputAnalyser.data, 9, 60) : 0;
    const oTreble = this.outputAnalyser ? this.getAverageRange(this.outputAnalyser.data, 61, 150) : 0;

    const peakIntensity = Math.max(iBass, oBass);

    // Particles
    const posAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const explosionStrength = peakIntensity * 0.5;
    const vortexStrength = 0.02 + peakIntensity * 0.1;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      this.particleLifes[i] -= 0.005 * dt;
      const px = this.particlePositions[i3];
      const py = this.particlePositions[i3 + 1];
      const pz = this.particlePositions[i3 + 2];
      this.particleVelocities[i3] += -py * vortexStrength * 0.1;
      this.particleVelocities[i3 + 1] += px * vortexStrength * 0.1;
      if (peakIntensity > 0.1) {
        const dist = Math.sqrt(px * px + py * py + pz * pz) || 1;
        this.particleVelocities[i3] += (px / dist) * explosionStrength;
        this.particleVelocities[i3 + 1] += (py / dist) * explosionStrength;
        this.particleVelocities[i3 + 2] += (pz / dist) * explosionStrength;
      }
      this.particleVelocities[i3] *= 0.98;
      this.particleVelocities[i3 + 1] *= 0.98;
      this.particleVelocities[i3 + 2] *= 0.98;
      this.particlePositions[i3] += this.particleVelocities[i3] * dt;
      this.particlePositions[i3 + 1] += this.particleVelocities[i3 + 1] * dt;
      this.particlePositions[i3 + 2] += this.particleVelocities[i3 + 2] * dt;
      const d = Math.sqrt(px * px + py * py + pz * pz);
      if (this.particleLifes[i] <= 0 || d > 12.0) {
        this.resetParticle(i, peakIntensity < 0.2);
      }
    }
    posAttr.needsUpdate = true;

    const pMat = this.particles.material as THREE.PointsMaterial;
    pMat.size = 0.03 + peakIntensity * 0.25;
    pMat.opacity = 0.4 + peakIntensity * 0.6;
    if (peakIntensity > 0.5) pMat.color.setHex(0xffffff);
    else pMat.color.lerpColors(new THREE.Color(0xffde00), new THREE.Color(0xff2200), peakIntensity);

    if (sphereMaterial.userData.shader) {
      const dynamicScale = 1.0 + (1.6 * Math.pow(peakIntensity, 1.2));
      this.sphere.scale.setScalar(dynamicScale);
      sphereMaterial.emissiveIntensity = 2.0 + (Math.pow(peakIntensity, 1.2) * 30.0);
      const r = 0.5 + 0.5 * iBass;
      const g = 0.1 * iBass + 0.9 * oMid;
      const b = 0.05 * iBass + 0.8 * oTreble;
      sphereMaterial.emissive.setRGB(r, g, b);

      const f = 0.001;
      this.rotation.x += (dt * f * (0.5 + peakIntensity * 2));
      this.rotation.z += (dt * f * 0.5);
      this.rotation.y += (dt * f * 0.25);

      const euler = new THREE.Euler(this.rotation.x, this.rotation.y, this.rotation.z);
      const quaternion = new THREE.Quaternion().setFromEuler(euler);
      const vector = new THREE.Vector3(0, 0, 5);
      vector.applyQuaternion(quaternion);
      this.camera.position.copy(vector);
      this.camera.lookAt(this.sphere.position);

      sphereMaterial.userData.shader.uniforms.time.value = this.elapsedTime * 3.0 * (1 + peakIntensity * 4);
      sphereMaterial.userData.shader.uniforms.inputData.value.set(iBass, 0, 0, 0);
      sphereMaterial.userData.shader.uniforms.outputData.value.set(oBass, oMid, oTreble, 0);
    }

    this.composer.render();
  }

  protected firstUpdated() {
    this.canvas = (this as any).shadowRoot!.querySelector('#three-canvas') as HTMLCanvasElement;
    this.waveformCanvas = (this as any).shadowRoot!.querySelector('#waveform-canvas') as HTMLCanvasElement;
    this.circularCanvas = (this as any).shadowRoot!.querySelector('#circular-canvas') as HTMLCanvasElement;
    this.waveformCtx = this.waveformCanvas.getContext('2d')!;
    this.circularCtx = this.circularCanvas.getContext('2d')!;
    this.init();
  }

  protected render() {
    return html`
      <canvas id="three-canvas"></canvas>
      <canvas id="circular-canvas"></canvas>
      <canvas id="waveform-canvas"></canvas>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gdm-live-audio-visuals-3d': GdmLiveAudioVisuals3D;
  }
}
