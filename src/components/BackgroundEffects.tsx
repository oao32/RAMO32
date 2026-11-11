import React, { useEffect, useRef } from 'react';

export const BackgroundEffects: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle definition
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      color: string;
      maxLife: number;
      life: number;
    }

    const particles: Particle[] = [];
    const colors = [
      'rgba(249, 115, 22, ', // bright orange
      'rgba(234, 88, 12, ',  // deeper orange
      'rgba(251, 146, 60, ', // amber gold
      'rgba(56, 189, 248, ', // subtle cyan-blue ambient
    ];

    const createParticle = (): Particle => {
      const isOrange = Math.random() > 0.15;
      const baseColor = isOrange ? colors[Math.floor(Math.random() * 3)] : colors[3];
      return {
        x: Math.random() * width,
        y: height + Math.random() * 50,
        size: Math.random() * 3 + 1,
        speedY: Math.random() * 1.2 + 0.4,
        speedX: (Math.random() - 0.5) * 0.8,
        opacity: Math.random() * 0.8 + 0.2,
        color: baseColor,
        maxLife: Math.random() * 180 + 120,
        life: 0,
      };
    };

    // Pre-populate particles
    for (let i = 0; i < 45; i++) {
      const p = createParticle();
      p.y = Math.random() * height;
      particles.push(p);
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Add new particle occasionally
      if (particles.length < 55 && Math.random() < 0.4) {
        particles.push(createParticle());
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.y -= p.speedY;
        p.x += p.speedX;

        // Fade in and out
        const progress = p.life / p.maxLife;
        let alpha = p.opacity;
        if (progress > 0.7) {
          alpha = p.opacity * (1 - (progress - 0.7) / 0.3);
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.max(0, alpha)})`;
        ctx.shadowBlur = p.size * 3;
        ctx.shadowColor = p.color === colors[3] ? '#38bdf8' : '#f97316';
        ctx.fill();
        ctx.shadowBlur = 0;

        if (p.y < -20 || p.life >= p.maxLife || p.x < 0 || p.x > width) {
          particles.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Dynamic Laser & Ambient Glow Orbs */}
      <div className="absolute top-1/4 left-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] animate-pulse pointer-events-none" />
      <div className="absolute top-1/3 right-[-10%] w-[600px] h-[600px] bg-orange-600/15 rounded-full blur-[160px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] left-1/3 w-[600px] h-[400px] bg-orange-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Interactive Embers Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
