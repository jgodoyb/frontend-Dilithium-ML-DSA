import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle,
  Download,
  RotateCcw,
  AlertCircle,
  Shield,
  Hexagon,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { validatePdf } from "@/lib/validatePdf";
import { supabase } from "@/integrations/supabase/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { calculateHashFromBytes } from "@/lib/crypto";


const SIGN_MATH_TERMS = ["Sign(sk, M)", "y ← S1", "w1 = HighBits(A·y)", "c = H(μ || w1)", "z = y + c·s1", "Rejection Sample", "Lattice K=4, L=4"];
const SIGN_PARTICLES = Array.from({ length: 25 }).map((_, i) => ({
  id: i,
  text: SIGN_MATH_TERMS[i % SIGN_MATH_TERMS.length],
  x: Math.random() * 100,
  delay: Math.random() * 10,
  duration: 15 + Math.random() * 15,
  scale: 0.5 + Math.random() * 0.8,
  rotate: (Math.random() - 0.5) * 45
}));

type SignState = "idle" | "error" | "ready" | "processing" | "success";

interface SelectedFile {
  name: string;
  size: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}

const SignatureHub = () => {
  const [state, setState] = useState<SignState>("idle");
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [signatureB64, setSignatureB64] = useState<string | null>(null);
  const [signedPdfBytes, setSignedPdfBytes] = useState<Uint8Array | null>(null);
  const [signerId, setSignerId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = useCallback(
    async (f: File) => {
      // SECURITY: Magic-bytes validation — do NOT rely on extension or MIME type alone.
      const result = await validatePdf(f);
      if (!result.valid) {
        setState("error");
        toast({
          variant: "destructive",
          title: "Archivo no válido",
          description: result.reason ?? "Por favor, sube únicamente archivos PDF.",
        });
        setTimeout(() => setState("idle"), 2000);
        return;
      }
      setRawFile(f);
      setFile({ name: f.name, size: formatBytes(f.size) });
      setState("ready");
    },
    [toast]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback(() => setDragActive(false), []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) handleFile(e.target.files[0]);
      e.target.value = "";
    },
    [handleFile]
  );

  const handleSign = useCallback(async () => {
    if (!rawFile) return;

    setState("processing");
    setProgress(0);
    setSignatureB64(null);

    try {
      // 1. Get the current Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No hay sesión activa. Por favor, inicia sesión de nuevo.");
      }
      setSignerId(session.user.id);

      // --- PDF VISUAL STAMP MANIPULATION ---
      const meta = session.user.user_metadata;
      const fullName = (meta?.first_name || meta?.last_name) 
        ? `${meta.first_name ?? ""} ${meta.last_name ?? ""}`.trim()
        : (meta?.full_name || "Usuario Firmante");
      const arrayBuffer = await rawFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const verifyUrl = `${window.location.origin}/dashboard/verify`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 150 });
      
      // Decodificar Base64 manualmente para evitar el bloqueo CSP de fetch() en URIs data:
      const base64Data = qrDataUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const qrImageBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        qrImageBytes[i] = binaryString.charCodeAt(i);
      }
      
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      
      const pages = pdfDoc.getPages();
      const firstPage = pages[0]; // Footer oficial usualmente va en la 1º o en todas, lo aplicamos a la principal
      const { width } = firstPage.getSize();
      
      // LAYOUT - PIE DE FIRMA (Estilo CSV)
      const margin = 30;
      const bottomY = 20;
      const qrSize = 65;
      const tableWidth = width - (margin * 2) - qrSize - 5;
      const row1H = 15;
      const row2H = 15;
      const row3H = 20;
      const row4H = 15;
      const tableHeight = row1H + row2H + row3H + row4H;
      
      // Caja Principal
      firstPage.drawRectangle({
        x: margin, y: bottomY, width: tableWidth, height: tableHeight,
        borderColor: rgb(0, 0, 0), borderWidth: 1, color: rgb(1, 1, 1)
      });
      
      // Fondo Cabecera (Fila 1)
      firstPage.drawRectangle({
        x: margin, y: bottomY + tableHeight - row1H, width: tableWidth, height: row1H,
        color: rgb(0.85, 0.85, 0.85)
      });
      
      // Líneas Horizontales Separadoras
      const drawLineH = (yOffset: number) => {
        firstPage.drawLine({
          start: { x: margin, y: bottomY + yOffset },
          end: { x: margin + tableWidth, y: bottomY + yOffset },
          thickness: 1, color: rgb(0,0,0)
        });
      };
      drawLineH(tableHeight - row1H);
      drawLineH(tableHeight - row1H - row2H);
      drawLineH(row4H);
      
      // Líneas Verticales (Fila 1 y 2)
      const col1W = tableWidth * 0.45;
      const col2W = tableWidth * 0.25;
      const drawLineVTop = (xOffset: number) => {
        firstPage.drawLine({
          start: { x: margin + xOffset, y: bottomY + tableHeight },
          end: { x: margin + xOffset, y: bottomY + tableHeight - row1H - row2H },
          thickness: 1, color: rgb(0,0,0)
        });
      };
      drawLineVTop(col1W);
      drawLineVTop(col1W + col2W);
      
      // Trazado de Texto
      const now = new Date();
      // -- Fila 1 (Cabeceras)
      firstPage.drawText("Firmado Por / Signed By", { x: margin + 5, y: bottomY + tableHeight - 11, size: 8, font: fontBold, color: rgb(0,0,0) });
      firstPage.drawText("Estado / Status", { x: margin + col1W + 5, y: bottomY + tableHeight - 11, size: 8, font: fontBold, color: rgb(0,0,0) });
      firstPage.drawText("Fecha y hora / Date and Time", { x: margin + col1W + col2W + 5, y: bottomY + tableHeight - 11, size: 8, font: fontBold, color: rgb(0,0,0) });
      
      // -- Fila 2 (Valores)
      firstPage.drawText(fullName, { x: margin + 5, y: bottomY + tableHeight - row1H - 11, size: 8, font: font, color: rgb(0,0,0) });
      firstPage.drawText("Firmado (ML-DSA)", { x: margin + col1W + 5, y: bottomY + tableHeight - row1H - 11, size: 8, font: font, color: rgb(0,0,0) });
      firstPage.drawText(now.toLocaleString(), { x: margin + col1W + col2W + 5, y: bottomY + tableHeight - row1H - 11, size: 8, font: font, color: rgb(0,0,0) });
      
      // -- Fila 3 (Legales / Info)
      const r3Txt1 = "Este documento ha sido firmado digitalmente por la persona mencionada. La plataforma tecnológica";
      const r3Txt2 = `Q-Proof certifica dicha firma post-cuántica (NIST FIPS-204) a efectos de garantizar su integridad.`;
      firstPage.drawText(r3Txt1, { x: margin + 5, y: bottomY + row4H + 11, size: 6, font: font, color: rgb(0,0,0) });
      firstPage.drawText(r3Txt2, { x: margin + 5, y: bottomY + row4H + 3, size: 6, font: font, color: rgb(0,0,0) });
      
      // -- Fila 4 (Verificador y Paginación)
      const colPageW = tableWidth * 0.78;
      firstPage.drawLine({
        start: { x: margin + colPageW, y: bottomY + row4H },
        end: { x: margin + colPageW, y: bottomY },
        thickness: 1, color: rgb(0,0,0)
      });
      firstPage.drawText(`Verificador / Verifier: ${verifyUrl}`, { x: margin + 5, y: bottomY + 5, size: 7, font: font, color: rgb(0.1, 0.1, 0.5) });
      firstPage.drawText(`Página / Page: 1/${pages.length}`, { x: margin + colPageW + 5, y: bottomY + 5, size: 7, font: fontBold, color: rgb(0,0,0) });
      
      // Caja Código QR lateral
      firstPage.drawRectangle({
        x: margin + tableWidth + 5, y: bottomY, width: qrSize, height: tableHeight,
        borderColor: rgb(0,0,0), borderWidth: 1, color: rgb(1,1,1)
      });
      firstPage.drawImage(qrImage, {
        x: margin + tableWidth + 5 + 5, y: bottomY + 5, width: 55, height: 55
      });
      
      const modifiedPdfBytes = await pdfDoc.save();
      const modifiedPdfBlob = new Blob([modifiedPdfBytes as any], { type: "application/pdf" });
      // -------------------------------------

      // 2. Atomic check and log activity
      // This will check the limit, subtract the operation and log the activity in one step
      const { data: usageResult, error: usageError } = await (supabase as any).rpc(
        'check_and_log_activity',
        {
          p_action_type: 'sign',
          p_file_name: rawFile.name
        }
      );

      if (usageError) throw usageError;
      if (!usageResult.success) {
        toast({
          variant: "destructive",
          title: "Límite alcanzado",
          description: usageResult.error || "Has agotado tus operaciones. Actualiza tu plan.",
        });
        setState("ready");
        return;
      }


      const apiUrl = import.meta.env.VITE_API_URL;
      const documentHashHex = await calculateHashFromBytes(modifiedPdfBytes);

      const response = await fetch(`${apiUrl}/api/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ document_hash: documentHashHex }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new Error("No se encontró tu clave privada. Asegúrate de haber generado tus claves primero.");
        }
        throw new Error(errorData.detail ?? `Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      setSignatureB64(data.signature_b64);
      setSignedPdfBytes(modifiedPdfBytes);
      setState("success");
    } catch (err: any) {
      setState("ready");
      toast({
        variant: "destructive",
        title: "Error al firmar",
        description: err.message ?? "No se pudo contactar con el servidor.",
      });
    }
  }, [rawFile, toast]);

  // Animated progress while processing (visual feedback during real fetch)
  useEffect(() => {
    if (state !== "processing") return;
    let frame: number;
    const start = Date.now();
    // Cap at 92% so it never "completes" before the real response arrives
    const duration = 5000;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(92, (elapsed / duration) * 92);
      setProgress(pct);
      if (pct < 92) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state]);

  // When success arrives, jump progress to 100%
  useEffect(() => {
    if (state === "success") {
      setProgress(100);
    }
  }, [state]);

  const reset = useCallback(() => {
    setState("idle");
    setFile(null);
    setRawFile(null);
    setProgress(0);
    setSignatureB64(null);
    setSignerId(null);
  }, []);

  const handleDownload = useCallback(() => {
    if (!signatureB64 || !file || !signerId || !signedPdfBytes) return;

    // Crear JSON como un "sobre" estructurado
    const envelope = {
      signer_id: signerId,
      signature_b64: signatureB64
    };
    const jsonString = "\n<QPROOF>" + JSON.stringify(envelope) + "</QPROOF>\n";
    const envelopeBytes = new TextEncoder().encode(jsonString);
    
    // Concatenar el PDF visual con el Envelope secreto al final del archivo (EOF Trick)
    const finalBytes = new Uint8Array(signedPdfBytes.length + envelopeBytes.length);
    finalBytes.set(signedPdfBytes, 0);
    finalBytes.set(envelopeBytes, signedPdfBytes.length);
    
    const blob = new Blob([finalBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.replace(/\.pdf$/i, "-signed.pdf");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Descarga iniciada",
      description: a.download,
    });
  }, [signatureB64, file, signerId, signedPdfBytes, toast]);

  const signedName = file?.name.replace(/\.pdf$/i, "-signed.pdf") ?? "";

  /* ---- border color per state ---- */
  const borderClass =
    state === "error"
      ? "border-red-500/70 shadow-[0_0_30px_rgba(239,68,68,0.3)] bg-red-500/5"
      : dragActive
        ? "border-[#0e7490] shadow-[0_0_30px_rgba(14,116,144,0.3)] bg-[#0e7490]/10"
        : "border-white/10 hover:border-white/30 bg-black hover:bg-white/5";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#030303] text-white flex flex-col lg:flex-row w-full overflow-hidden">
      
      {/* Left Magic Asset Panel */}
      <div className="hidden lg:flex flex-col justify-center items-center w-5/12 lg:min-w-[450px] relative border-r border-white/5 bg-[#080808]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0e7490]/5 via-transparent to-transparent opacity-100 pointer-events-none" />
        
        {/* CSS-based Abstract Key Visual */}
        <div className="relative w-full h-full flex items-center justify-center">
          
          {/* Floating Fantasia Math Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {SIGN_PARTICLES.map((p) => (
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
            animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-72 h-72 bg-[#0e7490] rounded-full blur-[120px] mix-blend-screen" 
          />
          {/* Circular rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute w-[20rem] h-[20rem] rounded-full border border-dashed border-[#0e7490]/20" 
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
              className="absolute w-[26rem] h-[26rem] rounded-full border-[2px] border-dotted border-[#0e7490]/30 drop-shadow-[0_0_15px_rgba(14,116,144,0.4)]" 
            />
          </div>
          
          {/* Centerpiece */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, type: "spring", bounce: 0.4 }}
            className="relative z-10 w-44 h-44 flex items-center justify-center"
          >
            <div className="absolute w-full h-full border border-[#0e7490]/30 rotate-45 rounded-3xl bg-black/60 backdrop-blur-xl overflow-hidden shadow-[0_0_60px_rgba(14,116,144,0.3)]">
               <motion.div 
                 animate={{ opacity: [0.4, 0.8, 0.4] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                 className="absolute inset-0 bg-gradient-to-br from-[#0e7490]/30 to-transparent" 
               />
            </div>
            
            <KeyRound className="w-16 h-16 text-white relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]" strokeWidth={1.5} />
          </motion.div>
        </div>
        <div className="absolute bottom-8 left-8 text-[10px] font-mono text-[#0e7490] tracking-[0.2em] uppercase z-20">
          SYS.SIGN_NODE_v2.0<br/>
          <span className="text-white/40">FIPS 204 Lattice Cryptography</span>
        </div>
      </div>

      {/* Right Content Panel */}
      <div className="flex-1 w-full flex flex-col items-center justify-center px-4 md:px-8 py-16 gap-12 relative overflow-y-auto">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#0e7490]/10 blur-[120px] rounded-full mix-blend-screen" />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 max-w-xl relative z-10 mt-8"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <Hexagon className="w-8 h-8 text-[#0e7490]" />
          </div>
          <h1 className="text-3xl md:text-5xl font-light tracking-tight text-white mb-2">
            Signature <span className="text-[#0e7490] font-bold">Hub</span>
          </h1>
          <p className="text-sm md:text-base text-slate-400 font-light leading-relaxed max-w-md mx-auto">
            Sella tus documentos digitalmente con resistencia cuántica{" "}
            <span className="font-mono text-white text-[11px] px-2 py-0.5 border border-white/10 rounded-full bg-white/5 ml-1 inline-flex items-center">
              ML-DSA-65
            </span>.
          </p>
        </motion.div>

        {/* Dropzone */}
        <motion.div
          layout
          className={`relative w-full max-w-xl rounded-2xl border transition-all duration-500 overflow-hidden group ${borderClass}`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent opacity-50 pointer-events-none" />
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={onInputChange}
          />

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => state === "idle" && inputRef.current?.click()}
            className={`p-10 sm:p-14 flex flex-col items-center justify-center gap-4 min-h-[280px] relative z-10 ${state === "idle" ? "cursor-pointer" : ""
              }`}
          >
            <AnimatePresence mode="wait">
              {/* -------- IDLE -------- */}
              {state === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center gap-4 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner">
                    <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400 group-hover:text-white transition-colors">
                      Subir Documento
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono tracking-wider">
                      DRAG & DROP O CLIC (.PDF MÁX 100MB)
                    </p>
                  </div>
                </motion.div>
              )}

              {/* -------- ERROR -------- */}
              {state === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center gap-4 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <p className="text-xs tracking-widest uppercase font-bold text-red-500">
                    Formato no permitido
                  </p>
                </motion.div>
              )}

              {/* -------- READY -------- */}
              {state === "ready" && file && (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-5 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-[#0e7490]/20 border border-[#0e7490]/50 flex items-center justify-center shadow-[0_0_20px_rgba(14,116,144,0.4)]">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-bold text-sm truncate max-w-[280px]">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono tracking-widest">{file.size}</p>
                  </div>
                </motion.div>
              )}

              {/* -------- PROCESSING -------- */}
              {state === "processing" && file && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center gap-6 w-full text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-[#0e7490]/20 border border-[#0e7490]/50 flex items-center justify-center shadow-[0_0_20px_rgba(14,116,144,0.4)]">
                    <Loader2 className="w-6 h-6 text-[#0e7490] animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-white text-[11px] tracking-widest uppercase font-bold">
                      Construyendo Matriz Cuántica...
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {file.name}
                    </p>
                  </div>
                  <div className="w-full max-w-xs space-y-1.5 opacity-80">
                    <Progress value={progress} className="h-1 bg-white/10" />
                    <p className="text-[10px] text-[#0e7490] font-mono text-right font-bold tracking-widest">
                      {Math.round(progress)}%
                    </p>
                  </div>
                </motion.div>
              )}

              {/* -------- SUCCESS -------- */}
              {state === "success" && file && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-5 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-emerald-400 font-bold text-sm tracking-wide">
                      DOCUMENTO SELLADO
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Firma ML-DSA-65 aplicada y entrelazada con el documento
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Action buttons outside the dropzone */}
        <AnimatePresence mode="popLayout">
          {state === "ready" && (
            <motion.div
              layout
              key="btn-sign"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="w-full flex justify-center mt-2 max-w-xl"
            >
              <Button 
                size="lg" 
                onClick={handleSign} 
                className="relative overflow-hidden w-full max-w-sm bg-gradient-to-r from-[#0e7490] via-cyan-500 to-[#0e7490] bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white h-14 text-[11px] uppercase tracking-[0.2em] font-extrabold shadow-[0_0_20px_rgba(14,116,144,0.3)] hover:shadow-[0_0_40px_rgba(14,116,144,0.5)] hover:-translate-y-0.5 rounded-full border-none"
              >
                <Shield className="w-4 h-4 mr-3" />
                Aplicar Sello Criptográfico
              </Button>
            </motion.div>
          )}

          {state === "success" && (
            <motion.div
              layout
              key="btn-success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center gap-4 w-full max-w-sm mt-2"
            >
              <Button 
                size="lg" 
                onClick={handleDownload} 
                className="relative overflow-hidden w-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white h-14 text-[11px] uppercase tracking-[0.2em] font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 rounded-full border-none"
              >
                <Download className="w-4 h-4 mr-3" />
                Descargar Archivo Firmado
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                onClick={reset} 
                className="gap-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full px-6 text-[11px] uppercase tracking-[0.2em] font-extrabold h-12 transition-all w-full"
              >
                <RotateCcw className="w-4 h-4" />
                Firmar Otro Documento
              </Button>
            </motion.div>
          )}
        </AnimatePresence>


      </div>
    </div>
  );
};

export default SignatureHub;
