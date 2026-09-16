import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import AuthSplitLayout from "@/components/AuthSplitLayout";
import PasswordStrengthIndicator, { getPasswordValidation } from "@/components/PasswordStrengthIndicator";
import { toast } from "@/hooks/use-toast";

type RecoveryPhase = "request" | "reset";

const AuthRecovery = () => {
  const navigate = useNavigate();

  // Phase 1
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<RecoveryPhase>("request");
  const [isLoading, setIsLoading] = useState(false);

  // Phase 2
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const passwordValidation = getPasswordValidation(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate network delay — always show generic message (privacy)
    setTimeout(() => {
      setIsLoading(false);
      setPhase("reset");
    }, 1200);
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!passwordValidation.isValid || !passwordsMatch || code.length < 4) return;

    toast({
      title: "✓ Contraseña actualizada",
      description: "Tu contraseña ha sido actualizada. Ya puedes iniciar sesión.",
    });

    setTimeout(() => navigate("/auth"), 1800);
  };

  const isResetDisabled =
    code.length < 4 ||
    !passwordValidation.isValid ||
    !passwordsMatch;

  return (
    <AuthSplitLayout>
      <div className="space-y-6">
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al login
        </Link>

        <AnimatePresence mode="wait">
          {/* ── PHASE 1: Email request ── */}
          {phase === "request" && (
            <motion.div
              key="request"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Recuperar Acceso</h2>
                <p className="text-sm text-muted-foreground">
                  Introduce el email asociado a tu cuenta de{" "}
                  <span className="text-foreground font-medium">Q-Proof Systems</span>.
                </p>
              </div>

              <form onSubmit={handleRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recovery-email" className="text-sm">Email</Label>
                  <Input
                    id="recovery-email"
                    type="email"
                    placeholder="tu@email.com"
                    className="bg-background"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Enviando…
                    </span>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Enviar instrucciones
                    </>
                  )}
                </Button>
              </form>

              {/* Generic privacy-safe message shown during loading */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed"
                >
                  Si existe una cuenta asociada a este correo, recibirás un código de
                  verificación en unos instantes.
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── PHASE 2: Verify code + new password ── */}
          {phase === "reset" && (
            <motion.div
              key="reset"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 border border-primary/20">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight">Restablecer Contraseña</h2>
                </div>
                {/* Privacy message shown persistently in phase 2 */}
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                  Si existe una cuenta asociada a{" "}
                  <span className="font-mono text-foreground">{email || "tu correo"}</span>,
                  recibirás un código de verificación en unos instantes.
                </div>
              </div>

              <form onSubmit={handleReset} className="space-y-4">
                {/* Verification code */}
                <div className="space-y-2">
                  <Label htmlFor="verify-code" className="text-sm">Código de Verificación</Label>
                  <Input
                    id="verify-code"
                    placeholder="A1B2C3"
                    maxLength={8}
                    className={cn(
                      "bg-background font-mono tracking-widest text-center text-lg",
                      submitAttempted && code.length < 4 && "border-destructive focus-visible:ring-destructive"
                    )}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                  {submitAttempted && code.length < 4 && (
                    <p className="text-xs text-destructive">Introduce el código recibido.</p>
                  )}
                </div>

                {/* New password */}
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm">Nueva Contraseña Maestra</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNew ? "text" : "password"}
                      placeholder="••••••••••••"
                      className={cn(
                        "bg-background pr-10",
                        submitAttempted && !passwordValidation.isValid
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      )}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setSubmitAttempted(false);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={newPassword} />
                  {submitAttempted && !passwordValidation.isValid && (
                    <p className="text-xs text-destructive font-medium">
                      La contraseña debe contener mayúscula, minúscula y número.
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/70 font-mono">
                    Mínimo 12 caracteres · Usada para derivar clave AES-256
                  </p>
                </div>

                {/* Confirm new password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password" className="text-sm">Confirmar Nueva Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirm-new-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••••••"
                      className={cn(
                        "bg-background pr-10",
                        confirmPassword.length > 0 && (passwordsMatch
                          ? "border-emerald-500 focus-visible:ring-emerald-500"
                          : "border-destructive focus-visible:ring-destructive")
                      )}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <p className={cn(
                      "text-xs font-medium",
                      passwordsMatch ? "text-emerald-500" : "text-destructive"
                    )}>
                      {passwordsMatch ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
                    </p>
                  )}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={isResetDisabled}
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Actualizar Contraseña
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-muted-foreground">
          ¿Recordaste tu contraseña?{" "}
          <Link to="/auth" className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
};

export default AuthRecovery;
