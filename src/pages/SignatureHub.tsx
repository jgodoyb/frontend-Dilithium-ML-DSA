import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Trash2,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { validatePdf } from "@/lib/validatePdf";
import { supabase } from "@/integrations/supabase/client";
import { markDocumentAsSigned } from "@/services/inboxService";
import { PDFDocument } from "pdf-lib";
import { findLastXrefOffset, findLastEofPosition } from "@/lib/PDFScanner";
import { findLastPageObject, parseXrefTable } from "@/lib/PDFParser";
import { generateAppearanceStream } from "@/lib/PDFAppearance";
import { prepareVisualSignatureUpdate } from "@/lib/PDFInjector";
import { extractSignableBytes, injectSignatureHex, base64ToHex, bytesToHex } from "@/lib/PDFSigner";

const SIGN_MATH_TERMS = [
  "Sign(sk, M)",
  "y ← S1",
  "w1 = HighBits(A·y)",
  "c = H(μ || w1)",
  "z = y + c·s1",
  "Rejection Sample",
  "Lattice K=4, L=4",
];
const SIGN_PARTICLES = Array.from({ length: 25 }).map((_, i) => ({
  id: i,
  text: SIGN_MATH_TERMS[i % SIGN_MATH_TERMS.length],
  x: Math.random() * 100,
  delay: Math.random() * 10,
  duration: 15 + Math.random() * 15,
  scale: 0.5 + Math.random() * 0.8,
  rotate: (Math.random() - 0.5) * 45,
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

/**
 * Normaliza un buffer PDF utilizando pdf-lib para garantizar una estructura limpia
 * con tablas XRef de texto plano estándar (desactivando object streams / xref streams comprimidos de PDF 1.5+).
 */
async function normalizePdfBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const savedBytes = await doc.save({ useObjectStreams: false });
  return (savedBytes.buffer as ArrayBuffer).slice(savedBytes.byteOffset, savedBytes.byteOffset + savedBytes.byteLength);
}

const SignatureHub = () => {
  const [state, setState] = useState<SignState>("idle");
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [signedPdfBytes, setSignedPdfBytes] = useState<Uint8Array | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Estados para documentos transferidos recibidos
  const [activePendingDocId, setActivePendingDocId] = useState<string | null>(null);
  const [activeStoragePath, setActiveStoragePath] = useState<string | null>(null);
  const [, setActiveDocName] = useState<string | null>(null);
  const [activeSenderName, setActiveSenderName] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

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

  // Escuchar si viene un documento descifrado desde la Bandeja de Entrada (vía location.state)
  useEffect(() => {
    const locState = location.state as {
      incomingFile?: File;
      pendingDocId?: string;
      storagePath?: string;
      docName?: string;
      senderName?: string;
    } | null;
    if (locState?.incomingFile) {
      handleFile(locState.incomingFile);
      if (locState.pendingDocId) {
        setActivePendingDocId(locState.pendingDocId);
      }
      if (locState.storagePath) {
        setActiveStoragePath(locState.storagePath);
      }
      if (locState.docName) {
        setActiveDocName(locState.docName);
      }
      if (locState.senderName) {
        setActiveSenderName(locState.senderName);
      }
      // Limpiar el estado de navegación para evitar recargas accidentales al refrescar
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, handleFile, navigate, location.pathname]);

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
    setSignedPdfBytes(null);

    try {
      // 1. Obtener la sesión activa de Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No hay sesión activa. Por favor, inicia sesión de nuevo.");
      }

      // 2. Comprobación atómica y registro de cuotas de usuario
      const { data: usageResult, error: usageError } = await (supabase as any).rpc(
        "check_and_log_activity",
        {
          p_action_type: "sign",
          p_file_name: rawFile.name,
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

      // 3. Metadatos del firmante
      const meta = session.user.user_metadata;
      const fullName =
        meta?.first_name || meta?.last_name
          ? `${meta.first_name ?? ""} ${meta.last_name ?? ""}`.trim()
          : meta?.full_name || "Usuario Firmante";

      // 4. Lectura binaria directa del PDF original
      const rawBuffer = await rawFile.arrayBuffer();

      // Detección de firmas previas en el documento binario
      const decoder = new TextDecoder("latin1");
      const rawString = decoder.decode(new Uint8Array(rawBuffer));
      const byteRangeMatches = rawString.match(/\/ByteRange\s*\[/g);
      const isAlreadySigned = byteRangeMatches !== null && byteRangeMatches.length > 0;

      // =========================================================================
      // MOTOR DE FIRMA VISUAL INCREMENTAL ISO 32000 CON HOJA DE FIRMAS DINÁMICA
      // =========================================================================

      let workingBuffer: ArrayBuffer = rawBuffer;
      let lastXrefOffset: number;
      let lastEofPos: number;
      let lastPageInfo: ReturnType<typeof findLastPageObject>;
      let xrefMap: Map<number, number>;

      try {
        // Intento 1: Escaneo binario y parseo directo sobre el buffer actual
        lastXrefOffset = findLastXrefOffset(workingBuffer);
        lastEofPos = findLastEofPosition(workingBuffer);
        lastPageInfo = findLastPageObject(workingBuffer, lastXrefOffset);
        xrefMap = parseXrefTable(workingBuffer, lastXrefOffset);
      } catch (scanErr) {
        // Normalización con pdf-lib ÚNICAMENTE si no tiene firmas previas
        if (!isAlreadySigned) {
          console.warn("PDF no firmado con XRef comprimida/compleja. Normalizando a XRef plana...", scanErr);
          workingBuffer = await normalizePdfBuffer(workingBuffer);
          lastXrefOffset = findLastXrefOffset(workingBuffer);
          lastEofPos = findLastEofPosition(workingBuffer);
          lastPageInfo = findLastPageObject(workingBuffer, lastXrefOffset);
          xrefMap = parseXrefTable(workingBuffer, lastXrefOffset);
        } else {
          throw new Error(
            `No se pudo leer la estructura del PDF multifirmado: ${scanErr instanceof Error ? scanErr.message : String(scanErr)
            }`
          );
        }
      }

      // 5. Detección o Creación de Hoja de Firmas y Apilamiento Vertical Descendente
      const isSignatureSheet = lastPageInfo.isSignatureSheet;
      const createNewSignatureSheet = !isSignatureSheet;

      // Si ya es una Hoja de Firmas, apilamos hacia abajo según las firmas existentes en ella
      const prevSigsOnSheet = createNewSignatureSheet ? 0 : lastPageInfo.signatureCountOnSheet;

      const mediaBox = lastPageInfo.pageMediaBox ?? [0, 0, 595.28, 841.89];
      const pageWidth = mediaBox[2] - mediaBox[0];
      const pageHeight = mediaBox[3] - mediaBox[1];

      // Geometría del sello institucional en la Hoja de Firmas
      const stampWidth = Math.min(495, pageWidth - 80);
      const stampHeight = 65;
      const gap = 12;
      const leftMargin = Math.round((pageWidth - stampWidth) / 2);

      // Apilamiento vertical hacia abajo: la cabecera ocupa los primeros ~88pt desde arriba
      const topStartY = pageHeight - 105;
      const currentTopY = topStartY - prevSigsOnSheet * (stampHeight + gap);
      const currentBottomY = currentTopY - stampHeight;

      const widgetRect = [
        leftMargin,
        Math.max(50, Math.round(currentBottomY)),
        leftMargin + stampWidth,
        Math.max(50 + stampHeight, Math.round(currentTopY)),
      ];

      // 6. Cálculo dinámico de IDs de objeto para blindaje contra colisiones ISO 32000
      const maxObjNumber = xrefMap.size > 0 ? Math.max(...xrefMap.keys()) : 900;
      let nextId = maxObjNumber + 1;
      let sheetContentObjNumber: number | undefined;
      let newPageObjNumber: number | undefined;

      if (createNewSignatureSheet) {
        sheetContentObjNumber = nextId++;
        newPageObjNumber = nextId++;
      }
      const widgetObjNumber = nextId++;
      const apObjNumber = nextId++;
      const sigObjectNumber = nextId++;

      // 7. Generación del Appearance Stream Form XObject estructurado
      const now = new Date();
      const dateFormatted = now.toISOString().replace("T", " ").substring(0, 19) + " UTC";
      const stampText = `Firmado por: ${fullName}\nFecha: ${dateFormatted}\nAlgoritmo: ML-DSA-65 (NIST FIPS-204)\nID de Certificación: ${session.user.id}`;
      const apStreamText = generateAppearanceStream(
        apObjNumber,
        stampWidth,
        stampHeight,
        stampText
      );

      // 8. Preparación incremental multi-objeto ISO 32000 sobre workingBuffer
      const uniqueFieldName = `Signature_${Date.now()}`;

      const prepared = prepareVisualSignatureUpdate(
        workingBuffer,
        lastXrefOffset,
        lastEofPos,
        createNewSignatureSheet ? (newPageObjNumber as number) : lastPageInfo.pageObjNumber,
        createNewSignatureSheet ? "" : lastPageInfo.existingAnnots,
        apStreamText,
        widgetRect,
        session.user.id,
        fullName,
        {
          fieldName: uniqueFieldName,
          pageDict: createNewSignatureSheet ? undefined : lastPageInfo.pageDict,
          createNewSignatureSheet,
          pagesRootObjNumber: lastPageInfo.pagesRootObjNum,
          pagesRootDict: lastPageInfo.pagesRootDict,
          pagesCount: lastPageInfo.pagesCount,
          kids: lastPageInfo.kids,
          newPageObjNumber,
          sheetContentObjNumber,
          mediaBox,
          widgetObjNumber,
          apObjNumber,
          sigObjectNumber,
          placeholderBytes: 8192,
          signingDate: now,
          reason: "Certificación de firma digital post-cuántica (NIST FIPS 204)",
          location: "Q-Proof Systems",
        }
      );

      // 9. Extracción de bytes firmables y hasheo SHA-256
      const signableBytes = extractSignableBytes(prepared.preparedPdfBuffer, prepared.byteRange);
      const hashBuffer = await crypto.subtle.digest("SHA-256", signableBytes as BufferSource);
      const documentHashHex = bytesToHex(new Uint8Array(hashBuffer));

      // 10. Petición al Backend (/api/sign) y Sello Criptográfico
      const apiUrl = import.meta.env.VITE_API_URL;
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
      const signatureHex = base64ToHex(data.signature_b64);

      // Inyección exacta de la firma en el placeholder de /Contents
      const finalSignedBuffer = injectSignatureHex(
        prepared.preparedPdfBuffer,
        prepared.contentsOffset,
        prepared.contentsHexLength,
        signatureHex
      );

      const finalSignedPdfBytes = new Uint8Array(finalSignedBuffer);
      setSignedPdfBytes(finalSignedPdfBytes);
      setState("success");

      // Si el documento provino de la bandeja de entrada cifrada, actualizar a 'signed' (Requerimiento 1)
      if (activePendingDocId) {
        try {
          await markDocumentAsSigned(activePendingDocId, activeStoragePath || undefined);
          setActivePendingDocId(null);
          setActiveStoragePath(null);
          setActiveDocName(null);
          setActiveSenderName(null);
        } catch (markErr) {
          console.error("Error al marcar documento como firmado:", markErr);
        }
      }
    } catch (err: any) {
      setState("ready");
      toast({
        variant: "destructive",
        title: "Error al firmar",
        description: err.message ?? "No se pudo contactar con el servidor.",
      });
    }
  }, [rawFile, toast, activePendingDocId, activeStoragePath]);

  // Animated progress while processing (visual feedback during real fetch)
  useEffect(() => {
    if (state !== "processing") return;
    let frame: number;
    const start = Date.now();
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
    setSignedPdfBytes(null);
    setActivePendingDocId(null);
    setActiveStoragePath(null);
    setActiveDocName(null);
    setActiveSenderName(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  // Retirar archivo de la mesa de firma (Requerimiento 3: NUNCA se rechaza ni elimina en Supabase, se mantiene 'pending')
  const removeFile = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    setState("idle");
    setFile(null);
    setRawFile(null);
    setProgress(0);
    setSignedPdfBytes(null);
    setActivePendingDocId(null);
    setActiveStoragePath(null);
    setActiveDocName(null);
    setActiveSenderName(null);
    if (inputRef.current) inputRef.current.value = "";

  }, [activePendingDocId, toast]);



  const handleDownload = useCallback(() => {
    if (!signedPdfBytes || !file) return;

    const blob = new Blob([signedPdfBytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.replace(/\.pdf$/i, "-signed.pdf");
    document.body.appendChild(a);
    a.click();

    // Margen de gracia para permitir a WebKit (iOS/macOS) completar la lectura del Blob
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }, 60000);

    toast({
      title: "Descarga iniciada",
      description: a.download,
    });
  }, [signedPdfBytes, file, toast]);

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

            <KeyRound
              className="w-16 h-16 text-white relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]"
              strokeWidth={1.5}
            />
          </motion.div>
        </div>
        <div className="absolute bottom-8 left-8 text-[10px] font-mono text-[#0e7490] tracking-[0.2em] uppercase z-20">
          SYS.SIGN_NODE_v2.0
          <br />
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
            </span>
            .
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
                  className="flex flex-col items-center gap-4 text-center relative z-20"
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

                  {/* Indicador de documento recibido desde bandeja cifrada */}
                  {activePendingDocId && (
                    <div className="flex flex-col items-center gap-1 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-cyan-400" />
                        <span>Pendiente de Firma</span>
                      </div>
                      {activeSenderName && (
                        <span className="text-[10px] text-slate-400 font-sans">
                          Remitente: <strong className="text-cyan-200">{activeSenderName}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Botón explícito dentro del dropzone para eliminar archivo */}
                  <button
                    type="button"
                    onClick={removeFile}
                    className="mt-1 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-xs font-medium flex items-center gap-1.5 transition-all shadow-md hover:scale-105 active:scale-95"
                    title="Eliminar archivo seleccionado"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar archivo</span>
                  </button>
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
                      Generando Firma Incremental ISO 32000...
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
                    <p className="text-[11px] text-slate-400 font-mono max-w-sm">
                      Actualización incremental aplicada con firma post-cuántica ML-DSA (/Type /Sig)
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
              key="btn-actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col items-center gap-4 mt-2 max-w-xl"
            >
              {/* Botón Principal de Firma */}
              <Button
                size="lg"
                onClick={handleSign}
                className="relative overflow-hidden w-full max-w-sm bg-gradient-to-r from-[#0e7490] via-cyan-500 to-[#0e7490] bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white h-14 text-[11px] uppercase tracking-[0.2em] font-extrabold shadow-[0_0_20px_rgba(14,116,144,0.3)] hover:shadow-[0_0_40px_rgba(14,116,144,0.5)] hover:-translate-y-0.5 rounded-full border-none"
              >
                <Shield className="w-4 h-4 mr-3" />
                {activePendingDocId ? "Firmar y Sellar Documento (ML-DSA)" : "Aplicar Sello Criptográfico"}
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
              className="flex flex-col items-center gap-3 w-full max-w-sm mt-2"
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/transfers")}
                className="gap-2 text-neutral-500 hover:text-white hover:bg-white/5 rounded-full px-4 text-[10px] font-mono tracking-wider h-9 transition-all w-full"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver a Bandeja de Transferencias
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SignatureHub;
