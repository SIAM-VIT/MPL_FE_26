import React, { useEffect, useRef } from 'react';

export const BackgroundLayers = ({ isLanding = false }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, DPR = 1;
    let stars = [];
    const shootingStars = [];
    let mouseX = -9999, mouseY = -9999, hasPointer = false;
    let frame = 0;
    let animId;

    const INFLUENCE = 190;
    const LINK_RADIUS = 200;
    const STAR_LINK_RADIUS = 76;

    const cursorGlow = document.getElementById('cursorGlow');
    const bgPhoto = document.querySelector('.bg-photo');
    const badgeWrap = document.getElementById('badgeWrap');

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      seedStars();
    }

    function seedStars() {
      const count = Math.max(70, Math.round((W * H) / (isLanding ? 7800 : 8200)));
      stars = [];
      for (let i = 0; i < count; i++) {
        const depth = Math.random() * 0.7 + 0.3;
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: depth * 1.65 + 0.45,
          baseAlpha: Math.random() * 0.52 + 0.28,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.015 + 0.006,
          depth: depth,
          tint: Math.random(),
          ox: 0,
          oy: 0,
          vx: 0,
          vy: 0,
        });
      }
    }

    function spawnShootingStar() {
      if (reduceMotion || shootingStars.length > 1 || Math.random() >= 0.006) return;
      shootingStars.push({
        x: Math.random() * W * 0.62 + W * 0.06,
        y: Math.random() * H * 0.24,
        vx: 6 + Math.random() * 4,
        vy: 3 + Math.random() * 2,
        life: 0,
        maxLife: 55 + Math.random() * 20,
      });
    }

    function draw() {
      frame++;
      ctx.clearRect(0, 0, W, H);
      const near = [];

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        let dist = Infinity;

        if (hasPointer) {
          const dx = (s.x + s.ox) - mouseX;
          const dy = (s.y + s.oy) - mouseY;
          dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          if (!reduceMotion && dist < INFLUENCE) {
            const force = (1 - dist / INFLUENCE) * (1.1 + s.depth * 1.1);
            s.vx += (dx / dist) * force * 2.25;
            s.vy += (dy / dist) * force * 2.25;
          }
        }

        // Spring back toward home + damping
        s.vx += (0 - s.ox) * 0.022;
        s.vy += (0 - s.oy) * 0.022;
        s.vx *= 0.91;
        s.vy *= 0.91;
        s.ox += s.vx;
        s.oy += s.vy;

        const tw = reduceMotion
          ? s.baseAlpha
          : s.baseAlpha + Math.sin(frame * s.speed + s.phase) * 0.28;
        const alpha = Math.max(0, Math.min(1, tw));
        const px = s.x + s.ox;
        const py = s.y + s.oy;

        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fillStyle =
          s.tint > 0.72 ? `rgba(210,228,255,${alpha})` : `rgba(255,255,255,${alpha})`;
        ctx.fill();

        if (hasPointer && dist < LINK_RADIUS) {
          near.push({ x: px, y: py, d: dist });
        }
      }

      // Constellation links: Cursor -> Nearby stars, and Nearby stars -> each other
      for (let a = 0; a < near.length; a++) {
        const na = near[a];
        const la = 1 - na.d / LINK_RADIUS;
        ctx.strokeStyle = `rgba(240,190,110,${la * 0.55})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mouseX, mouseY);
        ctx.lineTo(na.x, na.y);
        ctx.stroke();

        for (let b = a + 1; b < near.length; b++) {
          const nb = near[b];
          const ddx = na.x - nb.x;
          const ddy = na.y - nb.y;
          const dd = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dd < STAR_LINK_RADIUS) {
            const lb = 1 - dd / STAR_LINK_RADIUS;
            ctx.strokeStyle = `rgba(255,255,255,${lb * 0.32})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(na.x, na.y);
            ctx.lineTo(nb.x, nb.y);
            ctx.stroke();
          }
        }
      }

      // Bright glowing cursor star hub
      if (near.length) {
        const hub = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 5);
        hub.addColorStop(0, 'rgba(255,236,190,0.9)');
        hub.addColorStop(1, 'rgba(255,236,190,0)');
        ctx.fillStyle = hub;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shooting stars
      spawnShootingStar();
      for (let j = shootingStars.length - 1; j >= 0; j--) {
        const sh = shootingStars[j];
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life++;
        const lifeAlpha = 1 - sh.life / sh.maxLife;
        if (lifeAlpha <= 0) {
          shootingStars.splice(j, 1);
          continue;
        }
        const grad = ctx.createLinearGradient(
          sh.x,
          sh.y,
          sh.x - sh.vx * 8,
          sh.y - sh.vy * 8
        );
        grad.addColorStop(0, `rgba(255,244,214,${lifeAlpha})`);
        grad.addColorStop(1, 'rgba(255,244,214,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x - sh.vx * 8, sh.y - sh.vy * 8);
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    }

    function onPointer(clientX, clientY) {
      mouseX = clientX;
      mouseY = clientY;
      hasPointer = true;

      if (cursorGlow) {
        cursorGlow.style.setProperty('--mx', `${(clientX / window.innerWidth) * 100}%`);
        cursorGlow.style.setProperty('--my', `${(clientY / window.innerHeight) * 100}%`);
      }

      if (!reduceMotion) {
        const nx = clientX / window.innerWidth - 0.5;
        const ny = clientY / window.innerHeight - 0.5;

        if (badgeWrap && isLanding) {
          const rx = (ny) * -20;
          const ry = (nx) * 28;
          badgeWrap.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
        }

        if (bgPhoto) {
          bgPhoto.style.transform = `translate3d(${-nx * (isLanding ? 32 : 28)}px, ${-ny * (isLanding ? 28 : 24)}px, 0) scale(1.06)`;
        }
      }
    }

    const onMouseMove = (e) => onPointer(e.clientX, e.clientY);
    const onMouseLeave = () => {
      hasPointer = false;
      mouseX = -9999;
      mouseY = -9999;
      if (bgPhoto) bgPhoto.style.transform = 'translate3d(0,0,0) scale(1.06)';
      if (badgeWrap && isLanding) badgeWrap.style.transform = 'none';
    };
    const onTouchMove = (e) => {
      if (e.touches && e.touches[0]) onPointer(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('touchmove', onTouchMove);
      cancelAnimationFrame(animId);
    };
  }, [isLanding]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      <div className="bg-photo" aria-hidden="true" style={{ pointerEvents: 'none' }} />
      <div className="bg-tint" aria-hidden="true" style={{ pointerEvents: 'none' }} />
      <div className="aurora" style={{ pointerEvents: 'none' }}>
        <span className="a1" style={{ pointerEvents: 'none' }} />
        <span className="a2" style={{ pointerEvents: 'none' }} />
      </div>
      <div className="cursor-glow" id="cursorGlow" style={{ pointerEvents: 'none' }} />
      <canvas id="stars" ref={canvasRef} style={{ pointerEvents: 'none', position: 'fixed', inset: 0 }} />
      <div className="grid-bg" style={{ pointerEvents: 'none' }} />
    </div>
  );
};
