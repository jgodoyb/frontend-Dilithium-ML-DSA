import { Shield, Lock, Fingerprint, Hexagon } from "lucide-react";
import { motion } from "framer-motion";

interface AuthSplitLayoutProps {
  children: React.ReactNode;
}

const AuthSplitLayout = ({ children }: AuthSplitLayoutProps) => {
  return (
    <div className="min-h-screen pt-14 flex flex-col lg:flex-row bg-black text-white selection:bg-[#0e7490] selection:text-white">
      {/* Left: Visual panel (Immersive Image) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black items-center justify-center overflow-hidden border-r border-white/5">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity scale-105 animate-[pulse_10s_ease-in-out_infinite]" 
          style={{ backgroundImage: 'url("/auth-core.png")' }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black"></div>
        
        <div className="relative z-10 max-w-lg px-10 space-y-10 w-full mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-10">
               <Hexagon className="w-8 h-8 text-[#0e7490]" />
               <span className="font-bold text-2xl tracking-wide text-white">
                 Q-Proof <span className="text-slate-400 font-mono text-xl">Systems</span>
               </span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 border-l-2 border-[#0e7490] text-xs font-mono text-slate-300 uppercase tracking-widest bg-white/5">
              Identidad Criptográfica
            </div>

            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white leading-tight">
              Asegurando el <br />
              <span className="text-[#0e7490] font-bold">Futuro Cuántico</span>
            </h1>

            <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-md font-light">
              Plataforma de seguridad institucional impulsada por algoritmos ML-DSA-65 (FIPS 204). Autentica identidades corporativas con esquemas matemáticos resistentes a criptoanálisis post-cuántico.
            </p>

            <div className="space-y-4 pt-8 border-t border-white/10 max-w-md">
              {[
                { icon: Lock, text: "Algoritmos Criptográficos End-to-End Lattice-Based" },
                { icon: Fingerprint, text: "Cumplimiento Estricto Normativa NIST PQC" },
                { icon: Shield, text: "Despliegues On-Premise para Enterprise" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-4 text-sm text-slate-300 font-light">
                  <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center bg-white/5 border border-white/10">
                    <Icon className="w-4 h-4 text-[#0e7490]" />
                  </div>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 lg:py-0 bg-[#030303] relative z-10 w-full">
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 1.5 }}
           className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0e7490]/10 via-transparent to-transparent opacity-50"
        />
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md relative z-10"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default AuthSplitLayout;
