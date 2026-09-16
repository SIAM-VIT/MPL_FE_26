import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraRig } from './CameraRig';
import { EmblemBeadCloud } from './EmblemBeadCloud';
import { CoordinateLattice } from './CoordinateLattice';
import { CelestialTunnel } from './CelestialTunnel';
import { Trajectories } from './Trajectories';
import { ArenaPortals } from './ArenaPortals';
import { PostProcessing } from './PostProcessing';

export const CosmicScene: React.FC = () => {
  // DPR clamped to 1.0 (mobile) and 1.5 (desktop)
  const dpr = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    const isMobile = window.innerWidth <= 768;
    return Math.min(window.devicePixelRatio || 1, isMobile ? 1.0 : 1.5);
  }, []);

  return (
    <div className="canvas-wrapper">
      <Canvas
        dpr={dpr}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        camera={{
          fov: 48,
          near: 0.1,
          far: 350,
          position: [0, 8, 26],
        }}
        onCreated={({ gl, scene }) => {
          // Deep cosmic obsidian/navy base (~228 deg)
          gl.setClearColor(new THREE.Color('#070913'));
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;

          // Cosmic depth fog: lower hemisphere dissolves into cosmic navy void
          scene.fog = new THREE.Fog('#070913', 20, 240);
        }}
      >
        {/* Stellar key light and ambient cosmic fill */}
        <ambientLight intensity={0.4} color="#1b2552" />
        <directionalLight
          position={[15, 25, 20]}
          intensity={1.2}
          color="#f8fafc"
        />
        <pointLight
          position={[0, 8, 5]}
          intensity={2.0}
          distance={35}
          color="#eab308"
        />

        {/* Camera flight controller with Rodrigues bank & gear shifts */}
        <CameraRig />

        {/* Act 1: Instanced Bead Crest Cloud (40,000 spheres) */}
        <EmblemBeadCloud />

        {/* Act 1: Archimedean coordinate wireframe cage */}
        <CoordinateLattice />

        {/* Act 2: Three concentric wireframe celestial coordinate cylinders */}
        <CelestialTunnel />

        {/* Acts 2 & 3: 6-Waypoint shared orbital trajectories */}
        <Trajectories />

        {/* Acts 4 & 5: Three Arena Portals and Tournament Core */}
        <ArenaPortals />

        {/* Post-Processing Pipeline: UnrealBloom -> Vignette -> OutputPass -> Grain */}
        <PostProcessing />
      </Canvas>
    </div>
  );
};
