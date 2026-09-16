import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { scrollState, clamp01, smoothstep } from '../state/scrollController';

// Shared Orbital Trajectory Table
// Drives both camera flight corridor and mathematical trajectory lines
export interface Waypoint {
  id: number;
  at: number;       // sp trigger start
  span: number;     // duration in sp
  side: number;     // -1 (left) or +1 (right) lateral gravity swing
  lead: number;     // propagation lead offset
  radius: number;   // orbital radius
  lift: number;     // vertical elevation offset
  baseZ: number;    // corridor Z anchor
}

export const TRAJECTORY_WAYPOINTS: Waypoint[] = [
  { id: 0, at: 0.180, span: 0.045, side:  1.0, lead: 0.020, radius: 6.5, lift:  1.8, baseZ: -20 },
  { id: 1, at: 0.225, span: 0.042, side: -1.0, lead: 0.018, radius: 7.2, lift: -1.2, baseZ: -45 },
  { id: 2, at: 0.267, span: 0.036, side:  1.0, lead: 0.016, radius: 5.8, lift:  2.2, baseZ: -72 },
  { id: 3, at: 0.303, span: 0.032, side: -1.0, lead: 0.014, radius: 8.0, lift: -1.6, baseZ: -100 },
  { id: 4, at: 0.335, span: 0.028, side:  1.0, lead: 0.012, radius: 6.0, lift:  2.5, baseZ: -130 },
  { id: 5, at: 0.363, span: 0.025, side: -1.0, lead: 0.010, radius: 7.5, lift:  0.8, baseZ: -160 },
];

// Pure mathematical function computing 3D position along a trajectory waypoint at phase u
export const evaluateTrajectoryPoint = (wp: Waypoint, u: number): THREE.Vector3 => {
  // Phase lifecycle:
  // 0.00 - 0.12: EMIT
  // 0.12 - 0.55: STABLE ORBIT (taut clean geodesic)
  // 0.55 - 0.80: SLINGSHOT (curving laterally & toward camera)
  // 0.80 - 1.00: DISSOLVE
  const angle = u * Math.PI * 3.5 + (wp.id * 1.2);
  const r = wp.radius * (1.0 - 0.25 * Math.sin(u * Math.PI));

  // Base orbital helix
  let x = Math.cos(angle) * r;
  let y = Math.sin(angle * 1.5) * (wp.radius * 0.4) + wp.lift;
  let z = wp.baseZ - u * 30.0;

  // Slingshot phase (0.55 - 0.80) curvature
  if (u > 0.55) {
    const slingU = (u - 0.55) / 0.25;
    const slingFactor = Math.sin(Math.PI * clamp01(slingU));
    x += wp.side * 4.5 * slingFactor;
    y -= 1.8 * slingFactor;
    z += 6.0 * slingFactor; // curves forward toward camera
  }

  return new THREE.Vector3(x, y, z);
};

export const Trajectories: React.FC = () => {
  const { size } = useThree();
  const lineSegmentsRef = useRef<LineSegments2 | null>(null);

  // Pre-generate trajectory curve segments for all 6 waypoints
  const SUBDIVISIONS = 80;
  const totalSegments = TRAJECTORY_WAYPOINTS.length * SUBDIVISIONS;

  const { lineGeo, lineMat } = useMemo(() => {
    const geo = new LineSegmentsGeometry();
    const positions = new Float32Array(totalSegments * 6);
    const colors = new Float32Array(totalSegments * 6);

    // Initial placeholder setup
    geo.setPositions(positions);
    geo.setColors(colors);

    const mat = new LineMaterial({
      color: 0xffffff,
      linewidth: 2.2, // fat lines, screen-space linewidth 2.2
      vertexColors: true,
      resolution: new THREE.Vector2(size.width, size.height),
      dashed: false,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending, // ADDITIVE blend mode prevents dark alpha fringes against navy void
    });

    return { lineGeo: geo, lineMat: mat };
  }, []);

  // Update line material resolution on resize
  useEffect(() => {
    lineMat.resolution.set(size.width, size.height);
  }, [size, lineMat]);

  // Pure function of scalar sp evaluating dynamic propagation front and starlight/gold gain
  useFrame(() => {
    const sp = scrollState.sp;
    const posAttr = lineGeo.attributes.instanceStart ? lineGeo : null;

    // Buffer arrays for dynamic updates
    const positions: number[] = [];
    const colors: number[] = [];

    TRAJECTORY_WAYPOINTS.forEach((wp) => {
      // Local segment parameter u
      const rawU = (sp - wp.at) / wp.span;

      for (let s = 0; s < SUBDIVISIONS; s++) {
        const u1 = s / SUBDIVISIONS;
        const u2 = (s + 1) / SUBDIVISIONS;

        const p1 = evaluateTrajectoryPoint(wp, u1);
        const p2 = evaluateTrajectoryPoint(wp, u2);

        positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);

        // Visibility & propagation front:
        // Visible if segment is before current propagation head
        let alpha = 0.0;
        let isGoldPulse = false;

        if (rawU >= 0 && rawU <= 1.0) {
          // Segment phase lifecycle
          if (u1 <= rawU) {
            // Emergence and decay
            if (rawU < 0.12) {
              // EMIT phase
              alpha = (rawU / 0.12);
            } else if (rawU < 0.55) {
              // STABLE ORBIT phase
              alpha = 1.0;
            } else if (rawU < 0.80) {
              // SLINGSHOT phase
              alpha = 1.0;
            } else {
              // DISSOLVE phase
              alpha = 1.0 - ((rawU - 0.80) / 0.20);
            }

            // Propagation leading front injection: gold impulse at the head
            const distFromHead = Math.abs(u2 - rawU);
            if (distFromHead < 0.06) {
              isGoldPulse = true;
            }
          }
        } else if (rawU > 1.0 && rawU < 1.3) {
          // Residual dissipation
          alpha = Math.max(0, 1.0 - (rawU - 1.0) / 0.3) * 0.2;
        }

        // Color calculation:
        // Starlight white boosted to gain 1.3 to blow through the bloom threshold (1.15)
        // Gold impulse (#fde047 / #eab308) at leading propagation front
        if (isGoldPulse) {
          // Radiant gold impulse (gain 1.4)
          colors.push(
            1.4 * alpha, 1.2 * alpha, 0.3 * alpha,
            1.4 * alpha, 1.2 * alpha, 0.3 * alpha
          );
        } else {
          // Starlight white (gain 1.3)
          const g = 1.3 * alpha;
          colors.push(
            0.97 * g, 0.98 * g, 1.0 * g,
            0.97 * g, 0.98 * g, 1.0 * g
          );
        }
      }
    });

    lineGeo.setPositions(positions);
    lineGeo.setColors(colors);
  });

  return (
    <primitive
      object={new LineSegments2(lineGeo, lineMat)}
      ref={lineSegmentsRef}
    />
  );
};
