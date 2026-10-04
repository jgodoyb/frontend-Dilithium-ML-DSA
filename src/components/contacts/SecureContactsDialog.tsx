import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  KeyRound,
  Copy,
  Check,
  Clock,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  AlertCircle,
  Lock,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMockAuth } from "@/contexts/MockAuthContext";
import {
  generateConnectionCode,
  redeemConnectionCode,
  getUserContacts,
  ContactIdentity,
  ConnectionCodeResult,
} from "@/services/contactService";

interface SecureContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SecureContactsDialog({
  open,
  onOpenChange,
}: SecureContactsDialogProps) {
  const { supabaseUser } = useMockAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"contacts" | "my-code" | "redeem">("contacts");

  // Contact list state
  const [contacts, setContacts] = useState<ContactIdentity[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // My Code state
  const [myCode, setMyCode] = useState<ConnectionCodeResult | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Redeem Code state
  const [codeInput, setCodeInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  // Copied KEM key tracking
  const [copiedKeyUserId, setCopiedKeyUserId] = useState<string | null>(null);

  // 1. Cargar contactos
  const loadContacts = useCallback(async () => {
    if (!supabaseUser?.id) return;
    setLoadingContacts(true);
    try {
      const data = await getUserContacts(supabaseUser.id);
      setContacts(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al cargar la lista de contactos.";
      console.error("Error loading contacts:", err);
      toast({
        variant: "destructive",
        title: "Error al cargar contactos",
        description: message,
      });
    } finally {
      setLoadingContacts(false);
    }
  }, [supabaseUser?.id, toast]);

  useEffect(() => {
    if (open && supabaseUser?.id) {
      loadContacts();
    }
  }, [open, supabaseUser?.id, loadContacts]);

  // 2. Temporizador de expiración para Mi Código
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

  // Formato mm:ss
  const formatTimeLeft = (seconds: number | null): string => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 3. Generar nuevo código OTP
  const handleGenerateCode = async () => {
    if (!supabaseUser?.id) {
      toast({
        variant: "destructive",
        title: "Sesión no disponible",
        description: "Debes iniciar sesión para generar un código seguro.",
      });
      return;
    }

    setGeneratingCode(true);
    try {
      const result = await generateConnectionCode(supabaseUser.id);
      setMyCode(result);
      setCodeCopied(false);
      toast({
        title: "Código generado",
        description: "Comparte este código de 6 caracteres con tu contacto. Expira en 10 minutos.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo generar el código.";
      toast({
        variant: "destructive",
        title: "Error al generar código",
        description: message,
      });
    } finally {
      setGeneratingCode(false);
    }
  };

  // 4. Copiar código al portapapeles
  const handleCopyCode = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCodeCopied(true);
    toast({
      title: "Copiado",
      description: "Código copiado al portapapeles.",
    });
    setTimeout(() => setCodeCopied(false), 2500);
  };

  // 5. Copiar clave KEM
  const handleCopyKemKey = (userId: string, kemKey: string) => {
    navigator.clipboard.writeText(kemKey);
    setCopiedKeyUserId(userId);
    toast({
      title: "Clave pública KEM copiada",
      description: "Clave ML-KEM-768 copiada correctamente.",
    });
    setTimeout(() => setCopiedKeyUserId(null), 2500);
  };

  // 6. Canjear código de contacto
  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUser?.id) return;

    const trimmed = codeInput.trim().toUpperCase();
    if (trimmed.length !== 6) {
      toast({
        variant: "destructive",
        title: "Código incompleto",
        description: "El código debe tener exactamente 6 caracteres alfanuméricos.",
      });
      return;
    }

    setRedeeming(true);
    try {
      await redeemConnectionCode(supabaseUser.id, trimmed);
      // Notificación de éxito silenciada: la actualización de la lista de contactos es confirmación visual suficiente
      setCodeInput("");
      await loadContacts();
      setActiveTab("contacts");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#090a0f] border-white/10 text-white shadow-2xl p-0 overflow-hidden sm:rounded-2xl">
        {/* Encabezado con estética post-cuántica */}
        <div className="relative p-6 pb-4 border-b border-white/10 bg-gradient-to-br from-white/[0.03] via-transparent to-[#0e7490]/10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#0e7490]/20 border border-[#0e7490]/40 text-[#22d3ee]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Contactos Seguros
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-950/30 text-[10px] uppercase font-mono tracking-widest">
                    ML-KEM-768
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Intercambio de identidades públicas criptográficas para cifrado punto a punto.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Selector de pestañas */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as typeof activeTab)}
            className="w-full mt-5"
          >
            <TabsList className="grid grid-cols-3 bg-white/5 border border-white/10 p-1 rounded-xl h-10">
              <TabsTrigger
                value="contacts"
                className="text-xs font-semibold data-[state=active]:bg-[#0e7490] data-[state=active]:text-white rounded-lg transition-all flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                Contactos ({contacts.length})
              </TabsTrigger>
              <TabsTrigger
                value="my-code"
                className="text-xs font-semibold data-[state=active]:bg-[#0e7490] data-[state=active]:text-white rounded-lg transition-all flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Mi Código OTP
              </TabsTrigger>
              <TabsTrigger
                value="redeem"
                className="text-xs font-semibold data-[state=active]:bg-[#0e7490] data-[state=active]:text-white rounded-lg transition-all flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Vincular Código
              </TabsTrigger>
            </TabsList>

            {/* --- Pestaña 1: Directorio de Contactos --- */}
            <TabsContent value="contacts" className="mt-4 focus-visible:outline-none">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Contactos listos para recibir documentos cifrados
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadContacts}
                  disabled={loadingContacts}
                  className="h-7 text-[11px] gap-1.5 text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingContacts ? "animate-spin" : ""}`} />
                  Actualizar
                </Button>
              </div>

              {loadingContacts ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 className="w-7 h-7 animate-spin text-[#0e7490]" />
                  <p className="text-xs font-mono">Cargando identidades seguras...</p>
                </div>
              ) : contacts.length === 0 ? (
                <div className="py-12 px-6 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01] space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                    <Users className="w-6 h-6 opacity-60" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">No tienes contactos vinculados</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Genera un código OTP para compartirlo o canjea el código de otro usuario para habilitar el cifrado post-cuántico mutuo.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("my-code")}
                      className="bg-[#0e7490] hover:bg-[#0891b2] text-white text-xs gap-1.5 h-8"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Compartir mi código
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTab("redeem")}
                      className="border-white/10 hover:bg-white/5 text-xs gap-1.5 h-8"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Ingresar código
                    </Button>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[280px] pr-3">
                  <div className="space-y-2.5">
                    {contacts.map((c) => {
                      const initial = (c.full_name || c.email || "U").charAt(0).toUpperCase();
                      const isCopied = copiedKeyUserId === c.user_id;

                      return (
                        <div
                          key={c.user_id}
                          className="group p-3.5 rounded-xl border border-white/5 bg-black/40 hover:bg-white/[0.03] hover:border-cyan-500/30 transition-all flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="w-9 h-9 border border-white/10 bg-[#0e7490]/20 text-[#22d3ee] font-bold text-xs">
                              {c.avatar_url && (
                                <AvatarImage
                                  src={c.avatar_url}
                                  alt={c.full_name || c.email}
                                  className="object-cover"
                                />
                              )}
                              <AvatarFallback className="bg-transparent">{initial}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">
                                {c.full_name || c.email}
                              </p>
                              <p className="text-xs font-mono text-slate-400 truncate">
                                {c.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <Badge className="bg-emerald-950/40 text-emerald-400 border-emerald-500/30 gap-1.5 text-[10px] font-mono py-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ML-KEM-768 Activo
                            </Badge>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyKemKey(c.user_id, c.kem_public_key)}
                              className="h-7 px-2 text-slate-400 hover:text-white hover:bg-white/10 text-xs gap-1"
                              title="Copiar Clave Pública KEM"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-[10px] text-emerald-400 font-mono">Copiada</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-mono">KEM</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* --- Pestaña 2: Mi Código de Conexión (Generar) --- */}
            <TabsContent value="my-code" className="mt-4 focus-visible:outline-none">
              <Card className="border-white/10 bg-black/40 text-white">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-cyan-400" />
                        Código Temporal de Enlace
                      </h4>
                      <p className="text-xs text-slate-400">
                        Comparte este código de un solo uso para que tu contacto enlace su identidad contigo.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={handleGenerateCode}
                      disabled={generatingCode}
                      className="bg-[#0e7490] hover:bg-[#0891b2] text-white text-xs gap-1.5 shrink-0"
                    >
                      {generatingCode ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      {myCode ? "Regenerar" : "Generar Código"}
                    </Button>
                  </div>

                  {myCode ? (
                    <div className="space-y-4 pt-2">
                      <div className="relative p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col items-center justify-center gap-3 shadow-[0_0_25px_rgba(14,116,144,0.15)]">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl sm:text-4xl font-black font-mono tracking-[0.35em] text-cyan-300 select-all pl-2">
                            {myCode.code}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCopyCode(myCode.code)}
                            className="bg-white/10 hover:bg-white/20 text-white text-xs gap-1.5 h-8 px-4 rounded-lg"
                          >
                            {codeCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copiar Código
                              </>
                            )}
                          </Button>

                          <div
                            className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-lg border ${
                              (timeLeft ?? 0) <= 120
                                ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                                : "bg-white/5 border-white/10 text-slate-300"
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{formatTimeLeft(timeLeft)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-xs text-slate-400">
                        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <p>
                          Una vez que tu contacto ingrese este código, ambos quedarán enlazados automáticamente y el código quedará invalidado para garantizar máxima seguridad.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01] space-y-3">
                      <Lock className="w-8 h-8 text-slate-600 mx-auto" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-300">No hay ningún código activo</p>
                        <p className="text-[11px] text-slate-500">
                          Haz clic en &quot;Generar Código&quot; para crear un token OTP de 10 minutos.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- Pestaña 3: Enlazar Nuevo Contacto (Canjear) --- */}
            <TabsContent value="redeem" className="mt-4 focus-visible:outline-none">
              <Card className="border-white/10 bg-black/40 text-white">
                <CardContent className="p-6">
                  <form onSubmit={handleRedeemCode} className="space-y-5">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-cyan-400" />
                        Canjear Código de Contacto
                      </h4>
                      <p className="text-xs text-slate-400">
                        Introduce el código alfanumérico de 6 dígitos provisto por tu contraparte para vincular sus claves KEM.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="relative">
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="EJ: K7M9X2"
                          value={codeInput}
                          onChange={(e) =>
                            setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                          }
                          className="h-14 bg-black/60 border-white/15 focus-visible:border-cyan-500 text-center font-mono text-2xl font-black tracking-[0.35em] text-white uppercase placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:text-slate-600 rounded-xl"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-mono">
                        <span>Formato: 6 caracteres alfanuméricos</span>
                        <span>{codeInput.length}/6</span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={codeInput.length !== 6 || redeeming}
                      className="w-full bg-[#0e7490] hover:bg-[#0891b2] text-white font-semibold h-11 rounded-xl gap-2 transition-all shadow-[0_0_20px_rgba(14,116,144,0.3)] disabled:opacity-50"
                    >
                      {redeeming ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Vinculando identidades criptográficas...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          Vincular Contacto Seguro
                        </>
                      )}
                    </Button>

                    <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        El canje creará un vínculo bidireccional seguro. Ambos usuarios podrán seleccionar este destinatario para el cifrado y transmisión de documentos post-cuánticos.
                      </span>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Pie de diálogo */}
        <div className="p-4 px-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>Red PQC: ML-DSA-65 &amp; ML-KEM-768</span>
          </div>
          <span>Q-PROOF SECURE LINK</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export default SecureContactsDialog;
