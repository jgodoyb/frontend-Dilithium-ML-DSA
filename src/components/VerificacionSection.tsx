import { useState } from "react";
import KaTeX from "./KaTeX";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PackageOpen, Fingerprint, Grid3X3, Target, Zap, Lightbulb, ShieldCheck, ArrowRight, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const verificacionSteps = [
  {
    num: 0, title: "Desempaquetado (Decoding)", icon: PackageOpen,
    description: "El verificador recibe la clave pública (pk) y la firma (σ). Se extraen las semillas, los polinomios de respuesta y el vector de pistas (hint).",
    formula: "(pk, \\sigma) \\rightarrow (\\rho, \\mathbf{t}_1, \\tilde{c}, \\mathbf{z}, \\mathbf{h})",
    detail: "pk contiene ρ y t₁. σ contiene el hash del desafío c̃, la respuesta z y el hint h. Se validan los tamaños y rangos de cada componente.",
  },
  {
    num: 1, title: "Huella y Contexto", icon: Fingerprint,
    description: "Se genera tr a partir de la clave pública para asegurar el contexto. Luego mu vincula el mensaje M directamente a la identidad del firmante.",
    formula: "tr = \\text{H}(pk, 64), \\quad \\mu = \\text{H}(tr \\;\\|\\; M, 64)",
    detail: "tr (64 bytes) es un resumen de pk. mu (64 bytes) es el 'digest' del mensaje que será verificado. Se utiliza SHAKE-256.",
  },
  {
    num: 2, title: "Expansión Matrix A", icon: Grid3X3,
    description: "Bob reconstruye la matriz pública A a partir de la semilla ρ. Esta matriz es idéntica a la que Alice usó para firmar.",
    formula: "\\hat{\\mathbf{A}} = \\text{ExpandA}(\\rho) \\in R_q^{k \\times l}",
    detail: "La expansión se realiza en dominio NTT para permitir cálculos eficientes. Para ML-DSA-65, A es una matriz de 6x5 polinomios.",
  },
  {
    num: 3, title: "Polinomio c", icon: Target,
    description: "Se expande el hash del desafío c̃ almacenado en la firma para recuperar el polinomio disperso c completo.",
    formula: "c = \\text{SampleInBall}(\\tilde{c}, \\tau=49)",
    detail: "SampleInBall coloca exactamente 49 coeficientes ±1 en las posiciones determinadas por c̃. El resto de coeficientes son zero.",
  },
  {
    num: 4, title: "Reconstrucción w'", icon: Zap,
    description: "Bob calcula una aproximación w'. Al restar el componente secreto (vía t₁), se obtiene un valor cercano al compromiso original w.",
    formula: "\\mathbf{w}' = \\text{Az} - c \\mathbf{t}_1 2^d",
    detail: "Bob no conoce s₁, pero z = y + cs₁. Al operar con pk, los términos se cancelan parcialmente: Az - ct ≈ Ay ≈ w.",
  },
  {
    num: 5, title: "Recuperación w₁'", icon: Lightbulb,
    description: "Se aplica el hint h sobre la aproximación w' para recuperar exactamente los bits altos w₁ que Alice utilizó originalmente.",
    formula: "\\mathbf{w}_1' = \\text{UseHint}(\\mathbf{h}, \\mathbf{w}', 2\\gamma_2)",
    detail: "El hint indica dónde el acarreo de bits bajos afectó a los altos. Es crucial para que Bob obtenga el mismo w₁ que Alice.",
  },
  {
    num: 6, title: "Validación de Integridad", icon: ShieldCheck,
    description: "Paso final: se verifica que la respuesta z sea corta (seguridad) y que el nuevo hash c̃' coincida con el recibido (autenticidad).",
    formula: "\\text{Check 1: } \\|\\mathbf{z}\\|_\\infty < \\gamma_1 - \\beta",
    extraFormula: "\\text{Check 2: } \\tilde{c} = \\text{H}(\\mu \\;\\|\\; \\text{PackW1}(\\mathbf{w}_1'))",
    detail: "Si ambas condiciones se cumplen simultáneamente, la firma es matemáticamente válida y el documento es auténtico.",
  },
];

const VerificacionSection = () => {
  const [activeStep, setActiveStep] = useState(0);
  const step = verificacionSteps[activeStep];

  return (
    <section id="verificacion" className="relative pb-16 z-10">
      <div className="max-w-6xl">
        <div className="text-left mb-12 pl-6 border-l-4 border-emerald-500">
          <p className="text-sm font-semibold text-emerald-500 tracking-[0.2em] uppercase mb-2">Fase 3 · Verificación</p>
          <h2 className="text-3xl font-bold mb-4 text-white">Proceso de Verificación</h2>
          <p className="text-slate-400 max-w-3xl text-base font-light">
            Bob recibe la Clave Pública y la Firma. Utiliza el{" "}
            <span className="text-white font-semibold">Hint</span> para reconstruir los bits altos
            y validar que la firma fue generada correctamente por el dueño de la clave.
          </p>
        </div>

        {/* Step timeline */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {verificacionSteps.map((s, i) => (
            <button
              key={s.num}
              onClick={() => setActiveStep(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
                activeStep === i
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-emerald-500/20"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                activeStep === i ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {s.num}
              </span>
              <span className="hidden sm:inline">{s.title}</span>
            </button>
          ))}
        </div>

        <motion.div
          key={activeStep}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="pro-card border-emerald-500/10 shadow-emerald-500/5">
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <step.icon className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <span className="text-xs font-medium text-emerald-500 font-mono tracking-tighter">
                    VERIFICATION_PROTOCOL_0{step.num}
                  </span>
                  <CardTitle className="text-2xl text-foreground font-bold">{step.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1 space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-500 flex items-center gap-2">
                       <Info className="w-4 h-4" /> Procedimiento
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>

                  <div className="bg-muted/10 border border-emerald-500/10 rounded-2xl p-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/60 mb-4 font-mono">
                      Logic_Definition
                    </h3>
                    <p className="text-sm text-foreground/80 leading-relaxed italic">
                      "{step.detail}"
                    </p>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-4">
                  <div className="bg-background/40 backdrop-blur-md rounded-2xl p-8 text-center space-y-6 border border-border shadow-inner relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <step.icon className="w-20 h-20" />
                    </div>
                    <KaTeX math={step.formula} display />
                    {step.extraFormula && (
                      <div className="pt-4 border-t border-border/50">
                        <KaTeX math={step.extraFormula} display />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-mono text-emerald-500/70">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Status: Computing Step {step.num}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-border/50">
                <button
                  onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                  disabled={activeStep === 0}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-emerald-500 disabled:opacity-30 transition-all group"
                >
                  <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" /> 
                  Anterior
                </button>
                
                <div className="flex gap-1">
                  {verificacionSteps.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1 rounded-full transition-all duration-500 ${
                        i === activeStep ? "w-8 bg-emerald-500" : "w-2 bg-muted-foreground/20"
                      }`} 
                    />
                  ))}
                </div>

                <button
                  onClick={() => setActiveStep(Math.min(verificacionSteps.length - 1, activeStep + 1))}
                  disabled={activeStep === verificacionSteps.length - 1}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-emerald-500 disabled:opacity-30 transition-all group"
                >
                  Siguiente 
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default VerificacionSection;
