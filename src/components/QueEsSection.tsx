import KaTeX from "./KaTeX";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Cpu, Grid3X3, ExternalLink } from "lucide-react";

const QueEsSection = () => {
  return (
    <section id="que-es" className="relative pb-24 z-10">
      <div className="max-w-5xl">
        <div className="text-left mb-12 sm:mb-16 pl-3 sm:pl-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-white border-l-4 border-white pl-3 sm:pl-4">
            ¿Qué es Dilithium?
          </h2>
          <p className="text-slate-400 max-w-3xl mt-4 sm:mt-6 text-sm sm:text-lg font-light leading-relaxed">
            Un esquema de firma digital basado en retículos (lattices) diseñado para resistir ataques
            de computadores cuánticos. Estandarizado por{" "}
            <a
              href="https://csrc.nist.gov/pubs/fips/204/final"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#0e7490] font-semibold text-xs sm:text-sm hover:underline underline-offset-2"
            >
              NIST como ML-DSA en 2024
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 shrink-0" />
            </a>.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16 pl-3 sm:pl-6">
          {[
            {
              icon: Cpu,
              title: "Amenaza Cuántica",
              text: "El algoritmo de Shor puede romper RSA y curvas elípticas. Dilithium resiste estos ataques.",
            },
            {
              icon: Grid3X3,
              title: "Lattice-Based",
              text: "Basado en la dificultad de problemas Module-LWE y Module-SIS sobre retículos algebraicos.",
            },
            {
              icon: ShieldCheck,
              title: "Estándar NIST",
              text: "Seleccionado como estándar federal (FIPS 204) tras un proceso de evaluación de más de 6 años.",
            },
          ].map(({ icon: Icon, title, text }) => (
             <div key={title} className="border-t-2 border-white/10 pt-4 sm:pt-6">
                 <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-[#0e7490] mb-3 sm:mb-4" />
                 <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-white">{title}</h3>
                 <p className="text-slate-400 font-light text-xs sm:text-sm leading-relaxed">{text}</p>
             </div>
          ))}
        </div>

        <div className="bg-black text-white p-5 sm:p-8 md:p-12 mb-8 sm:mb-12 shadow-2xl relative overflow-hidden" style={{ clipPath: "polygon(0 0, 100% 0, 98% 100%, 0% 100%)" }}>
           <div className="absolute top-0 right-0 w-64 h-64 bg-[#0e7490]/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
           <h3 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Dominio Matemático</h3>
           <p className="text-slate-400 font-light mb-4 sm:mb-6 text-xs sm:text-base">Dilithium opera sobre el anillo de polinomios:</p>
           
           <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-6 rounded mb-4 sm:mb-6 flex justify-center text-sm sm:text-xl overflow-x-auto max-w-full">
              <KaTeX
                math="R_q = \mathbb{Z}_q[X] / (X^{256} + 1), \quad q = 8\,380\,417"
                display
              />
           </div>
           
           <p className="text-slate-400 font-light max-w-3xl text-xs sm:text-base leading-relaxed">
             Cada elemento es un polinomio de grado ≤ 255 con coeficientes módulo{" "}
             <span className="text-white"><KaTeX math="q" /></span>. Las operaciones se aceleran mediante la{" "}
             <span className="font-bold text-white">NTT</span> (Number Theoretic Transform).
           </p>
        </div>

        <div className="bg-[#030303] border border-white/10 p-5 sm:p-8 md:p-12 mb-6">
           <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">El Estándar ML-DSA</h3>
           <p className="text-slate-400 font-light mb-6 sm:mb-8 max-w-3xl text-xs sm:text-base">
             El NIST define tres niveles de seguridad para ML-DSA, cada uno basado en la dureza computacional de problemas reticulares:
           </p>

           <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {[
                { name: "ML-DSA-44", cat: "Categoría 2", equiv: "AES-128" },
                { name: "ML-DSA-65", cat: "Categoría 3", equiv: "AES-192" },
                { name: "ML-DSA-87", cat: "Categoría 5", equiv: "AES-256" },
              ].map((l) => (
                <div key={l.name} className="border border-white/10 p-4 sm:p-6 flex flex-col items-start bg-white/5 hover:bg-white/10 transition-colors">
                  <span className="text-xs uppercase tracking-widest text-[#0e7490] font-bold mb-2">{l.cat}</span>
                  <p className="font-mono text-lg sm:text-xl font-bold text-white mb-1">{l.name}</p>
                  <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-2 sm:mt-4">≈ {l.equiv}</p>
                </div>
              ))}
           </div>
           
           <p className="text-slate-500 font-light max-w-4xl text-xs sm:text-sm leading-relaxed">
              Los niveles superiores aumentan las dimensiones de la matriz <KaTeX math="\mathbf{A}" /> y los tamaños de clave, ofreciendo mayor seguridad a cambio de firmas más grandes y operaciones ligeramente más lentas.
           </p>
        </div>
      </div>
    </section>
  );
};

export default QueEsSection;
