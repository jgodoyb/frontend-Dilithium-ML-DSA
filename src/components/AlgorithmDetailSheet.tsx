import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookOpen, ArrowRightLeft, Code2, Link2, GitBranch } from "lucide-react";
import { algorithmDetails, parameterTooltips } from "@/data/algorithmDetails";
import { allAlgorithms } from "@/components/AlgorithmBlueprintSection";
import KaTeX from "@/components/KaTeX";

interface Props {
  algorithmId: string | null;
  algorithmName?: string;
  level: number;
  deps: string[];
  onClose: () => void;
}

// Render pseudocode with parameter tooltips inline
const PseudocodeBlock = ({ code, params }: { code: string; params: string[] }) => {
  const lines = code.split("\n");
  return (
    <div className="rounded-none sm:rounded-sm border border-zinc-800 bg-black overflow-x-auto">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/60">
        <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
          // PSEUDOCODE_SPECIFICATION
        </span>
      </div>
      <pre className="p-4 text-[13px] leading-relaxed font-mono text-zinc-300">
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span className="select-none w-8 text-right mr-4 text-zinc-600 text-[11px]">
              {i + 1}
            </span>
            <HighlightedLine line={line} params={params} />
          </div>
        ))}
      </pre>
    </div>
  );
};

const HighlightedLine = ({ line, params }: { line: string; params: string[] }) => {
  const keywords = ["function", "for", "while", "do", "end", "if", "then", "else", "return", "from", "to", "mod", "step"];
  const commentIdx = line.indexOf("▷");
  const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
  const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : "";

  let highlighted = codePart;
  keywords.forEach((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, "g");
    highlighted = highlighted.replace(regex, `⟨KW⟩${kw}⟨/KW⟩`);
  });

  const tokens = highlighted.split(/(⟨KW⟩|⟨\/KW⟩)/);
  let inKw = false;
  const elements: React.ReactNode[] = [];

  tokens.forEach((token, i) => {
    if (token === "⟨KW⟩") { inKw = true; return; }
    if (token === "⟨/KW⟩") { inKw = false; return; }
    if (inKw) {
      elements.push(<span key={i} className="text-cyan-400 font-semibold">{token}</span>);
    } else if (token) {
      elements.push(<ParameterAwareText key={i} text={token} params={params} />);
    }
  });

  return (
    <span className="flex-1">
      {elements}
      {commentPart && <span className="text-zinc-500 italic">{commentPart}</span>}
    </span>
  );
};

const ParameterAwareText = ({ text, params }: { text: string; params: string[] }) => {
  if (params.length === 0) return <span>{text}</span>;

  const symbolMap: Record<string, string> = {};
  params.forEach((p) => {
    const info = parameterTooltips[p];
    if (info) symbolMap[info.symbol] = p;
  });

  const symbols = Object.keys(symbolMap);
  if (symbols.length === 0) return <span>{text}</span>;

  const escaped = symbols.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = text.split(pattern);

  return (
    <span>
      {parts.map((part, i) => {
        const paramKey = symbolMap[part];
        if (paramKey) {
          const info = parameterTooltips[paramKey];
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <span className="text-zinc-100 cursor-help border-b border-dashed border-cyan-500/50 hover:border-cyan-400 transition-colors">
                  {part}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-xs rounded-none">
                <p className="font-semibold text-xs mb-1 text-cyan-400">{info.symbol} — {info.description}</p>
                <p className="text-[10px] text-zinc-400">{info.values}</p>
              </TooltipContent>
            </Tooltip>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

// ─── Dependencies Section ───────────────────────────────────────────

const DependenciesSection = ({ deps }: { deps: string[] }) => {
  if (deps.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-200">
          // DEPENDENCIAS_REQUERIDAS
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {deps.map((depId) => {
          const depAlg = allAlgorithms.find((a) => a.id === depId);
          if (!depAlg) return null;
          return (
            <span
              key={depId}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-none sm:rounded-sm border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-300"
            >
              <span className="text-[9px] font-bold px-1 py-0.2 border border-zinc-700 bg-zinc-950 text-cyan-400">
                {depAlg.algNum}
              </span>
              <span className="font-medium">{depAlg.name}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Sheet ─────────────────────────────────────────────────────

const AlgorithmDetailSheet = ({ algorithmId, algorithmName, level, deps, onClose }: Props) => {
  const detail = algorithmId ? algorithmDetails[algorithmId] : null;

  return (
    <TooltipProvider delayDuration={200}>
      <Sheet open={!!detail} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-lg md:max-w-xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 text-zinc-200 font-mono">
          {detail && (
            <>
              <SheetHeader className="pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 border border-cyan-500/40 bg-cyan-950/30 text-cyan-300">
                    {detail.fipsNumber}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Nivel [{String(level).padStart(2, "0")}] · FIPS 204
                  </span>
                </div>
                <SheetTitle className="text-xl font-bold font-mono text-zinc-100 uppercase tracking-tight">
                  {algorithmName || algorithmId}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Summary */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs uppercase tracking-wider font-bold text-zinc-200">
                      // RESUMEN_FUNCIONAL
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {detail.summary}
                  </p>
                </div>

                {/* Inputs / Outputs */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs uppercase tracking-wider font-bold text-zinc-200">
                      // ESPECIFICACIÓN_I_O
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {detail.inputs.length > 0 && (
                      <div className="border border-zinc-800 p-3 bg-zinc-900/60 rounded-none sm:rounded-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-2">
                          ENTRADAS (INPUTS)
                        </p>
                        {detail.inputs.map((inp, i) => (
                          <div key={i} className="flex items-baseline gap-2 text-xs mb-1 last:mb-0">
                            <KaTeX math={inp.name} className="text-zinc-200 font-bold" />
                            <span className="text-zinc-600">—</span>
                            <span className="text-zinc-400 text-xs">{inp.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border border-zinc-800 p-3 bg-zinc-900/60 rounded-none sm:rounded-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-2">
                        SALIDAS (OUTPUTS)
                      </p>
                      {detail.outputs.map((out, i) => (
                        <div key={i} className="flex items-baseline gap-2 text-xs mb-1 last:mb-0">
                          <KaTeX math={out.name} className="text-zinc-200 font-bold" />
                          <span className="text-zinc-600">—</span>
                          <span className="text-zinc-400 text-xs">{out.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dependencies */}
                <DependenciesSection deps={deps} />

                {/* Pseudocode */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs uppercase tracking-wider font-bold text-zinc-200">
                      // PSEUDOCÓDIGO_OFICIAL
                    </h3>
                    <span className="text-[10px] text-zinc-500 ml-auto">FIPS 204</span>
                  </div>
                  <PseudocodeBlock code={detail.pseudocode} params={detail.parameters} />
                </div>

                {/* Parameters */}
                {detail.parameters.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Link2 className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-xs uppercase tracking-wider font-bold text-zinc-200">
                        // PARÁMETROS_VINCULADOS
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detail.parameters.map((p) => {
                        const info = parameterTooltips[p];
                        if (!info) return null;
                        return (
                          <Tooltip key={p}>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-zinc-800 bg-zinc-900 text-zinc-300 cursor-help text-xs font-mono transition-colors hover:border-cyan-400 hover:text-cyan-300">
                                {info.symbol}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-xs rounded-none">
                              <p className="font-semibold text-xs mb-1 text-cyan-400">{info.symbol}</p>
                              <p className="text-xs text-zinc-400">{info.description}</p>
                              <p className="text-[10px] text-zinc-500 mt-1">{info.values}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
};

export default AlgorithmDetailSheet;
