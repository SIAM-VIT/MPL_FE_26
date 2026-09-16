import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { scrollState, smoothstep } from '../state/scrollController';

// Generate concentric wireframe coordinate cylinder
const generateTunnelGeometry = (radius: number, length: number, ringCount: number, meridianCount: number) => {
  const positions: number[] = [];
  const startZ = 20;
  const endZ = startZ - length;
  const stepZ = length / ringCount;

  // Concentric coordinate rings
  for (let r = 0; r <= ringCount; r++) {
    const z = startZ - r * stepZ;
    const segments = 48;
    for (let s = 0; s < segments; s++) {
      const theta1 = (s / segments) * Math.PI * 2;
      const theta2 = ((s + 1) / segments) * Math.PI * 2;
      positions.push(
        Math.cos(theta1) * radius, Math.sin(theta1) * radius, z,
        Math.cos(theta2) * radius, Math.sin(theta2) * radius, z
      );
    }
  }

  // Longitudinal meridian lines
  for (let m = 0; m < meridianCount; m++) {
    const theta = (m / meridianCount) * Math.PI * 2;
    const x = Math.cos(theta) * radius;
    const y = Math.sin(theta) * radius;
    positions.push(
      x, y, startZ,
      x, y, endZ
    );
  }

  // Ecliptic tilted rings (23.4 deg inclination)
  const eclipticTilt = (23.44 * Math.PI) / 180;
  for (let e = 0; e < 6; e++) {
    const baseZ = startZ - (e + 1) * (length / 7);
    const segments = 48;
    for (let s = 0; s < segments; s++) {
      const theta1 = (s / segments) * Math.PI * 2;
      const theta2 = ((s + 1) / segments) * Math.PI * 2;
      
      const x1 = Math.cos(theta1) * (radius * 1.02);
      const y1 = Math.sin(theta1) * (radius * 1.02);
      const z1 = baseZ + y1 * Math.sin(eclipticTilt);

      const x2 = Math.cos(theta2) * (radius * 1.02);
      const y2 = Math.sin(theta2) * (radius * 1.02);
      const z2 = baseZ + y2 * Math.sin(eclipticTilt);

      positions.push(x1, y1, z1, x2, y2, z2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geo;
};

// Shader that dissolves the lower hemisphere into cosmic depth fog
const createTunnelMaterial = (baseCyanColor: THREE.Color) => {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uSp: { value: 0 },
      uColor: { value: baseCyanColor },
    },
    vertexShader: `
      uniform float uSp;
      varying vec3 vWorldPos;
      varying float vDist;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        vDist = length(worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uSp;
      uniform vec3 uColor;
      varying vec3 vWorldPos;
      varying float vDist;

      void main() {
        // Active window in Acts 2 and 3 (sp ~0.14 to 0.65)
        float fadeIn = smoothstep(0.12, 0.26, uSp);
        float fadeOut = 1.0 - smoothstep(0.60, 0.78, uSp);
        float actAlpha = fadeIn * fadeOut;

        // Lower hemisphere dissolves into cosmic depth fog (no hard floor planes)
        float lowerFog = smoothstep(-15.0, 5.0, vWorldPos.y);

        // Distance fog along Z corridor
        float zFog = smoothstep(180.0, 20.0, abs(vWorldPos.z));

        float alpha = 0.20 * actAlpha * lowerFog * zFog;
        if (alpha < 0.005) discard;

        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
};

export const CelestialTunnel: React.FC = () => {
  const groupRef1 = useRef<THREE.Group>(null);
  const groupRef2 = useRef<THREE.Group>(null);
  const groupRef3 = useRef<THREE.Group>(null);

  // Concentric wireframe coordinate cylinders at r 9 / 14 / 20 along -Z axis
  const geo1 = useMemo(() => generateTunnelGeometry(9, 220, 28, 16), []);
  const geo2 = useMemo(() => generateTunnelGeometry(14, 220, 24, 24), []);
  const geo3 = useMemo(() => generateTunnelGeometry(20, 220, 20, 32), []);

  const mat1 = useMemo(() => createTunnelMaterial(new THREE.Color('#06b6d4')), []); // Cyan-500
  const mat2 = useMemo(() => createTunnelMaterial(new THREE.Color('#2dd4bf')), []); // Teal-400
  const mat3 = useMemo(() => createTunnelMaterial(new THREE.Color('#0891b2')), []); // Deep Cyan

  useFrame(() => {
    const sp = scrollState.sp;

    // Counter-drifting axial rotations (0.05, -0.025, 0.012)
    if (groupRef1.current) {
      groupRef1.current.rotation.z = sp * 0.05 * 25.0;
    }
    if (groupRef2.current) {
      groupRef2.current.rotation.z = -sp * 0.025 * 25.0;
    }
    if (groupRef3.current) {
      groupRef3.current.rotation.z = sp * 0.012 * 25.0;
    }

    mat1.uniforms.uSp.value = sp;
    mat2.uniforms.uSp.value = sp;
    mat3.uniforms.uSp.value = sp;
  });

  return (
    <group>
      <group ref={groupRef1}>
        <lineSegments geometry={geo1} material={mat1} />
      </group>
      <group ref={groupRef2}>
        <lineSegments geometry={geo2} material={mat2} />
      </group>
      <group ref={groupRef3}>
        <lineSegments geometry={geo3} material={mat3} />
      </group>
    </group>
  );
};
