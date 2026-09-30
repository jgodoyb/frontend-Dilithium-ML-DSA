import KaTeX from "./KaTeX";
import { ShieldCheck, Cpu, Grid3X3, ExternalLink } from "lucide-react";
import PixelTransition from "@/components/ui/pixel-transition";

const PILLARS = [
  {
    idx: "01",
    icon: Cpu,
    title: "Amenaza Cuántica",
    subtitle: "Riesgo Post-RSA",
    text: "El algoritmo de Shor rompe RSA y curvas elípticas en tiempo polinómico. Dilithium resiste de raíz estos ataques mediante dureza de retículos geométricos.",
    equiv: "Resistencia Cuántica Total (Shor-Proof)",
  },
  {
    idx: "02",
    icon: Grid3X3,
    title: "Lattice-Based",
    subtitle: "Module-LWE / SIS",
    text: "Basado en la dificultad matemática de los problemas Module-LWE y Module-SIS formulados sobre anillos ciclotómicos multidimensionales sin trampa geométrica.",
    equiv: "Dureza en Retículos R_q",
  },
  {
    idx: "03",
    icon: ShieldCheck,
    title: "Estándar NIST",
    subtitle: "FIPS 204 (2024)",
    text: "Seleccionado como estándar federal oficial FIPS 204 tras un riguroso proceso de evaluación abierta de más de 6 años por la comunidad criptográfica mundial.",
    equiv: "Certificación Oficial NIST FIPS 204",
  },
];

const LEVELS = [
  {
    name: "ML-DSA-44",
    cat: "Categoría 2",
    equiv: "AES-128",
    specs: "Matriz A de 4x4 • η=2 • Firma: 2.420 B",
    desc: "Nivel de seguridad base optimizado para dispositivos embebidos, IoT y sistemas con restricciones severas de ancho de banda o memoria RAM.",
  },
  {
    name: "ML-DSA-65",
    cat: "Categoría 3",
    equiv: "AES-192",
    specs: "Matriz A de 6x5 • η=4 • Firma: 3.309 B",
    desc: "El estándar recomendado de propósito general para despliegues corporativos, TLS post-cuántico, firmas de software y comunicaciones web.",
  },
  {
    name: "ML-DSA-87",
    cat: "Categoría 5",
    equiv: "AES-256",
    specs: "Matriz A de 8x7 • η=2 • Firma: 4.627 B",
    desc: "Máxima fortaleza criptográfica diseñada para infraestructura crítica, banca central, soberanía digital y protección de secretos a ultra largo plazo.",
  },
];

