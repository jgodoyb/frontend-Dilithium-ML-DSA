import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  UserX,
  UploadCloud,
  FileText,
  KeyRound,
  Loader2,
  RotateCcw,
  Search,
  Hexagon,
  CheckCircle2,
  XCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { validatePdf } from "@/lib/validatePdf";
import { sanitizeSignerId } from "@/lib/security";
import { supabase } from "@/integrations/supabase/client";
import { calculateHashFromBytes } from "@/lib/crypto";

const VERIFY_MATH_TERMS = ["Verify(pk, M, σ)", "μ = CRH(tr)", "w1' = HighBits", "c' = H(μ || w1')", "||z|| < γ1 - β", "A·z - c·t", "Lattice N=256"];
const VERIFY_PARTICLES = Array.from({ length: 25 }).map((_, i) => ({
  id: i,
  text: VERIFY_MATH_TERMS[i % VERIFY_MATH_TERMS.length],
  x: Math.random() * 100,
  delay: Math.random() * 10,
  duration: 15 + Math.random() * 15,
  scale: 0.5 + Math.random() * 0.8,
  rotate: (Math.random() - 0.5) * 45
}));

/* ───── types ───── */
type VerifyState = "idle" | "verifying" | "valid" | "invalid" | "not-found";

interface SelectedFile {
  name: string;
  size: string;
  raw: File;
}

function fmt(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}

/* ───── reusable mini-dropzone ───── */
interface MiniDropzoneProps {
  label: string;
  accept: string;
  ext: string;
  icon: React.ReactNode;
  file: SelectedFile | null;
  onFile: (f: File) => void;
  onRemove?: () => void;
  errorFlash: boolean;
}

