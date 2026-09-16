import { useState } from "react";
import KaTeX from "./KaTeX";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    cssVar: "--level-2",
    q: 8380417, d: 13,
    k: 4, l: 4, eta: 2, tau: 39,
    gamma1: "2^{17}", gamma2: "(q-1)/88", omega: 80,
    pk: 1312, sk: 2560, sig: 2420,
  },
  {
    name: "ML-DSA-65",
    category: "Categoría 3",
    equiv: "AES-192",
    cssVar: "--level-3",
    q: 8380417, d: 13,
    k: 6, l: 5, eta: 4, tau: 49,
    gamma1: "2^{19}", gamma2: "(q-1)/32", omega: 55,
    pk: 1952, sk: 4032, sig: 3309,
  },
  {
    name: "ML-DSA-87",
    category: "Categoría 5",
    equiv: "AES-256",
    cssVar: "--level-5",
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
    <section id="niveles" className="relative pb-24 z-10 bg-transparent">
      <div className="max-w-5xl">
        <div className="text-left mb-16 pl-6">
          <p className="text-sm font-semibold tracking-[0.2em] uppercase mb-4 text-[#0e7490]">
            FIPS 204 · Especificaciones
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Niveles de Seguridad Oficiales
          </h2>
          <p className="text-slate-400 max-w-3xl font-light text-lg">
            Comparativa completa según el estándar NIST FIPS 204: parámetros internos,
            tamaños de clave y categoría de seguridad.
          </p>
        </div>

        {/* Comparative Table */}
        <div className="bg-[#030303] border-y border-white/10 md:border md:shadow-2xl mb-12">
            {/* Header */}
            <div className="grid grid-cols-4 text-xs font-bold uppercase tracking-[0.1em] border-b border-white/20 bg-[#0a0a0a]">
              <div className="p-4 md:p-6 text-slate-400">Parámetro</div>
              {levels.map((l, i) => (
                <div
                  key={l.name}
                  className="p-4 md:p-6 text-center transition-colors duration-200 border-l border-white/5 font-mono"
                  style={{
                    color: hovered === i ? "#0e7490" : "#ffffff",
                    background: hovered === i ? "rgba(14, 116, 144, 0.1)" : "transparent",
                  }}
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
                className="grid grid-cols-4 border-b border-white/5 last:border-0 text-sm"
              >
                <div className="p-4 flex items-center gap-2 text-slate-300 font-semibold">
                  <row.icon className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{row.label}</span>
                </div>
                {row.values.map((v, ci) => (
                  <div
                    key={ci}
                    className="p-4 text-center font-mono text-sm transition-all duration-200 border-l border-white/5"
                    style={{
                      color: hovered === ci ? "#0e7490" : "#94a3b8",
                      background: hovered === ci ? "rgba(14, 116, 144, 0.1)" : "transparent",
                    }}
                    onMouseEnter={() => setHovered(ci)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {row.isFormula ? <KaTeX math={v} /> : v}
                  </div>
                ))}
              </div>
            ))}
        </div>

        {/* Glossary */}
        <div className="px-6 md:px-0">
          <div className="border-b-2 border-white/10 pb-4 mb-6">
            <h3 className="text-white text-2xl font-bold">
              Glosario de Parámetros
            </h3>
            <p className="text-sm text-slate-400 mt-2 font-light">
              Significado oficial y rol de cada parámetro en el esquema ML-DSA.
            </p>
          </div>
          <div>
            <Accordion type="multiple" className="w-full">
              {glossary.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="border-white/10">
                  <AccordionTrigger className="hover:no-underline py-4 text-left">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-[#0e7490] shrink-0" />
                      <span className="text-base font-semibold text-slate-200">{item.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <div className="pl-8 space-y-4">
                      <div className="bg-white/5 border border-white/10 rounded p-4 mb-2 inline-block">
                        <KaTeX math={item.formula} />
                      </div>
                      <p className="text-slate-400 font-light leading-relaxed max-w-4xl text-base">
                        {item.content}
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NivelesSeguridad;
