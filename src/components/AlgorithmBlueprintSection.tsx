import { useState, useMemo, useRef } from "react";
import {
  Search, ChevronDown, ChevronRight, Binary, Package, Calculator,
  Layers, Shuffle, Shield, Key, FileCheck, Cpu, Hash, Box, Lock,
  Grid3X3, Boxes, ScanLine, Zap,
} from "lucide-react";
import AlgorithmDetailSheet from "./AlgorithmDetailSheet";

// ─── Data ───────────────────────────────────────────────────────────

export interface Algorithm {
  id: string;
  algNum: string;
  name: string;
  deps: string[];
  shakeException?: string; // e.g. "SHAKE-128 (Clase G)" for RejNTTPoly
}

export interface Level {
  level: number;
  label: string;
  category: string;
  icon: React.ElementType;
  algorithms: Algorithm[];
}

export const levels: Level[] = [
  {
    level: 0, label: "Conversión Bit/Byte", category: "Cimientos", icon: Binary,
    algorithms: [
      { id: "itb", algNum: "Alg 9", name: "IntegerToBits", deps: [] },
      { id: "bti", algNum: "Alg 10", name: "BitsToInteger", deps: [] },
      { id: "ity", algNum: "Alg 11", name: "IntegerToBytes", deps: [] },
      { id: "bty", algNum: "Alg 12", name: "BitsToBytes", deps: [] },
      { id: "yti", algNum: "Alg 13", name: "BytesToBits", deps: [] },
    ],
  },
  {
    level: 1, label: "Coeff Sampling", category: "Cimientos", icon: ScanLine,
    algorithms: [
      { id: "c3b", algNum: "Alg 14", name: "CoeffFromThreeBytes", deps: [] },
      { id: "chb", algNum: "Alg 15", name: "CoeffFromHalfByte", deps: [] },
    ],
  },
  {
    level: 2, label: "Empaquetado", category: "Cimientos", icon: Package,
    algorithms: [
      { id: "sbp", algNum: "Alg 16", name: "SimpleBitPack", deps: ["itb", "bty"] },
      { id: "bp", algNum: "Alg 17", name: "BitPack", deps: ["itb", "bty"] },
      { id: "sbu", algNum: "Alg 18", name: "SimpleBitUnpack", deps: ["yti", "bti"] },
      { id: "bu", algNum: "Alg 19", name: "BitUnpack", deps: ["yti", "bti"] },
      { id: "hbp", algNum: "Alg 20", name: "HintBitPack", deps: [] },
      { id: "hbu", algNum: "Alg 21", name: "HintBitUnpack", deps: [] },
    ],
  },
  {
    level: 3, label: "NTT Engine", category: "Motor Matemático", icon: Calculator,
    algorithms: [
      { id: "ntt", algNum: "Alg 41", name: "NTT", deps: ["br8"] },
      { id: "intt", algNum: "Alg 42", name: "NTT⁻¹", deps: ["br8"] },
      { id: "br8", algNum: "Alg 43", name: "BitRev8", deps: [] },
    ],
  },
  {
    level: 4, label: "Aritmética Vectorial", category: "Motor Matemático", icon: Grid3X3,
    algorithms: [
      { id: "addntt", algNum: "Alg 44", name: "AddNTT", deps: [] },
      { id: "mulntt", algNum: "Alg 45", name: "MultiplyNTT", deps: [] },
      { id: "addv", algNum: "Alg 46", name: "AddVectorNTT", deps: ["addntt"] },
      { id: "smul", algNum: "Alg 47", name: "ScalarVectorNTT", deps: ["mulntt"] },
      { id: "mvn", algNum: "Alg 48", name: "MatrixVectorNTT", deps: ["mulntt", "addntt"] },
    ],
  },
  {
    level: 5, label: "Expansión & Muestreo", category: "Lógica de Muestreo", icon: Shuffle,
    algorithms: [
      { id: "rejntt", algNum: "Alg 30", name: "RejNTTPoly", deps: ["c3b"], shakeException: "SHAKE-128 (Clase G)" },
      { id: "rejbnd", algNum: "Alg 31", name: "RejBoundedPoly", deps: ["chb"], shakeException: "SHAKE-256 (Clase H)" },
      { id: "expa", algNum: "Alg 32", name: "ExpandA", deps: ["ity", "rejntt"], shakeException: "SHAKE-128 (Clase G)" },
      { id: "exps", algNum: "Alg 33", name: "ExpandS", deps: ["ity", "rejbnd"], shakeException: "SHAKE-256 (Clase H)" },
    ],
  },
  {
    level: 6, label: "Muestreo Avanzado", category: "Lógica de Muestreo", icon: Hash,
    algorithms: [
      { id: "sib", algNum: "Alg 29", name: "SampleInBall", deps: ["yti"] },
      { id: "expm", algNum: "Alg 34", name: "ExpandMask", deps: ["ity", "bu"] },
    ],
  },
  {
    level: 7, label: "Descomposición", category: "Descomposición", icon: Layers,
    algorithms: [
      { id: "p2r", algNum: "Alg 35", name: "Power2Round", deps: [] },
      { id: "dec", algNum: "Alg 36", name: "Decompose", deps: [] },
    ],
  },
  {
    level: 8, label: "Hints & Bits", category: "Descomposición", icon: Cpu,
    algorithms: [
      { id: "hb", algNum: "Alg 37", name: "HighBits", deps: ["dec"] },
      { id: "lb", algNum: "Alg 38", name: "LowBits", deps: ["dec"] },
      { id: "mkh", algNum: "Alg 39", name: "MakeHint", deps: ["hb"] },
      { id: "ush", algNum: "Alg 40", name: "UseHint", deps: ["dec"] },
    ],
  },
  {
    level: 9, label: "Codificación de Claves y Firmas", category: "API Pública", icon: Box,
    algorithms: [
      { id: "pke", algNum: "Alg 22", name: "pkEncode", deps: ["sbp"] },
      { id: "pkd", algNum: "Alg 23", name: "pkDecode", deps: ["sbu"] },
      { id: "ske", algNum: "Alg 24", name: "skEncode", deps: ["bp"] },
      { id: "skd", algNum: "Alg 25", name: "skDecode", deps: ["bu"] },
      { id: "sge", algNum: "Alg 26", name: "sigEncode", deps: ["bp", "hbp"] },
      { id: "sgd", algNum: "Alg 27", name: "sigDecode", deps: ["bu", "hbu"] },
      { id: "w1e", algNum: "Alg 28", name: "w1Encode", deps: ["sbp"] },
    ],
  },
  {
    level: 10, label: "Core Interno", category: "API Pública", icon: Lock,
    algorithms: [
      { id: "kgi", algNum: "Alg 6", name: "ML-DSA.KeyGen_internal", deps: ["ity", "expa", "exps", "ntt", "intt", "p2r", "pke", "ske"], shakeException: "SHAKE-256 (Clase H)" },
      { id: "sgi", algNum: "Alg 7", name: "ML-DSA.Sign_internal", deps: ["skd", "ntt", "expa", "expm", "intt", "hb", "w1e", "sib", "lb", "mkh", "sge"], shakeException: "SHAKE-256 (Clase H)" },
      { id: "vfi", algNum: "Alg 8", name: "ML-DSA.Verify_internal", deps: ["pkd", "sgd", "expa", "sib", "ntt", "intt", "ush", "w1e"], shakeException: "SHAKE-256 (Clase H)" },
    ],
  },
  {
    level: 11, label: "API Pública ML-DSA", category: "API Pública", icon: Shield,
    algorithms: [
      { id: "kg", algNum: "Alg 1", name: "ML-DSA.KeyGen", deps: ["kgi"] },
      { id: "sg", algNum: "Alg 2", name: "ML-DSA.Sign", deps: ["sgi"] },
      { id: "vf", algNum: "Alg 3", name: "ML-DSA.Verify", deps: ["vfi"] },
      { id: "hsg", algNum: "Alg 4", name: "HashML-DSA.Sign", deps: ["sgi"] },
      { id: "hvf", algNum: "Alg 5", name: "HashML-DSA.Verify", deps: ["vfi"] },
    ],
  },
];

