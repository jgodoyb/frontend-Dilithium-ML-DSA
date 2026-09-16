import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import KaTeX from "./KaTeX";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Hash, Shuffle, Grid3X3, Scissors, Target, PlusCircle, ShieldCheck, HelpCircle, Package, ArrowRight, RotateCcw,
} from "lucide-react";

const firmaSteps = [
  {
    num: 0, title: "Cálculo de μ", icon: Hash,
    description: "Se calcula el hash del mensaje vinculado a la clave pública. Se concatena tr con el mensaje M y se aplica SHAKE-256.",
    formula: "\\mu = \\text{SHAKE-256}(tr \\;\\|\\; M, \\; 64)",
    detail: "tr = SHAKE-256(pk) vincula la firma a la identidad del firmante. μ combina la identidad del firmante con el mensaje.",
    reject: false,
  },
  {
    num: 1, title: "Máscara y", icon: Shuffle,
    description: "Se genera el vector de máscara y. Cada coeficiente está en [-γ₁+1, γ₁]. El contador κ se incrementa en cada intento.",
    formula: "\\mathbf{y} = \\text{ExpandMask}(\\text{SHAKE-256}(K \\;\\|\\; \\mu) \\;\\|\\; \\kappa)",
    detail: "y actúa como nonce criptográfico que enmascara los vectores secretos. Si la firma falla, κ se incrementa generando un y nuevo.",
    reject: true,
  },
  {
    num: 2, title: "Compromiso w", icon: Grid3X3,
    description: "Se calcula w = Ay en dominio NTT por eficiencia.",
    formula: "\\mathbf{w} = \\text{NTT}^{-1}(\\hat{\\mathbf{A}} \\circ \\text{NTT}(\\mathbf{y}))",
    detail: "La multiplicación en NTT es O(n log n) vs O(n²). w tiene 6 polinomios de 256 coeficientes.",
    reject: true,
  },
  {
    num: 3, title: "Decompose (HighBits)", icon: Scissors,
    description: "Cada coeficiente de w se descompone en bits altos (w₁) y bits bajos (w₀).",
    formula: "(\\mathbf{w}_1, \\mathbf{w}_0) = \\text{Decompose}(\\mathbf{w}, \\; 2\\gamma_2)",
    detail: "w₁ = HighBits(r) captura la parte significativa. Pequeñas perturbaciones no alteran w₁, que es lo que Bob reconstruirá.",
    reject: true,
  },
  {
    num: 4, title: "Desafío c", icon: Target,
    description: "Se genera c como polinomio disperso con τ = 49 coeficientes ±1.",
    formula: "c = \\text{SampleInBall}(\\text{SHAKE-256}(\\mu \\;\\|\\; \\text{PackW1}(\\mathbf{w}_1)))",
    detail: "SampleInBall coloca 49 coeficientes ±1 en posiciones pseudoaleatorias. Solo 49/256 ≈ 19% son no nulos.",
    reject: true,
  },
  {
    num: 5, title: "Respuesta z", icon: PlusCircle,
    description: "Se calcula z sumando la máscara y con c·s₁.",
    formula: "\\mathbf{z} = \\mathbf{y} + c \\cdot \\mathbf{s}_1",
    detail: "La multiplicación c·s₁ se realiza sin NTT porque c es disperso. z debe parecer aleatorio para no revelar s₁.",
    reject: true,
  },
  {
    num: 6, title: "Verificación de Seguridad", icon: ShieldCheck,
    description: "El bucle de rechazo: dos condiciones deben cumplirse. Si alguna falla, κ++ y vuelta al Paso 1.",
    formula: "\\text{Check 1: } \\|\\mathbf{z}\\|_\\infty < 524{,}092",
    extraFormula: "\\text{Check 2: } \\|\\text{LowBits}(\\mathbf{w} - c\\mathbf{s}_2)\\|_\\infty < 261{,}692",
    detail: "Check 1 asegura que z no revele s₁. Check 2 asegura que los bits bajos no alteren los altos. ~4.25 intentos promedio.",
    reject: true, isRejectStep: true,
  },
  {
    num: 7, title: "Hint h", icon: HelpCircle,
    description: "Vector de bits que indica al verificador dónde los bits altos difieren. Máximo ω = 55 posiciones con hint = 1.",
    formula: "h = \\text{MakeHint}(-c\\mathbf{t}_0, \\; \\mathbf{w} - c\\mathbf{s}_2 + c\\mathbf{t}_0)",
    detail: "El hint codifica posiciones donde el redondeo cambia al sumar ct₀. Si se excede ω, también se reinicia.",
    reject: true,
  },
  {
    num: 8, title: "Empaquetado de Firma", icon: Package,
    description: "Se empaquetan los tres componentes de la firma con un tamaño fijo de 3293 bytes.",
    formula: "\\sigma = (\\tilde{c}, \\; \\mathbf{z}, \\; h), \\quad |\\sigma| = 3293 \\text{ bytes}",
    detail: "c̃ = 32 bytes, z con coeficientes de 20 bits, h indicando posiciones con hint = 1. Competitivo con RSA-2048.",
    reject: false,
  },
];

