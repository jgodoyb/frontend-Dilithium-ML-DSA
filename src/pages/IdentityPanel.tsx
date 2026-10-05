import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Key,
  ShieldCheck,
  Copy,
  Activity,
  CheckCircle2,
  Camera,
  Loader2,
  Trash2,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  Users,
  UserCheck,
  Check,
  RotateCw,
  ArrowRight,
} from "lucide-react";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Grainient from "@/components/ui/grainient";
import WarpText from "@/components/ui/warp_text";
import {
  getUserContacts,
  generateConnectionCode,
  redeemConnectionCode,
  ContactIdentity,
  ConnectionCodeResult,
} from "@/services/contactService";

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

const DEFAULT_VERIFIED_CONTACTS: ContactIdentity[] = [
  {
    user_id: "pqc-peer-1",
    email: "e.vasquez@quantum-net.io",
    full_name: "Dra. Elena Vásquez",
    kem_public_key: "KEM768-ACTV-01",
  },
  {
    user_id: "pqc-peer-2",
    email: "m.thorne@cipher-lab.org",
    full_name: "Dr. Marcus Thorne",
    kem_public_key: "KEM768-ACTV-02",
  },
  {
    user_id: "pqc-peer-3",
    email: "s.lin@cyber-defense.eu",
    full_name: "Dra. Sarah Lin",
    kem_public_key: "KEM768-ACTV-03",
  },
  {
    user_id: "pqc-peer-4",
    email: "d.kowalski@pqc-vault.ch",
    full_name: "David Kowalski",
    kem_public_key: "KEM768-ACTV-04",
  },
  {
    user_id: "pqc-peer-5",
    email: "a.rivera@dilithium-node.net",
    full_name: "Alex Rivera",
    kem_public_key: "KEM768-ACTV-05",
  },
];

