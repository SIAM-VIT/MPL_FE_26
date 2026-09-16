import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { scrollState, clamp01, lerp, smoothstep } from '../state/scrollController';
import { TRAJECTORY_WAYPOINTS } from './Trajectories';

// Rodrigues' rotation formula: rotate vector v around unit axis k by angle theta
const rodriguesRotate = (v: THREE.Vector3, k: THREE.Vector3, theta: number): THREE.Vector3 => {
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const dot = k.dot(v);
  const cross = new THREE.Vector3().crossVectors(k, v);

  return new THREE.Vector3()
    .addScaledVector(v, cosTheta)
    .addScaledVector(cross, sinTheta)
    .addScaledVector(k, dot * (1 - cosTheta));
};

export const CameraRig: React.FC = () => {
  const { camera, scene } = useThree();
  const defaultUp = useRef(new THREE.Vector3(0, 1, 0));
  const lookTarget = useRef(new THREE.Vector3(0, 8, 0));

  useEffect(() => {
    camera.rotation.order = 'YXZ';
  }, [camera]);

  useFrame(() => {
    const sp = scrollState.sp;
    const reducedMotion = scrollState.reducedMotion;

    let posX = 0;
    let posY = 8;
    let posZ = 24;

    let targetX = 0;
    let targetY = 8;
    let targetZ = 0;

    let bankAngle = 0;

    // --- CORRIDOR VELOCITY & KEYFRAME SCHEDULE ---
    if (sp < 0.18) {
      // Act 1: Singularity & Crest Formation (sp 0.0 -> 0.18)
      const t = sp / 0.18;
      posX = 0;
      posY = 8;
      posZ = lerp(26.0, 18.0, t);

      targetX = 0;
      targetY = 8;
      targetZ = 0;
    } else if (sp < 0.42) {
      // Acts 2 & 3: Speed Corridor with strictly linear translation velocity legs & gear changes:
      // Leg 1: sp [0.18, 0.25] -> velocity: 280 units per sp delta
      // Leg 2: sp [0.25, 0.33] -> velocity: 160 units per sp delta
      // Leg 3: sp [0.33, 0.42] -> velocity: 380 units per sp delta
      let baseZ = 18.0;

      if (sp <= 0.25) {
        const delta = sp - 0.18;
        baseZ -= delta * 280.0;
        posY = lerp(8.0, 5.0, (sp - 0.18) / 0.07);
      } else if (sp <= 0.33) {
        const leg1Dist = (0.25 - 0.18) * 280.0; // 19.6
        const delta = sp - 0.25;
        baseZ -= leg1Dist + delta * 160.0;
        posY = lerp(5.0, 3.5, (sp - 0.25) / 0.08);
      } else {
        const leg1Dist = (0.25 - 0.18) * 280.0; // 19.6
        const leg2Dist = (0.33 - 0.25) * 160.0; // 12.8
        const delta = sp - 0.33;
        baseZ -= leg1Dist + leg2Dist + delta * 380.0;
        posY = lerp(3.5, 2.0, (sp - 0.33) / 0.09);
      }

      posZ = baseZ;

      // Active trajectory gravitational slingshot offsets
      let activeLateral = 0;
      let activeDip = 0;

      for (const wp of TRAJECTORY_WAYPOINTS) {
        const u = (sp - wp.at) / wp.span;
        if (u >= 0 && u <= 1.0) {
          const swing = Math.sin(Math.PI * clamp01(u));
          if (!reducedMotion) {
            // Dynamic lateral and dip offsets to camera position only:
            // side * 3.0 * sin(pi * u) and bank angle ~0.14 rad
            activeLateral += wp.side * 3.2 * swing;
            activeDip += -1.6 * swing;
            bankAngle += -wp.side * 0.14 * swing;
          }
          break;
        }
      }

      posX = activeLateral;
      posY += activeDip;

      // Look target is strictly along the corridor track center
      // NEVER offset look target directly, producing an authentic gravitational flyby arc!
      targetX = 0;
      targetY = posY - 0.5;
      targetZ = posZ - 35.0;
    } else if (sp < 0.70) {
      // Act 4: Convergence of Realms (sp 0.42 -> 0.70)
      const t = (sp - 0.42) / 0.28;
      const sCurve = smoothstep(0, 1, t);

      // Decelerate toward the 3 Arena Portals arena at z = -180
      posX = lerp(0, 0, sCurve);
      posY = lerp(2.0, 7.5, sCurve);
      posZ = lerp(-65.0, -145.0, sCurve);

      targetX = 0;
      targetY = 6.0;
      targetZ = -190.0;
    } else {
      // Act 5 & 6: Tournament Core & Horizon Break (sp 0.70 -> 1.0)
      const t = (sp - 0.70) / 0.30;
      const sCurve = smoothstep(0, 1, t);

      posX = Math.sin(t * 1.5) * (reducedMotion ? 0 : 2.5);
      posY = lerp(7.5, 9.0, sCurve);
      posZ = lerp(-145.0, -165.0, sCurve);

      targetX = 0;
      targetY = 8.5;
      targetZ = -200.0;
    }

    // Apply Camera Position
    camera.position.set(posX, posY, posZ);

    // Dynamic Rodrigues view bank: rotate UP vector around view axis
    const viewDir = new THREE.Vector3()
      .subVectors(new THREE.Vector3(targetX, targetY, targetZ), camera.position)
      .normalize();

    if (Math.abs(bankAngle) > 0.001) {
      const bankedUp = rodriguesRotate(defaultUp.current, viewDir, bankAngle);
      camera.up.copy(bankedUp);
    } else {
      camera.up.copy(defaultUp.current);
    }

    camera.lookAt(targetX, targetY, targetZ);

    // Far fog closes smoothly toward transition into Act 4
    if (scene.fog && 'far' in scene.fog) {
      const fogFar = lerp(260.0, 120.0, smoothstep(0.35, 0.52, sp));
      scene.fog.far = fogFar;
    }
  });

  return null;
};
