import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Shield, Info, Loader2, Hexagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import AuthSplitLayout from "@/components/AuthSplitLayout";
import { useMockAuth } from "@/contexts/MockAuthContext";
import PasswordStrengthIndicator, { getPasswordValidation } from "@/components/PasswordStrengthIndicator";
import { useRateLimit } from "@/lib/security";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido").trim(),
  password: z.string().min(1, "La contraseña es requerida"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto").max(50, "Nombre demasiado largo").trim(),
  lastName: z.string().min(2, "Apellido demasiado corto").max(50, "Apellido demasiado largo").trim(),
  email: z.string().email("Email inválido").trim(),
  specialty: z.string().min(1, "Selecciona una especialidad"),
  organization: z.string().max(100, "Organización demasiado larga").trim(),
  password: z.string().min(1, "La contraseña es requerida"),
});

type AuthMode = "login" | "register";

const SPECIALTY_OPTIONS = [
  "Ciberseguridad",
  "Criptografía",
  "Desarrollo de Software",
  "Administración de Sistemas",
  "Auditoría de TI",
  "Investigación / Académico",
  "Otro",
];

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [showConfirmKey, setShowConfirmKey] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [organization, setOrganization] = useState("");
  const [masterKey, setMasterKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const showRecoveryNow = false; // hardcoded temporarily for layout
  const { login } = useMockAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // SECURITY: Rate-limit login attempts (5 per minute) to mitigate brute-force.
  // Real enforcement MUST happen server-side; this is a UX-layer defence-in-depth.
  const loginLimiter = useRateLimit({ maxAttempts: 5, windowMs: 60_000 });
  const registerLimiter = useRateLimit({ maxAttempts: 3, windowMs: 60_000 });

  // Sync mode when URL params change
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "register" || urlMode === "login") {
      setMode(urlMode);
    }
  }, [searchParams]);

  const passwordValidation = getPasswordValidation(masterKey);
  const passwordsMatch = masterKey === confirmKey && confirmKey.length > 0;

  // Utility to format names as Title Case (e.g. jorge -> Jorge, juan carlos -> Juan Carlos)
  const formatName = (str: string) => {
    return str
      .split(' ')
      .map(word => {
        if (!word) return "";
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Zod Validation
    const validation = loginSchema.safeParse({ email, password: masterKey });
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: validation.error.errors[0].message,
      });
      return;
    }

    // 2. Pre-check rate limit (don't record yet)
    const { allowed, resetsAt } = loginLimiter.check(false);
    if (!allowed) {
      const resetTime = resetsAt ? new Date(resetsAt).toLocaleTimeString() : "";
      setShowRecoveryNow(true);
      toast({
        variant: "destructive",
        title: "Cuenta bloqueada temporalmente",
        description: `Espera hasta las ${resetTime} o restaura tu contraseña.`,
      });
      return;
    }

    const success = await handleSupabaseLogin(email, masterKey);
    if (success) {
      navigate("/");
    } else {
      // Record attempt ONLY on failure
      const nextCheck = loginLimiter.check(true);
      setAttemptsLeft(nextCheck.remaining);
      
      if (!nextCheck.allowed) {
        setShowRecoveryNow(true);
      }

      toast({
        variant: "destructive",
        title: "Credenciales inválidas",
        description: nextCheck.allowed 
          ? `Te quedan ${nextCheck.remaining} intentos antes del bloqueo.`
          : "Has agotado los intentos. Por favor, restaura tu contraseña.",
      });
    }
  };

  const handleSupabaseLogin = async (loginEmail: string, loginPass: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPass,
      });

      if (error) {
        console.error("Supabase Login Error:", error);
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: "Credenciales inválidas o error en el servidor.",
        });
        return false;
      }

      return true;
    } catch (err: any) {
      console.error("Unexpected Login Error:", err);
      toast({
        variant: "destructive",
        title: "Error inesperado",
        description: err.message || "Error al iniciar sesión.",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setStatusMessage(null);

    // 1. Zod Validation
    const validation = registerSchema.safeParse({
      name,
      lastName,
      email,
      specialty,
      organization,
      password: masterKey
    });

    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Campo inválido",
        description: validation.error.errors[0].message,
      });
      return;
    }

    // SECURITY: Rate-limit registrations — 3 per minute.
    const { allowed } = registerLimiter.check();
    if (!allowed) {
      toast({
        variant: "destructive",
        title: "Demasiados intentos",
        description: "Por seguridad, espera un momento antes de intentarlo de nuevo.",
      });
      return;
    }

    if (!passwordValidation.isValid) return;

    if (!passwordsMatch) {
      setStatusMessage("Las contraseñas no coinciden.");
      return;
    }

    try {
      setIsLoading(true);
      const formattedName = formatName(name);
      const formattedLastName = formatName(lastName);
      const fullName = `${formattedName} ${formattedLastName}`.trim();

      const { data, error } = await supabase.auth.signUp({
        email,
        password: masterKey,
        options: {
          data: {
            full_name: fullName,
            first_name: formattedName,
            last_name: formattedLastName,
            specialty,
            organization
          }
        }
      });


      if (error) {
        console.error("Supabase Signup Error:", error);
        toast({
          variant: "destructive",
          title: "Error en el registro",
          description: error.message,
        });
      } else {
        // Solamente si el registro fue exitoso
        if (data.session) {
          // Confirmación de email desactivada: procedemos a loguear y generar claves
          const token = data.session.access_token;
          const apiUrl = import.meta.env.VITE_API_URL;

          const fetchUrl = `${apiUrl}/api/generate`;
          const fetchHeaders = { "Authorization": `Bearer ${token}` };

          try {
            await fetch(fetchUrl, { method: "POST", headers: fetchHeaders });
          } catch (fetchErr) {
            console.error("Error en la llamada al backend:", fetchErr);
          }

          toast({
            title: "¡Cuenta creada con éxito!",
            description: "Iniciando sesión automáticamente...",
          });

          // Auto-login flow
          const loginSuccess = await handleSupabaseLogin(email, masterKey);
          if (loginSuccess) {
            navigate("/");
          }
        } else {
          // Confirmación de email ACTIVADA: la sesión es nula hasta verificar
          toast({
            title: "¡Correo de verificación enviado!",
            description: "Revisa tu bandeja de entrada para activar tu cuenta.",
          });
          setStatusMessage("¡Casi listo! Hemos enviado un enlace a tu correo. Haz clic en él para verificar tu cuenta y poder iniciar sesión.");
          setMode("login");
        }
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error inesperado",
        description: err.message || "Error inesperado.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSplitLayout>
      {/* Mobile branding */}
      <div className="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Hexagon className="w-6 h-6 text-[#0e7490]" />
          <span className="font-bold text-xl text-white tracking-wide">
            Q-Proof <span className="text-[#0e7490] font-mono text-sm">Systems</span>
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 p-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md relative w-full mb-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-3.5 text-[11px] uppercase tracking-widest font-bold transition-all duration-500 rounded-full relative overflow-hidden ${mode === "login"
              ? "bg-gradient-to-r from-[#0e7490] to-cyan-500 text-white shadow-[0_0_20px_rgba(14,116,144,0.5)] transform scale-100"
              : "text-slate-400 hover:text-white hover:bg-white/10 scale-95 opacity-80"
              }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 py-3.5 text-[11px] uppercase tracking-widest font-bold transition-all duration-500 rounded-full relative overflow-hidden ${mode === "register"
              ? "bg-gradient-to-r from-[#0e7490] to-cyan-500 text-white shadow-[0_0_20px_rgba(14,116,144,0.5)] transform scale-100"
              : "text-slate-400 hover:text-white hover:bg-white/10 scale-95 opacity-80"
              }`}
          >
            Registrarse
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-xs uppercase tracking-wider text-slate-400 font-medium">Email Corporativo</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-cyan-500/50 hover:bg-white/10 transition-all rounded-xl h-12 shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-xs uppercase tracking-wider text-slate-400 font-medium">Contraseña</Label>
                <Link
                  to="/auth/recovery"
                  className={cn(
                    "text-xs transition-all duration-300",
                    showRecoveryNow 
                      ? "text-[#0e7490] font-bold scale-110 underline underline-offset-4" 
                      : "text-slate-500 hover:text-[#0e7490]"
                  )}
                >
                  {showRecoveryNow ? "¡Restaura tu contraseña aquí!" : "¿Olvidaste tu contraseña?"}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-cyan-500/50 hover:bg-white/10 transition-all rounded-xl h-12 shadow-inner pr-10"
                  value={masterKey}
                  onChange={(e) => setMasterKey(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button className="w-full bg-gradient-to-r from-[#0e7490] via-cyan-500 to-[#0e7490] bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white h-14 text-[11px] uppercase tracking-[0.2em] font-extrabold shadow-[0_0_20px_rgba(14,116,144,0.3)] hover:shadow-[0_0_40px_rgba(14,116,144,0.5)] hover:-translate-y-0.5 rounded-xl border-none mt-2" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Acceder a Plataforma"
              )}
            </Button>

            <p className="text-center text-xs text-slate-500 mt-4">
              ¿No tienes cuenta corporativa?{" "}
              <button type="button" onClick={() => setMode("register")} className="text-white hover:text-[#0e7490]">
                Regístrate ahora
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name" className="text-xs uppercase tracking-wider text-slate-400 font-medium">Nombre</Label>
                <Input
                  id="reg-name"
                  placeholder="John"
                  value={name}
                  onChange={(e) => setName(formatName(e.target.value))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-cyan-500/50 hover:bg-white/10 transition-all rounded-xl h-12 shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-lastname" className="text-xs uppercase tracking-wider text-slate-400 font-medium">Apellidos</Label>
                <Input
                  id="reg-lastname"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(formatName(e.target.value))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-cyan-500/50 hover:bg-white/10 transition-all rounded-xl h-12 shadow-inner"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reg-specialty" className="text-xs uppercase tracking-wider text-slate-400 font-medium">Especialidad</Label>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger 
                    id="reg-specialty" 
                    className={cn("bg-white/5 border-white/10 text-white h-12 focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent hover:bg-white/10 transition-all rounded-xl shadow-inner", !specialty && "text-white/40")}
                  >
                    <SelectValue placeholder="Área técnica" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#030303] border-white/10 text-white">
                    {SPECIALTY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="focus:bg-[#0e7490]/20 focus:text-white">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-org" className="text-xs uppercase tracking-wider text-slate-400 font-medium">Organización / Entidad</Label>
                <Input
                  id="reg-org"
                  placeholder="Organization..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-cyan-500/50 hover:bg-white/10 transition-all rounded-xl h-12 shadow-inner"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email" className="text-xs uppercase tracking-wider text-slate-400 font-medium">Email Profesional</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="john@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-cyan-500/50 hover:bg-white/10 transition-all rounded-xl h-12 shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="reg-master" className="text-xs uppercase tracking-wider text-slate-400 font-medium">Clave Maestra de Cifrado</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-slate-500 cursor-help hover:text-[#0e7490]" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px] text-xs bg-[#0a0a0a] border-white/10 text-slate-300">
                    Esta contraseña se usa para cifrar tu clave privada ML-DSA localmente. Nunca se envía al servidor. Si la pierdes, no podrás recuperar tus activos criptográficos.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="relative">
                <Input
                  id="reg-master"
                  type={showMasterKey ? "text" : "password"}
                  placeholder="••••••••••••"
                  className={`bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-transparent focus-visible:ring-2 hover:bg-white/10 transition-all rounded-xl h-12 shadow-inner pr-10 focus-visible:ring-cyan-500/50 ${submitAttempted && !passwordValidation.isValid
                    ? "focus-visible:ring-red-500/50 border-red-500/50"
                    : ""
                    }`}
                  value={masterKey}
                  onChange={(e) => {
                    setMasterKey(e.target.value);
                    setSubmitAttempted(false);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowMasterKey(!showMasterKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showMasterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicator */}
              <PasswordStrengthIndicator password={masterKey} />

              {/* Submit-attempted error */}
              {submitAttempted && !passwordValidation.isValid && (
                <p className="text-xs text-red-400 font-medium mt-1">
                  Requisitos de seguridad corporativa no cumplidos.
                </p>
              )}

              <p className="text-[10px] text-slate-500 font-mono tracking-wider">
                MIN 12 CHARS · DERIVADA MEDIANTE AES-256-GCM
              </p>
            </div>

            {/* Confirm password field */}
            <div className="space-y-2">
              <Label htmlFor="reg-confirm" className="text-xs uppercase tracking-wider text-slate-400 font-medium">Verificar Clave</Label>
              <div className="relative">
                <Input
                  id="reg-confirm"
                  type={showConfirmKey ? "text" : "password"}
                  placeholder="••••••••••••"
                  className={cn(
                    "bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-transparent focus-visible:ring-2 hover:bg-white/10 transition-all rounded-xl h-12 shadow-inner pr-10",
                    confirmKey.length > 0
                      ? (passwordsMatch 
                          ? "focus-visible:ring-emerald-500/50 border-emerald-500/40" 
                          : "focus-visible:ring-red-500/50 border-red-500/40")
                      : "focus-visible:ring-cyan-500/50"
                  )}
                  value={confirmKey}
                  onChange={(e) => setConfirmKey(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmKey(!showConfirmKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showConfirmKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmKey.length > 0 && (
                <p className={cn(
                  "text-[10px] font-mono tracking-wider mt-1",
                  passwordsMatch ? "text-emerald-400" : "text-red-400"
                )}>
                  {passwordsMatch ? "[OK] MATCH IDENTIFICADO" : "[ERR] DISCREPANCIA EN CLAVE"}
                </p>
              )}
            </div>

            {statusMessage && (
              <div
                className={`p-3 text-xs font-mono tracking-wide rounded border ${statusMessage.includes("correcto") || statusMessage.includes("casi listo")
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}
              >
                {statusMessage}
              </div>
            )}

            <Button
              className="w-full bg-gradient-to-r from-[#0e7490] via-cyan-500 to-[#0e7490] bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white h-14 text-[11px] uppercase tracking-[0.2em] font-extrabold shadow-[0_0_20px_rgba(14,116,144,0.3)] hover:shadow-[0_0_40px_rgba(14,116,144,0.5)] hover:-translate-y-0.5 rounded-xl border-none mt-4"
              disabled={isLoading || (masterKey.length > 0 && !passwordValidation.isValid) || !passwordsMatch}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desplegando...
                </>
              ) : (
                "Crear Identidad"
              )}
            </Button>

            <p className="text-center text-xs text-slate-500 mt-4">
              ¿Ya estás en el sistema?{" "}
              <button type="button" onClick={() => setMode("login")} className="text-white hover:text-[#0e7490]">
                Acceso autorizado
              </button>
            </p>
          </form>
        )}
      </div>
    </AuthSplitLayout>
  );
};

export default Auth;
