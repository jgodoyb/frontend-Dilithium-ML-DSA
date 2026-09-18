import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import QueEsSection from "@/components/QueEsSection";
import NivelesSeguridad from "@/components/NivelesSeguridad";
import GeneracionClavesSection from "@/components/GeneracionClavesSection";
import FirmaSection from "@/components/FirmaSection";
import VerificacionSection from "@/components/VerificacionSection";
import AlgorithmBlueprintSection from "@/components/AlgorithmBlueprintSection";
import LatticeVideo from "@/components/LatticeVideo";

// --- MAIN WRAPPER ---
const Technology = () => {
  const [activeSection, setActiveSection] = useState("fundamentos");
  
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Categorías para el Sticky Sidebar ordenadas según petición
  const navItems = [
    { id: "fundamentos", label: "Fundamentos FIPS 204" },
    { id: "rendimiento", label: "Estándar y Rendimiento" },
    { id: "generacion", label: "Generación de Claves" },
    { id: "firma", label: "Proceso de Firma" },
    { id: "verificacion", label: "Proceso de Verificación" },
    { id: "blueprint", label: "Arquitectura (Blueprint)" }
  ];

  useEffect(() => {
    const handleScroll = () => {
      const sections = navItems.map(item => document.getElementById(item.id));
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
  }, [activeSection, navItems]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yStr = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: yStr, behavior: "smooth" });
    }
  };

   return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.7, 
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="min-h-screen bg-black text-white font-sans selection:bg-[#0e7490] selection:text-white relative overflow-x-hidden"
    >
      {/* FONDO DINÁMICO GLOBAL (Lattice Atado) */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-15 mix-blend-screen overflow-hidden">
        <LatticeVideo />
      </div>
      <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-b from-black/20 via-black/80 to-[#050505] mix-blend-multiply"></div>
      
      
      {/* ── HIGH-END STRATEGIC HERO ── */}
      <section className="relative w-full h-[60vh] min-h-[500px] overflow-hidden flex items-center justify-center z-10 border-b border-white/5 bg-black">
        {/* Preservamos el video de fondo como pidió el usuario */}
        <div className="absolute inset-0 z-0">
          <LatticeVideo />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        </div>
        
        <div className="relative z-20 max-w-[1400px] mx-auto px-6 w-full text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
            className="flex items-center justify-center lg:justify-start gap-4 mb-8"
          >
            <div className="w-12 h-[2px] bg-gradient-to-r from-purple-500 to-cyan-500" />
            <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-slate-400">
               R&D Architecture & Protocols
            </span>
          </motion.div>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-end">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-4">
                Ingeniería del <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-cyan-400">
                  Rigor Matemático.
                </span>
              </h1>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="lg:pb-6"
            >
              <p className="text-lg text-slate-400 font-light leading-relaxed max-w-md mx-auto lg:mx-0 lg:border-l-[1px] border-white/10 lg:pl-8">
                Desglose técnico de la arquitectura ML-DSA-65. 
                Desde la generación de retículas hasta la validación FIPS 204.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STICKY SIDEBAR LAYOUT */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 xl:px-20 grid lg:grid-cols-[280px_1fr] gap-12 lg:gap-24 relative pb-32 z-10 mt-12">
        
        {/* SIDEBAR (Panel Izquierdo Pegajoso) */}
        <aside className="hidden lg:block relative">
          <div className="sticky top-32 space-y-2 py-10 bg-black/50 backdrop-blur-md rounded-xl p-6 border border-white/5 shadow-2xl">
            <h3 className="text-xs uppercase tracking-widest text-[#0e7490] font-bold mb-8 flex items-center gap-2">
              Índice de Arquitectura
            </h3>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`block w-full text-left px-4 py-3 border-l-2 transition-all text-sm ${
                  activeSection === item.id 
                  ? "border-[#0e7490] text-white font-bold bg-[#0e7490]/10" 
                  : "border-white/10 text-slate-400 hover:border-white/30 hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL A LA DERECHA */}
        <div className="relative lg:pl-12">
          {/* TRACKER VERTICAL ANIMADO (MAGIA) */}
          <div className="hidden lg:block absolute left-0 top-12 bottom-0 w-px bg-white/10 z-0">
             <motion.div 
               className="w-[2px] bg-[#0e7490] shadow-[0_0_15px_2px_rgba(14,116,144,0.8)] origin-top"
               style={{ scaleY, height: "100%" }}
             />
             <div className="absolute -left-1 top-0 w-3 h-3 rounded-full bg-[#0e7490] shadow-[0_0_10px_#0e7490]"></div>
          </div>

          <main className="py-10 space-y-32 relative z-10">
          
          {/* CATEGORÍA 1 */}
          <div id="fundamentos" className="scroll-mt-32">
            <h2 className="text-4xl font-light text-white mb-8 border-b border-white/10 pb-4 flex items-center gap-4">
              <span className="text-[#0e7490] font-mono text-xl">01</span> Fundamentos
            </h2>
            <div className="prose prose-invert max-w-none">
               <HeroSection />
               <div className="mt-8">
                 <QueEsSection />
               </div>
            </div>
          </div>

          {/* CATEGORÍA 2: ESTANDAR */}
          <div id="rendimiento" className="scroll-mt-32">
            <h2 className="text-4xl font-light text-white mb-8 border-b border-white/10 pb-4 flex items-center gap-4">
               <span className="text-[#0e7490] font-mono text-xl">02</span> Estándar y Rendimiento
            </h2>
            <NivelesSeguridad />
          </div>

          {/* CATEGORÍA 3.1: GENERACION */}
          <div id="generacion" className="scroll-mt-32">
            <h2 className="text-4xl font-light text-white mb-8 border-b border-white/10 pb-4 flex items-center gap-4">
               <span className="text-[#0e7490] font-mono text-xl">03</span> Generación de Claves
            </h2>
            <div className="space-y-4">
               <GeneracionClavesSection />
            </div>
          </div>

          {/* CATEGORÍA 3.2: FIRMA */}
          <div id="firma" className="scroll-mt-32">
            <h2 className="text-4xl font-light text-white mb-8 border-b border-white/10 pb-4 flex items-center gap-4">
               <span className="text-[#0e7490] font-mono text-xl">04</span> Proceso de Firma
            </h2>
            <div className="space-y-4">
               <FirmaSection />
            </div>
          </div>

          {/* CATEGORÍA 5: VERIFICACION */}
          <div id="verificacion" className="scroll-mt-32">
            <h2 className="text-4xl font-light text-white mb-8 border-b border-white/10 pb-4 flex items-center gap-4">
               <span className="text-[#0e7490] font-mono text-xl">05</span> Protocolo de Verificación
            </h2>
            <div className="space-y-4">
               <VerificacionSection />
            </div>
          </div>

          {/* CATEGORÍA 6: BLUEPRINT */}
          <div id="blueprint" className="scroll-mt-32 pb-32">
            <h2 className="text-4xl font-light text-white mb-8 border-b border-white/10 pb-4 flex items-center gap-4">
               <span className="text-[#0e7490] font-mono text-xl">06</span> Mapa de Dependencias
            </h2>
            <div className="space-y-4">
               <AlgorithmBlueprintSection />
            </div>
          </div>

          </main>
        </div>
      </div>
    </motion.div>
  );
};

export default Technology;
