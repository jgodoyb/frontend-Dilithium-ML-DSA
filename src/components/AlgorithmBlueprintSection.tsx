import { useState, useMemo, useRef } from "react";
import {
  Search, ChevronDown, ChevronRight, Binary, Package, Calculator,
  Layers, Shuffle, Shield, Cpu, Hash, Box, Lock,
  Grid3X3, Boxes, ScanLine, Zap, X,
} from "lucide-react";
import AlgorithmDetailSheet from "./AlgorithmDetailSheet";

// ─── Data ───────────────────────────────────────────────────────────

export interface Algorithm {
  id: string;
  algNum: string;
  name: string;
  deps: string[];
  shakeException?: string;
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
      { id: "rejntt", algNum: "Alg 30", name: "RejNTTPoly", deps: ["c3b"], shakeException: "SHAKE-128" },
      { id: "rejbnd", algNum: "Alg 31", name: "RejBoundedPoly", deps: ["chb"], shakeException: "SHAKE-256" },
      { id: "expa", algNum: "Alg 32", name: "ExpandA", deps: ["ity", "rejntt"], shakeException: "SHAKE-128" },
      { id: "exps", algNum: "Alg 33", name: "ExpandS", deps: ["ity", "rejbnd"], shakeException: "SHAKE-256" },
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
      { id: "kgi", algNum: "Alg 6", name: "ML-DSA.KeyGen_internal", deps: ["ity", "expa", "exps", "ntt", "intt", "p2r", "pke", "ske"], shakeException: "SHAKE-256" },
      { id: "sgi", algNum: "Alg 7", name: "ML-DSA.Sign_internal", deps: ["skd", "ntt", "expa", "expm", "intt", "hb", "w1e", "sib", "lb", "mkh", "sge"], shakeException: "SHAKE-256" },
      { id: "vfi", algNum: "Alg 8", name: "ML-DSA.Verify_internal", deps: ["pkd", "sgd", "expa", "sib", "ntt", "intt", "ush", "w1e"], shakeException: "SHAKE-256" },
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

interface DependencyAnalysis {
  directDeps: Set<string>;
  transitiveDeps: Set<string>;
  allDeps: Set<string>;
}

// Búsqueda en anchura (BFS) recursiva de clausura transitiva
function analyzeDependencies(rootId: string | null): DependencyAnalysis {
  const direct = new Set<string>();
  const transitive = new Set<string>();
  const all = new Set<string>();

  if (!rootId) {
    return { directDeps: direct, transitiveDeps: transitive, allDeps: all };
  }

  const rootAlg = allAlgorithms.find((a) => a.id === rootId);
  if (!rootAlg) {
    return { directDeps: direct, transitiveDeps: transitive, allDeps: all };
  }

  // Grado 1: Dependencias directas del algoritmo seleccionado
  for (const dep of rootAlg.deps) {
    direct.add(dep);
    all.add(dep);
  }

  // Grado 2 hasta Nivel 0: Búsqueda recursiva/BFS de todas las dependencias hijas
  const queue = [...rootAlg.deps];
  const visited = new Set<string>([rootId, ...rootAlg.deps]);

  while (queue.length > 0) {
    const currId = queue.shift()!;
    const currAlg = allAlgorithms.find((a) => a.id === currId);
    if (!currAlg) continue;

    for (const nextDep of currAlg.deps) {
      if (!visited.has(nextDep)) {
        visited.add(nextDep);
        transitive.add(nextDep);
        all.add(nextDep);
        queue.push(nextDep);
      }
    }
  }

  return { directDeps: direct, transitiveDeps: transitive, allDeps: all };
}

// ─── Component ──────────────────────────────────────────────────────

const AlgorithmBlueprintSection = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [collapsedLevels, setCollapsedLevels] = useState<Set<number>>(new Set());
  const [treeMode, setTreeMode] = useState(false);
  const [detailAlg, setDetailAlg] = useState<{ id: string; level: number; name: string; deps: string[] } | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const { directDeps, transitiveDeps, allDeps } = useMemo(
    () => analyzeDependencies(selected),
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
    Cimientos: "NIVELES 00–02 // PRIMITIVAS",
    "Motor Matemático": "NIVELES 03–04 // ARITMÉTICA POLINÓMICA",
    "Lógica de Muestreo": "NIVELES 05–06 // GAUSSIAN & BALL SAMPLING",
    Descomposición: "NIVELES 07–08 // TRUNCADO Y PISTAS",
    "API Pública": "NIVELES 09–11 // ENLACE EXTERNO & CORE",
  };

