import { ChevronDown, Shield, Lock, Key } from "lucide-react";

const HeroSection = () => {
  return (
    <section id="hero" className="relative pb-16 flex items-start justify-start">
      <div className="max-w-3xl z-10 text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 mb-6 sm:mb-8 border border-white/20 bg-white/5 text-[11px] sm:text-xs font-semibold text-white tracking-wider max-w-full">
          <Shield className="w-3.5 h-3.5 text-[#0e7490] shrink-0" />
          <span className="truncate sm:whitespace-normal">NIST FIPS 204 · Estándar Post-Cuántico 2024</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-3 sm:mb-4 tracking-tight text-white border-l-4 border-[#0e7490] pl-3.5 sm:pl-6">
          Dilithium
        </h1>
        <p className="font-mono text-[#0e7490] text-base sm:text-lg md:text-xl mb-4 sm:mb-6 pl-3.5 sm:pl-6">ML-DSA-65</p>

        <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-xl mb-8 sm:mb-10 leading-relaxed pl-3.5 sm:pl-6 break-words">
          Guía técnica paso a paso del algoritmo de{" "}
          <span className="text-white font-semibold">firma digital post-cuántica</span>{" "}
          que protegerá la información en la era de los computadores cuánticos.
        </p>

        <div className="flex flex-wrap items-start justify-start gap-2 sm:gap-3 pl-3.5 sm:pl-6">
          {[
            { icon: Lock, text: "Basado en Lattices" },
            { icon: Shield, text: "Seguridad Nivel 3" },
            { icon: Key, text: "Estándar NIST 2024" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 border border-white/10 bg-white/5 text-[11px] sm:text-xs text-slate-300 font-semibold"
            >
              <Icon className="w-3.5 h-3.5 text-[#0e7490] shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