// Flatten for search
export const allAlgorithms = levels.flatMap((l) =>
  l.algorithms.map((a) => ({ ...a, level: l.level }))
);

// Recursively collect all transitive deps
function collectAllDeps(id: string, visited = new Set<string>()): Set<string> {
  if (visited.has(id)) return visited;
  const alg = allAlgorithms.find((a) => a.id === id);
  if (!alg) return visited;
  for (const dep of alg.deps) {
    visited.add(dep);
    collectAllDeps(dep, visited);
  }
  return visited;
}

// ─── Color helpers ──────────────────────────────────────────────────

const levelColorVar = (level: number) => `var(--bp-${level})`;
const levelColor = (level: number) => `hsl(${levelColorVar(level)})`;
const levelBg = (level: number) => `hsl(${levelColorVar(level)} / 0.08)`;
const levelBorder = (level: number) => `hsl(${levelColorVar(level)} / 0.25)`;
const levelGlow = (level: number) => `0 0 20px hsl(${levelColorVar(level)} / 0.15)`;

// ─── Component ──────────────────────────────────────────────────────

const AlgorithmBlueprintSection = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [collapsedLevels, setCollapsedLevels] = useState<Set<number>>(new Set());
  const [treeMode, setTreeMode] = useState(false);
  const [detailAlg, setDetailAlg] = useState<{ id: string; level: number; name: string; deps: string[] } | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const highlighted = useMemo(
    () => (selected ? collectAllDeps(selected) : new Set<string>()),
    [selected]
  );

  const filteredLevels = useMemo(() => {
    if (!search.trim()) return levels;
    const q = search.toLowerCase();
    return levels
      .map((l) => ({
        ...l,
        algorithms: l.algorithms.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.algNum.toLowerCase().includes(q) ||
            a.id.toLowerCase().includes(q)
        ),
      }))
      .filter((l) => l.algorithms.length > 0);
  }, [search]);

  const toggleLevel = (level: number) => {
    setCollapsedLevels((prev) => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  };

  const scrollToLevel = (level: number) => {
    const el = document.getElementById(`bp-level-${level}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const isAlgVisible = (id: string) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const alg = allAlgorithms.find((a) => a.id === id);
    return alg
      ? alg.name.toLowerCase().includes(q) ||
          alg.algNum.toLowerCase().includes(q)
      : false;
  };

  const categoryLabels: Record<string, string> = {
    Cimientos: "Niveles 0–2",
    "Motor Matemático": "Niveles 3–4",
    "Lógica de Muestreo": "Niveles 5–6",
    Descomposición: "Niveles 7–8",
    "API Pública": "Niveles 9–11",
  };

  return (
    <section id="blueprint" className="relative pb-16 z-10" ref={sectionRef}>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="text-left mb-12 pl-6 border-l-4 border-[#0e7490]">
          <p className="text-sm font-semibold text-slate-400 tracking-[0.2em] uppercase mb-2">
            Arquitectura Interna
          </p>
          <h2 className="text-3xl font-bold mb-4 text-white">
            The Algorithm Blueprint
          </h2>
          <p className="text-slate-400 max-w-3xl text-base font-light">
            Mapa completo de dependencias de ML-DSA (FIPS 204). Haz clic en cualquier
            algoritmo para iluminar su cadena de dependencias.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar algoritmo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <button
            onClick={() => setTreeMode(!treeMode)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border transition-all ${
              treeMode
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Boxes className="w-4 h-4" />
            Modo Árbol
          </button>
          {selected && (
            <button
              onClick={() => setSelected(null)}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground transition-all"
            >
              Limpiar selección
            </button>
          )}
        </div>

        <div className="flex gap-6">
          {/* ─── Minimap ─── */}
          <div className="hidden lg:flex flex-col gap-1 sticky top-20 self-start w-12 shrink-0">
            {levels.map((l) => {
              const hasMatch =
                !search.trim() || filteredLevels.some((fl) => fl.level === l.level);
              return (
                <button
                  key={l.level}
                  onClick={() => scrollToLevel(l.level)}
                  title={`Nivel ${l.level}: ${l.label}`}
                  className="group relative"
                >
                  <div
                    className="w-8 h-5 rounded-sm transition-all flex items-center justify-center text-[9px] font-bold"
                    style={{
                      background: hasMatch ? levelBg(l.level) : "hsl(var(--muted) / 0.3)",
                      border: `1px solid ${hasMatch ? levelBorder(l.level) : "hsl(var(--border))"}`,
                      color: hasMatch ? levelColor(l.level) : "hsl(var(--muted-foreground))",
                      opacity: hasMatch ? 1 : 0.4,
                    }}
                  >
                    {l.level}
                  </div>
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block whitespace-nowrap bg-card border border-border rounded px-2 py-1 text-[10px] text-foreground z-50 shadow-lg">
                    {l.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ─── Main pipeline ─── */}
          <div className="flex-1 space-y-2">
            {filteredLevels.map((l, li) => {
              const isCollapsed = collapsedLevels.has(l.level);
              const prevCategory =
                li > 0 ? filteredLevels[li - 1].category : null;
              const showCategoryHeader = l.category !== prevCategory;
              const LevelIcon = l.icon;

              return (
                <div key={l.level} id={`bp-level-${l.level}`}>
                  {/* Category divider */}
                  {showCategoryHeader && (
                    <div className="flex items-center gap-3 mb-3 mt-6 first:mt-0">
                      <div
                        className="h-px flex-1"
                        style={{ background: levelBorder(l.level) }}
                      />
                      <span
                        className="text-[10px] font-semibold tracking-widest uppercase"
                        style={{ color: levelColor(l.level) }}
                      >
                        {l.category} · {categoryLabels[l.category]}
                      </span>
                      <div
                        className="h-px flex-1"
                        style={{ background: levelBorder(l.level) }}
                      />
                    </div>
                  )}

                  {/* Level header */}
                  <button
                    onClick={() => treeMode && toggleLevel(l.level)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all border ${
                      treeMode ? "cursor-pointer hover:border-primary/20" : "cursor-default"
                    }`}
                    style={{
                      background: levelBg(l.level),
                      borderColor: levelBorder(l.level),
                    }}
                  >
                    {treeMode && (
                      isCollapsed
                        ? <ChevronRight className="w-4 h-4" style={{ color: levelColor(l.level) }} />
                        : <ChevronDown className="w-4 h-4" style={{ color: levelColor(l.level) }} />
                    )}
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center"
                      style={{
                        background: `hsl(${levelColorVar(l.level)} / 0.15)`,
                      }}
                    >
                      <LevelIcon className="w-4 h-4" style={{ color: levelColor(l.level) }} />
                    </div>
                    <div className="flex items-baseline gap-2 flex-1 text-left">
                      <span
                        className="text-xs font-bold font-mono"
                        style={{ color: levelColor(l.level) }}
                      >
                        N{l.level}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{l.label}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                        {l.algorithms.length} alg{l.algorithms.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </button>

                  {/* Algorithm cards */}
                  {!(treeMode && isCollapsed) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 ml-4 lg:ml-6">
                      {l.algorithms.map((alg) => {
                        const isSelected = selected === alg.id;
                        const isDep = highlighted.has(alg.id);
                        const dimmed =
                          selected !== null && !isSelected && !isDep;
                        const visible = isAlgVisible(alg.id);

                        const shakeLabel = alg.shakeException;

                        return (
                          <button
                            key={alg.id}
                            onClick={() =>
                              setSelected(selected === alg.id ? null : alg.id)
                            }
                            className="text-left transition-all duration-300"
                            style={{
                              opacity: dimmed ? 0.25 : visible ? 1 : 0.15,
                              transform: dimmed ? "scale(0.97)" : "scale(1)",
                            }}
                          >
                            <div
                              className="rounded-xl p-3 border backdrop-blur-sm transition-all duration-300"
                              style={{
                                background: isSelected
                                  ? `hsl(${levelColorVar(l.level)} / 0.12)`
                                  : isDep
                                  ? `hsl(${levelColorVar(l.level)} / 0.06)`
                                  : "hsl(var(--card) / 0.6)",
                                borderColor: isSelected
                                  ? levelColor(l.level)
                                  : isDep
                                  ? levelBorder(l.level)
                                  : "hsl(var(--border))",
                                boxShadow: isSelected
                                  ? levelGlow(l.level)
                                  : isDep
                                  ? `0 0 12px hsl(${levelColorVar(l.level)} / 0.08)`
                                  : "none",
                              }}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span
                                  className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{
                                    background: `hsl(${levelColorVar(l.level)} / 0.12)`,
                                    color: levelColor(l.level),
                                  }}
                                >
                                  {alg.algNum}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="text-[9px] font-mono"
                                    style={{ color: levelColor(l.level) }}
                                  >
                                    Nivel {l.level}
                                  </span>
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailAlg({ id: alg.id, level: l.level, name: alg.name, deps: alg.deps });
                                    }}
                                    className="text-[9px] font-mono px-1.5 py-0.5 rounded cursor-pointer transition-all hover:scale-110"
                                    style={{
                                      background: `hsl(${levelColorVar(l.level)} / 0.15)`,
                                      color: levelColor(l.level),
                                    }}
                                    title="Ver detalles del algoritmo"
                                  >
                                    ⓘ
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-foreground leading-tight">
                                {alg.name}
                              </p>

                              {/* Global SHAKE badge */}
                              {shakeLabel && (
                                <div className="flex items-center gap-1 mt-1.5">
                                  <Zap className="w-2.5 h-2.5 text-amber-500/70" />
                                  <span className="text-[8px] font-mono text-amber-500/70">
                                    {shakeLabel}
                                  </span>
                                </div>
                              )}

                              {alg.deps.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {alg.deps.map((dep) => {
                                    const depAlg = allAlgorithms.find(
                                      (a) => a.id === dep
                                    );
                                    const depIsDep =
                                      isSelected && highlighted.has(dep);
                                    return (
                                      <span
                                        key={dep}
                                        className="text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all"
                                        style={{
                                          borderColor: depIsDep
                                            ? `hsl(${levelColorVar(depAlg?.level ?? 0)} / 0.5)`
                                            : "hsl(var(--border))",
                                          background: depIsDep
                                            ? `hsl(${levelColorVar(depAlg?.level ?? 0)} / 0.1)`
                                            : "transparent",
                                          color: depIsDep
                                            ? `hsl(${levelColorVar(depAlg?.level ?? 0)})`
                                            : "hsl(var(--muted-foreground))",
                                        }}
                                      >
                                        {depAlg?.name ?? dep}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Pipeline connector */}
                  {li < filteredLevels.length - 1 && !(treeMode && isCollapsed) && (
                    <div className="flex justify-center py-1">
                      <div
                        className="w-px h-4"
                        style={{
                          background: `linear-gradient(to bottom, ${levelBorder(l.level)}, ${levelBorder(filteredLevels[li + 1].level)})`,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {filteredLevels.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                No se encontraron algoritmos para «{search}»
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {["Cimientos", "Motor Matemático", "Lógica de Muestreo", "Descomposición", "API Pública"].map(
            (cat, i) => {
              const refLevel = [0, 3, 5, 7, 9][i];
              return (
                <div
                  key={cat}
                  className="flex items-center gap-1.5 text-[10px] font-medium"
                  style={{ color: levelColor(refLevel) }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: levelColor(refLevel) }}
                  />
                  {cat}
                </div>
              );
            }
          )}
        </div>
      </div>

      <AlgorithmDetailSheet
        algorithmId={detailAlg?.id ?? null}
        algorithmName={detailAlg?.name}
        level={detailAlg?.level ?? 0}
        deps={detailAlg?.deps ?? []}
        onClose={() => setDetailAlg(null)}
      />
    </section>
  );
};

export default AlgorithmBlueprintSection;