  return (
    <div id="blueprint" className="space-y-8" ref={sectionRef}>
      {/* Header */}
      <div className="space-y-2">
        <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold block">
          // FASE 06 // THE ALGORITHM BLUEPRINT
        </span>
        <h3 className="text-xl sm:text-2xl font-bold text-zinc-100">
          The Algorithm Blueprint (FIPS 204)
        </h3>
        <p className="text-zinc-400 font-mono text-xs sm:text-sm max-w-3xl leading-relaxed">
          Grafo de dependencias algorítmicas de ML-DSA. Selecciona cualquier nodo para trazar su cadena de llamadas descendentes resaltada en cian sobre el mapa monocromático.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar algoritmo o instrucción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 font-mono text-xs rounded-none sm:rounded-sm bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>
        <button
          onClick={() => setTreeMode(!treeMode)}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase rounded-none sm:rounded-sm border transition-colors ${treeMode
            ? "bg-cyan-950/20 border-cyan-400 text-cyan-300"
            : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          MODO ÁRBOL
        </button>
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 px-3 py-2 font-mono text-xs rounded-none sm:rounded-sm border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            LIMPIAR SELECCIÓN
          </button>
        )}
      </div>

      {/* Dependency Cascade Status Banner */}
      {selected && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border border-cyan-500/40 bg-cyan-950/20 rounded-none sm:rounded-sm font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400 animate-pulse" />
            <span className="text-zinc-400">ÁRBOL ACTIVO:</span>
            <span className="text-white font-bold">{allAlgorithms.find((a) => a.id === selected)?.name}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-cyan-300">
              <strong className="text-white font-bold">{directDeps.size}</strong> directas (Grado 1)
            </span>
            <span className="text-cyan-400/80">
              <strong className="text-white font-bold">{transitiveDeps.size}</strong> transitivas (Grado 2 → Nivel 0)
            </span>
            <span className="text-zinc-400">
              Total: <strong className="text-white font-bold">{allDeps.size}</strong> nodos en cascada
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-6 items-start">
        {/* ─── Minimap ─── */}
        <div className="hidden lg:flex flex-col gap-1 sticky top-28 self-start w-10 shrink-0">
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
                  className={`w-8 h-5 rounded-none font-mono text-[9px] font-bold flex items-center justify-center border transition-colors ${hasMatch
                    ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-cyan-500/50 hover:text-cyan-400"
                    : "bg-zinc-950/50 border-zinc-900 text-zinc-700 opacity-40"
                    }`}
                >
                  {l.level}
                </div>
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block whitespace-nowrap bg-zinc-900 border border-zinc-800 px-2 py-1 text-[10px] font-mono text-zinc-200 z-50">
                  [{l.level}] {l.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* ─── Main pipeline ─── */}
        <div className="flex-1 space-y-4 min-w-0">
          {filteredLevels.map((l, li) => {
            const isCollapsed = collapsedLevels.has(l.level);
            const prevCategory =
              li > 0 ? filteredLevels[li - 1].category : null;
            const showCategoryHeader = l.category !== prevCategory;
            const LevelIcon = l.icon;

            return (
              <div key={l.level} id={`bp-level-${l.level}`} className="space-y-2">
                {/* Category divider */}
                {showCategoryHeader && (
                  <div className="flex items-center gap-3 pt-6 pb-2 first:pt-0">
                    <div className="h-px flex-1 bg-zinc-800" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                      {categoryLabels[l.category] || l.category}
                    </span>
                    <div className="h-px flex-1 bg-zinc-800" />
                  </div>
                )}

                {/* Level header */}
                <button
                  onClick={() => treeMode && toggleLevel(l.level)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-none sm:rounded-sm border border-zinc-800 bg-zinc-950/90 transition-colors ${treeMode ? "cursor-pointer hover:border-zinc-700" : "cursor-default"
                    }`}
                >
                  {treeMode && (
                    isCollapsed
                      ? <ChevronRight className="w-4 h-4 text-zinc-500" />
                      : <ChevronDown className="w-4 h-4 text-zinc-500" />
                  )}
                  <div className="w-7 h-7 border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-400">
                    <LevelIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-baseline gap-2 flex-1 text-left font-mono">
                    <span className="text-xs font-bold text-zinc-400">
                      [{String(l.level).padStart(2, "0")}]
                    </span>
                    <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wide">
                      {l.label}
                    </span>
                    <span className="text-[10px] text-zinc-600 ml-auto">
                      {l.algorithms.length} algs
                    </span>
                  </div>
                </button>

                {/* Algorithm cards */}
                {!(treeMode && isCollapsed) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pl-2 sm:pl-4">
                    {l.algorithms.map((alg) => {
                      const isSelected = selected === alg.id;
                      const isDirect = directDeps.has(alg.id);
                      const isTransitive = transitiveDeps.has(alg.id);
                      const isDep = isDirect || isTransitive;
                      const dimmed =
                        selected !== null && !isSelected && !isDep;
                      const visible = isAlgVisible(alg.id);

                      return (
                        <button
                          key={alg.id}
                          onClick={() =>
                            setSelected(selected === alg.id ? null : alg.id)
                          }
                          className={`text-left p-4 sm:p-5 border rounded-none sm:rounded-sm font-mono transition-all duration-200 flex flex-col justify-between ${isSelected
                            ? "border-white bg-cyan-950/60 text-white shadow-[0_0_20px_rgba(34,211,238,0.25)] ring-1 ring-white"
                            : isDirect
                              ? "border-cyan-400 bg-cyan-950/30 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                              : isTransitive
                                ? "border-cyan-500/40 bg-cyan-950/10 text-cyan-400/90"
                                : dimmed
                                  ? "opacity-25 border-zinc-900 bg-zinc-950/40 text-zinc-600"
                                  : visible
                                    ? "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900/50"
                                    : "opacity-15 border-zinc-900 bg-zinc-950 text-zinc-700"
                            }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 border ${isSelected
                                ? "border-white bg-white/20 text-white"
                                : isDirect
                                  ? "border-cyan-400/80 bg-cyan-950/80 text-cyan-200"
                                  : isTransitive
                                    ? "border-cyan-500/50 bg-cyan-950/40 text-cyan-400"
                                    : "border-zinc-800 bg-zinc-900 text-zinc-400"
                                }`}
                            >
                              {alg.algNum}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-zinc-500">
                                L{l.level}
                              </span>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailAlg({ id: alg.id, level: l.level, name: alg.name, deps: alg.deps });
                                }}
                                className="text-[10px] px-1.5 py-0.2 border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-cyan-400 hover:text-cyan-300 cursor-pointer"
                                title="Ver pseudocódigo y detalles"
                              >
                                ⓘ
                              </span>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs sm:text-sm font-bold leading-tight mb-1">
                              {alg.name}
                            </p>
                            {isSelected && (
                              <span className="text-[9px] font-mono text-cyan-300 font-bold uppercase tracking-wider block">
                                [ NODO_SELECCIONADO ]
                              </span>
                            )}
                            {isDirect && (
                              <span className="text-[9px] font-mono text-cyan-300 uppercase tracking-wider block">
                                [ DEP_DIRECTA · G1 ]
                              </span>
                            )}
                            {isTransitive && (
                              <span className="text-[9px] font-mono text-cyan-400/80 uppercase tracking-wider block">
                                [ DEP_TRANSITIVA ]
                              </span>
                            )}
                          </div>

                          {/* SHAKE exception badge */}
                          {alg.shakeException && (
                            <div className="flex items-center gap-1 mt-auto pt-2 text-[9px] text-zinc-500">
                              <Zap className="w-2.5 h-2.5 text-cyan-400" />
                              <span>{alg.shakeException}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Alg Detail Sheet */}
      {detailAlg && (
        <AlgorithmDetailSheet
          algorithmId={detailAlg.id}
          algorithmName={detailAlg.name}
          level={detailAlg.level}
          deps={detailAlg.deps}
          onClose={() => setDetailAlg(null)}
        />
      )}
    </div>
  );
};

export default AlgorithmBlueprintSection;