const QueEsSection = () => {
  return (
    <div id="que-es" className="space-y-16">
      {/* Intro */}
      <div className="space-y-4">
        <h3 className="text-xl sm:text-2xl font-bold text-zinc-100 border-l-2 border-cyan-400 pl-4">
          ¿Qué es Dilithium?
        </h3>
        <p className="text-zinc-400 max-w-3xl text-sm sm:text-base font-mono leading-relaxed pl-4">
          Un esquema de firma digital basado en retículos (lattices) diseñado para resistir ataques
          de computadores cuánticos. Estandarizado oficialmente por{" "}
          <a
            href="https://csrc.nist.gov/pubs/fips/204/final"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-cyan-400 font-semibold hover:underline underline-offset-4"
          >
            NIST como ML-DSA en 2024
            <ExternalLink className="w-3.5 h-3.5 ml-0.5 shrink-0" />
          </a>.
        </p>
      </div>

      {/* 3 Pillars con PixelTransition (Reducción de Carga Cognitiva) */}
      <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
        {PILLARS.map((pillar) => {
          const PillarIcon = pillar.icon;
          return (
            <PixelTransition
              key={pillar.title}
              gridSize={10}
              pixelColor="#0e7490"
              animationStepDuration={0.3}
              className="h-64 sm:h-72"
              firstContent={
                <div className="bg-zinc-950 p-8 h-full flex flex-col justify-between border border-zinc-800 rounded-none sm:rounded-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold">
                      [{pillar.idx}]
                    </span>
                    <div className="w-8 h-8 border border-zinc-800 bg-zinc-900 flex items-center justify-center text-cyan-400">
                      <PillarIcon className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
                      {pillar.subtitle}
                    </span>
                    <h4 className="text-xl sm:text-2xl font-bold font-mono text-zinc-100 tracking-tight">
                      {pillar.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400/80 tracking-wider">
                    <span className="inline-block w-1.5 h-1.5 bg-cyan-400 animate-pulse" />
                    [ HOVER_TO_DECODE ]
                  </div>
                </div>
              }
              secondContent={
                <div className="bg-zinc-900 p-8 h-full flex flex-col justify-between border border-cyan-500/50 rounded-none sm:rounded-sm">
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                      <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                        {pillar.title} // DECODED
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">[{pillar.idx}]</span>
                    </div>
                    <p className="text-zinc-300 text-xs sm:text-sm font-mono leading-relaxed">
                      {pillar.text}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-zinc-800/80 text-[10px] font-mono text-cyan-300/90 flex items-center justify-between">
                    <span className="text-zinc-400">EQUIVALENCIA:</span>
                    <span className="font-semibold text-zinc-200">{pillar.equiv}</span>
                  </div>
                </div>
              }
            />
          );
        })}
      </div>

      {/* Dominio Matemático (Academic Specification Block) - Espaciado Masivo */}
      <div className="bg-zinc-950 border border-zinc-800 p-8 sm:p-10 rounded-none sm:rounded-sm space-y-8">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold block mb-1">
            // ESPECIFICACIÓN_ALGEBRAICA
          </span>
          <h4 className="text-xl sm:text-2xl font-bold text-zinc-100 font-mono">Dominio Matemático</h4>
          <p className="text-zinc-400 text-xs sm:text-sm font-mono mt-2 leading-relaxed">
            Dilithium opera sobre el anillo de polinomios ciclotómicos:
          </p>
        </div>

        {/* Formula KaTeX Code Block con padding p-8 */}
        <div className="bg-black border border-zinc-800 border-l-2 border-l-cyan-400 p-8 sm:p-10 overflow-x-auto rounded-none sm:rounded-sm text-center">
          <KaTeX
            math="R_q = \mathbb{Z}_q[X] / (X^{256} + 1), \quad q = 8\,380\,417"
            display
          />
        </div>

        <p className="text-zinc-400 text-xs sm:text-sm font-mono leading-relaxed">
          Cada elemento es un polinomio de grado ≤ 255 con coeficientes módulo{" "}
          <span className="text-zinc-200 font-bold"><KaTeX math="q" /></span>. Las operaciones matriciales y convoluciones polinómicas se aceleran asintóticamente mediante la transformada teórica de números{" "}
          <span className="text-cyan-400 font-bold">NTT</span> (Number Theoretic Transform).
        </p>
      </div>

      {/* El Estándar ML-DSA con PixelTransition */}
      <div className="bg-zinc-950 border border-zinc-800 p-8 sm:p-10 rounded-none sm:rounded-sm space-y-8">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-500 font-bold block mb-1">
            // TOPOLOGÍA_DE_SEGURIDAD
          </span>
          <h4 className="text-xl sm:text-2xl font-bold text-zinc-100 font-mono">El Estándar ML-DSA</h4>
          <p className="text-zinc-400 text-xs sm:text-sm font-mono mt-2 leading-relaxed">
            El NIST define tres niveles de seguridad para ML-DSA según la dimensión del módulo:
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8 lg:gap-10">
          {LEVELS.map((l) => (
            <PixelTransition
              key={l.name}
              gridSize={10}
              pixelColor="#22d3ee"
              animationStepDuration={0.3}
              className="h-64 sm:h-72"
              firstContent={
                <div className="bg-zinc-950 p-8 h-full flex flex-col justify-between border border-zinc-800 rounded-none sm:rounded-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                      // {l.cat.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 font-semibold">{l.equiv}</span>
                  </div>
                  <div>
                    <h4 className="text-2xl sm:text-3xl font-bold font-mono text-zinc-100 tracking-tight">
                      {l.name}
                    </h4>
                    <p className="text-[11px] font-mono text-zinc-500 mt-2">{l.specs}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400/80 tracking-wider">
                    <span className="inline-block w-1.5 h-1.5 bg-cyan-400 animate-pulse" />
                    [ HOVER_TO_DECODE ]
                  </div>
                </div>
              }
              secondContent={
                <div className="bg-zinc-900 p-8 h-full flex flex-col justify-between border border-cyan-500/50 rounded-none sm:rounded-sm">
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                      <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                        {l.name} // SPECS
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">{l.cat}</span>
                    </div>
                    <p className="text-zinc-300 text-xs sm:text-sm font-mono leading-relaxed">
                      {l.desc}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-zinc-800/80 text-[10px] font-mono text-cyan-300/90 flex items-center justify-between">
                    <span className="text-zinc-400">EQUIV. SEGURIDAD:</span>
                    <span className="font-semibold text-zinc-200">{l.equiv}</span>
                  </div>
                </div>
              }
            />
          ))}
        </div>

        <p className="text-zinc-500 text-xs font-mono leading-relaxed pt-2">
          Los niveles superiores aumentan las dimensiones de la matriz <KaTeX math="\mathbf{A}" /> y los tamaños de clave, ofreciendo mayor resiliencia contra ataques de reducción de retículo (BKZ) a cambio de mayor consumo de bytes.
        </p>
      </div>
    </div>
  );
};

export default QueEsSection;
