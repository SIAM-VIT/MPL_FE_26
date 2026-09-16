import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { scrollState, smoothstep } from '../state/scrollController';

// Accurate sRGB-to-linear conversion for ACES Filmic tone mapping
const toLinearColor = (r: number, g: number, b: number): [number, number, number] => {
  return [
    Math.pow(r / 255, 2.2) * 1.08,
    Math.pow(g / 255, 2.2) * 1.04,
    Math.pow(b / 255, 2.2),
  ];
};

// Generic sampler from pixel data
export const sampleFromImageData = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  count: number
) => {
  const validPixels: { x: number; y: number; r: number; g: number; b: number }[] = [];
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Non-transparent logo pixels
      if (a > 64) {
        validPixels.push({ x, y, r, g, b });
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (validPixels.length === 0) return null;

  const positions = new Float32Array(count * 3);
  const dispersePositions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const randoms = new Float32Array(count * 4);

  const boundHeight = Math.max(1, maxY - minY);
  // Scale to bounding height of 14 units
  const scale = 14.0 / boundHeight;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const totalValid = validPixels.length;
  const step = totalValid / count;

  for (let i = 0; i < count; i++) {
    const pIdx = Math.floor((i * step) % totalValid);
    const p = validPixels[pIdx];

    // Canvas to world space centered at (0, 8, 0) with height 14 units
    const wx = (p.x - centerX) * scale;
    const wy = 8.0 - (p.y - centerY) * scale;

    // Smooth subtle 3D dome curvature: crest curves slightly outward in Z
    const distFromCenter = Math.sqrt(wx * wx + (wy - 8.0) * (wy - 8.0));
    const maxR = 7.5;
    const dome = Math.max(0, 1.0 - (distFromCenter / maxR) ** 2);
    const wz = dome * 0.4;

    positions[i * 3 + 0] = wx;
    positions[i * 3 + 1] = wy;
    positions[i * 3 + 2] = wz;

    // Form normals pointing outward
    const nx = wx * 0.15;
    const ny = (wy - 8.0) * 0.15;
    const nz = 1.0;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
    normals[i * 3 + 0] = nx / len;
    normals[i * 3 + 1] = ny / len;
    normals[i * 3 + 2] = nz / len;

    // Authentic logo linear colors
    const [cr, cg, cb] = toLinearColor(p.r, p.g, p.b);
    colors[i * 3 + 0] = cr;
    colors[i * 3 + 1] = cg;
    colors[i * 3 + 2] = cb;

    // Cosmic Dispersal coordinates for Act 1 synthesis
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.acos(Math.random() * 2 - 1);
    const r = 25.0 + Math.random() * 35.0;
    dispersePositions[i * 3 + 0] = r * Math.sin(theta) * Math.cos(phi);
    dispersePositions[i * 3 + 1] = 8.0 + r * Math.sin(theta) * Math.sin(phi);
    dispersePositions[i * 3 + 2] = r * Math.cos(theta);

    randoms[i * 4 + 0] = Math.random();
    randoms[i * 4 + 1] = Math.random();
    randoms[i * 4 + 2] = Math.random();
    randoms[i * 4 + 3] = 0.5 + Math.random() * 1.5;
  }

  return { positions, dispersePositions, normals, colors, randoms };
};

// Fallback procedural canvas plate
const generateFallbackPlateAndSample = (count: number) => {
  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');

  ctx.clearRect(0, 0, width, height);

  // Shield plate
  ctx.beginPath();
  ctx.moveTo(256, 470);
  ctx.bezierCurveTo(150, 420, 90, 310, 90, 180);
  ctx.lineTo(90, 140);
  ctx.lineTo(256, 110);
  ctx.lineTo(422, 140);
  ctx.lineTo(422, 180);
  ctx.bezierCurveTo(422, 310, 362, 420, 256, 470);
  ctx.closePath();
  ctx.fillStyle = '#0b0f20';
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#eab308';
  ctx.stroke();

  // Crown
  ctx.beginPath();
  ctx.moveTo(170, 115);
  ctx.lineTo(150, 50);
  ctx.lineTo(210, 85);
  ctx.lineTo(256, 35);
  ctx.lineTo(302, 85);
  ctx.lineTo(362, 50);
  ctx.lineTo(342, 115);
  ctx.closePath();
  ctx.fillStyle = '#eab308';
  ctx.fill();

  // Banner
  ctx.font = '900 64px "Space Grotesk", sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MPL', 256, 280);

  const imgData = ctx.getImageData(0, 0, width, height);
  return sampleFromImageData(imgData.data, width, height, count)!;
};

