import { useEffect, useRef } from "react";

const LatticeVideo = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let points: {x: number, y: number, vx: number, vy: number}[] = [];
    // Number of points representing the ML-DSA lattice nodes
    const numPoints = 120;
    
    // Resize handler to always fill the hero container smoothly
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    window.addEventListener("resize", resize);
    resize();

    // Initialize lattice points
    for(let i = 0; i < numPoints; i++) {
        // Distribute them evenly
      points.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4
      });
    }

    let animationFrameId: number;

    const loop = () => {
      // Very slight motion blur / trailing effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      for(let i = 0; i < numPoints; i++) {
        let p = points[i];
        p.x += p.vx;
        p.y += p.vy;
        
        // Bounce off walls smoothly
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        // Calculate distances and draw bonds (lattice edges)
        for(let j = i + 1; j < numPoints; j++) {
          let p2 = points[j];
          let dx = p.x - p2.x;
          let dy = p.y - p2.y;
          let dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < 180) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            // Dynamic cyan opacity based on distance
            ctx.strokeStyle = `rgba(14, 116, 144, ${0.8 - (dist/180) * 0.8})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        
        // Draw the computational nodes
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fill();
        
        // Halo effect on nodes
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(14, 116, 144, 0.1)";
        ctx.fill();
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full mix-blend-screen opacity-90"
      style={{ backgroundColor: "#000" }}
    />
  );
};

export default LatticeVideo;
