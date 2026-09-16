import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { scrollState } from '../state/scrollController';

// Custom Vignette Shader: Darkness 0.95, Offset 1.25
// Kept under 1.0 to prevent ACES curve color inversions in deep navy corners
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    darkness: { value: 0.95 },
    offset: { value: 1.25 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float darkness;
    uniform float offset;
    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec2 coord = (vUv - 0.5) * offset;
      float rf = sqrt(dot(coord, coord)) * darkness;
      float rf2_1 = rf * rf + 1.0;
      float inv = 1.0 / (rf2_1 * rf2_1);
      float vig = clamp(inv, 0.05, 1.0);
      gl_FragColor = vec4(tex.rgb * vig, tex.a);
    }
  `,
};

// Film Grain Shader: Applied in display space after tone mapping for subtle cinematic texture
const FilmGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrainAmount: { value: 0.038 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrainAmount;
    varying vec2 vUv;

    float pseudoNoise(vec2 co) {
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float noise = (pseudoNoise(vUv * 800.0 + fract(uTime * 5.0)) - 0.5) * uGrainAmount;
      gl_FragColor = vec4(clamp(color.rgb + noise, 0.0, 1.0), color.a);
    }
  `,
};

export const PostProcessing: React.FC = () => {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const grainPassRef = useRef<ShaderPass | null>(null);

  const composer = useMemo(() => {
    // Post-processing pipeline order:
    // 1. RenderPass -> 2. UnrealBloomPass -> 3. Custom Vignette -> 4. OutputPass (ACESFilmic) -> 5. Film Grain
    const comp = new EffectComposer(gl);

    // 1. Scene RenderPass
    const renderPass = new RenderPass(scene, camera);
    comp.addPass(renderPass);

    // 2. UnrealBloomPass: Strength 0.5, radius 0.4, threshold 1.15, smoothWidth 0.35
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.5,   // strength
      0.4,   // radius
      1.15   // threshold (pierced by gain 1.3 starlight/gold)
    );
    comp.addPass(bloomPass);

    // 3. Custom Vignette: Darkness 0.95, offset 1.25
    const vignettePass = new ShaderPass(VignetteShader);
    comp.addPass(vignettePass);

    // 4. OutputPass (ACESFilmicToneMapping & sRGB display encode)
    const outputPass = new OutputPass();
    comp.addPass(outputPass);

    // 5. Film Grain: subtle cinematic texture in display space
    const grainPass = new ShaderPass(FilmGrainShader);
    grainPassRef.current = grainPass;
    comp.addPass(grainPass);

    return comp;
  }, [gl, scene, camera, size.width, size.height]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
    composerRef.current = composer;
    return () => {
      composer.dispose();
    };
  }, [composer, size.width, size.height]);

  useFrame((state) => {
    if (grainPassRef.current) {
      grainPassRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
    composer.render();
  }, 1);

  return null;
};
