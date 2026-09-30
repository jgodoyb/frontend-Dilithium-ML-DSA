import { useState } from "react";
import KaTeX from "./KaTeX";
import {
  PackageOpen, Fingerprint, Grid3X3, Target, Zap, Lightbulb, ShieldCheck, ChevronLeft, ChevronRight,
} from "lucide-react";

const verificacionSteps = [
  {
    num: 0, numStr: "00", title: "Decodificación (Unpack)", icon: PackageOpen,
    description: "El verificador recibe la clave pública (pk) y la firma (σ). Se extraen las semillas, los polinomios de respuesta y el vector de pistas (hint).",
    formula: "(pk, \\sigma) \\rightarrow (\\rho, \\mathbf{t}_1, \\tilde{c}, \\mathbf{z}, \\mathbf{h})",
    detail: "pk contiene ρ y t₁. σ contiene el hash del desafío c̃, la respuesta z y el hint h. Se validan los tamaños y rangos de cada componente binario.",
  },
  {
    num: 1, numStr: "01", title: "Contexto & Huella μ", icon: Fingerprint,
    description: "Se computa tr a partir de la clave pública para asegurar el contexto institucional. Luego μ vincula el mensaje M directamente a la identidad.",
    formula: "tr = \\text{SHAKE-256}(pk, \\; 64), \\quad \\mu = \\text{SHAKE-256}(tr \\;\\|\\; M, \\; 64)",
    detail: "tr (64 bytes) es un resumen determinista de pk. μ (64 bytes) es el digest final del mensaje que será verificado.",
  },
  {
    num: 2, numStr: "02", title: "Expansión Matriz A", icon: Grid3X3,
    description: "Bob reconstruye la matriz pública A a partir de la semilla ρ. Esta matriz es idéntica en memoria a la que Alice utilizó para firmar.",
    formula: "\\hat{\\mathbf{A}} = \\text{ExpandA}(\\rho) \\in R_q^{k \\times l}",
    detail: "La expansión se realiza en dominio NTT para permitir cálculos asintóticos eficientes. Para ML-DSA-65, A es de 6x5 polinomios.",
  },
  {
    num: 3, numStr: "03", title: "Polinomio Desafío c", icon: Target,
    description: "Se expande el hash del desafío c̃ almacenado en la firma para recuperar el polinomio disperso c completo.",
    formula: "c = \\text{SampleInBall}(\\tilde{c}, \\; \\tau=49)",
    detail: "SampleInBall coloca exactamente 49 coeficientes ±1 en las posiciones determinadas por c̃. Los 207 coeficientes restantes son nulos.",
  },
  {
    num: 4, numStr: "04", title: "Aproximación w'", icon: Zap,
    description: "Bob calcula una aproximación w'. Al restar el componente público t₁, se cancelan parcialmente los términos secretos.",
    formula: "\\mathbf{w}' = \\text{Az} - c \\mathbf{t}_1 2^d",
    detail: "Bob desconoce s₁, pero z = y + cs₁. Al operar con pk, los términos coinciden con Az - ct ≈ Ay ≈ w.",
  },
  {
    num: 5, numStr: "05", title: "Recuperación w₁'", icon: Lightbulb,
    description: "Se aplica el vector de pistas h sobre la aproximación w' para recuperar con exactitud algebraica los bits altos w₁ originales.",
    formula: "\\mathbf{w}_1' = \\text{UseHint}(\\mathbf{h}, \\; \\mathbf{w}', \\; 2\\gamma_2)",
    detail: "El hint corrige cualquier discrepancia de redondeo introducida por el error residual t₀.",
  },
  {
    num: 6, numStr: "06", title: "Verificación de Integridad", icon: ShieldCheck,
    description: "Validación definitiva: se verifica que la norma de z sea acotada (seguridad) y que el hash regenerado c̃' coincida con el recibido.",
    formula: "\\text{Check 1: } \\|\\mathbf{z}\\|_\\infty < \\gamma_1 - \\beta",
    extraFormula: "\\text{Check 2: } \\tilde{c} = \\text{SHAKE-256}(\\mu \\;\\|\\; \\text{PackW1}(\\mathbf{w}_1'))",
    detail: "Si ambas condiciones se satisfacen, la firma es matemáticamente genuina y el documento queda autenticado con garantía post-cuántica.",
  },
];

