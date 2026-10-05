import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import QueEsSection from "@/components/QueEsSection";
import NivelesSeguridad from "@/components/NivelesSeguridad";
import GeneracionClavesSection from "@/components/GeneracionClavesSection";
import FirmaSection from "@/components/FirmaSection";
import VerificacionSection from "@/components/VerificacionSection";
import AlgorithmBlueprintSection from "@/components/AlgorithmBlueprintSection";
import ColorBends from "@/components/ui/color-bends";
import GlitchText from "@/components/ui/glitch-text";

// Categorías para el Sticky Sidebar
const NAV_ITEMS = [
  { id: "fundamentos", num: "01", label: "Fundamentos FIPS 204" },
  { id: "rendimiento", num: "02", label: "Estándar y Rendimiento" },
  { id: "generacion", num: "03", label: "Generación de Claves" },
  { id: "firma", num: "04", label: "Proceso de Firma" },
  { id: "verificacion", num: "05", label: "Protocolo de Verificación" },
  { id: "blueprint", num: "06", label: "Arquitectura (Blueprint)" }
];

const Technology = () => {
  const [activeSection, setActiveSection] = useState("fundamentos");

  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const handleScroll = () => {
      const sections = NAV_ITEMS.map(item => document.getElementById(item.id));
      let current = "";

      for (const section of sections) {
        if (section) {
          const sectionTop = section.getBoundingClientRect().top;
          if (sectionTop <= 250) {
            current = section.id;
          }
        }
      }
      if (current && current !== activeSection) {
        setActiveSection(current);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeSection]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yStr = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: yStr, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-cyan-500/20 selection:text-cyan-300 relative overflow-x-hidden">
      {/* ── FONDO ÚNICO GLOBAL (ColorBends) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-70">
        <ColorBends
          colors={["#0e7490", "#09090b", "#18181b", "#155e75"]}
          warpStrength={1.2}
          speed={0.2}
          intensity={1.2}
          transparent={true}
        />
      </div>
      {/* Capa de contraste / viñeteado para lectura nítida de KaTeX */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.2)_0%,rgba(0,0,0,0.75)_100%)]" />

      {/* ── HEADER ÚNICO FUSIONADO (Técnico & Brutalista) ── */}
      <header className="relative z-10 pt-28 pb-16 border-b border-zinc-800 bg-black/40 backdrop-blur-sm">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-12 xl:px-20">
          {/* Micro-copy superior */}
          <div className="mb-5 flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-semibold">
              [ NIST FIPS 204 // SPECIFICATION & MATHEMATICAL ARCHITECTURE ]
            </span>
          </div>

          {/* Título Principal con GlitchText */}
          <div className="mb-10 sm:mb-12">
            <GlitchText
              speed={0.25}
              enableShadows={true}
              className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-100 uppercase mx-0 inline-block font-sans leading-[1.15] sm:leading-[1.1] pb-2"
            >
              CRYSTALS-DILITHIUM (ML-DSA)
            </GlitchText>
          </div>

          {/* Subtítulo directo */}
          <p className="text-zinc-400 font-mono text-sm sm:text-base max-w-3xl leading-relaxed">
            Desglose arquitectónico y matemático paso a paso del estándar de firma digital post-cuántica basado en retículas algebraicas (Module-LWE / Module-SIS). Desde la aritmética polinómica en dominio NTT hasta el protocolo de verificación.
          </p>

          {/* Metadatos técnicos en barra horizontal */}
          <div className="border-y border-zinc-800 bg-zinc-950/80 py-4 px-6 grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs mt-10 sm:mt-12">
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase tracking-wider mb-0.5">ALGORITMO</span>
              <span className="text-zinc-200 font-bold">ML-DSA-65</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase tracking-wider mb-0.5">ANILLO</span>
              <span className="text-zinc-200 font-bold">R_q = Z_q[X]/(X^256 + 1)</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase tracking-wider mb-0.5">MÓDULO (q)</span>
              <span className="text-zinc-200 font-bold">8.380.417</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase tracking-wider mb-0.5">SEGURIDAD</span>
              <span className="text-cyan-400 font-bold">NIST Nivel 3 (≈ AES-192)</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── STICKY SIDEBAR LAYOUT ── */}
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-12 xl:px-20 grid lg:grid-cols-[280px_1fr] gap-8 lg:gap-16 relative pb-32 z-10 mt-14 sm:mt-16">
        {/* SIDEBAR (Panel Izquierdo Brutalista) */}
        <aside className="hidden lg:block relative">
          <div className="sticky top-28 py-6 px-4 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-none sm:rounded-sm">
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold mb-6 pb-2 border-b border-zinc-800 flex items-center justify-between">
              <span>// ÍNDICE</span>
              <span className="text-cyan-400 text-[10px]">v2.0</span>
            </h3>
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`block w-full text-left px-3 py-2.5 border-l-2 transition-all font-mono text-xs ${isActive
                      ? "border-cyan-400 text-zinc-100 font-bold bg-cyan-950/20"
                      : "border-transparent text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                  >
                    <span className={`mr-2 ${isActive ? "text-cyan-400" : "text-zinc-600"}`}>
                      [{item.num}]
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL A LA DERECHA */}
        <div className="relative lg:pl-8 min-w-0">
          {/* TRACKER VERTICAL ANIMADO */}
          <div className="hidden lg:block absolute left-0 top-6 bottom-0 w-px bg-zinc-800 z-0">
            <motion.div
              className="w-[2px] bg-cyan-400 origin-top"
              style={{ scaleY, height: "100%" }}
            />
          </div>

          <main className="py-2 space-y-44 relative z-10 min-w-0">
            {/* CATEGORÍA 1: FUNDAMENTOS */}
            <section id="fundamentos" className="scroll-mt-32">
              <div className="border-b border-zinc-800 pb-3 mb-8 flex items-center gap-3">
                <span className="text-cyan-400 font-mono text-sm">[01]</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
                  Fundamentos FIPS 204
                </h2>
              </div>
              <QueEsSection />
            </section>

            {/* CATEGORÍA 2: ESTÁNDAR Y RENDIMIENTO */}
            <section id="rendimiento" className="scroll-mt-32">
              <div className="border-b border-zinc-800 pb-3 mb-8 flex items-center gap-3">
                <span className="text-cyan-400 font-mono text-sm">[02]</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
                  Estándar y Rendimiento
                </h2>
              </div>
              <NivelesSeguridad />
            </section>

            {/* CATEGORÍA 3: GENERACIÓN DE CLAVES */}
            <section id="generacion" className="scroll-mt-32">
              <div className="border-b border-zinc-800 pb-3 mb-8 flex items-center gap-3">
                <span className="text-cyan-400 font-mono text-sm">[03]</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
                  Generación de Claves (KeyGen)
                </h2>
              </div>
              <GeneracionClavesSection />
            </section>

            {/* CATEGORÍA 4: PROCESO DE FIRMA */}
            <section id="firma" className="scroll-mt-32">
              <div className="border-b border-zinc-800 pb-3 mb-8 flex items-center gap-3">
                <span className="text-cyan-400 font-mono text-sm">[04]</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
                  Proceso de Firma
                </h2>
              </div>
              <FirmaSection />
            </section>

            {/* CATEGORÍA 5: VERIFICACIÓN */}
            <section id="verificacion" className="scroll-mt-32">
              <div className="border-b border-zinc-800 pb-3 mb-8 flex items-center gap-3">
                <span className="text-cyan-400 font-mono text-sm">[05]</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
                  Protocolo de Verificación
                </h2>
              </div>
              <VerificacionSection />
            </section>

            {/* CATEGORÍA 6: BLUEPRINT */}
            <section id="blueprint" className="scroll-mt-32 pb-24">
              <div className="border-b border-zinc-800 pb-3 mb-8 flex items-center gap-3">
                <span className="text-cyan-400 font-mono text-sm">[06]</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
                  The Algorithm Blueprint
                </h2>
              </div>
              <AlgorithmBlueprintSection />
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Technology;
