import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Send,
  RotateCw,
  Eye,
  Download,
  ExternalLink,
  ShieldCheck,
  UploadCloud,
  Trash2,
  ArrowRight,
} from "lucide-react";
import ColorBends from "@/components/ui/color-bends";
import WarpText from "@/components/ui/warp_text";
import {
  Dialog,
  DialogContent,
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { useTransferNotification } from "@/contexts/TransferNotificationContext";
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
  const { markTransfersAsRead } = useTransferNotification();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Al entrar en la vista de Buzón, marca los avisos como leídos y limpia el estado global
  useEffect(() => {
    markTransfersAsRead();
  }, [markTransfersAsRead]);

  // Protección de ruta a nivel componente
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth?mode=login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Pestaña activa: 'inbox' | 'history' | 'compose'
  const [activeTab, setActiveTab] = useState<"inbox" | "history" | "compose">("inbox");

  // Estado de Documentos
  const [pendingDocs, setPendingDocs] = useState<PendingDocumentItem[]>([]);
  const [sentDocs, setSentDocs] = useState<SentDocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const dismissedDocIdsRef = useRef<Set<string>>(new Set());

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

  // 1. Cargar Documentos (Recibidos y Enviados)
  const loadDocuments = useCallback(async () => {
    if (!supabaseUser?.id) return;
    setLoadingDocs(true);
    try {
      const [pending, sent] = await Promise.all([
        getPendingDocuments(supabaseUser.id),
        getSentDocuments(supabaseUser.id),
      ]);
      const filteredPending = pending.filter((d) => !dismissedDocIdsRef.current.has(d.id));
      setPendingDocs(filteredPending);
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

  // Sincronizar acción de cabecera
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadDocuments(), loadContacts()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (supabaseUser?.id) {
      loadDocuments();
      loadContacts();
    }
  }, [supabaseUser?.id, loadDocuments, loadContacts]);

  // Enviar documento cifrado
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
        title: "Documento Cifrado y Transmitido",
        description: `Encapsulado con ML-KEM-768 para ${recipientLabel}.`,
      });

      setSendFile(null);
      setSendRecipientId("");
      await loadDocuments();
      setActiveTab("history");
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

  // Descifrar y Abrir Modal de Revisión
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

  // Descargar PDF Descifrado
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

  // Redirigir a SignatureHub para firmar con Dilithium
  const handleProceedToSign = () => {
    if (!decryptedFile || !selectedDoc) return;

    const fileToPass = decryptedFile;
    const docId = selectedDoc.id;

    setReviewModalOpen(false);
    navigate("/dashboard/sign", {
      state: {
        incomingFile: fileToPass,
        pendingDocId: docId,
        storagePath: selectedDoc.storage_path,
        docName: selectedDoc.file_name,
        senderName: selectedDoc.sender_name || selectedDoc.sender_email,
      },
    });
  };

  // Descartar / Eliminar Solicitud Pendiente
  const handleConfirmDiscard = async () => {
    if (!docToDiscard) return;
    const docId = docToDiscard.id;
    const docPath = docToDiscard.storage_path;
    const docName = docToDiscard.file_name;
    dismissedDocIdsRef.current.add(docId);
    setDiscarding(true);
    try {
      // Inmediatamente remover de la lista local en memoria (Zero-latency UI)
      setPendingDocs((prev) => prev.filter((d) => d.id !== docId));
      setDiscardDialogOpen(false);
      setDocToDiscard(null);
      if (reviewModalOpen && selectedDoc?.id === docId) {
        setReviewModalOpen(false);
        setSelectedDoc(null);
      }

      await deletePendingDocument(docId, docPath);

      toast({
        title: "Documento descartado",
        description: `Se ha descartado la solicitud "${docName}".`,
      });
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

  // Rechazar Documento desde Modal de Revisión
  const handleRejectDocument = async () => {
    if (!selectedDoc) return;
    const docId = selectedDoc.id;
    const docPath = selectedDoc.storage_path;
    const docName = selectedDoc.file_name;
    dismissedDocIdsRef.current.add(docId);
    setRejecting(true);
    try {
      // Inmediatamente remover de la lista local en memoria (Zero-latency UI)
      setPendingDocs((prev) => prev.filter((d) => d.id !== docId));
      setReviewModalOpen(false);
      setSelectedDoc(null);

      await rejectPendingDocument(docId, docPath);

      toast({
        title: "Firma rechazada",
        description: `Se ha rechazado la solicitud "${docName}".`,
      });
      await loadDocuments();
    } catch (err: unknown) {
      console.error("Error al rechazar documento:", err);
      toast({
        variant: "destructive",
        title: "Error al rechazar documento",
        description: err instanceof Error ? err.message : "No se pudo actualizar el estado del documento.",
      });
    } finally {
      setRejecting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3 text-neutral-400">
          <RotateCw className="w-5 h-5 animate-spin" />
          <p className="text-xs font-mono uppercase tracking-widest text-neutral-500">
            Verificando identidad...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-transparent text-white relative z-10">
      {/* 1. Fondo de Escena (ColorBends luminoso, armónico y de flujo lento) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <ColorBends
          colors={[
            "#e5eb25ff", // Azul cobalto luminoso
            "#0d9488", // Verde azulado / teal
            "#ffffffff", // Índigo suave
            "#0284c7", // Azul cian oceánico
            "#f65c5cff", // Violeta luminoso
            "#d40606ff", // Cian etéreo
          ]}
          speed={0.20}
          intensity={7.0}
          scale={3.5}
          warpStrength={0.7}
          bandWidth={2.5}
          transparent={false}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 pb-12 relative z-10">
        {/* 2. Cabecera Editorial con WarpText */}
        <header className="mb-8">
          {/* Título animado con WarpText y botones de acción */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="w-full max-w-2xl h-16 relative flex items-center overflow-visible">
              <WarpText
                text="INTERCAMBIO SEGURO"
                color="#ffffff"
                fontSize="2.4rem"
                fontWeight={900}
                letterSpacing="-0.03em"
                lineHeight={1}
                speed={0.35}
                warpScale={1.4}
                warpStrength={0.06}
                className="w-full h-16"
              />
            </div>

            {/* Acciones principales limpias en la cabecera */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors px-3 py-2 border border-neutral-800 hover:border-neutral-600 rounded bg-neutral-950/40"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Recargar</span>
              </button>
              <button
                onClick={() => setActiveTab("compose")}
                className="text-xs font-mono uppercase tracking-wider text-black bg-white hover:bg-neutral-200 transition-colors px-4 py-2 rounded font-semibold"
              >
                + REDACTAR ENVÍO
              </button>
            </div>
          </div>

          {/* Bajada explicativa */}
          <p className="text-sm sm:text-base text-neutral-300 max-w-2xl leading-relaxed mt-3 mb-8">
            Tu espacio de seguridad personal. Aquí puedes recibir, descifrar y enviar archivos de manera 100% privada y blindada mediante criptografía post-cuántica ML-KEM-768.
          </p>
        </header>

        {/* 3. Navegación por Pestañas (Opacidad y contraste reforzado) */}
        <div className="bg-black/85 border border-neutral-800 rounded-lg backdrop-blur-xl px-5 pt-3.5 mb-6 shadow-2xl shadow-black/80">
          <nav className="border-b border-neutral-800/80 flex gap-8 text-sm font-mono overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("inbox")}
              className={`pb-2.5 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === "inbox"
                ? "border-b-2 border-white text-white font-medium -mb-[1px]"
                : "text-neutral-500 hover:text-neutral-300"
                }`}
            >
              <span>BANDEJA DE ENTRADA</span>
              {pendingDocs.length > 0 && (
                <span className="text-xs font-mono text-neutral-400">({pendingDocs.length})</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`pb-2.5 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === "history"
                ? "border-b-2 border-white text-white font-medium -mb-[1px]"
                : "text-neutral-500 hover:text-neutral-300"
                }`}
            >
              <span>HISTORIAL DE ENVÍOS</span>
              <span className="text-xs font-mono text-neutral-400">
                ({sentDocs.length} {sentDocs.length === 1 ? "REGISTRO" : "REGISTROS"})
              </span>
            </button>

            {activeTab === "compose" && (
              <button
                type="button"
                onClick={() => setActiveTab("compose")}
                className="border-b-2 border-white text-white font-medium pb-2.5 -mb-[1px] whitespace-nowrap"
              >
                <span>NUEVO ENVÍO CIFRADO</span>
              </button>
            )}
          </nav>
        </div>

        {/* 4. Estructura del Contenido (Marco nítido bg-black/85 con shadow-2xl) */}
        <div className="bg-black/85 border border-neutral-800 rounded-lg backdrop-blur-xl shadow-2xl shadow-black/80 overflow-hidden">
          {/* Subvista: Bandeja de Entrada */}
          {activeTab === "inbox" && (
            <div>
              {loadingDocs ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-500">
                  <RotateCw className="w-5 h-5 animate-spin" />
                  <span className="font-mono text-xs uppercase tracking-widest">
                    Consultando bóveda cifrada...
                  </span>
                </div>
              ) : pendingDocs.length === 0 ? (
                <div className="font-mono text-xs text-neutral-400 uppercase tracking-widest text-center py-16 px-6">
                  BANDEJA AL DÍA — NO TIENES DOCUMENTOS PENDIENTES O DE FIRMA EN ESTE MOMENTO
                </div>
              ) : (
                <div className="divide-y divide-neutral-900">
                  {pendingDocs.map((doc) => {
                    const isDecrypting = decryptingId === doc.id;
                    const senderDisplay = doc.sender_name || doc.sender_email || "Remitente Anónimo";
                    const dateDisplay = new Date(doc.created_at).toLocaleString();
                    const hashTrunc = `${doc.document_hash.slice(0, 12)}...${doc.document_hash.slice(-8)}`;

                    return (
                      <div
                        key={doc.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-900/40 transition-colors"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <FileText className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-semibold text-white truncate max-w-md">
                                {doc.file_name}
                              </span>
                              <span className="text-[10px] font-mono text-neutral-500 uppercase">
                                [PENDIENTE]
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono flex-wrap">
                              <span>
                                Remitente: <strong className="text-neutral-200">{senderDisplay}</strong>
                              </span>
                              <span className="text-neutral-600">•</span>
                              <span className="text-neutral-500">{dateDisplay}</span>
                            </div>
                            <p className="text-[11px] font-mono text-neutral-500 truncate max-w-lg">
                              SHA-256: {hashTrunc}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:self-center shrink-0">
                          <button
                            onClick={() => {
                              setDocToDiscard(doc);
                              setDiscardDialogOpen(true);
                            }}
                            className="text-neutral-500 hover:text-red-400 p-2 transition-colors rounded"
                            title="Descartar transferencia"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDecryptAndReview(doc)}
                            disabled={isDecrypting || (decryptingId !== null && !isDecrypting)}
                            className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-black bg-white hover:bg-neutral-200 disabled:opacity-50 transition-colors px-4 py-2 rounded font-semibold"
                          >
                            {isDecrypting ? (
                              <>
                                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Descifrando...</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>Descifrar & Revisar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Subvista: Historial de Envíos */}
          {activeTab === "history" && (
            <div>
              {loadingDocs ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-500">
                  <RotateCw className="w-5 h-5 animate-spin" />
                  <span className="font-mono text-xs uppercase tracking-widest">
                    Consultando registros de envíos...
                  </span>
                </div>
              ) : sentDocs.length === 0 ? (
                <div className="font-mono text-xs text-neutral-500 uppercase tracking-widest text-center py-16">
                  «Sin envíos registrados en el historial»
                </div>
              ) : (
                <div className="divide-y divide-neutral-900">
                  {sentDocs.map((item) => {
                    const recipientLabel = item.recipient_name || item.recipient_email || "Destinatario Seguro";
                    const dateDisplay = new Date(item.created_at).toLocaleString();
                    const hashTrunc = `${item.document_hash.slice(0, 12)}...${item.document_hash.slice(-8)}`;
                    const statusLabel =
                      item.status === "signed" ? "FIRMADO" : item.status === "rejected" ? "RECHAZADO" : "PENDIENTE";
                    const statusColor =
                      item.status === "signed"
                        ? "text-emerald-400"
                        : item.status === "rejected"
                          ? "text-red-400"
                          : "text-amber-400";

                    return (
                      <div
                        key={item.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-900/40 transition-colors"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <Send className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-semibold text-white truncate max-w-md">
                                {item.file_name}
                              </span>
                              <span className={`text-[10px] font-mono uppercase ${statusColor}`}>
                                [{statusLabel}]
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono flex-wrap">
                              <span>
                                Destinatario: <strong className="text-neutral-200">{recipientLabel}</strong>
                              </span>
                              <span className="text-neutral-600">•</span>
                              <span className="text-neutral-500">{dateDisplay}</span>
                            </div>
                            <p className="text-[11px] font-mono text-neutral-500 truncate max-w-lg">
                              SHA-256: {hashTrunc}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:self-center shrink-0">
                          <button
                            onClick={() => navigate("/dashboard/sign")}
                            className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors px-3 py-1.5 border border-neutral-800 hover:border-neutral-600 rounded bg-neutral-950/40"
                          >
                            <span>Firmar Nuevo</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 5. Subvista: Formulario de Envío Cifrado (`compose`) */}
          {activeTab === "compose" && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="border-b border-neutral-900 pb-4">
                <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-white">
                  Nuevo Envío Cifrado
                </h2>
                <p className="text-xs font-mono text-neutral-400 mt-1">
                  Encapsulación de secreto compartido y cifrado con AES-256-GCM punto a punto.
                </p>
              </div>

              {/* Selector de Contacto */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300">
                  1. Contacto Destinatario
                </label>
                {loadingContacts ? (
                  <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 py-2">
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cargando directorio de identidades seguras...</span>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="border border-neutral-800 bg-neutral-950/40 rounded p-4 text-center space-y-2">
                    <p className="text-xs font-mono text-neutral-400">
                      No hay contactos seguros vinculados con clave pública KEM.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/identity")}
                      className="text-xs font-mono uppercase tracking-wider text-white border border-neutral-700 hover:border-neutral-500 px-3 py-1.5 rounded transition-colors"
                    >
                      Ir a Identidad para Vincular
                    </button>
                  </div>
                ) : (
                  <select
                    value={sendRecipientId}
                    onChange={(e) => setSendRecipientId(e.target.value)}
                    className="w-full bg-neutral-900/90 border border-neutral-800 focus:border-neutral-500 text-white text-xs font-mono rounded px-3 py-2.5 outline-none transition-colors"
                  >
                    {contacts.map((c) => (
                      <option key={c.user_id} value={c.user_id} className="bg-neutral-900 text-white">
                        {c.full_name ? `${c.full_name} (${c.email})` : c.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Dropzone de Archivo */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300">
                  2. Adjuntar documento PDF
                </label>
                {!sendFile ? (
                  <div
                    onDrop={handleSendFileDrop}
                    onDragOver={handleSendDragOver}
                    onDragLeave={handleSendDragLeave}
                    onClick={() => sendFileInputRef.current?.click()}
                    className={`border border-dashed rounded p-8 sm:p-12 text-center cursor-pointer transition-colors ${sendDragActive
                      ? "border-neutral-400 bg-neutral-900/40"
                      : "border-neutral-800 hover:border-neutral-600 bg-neutral-950/40"
                      }`}
                  >
                    <input
                      ref={sendFileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleSendFileInput}
                    />
                    <UploadCloud className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
                    <p className="text-xs font-mono text-neutral-200">
                      Arrastra un archivo PDF o haz clic para seleccionarlo
                    </p>
                    <p className="text-[11px] font-mono text-neutral-600 mt-1">
                      Formato PDF hasta 20 MB
                    </p>
                  </div>
                ) : (
                  <div className="border border-neutral-800 bg-neutral-900/60 rounded p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-neutral-300 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-medium text-white truncate max-w-md">
                          {sendFile.name}
                        </p>
                        <p className="text-[11px] font-mono text-neutral-500">
                          {formatBytes(sendFile.size)} • PDF verificado
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSendFile(null)}
                      className="text-xs font-mono text-neutral-500 hover:text-red-400 px-2 py-1 transition-colors"
                    >
                      Cambiar
                    </button>
                  </div>
                )}
              </div>

              {/* Acciones de Envío */}
              <div className="pt-4 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("inbox")}
                  className="text-xs font-mono text-neutral-500 hover:text-white transition-colors"
                >
                  ← Cancelar y Volver a Bandeja
                </button>
                <button
                  type="button"
                  onClick={handleEncryptAndSendDoc}
                  disabled={!sendFile || !sendRecipientId || sending}
                  className="w-full sm:w-auto text-xs font-mono uppercase tracking-wider text-black bg-white hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-6 py-2.5 rounded font-semibold flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Cifrando y Transmitiendo...</span>
                    </>
                  ) : (
                    <span>Cifrar y Enviar</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Revisión y Previsualización de Documento Descifrado */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="bg-neutral-950 border border-neutral-800 text-white p-0 overflow-hidden sm:rounded-lg w-[96vw] max-w-6xl h-[92vh] max-h-[94vh] flex flex-col focus:outline-none z-50">
          {selectedDoc && previewUrl && (
            <div className="flex flex-col h-full w-full overflow-hidden">
              {/* Header Superior del Visor */}
              <div className="sticky top-0 z-50 p-4 sm:px-6 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-sm sm:text-base font-mono font-bold text-white truncate max-w-md">
                      {selectedDoc.file_name}
                    </DialogTitle>
                    <span className="text-[10px] font-mono text-emerald-400">

                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                    <span>
                      Remitente: <strong className="text-neutral-200">{selectedDoc.sender_name || selectedDoc.sender_email || "Remitente"}</strong>
                    </span>
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-500">
                      SHA-256: {selectedDoc.document_hash.slice(0, 16)}...
                    </span>
                  </div>
                </div>

                {/* Acciones del Header */}
                <div className="flex items-center gap-2.5 ml-auto shrink-0">
                  <button
                    onClick={handleDownloadDecrypted}
                    className="flex items-center gap-1.5 text-xs font-mono text-neutral-300 hover:text-white transition-colors px-3 py-2 border border-neutral-800 hover:border-neutral-600 rounded bg-neutral-900/40"
                    title="Descargar copia del PDF descifrado"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Descargar</span>
                  </button>

                  <button
                    onClick={() => window.open(previewUrl, "_blank")}
                    className="flex items-center gap-1.5 text-xs font-mono text-neutral-300 hover:text-white transition-colors p-2 border border-neutral-800 hover:border-neutral-600 rounded bg-neutral-900/40"
                    title="Abrir en pestaña nueva"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleProceedToSign}
                    className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-black bg-white hover:bg-neutral-200 transition-colors px-4 py-2 rounded font-semibold"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Firmar DocumentO</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Visor PDF Iframe */}
              <div className="flex-1 w-full min-h-0 bg-black p-2 sm:p-4">
                <div className="w-full h-full rounded border border-neutral-900 overflow-hidden bg-neutral-950">
                  <iframe
                    src={`${previewUrl}#toolbar=0`}
                    title={`Vista previa de ${selectedDoc.file_name}`}
                    className="w-full h-full border-none"
                  />
                </div>
              </div>

              {/* Footer del Visor */}
              <div className="p-3 sm:px-6 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setReviewModalOpen(false)}
                    className="text-xs font-mono text-neutral-400 hover:text-white px-3 py-1.5"
                  >
                    Cerrar Visor
                  </button>
                  <button
                    onClick={() => {
                      setDocToDiscard(selectedDoc);
                      setDiscardDialogOpen(true);
                    }}
                    className="text-xs font-mono text-neutral-500 hover:text-red-400 px-3 py-1.5 transition-colors"
                  >
                    Descartar Solicitud
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRejectDocument}
                    disabled={rejecting}
                    className="text-xs font-mono text-red-400 hover:text-red-300 px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    {rejecting ? "Rechazando..." : "Rechazar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación para Descartar Solicitud */}
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent className="bg-neutral-950 border border-neutral-800 text-white max-w-md sm:rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-mono font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              ¿Descartar Solicitud de Transferencia?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-mono text-neutral-400 leading-relaxed">
              El documento <span className="text-neutral-200">"{docToDiscard?.file_name}"</span> será eliminado de tu bandeja de transferencias pendientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-transparent border border-neutral-800 text-xs font-mono text-neutral-400 hover:text-white hover:bg-neutral-900">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscard}
              disabled={discarding}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-semibold"
            >
              {discarding ? "Descartando..." : "Eliminar Solicitud"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
