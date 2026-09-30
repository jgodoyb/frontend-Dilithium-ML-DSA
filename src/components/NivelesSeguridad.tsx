import { useState } from "react";
import KaTeX from "./KaTeX";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Key, Shield, FileSignature, Lock, Grid3X3, Binary, Hash, Scissors } from "lucide-react";

const levels = [
  {
    name: "ML-DSA-44",
    category: "Categoría 2",
    equiv: "AES-128",
    q: 8380417, d: 13,
    k: 4, l: 4, eta: 2, tau: 39,
    gamma1: "2^{17}", gamma2: "(q-1)/88", omega: 80,
    pk: 1312, sk: 2560, sig: 2420,
  },
  {
    name: "ML-DSA-65",
    category: "Categoría 3",
    equiv: "AES-192",
    q: 8380417, d: 13,
    k: 6, l: 5, eta: 4, tau: 49,
    gamma1: "2^{19}", gamma2: "(q-1)/32", omega: 55,
    pk: 1952, sk: 4032, sig: 3309,
  },
  {
    name: "ML-DSA-87",
    category: "Categoría 5",
    equiv: "AES-256",
    q: 8380417, d: 13,
    k: 8, l: 7, eta: 2, tau: 60,
    gamma1: "2^{19}", gamma2: "(q-1)/32", omega: 75,
    pk: 2592, sk: 4896, sig: 4627,
  },
];

const glossary = [
  {
    id: "q",
    icon: Hash,
    title: "q — Módulo primo",
    formula: "q = 8\\,380\\,417",
    content:
      "Número primo que define el cuerpo finito \\(\\mathbb{Z}_q\\). Toda la aritmética de coeficientes se realiza módulo \\(q\\), con valores en el rango \\(0\\) a \\(q-1\\). Es el mismo para los tres niveles de seguridad.",
  },
  {
    id: "d",
    icon: Scissors,
    title: "d — Bits truncados",
    formula: "d = 13",
    content:
      "Indica cuántos de los bits bajos del vector de clave pública t se descartan. Se truncan 13 bits en todos los niveles, reduciendo el tamaño de la clave pública sin comprometer la seguridad del esquema.",
  },
  {
    id: "k-l",
    icon: Grid3X3,
    title: "k & l — Dimensiones de la matriz A",
    formula: "\\mathbf{A} \\in R_q^{k \\times l}",
    content:
      "Definen el tamaño del problema Module-LWE subyacente. La matriz pública A tiene k filas y l columnas de polinomios en \\(R_q\\). A mayor dimensión, mayor es la seguridad frente a ataques clásicos y cuánticos.",
  },
  {
    id: "eta",
    icon: Binary,
    title: "η (Eta) — Rango de coeficientes secretos",
    formula: "\\mathbf{s}_1, \\mathbf{s}_2 \\leftarrow S_\\eta, \\quad \\text{coef.} \\in [-\\eta,\\, \\eta]",
    content:
      "Define el rango de extracción de coeficientes para las claves privadas s₁ y s₂. Cada coeficiente se muestrea uniformemente del intervalo [−η, η]. Un η más pequeño produce claves con menos entropía por coeficiente, compensada por las dimensiones del retículo.",
  },
  {
    id: "tau",
    icon: Shield,
    title: "τ (Tau) — Peso del polinomio desafío",
    formula: "c \\in R_q,\\; \\|c\\|_1 = \\tau \\;\\text{de } 256 \\text{ coef.}",
    content:
      "Indica cuántos coeficientes del polinomio de desafío c son +1 o −1 entre los 256 totales (el resto son 0). Un τ mayor aumenta la complejidad del desafío, dificultando la falsificación de firmas.",
  },
  {
    id: "gamma1",
    icon: Lock,
    title: "γ₁ (Gamma 1) — Límite del vector de máscara",
    formula: "\\mathbf{y} \\leftarrow [-\\gamma_1 + 1,\\; \\gamma_1]^l",
    content:
      "Define el límite del tamaño del vector de máscara aleatorio y. Cada coeficiente se muestrea uniformemente del intervalo [−γ₁+1, γ₁]. Controla la distribución de la máscara utilizada durante la generación de la firma.",
  },
  {
    id: "gamma2",
    icon: Lock,
    title: "γ₂ (Gamma 2) — Ventana de descomposición",
    formula: "\\text{HighBits}(r, \\gamma_2),\\quad \\text{LowBits}(r, \\gamma_2)",
    content:
      "Define la ventana para la función HighBits al descomponer el compromiso w. Se usa para separar los bits altos y bajos, controlando la precisión de la reconstrucción durante la verificación de la firma.",
  },
  {
    id: "omega",
    icon: Key,
    title: "ω (Omega) — Peso máximo del hint",
    formula: "\\|\\mathbf{h}\\|_1 \\leq \\omega",
    content:
      "Máximo de bits a 1 permitidos en el vector de pistas (hint h). El hint permite al verificador reconstruir los bits altos de w sin conocer el secreto. Por ejemplo, para ML-DSA-65 el límite es 55.",
  },
];

type Row = {
  label: string;
  icon: typeof Hash;
  values: string[];
  isFormula?: boolean;
  isSizeRow?: boolean;
  isSecurity?: boolean;
};

