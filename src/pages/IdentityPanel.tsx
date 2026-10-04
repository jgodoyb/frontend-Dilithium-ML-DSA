import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Key, 
  ShieldCheck, 
  Copy, 
  Building2, 
  Briefcase, 
  Activity, 
  History, 
  Shield, 
  Zap, 
  Crown, 
  CheckCircle2, 
  Clock, 
  Camera, 
  Loader2, 
  Lock, 
  ArrowRight, 
  Trash2, 
  AlertTriangle,
  KeyRound,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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

function IdentityPanelContent() {
  const { supabaseUser, logout, isLoading: authLoading, updateUser } = useMockAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Claves Post-Cuánticas (Dilithium ML-DSA + Kyber ML-KEM)
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [kemPublicKey, setKemPublicKey] = useState<string | null>(null);
  const [kemSecurityLevel, setKemSecurityLevel] = useState<number | null>(null);

  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Estados para Eliminación de Cuenta (Zona de Peligro)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Carga de datos de la identidad
  const fetchData = async () => {
    if (!supabaseUser?.id) return;
    setLoading(true);
    try {
      const uid = supabaseUser.id;

      // 1. Fetch Profile
      const { data: profData, error: profErr } = await (supabase as any)
        .from("profiles")
        .select("full_name, first_name, last_name, specialty, organization, avatar_url")
        .eq("id", uid)
        .maybeSingle();
      
      if (!profErr && profData) {
        setProfile(profData as UserProfile);
      }

      // 2. Fetch Crypto Identities (ML-DSA + ML-KEM)
      const { data: cryptoData, error: cryptoErr } = await (supabase as any)
        .from("crypto_identities")
        .select("public_key, kem_public_key, kem_security_level")
        .eq("user_id", uid)
        .maybeSingle();
      
      if (!cryptoErr && cryptoData) {
        setPublicKey(cryptoData.public_key || null);
        setKemPublicKey(cryptoData.kem_public_key || null);
        setKemSecurityLevel(cryptoData.kem_security_level || 768);
      }

      // 3. Fetch Usage
      const { data: usageData, error: usageErr } = await (supabase as any)
        .from("user_usage")
        .select("plan_rank, ops_remaining")
        .eq("user_id", uid)
        .maybeSingle();
      
      if (!usageErr && usageData) {
        setUsage(usageData as UserUsage);
      }

      // 4. Fetch Logs
      const { data: logData, error: logErr } = await (supabase as any)
        .from("activity_logs")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (!logErr && logData) {
        setLogs(logData as ActivityLog[]);
      }

    } catch (error) {
      console.error("Error fetching identity data:", error);
      toast({
        variant: "destructive",
        title: "Error de sincronización",
        description: "No se pudieron cargar todos los parámetros de tu identidad.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!supabaseUser) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [supabaseUser?.id, authLoading]);

  // Manejo de eliminación permanente de cuenta
  const handleDeleteAccount = async () => {
    if (!supabaseUser) return;
    setIsDeletingAccount(true);
    try {
      const uid = supabaseUser.id;
      await Promise.allSettled([
        (supabase as any).from("activity_logs").delete().eq("user_id", uid),
        (supabase as any).from("pending_documents").delete().or(`sender_id.eq.${uid},recipient_id.eq.${uid}`),
        (supabase as any).from("user_contacts").delete().or(`user_a.eq.${uid},user_b.eq.${uid}`),
        (supabase as any).from("connection_codes").delete().eq("creator_id", uid),
        (supabase as any).from("crypto_identities").delete().eq("user_id", uid),
        (supabase as any).from("user_usage").delete().eq("user_id", uid),
        (supabase as any).from("profiles").delete().eq("id", uid),
      ]);

      toast({
        title: "Cuenta eliminada",
        description: "Tu cuenta e identidades post-cuánticas han sido eliminadas exitosamente.",
      });

      await logout();
      navigate("/");
    } catch (err) {
      console.error("Error al eliminar cuenta:", err);
      toast({
        variant: "destructive",
        title: "Error al eliminar cuenta",
        description: "No se pudieron purgar todos los registros asociados.",
      });
    } finally {
      setIsDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  };

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
        for (let i = 0; i < 4; i++) {
          header += arr[i].toString(16).toUpperCase().padStart(2, "0");
        }
        if (header === "89504E47" || header.startsWith("FFD8FF")) {
          resolve(true);
          return;
        }
        resolve(false);
      };
      reader.readAsArrayBuffer(file.slice(0, 8));
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabaseUser) return;

    const isValid = await validateMagicBytes(file);
    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Archivo no válido",
        description: "Solo se permiten imágenes reales PNG o JPEG.",
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
          .from("profiles")
          .update({ avatar_url: base64 })
          .eq("id", supabaseUser.id);

        if (error) throw error;

        setProfile((prev) => (prev ? { ...prev, avatar_url: base64 } : null));
        updateUser({ avatarUrl: base64 });

        toast({
          title: "¡Perfil actualizado!",
          description: "Tu foto de perfil se ha guardado correctamente.",
        });
      };
    } catch (err) {
      console.error("Error uploading avatar:", err);
      toast({
        variant: "destructive",
        title: "Error al subir imagen",
        description: "No se pudo actualizar el avatar.",
      });
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string, label = "Clave pública") => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado al portapapeles",
      description: `${label} copiada correctamente.`,
    });
  };

  // Guardas de Carga y Autenticación
  if (authLoading || (loading && !supabaseUser)) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-cyan-400">
          <Activity className="w-8 h-8 animate-spin text-[#0e7490]" />
          <p className="text-xs font-mono tracking-widest uppercase text-slate-400">Autenticando Identidad...</p>
        </div>
      </div>
    );
  }

  if (!supabaseUser) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-black p-6">
        <div className="text-center space-y-4 max-w-sm p-8 rounded-2xl bg-white/[0.02] border border-white/10">
          <AlertCircle className="w-10 h-10 text-cyan-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Sesión no detectada</h2>
          <p className="text-xs text-slate-400">Inicia sesión para acceder a tu identidad post-cuántica.</p>
          <Button onClick={() => navigate("/auth?mode=login")} className="w-full bg-[#0e7490] hover:bg-cyan-500 text-white text-xs">
            Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#0e7490]" />
          <p className="text-xs font-mono tracking-widest uppercase text-slate-400">Sincronizando Bóveda Criptográfica...</p>
        </div>
      </div>
    );
  }

  const getRankBadge = (rank?: string) => {
    switch (rank?.toLowerCase()) {
      case "vanguard": 
        return (
          <div className="flex items-center gap-2 bg-[#0e7490] text-white text-[10px] font-black tracking-[0.2em] px-4 py-1.5 rounded-full uppercase shadow-[0_0_20px_rgba(14,116,144,0.4)] border border-cyan-400/30">
            <Crown className="w-3 h-3" /> Vanguard
          </div>
        );
      case "pro": 
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
    if (usage?.plan_rank === "vanguard") return "Ilimitadas";
    const total = usage?.plan_rank === "pro" ? 100 : 6;
    return `${usage?.ops_remaining ?? 0} / ${total}`;
  };

  const nameInitial = profile?.full_name?.charAt(0) || supabaseUser?.email?.charAt(0) || "U";

  const safeFormatDate = (dateStr?: string) => {
    if (!dateStr) return "--/--/----";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? "--/--/----" : d.toLocaleDateString();
    } catch {
      return "--/--/----";
    }
  };

  const safeFormatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

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
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-[#0e7490]/10 opacity-100" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />

          <div className="relative flex flex-col md:flex-row items-center gap-10 p-10 lg:p-14 z-10">
            {/* Avatar */}
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
                  <img src={profile.avatar_url} alt="Fotografía de perfil" className="w-full h-full object-cover" />
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
            
            {/* User Info */}
            <div className="text-center md:text-left space-y-4 flex-1">
              <div className="space-y-1">
                <div className="flex items-center justify-center md:justify-start gap-4 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-none">
                    {profile?.first_name || profile?.last_name 
                      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
                      : (profile?.full_name || "Usuario Dilithium")}
                  </h1>
                  <div className="translate-y-0.5">
                    {getRankBadge(usage?.plan_rank || "explorer")}
                  </div>
                </div>
                <p className="text-[#0e7490] font-mono text-xs tracking-[0.3em] uppercase opacity-70">{supabaseUser?.email}</p>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] bg-white/[0.03] px-5 py-2.5 rounded-full border border-white/5 backdrop-blur-md hover:bg-white/5 transition-colors">
                  <Briefcase className="w-3 h-3 text-[#0e7490]" />
                  {profile?.specialty || "Operador Criptográfico"}
                </div>
                <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] bg-white/[0.03] px-5 py-2.5 rounded-full border border-white/5 backdrop-blur-md hover:bg-white/5 transition-colors">
                  <Building2 className="w-3 h-3 text-[#0e7490]" />
                  {profile?.organization || "Entidad Independiente"}
                </div>
              </div>
            </div>

            {/* Chip Decorativo */}
            <motion.div 
               initial={{ opacity: 0, scale: 0.8, x: 20 }}
               animate={{ opacity: 1, scale: 1, x: 0, y: [0, -10, 0] }}
               transition={{ opacity: { duration: 0.8 }, y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
               className="hidden lg:block relative shrink-0"
            >
               <div className="w-48 h-32 rounded-3xl overflow-hidden border border-white/10 bg-black relative shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                  <img 
                    src="/identity-header.png" 
                    alt="Token de identidad"
                    className="w-full h-full object-cover opacity-60 mix-blend-screen"
                  />
                  <div className="absolute top-3 left-4 z-20">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="absolute bottom-3 left-4 z-20 space-y-1">
                     <p className="text-[8px] font-black tracking-widest text-[#0e7490] uppercase">Identity Active</p>
                     <p className="text-[10px] font-mono text-white/50">SEC-NODE-FIPS</p>
                  </div>
               </div>
            </motion.div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Principal: Identidad Criptográfica Doble */}
          <div className="lg:col-span-2 space-y-8">
            {/* Clave de Firma (Dilithium ML-DSA-65) */}
            <Card className="border-white/10 bg-[#050505] rounded-[2rem] overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-white/5 pb-6 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-[#0e7490]/10 border border-[#0e7490]/20">
                      <Key className="w-5 h-5 text-[#0e7490]" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                        Clave Pública de Firma
                        <Badge className="bg-cyan-950/40 text-cyan-400 border-cyan-500/30 text-[9px] font-mono">
                          ML-DSA-65
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-slate-500 font-light mt-1 text-xs uppercase tracking-widest">
                        Firma Digital Post-Cuántica (FIPS 204)
                      </CardDescription>
                    </div>
                  </div>
                  {publicKey && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(publicKey, "Clave ML-DSA")} 
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
                      <div className="max-h-28 overflow-y-auto pr-4 custom-scrollbar">
                        <p className="font-mono text-[11px] break-all text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed tracking-wider">
                          {publicKey}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full uppercase tracking-tighter border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Clave Activa en Bóveda
                         </div>
                         <span className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.2em]">Tier 3 Dilithium</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 space-y-4 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                    <p className="text-sm text-slate-400">Sin clave de firma generada todavía.</p>
                    <Button variant="outline" className="gap-2 text-xs border-cyan-500/30 text-cyan-300" onClick={fetchData}>
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerar Claves
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Clave de Cifrado (Kyber ML-KEM-768) */}
            <Card className="border-white/10 bg-[#050505] rounded-[2rem] overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-white/5 pb-6 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
                      <KeyRound className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                        Clave Pública de Cifrado
                        <Badge className="bg-cyan-950/40 text-cyan-400 border-cyan-500/30 text-[9px] font-mono">
                          ML-KEM-{kemSecurityLevel || 768}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-slate-500 font-light mt-1 text-xs uppercase tracking-widest">
                        Mecanismo de Encapsulación de Clave (FIPS 203)
                      </CardDescription>
                    </div>
                  </div>
                  {kemPublicKey && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(kemPublicKey, "Clave ML-KEM")} 
                      className="text-[10px] gap-2 font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 rounded-full px-4"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-6">
                {kemPublicKey ? (
                  <div className="group relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-[#0e7490]/10 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000" />
                    <div className="relative bg-black/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 overflow-hidden group-hover:border-cyan-500/30 transition-all duration-500">
                      <div className="max-h-28 overflow-y-auto pr-4 custom-scrollbar">
                        <p className="font-mono text-[11px] break-all text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed tracking-wider">
                          {kemPublicKey}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-[10px] font-bold text-cyan-400 bg-cyan-950/40 px-3 py-1 rounded-full uppercase tracking-tighter border border-cyan-500/30">
                            <CheckCircle2 className="w-3 h-3 text-cyan-400" /> KEM Activo para Transferencias
                         </div>
                         <span className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.2em]">Kyber Lattice Module</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 space-y-4 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                    <p className="text-sm text-slate-400">Sin clave de encapsulación KEM detectada.</p>
                    <Button variant="outline" className="gap-2 text-xs border-cyan-500/30 text-cyan-300" onClick={fetchData}>
                      <RefreshCw className="w-3.5 h-3.5" /> Sincronizar Bóveda
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bitácora de Operaciones */}
            <Card className="border-white/10 bg-[#050505] rounded-[2rem] overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-white/5 pb-6 p-8">
                <div className="flex items-center gap-4">
                   <div className="p-2.5 rounded-xl bg-[#0e7490]/10 border border-[#0e7490]/20">
                      <History className="w-5 h-5 text-[#0e7490]" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-white">Bitácora de Operaciones</CardTitle>
                      <CardDescription className="text-slate-500 font-light mt-1 text-xs uppercase tracking-widest">Últimas transacciones registradas</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 relative">
                {logs.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        className="px-8 py-5 flex items-center justify-between group hover:bg-[#0e7490]/5 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${log.action_type === 'sign' ? 'bg-[#0e7490]/20 border-[#0e7490]/30 text-[#0e7490]' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-white uppercase tracking-wider">{log.action_type === 'sign' ? 'Firma Digital' : 'Verificación'}</p>
                            <p className="text-[11px] text-slate-500 font-mono truncate max-w-[200px] sm:max-w-sm group-hover:text-slate-300 transition-colors uppercase">{log.file_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                           <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono text-slate-500 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                             <Clock className="w-3 h-3 text-[#0e7490]" />
                             <span>{safeFormatDate(log.created_at)}</span>
                             {safeFormatTime(log.created_at) && <span>— {safeFormatTime(log.created_at)}</span>}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center border-2 border-dashed border-white/5 m-8 rounded-2xl bg-white/[0.01]">
                    <p className="text-xs text-slate-500 font-light">Protocolo de auditoría vacío. Las firmas aplicadas quedarán registradas aquí.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <Card className="border-[#0e7490]/30 bg-[#0e7490]/5 rounded-[2rem] overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                 <Activity className="w-12 h-12 text-[#0e7490]" />
              </div>

              <CardHeader className="pb-4 p-8">
                <CardTitle className="text-[10px] font-black tracking-[0.3em] uppercase text-[#0e7490]">Recursos — {usage?.plan_rank || "Explorer"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 p-8 pt-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Consumo de Operaciones</span>
                    <span className="text-lg font-black text-white">{getOpsText()}</span>
                  </div>
                  {usage?.plan_rank !== "vanguard" && (
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${((usage?.ops_remaining || 0) / (usage?.plan_rank === "pro" ? 100 : 6)) * 100}%` }}
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
                  onClick={() => navigate("/dashboard/plans")}
                >
                   Optimizar Licencia
                </Button>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#050505] rounded-[2rem] p-8 space-y-6 shadow-2xl">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Centro de Asistencia</h3>
               <div className="space-y-4">
                  {[
                    { label: "Transferencias & Enlace Seguro", path: "/dashboard/transfers" },
                    { label: "Knowledge Base (FAQ)", path: "/faq" },
                    { label: "Governance & Terms", path: "/terms" },
                    { label: "Privacy Framework", path: "/privacy" },
                  ].map((link) => (
                    <a 
                      key={link.label}
                      onClick={() => link.path.startsWith("/") ? navigate(link.path) : window.open(link.path)} 
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

        {/* --- Zona de Peligro (Eliminar Cuenta) --- */}
        <div className="pt-6">
          <Card className="border-red-500/30 bg-red-950/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <AlertTriangle className="w-24 h-24 text-red-500" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Zona de Peligro</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">Eliminar Cuenta de Usuario</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Esta acción es irreversible y definitiva. Se purgarán todas tus identidades criptográficas
                  post-cuánticas (claves privadas y públicas ML-DSA y ML-KEM), historial de documentos cifrados,
                  contactos seguros y registros de actividad.
                </p>
              </div>

              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="h-11 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-red-600/80 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] gap-2 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar Cuenta</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#0b0c10] border-red-500/30 text-white max-w-md sm:rounded-2xl">
                  <AlertDialogHeader className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto sm:mx-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <AlertDialogTitle className="text-lg font-bold text-white">
                      ¿Confirmas la eliminación permanente de tu cuenta?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-slate-400 leading-relaxed">
                      Se destruirán de forma inmediata e irreversible tus claves privadas y públicas Dilithium y Kyber,
                      impidiendo cualquier descifrado o firma futuro asociado a esta identidad.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-4 gap-2">
                    <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 text-xs rounded-xl">
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl gap-2 shadow-lg"
                    >
                      {isDeletingAccount ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Eliminando datos...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Sí, eliminar permanentemente</span>
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}

export default function IdentityPanel() {
  return (
    <ErrorBoundary fallbackTitle="Error al cargar Mi Identidad">
      <IdentityPanelContent />
    </ErrorBoundary>
  );
}
