import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Key, 
  ShieldCheck, 
  Copy, 
  Building2, 
  Briefcase, 
  Activity, 
  History,
  ExternalLink,
  Shield,
  Zap,
  Crown,
  CheckCircle2,
  Clock,
  Camera,
  Loader2,
  Lock,
  ArrowRight
} from "lucide-react";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";

interface UserProfile {
  full_name: string;
  first_name?: string;
  last_name?: string;
  specialty: string;
  organization: string;
  avatar_url?: string | null;
}

interface UserUsage {
  plan_rank: string;
  ops_remaining: number;
}

interface ActivityLog {
  id: string;
  action_type: string;
  file_name: string;
  created_at: string;
}

const IdentityPanel = () => {
  const { supabaseUser } = useMockAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    if (!supabaseUser) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const uid = supabaseUser.id;

        // 1. Fetch Profile
        const { data: profData } = await (supabase as any)
          .from('profiles')
          .select('full_name, first_name, last_name, specialty, organization, avatar_url')
          .eq('id', uid)
          .maybeSingle();
        
        if (profData) setProfile(profData as UserProfile);

        // 2. Fetch Public Key
        const { data: cryptoData } = await (supabase as any)
          .from('crypto_identities')
          .select('public_key')
          .eq('user_id', uid)
          .maybeSingle();
        
        if (cryptoData) setPublicKey(cryptoData.public_key);

        // 3. Fetch Usage
        const { data: usageData } = await (supabase as any)
          .from('user_usage')
          .select('plan_rank, ops_remaining')
          .eq('user_id', uid)
          .maybeSingle();
        
        if (usageData) setUsage(usageData as UserUsage);

        // 4. Fetch Logs
        const { data: logData } = await (supabase as any)
          .from('activity_logs')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (logData) setLogs(logData as ActivityLog[]);

      } catch (error) {
        console.error("Error fetching identity data:", error);
        toast({
          variant: "destructive",
          title: "Error de carga",
          description: "No se pudo recuperar la información de identidad.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabaseUser]);

  const validateMagicBytes = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = (e) => {
        if (!e.target?.result || !(e.target.result instanceof ArrayBuffer)) {
          resolve(false);
          return;
        }
        const arr = new Uint8Array(e.target.result);
        let header = "";
        for(let i = 0; i < 4; i++) {
          header += arr[i].toString(16).toUpperCase().padStart(2, '0');
        }

        // PNG: 89504E47
        if (header === "89504E47") {
          resolve(true);
          return;
        }
        // JPEG starts with FFD8FF
        if (header.startsWith("FFD8FF")) {
          resolve(true);
          return;
        }
        
        resolve(false);
      };
      // Read first 8 bytes
      reader.readAsArrayBuffer(file.slice(0, 8));
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabaseUser) return;

    // Security check: Magic bytes validation
    const isValid = await validateMagicBytes(file);
    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Archivo no válido",
        description: "El formato del archivo es incorrecto o está manipulado. Solo se permiten PNG y JPEG reales.",
      });
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const { error } = await (supabase as any)
          .from('profiles')
          .update({ avatar_url: base64 })
          .eq('id', supabaseUser.id);

        if (error) throw error;

        setProfile(prev => prev ? ({ ...prev, avatar_url: base64 }) : null);
        
        // Sync with global context for Navbar
        (useMockAuth as any)().updateUser({ avatarUrl: base64 });

        toast({
          title: "¡Perfil actualizado!",
          description: "Tu foto de perfil se ha guardado correctamente.",
        });
      };
    } catch (err) {
      console.error("Error uploading avatar:", err);
      toast({
        variant: "destructive",
        title: "Error al subir",
        description: "No se pudo guardar la imagen.",
      });
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado al portapapeles",
      description: "Clave pública copiada correctamente.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Activity className="w-8 h-8 animate-pulse text-primary/40" />
          <p className="text-sm font-mono tracking-widest uppercase opacity-50">Sincronizando Identidad...</p>
        </div>
      </div>
    );
  }

  const getRankBadge = (rank: string) => {
    switch (rank?.toLowerCase()) {
      case 'vanguard': 
        return (
          <div className="flex items-center gap-2 bg-[#0e7490] text-white text-[10px] font-black tracking-[0.2em] px-4 py-1.5 rounded-full uppercase shadow-[0_0_20px_rgba(14,116,144,0.4)] border border-cyan-400/30">
            <Crown className="w-3 h-3" /> Vanguard
          </div>
        );
      case 'pro': 
        return (
          <div className="flex items-center gap-2 bg-white/10 text-white text-[10px] font-black tracking-[0.2em] px-4 py-1.5 rounded-full uppercase border border-white/20">
            <Zap className="w-3 h-3 text-amber-500" /> Pro
          </div>
        );
      default: 
        return (
          <div className="flex items-center gap-2 bg-white/5 text-slate-400 text-[10px] font-black tracking-[0.2em] px-4 py-1.5 rounded-full uppercase border border-white/10">
            <Shield className="w-3 h-3" /> Explorer
          </div>
        );
    }
  };

  const getOpsText = () => {
    if (usage?.plan_rank === 'vanguard') return "Unlimited";
    const total = usage?.plan_rank === 'pro' ? 100 : 6;
    return `${usage?.ops_remaining ?? 0} / ${total}`;
  };

  const nameInitial = profile?.full_name?.charAt(0) || supabaseUser?.email?.charAt(0) || "U";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-black text-white pt-20 pb-16 px-4 sm:px-6 relative overflow-hidden">
      {/* Background Elements */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 bg-cover bg-center z-0" 
        style={{ backgroundImage: 'url("/tech-bg.png")' }} 
      />
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-black/60 via-black to-black"></div>

      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        
        {/* --- Header / Hero --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative group rounded-[2.5rem] overflow-hidden border border-white/10 bg-[#050505] shadow-2xl"
        >
          {/* Premium Glass Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-[#0e7490]/10 opacity-100" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />

          <div className="relative flex flex-col md:flex-row items-center gap-10 p-10 lg:p-14 z-10">
            {/* Profile Avatar Section */}
            <div className="relative group shrink-0">
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                accept="image/png,image/jpeg"
                onChange={handleAvatarChange}
              />
              <div 
                className={`w-32 h-32 rounded-[2rem] bg-black border-2 flex items-center justify-center text-4xl font-bold text-[#0e7490] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative cursor-pointer transition-all duration-500 scale-100 group-hover:scale-105 ${uploading ? "border-cyan-500" : "border-white/10 group-hover:border-[#0e7490]/50"}`}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={`Fotografía de perfil del usuario ${profile.full_name || 'Q-Proof Systems'}`} className="w-full h-full object-cover" />
                ) : (
                  nameInitial.toUpperCase()
                )}
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 text-white" />
                  )}
                </div>
              </div>
            </div>
            
            {/* User Info Section */}
            <div className="text-center md:text-left space-y-4 flex-1">
              <div className="space-y-1">
                <div className="flex items-center justify-center md:justify-start gap-4 flex-wrap">
                  <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-none">
                    {profile?.first_name || profile?.last_name 
                      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
                      : (profile?.full_name || "Usuario Dilithium")}
                  </h1>
                  <div className="translate-y-0.5">
                    {getRankBadge(usage?.plan_rank || 'explorer')}
                  </div>
                </div>
                <p className="text-[#0e7490] font-mono text-xs tracking-[0.3em] uppercase opacity-70">{supabaseUser?.email}</p>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] bg-white/[0.03] px-5 py-2.5 rounded-full border border-white/5 backdrop-blur-md hover:bg-white/5 transition-colors">
                  <Briefcase className="w-3 h-3 text-[#0e7490]" />
                  {profile?.specialty || "Generalist Intern"}
                </div>
                <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] bg-white/[0.03] px-5 py-2.5 rounded-full border border-white/5 backdrop-blur-md hover:bg-white/5 transition-colors">
                  <Building2 className="w-3 h-3 text-[#0e7490]" />
                  {profile?.organization || "Independent Entity"}
                </div>
              </div>
            </div>

            {/* Dynamic Identity Chip (Visual Asset) */}
            <motion.div 
               initial={{ opacity: 0, scale: 0.8, x: 20 }}
               animate={{ 
                 opacity: 1, 
                 scale: 1, 
                 x: 0,
                 y: [0, -10, 0]
               }}
               transition={{ 
                 opacity: { duration: 0.8 },
                 y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
               }}
               className="hidden lg:block relative shrink-0"
            >
               <div className="w-48 h-32 rounded-3xl overflow-hidden border border-white/10 bg-black relative group/chip shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                  <img 
                    src="/identity-header.png" 
                    alt="Representación gráfica del token de identidad digital y nodo de cifrado post-cuántico"
                    className="w-full h-full object-cover opacity-60 mix-blend-screen grayscale hover:grayscale-0 transition-all duration-700"
                  />
                  <div className="absolute top-3 left-4 z-20">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="absolute bottom-3 left-4 z-20 space-y-1">
                     <p className="text-[8px] font-black tracking-widest text-[#0e7490] uppercase">Identity Check</p>
                     <p className="text-[10px] font-mono text-white/50">SEC-NODE-402</p>
                  </div>
                  <div className="absolute inset-0 border-[0.5px] border-white/5 rounded-3xl m-1 pointer-events-none" />
               </div>
               
               {/* Decorative elements around chip */}
               <div className="absolute -top-4 -right-4 w-12 h-12 border-t border-r border-[#0e7490]/30 rounded-tr-2xl" />
               <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b border-l border-white/10 rounded-bl-2xl" />
            </motion.div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- Main Identity Card (Security) --- */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-white/10 bg-[#050505] rounded-[2rem] overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-white/5 pb-6 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-[#0e7490]/10 border border-[#0e7490]/20">
                      <Key className="w-5 h-5 text-[#0e7490]" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-white">Identidad Criptográfica</CardTitle>
                      <CardDescription className="text-slate-500 font-light mt-1 text-xs uppercase tracking-widest">Estándar ML-DSA-65 (FIPS 204)</CardDescription>
                    </div>
                  </div>
                  {publicKey && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(publicKey)} 
                      className="text-[10px] gap-2 font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 rounded-full px-4"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-6">
                {publicKey ? (
                  <div className="group relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#0e7490]/20 to-cyan-500/10 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000" />
                    <div className="relative bg-black/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 overflow-hidden group-hover:border-[#0e7490]/30 transition-all duration-500">
                      <div className="max-h-32 overflow-y-auto pr-4 custom-scrollbar">
                        <p className="font-mono text-[11px] break-all text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed tracking-wider">
                          {publicKey}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-[10px] font-bold text-[#0e7490] bg-[#0e7490]/10 px-3 py-1 rounded-full uppercase tracking-tighter">
                            <CheckCircle2 className="w-3 h-3" /> Clave Activa
                         </div>
                         <span className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.2em] opacity-40">Hardware Bound: False</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-6 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                    <div className="space-y-2">
                       <p className="text-lg font-light text-slate-400">Entorno Criogénico Sin Claves</p>
                       <p className="text-xs text-slate-600 font-mono">No has generado tus identidades post-cuánticas todavía.</p>
                    </div>
                    <Button variant="outline" className="gap-2 rounded-full border-white/10 hover:border-[#0e7490]/50 hover:bg-[#0e7490]/5" onClick={() => navigate('/#generacion')}>
                      <ShieldCheck className="w-4 h-4 text-[#0e7490]" /> Generar Bóveda de Claves
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#050505] rounded-[2rem] overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-white/5 pb-6 p-8">
                <div className="flex items-center gap-4">
                   <div className="p-2.5 rounded-xl bg-[#0e7490]/10 border border-[#0e7490]/20">
                      <History className="w-5 h-5 text-[#0e7490]" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-white">Bitácora de Operaciones</CardTitle>
                      <CardDescription className="text-slate-500 font-light mt-1 text-xs uppercase tracking-widest">Últimas 5 transacciones de firma</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 relative">
                {usage?.plan_rank === 'explorer' ? (
                  <div className="p-16 flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden">
                    {/* Background Visual for Lock */}
                    <div className="absolute inset-0 bg-[#0e7490]/5 mix-blend-overlay opacity-30" />
                    
                    <div className="relative z-10 space-y-6 max-w-sm">
                      <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mx-auto shadow-2xl backdrop-blur-xl">
                        <Lock className="w-8 h-8 opacity-40" />
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-xl font-bold text-white tracking-tight">Historial Protegido</h4>
                        <p className="text-sm text-slate-400 leading-relaxed font-light">
                          El acceso a la bitácora de auditoría requiere una licencia <span className="text-[#0e7490] font-bold">Pro</span> o superior.
                        </p>
                      </div>
                      <Button 
                        variant="default" 
                        size="lg" 
                        onClick={() => navigate('/dashboard/plans')}
                        className="w-full bg-[#0e7490] hover:bg-cyan-500 text-white gap-3 rounded-2xl shadow-[0_10px_30px_rgba(14,116,144,0.3)] border-none"
                      >
                        <Zap className="w-4 h-4 fill-current" />
                        Elevar Privilegios
                      </Button>
                    </div>
                    
                    {/* Blurred items in background */}
                    <div className="absolute inset-0 -z-10 opacity-10 blur-[8px] pointer-events-none select-none overflow-hidden px-10 pt-10">
                      <div className="space-y-6">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white/10" />
                              <div className="space-y-2">
                                <div className="h-4 w-32 bg-white/10 rounded-full" />
                                <div className="h-3 w-48 bg-white/5 rounded-full" />
                              </div>
                            </div>
                            <div className="h-3 w-16 bg-white/5 rounded-full" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {logs.length > 0 ? (
                        <div className="divide-y divide-white/5">
                          {logs.map((log) => (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              key={log.id} 
                              className="px-8 py-6 flex items-center justify-between group hover:bg-[#0e7490]/5 transition-colors"
                            >
                              <div className="flex items-center gap-5">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${log.action_type === 'sign' ? 'bg-[#0e7490]/20 border-[#0e7490]/30 text-[#0e7490]' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                                  <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-white uppercase tracking-wider">{log.action_type === 'sign' ? 'Firma Digital' : 'Verificación'}</p>
                                  <p className="text-xs text-slate-500 font-mono truncate max-w-[200px] sm:max-w-sm group-hover:text-slate-300 transition-colors uppercase">{log.file_name}</p>
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                 <div className="flex items-center justify-end gap-2 text-[10px] font-mono text-slate-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                   <Clock className="w-3 h-3 text-[#0e7490]" />
                                   {new Date(log.created_at).toLocaleDateString()} — {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                    ) : (
                      <div className="py-20 text-center border-2 border-dashed border-white/5 m-8 rounded-2xl bg-white/[0.01]">
                        <p className="text-sm italic text-slate-500 font-light tracking-wide">Protocolo de auditoría vacío. Realice su primera firma para iniciar el log.</p>
                      </div>
                    )}
                  </AnimatePresence>
                )}
              </CardContent>
            </Card>
          </div>

          {/* --- Sidebar (Usage) --- */}
          <div className="space-y-8">
            <Card className="border-[#0e7490]/30 bg-[#0e7490]/5 rounded-[2rem] overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                 <Activity className="w-12 h-12 text-[#0e7490]" />
              </div>

              <CardHeader className="pb-4 p-8">
                <CardTitle className="text-[10px] font-black tracking-[0.3em] uppercase text-[#0e7490]">Recursos — {usage?.plan_rank || 'Explorer'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 p-8 pt-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Consumo de Operaciones</span>
                    <span className="text-lg font-black text-white">{getOpsText()}</span>
                  </div>
                  {usage?.plan_rank !== 'vanguard' && (
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${((usage?.ops_remaining || 0) / (usage?.plan_rank === 'pro' ? 100 : 6)) * 100}%` }}
                         transition={{ duration: 1, ease: "easeOut" }}
                         className="h-full bg-[#0e7490] shadow-[0_0_10px_rgba(14,116,144,0.5)]"
                       />
                    </div>
                  )}
                </div>
                
                <div className="pt-6 border-t border-white/5">
                   <p className="text-[10px] text-slate-500 leading-relaxed italic font-light">
                     * Ciclo de renovación: Mensual. Próximo reset automático en el día 1 del mes.
                   </p>
                </div>
                
                <Button 
                  variant="default" 
                  className="w-full h-12 bg-white text-black hover:bg-slate-200 font-black tracking-widest uppercase text-[10px] rounded-xl shadow-xl transition-all" 
                  onClick={() => navigate('/dashboard/plans')}
                >
                   Optimizar Licencia
                </Button>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#050505] rounded-[2rem] p-8 space-y-6 shadow-2xl">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Centro de Asistencia</h3>
               <div className="space-y-4">
                  {[
                    { label: "Knowledge Base (FAQ)", path: '/faq' },
                    { label: "Governance & Terms", path: '/terms' },
                    { label: "Privacy Framework", path: '/privacy' }
                  ].map((link) => (
                    <a 
                      key={link.label}
                      onClick={() => link.path.startsWith('/') ? navigate(link.path) : window.open(link.path)} 
                      className="flex items-center justify-between group p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer"
                    >
                      <span className="text-xs text-slate-400 group-hover:text-white font-medium transition-colors">{link.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-[#0e7490] group-hover:translate-x-1 transition-all" />
                    </a>
                  ))}
               </div>
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
};

export default IdentityPanel;
