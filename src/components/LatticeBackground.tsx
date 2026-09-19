import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
}

const LatticeBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Only run mouse particle effect on devices with mouse/fine pointer (desktop/laptop)
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: Particle[] = [];
    let mouseX = -100;
    let mouseY = -100;
    let lastMouseX = -100;
    let lastMouseY = -100;
    let isMouseOnScreen = false;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      isMouseOnScreen = true;
    };

    const onMouseLeave = () => {
      isMouseOnScreen = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);

    const spawnParticles = () => {
      if (!isMouseOnScreen) return;
      const dx = mouseX - lastMouseX;
      const dy = mouseY - lastMouseY;
      const speed = Math.sqrt(dx * dx + dy * dy);
      const count = Math.min(Math.floor(speed * 0.3) + 1, 5);

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const vel = 0.3 + Math.random() * 0.8;
        const maxLife = 60 + Math.random() * 60; // 1-2 seconds at 60fps
        particles.push({
          x: mouseX + (Math.random() - 0.5) * 8,
          y: mouseY + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * vel,
          vy: Math.sin(angle) * vel,
          alpha: 0.6 + Math.random() * 0.4,
          size: 1 + Math.random() * 1.5,
          life: 0,
          maxLife,
        });
      }
      lastMouseX = mouseX;
      lastMouseY = mouseY;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      spawnParticles();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;

        const progress = p.life / p.maxLife;
        const currentAlpha = p.alpha * (1 - progress);

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.3), 0, Math.PI * 2);
        const isLight = document.documentElement.classList.contains("light");
        const rgb = isLight ? "60, 40, 80" : "255, 255, 255";
        ctx.fillStyle = `rgba(${rgb}, ${currentAlpha})`;
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 50 }}
    />
  );
};

export default LatticeBackground;
