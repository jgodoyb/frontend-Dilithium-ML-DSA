import { useState } from "react";
import KaTeX from "./KaTeX";
import {
  Hash, Shuffle, Grid3X3, Scissors, Target, PlusCircle, ShieldCheck, HelpCircle, Package, RotateCcw, ChevronLeft, ChevronRight,
} from "lucide-react";

const firmaSteps = [
  {
    num: 0, numStr: "00", title: "Cálculo de μ", icon: Hash,
    description: "Se calcula el hash del mensaje vinculado a la clave pública. Se concatena tr con el mensaje M y se aplica SHAKE-256.",
    formula: "\\mu = \\text{SHAKE-256}(tr \\;\\|\\; M, \\; 64)",
    detail: "tr = SHAKE-256(pk) vincula la firma a la identidad del firmante. μ combina la identidad del firmante con el mensaje.",
    reject: false,
  },
  {
    num: 1, numStr: "01", title: "Máscara y", icon: Shuffle,
    description: "Se genera el vector de máscara y. Cada coeficiente está en [-γ₁+1, γ₁]. El contador κ se incrementa en cada intento.",
    formula: "\\mathbf{y} = \\text{ExpandMask}(\\text{SHAKE-256}(K \\;\\|\\; \\mu) \\;\\|\\; \\kappa)",
    detail: "y actúa como nonce criptográfico que enmascara los vectores secretos. Si la firma falla, κ se incrementa generando un y nuevo.",
    reject: true,
  },
  {
    num: 2, numStr: "02", title: "Compromiso w", icon: Grid3X3,
    description: "Se calcula w = Ay en dominio NTT por eficiencia asintótica.",
    formula: "\\mathbf{w} = \\text{NTT}^{-1}(\\hat{\\mathbf{A}} \\circ \\text{NTT}(\\mathbf{y}))",
    detail: "La multiplicación en NTT es O(n log n) vs O(n²). w tiene 6 polinomios de 256 coeficientes.",
    reject: true,
  },
  {
    num: 3, numStr: "03", title: "Decompose (HighBits)", icon: Scissors,
    description: "Cada coeficiente de w se descompone en bits altos (w₁) y bits bajos (w₀).",
    formula: "(\\mathbf{w}_1, \\mathbf{w}_0) = \\text{Decompose}(\\mathbf{w}, \\; 2\\gamma_2)",
    detail: "w₁ = HighBits(r) captura la parte significativa. Pequeñas perturbaciones no alteran w₁, que es lo que Bob reconstruirá.",
    reject: true,
  },
  {
    num: 4, numStr: "04", title: "Desafío c", icon: Target,
    description: "Se genera c como polinomio disperso con τ = 49 coeficientes ±1.",
    formula: "c = \\text{SampleInBall}(\\text{SHAKE-256}(\\mu \\;\\|\\; \\text{PackW1}(\\mathbf{w}_1)))",
    detail: "SampleInBall coloca 49 coeficientes ±1 en posiciones pseudoaleatorias. Solo 49/256 ≈ 19% son no nulos.",
    reject: true,
  },
  {
    num: 5, numStr: "05", title: "Respuesta z", icon: PlusCircle,
    description: "Se calcula z sumando la máscara y con c·s₁.",
    formula: "\\mathbf{z} = \\mathbf{y} + c \\cdot \\mathbf{s}_1",
    detail: "La multiplicación c·s₁ se realiza sin NTT porque c es disperso. z debe parecer aleatorio para no revelar s₁.",
    reject: true,
  },
  {
    num: 6, numStr: "06", title: "Verificación de Seguridad", icon: ShieldCheck,
    description: "El bucle de rechazo: dos condiciones de norma infinita deben cumplirse. Si alguna falla, κ++ y vuelta al Paso 1.",
    formula: "\\text{Check 1: } \\|\\mathbf{z}\\|_\\infty < 524{,}092",
    extraFormula: "\\text{Check 2: } \\|\\text{LowBits}(\\mathbf{w} - c\\mathbf{s}_2)\\|_\\infty < 261{,}692",
    detail: "Check 1 asegura que z no filtre s₁. Check 2 asegura que los bits bajos no alteren los altos. Promedio: ~4.25 iteraciones.",
    reject: true, isRejectStep: true,
  },
  {
    num: 7, numStr: "07", title: "Vector de Pistas h", icon: HelpCircle,
    description: "Vector de bits que indica al verificador dónde difieren los bits altos. Máximo ω = 55 posiciones con hint = 1.",
    formula: "h = \\text{MakeHint}(-c\\mathbf{t}_0, \\; \\mathbf{w} - c\\mathbf{s}_2 + c\\mathbf{t}_0)",
    detail: "El hint codifica posiciones donde el redondeo cambia al sumar ct₀. Si se excede ω, también se aborta e incrementa κ.",
    reject: true,
  },
  {
    num: 8, numStr: "08", title: "Empaquetado de Firma", icon: Package,
    description: "Se empaquetan los tres componentes de la firma con un tamaño fijo estandarizado de 3293 bytes.",
    formula: "\\sigma = (\\tilde{c}, \\; \\mathbf{z}, \\; h), \\quad |\\sigma| = 3293 \\text{ bytes}",
    detail: "c̃ = 32 bytes, z con coeficientes de 20 bits, h indicando posiciones con hint = 1.",
    reject: false,
  },
];