const MiniDropzone = ({
  label,
  accept,
  ext,
  icon,
  file,
  onFile,
  onRemove,
  errorFlash,
}: MiniDropzoneProps) => {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const borderColor = errorFlash
    ? "border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)] bg-red-500/5"
    : drag
      ? "border-[#0e7490] shadow-[0_0_30px_rgba(14,116,144,0.3)] bg-[#0e7490]/10"
      : file
        ? "border-white/20 bg-white/5"
        : "border-white/10 hover:border-white/30 bg-black hover:bg-white/5";

  return (
    <div className="space-y-4">
      <Label className="text-[11px] font-mono text-slate-400 uppercase tracking-[0.2em] font-medium ml-1">
        {label}
      </Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files?.[0]) onFile(e.dataTransfer.files[0]);
        }}
        onClick={() => ref.current?.click()}
        className={`relative cursor-pointer rounded-2xl border transition-all duration-500 p-8 flex flex-col items-center gap-4 min-h-[160px] justify-center overflow-hidden ${borderColor} group`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent opacity-50 pointer-events-none" />
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) onFile(e.target.files[0]);
            e.target.value = "";
          }}
        />
        {file ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 text-center relative z-10"
          >
            <div className="w-14 h-14 rounded-full bg-[#0e7490]/20 border border-[#0e7490]/50 flex items-center justify-center shadow-[0_0_20px_rgba(14,116,144,0.4)]">
              {icon}
            </div>
            <p className="text-sm font-bold text-white truncate max-w-[280px]">
              {file.name}
            </p>
            <p className="text-[11px] text-slate-500 font-mono tracking-widest">{file.size}</p>
            
            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="mt-1 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-xs font-medium flex items-center gap-1.5 transition-all shadow-md hover:scale-105 active:scale-95"
                title="Eliminar archivo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Quitar archivo</span>
              </button>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center relative z-10">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner">
              <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold group-hover:text-white transition-colors">
              Subir Evidencia PDF
            </p>
            <p className="text-[10px] font-mono text-slate-500 tracking-wider">
              DRAG & DROP O CLIC
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ───── result cards ───── */
const resultConfig = {
  valid: {
    icon: CheckCircle2,
    badgeText: "DOCUMENTO VÁLIDO",
    badgeClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    title: "Firma Criptográfica Auténtica",
    statusText: "Integridad Verificada 100%",
  },
  invalid: {
    icon: XCircle,
    badgeText: "ALTERACIÓN DETECTADA",
    badgeClass: "text-red-400 bg-red-500/10 border-red-500/20",
    title: "El Documento ha sido Modificado",
    statusText: "Firma Inválida o Incompatible",
  },
  "not-found": {
    icon: UserX,
    badgeText: "IDENTIDAD NO REGISTRADA",
    badgeClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    title: "Firmante No Encontrado",
    statusText: "Registro no vinculado",
  },
} as const;

const ResultCard = ({
  type,
  signerEmail,
  onReset,
}: {
  type: "valid" | "invalid" | "not-found";
  signerEmail?: string | null;
  onReset: () => void;
}) => {
  const c = resultConfig[type];
  const Icon = c.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xl mx-auto text-left space-y-6 pt-2"
    >
      {/* Top Header Label */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono tracking-widest uppercase font-semibold ${c.badgeClass}`}>
          <Icon className="w-3.5 h-3.5" />
          <span>{c.badgeText}</span>
        </div>
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">NIST FIPS 204</span>
      </div>

      {/* Main Title & Status */}
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
          {c.title}
        </h2>
        <p className="text-xs text-slate-400 font-mono tracking-wider">
          {c.statusText}
        </p>
      </div>

      {/* Corporate Metadata Rows (Accenture Style minimal rows, no nested cards) */}
      {type === "valid" && signerEmail && (
        <div className="border-t border-b border-white/10 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block mb-1">
                Firmante Autorizado
              </span>
              <span className="text-sm font-semibold text-white font-mono break-all">
                {signerEmail}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block mb-1">
                Algoritmo Criptográfico
              </span>
              <span className="text-xs text-cyan-400 font-mono">
                ML-DSA-65 (Lattice)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Clean Corporate Action Button */}
      <div className="pt-2">
        <Button
          onClick={onReset}
          className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 h-12 rounded-xl text-xs font-mono tracking-wider uppercase transition-all flex items-center justify-center gap-2 px-6"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Auditar Otro Documento</span>
        </Button>
      </div>
    </motion.div>
  );
};

/* ═══════════════════ MAIN ═══════════════════ */

const VerificationCenter = () => {
  const [state, setState] = useState<VerifyState>("idle");
  const [signerEmail, setSignerEmail] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<SelectedFile | null>(null);
  const [docError, setDocError] = useState(false);
  const { toast } = useToast();

  const allFieldsFilled = !!docFile;

  /* ── file handlers ── */
  const handleDoc = useCallback(
    async (f: File) => {
      const result = await validatePdf(f);
      if (!result.valid) {
        setDocError(true);
        toast({
          variant: "destructive",
          title: "Archivo no válido",
          description: result.reason ?? "El documento debe ser un PDF auténtico.",
        });
        setTimeout(() => setDocError(false), 1200);
        return;
      }
      setDocFile({ name: f.name, size: fmt(f.size), raw: f });
    },
    [toast],
  );

  /* ── verify action ── */
  const handleVerify = useCallback(async () => {
    if (!docFile) return;

    setState("verifying");

    try {
      // 1. Leer el archivo PDF subido a memoria como ArrayBuffer
      const arrayBuffer = await docFile.raw.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      const jsonStartMarker = "\n<QPROOF>";
      const markerBytes = new TextEncoder().encode(jsonStartMarker);
      
      // Buscar el marcador de firma hacia atrás
      let markerIndex = -1;
      for (let i = bytes.length - markerBytes.length; i >= 0; i--) {
        let found = true;
        for (let j = 0; j < markerBytes.length; j++) {
          if (bytes[i + j] !== markerBytes[j]) {
            found = false;
            break;
          }
        }
        if (found) {
          markerIndex = i;
          break;
        }
      }

      if (markerIndex === -1) {
        // Si el usuario modifica el archivo en un editor (ej. dibujar una raya), 
        // el editor de PDF reescribe el archivo y destruye toda la basura del EOF (incluido nuestro sello).
        // Esto indica intrínsecamente que el documento ha sido alterado y la firma destruida.
        setState("invalid");
        return;
      }

      // Separar el PDF original matemático de los metadatos inyectados.
      const cleanPdfBytes = bytes.slice(0, markerIndex);
      
      const textDecoder = new TextDecoder();
      const jsonStrChunk = textDecoder.decode(bytes.slice(markerIndex));
      
      const match = jsonStrChunk.match(/<QPROOF>([\s\S]*?)<\/QPROOF>/);
      if (!match) {
        setState("invalid");
        return;
      }
      
      let envelope;
      try {
        envelope = JSON.parse(match[1]);
      } catch (e) {
        setState("invalid");
        return;
      }

      if (!envelope.signer_id || !envelope.signature_b64) {
        setState("invalid");
        return;
      }

      // 2. Lookup author's public key by user_id instead of email
      const { data: userData, error: userError } = await (supabase as any)
        .from("crypto_identities")
        .select("public_key, email")
        .eq("user_id", envelope.signer_id)
        .maybeSingle();

      if (userError || !userData?.public_key) {
        console.error("User/Key not found:", userError);
        setState("not-found");
        return;
      }

      // 3. Calcular hash SHA-256 de los bytes limpios del PDF
      const documentHashHex = await calculateHashFromBytes(cleanPdfBytes);

      // 4. Call backend /api/verify
      const apiUrl = import.meta.env.VITE_API_URL;

      const response = await fetch(`${apiUrl}/api/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          document_hash: documentHashHex,
          signature_b64: envelope.signature_b64,
          public_key: userData.public_key
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.is_valid) {
        setSignerEmail(userData.email || "Usuario Desconocido");
        setState("valid");
      } else {
        setState("invalid");
      }

    } catch (err: any) {
      console.error("Verification error:", err);
      setState("idle");
      toast({
        variant: "destructive",
        title: "Error de verificación",
        description: err.message ?? "No se pudo conectar con el servidor.",
      });
    }
  }, [docFile, toast]);

  /* ── reset ── */
  const reset = useCallback(() => {
    setState("idle");
    setSignerEmail(null);
    setDocFile(null);
  }, []);

  const isResult = state === "valid" || state === "invalid" || state === "not-found";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#030303] text-white flex flex-col lg:flex-row w-full overflow-hidden">
      {/* Left Magic Asset Panel */}
      <div className="hidden lg:flex flex-col justify-center items-center w-5/12 lg:min-w-[450px] relative border-r border-white/5 bg-[#080808]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0e7490]/5 via-transparent to-transparent opacity-100 pointer-events-none" />
        
        {/* CSS-based Abstract Node Visual */}
        <div className="relative w-full h-full flex items-center justify-center">
          
          {/* Floating Fantasia Math Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {VERIFY_PARTICLES.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, top: "110%", left: `${p.x}%`, scale: p.scale, rotate: 0 }}
                animate={{ opacity: [0, 0.6, 0], top: "-10%", rotate: p.rotate }}
                transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "linear" }}
                className="absolute text-[#0e7490]/80 font-mono text-[10px] tracking-widest whitespace-nowrap mix-blend-screen drop-shadow-[0_0_10px_rgba(14,116,144,0.8)]"
              >
                {p.text}
              </motion.div>
            ))}
          </div>

          {/* Main glowing orb */}
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-64 h-64 bg-[#0e7490] rounded-full blur-[100px] mix-blend-screen" 
          />
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_40%,transparent_100%)]" />
          
          {/* Hexagon & Shield intersection */}
          <motion.div 
            initial={{ rotate: -15, opacity: 0, scale: 0.8 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, type: "spring", bounce: 0.4 }}
            className="relative z-10 w-56 h-56 border border-white/10 rounded-2xl flex items-center justify-center bg-black/40 backdrop-blur-xl overflow-hidden"
          >
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-br from-[#0e7490]/20 to-transparent" 
            />
            
            {/* Inner rotating dash ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute w-[140%] h-[140%] border-[2px] border-dashed border-[#0e7490]/30 rounded-full"
            />
            {/* Counter rotating glow ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute w-[110%] h-[110%] border border-[#0e7490]/40 rounded-full drop-shadow-[0_0_15px_rgba(14,116,144,0.5)]"
            />
            
            <ShieldCheck className="w-16 h-16 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]" strokeWidth={1.5} />
          </motion.div>
        </div>
        <div className="absolute bottom-8 left-8 text-[10px] font-mono text-[#0e7490] tracking-[0.2em] uppercase z-20">
          SYS.VERIFY_NODE_v1.4<br/>
          <span className="text-white/40">Quantum Safe Ready</span>
        </div>
      </div>

      {/* Right Content Panel */}
      <div className="flex-1 w-full flex flex-col items-center justify-center px-4 md:px-8 py-16 gap-12 relative overflow-y-auto">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#0e7490]/10 blur-[120px] rounded-full mix-blend-screen" />
        </div>

      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4 max-w-xl relative z-10 mt-8"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <Hexagon className="w-8 h-8 text-[#0e7490]" />
        </div>
        <h1 className="text-3xl md:text-5xl font-light tracking-tight text-white mb-2">
          Auditoría de <span className="text-[#0e7490] font-bold">Firmas</span>
        </h1>
        <p className="text-sm md:text-base text-slate-400 font-light leading-relaxed max-w-md mx-auto">
          Plataforma de verificación institucional para documentos blindados con criptografía{" "}
          <span className="font-mono text-white text-[11px] px-2 py-0.5 border border-white/10 rounded-full bg-white/5 ml-1 inline-flex items-center">
            NIST FIPS 204
          </span>.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!isResult && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-xl space-y-6"
          >
            <div className="flex justify-center max-w-md mx-auto">
              <div className="w-full">
                <MiniDropzone
                  label="Documento Firmado"
                  accept=".pdf,application/pdf"
                  ext=".pdf"
                  icon={<FileText className="w-5 h-5 text-primary" />}
                  file={docFile}
                  onFile={handleDoc}
                  onRemove={() => setDocFile(null)}
                  errorFlash={docError}
                />
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                disabled={!allFieldsFilled || state === "verifying"}
                onClick={handleVerify}
                className="relative overflow-hidden w-full max-w-sm bg-gradient-to-r from-[#0e7490] via-cyan-500 to-[#0e7490] bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white h-14 text-[11px] uppercase tracking-[0.2em] font-extrabold shadow-[0_0_20px_rgba(14,116,144,0.3)] hover:shadow-[0_0_40px_rgba(14,116,144,0.5)] hover:-translate-y-0.5 rounded-full border-none"
              >
                {state === "verifying" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-3" />
                    Analizando Nodos...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-3" />
                    Ejecutar Verificación
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {isResult && (
            <ResultCard key="result" type={state as "valid" | "invalid" | "not-found"} signerEmail={signerEmail} onReset={reset} />
          )}
        </AnimatePresence>
      </AnimatePresence>

      </div>
    </div>
  );
};

export default VerificationCenter;