// 40,000 Instanced Spheres Shader Material
const createBeadShaderMaterial = () => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSp: { value: 0 },
      uCursor: { value: new THREE.Vector2(0, 0) },
      uReducedMotion: { value: 0 },
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute vec3 aDispersePos;
      attribute vec3 aTargetPos;
      attribute vec3 aCustomNormal;
      attribute vec3 aColor;
      attribute vec4 aRandom;

      uniform float uSp;
      uniform vec2 uCursor;
      uniform float uReducedMotion;
      uniform float uTime;

      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying float vAlpha;

      void main() {
        vColor = aColor;
        vAlpha = 1.0;
        vAlpha *= 0.88 + 0.12 * sin(uTime * 2.0 + aRandom.x * 12.566);

        // Act 1 Singularity: Beads form the celestial aura of the logo.
        // As the user scrolls toward Act 2 (sp 0.12 -> 0.30), beads accelerate and disperse into the tunnel
        float disperseProgress = smoothstep(0.12, 0.30, uSp);
        vec3 worldPos = mix(aTargetPos, aDispersePos, disperseProgress);

        // Parallax tilt around local centroid (0, 8, 0)
        vec3 local = worldPos - vec3(0.0, 8.0, 0.0);

        float tiltFactor = (1.0 - uReducedMotion);
        float tiltX = uCursor.y * 0.18 * tiltFactor;
        float tiltY = uCursor.x * 0.25 * tiltFactor;

        // Subtle rotation around Y with sp
        float rotY = tiltY + (uSp * 0.9);
        float cY = cos(rotY);
        float sY = sin(rotY);
        vec3 rotated = vec3(
          local.x * cY + local.z * sY,
          local.y,
          -local.x * sY + local.z * cY
        );

        // Pitch tilt around X
        float cX = cos(tiltX);
        float sX = sin(tiltX);
        rotated = vec3(
          rotated.x,
          rotated.y * cX - rotated.z * sX,
          rotated.y * sX + rotated.z * cX
        );

        // Micro float
        float microFloat = sin(uSp * 12.0 + aRandom.y * 6.28) * 0.15 * tiltFactor;
        rotated.y += microFloat;

        vec3 finalPos = rotated + vec3(0.0, 8.0, 0.0);

        // Scale sphere bead instance (r 0.45)
        float instanceScale = 0.065 * mix(1.0, 0.45, disperseProgress);
        vec3 transformed = position * instanceScale + finalPos;

        vNormal = normalize(normalMatrix * aCustomNormal);
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying float vAlpha;
      uniform float uSp;

      void main() {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(vViewPosition);

        // Key light
        vec3 L1 = normalize(vec3(0.5, 0.8, 0.7));
        float diff1 = max(dot(N, L1), 0.0);

        // Ambient navy fill
        vec3 L2 = normalize(vec3(-0.4, -0.6, -0.5));
        float diff2 = max(dot(N, L2), 0.0) * 0.35;

        // Subtle specular highlight modulated by color luminance (does not bleach dark text)
        vec3 H = normalize(L1 + V);
        float spec = pow(max(dot(N, H), 0.0), 32.0) * 0.30;

        // Radiant color assembly
        vec3 diffuseColor = vColor * (diff1 * 0.85 + 0.25) + vec3(0.04, 0.08, 0.18) * diff2;
        vec3 finalColor = diffuseColor + vColor * spec;

        // Soft celestial blend at rest so crisp plate is crystal clear; full opacity when dispersing
        float alpha = mix(0.35, 1.0, smoothstep(0.02, 0.14, uSp));
        alpha *= vAlpha;

        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
  });
};

// Crystalline Textured Emblem Plate Material
const createPlateMaterial = (texture: THREE.Texture) => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
      uOpacity: { value: 1.0 },
      uGlow: { value: 0.10 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform float uOpacity;
      uniform float uGlow;
      varying vec2 vUv;

      void main() {
        vec4 tex = texture2D(uTexture, vUv);
        if (tex.a < 0.02) discard;

        // Crystalline authentic color reproduction with subtle radiant gold warmth
        vec3 col = tex.rgb;
        col += col * uGlow;

        gl_FragColor = vec4(col, tex.a * uOpacity);
      }
    `,
  });
};

// Radiant Celestial Aura Halo behind the Crest
const createAuraMaterial = () => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0.6 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float d = distance(vUv, vec2(0.5));
        float alpha = smoothstep(0.5, 0.05, d) * uOpacity;
        vec3 glowColor = mix(vec3(0.95, 0.75, 0.15), vec3(0.10, 0.20, 0.50), smoothstep(0.05, 0.45, d));
        gl_FragColor = vec4(glowColor, alpha * 0.35);
      }
    `,
  });
};

