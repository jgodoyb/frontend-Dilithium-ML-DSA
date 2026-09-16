import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookOpen, ArrowRightLeft, Code2, Link2, GitBranch } from "lucide-react";
import { algorithmDetails, parameterTooltips, type AlgorithmDetail } from "@/data/algorithmDetails";
import { allAlgorithms } from "@/components/AlgorithmBlueprintSection";
import KaTeX from "@/components/KaTeX";

interface Props {
  algorithmId: string | null;
  algorithmName?: string;
  level: number;
  deps: string[];
  onClose: () => void;
}

const levelColorVar = (level: number) => `var(--bp-${level})`;
const levelColor = (level: number) => `hsl(${levelColorVar(level)})`;

// Render pseudocode with parameter tooltips inline
const PseudocodeBlock = ({ code, params }: { code: string; params: string[] }) => {
  const lines = code.split("\n");
  return (
    <div className="rounded-lg border border-border bg-black/40 backdrop-blur-sm overflow-x-auto">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="text-[10px] font-mono text-muted-foreground ml-2">pseudocode</span>
      </div>
      <pre className="p-4 text-[13px] leading-relaxed font-mono text-foreground/90">
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span className="select-none w-8 text-right mr-4 text-muted-foreground/40 text-[11px]">
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
      elements.push(<span key={i} className="text-primary font-semibold">{token}</span>);
    } else if (token) {
      elements.push(<ParameterAwareText key={i} text={token} params={params} />);
    }
  });

  return (
    <span className="flex-1">
      {elements}
      {commentPart && <span className="text-muted-foreground/50 italic">{commentPart}</span>}
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
                <span className="text-accent cursor-help border-b border-dashed border-accent/40 hover:border-accent transition-colors">
                  {part}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-semibold text-xs mb-1">{info.symbol} — {info.description}</p>
                <p className="text-[10px] text-muted-foreground">{info.values}</p>
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

const DependenciesSection = ({ deps, level }: { deps: string[]; level: number }) => {
  if (deps.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="w-4 h-4" style={{ color: levelColor(level) }} />
        <h3 className="text-sm font-semibold text-foreground">🔗 Dependencias</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {deps.map((depId) => {
          const depAlg = allAlgorithms.find((a) => a.id === depId);
          if (!depAlg) return null;
          const depLevel = depAlg.level;
          return (
            <span
              key={depId}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all"
              style={{
                borderColor: `hsl(${levelColorVar(depLevel)} / 0.35)`,
                background: `hsl(${levelColorVar(depLevel)} / 0.08)`,
                color: `hsl(${levelColorVar(depLevel)})`,
              }}
            >
              <span
                className="text-[9px] font-bold px-1 py-0.5 rounded"
                style={{
                  background: `hsl(${levelColorVar(depLevel)} / 0.15)`,
                }}
              >
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
        <SheetContent className="w-full sm:max-w-lg md:max-w-xl overflow-y-auto border-l" style={{ borderColor: `hsl(${levelColorVar(level)} / 0.2)` }}>
          {detail && (
            <>
              <SheetHeader className="pb-4 border-b border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="font-mono text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{
                      background: `hsl(${levelColorVar(level)} / 0.12)`,
                      color: levelColor(level),
                    }}
                  >
                    {detail.fipsNumber}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Nivel {level} · FIPS 204
                  </span>
                </div>
                <SheetTitle className="text-xl font-bold text-foreground">
                  {algorithmName || algorithmId}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Summary */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4" style={{ color: levelColor(level) }} />
                    <h3 className="text-sm font-semibold text-foreground">Resumen Funcional</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {detail.summary}
                  </p>
                </div>

                {/* Inputs / Outputs */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowRightLeft className="w-4 h-4" style={{ color: levelColor(level) }} />
                    <h3 className="text-sm font-semibold text-foreground">Ficha Técnica</h3>
                  </div>
                  <div className="space-y-3">
                    {detail.inputs.length > 0 && (
                      <div className="rounded-lg border border-border p-3 bg-card/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Inputs</p>
                        {detail.inputs.map((inp, i) => (
                          <div key={i} className="flex items-baseline gap-2 text-sm mb-1 last:mb-0">
                            <KaTeX math={inp.name} className="text-primary" />
                            <span className="text-muted-foreground/60">—</span>
                            <span className="text-muted-foreground text-xs">{inp.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="rounded-lg border border-border p-3 bg-card/50">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Outputs</p>
                      {detail.outputs.map((out, i) => (
                        <div key={i} className="flex items-baseline gap-2 text-sm mb-1 last:mb-0">
                          <KaTeX math={out.name} className="text-primary" />
                          <span className="text-muted-foreground/60">—</span>
                          <span className="text-muted-foreground text-xs">{out.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dependencies */}
                <DependenciesSection deps={deps} level={level} />

                {/* Pseudocode */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Code2 className="w-4 h-4" style={{ color: levelColor(level) }} />
                    <h3 className="text-sm font-semibold text-foreground">Pseudocódigo</h3>
                    <span className="text-[10px] text-muted-foreground ml-auto">FIPS 204</span>
                  </div>
                  <PseudocodeBlock code={detail.pseudocode} params={detail.parameters} />
                </div>

                {/* Parameters */}
                {detail.parameters.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Link2 className="w-4 h-4" style={{ color: levelColor(level) }} />
                      <h3 className="text-sm font-semibold text-foreground">Parámetros Vinculados</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detail.parameters.map((p) => {
                        const info = parameterTooltips[p];
                        if (!info) return null;
                        return (
                          <Tooltip key={p}>
                            <TooltipTrigger asChild>
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border cursor-help text-xs font-mono transition-all hover:scale-105"
                                style={{
                                  borderColor: `hsl(${levelColorVar(level)} / 0.3)`,
                                  background: `hsl(${levelColorVar(level)} / 0.06)`,
                                  color: levelColor(level),
                                }}
                              >
                                {info.symbol}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-semibold text-xs mb-1">{info.symbol}</p>
                              <p className="text-xs text-muted-foreground">{info.description}</p>
                              <p className="text-[10px] text-muted-foreground/70 mt-1">{info.values}</p>
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
