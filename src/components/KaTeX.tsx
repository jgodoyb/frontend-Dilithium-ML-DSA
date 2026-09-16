import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface KaTeXProps {
  math: string;
  display?: boolean;
  className?: string;
}

const KaTeX = ({ math, display = false, className = "" }: KaTeXProps) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      katex.render(math, ref.current, {
        displayMode: display,
        throwOnError: false,
        trust: true,
      });
    }
  }, [math, display]);

  return <span ref={ref} className={className} />;
};

export default KaTeX;