const VerificacionSection = () => {
  const [activeStep, setActiveStep] = useState(0);
  const step = verificacionSteps[activeStep];
  const StepIcon = step.icon;

  return (
    <div id="verificacion" className="space-y-16">
      {/* Header */}
      <div className="space-y-2">
        <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold block">
          // FASE_05 // ML-DSA.VERIFY
        </span>
        <h3 className="text-xl sm:text-2xl font-bold text-zinc-100 font-mono">
          Protocolo de Verificación (ML-DSA.Verify)
        </h3>
        <p className="text-zinc-400 font-mono text-xs sm:text-sm max-w-3xl leading-relaxed">
          Bob recibe la Clave Pública y la Firma. Emplea el vector de pistas (Hint) para recuperar los bits altos originales <KaTeX math="\mathbf{w}_1" /> y certificar matemáticamente la validez del documento.
        </p>
      </div>

      {/* Unified Stepper Navigation (Matching FirmaSection) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {verificacionSteps.map((s, i) => {
          const isActive = activeStep === i;
          return (
            <button
              key={s.num}
              onClick={() => setActiveStep(i)}
              className={`p-3.5 text-left font-mono border rounded-none sm:rounded-sm transition-colors flex flex-col justify-between min-h-[72px] ${
                isActive
                  ? "border-cyan-400 bg-cyan-950/20 text-cyan-300 font-bold"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[10px] tracking-wider">[{s.numStr}]</span>
              </div>
              <span className="text-xs font-semibold leading-tight line-clamp-2">
                {s.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Terminal Display Panel */}
      <div className="bg-zinc-950 border border-zinc-800 p-8 sm:p-10 rounded-none sm:rounded-sm space-y-8">
        {/* Terminal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border border-cyan-500/40 bg-cyan-950/20 text-cyan-400 flex items-center justify-center font-mono">
              <StepIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-cyan-400 block mb-0.5">
                // VERIFY_PASO [{step.numStr}]
              </span>
              <h4 className="text-xl font-bold font-mono text-zinc-100">{step.title}</h4>
            </div>
          </div>

          {/* Stepper Controls */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
              disabled={activeStep === 0}
              className="px-3.5 py-2 border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> ANTERIOR
            </button>
            <button
              onClick={() => setActiveStep((prev) => Math.min(verificacionSteps.length - 1, prev + 1))}
              disabled={activeStep === verificacionSteps.length - 1}
              className="px-3.5 py-2 border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              SIGUIENTE <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <p className="text-zinc-300 font-mono text-sm leading-relaxed">{step.description}</p>

        {/* Academic KaTeX block */}
        <div className="bg-black border border-zinc-800 border-l-2 border-l-cyan-400 p-8 sm:p-10 overflow-x-auto text-center rounded-none sm:rounded-sm space-y-4">
          <KaTeX math={step.formula} display />
          {step.extraFormula && (
            <div className="pt-4 border-t border-zinc-900">
              <KaTeX math={step.extraFormula} display />
            </div>
          )}
        </div>

        {/* Detail Note */}
        <div className="p-6 sm:p-8 bg-zinc-900/60 border border-zinc-800 rounded-none sm:rounded-sm font-mono text-xs text-zinc-400">
          <span className="text-zinc-200 font-bold block mb-1.5">// RIGOR_DE_VERIFICACIÓN</span>
          <p className="leading-relaxed">{step.detail}</p>
        </div>
      </div>
    </div>
  );
};

export default VerificacionSection;