function IdentityPanelContent() {
  const { supabaseUser, logout, isLoading: authLoading, updateUser } = useMockAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Post-Quantum Keys (Dilithium ML-DSA + Kyber ML-KEM)
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [kemPublicKey, setKemPublicKey] = useState<string | null>(null);
  const [kemSecurityLevel, setKemSecurityLevel] = useState<number | null>(null);

  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [contacts, setContacts] = useState<ContactIdentity[]>([]);

  // OTP Connection codes state
  const [myCode, setMyCode] = useState<ConnectionCodeResult | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  // Modal dialog states
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [contactsModalOpen, setContactsModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [isReloadingContacts, setIsReloadingContacts] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch identity data
  const fetchData = async () => {
    if (!supabaseUser?.id) return;
    setLoading(true);
    try {
      const uid = supabaseUser.id;

      // 1. Profile
      const { data: profData, error: profErr } = await (supabase as any)
        .from("profiles")
        .select("full_name, first_name, last_name, specialty, organization, avatar_url")
        .eq("id", uid)
        .maybeSingle();

      if (!profErr && profData) {
        setProfile(profData as UserProfile);
      }

      // 2. Crypto Identities (ML-DSA + ML-KEM)
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

      // 3. Usage
      const { data: usageData, error: usageErr } = await (supabase as any)
        .from("user_usage")
        .select("plan_rank, ops_remaining")
        .eq("user_id", uid)
        .maybeSingle();

      if (!usageErr && usageData) {
        setUsage(usageData as UserUsage);
      }

      // 4. Activity Logs
      const { data: logData, error: logErr } = await (supabase as any)
        .from("activity_logs")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!logErr && logData) {
        setLogs(logData as ActivityLog[]);
      }

      // 5. Contacts (Top 5)
      try {
        const userContacts = await getUserContacts(uid);
        if (userContacts && userContacts.length > 0) {
          setContacts(userContacts);
        } else {
          setContacts(DEFAULT_VERIFIED_CONTACTS);
        }
      } catch (cErr) {
        console.warn("Advertencia al cargar contactos:", cErr);
        setContacts(DEFAULT_VERIFIED_CONTACTS);
      }

    } catch (error) {
      console.error("Error fetching identity data:", error);
      toast({
        variant: "destructive",
        title: "Error de sincronización",
        description: "No se pudieron cargar todos los datos de tu identidad.",
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

  // Temporizador de expiración para Mi Código
  useEffect(() => {
    if (!myCode?.expires_at) {
      setTimeLeft(null);
      return;
    }

    const calculateRemaining = () => {
      const diffMs = new Date(myCode.expires_at).getTime() - Date.now();
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      setTimeLeft(diffSecs);
      if (diffSecs <= 0) {
        setMyCode(null);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [myCode]);

  const formatTimeLeft = (seconds: number | null): string => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleGenerateCode = async () => {
    if (!supabaseUser?.id) return;
    setGeneratingCode(true);
    try {
      const result = await generateConnectionCode(supabaseUser.id);
      setMyCode(result);
      setCodeCopied(false);
      toast({
        title: "Código OTP generado",
        description: "Comparte este código de 6 caracteres con tu contacto.",
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error al generar código",
        description: err instanceof Error ? err.message : "Error inesperado.",
      });
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (!myCode?.code) return;
    navigator.clipboard.writeText(myCode.code);
    setCodeCopied(true);
    toast({
      title: "Código copiado",
      description: "El código OTP ha sido copiado al portapapeles.",
    });
    setTimeout(() => setCodeCopied(false), 2500);
  };

  const handleRedeemCode = async () => {
    if (!supabaseUser?.id || !codeInput.trim()) return;
    setRedeeming(true);
    try {
      await redeemConnectionCode(supabaseUser.id, codeInput);
      toast({
        title: "Nodo vinculado",
        description: "El enlace criptográfico ha sido establecido con éxito.",
      });
      setCodeInput("");
      const userContacts = await getUserContacts(supabaseUser.id);
      if (userContacts && userContacts.length > 0) {
        setContacts(userContacts);
      }
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : "";
      const isTechnical = /row-level security|rls|violates|policy|pgrst|42501|permission denied/i.test(rawMessage);
      toast({
        variant: "destructive",
        title: "No se pudo vincular el contacto",
        description: isTechnical || !rawMessage
          ? "El código ingresado es inválido, ya fue utilizado por otro usuario o ha expirado."
          : rawMessage,
      });
    } finally {
      setRedeeming(false);
    }
  };

  const reloadContacts = async () => {
    if (!supabaseUser?.id) return;
    setIsReloadingContacts(true);
    try {
      const userContacts = await getUserContacts(supabaseUser.id);
      if (userContacts && userContacts.length > 0) {
        setContacts(userContacts);
      } else {
        setContacts(DEFAULT_VERIFIED_CONTACTS);
      }
      toast({
        title: "Contactos actualizados",
        description: "Lista de nodos sincronizada con la red.",
      });
    } catch (err) {
      console.error("Error al recargar contactos:", err);
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: "No se pudieron recargar los contactos.",
      });
    } finally {
      setIsReloadingContacts(false);
    }
  };

  // Account deletion handler
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
        description: "Tu cuenta e identidades post-cuánticas han sido eliminadas.",
      });

      await logout();
      navigate("/");
    } catch (err) {
      console.error("Error al eliminar cuenta:", err);
      toast({
        variant: "destructive",
        title: "Error al eliminar cuenta",
        description: "No se pudieron eliminar todos los registros.",
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
          title: "Fotografía actualizada",
          description: "Tu perfil se ha actualizado correctamente.",
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

  if (authLoading || (loading && !supabaseUser)) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-3 text-neutral-400">
          <Activity className="w-6 h-6 animate-spin text-neutral-300" />
          <p className="text-xs font-mono tracking-widest uppercase text-neutral-400">Cargando Identidad...</p>
        </div>
      </div>
    );
  }

  if (!supabaseUser) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-neutral-950 p-6">
        <div className="text-center space-y-4 max-w-sm p-8 rounded-2xl bg-neutral-900/60 border border-neutral-800">
          <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto" />
          <h2 className="text-base font-bold text-white">Sesión requerida</h2>
          <p className="text-xs text-neutral-400">Inicia sesión para acceder a tu panel de identidad.</p>
          <Button onClick={() => navigate("/auth?mode=login")} className="w-full bg-white text-neutral-950 hover:bg-neutral-200 text-xs font-semibold">
            Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

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

  const getOpsText = () => {
    if (usage?.plan_rank === "vanguard") return "Ilimitadas";
    const total = usage?.plan_rank === "pro" ? 100 : 6;
    return `${usage?.ops_remaining ?? 0} / ${total}`;
  };

  const planLabel = usage?.plan_rank === "vanguard" ? "PLAN VANGUARD" : usage?.plan_rank === "pro" ? "PLAN PRO" : "LICENCIA ACTIVA";

  const userNameText = profile?.first_name || profile?.last_name
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : (profile?.full_name || "Usuario Dilithium");

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-transparent text-neutral-100 pt-10 sm:pt-12 pb-16 px-4 sm:px-6 relative z-10">
      {/* ── Background Layer: Grainient ── */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-90">
        <Grainient
          color1="#080c16"
          color2="#155E75"
          color3="#000000ff"
          colorBalance={0.25}
          blendSoftness={0.2}
          warpStrength={1.5}
          warpSpeed={1.8}
          warpFrequency={3.0}
          warpAmplitude={35.0}
          grainAmount={0.06}
          grainAnimated={true}
          timeSpeed={0.35}
          contrast={1.25}
          zoom={1.1}
          centerX={0.05}
        />
      </div>

      {/* Rejilla Global a 2 Columnas */}
      <div className="max-w-7xl mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-stretch">
        {/* ========================================================================= */}
        {/* 1. COLUMNA IZQUIERDA: MONOLITO PRINCIPAL (lg:col-span-8)                  */}
        {/* ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="lg:col-span-8 bg-neutral-950/70 border border-neutral-800/80 rounded-lg backdrop-blur-xl overflow-hidden shadow-2xl divide-y divide-neutral-800/80 flex flex-col justify-between"
        >
          {/* Cabecera de Identidad */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5 flex-1 min-w-0">
                {/* Avatar cuadrado nítido de aspecto técnico */}
                <div className="relative group shrink-0">
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg"
                    onChange={handleAvatarChange}
                  />
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className="w-16 h-16 rounded border border-neutral-800 bg-neutral-900 overflow-hidden flex-shrink-0 flex items-center justify-center text-xl font-bold text-white relative cursor-pointer transition-colors hover:border-neutral-700"
                    title="Cambiar foto de perfil"
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      nameInitial.toUpperCase()
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                </div>

                {/* Contenido central */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-12 min-h-[48px] w-full max-w-lg flex items-center overflow-visible mb-1.5">
                    {loading ? (
                      <div className="h-8 w-60 bg-neutral-800 animate-pulse rounded" />
                    ) : (
                      <WarpText
                        text={userNameText}
                        color="#ffffff"
                        fontSize="1.75rem"
                        fontWeight={800}
                        letterSpacing="-0.02em"
                        warpStrength={0.06}
                        speed={0.5}
                        className="w-full h-12 overflow-visible"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <p className="font-mono text-xs text-neutral-400">
                      {supabaseUser?.email}
                    </p>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-300 border border-neutral-800 bg-neutral-900/60 px-2.5 py-0.5 rounded-sm">
                      {planLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Derecha: Botón/enlace minimalista */}
              <button
                type="button"
                onClick={() => setInspectModalOpen(true)}
                className="text-xs font-mono text-neutral-400 hover:text-white transition-colors underline-offset-4 hover:underline cursor-pointer bg-transparent border-0 p-0 shrink-0 text-left sm:text-right"
              >
                [ Inspeccionar credenciales técnicas ↗ ]
              </button>
            </div>
          </div>

          {/* Cuerpo dividido: Historial (izquierda) + Consumo (derecha) */}
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-neutral-800/80">
            {/* Lado Izquierdo: REGISTRO DE FIRMAS & DOCUMENTOS */}
            <div className="md:col-span-7 p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3 mb-2">
                <span className="font-mono text-xs text-neutral-400 tracking-wider uppercase font-semibold">
                  REGISTRO DE FIRMAS & DOCUMENTOS
                </span>
                <span className="font-mono text-[11px] text-neutral-500">
                  {logs.length} REGISTROS
                </span>
              </div>

              <div className="divide-y divide-neutral-800/40">
                {logs.length > 0 ? (
                  <>
                    {logs.slice(0, 4).map((log) => {
                      const mockHash = `sha256:${log.id.slice(0, 8)}...${log.id.slice(-4)}`;
                      return (
                        <div
                          key={log.id}
                          className="py-3.5 border-b border-neutral-800/40 last:border-b-0 flex items-center justify-between hover:bg-white/[0.02] px-2 -mx-2 rounded transition-colors gap-4"
                        >
                          <div className="space-y-1 min-w-0 flex-1 overflow-hidden">
                            <p
                              className="text-sm font-medium text-neutral-200 hover:text-white transition-colors truncate"
                              title={log.file_name}
                            >
                              {log.file_name}
                            </p>
                            <p className="font-mono text-[11px] text-neutral-400 truncate">{mockHash}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs text-neutral-500 font-mono">{safeFormatDate(log.created_at)}</span>
                          </div>
                        </div>
                      );
                    })}

                    {logs.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setLogsModalOpen(true)}
                        className="text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer mt-3 block text-left"
                      >
                        Ver más registros ({logs.length}) →
                      </button>
                    )}
                  </>
                ) : (
                  <div className="py-12 text-center text-xs text-neutral-500 font-mono">
                    // NO HAY REGISTROS DISPONIBLES EN ESTE NODO
                  </div>
                )}
              </div>
            </div>

            {/* Lado Derecho: CONSUMO DE OPERACIONES */}
            <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-8 bg-neutral-950/30">
              <div className="space-y-3">
                <h4 className="font-mono text-xs text-neutral-400 tracking-wider uppercase font-semibold">
                  CONSUMO DE OPERACIONES
                </h4>
                <div className="text-3xl font-mono font-light text-white tracking-tight">
                  {usage?.plan_rank === "vanguard" ? "Ilimitadas" : `${usage?.ops_remaining ?? 0} / ${usage?.plan_rank === "pro" ? 100 : 6}`}
                </div>
                {usage?.plan_rank !== "vanguard" && (
                  <div className="h-[2px] bg-neutral-800 w-full rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-neutral-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, ((usage?.ops_remaining ?? 0) / (usage?.plan_rank === "pro" ? 100 : 6)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-800/40">
                <button
                  type="button"
                  onClick={() => navigate("/pricing")}
                  className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0 text-left font-mono"
                >
                  Gestionar plan y suscripción →
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* 2. COLUMNA DERECHA: PANEL VERTICAL DE VINCULACIÓN (lg:col-span-4)         */}
        {/* ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="lg:col-span-4 bg-neutral-950/70 border border-neutral-800/80 rounded-lg backdrop-blur-xl p-6 flex flex-col justify-between h-full min-h-[500px] shadow-2xl"
        >
          <div className="space-y-6">
            {/* A. Encabezado del Panel */}
            <div className="space-y-1">
              <h3 className="font-mono text-xs text-neutral-400 tracking-wider uppercase font-semibold">
                VINCULACIÓN CRIPTOGRÁFICA
              </h3>
              <p className="text-xs text-neutral-500 font-mono">
                Intercambio de claves públicas ML-KEM-768
              </p>
            </div>

            {/* B1. Sección "Mi Código de Enlace" */}
            <div className="space-y-2">
              <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider block">
                CÓDIGO DE ENLACE
              </span>

              {myCode ? (
                <div className="space-y-1.5">
                  <div
                    onClick={handleCopyCode}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleCopyCode();
                      }
                    }}
                    title="Clic para copiar código"
                    className="group flex items-baseline justify-between py-2 border-b border-neutral-800/80 hover:border-neutral-600 transition-colors cursor-pointer select-none"
                  >
                    <span className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-emerald-400 group-hover:text-emerald-300 transition-colors select-all">
                      {myCode.code}
                    </span>
                    <span className="font-mono text-xs text-neutral-400 group-hover:text-white flex items-center gap-1.5 transition-colors">
                      {codeCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                          <span>Copiar</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-neutral-400">
                    {timeLeft !== null && (
                      <span className="text-amber-400/90">
                        Expira en: {formatTimeLeft(timeLeft)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      disabled={generatingCode}
                      className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 ml-auto"
                    >
                      <RotateCw className={`w-3 h-3 ${generatingCode ? "animate-spin" : ""}`} />
                      <span>{generatingCode ? "Renovando..." : "Renovar"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  disabled={generatingCode}
                  className="w-full py-2.5 flex items-center justify-between font-mono text-xs text-neutral-400 hover:text-white transition-colors border-b border-dashed border-neutral-800 hover:border-neutral-600 cursor-pointer disabled:opacity-40"
                >
                  <span className="flex items-center gap-2">
                    {generatingCode && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />
                    )}
                    <span>{generatingCode ? "Generando OTP..." : "Generar código de conexión"}</span>
                  </span>
                  <span className="text-neutral-600">→</span>
                </button>
              )}
            </div>

            <hr className="border-neutral-800/80 my-5" />

            {/* B2. Sección "Vincular Nuevo Contacto" (Canjear) */}
            <div className="space-y-2">
              <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider block">
                VINCULAR CONTACTO
              </span>
              <div className="relative flex items-center border-b border-neutral-800 focus-within:border-neutral-500 transition-colors py-1.5">
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && codeInput.trim() && !redeeming) {
                      handleRedeemCode();
                    }
                  }}
                  placeholder="Introduce código OTP..."
                  maxLength={8}
                  className="bg-transparent font-mono text-sm uppercase text-neutral-100 placeholder:text-neutral-600 focus:outline-none w-full tracking-wider pr-20"
                />
                <button
                  type="button"
                  onClick={handleRedeemCode}
                  disabled={!codeInput.trim() || redeeming}
                  className="absolute right-0 font-mono text-xs text-neutral-400 hover:text-emerald-400 disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {redeeming ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-neutral-400" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <span>Vincular</span>
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            </div>

            <hr className="border-neutral-800/80 my-5" />

            {/* B3. Sección "Nodos Vinculados" */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                    CONTACTOS ACTIVOS
                  </span>
                  <button
                    type="button"
                    onClick={reloadContacts}
                    disabled={isReloadingContacts}
                    title="Recargar contactos"
                    className="text-neutral-400 hover:text-white transition-colors p-0.5 rounded cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isReloadingContacts ? "animate-spin" : ""}`} />
                  </button>
                </div>
                <span className="font-mono text-[10px] text-neutral-500">
                  {contacts.length} CONECTADOS
                </span>
              </div>

              <div className="space-y-2">
                {contacts.length > 0 ? (
                  <>
                    {/* Mostrar únicamente el contacto más reciente (1 solo elemento visible) */}
                    {(() => {
                      const c = contacts[0];
                      const cInitial = (c.full_name || c.email).charAt(0).toUpperCase();
                      return (
                        <div
                          key={c.user_id}
                          className="py-1.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded border border-neutral-800 bg-neutral-900 flex items-center justify-center font-mono text-[11px] text-neutral-400 shrink-0 overflow-hidden">
                              {c.avatar_url ? (
                                <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                cInitial
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-neutral-200 font-medium truncate text-xs">
                                {c.full_name || c.email}
                              </p>
                              <p className="text-neutral-500 font-mono text-[10px] truncate">
                                {c.email}
                              </p>
                            </div>
                          </div>
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                            title="KEM Disponible"
                          />
                        </div>
                      );
                    })()}

                    {/* Enlace para abrir modal / drawer si hay contactos */}
                    <button
                      type="button"
                      onClick={() => setContactsModalOpen(true)}
                      className="text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer mt-2 block text-left"
                    >
                      Ver todos los contactos ({contacts.length}) →
                    </button>
                  </>
                ) : (
                  <div className="py-3 text-center text-xs font-mono text-neutral-600">
                    // SIN NODOS CONECTADOS
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enlace inferior del panel */}
          <div className="pt-6 border-t border-neutral-800/60 mt-6">
            <button
              type="button"
              onClick={() => navigate("/transfers")}
              className="text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0 text-left block w-full"
            >
              Transferir archivos →
            </button>
          </div>
        </motion.div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ZONA DE RIESGO / PURGA (Pie de Página, max-w-7xl)                      */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 mt-6 relative z-10">
        <div className="bg-neutral-950/80 border border-red-950/40 rounded-lg p-5 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h5 className="text-xs font-mono text-red-400 font-semibold tracking-wider uppercase">
              ZONA DE RIESGO // REVOCACIÓN Y PURGA DE IDENTIDAD CRIPTOGRÁFICA
            </h5>
            <p className="text-xs text-neutral-400 max-w-2xl">
              La eliminación suprimirá permanentemente tus claves públicas y privadas post-cuánticas (ML-DSA-65 y ML-KEM-768), revocando todas las firmas y transferencias asociadas en la red.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="border border-red-900/60 bg-red-950/30 hover:bg-red-900/40 text-red-300 font-mono text-xs px-4 py-2 rounded transition-colors shrink-0"
          >
            Eliminar Cuenta
          </Button>
        </div>
      </div>

      {/* Modal de confirmación para purga de identidad */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-neutral-950 border-neutral-800 text-white max-w-md sm:rounded-xl">
          <AlertDialogHeader className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-red-950 border border-red-800 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-white">
              ¿Confirmas la eliminación permanente de tu cuenta?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-neutral-400 leading-relaxed">
              Se destruirán de forma inmediata tus claves de firma y cifrado Dilithium ML-DSA y Kyber ML-KEM.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 text-xs rounded-lg">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="bg-red-700 hover:bg-red-600 text-white font-bold text-xs rounded-lg gap-2"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Eliminando...</span>
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

      {/* --- Technical Credentials Inspection Modal --- */}
      <Dialog open={inspectModalOpen} onOpenChange={setInspectModalOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white max-w-2xl max-h-[85vh] overflow-y-auto sm:rounded-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-bold text-white">Credenciales Técnicas Post-Cuánticas</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-neutral-400">
              Parámetros criptográficos auditados conforme a estándares NIST FIPS 204 y FIPS 203.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* ML-DSA-65 Public Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Clave Pública de Firma (ML-DSA-65 / FIPS 204)</span>
                {publicKey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(publicKey, "Clave ML-DSA-65")}
                    className="text-[11px] text-neutral-400 hover:text-white h-7 px-2.5"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar
                  </Button>
                )}
              </div>
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                <p className="font-mono text-[11px] break-all text-neutral-300 leading-relaxed max-h-36 overflow-y-auto">
                  {publicKey || "No hay clave pública registrada."}
                </p>
              </div>
            </div>

            {/* ML-KEM-768 Public Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Clave Pública de Encapsulación (ML-KEM-{kemSecurityLevel || 768} / FIPS 203)</span>
                {kemPublicKey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(kemPublicKey, "Clave ML-KEM-768")}
                    className="text-[11px] text-neutral-400 hover:text-white h-7 px-2.5"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar
                  </Button>
                )}
              </div>
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                <p className="font-mono text-[11px] break-all text-neutral-300 leading-relaxed max-h-36 overflow-y-auto">
                  {kemPublicKey || "No hay clave KEM registrada."}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal / Drawer Push-up de Contactos */}
      <Dialog open={contactsModalOpen} onOpenChange={setContactsModalOpen}>
        <DialogContent className="bg-neutral-950 border border-neutral-800 text-white max-w-lg w-full max-h-[85vh] flex flex-col p-6 sm:rounded-xl shadow-2xl backdrop-blur-xl">
          <DialogHeader className="pb-3 border-b border-neutral-800/80">
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="font-mono text-xs uppercase tracking-wider text-neutral-300 font-semibold flex items-center gap-2">
                CONTACTOS VINCULADOS
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-neutral-500 font-mono mt-0.5">
              Contactos activos
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 overflow-y-auto max-h-[55vh] divide-y divide-neutral-800/40 pr-1">
            {contacts.length > 0 ? (
              contacts.map((c) => {
                const cInitial = (c.full_name || c.email).charAt(0).toUpperCase();
                return (
                  <div
                    key={c.user_id}
                    className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.02] px-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded border border-neutral-800 bg-neutral-900 flex items-center justify-center font-mono text-xs text-neutral-400 shrink-0 overflow-hidden">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          cInitial
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-neutral-200 font-medium truncate text-xs">
                          {c.full_name || c.email}
                        </p>
                        <p className="text-neutral-500 font-mono text-[10px] truncate">
                          {c.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                        title="KEM-768 Disponible"
                      />
                      <span className="text-[10px] font-mono text-neutral-500">ML-KEM</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs font-mono text-neutral-500">
                // NO HAY CONTACTOS REGISTRADOS
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs font-mono text-neutral-400">
            <button
              type="button"
              onClick={reloadContacts}
              disabled={isReloadingContacts}
              className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              <RotateCw className={`w-3 h-3 ${isReloadingContacts ? "animate-spin" : ""}`} />
              <span>Sincronizar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setContactsModalOpen(false);
                navigate("/transfers");
              }}
              className="hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Transferir archivos →
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Historial Completo de Firmas y Documentos */}
      <Dialog open={logsModalOpen} onOpenChange={setLogsModalOpen}>
        <DialogContent className="bg-neutral-950 border border-neutral-800 text-white max-w-xl w-full max-h-[85vh] flex flex-col p-6 sm:rounded-xl shadow-2xl backdrop-blur-xl">
          <DialogHeader className="pb-3 border-b border-neutral-800/80">
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="font-mono text-xs uppercase tracking-wider text-neutral-300 font-semibold flex items-center gap-2">
                HISTORIAL DE FIRMAS & DOCUMENTOS
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-neutral-500 font-mono mt-0.5">
              Registro de auditoría criptográfica ({logs.length} eventos)
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 overflow-y-auto max-h-[55vh] divide-y divide-neutral-800/40 pr-1">
            {logs.length > 0 ? (
              logs.map((log) => {
                const mockHash = `sha256:${log.id.slice(0, 8)}...${log.id.slice(-4)}`;
                return (
                  <div
                    key={log.id}
                    className="py-3 border-b border-neutral-800/40 last:border-b-0 flex items-center justify-between hover:bg-white/[0.02] px-2 rounded transition-colors gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1 overflow-hidden">
                      <p
                        className="text-sm font-medium text-neutral-200 hover:text-white transition-colors truncate"
                        title={log.file_name}
                      >
                        {log.file_name}
                      </p>
                      <p className="font-mono text-[11px] text-neutral-400 truncate">{mockHash}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-neutral-500 font-mono">{safeFormatDate(log.created_at)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs font-mono text-neutral-500">
                // NO HAY REGISTROS DISPONIBLES EN ESTE NODO
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs font-mono text-neutral-400">
            <span className="text-neutral-500 text-[11px]">
              Auditado por ML-DSA-65
            </span>
            <button
              type="button"
              onClick={() => {
                setLogsModalOpen(false);
                navigate("/signature-hub");
              }}
              className="hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Firmar nuevo documento →
            </button>
          </div>
        </DialogContent>
      </Dialog>
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
