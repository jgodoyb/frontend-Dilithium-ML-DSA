import { ChevronDown, Shield, Lock, Key } from "lucide-react";

const HeroSection = () => {
  return (
    <section id="hero" className="relative pb-16 flex items-start justify-start">
      <div className="max-w-3xl z-10 text-left">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 border border-white/20 bg-white/5 text-xs font-semibold text-white tracking-wider">
          <Shield className="w-3.5 h-3.5 text-[#0e7490]" />
          NIST FIPS 204 · Estándar Post-Cuántico 2024
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight text-white border-l-4 border-[#0e7490] pl-6">
          Dilithium
        </h1>
        <p className="font-mono text-[#0e7490] text-lg md:text-xl mb-6 pl-6">ML-DSA-65</p>

        <p className="text-base md:text-lg text-slate-400 max-w-xl mb-10 leading-relaxed pl-6">
          Guía técnica paso a paso del algoritmo de{" "}
          <span className="text-white font-semibold">firma digital post-cuántica</span>{" "}
          que protegerá la información en la era de los computadores cuánticos.
        </p>

        <div className="flex flex-wrap items-start justify-start gap-3 pl-6">
          {[
            { icon: Lock, text: "Basado en Lattices" },
            { icon: Shield, text: "Seguridad Nivel 3" },
            { icon: Key, text: "Estándar NIST 2024" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 px-4 py-2 border border-white/10 bg-white/5 text-xs text-slate-300 font-semibold"
            >
              <Icon className="w-3.5 h-3.5 text-[#0e7490]" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
