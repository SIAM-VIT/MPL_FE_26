// Deterministic Scroll Controller & Act Gateway
// Pure functions of scalar p (0 -> 1) and sp = clamp01(p / 0.82)

export interface ScrollState {
  p: number;      // raw normalized scroll position: 0 to 1
  sp: number;     // act axis: clamp01(p / 0.82)
  velocity: number;
  cursor: { x: number; y: number };
  reducedMotion: boolean;
}

export const scrollState: ScrollState = {
  p: 0,
  sp: 0,
  velocity: 0,
  cursor: { x: 0, y: 0 },
  reducedMotion: false,
};

// Pure math utilities
export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const smoothstep = (min: number, max: number, value: number): number => {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
};

export const smootherstep = (min: number, max: number, value: number): number => {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * x * (x * (x * 6 - 15) + 10);
};

// Continuous Act Weight Envelopes with 0.08 - 0.12 overlaps
export interface ActGates {
  act1: number; // The Singularity / Logo Synthesis
  act2: number; // Cosmic Coordinate Acceleration
  act3: number; // Gravitational Slingshot
  act4: number; // Convergence of Realms
  act5: number; // Tournament Core
  act6: number; // Horizon Break (real p)
  sp: number;
  p: number;
}

export const evaluateActs = (p: number): ActGates => {
  const sp = clamp01(p / 0.82);

  // Act 1: 0.00 to 0.24 (peak 0.00 to 0.14, fade out to 0.24)
  const act1 = 1.0 - smoothstep(0.12, 0.24, sp);

  // Act 2: 0.14 to 0.44 (fade in 0.14 to 0.22, peak to 0.34, fade out to 0.44)
  const act2In = smoothstep(0.14, 0.22, sp);
  const act2Out = 1.0 - smoothstep(0.34, 0.44, sp);
  const act2 = act2In * act2Out;

  // Act 3: 0.34 to 0.64 (fade in 0.34 to 0.42, peak to 0.54, fade out to 0.64)
  const act3In = smoothstep(0.34, 0.42, sp);
  const act3Out = 1.0 - smoothstep(0.54, 0.64, sp);
  const act3 = act3In * act3Out;

  // Act 4: 0.52 to 0.82 (fade in 0.52 to 0.62, peak to 0.74, fade out to 0.84)
  const act4In = smoothstep(0.52, 0.62, sp);
  const act4Out = 1.0 - smoothstep(0.74, 0.84, sp);
  const act4 = act4In * act4Out;

  // Act 5: 0.70 to 1.00 on sp
  const act5 = smoothstep(0.70, 0.86, sp);

  // Act 6: 0.80 to 1.00 on real p (Horizon Break portal wipe)
  const act6 = smoothstep(0.80, 0.96, p);

  return { act1, act2, act3, act4, act5, act6, sp, p };
};

// Global development inspection hook
if (typeof window !== 'undefined') {
  (window as unknown as { __MPL_ACTS__: () => ActGates }).__MPL_ACTS__ = () => evaluateActs(scrollState.p);
}

// Global scroll update listener - writes strictly to mutable ref
let lastScrollY = 0;
export const initScrollTracking = () => {
  if (typeof window === 'undefined') return () => {};

  // Check prefers-reduced-motion
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  scrollState.reducedMotion = mediaQuery.matches;
  const onMotionChange = (e: MediaQueryListEvent) => {
    scrollState.reducedMotion = e.matches;
  };
  mediaQuery.addEventListener('change', onMotionChange);

  // Mouse move for gentle cursor parallax
  const onMouseMove = (e: MouseEvent) => {
    scrollState.cursor.x = (e.clientX / window.innerWidth) * 2 - 1;
    scrollState.cursor.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };
  window.addEventListener('mousemove', onMouseMove, { passive: true });

  const onScroll = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const currentY = window.scrollY;
    const rawP = scrollHeight > 0 ? currentY / scrollHeight : 0;
    
    scrollState.velocity = (currentY - lastScrollY) / (scrollHeight || 1);
    lastScrollY = currentY;

    scrollState.p = clamp01(rawP);
    scrollState.sp = clamp01(scrollState.p / 0.82);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial sync

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('mousemove', onMouseMove);
    mediaQuery.removeEventListener('change', onMotionChange);
  };
};
