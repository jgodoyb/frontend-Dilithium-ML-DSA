'use client';

import { type FC, type CSSProperties } from 'react';

export interface GlitchTextProps {
  children: string;
  speed?: number;
  enableShadows?: boolean;
  enableOnHover?: boolean;
  className?: string;
  afterShadowColor?: string;
  beforeShadowColor?: string;
}

interface CustomCSSProperties extends CSSProperties {
  '--after-duration': string;
  '--before-duration': string;
  '--after-shadow': string;
  '--before-shadow': string;
}

export const GlitchText: FC<GlitchTextProps> = ({
  children,
  speed = 1,
  enableShadows = true,
  enableOnHover = false,
  className = '',
  afterShadowColor = 'rgba(14, 165, 233, 0.85)',
  beforeShadowColor = 'rgba(168, 85, 247, 0.85)',
}) => {
  const inlineStyles: CustomCSSProperties = {
    '--after-duration': `${Math.max(2, speed * 4.2)}s`,
    '--before-duration': `${Math.max(1.6, speed * 3.4)}s`,
    '--after-shadow': enableShadows ? `-2px 0 1px ${afterShadowColor}` : 'none',
    '--before-shadow': enableShadows ? `2px 0 1px ${beforeShadowColor}` : 'none',
  };

  const baseClasses = 'relative select-none inline-block';

  const pseudoClasses = !enableOnHover
    ? 'after:content-[attr(data-text)] after:absolute after:inset-0 after:w-full after:h-full after:pointer-events-none after:text-inherit after:bg-transparent after:overflow-hidden after:[text-shadow:var(--after-shadow)] after:animate-glitch-after ' +
      'before:content-[attr(data-text)] before:absolute before:inset-0 before:w-full before:h-full before:pointer-events-none before:text-inherit before:bg-transparent before:overflow-hidden before:[text-shadow:var(--before-shadow)] before:animate-glitch-before'
    : "after:content-[''] after:absolute after:inset-0 after:w-full after:h-full after:pointer-events-none after:text-inherit after:bg-transparent after:overflow-hidden after:opacity-0 " +
      "before:content-[''] before:absolute before:inset-0 before:w-full before:h-full before:pointer-events-none before:text-inherit before:bg-transparent before:overflow-hidden before:opacity-0 " +
      'hover:after:content-[attr(data-text)] hover:after:[text-shadow:var(--after-shadow)] hover:after:animate-glitch-after ' +
      'hover:before:content-[attr(data-text)] hover:before:[text-shadow:var(--before-shadow)] hover:before:animate-glitch-before';

  const combinedClasses = `${baseClasses} ${pseudoClasses} ${className}`;

  return (
    <span style={inlineStyles} data-text={children} className={combinedClasses}>
      {children}
    </span>
  );
};

export default GlitchText;
