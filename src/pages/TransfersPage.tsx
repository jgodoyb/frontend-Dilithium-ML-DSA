import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  Inbox,
  Send,
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
  Download,
  Eye,
  FileText,
  ArrowRight,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  FileCheck2,
  User,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { validatePdf } from "@/lib/validatePdf";
import { sendEncryptedDocument } from "@/services/documentTransferService";
import {
  getPendingDocuments,
  getSentDocuments,
  getDecryptedDocumentWithUrl,
  rejectPendingDocument,
  deletePendingDocument,
  PendingDocumentItem,
  SentDocumentItem,
} from "@/services/inboxService";
import {
  getUserContacts,
  ContactIdentity,
} from "@/services/contactService";

export default function TransfersPage() {
  const { supabaseUser, isAuthenticated, isLoading: authLoading } = useMockAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Protección de ruta a nivel componente
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth?mode=login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Subtab para documentos: 'received' | 'send' | 'sent'
  const [docSubTab, setDocSubTab] = useState<"received" | "send" | "sent">("received");

  // Estado de Documentos
  const [pendingDocs, setPendingDocs] = useState<PendingDocumentItem[]>([]);
  const [sentDocs, setSentDocs] = useState<SentDocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [decryptingId, setDecryptingId] = useState<string | null>(null);

  // Estado para Nuevo Envío Cifrado
  const [sendFile, setSendFile] = useState<File | null>(null);
  const [sendDragActive, setSendDragActive] = useState(false);
  const [sendRecipientId, setSendRecipientId] = useState<string>("");
  const [sending, setSending] = useState(false);
  const sendFileInputRef = useRef<HTMLInputElement>(null);

  // Estado del visor de revisión de documento descifrado
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PendingDocumentItem | null>(null);
  const [decryptedFile, setDecryptedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Estado para rechazo
  const [rejecting, setRejecting] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  // Estado para descartar / eliminar documento pendiente
  const [docToDiscard, setDocToDiscard] = useState<PendingDocumentItem | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  // Estado de Contactos (utilizado para destinatarios en envíos)
  const [contacts, setContacts] = useState<ContactIdentity[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
  }

  const validateAndSetSendFile = async (f: File) => {
    const result = await validatePdf(f);
    if (!result.valid) {
      toast({
        variant: "destructive",
        title: "Archivo no válido",
        description: result.reason ?? "Por favor, sube únicamente archivos PDF válidos.",
      });
      return;
    }
    setSendFile(f);
  };

  const handleSendFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setSendDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      validateAndSetSendFile(e.dataTransfer.files[0]);
    }
  };

  const handleSendDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setSendDragActive(true);
  };

  const handleSendDragLeave = () => {
    setSendDragActive(false);
  };

  const handleSendFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      validateAndSetSendFile(e.target.files[0]);
    }
    e.target.value = "";
  };

  const handleEncryptAndSendDoc = async () => {
    if (!supabaseUser?.id) return;
    if (!sendFile) {
      toast({
        variant: "destructive",
        title: "Archivo requerido",
        description: "Por favor, selecciona un archivo PDF para enviar.",
      });
      return;
    }
    if (!sendRecipientId) {
      toast({
        variant: "destructive",
        title: "Destinatario no seleccionado",
        description: "Por favor, selecciona un contacto seguro de la lista.",
      });
      return;
    }

    const recipient = contacts.find((c) => c.user_id === sendRecipientId);
    if (!recipient) {
      toast({
        variant: "destructive",
        title: "Destinatario no válido",
        description: "No se encontró el contacto seleccionado o carece de clave pública KEM.",
      });
      return;
    }

    setSending(true);
    try {
      await sendEncryptedDocument({
        senderId: supabaseUser.id,
        recipient,
        file: sendFile,
      });

      const recipientLabel = recipient.full_name || recipient.email;
      toast({
        title: "¡Documento Cifrado y Enviado!",
        description: `Documento encapsulado con ML-KEM-768 y depositado en almacenamiento seguro para ${recipientLabel}.`,
      });

      setSendFile(null);
      setSendRecipientId("");
      await loadDocuments();
      setDocSubTab("sent");
    } catch (err: unknown) {
      console.error("Error al enviar documento cifrado:", err);
      toast({
        variant: "destructive",
        title: "Error al enviar documento cifrado",
        description: err instanceof Error ? err.message : "No se pudo completar el proceso de cifrado.",
      });
    } finally {
      setSending(false);
    }
  };

  // 1. Cargar Documentos (Recibidos y Enviados)
  const loadDocuments = useCallback(async () => {
    if (!supabaseUser?.id) return;
    setLoadingDocs(true);
    try {
      const [pending, sent] = await Promise.all([
        getPendingDocuments(supabaseUser.id),
        getSentDocuments(supabaseUser.id),
      ]);
      setPendingDocs(pending);
      setSentDocs(sent);
    } catch (err: unknown) {
      console.error("Error al cargar documentos:", err);
      toast({
        variant: "destructive",
        title: "Error al sincronizar documentos",
        description: err instanceof Error ? err.message : "Fallo de conexión.",
      });
    } finally {
      setLoadingDocs(false);
    }
  }, [supabaseUser?.id, toast]);

  // 2. Cargar Contactos
  const loadContacts = useCallback(async () => {
    if (!supabaseUser?.id) return;
    setLoadingContacts(true);
    try {
      const data = await getUserContacts(supabaseUser.id);
      setContacts(data);
      if (data.length > 0) {
        setSendRecipientId((prev) => prev || data[0].user_id);
      }
    } catch (err: unknown) {
      console.error("Error al cargar contactos:", err);
      toast({
        variant: "destructive",
        title: "Error al cargar contactos",
        description: err instanceof Error ? err.message : "Fallo de conexión.",
      });
    } finally {
      setLoadingContacts(false);
    }
  }, [supabaseUser?.id, toast]);

  useEffect(() => {
    if (supabaseUser?.id) {
      loadDocuments();
      loadContacts();
    }
  }, [supabaseUser?.id, loadDocuments, loadContacts]);


  // 4. Descifrar y Abrir Modal de Revisión (usando caché en memoria de sesión)
  const handleDecryptAndReview = async (doc: PendingDocumentItem) => {
    if (!supabaseUser?.id) return;

    setDecryptingId(doc.id);
    try {
      const { file, objectUrl } = await getDecryptedDocumentWithUrl(doc, supabaseUser.id);

      setDecryptedFile(file);
      setSelectedDoc(doc);
      setPreviewUrl(objectUrl);
      setReviewModalOpen(true);
    } catch (err: unknown) {
      console.error("Error al descifrar:", err);
      toast({
        variant: "destructive",
        title: "Fallo al descifrar",
        description: err instanceof Error ? err.message : "Error durante la desencapsulación KEM.",
      });
    } finally {
      setDecryptingId(null);
    }
  };

  // 5. Descargar PDF Descifrado
  const handleDownloadDecrypted = () => {
    if (!previewUrl || !selectedDoc) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = selectedDoc.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: "Descarga iniciada",
      description: `Guardando ${selectedDoc.file_name}`,
    });
  };

  // 6. Firmar Ahora con Dilithium (redirige al SignatureHub precargando el archivo)
  const handleProceedToSign = () => {
    if (!decryptedFile || !selectedDoc) return;

    const fileToPass = decryptedFile;
    const docId = selectedDoc.id;

    setReviewModalOpen(false);
    navigate("/dashboard/sign", {
      state: {
        incomingFile: fileToPass,
        pendingDocId: docId,
      },
    });
  };

  // 7. Descartar / Eliminar Solicitud de Documento Pendiente
  const handleConfirmDiscard = async () => {
    if (!docToDiscard) return;
    setDiscarding(true);
    try {
      await deletePendingDocument(docToDiscard.id, docToDiscard.storage_path);
      toast({
        title: "Documento descartado",
        description: `Se ha descartado la solicitud "${docToDiscard.file_name}".`,
      });
      setDiscardDialogOpen(false);
      setDocToDiscard(null);
      if (reviewModalOpen && selectedDoc?.id === docToDiscard.id) {
        setReviewModalOpen(false);
      }
      await loadDocuments();
    } catch (err: unknown) {
      console.error("Error al descartar documento:", err);
      toast({
        variant: "destructive",
        title: "Error al descartar documento",
        description: err instanceof Error ? err.message : "No se pudo descartar el documento.",
      });
    } finally {
      setDiscarding(false);
    }
  };

  // 8. Rechazar Documento Pendiente (alternativa desde modal)
  const handleRejectDocument = async () => {
    if (!selectedDoc) return;
    setRejecting(true);
    try {
      await rejectPendingDocument(selectedDoc.id, selectedDoc.storage_path);
      toast({
        title: "Documento rechazado",
        description: `Se ha marcado "${selectedDoc.file_name}" como rechazado.`,
      });
      setRejectDialogOpen(false);
      setReviewModalOpen(false);
      await loadDocuments();
    } catch (err: unknown) {
      console.error("Error al rechazar documento:", err);
      toast({
        variant: "destructive",
        title: "Error al rechazar documento",
        description: "No se pudo actualizar el estado del documento.",
      });
    } finally {
      setRejecting(false);
    }
  };


  // Guarda visual mientras se verifica autenticación
  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-[#030303]">
        <div className="flex flex-col items-center gap-4 text-cyan-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#0e7490]" />
          <p className="text-xs font-mono tracking-widest uppercase text-slate-400">
            Verificando identidad cuántica...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#030303] text-white py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Glow ambiental */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-[#0e7490]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Cabecera Principal */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-cyan-400">
              <ArrowLeftRight className="w-5 h-5" />
              <span className="text-[11px] font-mono tracking-[0.25em] uppercase font-bold">
                Centro de Enlace Seguro
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
              Transferencias & <span className="text-[#0e7490] font-bold">Contactos</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Buzón cifrado con ML-KEM-768 (FIPS 203) y directorio de identidades seguras para intercambio punto a punto.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-cyan-950/40 text-cyan-400 border-cyan-500/30 text-[10px] font-mono py-1 px-2.5 gap-1.5">
              <Lock className="w-3 h-3 text-cyan-400" />
              ML-KEM-768 ACTIVO
            </Badge>
            <Badge className="bg-emerald-950/40 text-emerald-400 border-emerald-500/30 text-[10px] font-mono py-1 px-2.5 gap-1.5">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              DILITHIUM LISTO
            </Badge>
          </div>
        </div>

        {/* Gestión Documental: Recibidos, Envíos e Historial */}
        <div className="space-y-6">
          {/* Sub-selector: Recibidos | Nuevo Envío Cifrado | Historial de Envíos */}
          <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={docSubTab === "received" ? "default" : "ghost"}
                  onClick={() => setDocSubTab("received")}
                  className={`text-xs rounded-xl h-8 px-4 gap-2 ${
                    docSubTab === "received"
                      ? "bg-white/10 text-cyan-300 border border-cyan-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Documentos Recibidos</span>
                  {pendingDocs.length > 0 && (
                    <span className="bg-cyan-500 text-black text-[9px] font-bold rounded-full px-1.5 py-0.2">
                      {pendingDocs.length}
                    </span>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant={docSubTab === "send" ? "default" : "ghost"}
                  onClick={() => setDocSubTab("send")}
                  className={`text-xs rounded-xl h-8 px-4 gap-2 ${
                    docSubTab === "send"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Nuevo Envío Cifrado</span>
                  <Badge className="bg-cyan-950/60 text-cyan-400 border-cyan-500/30 text-[9px] font-mono px-1.5 py-0">
                    ML-KEM
                  </Badge>
                </Button>

                <Button
                  size="sm"
                  variant={docSubTab === "sent" ? "default" : "ghost"}
                  onClick={() => setDocSubTab("sent")}
                  className={`text-xs rounded-xl h-8 px-4 gap-2 ${
                    docSubTab === "sent"
                      ? "bg-white/10 text-cyan-300 border border-cyan-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Historial de Envíos</span>
                  <span className="text-[10px] text-slate-500">({sentDocs.length})</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {docSubTab !== "send" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDocSubTab("send")}
                    className="h-8 text-xs border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/30 gap-1.5 rounded-xl hidden sm:flex"
                  >
                    <Send className="w-3 h-3 text-cyan-400" />
                    <span>Redactar Envío</span>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadDocuments}
                  disabled={loadingDocs}
                  className="h-8 text-xs text-slate-400 hover:text-white gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Actualizar</span>
                </Button>
              </div>
            </div>

            {/* Subvista: Recibidos */}
            {docSubTab === "received" && (
              <div className="space-y-4">
                {loadingDocs ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                    <p className="text-xs font-mono">Consultando buzón cifrado...</p>
                  </div>
                ) : pendingDocs.length === 0 ? (
                  <Card className="border border-dashed border-white/10 bg-white/[0.01] rounded-2xl py-16 text-center">
                    <CardContent className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                        <FileCheck2 className="w-6 h-6 opacity-60" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white">Bandeja al día</p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          No tienes documentos pendientes de descifrado ni firma en este momento.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {pendingDocs.map((doc) => {
                      const isDecrypting = decryptingId === doc.id;
                      const senderDisplay = doc.sender_name || doc.sender_email || "Remitente Anónimo";
                      const dateDisplay = new Date(doc.created_at).toLocaleString();

                      return (
                        <Card
                          key={doc.id}
                          className="border border-white/10 bg-[#090a0f] hover:border-cyan-500/30 transition-all rounded-2xl p-5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4 min-w-0">
                              <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-400 shrink-0">
                                <FileText className="w-6 h-6" />
                              </div>
                              <div className="min-w-0 space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-md">
                                    {doc.file_name}
                                  </h3>
                                  <Badge className="bg-cyan-950/40 text-cyan-400 border-cyan-500/30 text-[9px] font-mono">
                                    ML-KEM-768
                                  </Badge>
                                  <Badge className="bg-amber-950/40 text-amber-400 border-amber-500/30 text-[9px] font-mono">
                                    Pendiente
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-slate-400 font-mono flex-wrap">
                                  <span className="flex items-center gap-1.5 text-slate-300">
                                    <User className="w-3.5 h-3.5 text-[#0e7490]" />
                                    <span>Remitente: <strong>{senderDisplay}</strong></span>
                                  </span>
                                  <span className="flex items-center gap-1 text-slate-500">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{dateDisplay}</span>
                                  </span>
                                </div>

                                <p className="text-[10px] font-mono text-slate-500 truncate max-w-lg">
                                  SHA-256: {doc.document_hash}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setDocToDiscard(doc);
                                  setDiscardDialogOpen(true);
                                }}
                                className="h-10 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all border border-white/5 hover:border-red-500/30 gap-1.5"
                                title="Eliminar / Descartar Solicitud"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                                <span className="hidden sm:inline text-xs">Descartar</span>
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleDecryptAndReview(doc)}
                                disabled={isDecrypting || (decryptingId !== null && !isDecrypting)}
                                className="bg-[#0e7490] hover:bg-cyan-500 text-white font-bold text-xs h-10 px-5 rounded-xl gap-2 shadow-[0_0_15px_rgba(14,116,144,0.3)] transition-all"
                              >
                                {isDecrypting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Descifrando KEM...</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4" />
                                    <span>Descifrar y Revisar</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Subvista: Nuevo Envío Cifrado */}
            {docSubTab === "send" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Card className="border border-white/10 bg-[#090a0f] rounded-2xl overflow-hidden shadow-2xl relative">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 blur-[100px] pointer-events-none rounded-full" />
                  
                  <CardHeader className="border-b border-white/5 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
                            <Lock className="w-4 h-4" />
                          </div>
                          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                            Nuevo Envío Cifrado
                            <Badge className="bg-cyan-950/60 text-cyan-400 border-cyan-500/30 text-[10px] font-mono">
                              ML-KEM-768 (FIPS 203)
                            </Badge>
                          </CardTitle>
                        </div>
                        <CardDescription className="text-xs text-slate-400">
                          Encapsula y cifra un documento PDF punto a punto usando la clave pública Kyber del contacto seleccionado. Solo el receptor con su clave privada podrá descifrarlo.
                        </CardDescription>
                      </div>

                      <Badge className="bg-emerald-950/40 text-emerald-400 border-emerald-500/30 text-[10px] font-mono self-start sm:self-auto py-1 px-2.5 gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        AES-256-GCM + KEM
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* 1. Selección de archivo PDF */}
                    <div className="space-y-2">
                      <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        1. Archivo PDF a Cifrar
                      </label>

                      {!sendFile ? (
                        <div
                          onDrop={handleSendFileDrop}
                          onDragOver={handleSendDragOver}
                          onDragLeave={handleSendDragLeave}
                          onClick={() => sendFileInputRef.current?.click()}
                          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer group ${
                            sendDragActive
                              ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_30px_rgba(6,182,212,0.2)]"
                              : "border-white/10 hover:border-cyan-500/40 bg-white/[0.01] hover:bg-white/[0.03]"
                          }`}
                        >
                          <input
                            ref={sendFileInputRef}
                            type="file"
                            accept=".pdf,application/pdf"
                            className="hidden"
                            onChange={handleSendFileInput}
                          />
                          <div className="w-14 h-14 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-7 h-7" />
                          </div>
                          <p className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                            Haz clic o arrastra un archivo PDF aquí
                          </p>
                          <p className="text-xs text-slate-500 font-mono mt-1">
                            Solo formato .PDF estándar (máx 20MB)
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-cyan-500/30 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate max-w-md">
                                {sendFile.name}
                              </p>
                              <p className="text-xs text-slate-400 font-mono">
                                {formatBytes(sendFile.size)} • PDF Validado
                              </p>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSendFile(null)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl h-9 px-3 gap-1.5 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline text-xs">Cambiar Archivo</span>
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* 2. Selección de Destinatario */}
                    <div className="space-y-2">
                      <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        2. Destinatario Seguro
                      </label>

                      {loadingContacts ? (
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center gap-2 text-slate-400 text-xs">
                          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                          <span>Cargando contactos seguros...</span>
                        </div>
                      ) : contacts.length === 0 ? (
                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-3">
                          <p className="text-sm text-slate-300 font-medium">
                            No tienes contactos seguros vinculados todavía
                          </p>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Para enviar un documento cifrado necesitas vincularte primero mediante un código OTP de conexión.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate("/identity")}
                            className="text-xs border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/30 gap-2 h-9 rounded-xl"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Ir a Mi Identidad para Vincular
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <Select value={sendRecipientId} onValueChange={setSendRecipientId}>
                            <SelectTrigger className="w-full bg-black/60 border-white/15 h-12 text-xs rounded-xl focus:ring-cyan-500">
                              <SelectValue placeholder="Selecciona un destinatario de tu lista de contactos..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0b0c10] border-white/10 text-white">
                              {contacts.map((c) => (
                                <SelectItem key={c.user_id} value={c.user_id} className="text-xs focus:bg-white/5">
                                  <div className="flex items-center gap-2 py-0.5">
                                    <span className="font-semibold text-white">{c.full_name || c.email}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">({c.email})</span>
                                    <Badge className="bg-emerald-950/40 text-emerald-400 border-emerald-500/30 text-[9px] font-mono ml-auto">
                                      ML-KEM Activo
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* 3. Botón de Acción */}
                    <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-cyan-500/70" />
                        <span>Cifrado híbrido post-cuántico (NIST FIPS 203)</span>
                      </div>

                      <Button
                        size="lg"
                        onClick={handleEncryptAndSendDoc}
                        disabled={!sendFile || !sendRecipientId || sending}
                        className="w-full sm:w-auto bg-gradient-to-r from-[#0e7490] via-cyan-500 to-[#0e7490] bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white h-12 px-8 text-xs font-bold uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(14,116,144,0.3)] hover:shadow-[0_0_30px_rgba(14,116,144,0.5)] gap-2 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {sending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Cifrando con ML-KEM-768 y Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Cifrar con ML-KEM-768 y Enviar</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Subvista: Enviados */}
            {docSubTab === "sent" && (
              <div className="space-y-4">
                {loadingDocs ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                    <p className="text-xs font-mono">Cargando envíos...</p>
                  </div>
                ) : sentDocs.length === 0 ? (
                  <Card className="border border-dashed border-white/10 bg-white/[0.01] rounded-2xl py-16 text-center">
                    <CardContent className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                        <Send className="w-6 h-6 opacity-60" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white">No hay transferencias enviadas</p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Puedes cifrar y enviar un documento a cualquier contacto seguro con su clave pública ML-KEM-768.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setDocSubTab("send")}
                        className="text-xs rounded-xl bg-[#0e7490] hover:bg-cyan-500 text-white gap-2 mt-2 shadow-[0_0_15px_rgba(14,116,144,0.3)]"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Nuevo Envío Cifrado</span>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {sentDocs.map((item) => {
                      const recipientLabel = item.recipient_name || item.recipient_email || "Destinatario Seguro";
                      const dateDisplay = new Date(item.created_at).toLocaleString();

                      const statusBadge =
                        item.status === "signed" ? (
                          <Badge className="bg-emerald-950/40 text-emerald-400 border-emerald-500/30 text-[9px] font-mono gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Firmado
                          </Badge>
                        ) : item.status === "rejected" ? (
                          <Badge className="bg-red-950/40 text-red-400 border-red-500/30 text-[9px] font-mono gap-1">
                            <XCircle className="w-2.5 h-2.5" />
                            Rechazado
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-950/40 text-amber-400 border-amber-500/30 text-[9px] font-mono gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Pendiente
                          </Badge>
                        );

                      return (
                        <Card
                          key={item.id}
                          className="border border-white/10 bg-[#090a0f] rounded-2xl p-5 hover:border-white/20 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4 min-w-0">
                              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 shrink-0">
                                <Send className="w-5 h-5 text-cyan-400" />
                              </div>
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-bold text-white truncate max-w-md">
                                    {item.file_name}
                                  </h3>
                                  {statusBadge}
                                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[9px] font-mono">
                                    ML-KEM-768
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-slate-400 font-mono flex-wrap">
                                  <span>Destinatario: <strong className="text-white">{recipientLabel}</strong></span>
                                  <span>{dateDisplay}</span>
                                </div>

                                <p className="text-[10px] font-mono text-slate-500 truncate max-w-lg">
                                  SHA-256: {item.document_hash}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate("/dashboard/sign")}
                                className="text-xs border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white rounded-xl h-9 gap-1.5"
                              >
                                <span>Nuevo Envío</span>
                                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Overlay de carga durante el descifrado KEM en segundo plano */}
      {decryptingId && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-6 text-center animate-in fade-in duration-200">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-[#0e7490]/20 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(14,116,144,0.5)]">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-ping" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <p className="text-base font-bold text-white tracking-wide">
              Descifrando documento con ML-KEM-768...
            </p>
            <p className="text-xs font-mono text-slate-400">
              Desencapsulando secreto compartido FIPS 203 y recuperando binario original.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE REVISIÓN Y PREVISUALIZACIÓN DE DOCUMENTO DESCIFRADO              */}
      {/* ========================================================================= */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="bg-[#07080c] border border-cyan-500/30 text-white shadow-[0_0_60px_rgba(0,0,0,0.9)] p-0 overflow-hidden sm:rounded-2xl w-[96vw] max-w-7xl h-[94vh] max-h-[96vh] flex flex-col focus:outline-none z-50">
          {selectedDoc && previewUrl && (
            <div className="flex flex-col h-full w-full overflow-hidden">
              {/* Header Superior STICKY con Botón de Firma ML-DSA Principal */}
              <div className="sticky top-0 z-50 p-4 sm:px-6 border-b border-white/10 bg-[#090a0f]/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-base sm:text-lg font-bold text-white truncate max-w-xs sm:max-w-md lg:max-w-xl">
                        {selectedDoc.file_name}
                      </DialogTitle>
                      <Badge className="bg-emerald-950/60 text-emerald-300 border-emerald-500/40 text-[10px] font-mono gap-1 py-0.5 px-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ML-KEM-768 Descifrado
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-300">
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        <span>De: <strong>{selectedDoc.sender_name || selectedDoc.sender_email || "Remitente"}</strong></span>
                      </span>
                      <span className="text-[11px] text-slate-500 hidden sm:inline">
                        • SHA-256: {selectedDoc.document_hash.slice(0, 16)}...
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones del Header Superior: Descargar, Pestaña y FIRMA DESTACADA */}
                <div className="flex items-center gap-2.5 ml-auto shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadDecrypted}
                    className="text-xs border-white/15 bg-white/[0.03] hover:bg-cyan-950/30 text-slate-300 hover:text-cyan-300 gap-1.5 h-10 px-3.5 rounded-xl"
                    title="Descargar copia del PDF descifrado"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span className="hidden sm:inline">Descargar PDF</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => window.open(previewUrl, "_blank")}
                    variant="outline"
                    className="h-10 px-3 text-xs border-white/15 bg-white/[0.03] text-slate-300 hover:text-white rounded-xl gap-1.5 hidden md:flex"
                    title="Abrir en pestaña nueva"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>

                  {/* BOTÓN PRINCIPAL DE FIRMA - ULTRA DESTACADO Y VISIBLE */}
                  <Button
                    size="default"
                    onClick={handleProceedToSign}
                    className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm h-11 px-5 sm:px-6 rounded-xl shadow-[0_0_30px_rgba(52,211,153,0.55)] gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all border border-emerald-300/50"
                  >
                    <ShieldCheck className="w-5 h-5 text-slate-950" />
                    <span className="font-extrabold tracking-wide">Firmar Documento Ahora (ML-DSA)</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </Button>
                </div>
              </div>

              {/* Visor PDF Iframe con flex-1 */}
              <div className="flex-1 w-full min-h-0 bg-[#040406] p-2 sm:p-4 relative">
                <div className="w-full h-full rounded-xl border border-white/10 overflow-hidden bg-slate-950 shadow-inner">
                  <iframe
                    src={`${previewUrl}#toolbar=0`}
                    title={`Vista previa de ${selectedDoc.file_name}`}
                    className="w-full h-full border-none"
                  />
                </div>
              </div>

              {/* Footer Inferior */}
              <div className="p-3 sm:px-6 bg-[#07080c] border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReviewModalOpen(false)}
                    className="text-xs text-slate-400 hover:text-white h-9 px-3"
                  >
                    Cerrar Visor
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDocToDiscard(selectedDoc);
                      setDiscardDialogOpen(true);
                    }}
                    className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5 h-9 px-3"
                    title="Eliminar / Descartar Solicitud"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Eliminar / Descartar Solicitud</span>
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                    SHA-256 verificado • Listo para estampar ML-DSA-65
                  </span>
                  <Button
                    size="sm"
                    onClick={handleProceedToSign}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 rounded-lg gap-1.5 shadow-md md:hidden"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Firmar Ahora</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación para Eliminar / Descartar Solicitud */}
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent className="bg-[#0b0c10] border-red-500/30 text-white max-w-md sm:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              ¿Eliminar / Descartar Solicitud?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-400 leading-relaxed">
              El documento <span className="text-white font-mono font-medium">"{docToDiscard?.file_name}"</span> será descartado y eliminado de tu bandeja de transferencias pendientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-white/5 border-white/10 text-xs text-slate-300 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscard}
              disabled={discarding}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-1.5"
            >
              {discarding ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Descartando...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Solicitud</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
