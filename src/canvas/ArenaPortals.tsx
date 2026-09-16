import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { scrollState, smoothstep, lerp } from '../state/scrollController';

// Procedural geometry for the 3 Arena Portals:
// 1. Main Question [Target / Precision Core]
// 2. Bonus Bidding [Bolt / Energy Nexus]
// 3. Challenge Mode [Crossed Blades / Colosseum]
// plus Central Core Equation (Radiant Gold) and Accretion Dust

export const ArenaPortals: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const portal1Ref = useRef<THREE.Group>(null);
  const portal2Ref = useRef<THREE.Group>(null);
  const portal3Ref = useRef<THREE.Group>(null);
  const coreEquationRef = useRef<THREE.Group>(null);
  const dustRef = useRef<THREE.Points>(null);

  // 1. Main Question Target Portal Geometry (Concentric Reticles & Crosshairs)
  const { targetGeo, targetMat } = useMemo(() => {
    const positions: number[] = [];
    // Concentric reticle rings
    [3.0, 4.5, 6.0].forEach((r) => {
      const segs = 48;
      for (let s = 0; s < segs; s++) {
        const a1 = (s / segs) * Math.PI * 2;
        const a2 = ((s + 1) / segs) * Math.PI * 2;
        positions.push(
          Math.cos(a1) * r, Math.sin(a1) * r, 0,
          Math.cos(a2) * r, Math.sin(a2) * r, 0
        );
      }
    });
    // Precision crosshairs
    positions.push(-7.5, 0, 0, 7.5, 0, 0);
    positions.push(0, -7.5, 0, 0, 7.5, 0);
    // Diagonal quadrant ticks
    [-1, 1].forEach((dx) => {
      [-1, 1].forEach((dy) => {
        positions.push(
          dx * 4.0, dy * 4.0, 0,
          dx * 5.2, dy * 5.2, 0
        );
      });
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x06b6d4, // Cyan-500 ambient grid
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    return { targetGeo: geo, targetMat: mat };
  }, []);

  // 2. Bonus Bidding Bolt Portal Geometry (Fractal Lightning / Energy Rhombus)
  const { boltGeo, boltMat } = useMemo(() => {
    const positions: number[] = [];
    // Octahedral energy cage
    const R = 5.5;
    const verts = [
      new THREE.Vector3(0, R, 0),
      new THREE.Vector3(0, -R, 0),
      new THREE.Vector3(R, 0, 0),
      new THREE.Vector3(-R, 0, 0),
      new THREE.Vector3(0, 0, R),
      new THREE.Vector3(0, 0, -R),
    ];
    // Connect cage edges
    for (let i = 0; i < verts.length; i++) {
      for (let j = i + 1; j < verts.length; j++) {
        if (verts[i].distanceTo(verts[j]) < R * 1.5) {
          positions.push(
            verts[i].x, verts[i].y, verts[i].z,
            verts[j].x, verts[j].y, verts[j].z
          );
        }
      }
    }
    // High-voltage zigzag core
    const boltPoints = [
      [0, 5, 0], [1.2, 2, 0.4], [-0.8, 0, -0.4], [1.5, -2, 0.3], [0, -5, 0]
    ];
    for (let b = 0; b < boltPoints.length - 1; b++) {
      positions.push(
        boltPoints[b][0], boltPoints[b][1], boltPoints[b][2],
        boltPoints[b+1][0], boltPoints[b+1][1], boltPoints[b+1][2]
      );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x2dd4bf, // Teal-400
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    return { boltGeo: geo, boltMat: mat };
  }, []);

  // 3. Challenge Mode Swords Portal Geometry (Crossed Celestial Blades & Colosseum Ring)
  const { swordGeo, swordMat } = useMemo(() => {
    const positions: number[] = [];
    // Colosseum perimeter ring
    const R = 6.0;
    const segs = 36;
    for (let s = 0; s < segs; s++) {
      const a1 = (s / segs) * Math.PI * 2;
      const a2 = ((s + 1) / segs) * Math.PI * 2;
      positions.push(
        Math.cos(a1) * R, Math.sin(a1) * R, 0,
        Math.cos(a2) * R, Math.sin(a2) * R, 0
      );
    }
    // Two crossed angular blades
    const drawBlade = (angleRad: number) => {
      const len = 7.0;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      // Blade axis
      positions.push(
        -cosA * len, -sinA * len, 0,
        cosA * len, sinA * len, 0
      );
      // Crossguard
      const perpCos = -sinA;
      const perpSin = cosA;
      const gLen = 2.2;
      positions.push(
        -cosA * (len * 0.4) - perpCos * gLen, -sinA * (len * 0.4) - perpSin * gLen, 0,
        -cosA * (len * 0.4) + perpCos * gLen, -sinA * (len * 0.4) + perpSin * gLen, 0
      );
    };
    drawBlade(Math.PI / 4);
    drawBlade(-Math.PI / 4);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x06b6d4, // Cyan-500
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    return { swordGeo: geo, swordMat: mat };
  }, []);

  // Central Tournament Core Equation (Act 5) - Strictly Radiant Gold
  const { coreGeo, coreMat } = useMemo(() => {
    const positions: number[] = [];
    // Triple celestial equation gyroscopes
    [4.0, 6.0, 8.2].forEach((r, idx) => {
      const segs = 64;
      for (let s = 0; s < segs; s++) {
        const a1 = (s / segs) * Math.PI * 2;
        const a2 = ((s + 1) / segs) * Math.PI * 2;
        if (idx === 0) {
          positions.push(Math.cos(a1) * r, Math.sin(a1) * r, 0, Math.cos(a2) * r, Math.sin(a2) * r, 0);
        } else if (idx === 1) {
          positions.push(0, Math.cos(a1) * r, Math.sin(a1) * r, 0, Math.cos(a2) * r, Math.sin(a2) * r);
        } else {
          positions.push(Math.cos(a1) * r, 0, Math.sin(a1) * r, Math.cos(a2) * r, 0, Math.sin(a2) * r);
        }
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xeab308, // Strict Radiant Gold
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    return { coreGeo: geo, coreMat: mat };
  }, []);

  // Cosmic Accretion Dust (5,000 particles that settle into orbit in Act 5)
  const { dustGeo, dustMat } = useMemo(() => {
    const count = 5000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 10.0 + Math.random() * 35.0;
      const height = (Math.random() - 0.5) * 16.0;

      positions[i * 3 + 0] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // Starlight and subtle gold particles
      const isGold = Math.random() > 0.75;
      if (isGold) {
        colors[i * 3 + 0] = 0.98;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.3;
      } else {
        colors[i * 3 + 0] = 0.95;
        colors[i * 3 + 1] = 0.97;
        colors[i * 3 + 2] = 1.0;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return { dustGeo: geo, dustMat: mat };
  }, []);

  useFrame(() => {
    const sp = scrollState.sp;

    // Active visibility envelope for Act 4 (0.50 -> 0.85) and Act 5 (0.68 -> 1.0)
    const act4Weight = smoothstep(0.48, 0.65, sp);
    const act5Weight = smoothstep(0.68, 0.85, sp);

    if (groupRef.current) {
      groupRef.current.position.set(0, 0, -195);
      groupRef.current.visible = sp > 0.40;
    }

    // Portal 1: Main Question (left)
    if (portal1Ref.current) {
      portal1Ref.current.position.set(-16 * act4Weight, 7, 0);
      portal1Ref.current.rotation.z = sp * 1.5;
      targetMat.opacity = 0.85 * act4Weight;
    }

    // Portal 2: Bonus Bidding (top)
    if (portal2Ref.current) {
      portal2Ref.current.position.set(0, 7 + 10 * act4Weight, -10);
      portal2Ref.current.rotation.y = sp * 2.0;
      boltMat.opacity = 0.85 * act4Weight;
    }

    // Portal 3: Challenge Mode (right)
    if (portal3Ref.current) {
      portal3Ref.current.position.set(16 * act4Weight, 7, 0);
      portal3Ref.current.rotation.z = -sp * 1.5;
      swordMat.opacity = 0.85 * act4Weight;
    }

    // Core Equation (Act 4/5 background halo)
    if (coreEquationRef.current) {
      coreEquationRef.current.position.set(0, 7, -15);
      coreEquationRef.current.rotation.x = sp * 1.2;
      coreEquationRef.current.rotation.y = sp * 2.4;
      coreEquationRef.current.scale.setScalar(lerp(0.5, 1.2, act4Weight));
      coreMat.opacity = 0.35 * act4Weight;
    }

    // Accretion Dust settling
    if (dustRef.current) {
      dustRef.current.rotation.y = sp * 1.8;
      dustMat.opacity = 0.65 * act4Weight;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 3 Arena Battle Nodes */}
      <group ref={portal1Ref}>
        <lineSegments geometry={targetGeo} material={targetMat} />
      </group>
      <group ref={portal2Ref}>
        <lineSegments geometry={boltGeo} material={boltMat} />
      </group>
      <group ref={portal3Ref}>
        <lineSegments geometry={swordGeo} material={swordMat} />
      </group>

      {/* Central Radiant Gold Equation */}
      <group ref={coreEquationRef}>
        <lineSegments geometry={coreGeo} material={coreMat} />
      </group>

      {/* Cosmic dust ring */}
      <points ref={dustRef} geometry={dustGeo} material={dustMat} />
    </group>
  );
};
