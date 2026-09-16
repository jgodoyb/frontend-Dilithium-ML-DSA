import { Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordStrengthIndicatorProps {
  password: string;
}

export interface PasswordValidation {
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export function getPasswordValidation(password: string): PasswordValidation {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[@#$!%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  const isValid = hasUpper && hasLower && hasNumber;
  return { hasUpper, hasLower, hasNumber, hasSpecial, isValid };
}

function getStrengthLevel(validation: PasswordValidation, password: string) {
  if (!password) return { level: 0, label: "", color: "" };
  const met = [validation.hasUpper, validation.hasLower, validation.hasNumber].filter(Boolean).length;
  if (met === 3 && validation.hasSpecial) {
    return { level: 100, label: "Muy Fuerte", color: "bg-emerald-500" };
  }
  if (met === 3) {
    return { level: 66, label: "Fuerte", color: "bg-amber-400" };
  }
  return { level: 33, label: "Débil", color: "bg-destructive" };
}

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const validation = getPasswordValidation(password);
  const { level, label, color } = getStrengthLevel(validation, password);

  const requirements: PasswordRequirement[] = [
    { label: "Al menos una letra mayúscula", met: validation.hasUpper },
    { label: "Al menos una letra minúscula", met: validation.hasLower },
    { label: "Al menos un número", met: validation.hasNumber },
    { label: "Carácter especial (@, #, $, !…) — Muy Fuerte", met: validation.hasSpecial },
  ];

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-mono">Fortaleza</span>
          {label && (
            <span
              className={cn(
                "text-[11px] font-semibold font-mono",
                level === 100 && "text-emerald-500",
                level === 66 && "text-amber-400",
                level === 33 && "text-destructive",
              )}
            >
              {label}
            </span>
          )}
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full transition-all duration-500", color)}
            style={{ width: `${level}%` }}
          />
        </div>
      </div>

      {/* Requirements list */}
      <ul className="space-y-1">
        {requirements.map((req) => (
          <li key={req.label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                req.met
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                  : "border-muted-foreground/30 text-muted-foreground/40",
              )}
            >
              {req.met ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <X className="h-2.5 w-2.5" strokeWidth={3} />}
            </span>
            <span
              className={cn(
                "text-[11px] transition-colors duration-300",
                req.met ? "text-emerald-500" : "text-muted-foreground/60",
              )}
            >
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrengthIndicator;
