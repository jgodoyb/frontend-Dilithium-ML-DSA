import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Check,
  Zap,
  Shield,
  Crown,
  Building2,
  Linkedin,
  Github,
  ArrowRight,
  ChevronRight,
  Globe,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const plans = [
  {
    id: "explorer",
    name: "Strategic Assessment",
    monthly: 0,
    annual: 0,
    description: "Evaluación inicial de riesgos criptográficos y despliegue de pruebas de concepto.",
    icon: Zap,
    highlighted: false,
    cta: "Comenzar Auditoría",
    ctaVariant: "outline" as const,
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
    name: "Advanced Resilience",
    monthly: 19,
    annual: 15,
    description: "Capacidad operativa completa para sectores regulados con alta demanda de seguridad.",
    icon: Cpu,
    highlighted: true,
    cta: "Escalar Infraestructura",
    ctaVariant: "default" as const,
    ops: 100,
    features: [
      "100 operaciones de alta prioridad",
      "Bóveda de documentos blindada",
      "Integración de identidades soberanas",
      "Soporte técnico preferente",
      "SLA de disponibilidad 99.9%"
    ],
  },
  {
    id: "vanguard",
    name: "Quantum Sovereign",
    monthly: 89,
    annual: 71,
    description: "Soberanía digital total. Protección de nivel gubernamental con acceso de baja latencia.",
    icon: Globe,
    highlighted: false,
    cta: "Obtener Soberanía",
    ctaVariant: "outline" as const,
    ops: 999999,
    features: [
      "Operaciones globales ilimitadas",
      "Acceso a API Enterprise (Rest/gRPC)",
      "Incrustación de HSM dedicado",
      "Consultoría estratégica trimestral",
      "Protocolos FIPS 204 Audit-Ready"
    ],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  }),
};

