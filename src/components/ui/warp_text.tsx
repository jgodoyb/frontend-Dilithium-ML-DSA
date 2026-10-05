'use client';

import React, { useEffect, useRef, type CSSProperties } from 'react';

export interface Props {
    text?: string;
    color?: string;
    warpStrength?: number;
    warpScale?: number;
    speed?: number;
    pointerInfluence?: number;
    pointerStrength?: number;
    refraction?: number;
    ripple?: boolean;
    fontSize?: string | number;
    fontWeight?: string | number;
    fontFamily?: string;
    letterSpacing?: string | number;
    lineHeight?: string | number;
    className?: string;
    style?: CSSProperties;
}

const getFontValue = (value: string | number): string => (typeof value === 'number' ? `${value}px` : value);

export const WarpText: React.FC<Props> = ({
    text = 'Jorge Godoy Godoy',
    color = '#ffffff',
    warpStrength = 0.05,
    speed = 0.6,
    fontSize = '1.75rem',
    fontWeight = 800,
    fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    letterSpacing = '-0.02em',
    className = '',
    style
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const displayText = text || 'Jorge Godoy Godoy';

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let rafId = 0;
        let isRunning = true;
        const startTime = performance.now();

        const pointer = {
            x: -1000,
            y: -1000,
            targetX: -1000,
            targetY: -1000,
            active: 0,
            targetActive: 0
        };

        const updateDimensions = () => {
            const rect = container.getBoundingClientRect();
            const width = Math.max(container.clientWidth || rect.width, 320);
            const height = Math.max(container.clientHeight || rect.height, 80);
            const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            canvas.style.background = 'transparent';
            canvas.style.border = 'none';
            canvas.style.outline = 'none';
            canvas.style.boxShadow = 'none';

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        updateDimensions();

        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(container);

        const handlePointerMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            pointer.targetX = e.clientX - rect.left;
            pointer.targetY = e.clientY - rect.top;
            pointer.targetActive = 1;
        };

        const handlePointerLeave = () => {
            pointer.targetActive = 0;
        };

        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerleave', handlePointerLeave);

        // Preload fonts
        if (document.fonts?.ready) {
            document.fonts.ready.then(() => {
                if (isRunning) updateDimensions();
            }).catch(() => {});
        }

        const render = (now: number) => {
            if (!isRunning) return;

            const rect = canvas.getBoundingClientRect();
            const width = rect.width || container.clientWidth || 300;
            const height = rect.height || container.clientHeight || 70;

            // Smooth pointer lerp
            pointer.x += (pointer.targetX - pointer.x) * 0.12;
            pointer.y += (pointer.targetY - pointer.y) * 0.12;
            pointer.active += (pointer.targetActive - pointer.active) * 0.08;

            ctx.clearRect(0, 0, width, height);

            const elapsed = (now - startTime) * 0.001;

            // Resolve font metrics
            const parsedFontSize = typeof fontSize === 'number' 
                ? `${fontSize}px` 
                : fontSize.includes('rem') 
                    ? `${parseFloat(fontSize) * 16}px`
                    : fontSize;

            ctx.font = `${fontWeight} ${parsedFontSize} ${fontFamily}`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';

            const startX = 4;
            const startY = height / 2;

            const chars = Array.from(displayText);
            let currentX = startX;

            const parsedLetterSpacing = typeof letterSpacing === 'number'
                ? letterSpacing
                : parseFloat(letterSpacing) * (parseFloat(parsedFontSize) || 28) || 0;

            const charMetrics = chars.map((char) => {
                const charWidth = ctx.measureText(char).width;
                const item = {
                    char,
                    x: currentX,
                    charWidth
                };
                currentX += charWidth + parsedLetterSpacing;
                return item;
            });

            // Render each character with fluid warp physics
            charMetrics.forEach(({ char, x: charBaseX, charWidth }, index) => {
                const charCenterX = charBaseX + charWidth / 2;
                const charCenterY = startY;

                const dx = charCenterX - pointer.x;
                const dy = charCenterY - pointer.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const radius = 160;

                // Pointer influence calculation
                const influence = Math.max(0, 1 - dist / radius);
                const fluidImpulse = Math.sin(dist * 0.04 - elapsed * 4.0) * pointer.active * influence;
                
                // Subtle organic idle wave
                const idleWave = Math.sin(elapsed * speed * 2.5 + index * 0.45) * 0.75;

                // Displacement
                const offsetX = fluidImpulse * 8.0 * (warpStrength * 20);
                const offsetY = (fluidImpulse * 12.0 * (warpStrength * 20)) + idleWave;
                const scale = 1 + pointer.active * influence * 0.08;
                const rotation = fluidImpulse * 0.05 * (warpStrength * 15);

                ctx.save();
                ctx.translate(charCenterX + offsetX, charCenterY + offsetY);
                if (rotation !== 0) ctx.rotate(rotation);
                if (scale !== 1) ctx.scale(scale, scale);

                // Chromatic dispersion layer when hovered
                if (pointer.active > 0.02 && influence > 0.05) {
                    const chromDist = pointer.active * influence * 2.2;
                    
                    // Cyan channel shift
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
                    ctx.fillText(char, -charWidth / 2 - chromDist, 0);

                    // Red/Pink channel shift
                    ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
                    ctx.fillText(char, -charWidth / 2 + chromDist, 0);
                }

                // Primary crisp character
                ctx.fillStyle = color;
                ctx.fillText(char, -charWidth / 2, 0);

                ctx.restore();
            });

            rafId = requestAnimationFrame(render);
        };

        rafId = requestAnimationFrame(render);

        return () => {
            isRunning = false;
            cancelAnimationFrame(rafId);
            resizeObserver.disconnect();
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('pointerleave', handlePointerLeave);
        };
    }, [displayText, color, fontSize, fontWeight, fontFamily, letterSpacing, speed, warpStrength]);

    return (
        <div
            ref={containerRef}
            className={`relative block h-full w-full select-none overflow-visible isolate ${className}`.trim()}
            style={style}
            role="heading"
            aria-level={1}
            aria-label={displayText}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 block h-full w-full pointer-events-auto cursor-default border-none outline-none shadow-none bg-transparent"
                style={{ touchAction: 'none', background: 'transparent', backgroundColor: 'transparent' }}
            />
            {/* Accessible screen reader text */}
            <span className="sr-only">{displayText}</span>
        </div>
    );
};

export default WarpText;