export const EmblemBeadCloud: React.FC = () => {
  const COUNT = 40000;

  // Refs for synced motion
  const plateRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);

  // Load official high-res logo texture with sRGB color space & anisotropic filtering
  const logoTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(`${import.meta.env.BASE_URL}mpl_logo.png`);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    tex.generateMipmaps = true;
    return tex;
  }, []);

  // Materials
  const shaderMat = useMemo(() => createBeadShaderMaterial(), []);
  const plateMat = useMemo(() => createPlateMaterial(logoTexture), [logoTexture]);
  const auraMat = useMemo(() => createAuraMaterial(), []);

  // Initial setup with fallback plate
  const initialData = useMemo(() => generateFallbackPlateAndSample(COUNT), [COUNT]);

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(0.45, 8, 6), []);

  // Set instanced attributes
  const instancedGeo = useMemo(() => {
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = sphereGeo.index;
    geo.attributes.position = sphereGeo.attributes.position;
    geo.attributes.normal = sphereGeo.attributes.normal;
    geo.attributes.uv = sphereGeo.attributes.uv;
    geo.instanceCount = COUNT;
    geo.setAttribute('aTargetPos', new THREE.InstancedBufferAttribute(new Float32Array(initialData.positions), 3));
    geo.setAttribute('aDispersePos', new THREE.InstancedBufferAttribute(new Float32Array(initialData.dispersePositions), 3));
    geo.setAttribute('aCustomNormal', new THREE.InstancedBufferAttribute(new Float32Array(initialData.normals), 3));
    geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(initialData.colors), 3));
    geo.setAttribute('aRandom', new THREE.InstancedBufferAttribute(new Float32Array(initialData.randoms), 4));
    return geo;
  }, [sphereGeo, initialData, COUNT]);

  // Asynchronously sample from the logo image (mpl_logo.png, resolved via BASE_URL)
  useEffect(() => {
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}mpl_logo.png`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const sampled = sampleFromImageData(imgData.data, img.width, img.height, COUNT);
      if (!sampled || !instancedGeo) return;

      const targetPosAttr = instancedGeo.getAttribute('aTargetPos') as THREE.BufferAttribute;
      const normalAttr = instancedGeo.getAttribute('aCustomNormal') as THREE.BufferAttribute;
      const colorAttr = instancedGeo.getAttribute('aColor') as THREE.BufferAttribute;

      if (targetPosAttr && normalAttr && colorAttr) {
        targetPosAttr.copyArray(sampled.positions);
        targetPosAttr.needsUpdate = true;

        normalAttr.copyArray(sampled.normals);
        normalAttr.needsUpdate = true;

        colorAttr.copyArray(sampled.colors);
        colorAttr.needsUpdate = true;
      }
    };
  }, [instancedGeo, COUNT]);

  useFrame((state) => {
    const sp = scrollState.sp;
    const tiltFactor = scrollState.reducedMotion ? 0.0 : 1.0;
    const tiltX = scrollState.cursor.y * 0.18 * tiltFactor;
    const tiltY = scrollState.cursor.x * 0.25 * tiltFactor;
    const rotY = tiltY + (sp * 0.9);
    const microFloat = Math.sin(sp * 12.0) * 0.15 * tiltFactor;

    // Synchronize high-res textured emblem plate motion with bead cloud
    if (plateRef.current) {
      plateRef.current.position.set(0, 8.0 + microFloat, 0.05);
      plateRef.current.rotation.order = 'YXZ';
      plateRef.current.rotation.set(tiltX, rotY, 0);

      // Dissolve plate on scroll: 100% crystal clear at rest, seamlessly dissolves into dispersing beads
      const plateAlpha = 1.0 - smoothstep(0.03, 0.16, sp);
      plateMat.uniforms.uOpacity.value = plateAlpha;
      plateRef.current.visible = plateAlpha > 0.005;
    }

    // Synchronize celestial aura halo
    if (auraRef.current) {
      auraRef.current.position.set(0, 8.0 + microFloat, -0.05);
      auraRef.current.rotation.order = 'YXZ';
      auraRef.current.rotation.set(tiltX, rotY, 0);

      const auraAlpha = 1.0 - smoothstep(0.03, 0.14, sp);
      auraMat.uniforms.uOpacity.value = auraAlpha * 0.75;
      auraRef.current.visible = auraAlpha > 0.005;
    }

    // Update bead shader uniforms
    shaderMat.uniforms.uSp.value = sp;
    shaderMat.uniforms.uCursor.value.set(scrollState.cursor.x, scrollState.cursor.y);
    shaderMat.uniforms.uReducedMotion.value = scrollState.reducedMotion ? 1.0 : 0.0;
    shaderMat.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <group>
      {/* 1. Soft Celestial Aura Halo */}
      <mesh ref={auraRef} material={auraMat} frustumCulled={false}>
        <planeGeometry args={[22.0, 22.0]} />
      </mesh>

      {/* 2. Crystalline High-Res Textured Emblem Plate (14.70 x 14.30 units) */}
      <mesh ref={plateRef} material={plateMat} frustumCulled={false}>
        <planeGeometry args={[14.70, 14.295]} />
      </mesh>

      {/* 3. 40,000 Instanced Celestial Spheres Bead Cloud */}
      <mesh geometry={instancedGeo} material={shaderMat} frustumCulled={false} />
    </group>
  );
};