const rows: Row[] = [
  { label: "q (módulo)", icon: Hash, values: levels.map((l) => l.q.toLocaleString("es-ES")), isFormula: false },
  { label: "d (bits truncados)", icon: Scissors, values: levels.map((l) => String(l.d)) },
  { label: "k (filas de A)", icon: Grid3X3, values: levels.map((l) => String(l.k)) },
  { label: "l (columnas de A)", icon: Grid3X3, values: levels.map((l) => String(l.l)) },
  { label: "η (rango clave privada)", icon: Binary, values: levels.map((l) => String(l.eta)) },
  { label: "τ (peso de c)", icon: Shield, values: levels.map((l) => String(l.tau)) },
  { label: "γ₁ (rango de y)", icon: Lock, values: levels.map((l) => l.gamma1), isFormula: true },
  { label: "γ₂ (ventana HighBits)", icon: Lock, values: levels.map((l) => l.gamma2), isFormula: true },
  { label: "ω (max 1's en hint)", icon: Key, values: levels.map((l) => String(l.omega)) },
  { label: "Tamaño PK", icon: Key, values: levels.map((l) => `${l.pk.toLocaleString()} bytes`), isSizeRow: true },
  { label: "Tamaño SK", icon: Key, values: levels.map((l) => `${l.sk.toLocaleString()} bytes`), isSizeRow: true },
  { label: "Tamaño Firma", icon: FileSignature, values: levels.map((l) => `${l.sig.toLocaleString()} bytes`), isSizeRow: true },
  { label: "Seguridad NIST", icon: Shield, values: levels.map((l) => l.category), isSecurity: true },
];

const NivelesSeguridad = () => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div id="niveles" className="space-y-16">
      {/* Intro Header */}
      <div className="space-y-2">
        <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold block">
          // MATRIZ_COMPARATIVA
        </span>
        <h3 className="text-xl sm:text-2xl font-bold text-zinc-100 font-mono">
          Niveles de Seguridad Oficiales
        </h3>
        <p className="text-zinc-400 font-mono text-xs sm:text-sm leading-relaxed max-w-3xl">
          Comparativa técnica completa según el estándar NIST FIPS 204: parámetros algebraicos, dimensiones vectoriales, tamaños binarios y categorización de seguridad.
        </p>
      </div>

      {/* Comparative Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-none sm:rounded-sm overflow-x-auto w-full">
        <div className="min-w-[620px]">
          {/* Header */}
          <div className="grid grid-cols-4 text-xs font-mono font-bold uppercase tracking-wider border-b border-zinc-800 bg-zinc-900/80">
            <div className="p-4 sm:p-5 text-zinc-400">PARÁMETRO</div>
            {levels.map((l, i) => (
              <div
                key={l.name}
                className={`p-4 sm:p-5 text-center transition-colors border-l border-zinc-800 font-mono cursor-default ${
                  hovered === i ? "text-cyan-300 bg-cyan-950/20" : "text-zinc-200"
                }`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {l.name}
              </div>
            ))}
          </div>

          {/* Rows */}
          {rows.map((row, ri) => (
            <div
              key={ri}
              className="grid grid-cols-4 border-b border-zinc-800/80 last:border-0 text-xs font-mono"
            >
              <div className="p-4 flex items-center gap-2 text-zinc-300 font-semibold bg-zinc-950">
                <row.icon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>{row.label}</span>
              </div>
              {row.values.map((v, ci) => (
                <div
                  key={ci}
                  className={`p-4 text-center font-mono transition-colors border-l border-zinc-800 ${
                    hovered === ci
                      ? "text-cyan-300 bg-cyan-950/20"
                      : row.isSecurity
                      ? "text-cyan-400 font-bold"
                      : "text-zinc-400"
                  }`}
                  onMouseEnter={() => setHovered(ci)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {row.isFormula ? <KaTeX math={v} /> : v}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Glossary */}
      <div className="space-y-8 pt-4">
        <div className="border-b border-zinc-800 pb-3">
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-500 block mb-1">
            // ESPECIFICACIÓN_FORMAL
          </span>
          <h4 className="text-xl sm:text-2xl font-bold text-zinc-100 font-mono">
            Glosario de Parámetros
          </h4>
          <p className="text-xs sm:text-sm font-mono text-zinc-400 mt-1">
            Definición y rol computacional de cada parámetro en el esquema ML-DSA.
          </p>
        </div>

        <Accordion type="multiple" className="w-full space-y-3">
          {glossary.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="border border-zinc-800 bg-zinc-950 rounded-none sm:rounded-sm px-6"
            >
              <AccordionTrigger className="hover:no-underline py-5 text-left font-mono">
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-sm font-semibold text-zinc-200">{item.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-8 pt-2">
                <div className="space-y-6 pl-7">
                  <div className="bg-black border border-zinc-800 border-l-2 border-l-cyan-400 p-8 rounded-none sm:rounded-sm inline-block">
                    <KaTeX math={item.formula} />
                  </div>
                  <p className="text-zinc-400 font-mono text-xs sm:text-sm leading-relaxed max-w-4xl">
                    {item.content}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default NivelesSeguridad;