const PlansPage = () => {
  const [annual, setAnnual] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const { isAuthenticated, supabaseUser } = useMockAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (supabaseUser) {
      const fetchCurrentPlan = async () => {
        const { data } = await (supabase as any)
          .from('user_usage')
          .select('plan_rank')
          .eq('user_id', supabaseUser.id)
          .maybeSingle();
        
        if (data) setCurrentPlan(data.plan_rank);
      };
      fetchCurrentPlan();
    }
  }, [supabaseUser]);

  const handleSelectPlan = async (planId: string, planName: string, ops: number) => {
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
        .from('user_usage')
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
        description: error.message || "No se pudo actualizar el plan estratégico.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-20 relative overflow-hidden font-sans selection:bg-purple-500/30">
      
      {/* ── BACKGROUND GEOMETRY (Accenture Inspired) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Diagonal Slashes */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[120%] border-l border-white/5 transform skew-x-[-15deg] bg-gradient-to-r from-transparent via-purple-500/[0.03] to-transparent" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[100%] border-r border-white/5 transform skew-x-[-15deg] bg-gradient-to-l from-transparent via-cyan-500/[0.03] to-transparent" />
        
        {/* Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] opacity-20" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] opacity-10" />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* ── STRATEGIC HERO ── */}
        <div className="mb-12 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
            className="flex items-center gap-4 mb-6 sm:mb-8"
          >
            <div className="w-8 sm:w-12 h-[2px] bg-gradient-to-r from-purple-500 to-cyan-500" />
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.3em] sm:tracking-[0.4em] uppercase text-slate-400">
               Strategic Infrastructure & Licensing
            </span>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-end">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] sm:leading-[0.95] mb-6 sm:mb-8">
                Resiliencia <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-cyan-400">
                  Criptográfica.
                </span>
              </h1>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="lg:pb-4"
            >
              <p className="text-sm sm:text-base md:text-xl text-slate-400 font-light leading-relaxed max-w-xl border-l-[1px] border-white/10 pl-4 sm:pl-8">
                La supremacía cuántica no es una teoría; es una línea de tiempo competitiva. 
                Q-Proof redefine la confianza estratégica mediante implementaciones ML-DSA robustas y auditables.
              </p>
            </motion.div>
          </div>
        </div>

        {/* ── BILLING TOGGLE ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-wrap items-center gap-4 sm:gap-8 mb-10 sm:mb-16 border-b border-white/10 pb-6 sm:pb-8"
        >
          <div className="flex gap-4">
             <button 
                onClick={() => setAnnual(false)}
                className={`text-sm font-bold tracking-widest uppercase transition-colors ${!annual ? "text-purple-400" : "text-slate-500"}`}
              >
                Operational (Monthly)
              </button>
              <Switch checked={annual} onCheckedChange={setAnnual} className="data-[state=checked]:bg-purple-500" />
              <button 
                onClick={() => setAnnual(true)}
                className={`text-sm font-bold tracking-widest uppercase transition-colors relative ${annual ? "text-cyan-400" : "text-slate-500"}`}
              >
                Asset Alignment (Annual)
                {annual && <span className="absolute -top-4 -right-2 text-[9px] text-cyan-400 animate-pulse">Save 20%</span>}
              </button>
          </div>
        </motion.div>

        {/* ── PRICING GRID ── */}
        <div className="grid lg:grid-cols-3 gap-0 border border-white/10 rounded-[1px]">
          {plans.map((plan, i) => {
            const price = annual ? plan.annual : plan.monthly;
            const Icon = plan.icon;

            return (
              <motion.div
                key={plan.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className={`group relative p-10 lg:p-14 transition-all duration-700 ${
                  i < plans.length - 1 ? "border-b lg:border-b-0 lg:border-r border-white/10" : ""
                } ${plan.highlighted ? "bg-white/[0.02]" : "hover:bg-white/[0.01]"}`}
              >
                {/* Visual Accent */}
                {plan.highlighted && (
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 to-cyan-500" />
                )}

                <div className="flex flex-col h-full">
                  <div className="mb-12">
                    <div className="flex items-center justify-between mb-8">
                       <div className={`p-4 rounded-full border border-white/10 ${plan.highlighted ? "bg-purple-500/10 text-purple-400" : "text-slate-400"}`}>
                        <Icon className="w-6 h-6" />
                       </div>
                       {plan.highlighted && (
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">Tier Recommendation</span>
                       )}
                    </div>
                    <h3 className="text-3xl font-bold tracking-tight mb-4 text-white group-hover:text-purple-400 transition-colors">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-slate-400 font-light leading-relaxed max-w-[280px]">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-12">
                    <div className="flex items-baseline gap-2">
                       <span className="text-5xl font-black tracking-tighter text-white">
                         €{price}
                       </span>
                       <span className="text-xs font-bold uppercase tracking-widest text-slate-500">/ Monthly</span>
                    </div>
                    {annual && plan.monthly > 0 && (
                      <p className="text-[10px] font-mono text-cyan-500 mt-2">Billed annually at €{price * 12}</p>
                    )}
                  </div>

                  <div className="flex-1 space-y-6 mb-12">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Capabilities</p>
                    <ul className="space-y-4">
                      {plan.features.map((feature, fi) => (
                        <li key={fi} className="flex gap-4 items-start text-sm text-slate-300 font-light leading-tight">
                          <Check className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    onClick={() => handleSelectPlan(plan.id, plan.name, plan.ops)}
                    disabled={currentPlan === plan.id}
                    className={`group/btn relative w-full h-16 rounded-none font-bold uppercase tracking-[0.2em] text-[11px] transition-all duration-500 overflow-hidden ${
                      plan.highlighted 
                        ? "bg-white text-black hover:bg-purple-500 hover:text-white" 
                        : "bg-transparent border border-white/20 text-white hover:border-white/60"
                    }`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {currentPlan === plan.id ? "Identidad Activa" : plan.cta}
                      <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── ENTERPRISE SECTOR (Accenture Managing Director vibe) ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="mt-32 p-12 md:p-20 border border-white/5 bg-[#050505] relative overflow-hidden group"
        >
          {/* Subtle Background Mark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30rem] font-black text-white/[0.01] pointer-events-none select-none italic transition-all duration-1000 group-hover:text-purple-500/[0.02]">
            Q
          </div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
               <div className="inline-flex items-center gap-3 py-1 px-3 rounded-none border-l-2 border-purple-500 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                  <Building2 className="w-3 h-3" /> Dedicated Architecture
               </div>
               <h2 className="text-4xl lg:text-6xl font-bold tracking-tighter text-white leading-[1.1]">
                  Despliegues On-Premise <br /> & Soberanía Nacional.
               </h2>
               <p className="text-slate-400 font-light leading-relaxed max-w-xl text-lg">
                  Para instituciones que requieren el control físico absoluto de sus activos criptográficos. 
                  Arquitecturas de HSM segregadas, auditorías de silicio y consultoría estratégica de alto nivel.
               </p>
               <div className="flex flex-wrap gap-x-12 gap-y-6 pt-4">
                  <div>
                    <p className="text-[10px] font-black tracking-widest uppercase text-purple-400 mb-1">Standard</p>
                    <p className="text-white font-mono text-sm uppercase">ISO 27001 / FIPS 140-3</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black tracking-widest uppercase text-cyan-400 mb-1">Compliance</p>
                    <p className="text-white font-mono text-sm uppercase">NIST SP 800-204B</p>
                  </div>
               </div>
            </div>

            <div className="space-y-12 lg:pl-16 lg:border-l border-white/10">
               <div>
                 <p className="text-xs font-bold uppercase tracking-[0.4em] text-slate-500 mb-4">Contact Strategy Lead</p>
                 <a 
                   href="mailto:godoyjorgeb@gmail.com" 
                   className="block text-2xl md:text-3xl lg:text-4xl font-light text-white hover:text-purple-400 transition-colors tracking-tight underline underline-offset-[12px] decoration-white/10 hover:decoration-purple-500/50"
                 >
                   godoyjorgeb@gmail.com
                 </a>
               </div>

               <div className="flex gap-8">
                  <a href="https://www.linkedin.com/in/jorgegodoyb" className="group/link flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover/link:border-purple-500 transition-colors">
                        <Linkedin className="w-4 h-4 text-slate-500 group-hover/link:text-white" />
                     </div>
                     <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover/link:text-white transition-colors">LinkedIn</span>
                  </a>
                  <a href="https://github.com/jgodoyb" className="group/link flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover/link:border-cyan-500 transition-colors">
                        <Github className="w-4 h-4 text-slate-500 group-hover/link:text-white" />
                     </div>
                     <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover/link:text-white transition-colors">GitHub</span>
                  </a>
               </div>
            </div>
          </div>
        </motion.div>

        {/* ── SUB FOOTER TAGLINE ── */}
        <div className="mt-20 text-center">
            <p className="text-[10px] font-bold tracking-[0.8em] uppercase text-white/20">
               Q-Proof Matrix Infrastructure · v2.0-Baseline
            </p>
        </div>

      </div>
    </div>
  );
};

export default PlansPage;
