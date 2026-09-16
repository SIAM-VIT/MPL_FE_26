import React, { useEffect, useRef } from 'react';

export const Starfield = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate stars
    const starCount = Math.min(180, Math.floor((width * height) / 8000));
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.6 + 0.4,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.15 + 0.05,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleMouseMove = (e) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let time = 0;
    const render = () => {
      time += 1;
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const parallaxX = (mouseX - width / 2) * 0.02;
      const parallaxY = (mouseY - height / 2) * 0.02;

      stars.forEach((star) => {
        star.y -= star.speed;
        if (star.y < 0) {
          star.y = height;
          star.x = Math.random() * width;
        }

        const currentAlpha =
          star.alpha * (0.6 + 0.4 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset));
        const drawX = (star.x + parallaxX * star.size + width) % width;
        const drawY = (star.y + parallaxY * star.size + height) % height;

        ctx.fillStyle = `rgba(224, 231, 255, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(drawX, drawY, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Subtle glow for larger stars
        if (star.size > 1.4) {
          ctx.fillStyle = `rgba(99, 102, 241, ${currentAlpha * 0.35})`;
          ctx.beginPath();
          ctx.arc(drawX, drawY, star.size * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <div className="cosmic-layer aurora-glow" />
      <div className="cosmic-layer aurora-glow-alt" />
      <div className="grid-overlay" />
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    </>
  );
};