const FirmaSection = () => {
  const [activeStep, setActiveStep] = useState(0);
  const step = firmaSteps[activeStep];

  return (
    <section id="firma" className="relative pb-16 z-10">
      <div className="max-w-6xl">
        <div className="text-left mb-12 pl-6 border-l-4 border-[#0e7490]">
          <p className="text-sm font-semibold tracking-[0.2em] text-slate-400 uppercase mb-2">Fase 2</p>
          <h2 className="text-3xl font-bold mb-4 text-white">Proceso de Firma</h2>
          <p className="text-slate-400 max-w-3xl text-base font-light">
            Alice firma un mensaje mediante un{" "}
            <span className="text-white font-semibold">bucle de rechazo</span>: genera candidatas
            de firma y las descarta si podrían revelar información sobre sus claves secretas.
          </p>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-8 xl:gap-12 items-start mt-12">
          <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2.5 pb-6 lg:pb-0 hide-scrollbar w-full relative">
            {/* Línea conectora lg (vertical) */}
            <div className="hidden lg:block absolute left-[27px] top-6 bottom-6 w-px bg-white/10 z-0"></div>
            
            {firmaSteps.map((s, i) => (
              <button
                key={s.num}
                onClick={() => setActiveStep(i)}
                className={`relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all text-left min-w-[240px] lg:min-w-0 z-10 group overflow-hidden ${
                  activeStep === i
                    ? s.isRejectStep 
                      ? "bg-rose-500/10 border border-rose-500/30 shadow-[0_0_20px_rgba(225,29,72,0.15)]" 
                      : "bg-[#0e7490]/10 border border-[#0e7490]/30 shadow-[0_0_20px_rgba(14,116,144,0.15)]"
                    : "bg-black/40 border border-white/5 hover:bg-white/5 hover:border-white/10"
                }`}
              >
                <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold border transition-colors ${
                  activeStep === i 
                     ? s.isRejectStep ? "bg-rose-500/20 border-rose-500 text-rose-500" : "bg-[#0e7490]/20 border-[#0e7490] text-[#0e7490]"
                     : s.isRejectStep ? "bg-black border-rose-500/30 text-rose-500/50 group-hover:text-rose-500/80" : "bg-black border-white/20 text-white/50 group-hover:text-white/80"
                }`}>
                  {s.num}
                </div>
                <div className={`text-sm font-medium transition-colors ${
                  activeStep === i
                    ? "text-white"
                    : s.isRejectStep ? "text-rose-500/60 group-hover:text-rose-500/90" : "text-slate-400 group-hover:text-slate-200"
                }`}>
                  {s.title}
                </div>
              </button>
            ))}
          </div>

          {/* Card Content with Framer Motion AnimatePresence */}
          <div className="w-full relative min-h-[500px]">
             {/* Indicador de bucle emergente animado */}
             <div className="h-10 w-full mb-2">
                 <AnimatePresence mode="popLayout">
                    {step.reject && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center gap-2 text-xs h-full"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-500 animate-[spin_4s_linear_infinite]" />
                        <span className="text-rose-400 font-mono tracking-wider opacity-90">
                          Interior del bucle — si falla, κ++ e inicio
                        </span>
                      </motion.div>
                    )}
                 </AnimatePresence>
             </div>

             <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <Card className={`relative overflow-hidden backdrop-blur-md bg-[#050505]/95 border shadow-2xl ${
                  step.isRejectStep ? "border-rose-500/20 shadow-rose-500/5" : "border-white/10 shadow-[#0e7490]/5"
                }`}>
                   {/* Glow Radial Decorativo */}
                   <div className={`absolute -top-32 -right-32 w-[300px] h-[300px] rounded-full blur-[100px] opacity-20 pointer-events-none ${
                     step.isRejectStep ? "bg-rose-500" : "bg-[#0e7490]"
                   }`}></div>

                  <CardHeader className="pb-6 relative z-10 border-b border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                       <div className="flex items-center gap-4">
                         <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-inner relative ${
                           step.isRejectStep ? "bg-rose-500/10 border border-rose-500/30" : "bg-[#0e7490]/10 border border-[#0e7490]/30"
                         }`}>
                           <step.icon className={`w-7 h-7 ${step.isRejectStep ? "text-rose-400" : "text-[#0e7490]"}`} />
                           {step.isRejectStep && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border border-black animate-pulse"></span>}
                         </div>
                         <div>
                           <span className={`font-mono text-xs tracking-widest uppercase mb-1.5 block font-semibold ${step.isRejectStep ? "text-rose-400" : "text-[#0e7490]"}`}>
                             Paso {step.num}
                           </span>
                           <CardTitle className="text-2xl lg:text-3xl text-white font-bold tracking-tight">{step.title}</CardTitle>
                         </div>
                       </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-8 relative z-10 pt-8">
                    <p className="text-lg text-slate-300 font-light leading-relaxed">{step.description}</p>

                    <div className="bg-black/60 rounded-xl p-6 text-center space-y-4 border border-white/5 shadow-inner backdrop-blur-sm">
                      <KaTeX math={step.formula} display />
                      {step.extraFormula && <div className="pt-4 border-t border-white/5 mt-4"><KaTeX math={step.extraFormula} display /></div>}
                    </div>

                    {step.isRejectStep && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="bg-rose-500/5 hover:bg-rose-500/10 transition-colors border border-rose-500/20 rounded-xl p-5 relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/40 group-hover:bg-rose-500 transition-colors"></div>
                          <span className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider mb-3">
                             <span className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center">✗</span> Falla → Reiniciar
                          </span>
                          <p className="text-sm text-rose-200/80 font-light leading-relaxed">
                            Si <KaTeX math="|z_i| \geq 524{,}092" /> o <KaTeX math="|r_{0i}| \geq 261{,}692" />, κ++ y vuelve al Paso 1 directamente.
                          </p>
                        </div>
                        <div className="bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors border border-emerald-500/20 rounded-xl p-5 relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/40 group-hover:bg-emerald-500 transition-colors"></div>
                          <span className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
                             <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">✓</span> Pasa → Continuar
                          </span>
                          <p className="text-sm text-emerald-200/80 font-light leading-relaxed">Si ambas firmas cumplen los límites matemáticos se procede.</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                        <span className="font-mono text-[11px] text-slate-400 uppercase tracking-widest font-semibold">Detalle Técnico</span>
                      </div>
                      <p className="text-sm text-slate-300 font-light leading-relaxed">{step.detail}</p>
                    </div>

                    {/* Controles de Navegación del Slider Interno */}
                    <div className="flex justify-between items-center pt-8 mt-2">
                      <button
                        onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                        disabled={activeStep === 0}
                        className="group flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-all border border-transparent hover:border-white/10"
                      >
                        <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" /> Anterior
                      </button>
                      
                      <div className="flex gap-2 items-center">
                         {firmaSteps.map((_, idx) => (
                           <button 
                             key={idx} 
                             onClick={() => setActiveStep(idx)}
                             className={`h-1.5 rounded-full transition-all duration-300 hover:bg-white/50 ${idx === activeStep ? "w-6 bg-[#0e7490]" : "w-1.5 bg-white/20"}`}
                             aria-label={`Ir al paso ${idx}`}
                           />
                         ))}
                      </div>

                      <button
                        onClick={() => setActiveStep(Math.min(firmaSteps.length - 1, activeStep + 1))}
                        disabled={activeStep === firmaSteps.length - 1}
                        className="group flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#0e7490] hover:text-white hover:bg-[#0e7490] disabled:text-slate-500 disabled:opacity-20 disabled:hover:bg-transparent transition-all border border-[#0e7490]/30 hover:shadow-[0_0_15px_rgba(14,116,144,0.3)]"
                      >
                        Siguiente <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
             </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FirmaSection;
