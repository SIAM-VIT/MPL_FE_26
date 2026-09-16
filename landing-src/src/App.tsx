import React, { useEffect } from 'react';
import { CosmicScene } from './canvas/CosmicScene';
import { HudOverlay } from './hud/HudOverlay';
import { initScrollTracking } from './state/scrollController';

export const App: React.FC = () => {
  useEffect(() => {
    // Single mutable scroll listener initialized once
    const cleanup = initScrollTracking();
    return cleanup;
  }, []);

  return (
    <main>
      {/* 2200vh continuous scroll track with zero traditional page sections */}
      <div className="scroll-container">
        {/* Single sticky stage: fixed 100vw x 100vh */}
        <div className="sticky-stage">
          <CosmicScene />
          <HudOverlay />
        </div>
      </div>
    </main>
  );
};

export default App;
