import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Check,
  Linkedin,
  Github,
  ChevronRight,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Grainient from "@/components/ui/grainient";

interface PlanItem {
  id: string;
  tier: string;
  name: string;
  monthly: number;
  annual: number;
  description: string;
  highlighted?: boolean;
  cta: string;
  ops: number;
  features: string[];
}

const plans: PlanItem[] = [
  {
    id: "explorer",
    tier: "[ TIER 01 ]",
    name: "Strategic Assessment",
    monthly: 0,
    annual: 0,
    description:
      "Evaluación inicial de riesgos criptográficos y despliegue de pruebas de concepto.",
    cta: "Comenzar Auditoría",
    ops: 6,
    features: [
      "6 operaciones críticas mensuales",
      "Validación de firma ML-DSA-65",
      "Reporte de integridad básico",
      "Acceso a la comunidad de ingeniería",
    ],
  },
  {
    id: "pro",
    tier: "[ TIER 02 ]",
    name: "Advanced Resilience",
    monthly: 19,
    annual: 15,
    description:
      "Capacidad operativa completa para sectores regulados con alta demanda de seguridad.",
    highlighted: true,
    cta: "Escalar Infraestructura",
    ops: 100,
    features: [
      "100 operaciones de alta prioridad",
      "Bóveda de documentos blindada",
      "Integración de identidades soberanas",
      "Soporte técnico preferente",
      "SLA de disponibilidad 99.9%",
    ],
  },
  {
    id: "vanguard",
    tier: "[ TIER 03 ]",
    name: "Quantum Sovereign",
    monthly: 89,
    annual: 71,
    description:
      "Soberanía digital total. Protección de nivel gubernamental con acceso de baja latencia.",
    cta: "Obtener Soberanía",
    ops: 999999,
    features: [
      "Operaciones globales ilimitadas",
      "Acceso a API Enterprise (Rest/gRPC)",
      "Incrustación de HSM dedicado",
      "Consultoría estratégica trimestral",
      "Protocolos FIPS 204 Audit-Ready",
    ],
  },
];

