import { useState } from "react";
import { motion } from "framer-motion";
import KaTeX from "./KaTeX";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

/* ───── Animation variants ───── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const expandNode = {
  hidden: { scale: 0, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: { delay: 0.4 + i * 0.18, type: "spring" as const, stiffness: 200, damping: 18 },
  }),
};

/* ───── Sub-components ───── */

const SeedNode = ({
  label,
  formula,
  color,
  desc,
  i,
}: {
  label: string;
  formula: string;
  color: string;
  desc: string;
  i: number;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <motion.div
        custom={i}
        variants={expandNode}
        className="flex flex-col items-center gap-2 cursor-help"
      >
        <div
          className="w-16 h-16 rounded-xl border-2 flex items-center justify-center backdrop-blur-sm"
          style={{
            borderColor: `hsl(${color})`,
            background: `hsl(${color} / 0.08)`,
            boxShadow: `0 0 20px hsl(${color} / 0.15)`,
          }}
        >
          <KaTeX math={formula} />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </motion.div>
    </TooltipTrigger>
    <TooltipContent className="max-w-[220px]">
      <p className="text-xs">{desc}</p>
    </TooltipContent>
  </Tooltip>
);

const StepCard = ({
  num,
  title,
  icon: Icon,
  children,
  color,
  delay,
}: {
  num: number;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  color: string;
  delay: number;
}) => (
  <motion.div
    custom={delay}
    variants={fadeUp}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-40px" }}
  >
    <Card className="bg-[#0a0a0a] border border-white/10 shadow-xl hover:border-[#0e7490]/50 hover:bg-[#0e7490]/5 hover:shadow-[0_0_20px_rgba(14,116,144,0.1)] transition-all duration-500 h-full relative overflow-hidden group">
      {/* Decorative corner glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#0e7490]/10 rounded-full blur-3xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <CardContent className="p-5 space-y-3 relative z-10">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `hsl(${color} / 0.12)` }}
          >
            <Icon className="w-4 h-4" style={{ color: `hsl(${color})` }} />
          </div>
          <div>
            <span
              className="text-[10px] font-mono uppercase tracking-wider"
              style={{ color: `hsl(${color})` }}
            >
              Paso {num}
            </span>
            <h4 className="text-sm font-semibold text-white leading-tight">{title}</h4>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  </motion.div>
);

const FormulaBlock = ({ math, tooltip }: { math: string; tooltip?: string }) => (
  <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-center hover:bg-white/10 transition-colors duration-300">
    {tooltip ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help inline-flex items-center gap-1.5 hover:text-[#0e7490] transition-colors">
            <KaTeX math={math} display />
            <Info className="w-3 h-3 text-slate-400 opacity-50" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px]">
          <p className="text-xs">{tooltip}</p>
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

  const PUBLIC_COLOR = "var(--level-2)";   // cyan
  const PRIVATE_COLOR = "var(--level-5)";  // purple

  return (
    <TooltipProvider delayDuration={200}>
      <section id="generacion" className="relative pb-16 z-10">
        <div className="max-w-6xl">
          {/* ─── Header ─── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="text-left mb-12 pl-6 border-l-4 border-[#0e7490]"
          >
            <motion.p custom={0} variants={fadeUp} className="text-sm font-semibold tracking-[0.2em] text-slate-400 uppercase mb-2">
              Fase 1 · FIPS 204
            </motion.p>
            <motion.h2 custom={1} variants={fadeUp} className="text-3xl font-bold mb-4 text-white">
              Generación de Claves (KeyGen)
            </motion.h2>
            <motion.p custom={2} variants={fadeUp} className="text-slate-400 max-w-3xl text-base font-light">
              Alice genera su par de claves <KaTeX math="(pk, sk)" /> a partir de una semilla de 256 bits.
              La seguridad reside en la dificultad de recuperar los vectores secretos a partir de{" "}
              <KaTeX math="\mathbf{t}" />.
            </motion.p>
          </motion.div>

          {/* ─── Level selector ─── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-wrap justify-start pl-6 gap-3 mb-10"
          >
            {levelData.map((l, i) => (
              <motion.button
                key={l.name}
                custom={i}
                variants={fadeUp}
                onClick={() => setLevelIdx(i)}
                className={`flex items-center gap-2 px-6 py-3 text-xs font-bold tracking-wider transition-all border-b-2 ${
                  levelIdx === i
                    ? "border-[#0e7490] text-white bg-[#0e7490]/10"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                <Shield className="w-4 h-4" />
                {l.name}
              </motion.button>
            ))}
          </motion.div>

          {/* ─── Big Bang: Seed Genesis ─── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="mb-14"
          >
            <Card className="bg-[#0a0a0a] border border-white/10 shadow-2xl relative overflow-hidden group">
              {/* Magic animated background for genesis */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0e7490]/5 to-transparent opacity-50"></div>
              
              <CardContent className="p-6 md:p-8 relative z-10">
                <motion.div custom={0} variants={fadeUp} className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Atom className="w-5 h-5 text-[#0e7490] animate-[spin_10s_linear_infinite]" />
                    <h3 className="text-lg font-bold text-white">El Big Bang Criptográfico</h3>
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Una semilla aleatoria de 256 bits se expande determinísticamente en tres componentes fundamentales.
                  </p>
                </motion.div>

                {/* Flow: ξ → SHAKE-256 → (ρ, ρ', K) */}
                <div className="flex flex-col items-center gap-4">
                  {/* Input seed */}
                  <motion.div
                    custom={0}
                    variants={expandNode}
                    className="px-5 py-3 rounded-xl border-2 border-primary/40 bg-primary/5 text-center"
                    style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.1)" }}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-wider text-primary block mb-1">
                      Entrada
                    </span>
                    <KaTeX math="\xi \leftarrow \{0,1\}^{256}" />
                  </motion.div>

                  {/* Arrow + SHAKE */}
                  <motion.div custom={1} variants={fadeUp} className="flex flex-col items-center gap-1">
                    <ArrowDown className="w-4 h-4 text-primary/50" />
                    <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary">
                      SHAKE-256
                    </Badge>
                    <ArrowDown className="w-4 h-4 text-primary/50" />
                  </motion.div>

                  {/* Three output nodes */}
                  <div className="flex flex-wrap justify-center gap-6 md:gap-10">
                    <SeedNode
                      i={0}
                      label="Semilla pública"
                      formula="\rho"
                      color={PUBLIC_COLOR}
                      desc="32 bytes. Define la matriz A públicamente mediante expansión SHAKE-128."
                    />
                    <SeedNode
                      i={1}
                      label="Semilla secreta"
                      formula="\rho'"
                      color={PRIVATE_COLOR}
                      desc="64 bytes. Genera los vectores secretos s₁ y s₂ mediante muestreo determinista."
                    />
                    <SeedNode
                      i={2}
                      label="Semilla de firma"
                      formula="K"
                      color={PRIVATE_COLOR}
                      desc="32 bytes. Semilla auxiliar usada en el proceso de firma para generar la máscara y."
                    />
                  </div>
                </div>

                {/* Formula */}
                <motion.div custom={3} variants={fadeUp} className="mt-6">
                  <FormulaBlock
                    math="(\rho,\; \rho',\; K) = \text{SHAKE-256}(\xi,\; 128)"
                    tooltip="FIPS 204 §5.1: La semilla ξ de 32 bytes se expande a 128 bytes totales: ρ (32B) + ρ' (64B) + K (32B)."
                  />
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ─── Split-Flow: Public | Private ─── */}
          <div className="grid lg:grid-cols-2 gap-6 mb-10">
            {/* ═══ Column Headers ═══ */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
            >
              <motion.div custom={0} variants={fadeUp} className="flex items-center gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `hsl(${PUBLIC_COLOR} / 0.12)` }}
                >
                  <LockOpen className="w-5 h-5" style={{ color: `hsl(${PUBLIC_COLOR})` }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Flujo de Clave Pública</h3>
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider"
                    style={{ color: `hsl(${PUBLIC_COLOR})` }}
                  >
                    pk — público
                  </span>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
            >
              <motion.div custom={0} variants={fadeUp} className="flex items-center gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `hsl(${PRIVATE_COLOR} / 0.12)` }}
                >
                  <Lock className="w-5 h-5" style={{ color: `hsl(${PRIVATE_COLOR})` }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Flujo de Clave Privada</h3>
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider"
                    style={{ color: `hsl(${PRIVATE_COLOR})` }}
                  >
                    sk — secreto
                  </span>
                </div>
              </motion.div>
            </motion.div>

            {/* ═══ Step 1 Row ═══ */}
            <StepCard num={1} title="Expansión de Matriz A" icon={Grid3X3} color={PUBLIC_COLOR} delay={1}>
              <p className="text-xs text-muted-foreground leading-relaxed">
                La semilla <KaTeX math="\rho" /> se expande mediante SHAKE-128 para generar la matriz{" "}
                <KaTeX math={`\\mathbf{A} \\in R_q^{${lvl.k} \\times ${lvl.l}}`} /> de polinomios en dominio NTT.
              </p>
              <FormulaBlock
                math={`\\hat{\\mathbf{A}} = \\text{ExpandA}(\\rho) \\in R_q^{${lvl.k} \\times ${lvl.l}}`}
                tooltip="Cada entrada A[i][j] se genera con SHAKE-128(ρ ∥ j ∥ i). Muestreo de rechazo descarta valores ≥ q."
              />
            </StepCard>

            <StepCard num={1} title="Vectores Secretos" icon={Lock} color={PRIVATE_COLOR} delay={1}>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Se generan <KaTeX math={`\\mathbf{s}_1 \\in R_q^{${lvl.l}}`} /> y{" "}
                <KaTeX math={`\\mathbf{s}_2 \\in R_q^{${lvl.k}}`} /> desde <KaTeX math="\rho'" /> con
                coeficientes estrictamente en <KaTeX math={`[-${lvl.eta},\\; ${lvl.eta}]`} />.
              </p>
              <FormulaBlock
                math={`\\mathbf{s}_1, \\mathbf{s}_2 \\leftarrow S_{${lvl.eta}}(\\rho')`}
                tooltip={`Cada coeficiente se muestrea uniformemente del rango {-${lvl.eta}, ..., ${lvl.eta}} usando SHAKE-256(ρ' ∥ contador). Los coeficientes pequeños son esenciales para la seguridad del esquema.`}
              />
            </StepCard>

            {/* ═══ Step 2 Row ═══ */}
            <StepCard num={2} title="Ecuación Principal" icon={Zap} color={PUBLIC_COLOR} delay={2}>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Multiplicación en dominio NTT para complejidad <KaTeX math="O(n \log n)" />, seguida de suma
                con el vector de error <KaTeX math="\mathbf{s}_2" />.
              </p>
              <FormulaBlock
                math="\mathbf{t} = \text{NTT}^{-1}(\hat{\mathbf{A}} \circ \text{NTT}(\mathbf{s}_1)) + \mathbf{s}_2"
                tooltip="NTT (Number Theoretic Transform) permite multiplicar polinomios en O(n log n) en lugar de O(n²). Esencial para el rendimiento práctico de ML-DSA."
              />
            </StepCard>

            <StepCard num={2} title="Error Residual t₀" icon={Binary} color={PRIVATE_COLOR} delay={2}>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Los LowBits <KaTeX math="\mathbf{t}_0" /> del vector <KaTeX math="\mathbf{t}" /> se
                almacenan como componente crítico de la clave privada. Representan el error de
                truncado de Power2Round.
              </p>
              <FormulaBlock
                math="\mathbf{t}_0 = \mathbf{t} - \mathbf{t}_1 \cdot 2^d"
                tooltip="t₀ contiene los 13 bits menos significativos de cada coeficiente de t. Es necesario durante la firma para reconstruir w sin revelar los secretos."
              />
            </StepCard>

            {/* ═══ Step 3 Row ═══ */}
            <StepCard num={3} title="Truncado Power2Round" icon={Binary} color={PUBLIC_COLOR} delay={3}>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Se extraen los HighBits <KaTeX math="\mathbf{t}_1" /> con parámetro de truncado{" "}
                <KaTeX math="d = 13" />. Los LowBits <KaTeX math="\mathbf{t}_0" /> se almacenan en{" "}
                <KaTeX math="sk" />.
              </p>
              <FormulaBlock math="(\mathbf{t}_1, \mathbf{t}_0) = \text{Power2Round}(\mathbf{t},\; d=13)" />
            </StepCard>

            <StepCard num={3} title="Huella Digital tr" icon={Fingerprint} color={PRIVATE_COLOR} delay={3}>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hash de 64 bytes de la clave pública empaquetada. Vincula fuertemente la firma
                a la identidad del firmante.
              </p>
              <FormulaBlock
                math="tr = \text{SHAKE-256}(pk,\; 64)"
                tooltip="FIPS 204 §5.1: Hash de vinculación de 64 bytes. Previene ataques de sustitución de clave pública y asegura que cada firma esté ligada a una identidad única."
              />
            </StepCard>

            {/* ═══ Result Row ═══ */}
            <motion.div custom={4} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="pt-2">
              <div
                className="rounded-xl border-2 p-4 text-center h-full flex flex-col items-center justify-center"
                style={{
                  borderColor: `hsl(${PUBLIC_COLOR} / 0.3)`,
                  background: `hsl(${PUBLIC_COLOR} / 0.04)`,
                }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Package className="w-4 h-4" style={{ color: `hsl(${PUBLIC_COLOR})` }} />
                  <span className="text-xs font-semibold" style={{ color: `hsl(${PUBLIC_COLOR})` }}>
                    Clave Pública Empaquetada
                  </span>
                </div>
                <KaTeX math="pk = (\rho,\; \mathbf{t}_1)" />
                <Badge
                  variant="outline"
                  className="mt-2 font-mono text-[10px]"
                  style={{ borderColor: `hsl(${PUBLIC_COLOR} / 0.3)`, color: `hsl(${PUBLIC_COLOR})` }}
                >
                  {lvl.pkSize.toLocaleString("es-ES")} bytes
                </Badge>
              </div>
            </motion.div>

            <motion.div custom={4} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="pt-2">
              <div
                className="rounded-xl border-2 p-4 text-center h-full flex flex-col items-center justify-center"
                style={{
                  borderColor: `hsl(${PRIVATE_COLOR} / 0.3)`,
                  background: `hsl(${PRIVATE_COLOR} / 0.04)`,
                }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Package className="w-4 h-4" style={{ color: `hsl(${PRIVATE_COLOR})` }} />
                  <span className="text-xs font-semibold" style={{ color: `hsl(${PRIVATE_COLOR})` }}>
                    Clave Privada Empaquetada
                  </span>
                </div>
                <KaTeX math="sk = (\rho,\; K,\; tr,\; \mathbf{s}_1,\; \mathbf{s}_2,\; \mathbf{t}_0)" />
                <Badge
                  variant="outline"
                  className="mt-2 font-mono text-[10px]"
                  style={{ borderColor: `hsl(${PRIVATE_COLOR} / 0.3)`, color: `hsl(${PRIVATE_COLOR})` }}
                >
                  {lvl.skSize.toLocaleString("es-ES")} bytes
                </Badge>
              </div>
            </motion.div>
          </div>

          {/* ─── Level params summary bar ─── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="group"
          >
            <Card className="bg-[#0a0a0a] border border-white/10 group-hover:border-white/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-mono text-slate-400">
                  <span>
                    <span className="text-primary">{lvl.name}</span> · {lvl.label}
                  </span>
                  <span>
                    <KaTeX math={`k=${lvl.k}`} /> <KaTeX math={`l=${lvl.l}`} />
                  </span>
                  <span>
                    <KaTeX math={`\\eta=${lvl.eta}`} />
                  </span>
                  <span>
                    <span style={{ color: `hsl(${PUBLIC_COLOR})` }}>pk</span> = {lvl.pkSize.toLocaleString("es-ES")}B
                  </span>
                  <span>
                    <span style={{ color: `hsl(${PRIVATE_COLOR})` }}>sk</span> = {lvl.skSize.toLocaleString("es-ES")}B
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </TooltipProvider>
  );
};

export default GeneracionClavesSection;