const FirmaSection = () => {
  const [activeStep, setActiveStep] = useState(0);
  const step = firmaSteps[activeStep];
  const StepIcon = step.icon;

  return (
    <div id="firma" className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold block">
          // FASE 02 // SIGNATURE GENERATION PROTOCOL
        </span>
        <h3 className="text-xl sm:text-2xl font-bold text-zinc-100">
          Proceso de Firma (ML-DSA.Sign)
        </h3>
        <p className="text-zinc-400 font-mono text-xs sm:text-sm max-w-3xl leading-relaxed">
          Alice firma un mensaje mediante el paradigma "Fiat-Shamir with Aborts": genera firmas candidatas y las descarta si su distribución pudiera revelar los vectores secretos.
        </p>
      </div>

      {/* Unified Stepper Navigation (Brutalist Grid) */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {firmaSteps.map((s, i) => {
          const isActive = activeStep === i;
          return (
            <button
              key={s.num}
              onClick={() => setActiveStep(i)}
              className={`p-3 text-left font-mono border rounded-none sm:rounded-sm transition-colors flex flex-col justify-between min-h-[70px] ${isActive
                  ? s.isRejectStep
                    ? "border-rose-500 bg-rose-950/20 text-rose-300"
                    : "border-cyan-400 bg-cyan-950/20 text-cyan-300 font-bold"
                  : s.isRejectStep
                    ? "border-zinc-800 bg-zinc-950 text-rose-400/70 hover:border-rose-500/50"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[10px] tracking-wider">[{s.numStr}]</span>
                {s.isRejectStep && (
                  <span className="text-[9px] text-rose-400 px-1 py-0.2 bg-rose-950/60 border border-rose-500/40">
                    !
                  </span>
                )}
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
            <div
              className={`w-9 h-9 border flex items-center justify-center font-mono ${step.isRejectStep
                  ? "border-rose-500/40 bg-rose-950/20 text-rose-400"
                  : "border-cyan-500/40 bg-cyan-950/20 text-cyan-400"
                }`}
            >
              <StepIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest font-bold ${step.isRejectStep ? "text-rose-400" : "text-cyan-400"
                    }`}
                >
                  // PASO [{step.numStr}]
                </span>
                {step.reject && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-rose-400 bg-rose-950/30 px-2 py-0.5 border border-rose-500/30">
                    <RotateCcw className="w-2.5 h-2.5" /> REJECT_LOOP_ACTIVE
                  </span>
                )}
              </div>
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
              onClick={() => setActiveStep((prev) => Math.min(firmaSteps.length - 1, prev + 1))}
              disabled={activeStep === firmaSteps.length - 1}
              className="px-3.5 py-2 border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              SIGUIENTE <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <p className="text-zinc-300 font-mono text-sm leading-relaxed">{step.description}</p>

        {/* Academic KaTeX block */}
        <div
          className={`bg-black border p-8 sm:p-10 overflow-x-auto text-center rounded-none sm:rounded-sm space-y-4 ${step.isRejectStep
              ? "border-zinc-800 border-l-2 border-l-rose-500"
              : "border-zinc-800 border-l-2 border-l-cyan-400"
            }`}
        >
          <KaTeX math={step.formula} display />
          {step.extraFormula && (
            <div className="pt-4 border-t border-zinc-900">
              <KaTeX math={step.extraFormula} display />
            </div>
          )}
        </div>

        {/* Detail Note */}
        <div className="p-6 sm:p-8 bg-zinc-900/60 border border-zinc-800 rounded-none sm:rounded-sm font-mono text-xs text-zinc-400">
          <span className="text-zinc-200 font-bold block mb-1.5">// ANÁLISIS_OPERACIONAL</span>
          <p className="leading-relaxed">{step.detail}</p>
        </div>

        {/* Reject Condition Specific Box */}
        {step.isRejectStep && (
          <div className="p-6 sm:p-8 bg-rose-950/20 border border-rose-500/30 rounded-none sm:rounded-sm font-mono text-xs text-rose-300">
            <span className="font-bold block mb-1.5 uppercase tracking-wider text-rose-400">
              [ ✗ CONDICIÓN DE RECHAZO ]
            </span>
            <p className="text-rose-200/90 leading-relaxed">
              Si <KaTeX math="|z_i| \geq 524{,}092" /> o <KaTeX math="|r_{0i}| \geq 261{,}692" />, la firma candidata podría filtrar información espectral sobre las claves secretas <KaTeX math="\mathbf{s}_1, \mathbf{s}_2" />. Se incrementa el contador κ y se reintenta inmediatamente desde el Paso 01.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirmaSection;