const PlansPage = () => {
  const [annual, setAnnual] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const { isAuthenticated, supabaseUser } = useMockAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (supabaseUser) {
      const fetchCurrentPlan = async () => {
        const { data } = await (supabase as any)
          .from("user_usage")
          .select("plan_rank")
          .eq("user_id", supabaseUser.id)
          .maybeSingle();

        if (data) setCurrentPlan(data.plan_rank);
      };
      fetchCurrentPlan();
    }
  }, [supabaseUser]);

  const handleSelectPlan = async (
    planId: string,
    planName: string,
    ops: number
  ) => {
    if (!isAuthenticated || !supabaseUser) {
      toast({
        title: "Identidad requerida",
        description: "Debe estar autenticado para escalar su infraestructura.",
      });
      navigate("/auth?mode=login");
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("user_usage")
        .upsert({
          user_id: supabaseUser.id,
          plan_rank: planId,
          ops_remaining: ops,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setCurrentPlan(planId);
      toast({
        title: `Protocolo ${planName} activado`,
        description: "Su infraestructura ha sido actualizada con éxito.",
      });
    } catch (error: any) {
      console.error("Error updating plan:", error);
      toast({
        variant: "destructive",
        title: "Error de aprovisionamiento",
        description:
          error.message || "No se pudo actualizar el plan estratégico.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 pt-24 pb-20 relative overflow-hidden font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* ── BACKGROUND LAYER (Posicionamiento Fixed y Sin Bloqueo de Flujo) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-70">
        <Grainient
          color1="#09090b"
          color2="#18181b"
          color3="#0e7490"
          warpStrength={1.4}
          warpSpeed={2.5}
          warpFrequency={4.5}
          warpAmplitude={35.0}
          grainAmount={0.08}
          grainAnimated={true}
          timeSpeed={0.5}
          contrast={1.4}
        />
      </div>

      <div className="relative z-10 max-w-[1300px] mx-auto px-4 sm:px-6">
        {/* ── HEADER TÉCNICO Y LIMPIO ── */}
        <div className="mb-14 sm:mb-20">
          <h1 className="text-white font-bold tracking-tight text-5xl md:text-7xl mb-6">
            INFRAESTRUCTURA DE DESPLIEGUE.
          </h1>

          <p className="text-neutral-400 font-mono text-sm max-w-2xl leading-relaxed">
            Asignación de recursos y licencias para implementaciones ML-DSA.
            Seleccione el nivel de topología requerido para su entorno.
          </p>
        </div>

        {/* ── BILLING TOGGLE ── */}
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-neutral-800/80">
          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={() => setAnnual(false)}
              className={`tracking-wider uppercase transition-colors ${
                !annual ? "text-white font-bold" : "text-neutral-500 hover:text-neutral-400"
              }`}
            >
              [ MENSUAL ]
            </button>
            <Switch
              checked={annual}
              onCheckedChange={setAnnual}
              className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-neutral-800 border border-neutral-700"
            />
            <button
              onClick={() => setAnnual(true)}
              className={`tracking-wider uppercase transition-colors flex items-center gap-2 ${
                annual ? "text-cyan-400 font-bold" : "text-neutral-500 hover:text-neutral-400"
              }`}
            >
              [ ANUAL ]
              <span className="text-[10px] text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 bg-cyan-950/40 rounded-sm">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* ── TARJETAS DE PLANES (SOBRIAS, BRUTALISTAS) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const price = annual ? plan.annual : plan.monthly;
            const isCurrent = currentPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`bg-neutral-950/70 backdrop-blur-xl border rounded-lg p-8 flex flex-col relative overflow-hidden transition-all duration-300 ${
                  plan.highlighted
                    ? "border-neutral-700 shadow-xl shadow-black/40 hover:border-neutral-600"
                    : "border-neutral-800/80 hover:border-neutral-700"
                }`}
              >
                {/* Accent indicator for highlighted card */}
                {plan.highlighted && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyan-400" />
                )}

                {/* Cabecera: Etiqueta superior monoespaciada */}
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs tracking-wider text-neutral-500">
                    {plan.tier}
                  </span>
                  {plan.highlighted && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-400 border border-cyan-500/30 px-2 py-0.5 bg-cyan-950/30 rounded-sm">
                      RECOMENDADO
                    </span>
                  )}
                </div>

                {/* Título */}
                <h3 className="text-2xl text-white font-bold tracking-tight mb-3">
                  {plan.name}
                </h3>

                {/* Descripción breve */}
                <p className="text-neutral-400 text-xs font-mono leading-relaxed mb-6">
                  {plan.description}
                </p>

                {/* Precio */}
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tabular-nums text-white">
                    €{price}
                  </span>
                  <span className="font-mono text-xs text-neutral-500 uppercase">
                    / mes
                  </span>
                </div>

                {annual && plan.monthly > 0 && (
                  <span className="font-mono text-[10px] text-cyan-400/80 mt-1">
                    Facturado anualmente (€{price * 12}/año)
                  </span>
                )}

                {/* Separador */}
                <div className="border-b border-neutral-800/80 my-6" />

                {/* Features */}
                <div className="mb-8">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 block mb-4">
                    // ESPECIFICACIONES
                  </span>
                  <ul className="font-mono text-xs text-neutral-300 space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botón Principal de Acción Directo */}
                <div className="mt-auto pt-4">
                  <button
                    onClick={() =>
                      handleSelectPlan(plan.id, plan.name, plan.ops)
                    }
                    disabled={isCurrent}
                    className={`w-full rounded-sm transition-colors uppercase text-[10px] tracking-widest py-3.5 flex items-center justify-center gap-2 font-mono font-bold ${
                      isCurrent
                        ? "opacity-60 cursor-not-allowed bg-neutral-900 text-neutral-500 border border-neutral-800"
                        : plan.highlighted
                        ? "bg-white text-black hover:bg-neutral-200"
                        : "bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-200 hover:text-white"
                    }`}
                  >
                    <span>{isCurrent ? "[ IDENTIDAD ACTIVA ]" : `[ ${plan.cta.toUpperCase()} ]`}</span>
                    {!isCurrent && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── SECCIÓN "ON-PREMISE & SOBERANÍA NACIONAL" (BRUTALISTA) ── */}
        <div className="mt-28 p-8 md:p-14 border border-neutral-800/80 bg-neutral-950/70 backdrop-blur-xl rounded-lg relative overflow-hidden">
          {/* Subtle Background Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[26rem] font-mono font-black text-neutral-900/30 pointer-events-none select-none italic">
            Q
          </div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                Despliegues On-Premise & Soberanía Nacional.
              </h2>

              <p className="text-neutral-400 font-mono text-sm leading-relaxed max-w-xl">
                Para instituciones que requieren el control físico absoluto de
                sus activos criptográficos. Arquitecturas de HSM segregadas,
                auditorías de silicio y consultoría estratégica de alto nivel.
              </p>

              <div className="flex flex-wrap gap-8 pt-2">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
                    ESTÁNDAR
                  </p>
                  <p className="text-neutral-200 font-mono text-sm font-semibold">
                    ISO 27001 / FIPS 140-3
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 mb-1">
                    CUMPLIMIENTO
                  </p>
                  <p className="text-neutral-200 font-mono text-sm font-semibold">
                    NIST SP 800-204B
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8 lg:pl-12 lg:border-l border-neutral-800/80">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-3">
                  // EMAIL DE CONTACTO
                </p>
                <a
                  href="mailto:godoyjorgeb@gmail.com"
                  className="block text-xl sm:text-2xl lg:text-3xl font-mono text-white hover:text-cyan-400 transition-colors underline underline-offset-8 decoration-neutral-800 hover:decoration-cyan-400/50 break-all"
                >
                  godoyjorgeb@gmail.com
                </a>
              </div>

              <div className="flex items-center gap-4">
                <a
                  href="https://www.linkedin.com/in/jorge-godoy-beltr%C3%A1n-068622284"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-neutral-800 bg-neutral-900/80 hover:border-neutral-600 hover:text-white text-neutral-400 transition-colors flex items-center gap-2 font-mono text-xs uppercase rounded-sm"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </a>
                <a
                  href="https://github.com/jgodoyb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-neutral-800 bg-neutral-900/80 hover:border-neutral-600 hover:text-white text-neutral-400 transition-colors flex items-center gap-2 font-mono text-xs uppercase rounded-sm"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── SUB FOOTER TAGLINE ── */}
        <div className="mt-16 text-center">
          <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-neutral-600">
            Q-PROOF MATRIX INFRASTRUCTURE // v2.0-BASELINE
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
