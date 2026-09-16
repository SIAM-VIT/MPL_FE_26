import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { scrollState, smoothstep } from '../state/scrollController';

// Archimedean coordinate wireframe cage encasing the emblem at (0, 8, 0)
export const CoordinateLattice: React.FC = () => {
  // Generate non-indexed vertex pairs sharing a seed threshold
  const { geometry, shaderMaterial } = useMemo(() => {
    const linesCount = 480;
    const positions: number[] = [];
    const thresholds: number[] = [];
    const colors: number[] = [];

    const center = new THREE.Vector3(0, 8, 0);
    const R_BASE = 8.5;

    // Generate Archimedean rings and polar meridian arcs
    for (let i = 0; i < linesCount; i++) {
      const u = i / linesCount;
      // Archimedean spiral angle
      const theta = u * Math.PI * 18.0;
      const zRatio = (u * 2.0 - 1.0);
      const r = R_BASE * Math.sqrt(Math.max(0.1, 1.0 - zRatio * zRatio * 0.7));

      const x1 = Math.cos(theta) * r;
      const y1 = zRatio * 8.5;
      const z1 = Math.sin(theta) * r;

      const dTheta = 0.25;
      const x2 = Math.cos(theta + dTheta) * (r + 0.1);
      const y2 = y1 + 0.15;
      const z2 = Math.sin(theta + dTheta) * (r + 0.1);

      positions.push(
        center.x + x1, center.y + y1, center.z + z1,
        center.x + x2, center.y + y2, center.z + z2
      );

      // Seed threshold for procedural draw-in
      const seed = Math.abs(Math.sin(i * 12.9898 + 78.233));
      thresholds.push(seed, seed);

      // Cyan-Teal palette primitives
      const distRatio = Math.abs(zRatio);
      const rCol = 0.02 + distRatio * 0.15;
      const gCol = 0.71 + distRatio * 0.12;
      const bCol = 0.83 - distRatio * 0.08;
      colors.push(rCol, gCol, bCol, rCol, gCol, bCol);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aThreshold', new THREE.Float32BufferAttribute(thresholds, 1));
    geo.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uSp: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float aThreshold;
        attribute vec3 aColor;
        uniform float uSp;
        uniform float uTime;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = aColor;

          if (uSp <= 0.005) {
            vAlpha = 0.0;
            gl_Position = vec4(0.0);
            return;
          }

          // Procedurally drawing into existence from one scalar as sp enters Act 1
          float drawProgress = smoothstep(0.01, 0.18, uSp);
          
          // Fade out as camera exits Act 1 into Act 2
          float exitFade = 1.0 - smoothstep(0.24, 0.38, uSp);

          // Reveal based on seed threshold
          float reveal = step(aThreshold, drawProgress);
          vAlpha = reveal * (drawProgress * 0.75 + 0.1) * exitFade;
          vAlpha *= 0.85 + 0.15 * sin(uTime * 1.5 + aThreshold * 6.28);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          if (vAlpha < 0.01) discard;
          gl_FragColor = vec4(vColor, vAlpha);
        }
      `,
    });

    return { geometry: geo, shaderMaterial: mat };
  }, []);

  useFrame((state) => {
    shaderMaterial.uniforms.uSp.value = scrollState.sp;
    shaderMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return <lineSegments geometry={geometry} material={shaderMaterial} />;
};
