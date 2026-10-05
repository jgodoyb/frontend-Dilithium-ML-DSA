import { useState } from "react";
import KaTeX from "./KaTeX";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  LockOpen,
  Lock,
  Atom,
  ArrowDown,
  Grid3X3,
  Binary,
  Fingerprint,
  Package,
  Shield,
  Info,
  Zap,
} from "lucide-react";

/* ───── Data per security level ───── */
interface LevelParams {
  name: string;
  label: string;
  k: number;
  l: number;
  eta: number;
  pkSize: number;
  skSize: number;
}

const levelData: LevelParams[] = [
  { name: "ML-DSA-44", label: "Nivel 2", k: 4, l: 4, eta: 2, pkSize: 1312, skSize: 2560 },
  { name: "ML-DSA-65", label: "Nivel 3", k: 6, l: 5, eta: 4, pkSize: 1952, skSize: 4032 },
  { name: "ML-DSA-87", label: "Nivel 5", k: 8, l: 7, eta: 2, pkSize: 2592, skSize: 4896 },
];

/* ───── Sub-components ───── */

const SeedNode = ({
  label,
  formula,
  isPublic,
  desc,
}: {
  label: string;
  formula: string;
  isPublic: boolean;
  desc: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex flex-col items-center gap-2 cursor-help">
        <div
          className={`w-16 h-16 rounded-none sm:rounded-sm border flex items-center justify-center font-mono ${isPublic
            ? "border-cyan-500/40 text-cyan-400 bg-cyan-950/20"
            : "border-zinc-500/40 text-zinc-300 bg-zinc-900/60"
            }`}
        >
          <KaTeX math={formula} />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          {label}
        </span>
      </div>
    </TooltipTrigger>
    <TooltipContent className="max-w-[240px] bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-xs rounded-none">
      <p>{desc}</p>
    </TooltipContent>
  </Tooltip>
);

const StepCard = ({
  num,
  title,
  icon: Icon,
  children,
  isPublic,
}: {
  num: number;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  isPublic: boolean;
}) => (
  <div
    className={`bg-zinc-950 border p-8 rounded-none sm:rounded-sm flex flex-col space-y-5 transition-colors ${isPublic
      ? "border-zinc-800 hover:border-cyan-500/40"
      : "border-zinc-800 hover:border-zinc-600"
      }`}
  >
    <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
      <div
        className={`w-9 h-9 rounded-none sm:rounded-sm flex items-center justify-center shrink-0 border ${isPublic
          ? "border-cyan-500/30 text-cyan-400 bg-cyan-950/20"
          : "border-zinc-700 text-zinc-300 bg-zinc-900"
          }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <span
          className={`text-[10px] font-mono uppercase tracking-widest block font-bold ${isPublic ? "text-cyan-400" : "text-zinc-500"
            }`}
        >
          Paso {num}
        </span>
        <h4 className="text-base font-bold text-zinc-100 font-mono">{title}</h4>
      </div>
    </div>
    <div className="space-y-4 text-xs font-mono">{children}</div>
  </div>
);

const FormulaBlock = ({ math, tooltip }: { math: string; tooltip?: string }) => (
  <div className="bg-black border border-zinc-800 border-l-2 border-l-cyan-400 p-8 sm:p-10 rounded-none sm:rounded-sm text-center">
    {tooltip ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help inline-flex items-center justify-center gap-1.5 hover:text-cyan-300 transition-colors">
            <KaTeX math={math} display />
            <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-xs rounded-none">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    ) : (
      <KaTeX math={math} display />
    )}
  </div>
);

/* ───── Main component ───── */
const GeneracionClavesSection = () => {
  const [levelIdx, setLevelIdx] = useState(1);
  const lvl = levelData[levelIdx];

  return (
    <TooltipProvider delayDuration={200}>
      <div id="generacion" className="space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold block">
            // FASE 01 // ASYMMETRIC KEY GENERATION
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-zinc-100">
            Generación de Claves (KeyGen)
          </h3>
          <p className="text-zinc-400 font-mono text-xs sm:text-sm max-w-3xl leading-relaxed">
            Alice genera su par de claves <KaTeX math="(pk, sk)" /> a partir de una semilla uniforme de 256 bits.
            La seguridad computacional reside en la dificultad de recuperar los vectores secretos con ruido a partir de{" "}
            <KaTeX math="\mathbf{t}" />.
          </p>
        </div>

        {/* Level selector buttons */}
        <div className="flex flex-wrap gap-2">
          {levelData.map((l, i) => (
            <button
              key={l.name}
              onClick={() => setLevelIdx(i)}
              className={`flex items-center gap-2 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition-colors border rounded-none sm:rounded-sm ${levelIdx === i
                ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{l.name} [{l.label}]</span>
            </button>
          ))}
        </div>

        {/* Genesis Block */}
        <div className="bg-zinc-950 border border-zinc-800 p-8 sm:p-10 rounded-none sm:rounded-sm space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-zinc-800 bg-zinc-900 text-cyan-400 font-mono text-xs uppercase tracking-widest">
              <Atom className="w-3.5 h-3.5" />
              <span>GÉNESIS DETERMINISTA // EXPAND_SEED</span>
            </div>
            <p className="text-xs sm:text-sm font-mono text-zinc-400 max-w-md mx-auto leading-relaxed">
              Una semilla aleatoria de 256 bits se expande determinísticamente en tres componentes fundamentales:
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 py-2">
            {/* Input seed */}
            <div className="px-6 py-3 rounded-none sm:rounded-sm border border-cyan-500/40 bg-cyan-950/20 text-center font-mono text-xs">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-0.5">
                ENTRADA PRIMARIA
              </span>
              <KaTeX math="\xi \leftarrow \{0,1\}^{256}" />
            </div>

            {/* Down arrow */}
            <div className="flex flex-col items-center gap-1 font-mono text-[10px] text-zinc-500">
              <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
              <span className="px-2.5 py-1 border border-zinc-800 bg-zinc-900 text-zinc-300">
                SHAKE-256 (128 bytes)
              </span>
              <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
            </div>

            {/* Output nodes */}
            <div className="flex flex-wrap justify-center gap-8 md:gap-14 mt-2">
              <SeedNode
                label="Semilla pública"
                formula="\rho"
                isPublic={true}
                desc="32 bytes. Define la matriz pública A mediante expansión SHAKE-128."
              />
              <SeedNode
                label="Semilla secreta"
                formula="\rho'"
                isPublic={false}
                desc="64 bytes. Muestrea determinísticamente los vectores secretos s₁ y s₂."
              />
              <SeedNode
                label="Semilla de firma"
                formula="K"
                isPublic={false}
                desc="32 bytes. Semilla auxiliar usada en el proceso de firma para derivar la máscara y."
              />
            </div>
          </div>

          <FormulaBlock
            math="(\rho,\; \rho',\; K) = \text{SHAKE-256}(\xi,\; 128)"
            tooltip="FIPS 204 §5.1: La semilla ξ de 32 bytes se expande a 128 bytes totales: ρ (32B) + ρ' (64B) + K (32B)."
          />
        </div>

        {/* Split-Flow Columns: Public vs Private */}
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="flex items-center gap-2 p-4 border border-cyan-500/30 bg-cyan-950/20 rounded-none sm:rounded-sm">
              <LockOpen className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold">
                FLUJO DE CLAVE PÚBLICA (pk) // MATRIZ & CONVOLUCIÓN
              </span>
            </div>
            <div className="flex items-center gap-2 p-4 border border-zinc-700 bg-zinc-900/60 rounded-none sm:rounded-sm">
              <Lock className="w-4 h-4 text-zinc-300" />
              <span className="font-mono text-xs uppercase tracking-widest text-zinc-300 font-bold">
                FLUJO DE CLAVE PRIVADA (sk) // VECTORES SECRETOS
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
            {/* Step 1 */}
            <StepCard num={1} title="Expansión de Matriz A" icon={Grid3X3} isPublic={true}>
              <p className="text-zinc-400 leading-relaxed">
                La semilla <KaTeX math="\rho" /> se expande mediante SHAKE-128 para generar la matriz pública{" "}
                <KaTeX math={`\\mathbf{A} \\in R_q^{${lvl.k} \\times ${lvl.l}}`} /> en dominio NTT.
              </p>
              <FormulaBlock
                math={`\\hat{\\mathbf{A}} = \\text{ExpandA}(\\rho) \\in R_q^{${lvl.k} \\times ${lvl.l}}`}
                tooltip="Cada entrada A[i][j] se genera con SHAKE-128(ρ ∥ j ∥ i). Muestreo de rechazo descarta valores ≥ q."
              />
            </StepCard>

            <StepCard num={1} title="Vectores Secretos s₁ y s₂" icon={Lock} isPublic={false}>
              <p className="text-zinc-400 leading-relaxed">
                Se generan <KaTeX math={`\\mathbf{s}_1 \\in R_q^{${lvl.l}}`} /> y{" "}
                <KaTeX math={`\\mathbf{s}_2 \\in R_q^{${lvl.k}}`} /> desde <KaTeX math="\rho'" /> con
                coeficientes estrictamente en el intervalo <KaTeX math={`[-${lvl.eta},\\; ${lvl.eta}]`} />.
              </p>
              <FormulaBlock
                math={`\\mathbf{s}_1, \\mathbf{s}_2 \\leftarrow S_{${lvl.eta}}(\\rho')`}
                tooltip={`Muestreo uniforme en {-${lvl.eta}, ..., ${lvl.eta}} usando SHAKE-256(ρ' ∥ contador). La pequeñez de los coeficientes es la base de la dureza Module-LWE.`}
              />
            </StepCard>

            {/* Step 2 */}
            <StepCard num={2} title="Ecuación Principal en NTT" icon={Zap} isPublic={true}>
              <p className="text-zinc-400 leading-relaxed">
                Multiplicación matricial en dominio NTT (<KaTeX math="O(n \log n)" />), sumando luego
                el vector de ruido <KaTeX math="\mathbf{s}_2" />.
              </p>
              <FormulaBlock
                math="\mathbf{t} = \text{NTT}^{-1}(\hat{\mathbf{A}} \circ \text{NTT}(\mathbf{s}_1)) + \mathbf{s}_2"
                tooltip="NTT (Number Theoretic Transform) permite multiplicar polinomios en O(n log n) en lugar de O(n²)."
              />
            </StepCard>

            <StepCard num={2} title="Error Residual t₀" icon={Binary} isPublic={false}>
              <p className="text-zinc-400 leading-relaxed">
                Los LowBits <KaTeX math="\mathbf{t}_0" /> del vector <KaTeX math="\mathbf{t}" /> se
                preservan como secreto. Representan el residuo de redondeo de Power2Round.
              </p>
              <FormulaBlock
                math="\mathbf{t}_0 = \mathbf{t} - \mathbf{t}_1 \cdot 2^d"
                tooltip="t₀ contiene los 13 bits menos significativos de cada coeficiente de t. Imprescindible para que el verificador reconstruya w."
              />
            </StepCard>

            {/* Step 3 */}
            <StepCard num={3} title="Truncado Power2Round" icon={Binary} isPublic={true}>
              <p className="text-zinc-400 leading-relaxed">
                Se extraen los bits altos <KaTeX math="\mathbf{t}_1" /> truncando los{" "}
                <KaTeX math="d = 13" /> bits bajos.
              </p>
              <FormulaBlock math="(\mathbf{t}_1, \mathbf{t}_0) = \text{Power2Round}(\mathbf{t},\; d=13)" />
            </StepCard>

            <StepCard num={3} title="Huella Digital de Contexto tr" icon={Fingerprint} isPublic={false}>
              <p className="text-zinc-400 leading-relaxed">
                Resumen criptográfico de 64 bytes de la clave pública empaquetada. Vincula indivisiblemente la firma a la identidad.
              </p>
              <FormulaBlock
                math="tr = \text{SHAKE-256}(pk,\; 64)"
                tooltip="FIPS 204 §5.1: Evita ataques de sustitución de clave pública."
              />
            </StepCard>

            {/* Final Artifacts */}
            <div className="bg-zinc-950 border border-cyan-500/40 p-8 rounded-none sm:rounded-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-cyan-400 font-mono text-xs uppercase tracking-widest font-bold">
                  <Package className="w-4 h-4" />
                  <span>CLAVE PÚBLICA EMPAQUETADA (pk)</span>
                </div>
                <div className="bg-black border border-zinc-800 p-6 my-4 text-center">
                  <KaTeX math="pk = (\rho,\; \mathbf{t}_1)" />
                </div>
              </div>
              <div className="font-mono text-xs text-zinc-500 pt-4 border-t border-zinc-800 flex justify-between">
                <span>LONGITUD BINARIA:</span>
                <span className="text-cyan-400 font-bold">{lvl.pkSize.toLocaleString("es-ES")} bytes</span>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-700 p-8 rounded-none sm:rounded-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-zinc-300 font-mono text-xs uppercase tracking-widest font-bold">
                  <Package className="w-4 h-4" />
                  <span>CLAVE PRIVADA EMPAQUETADA (sk)</span>
                </div>
                <div className="bg-black border border-zinc-800 p-6 my-4 text-center">
                  <KaTeX math="sk = (\rho,\; K,\; tr,\; \mathbf{s}_1,\; \mathbf{s}_2,\; \mathbf{t}_0)" />
                </div>
              </div>
              <div className="font-mono text-xs text-zinc-500 pt-4 border-t border-zinc-800 flex justify-between">
                <span>LONGITUD BINARIA:</span>
                <span className="text-zinc-200 font-bold">{lvl.skSize.toLocaleString("es-ES")} bytes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Level params summary bar */}
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-none sm:rounded-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-zinc-400">
            <div>
              <span className="text-cyan-400 font-bold">{lvl.name}</span> [{lvl.label}]
            </div>
            <div>
              MATRIZ: <KaTeX math={`k=${lvl.k}`} /> × <KaTeX math={`l=${lvl.l}`} />
            </div>
            <div>
              COEF. SECRETO: <KaTeX math={`\\eta=${lvl.eta}`} />
            </div>
            <div>
              <span className="text-cyan-400">pk</span>: {lvl.pkSize.toLocaleString("es-ES")}B
            </div>
            <div>
              <span className="text-zinc-300">sk</span>: {lvl.skSize.toLocaleString("es-ES")}B
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default GeneracionClavesSection;
