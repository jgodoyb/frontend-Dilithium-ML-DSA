import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Inbox,
  FileText,
  Lock,
  Loader2,
  RefreshCw,
  Clock,
  User,
  ShieldCheck,
  ArrowRight,
  FileCheck2,
  Download,
  Eye,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Copy,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMockAuth } from "@/contexts/MockAuthContext";
import {
  getPendingDocuments,
  getDecryptedDocumentWithUrl,
  deletePendingDocument,
  PendingDocumentItem,
} from "@/services/inboxService";
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

export interface PendingDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentSelect?: (file: File, pendingDocId: string) => void;
  onCountChange?: (count: number) => void;
}

export function PendingDocumentsDialog({
  open,
  onOpenChange,
  onDocumentSelect,
  onCountChange,
}: PendingDocumentsDialogProps) {
  const { supabaseUser } = useMockAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<PendingDocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const dismissedDocIdsRef = useRef<Set<string>>(new Set());

  // Estados para el visor de previsualización del documento descifrado
  const [selectedDoc, setSelectedDoc] = useState<PendingDocumentItem | null>(null);
  const [decryptedFile, setDecryptedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Estados para descartar / eliminar documento pendiente
  const [docToDiscard, setDocToDiscard] = useState<PendingDocumentItem | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  // Cargar documentos pendientes
  const loadDocuments = useCallback(async () => {
    if (!supabaseUser?.id) return;
    setLoading(true);
    try {
      const data = await getPendingDocuments(supabaseUser.id);
      const filtered = data.filter((d) => !dismissedDocIdsRef.current.has(d.id));
      setDocuments(filtered);
      onCountChange?.(filtered.length);
    } catch (err: unknown) {
      console.error("Error al cargar documentos pendientes:", err);
      const msg = err instanceof Error ? err.message : "No se pudieron obtener los documentos.";
      toast({
        variant: "destructive",
        title: "Error de sincronización",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [supabaseUser?.id, onCountChange, toast]);

  useEffect(() => {
    if (open && supabaseUser?.id) {
      loadDocuments();
    }
  }, [open, supabaseUser?.id, loadDocuments]);

  // Manejar cierre del modal
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPreviewUrl(null);
      setDecryptedFile(null);
      setSelectedDoc(null);
    }
    onOpenChange(nextOpen);
  };

  // Volver a la lista de documentos desde la vista previa
  const handleBackToList = () => {
    setPreviewUrl(null);
    setDecryptedFile(null);
    setSelectedDoc(null);
  };

  // Descifrar y abrir en el panel de revisión (aprovecha la caché en memoria)
  const handleDecryptAndReview = async (doc: PendingDocumentItem) => {
    if (!supabaseUser?.id) return;

    setDecryptingId(doc.id);
    try {
      const { file, objectUrl } = await getDecryptedDocumentWithUrl(doc, supabaseUser.id);

      setDecryptedFile(file);
      setSelectedDoc(doc);
      setPreviewUrl(objectUrl);
    } catch (err: unknown) {
      console.error("Error al descifrar documento:", err);
      const msg = err instanceof Error ? err.message : "Fallo en el proceso de descifrado KEM.";
      toast({
        variant: "destructive",
        title: "Fallo al descifrar documento",
        description: msg,
      });
    } finally {
      setDecryptingId(null);
    }
  };

  // Descartar / eliminar documento pendiente
  const handleConfirmDiscard = async () => {
    if (!docToDiscard) return;
    const docId = docToDiscard.id;
    const docPath = docToDiscard.storage_path;
    const docName = docToDiscard.file_name;
    dismissedDocIdsRef.current.add(docId);
    setDiscarding(true);
    try {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setDiscardDialogOpen(false);
      setDocToDiscard(null);
      if (selectedDoc?.id === docId) {
        handleBackToList();
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

  // Descargar el archivo PDF plano descifrado localmente
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
      description: `Guardando copia descifrada de ${selectedDoc.file_name}`,
    });
  };

  // Proceder a firmar el documento con Dilithium (ML-DSA)
  const handleProceedToSign = () => {
    if (!decryptedFile || !selectedDoc) return;

    const fileToPass = decryptedFile;
    const docId = selectedDoc.id;

    // Limpieza de estado local y cierre del modal
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setDecryptedFile(null);
    setSelectedDoc(null);
    onOpenChange(false);

    if (onDocumentSelect) {
      onDocumentSelect(fileToPass, docId);
    } else {
      navigate("/dashboard/sign", {
        state: {
          incomingFile: fileToPass,
          pendingDocId: docId,
          storagePath: selectedDoc.storage_path,
          docName: selectedDoc.file_name,
          senderName: selectedDoc.sender_name || selectedDoc.sender_email,
        },
      });
    }
  };

  // Copiar SHA-256 al portapapeles
  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast({
      title: "Hash copiado",
      description: "SHA-256 copiado al portapapeles.",
    });
  };

  const isPreviewMode = Boolean(selectedDoc && previewUrl);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`bg-[#090a0f] border-white/10 text-white shadow-2xl p-0 overflow-hidden sm:rounded-2xl transition-all duration-300 ${isPreviewMode ? "max-w-7xl w-[96vw] h-[94vh] max-h-[96vh] flex flex-col" : "max-w-2xl w-full"
          }`}
      >
        {/* ========================================================================= */}
        {/* MODO A: VISTA PREVIA Y REVISIÓN DEL DOCUMENTO DESCIFRADO                  */}
        {/* ========================================================================= */}
        {isPreviewMode && selectedDoc && previewUrl ? (
          <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Cabecera de Revisión STICKY */}
            <div className="sticky top-0 z-50 p-4 sm:px-6 border-b border-white/10 bg-gradient-to-r from-cyan-950/30 via-[#090a0f] to-emerald-950/30 backdrop-blur-md shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToList}
                    className="h-8 px-2 text-slate-400 hover:text-white hover:bg-white/5 gap-1 shrink-0 rounded-lg text-xs"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Volver</span>
                  </Button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-base sm:text-lg font-bold text-white truncate max-w-[240px] sm:max-w-md">
                        {selectedDoc.file_name}
                      </DialogTitle>
                      <Badge className="bg-emerald-950/50 text-emerald-400 border-emerald-500/30 text-[10px] font-mono gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ML-KEM-768 Descifrado
                      </Badge>
                    </div>
                    <DialogDescription className="text-xs text-slate-400 mt-0.5 truncate">
                      Revisa el contenido antes de aplicar tu firma digital post-cuántica ML-DSA.
                    </DialogDescription>
                  </div>
                </div>

                {/* Acciones del Header con Botón de Firma ML-DSA */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(previewUrl, "_blank")}
                    className="h-9 text-xs text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/20 gap-1.5 hidden md:flex"
                    title="Abrir en pestaña nueva"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Pestaña nueva</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleProceedToSign}
                    className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm h-10 px-4 sm:px-5 rounded-xl shadow-[0_0_25px_rgba(52,211,153,0.5)] gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all border border-emerald-300/40"
                  >
                    <ShieldCheck className="w-4 h-4 text-slate-950" />
                    <span className="font-extrabold">Firmar Documento Ahora (ML-DSA)</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                  </Button>
                </div>
              </div>

              {/* Fila de Metadatos Verificados */}
              <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Remitente:</span>
                    <strong className="text-white font-medium">
                      {selectedDoc.sender_name || selectedDoc.sender_email || "Desconocido"}
                    </strong>
                    {selectedDoc.sender_name && selectedDoc.sender_email && (
                      <span className="text-slate-500 text-[11px]">({selectedDoc.sender_email})</span>
                    )}
                  </span>
                </div>

                <div
                  onClick={() => handleCopyHash(selectedDoc.document_hash)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 cursor-pointer transition-colors bg-white/[0.03] px-2 py-0.5 rounded border border-white/5"
                  title="Clic para copiar hash SHA-256"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>SHA-256:</span>
                  <span className="text-slate-300 truncate max-w-[140px] sm:max-w-[220px]">
                    {selectedDoc.document_hash}
                  </span>
                  <Copy className="w-2.5 h-2.5 opacity-60" />
                </div>
              </div>
            </div>

            {/* Contenedor del Visor PDF Integrado */}
            <div className="p-3 sm:p-4 flex-1 min-h-0 bg-black/60 relative">
              <div className="w-full h-full rounded-xl border border-white/10 overflow-hidden bg-slate-950 shadow-inner relative">
                <iframe
                  src={`${previewUrl}#toolbar=0`}
                  title={`Vista previa de ${selectedDoc.file_name}`}
                  className="w-full h-full border-none"
                />
              </div>
            </div>

            {/* Barra de Acciones de Revisión */}
            <div className="p-4 px-6 bg-[#07080c] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToList}
                  className="text-xs text-slate-400 hover:text-white hover:bg-white/5"
                >
                  Volver a la lista
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDocToDiscard(selectedDoc);
                    setDiscardDialogOpen(true);
                  }}
                  className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
                  title="Eliminar / Descartar Solicitud"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Eliminar / Descartar Solicitud</span>
                </Button>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadDecrypted}
                  className="text-xs border-white/15 bg-white/[0.02] hover:bg-cyan-950/20 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-300 gap-1.5 h-10 px-4 flex-1 sm:flex-initial rounded-xl"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Descargar PDF</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleProceedToSign}
                  className="text-xs sm:text-sm bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 transition-all duration-300 text-white font-bold gap-2 h-10 px-5 shadow-[0_0_20px_rgba(16,185,129,0.35)] flex-1 sm:flex-initial rounded-xl"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Firmar Documento Ahora</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* MODO B: LISTA DE DOCUMENTOS CIFRADOS EN BANDEJA                           */
          /* ========================================================================= */
          <>
            {/* Encabezado */}
            <div className="relative p-6 pb-4 border-b border-white/10 bg-gradient-to-br from-white/[0.03] via-transparent to-[#0e7490]/10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#0e7490]/20 border border-[#0e7490]/40 text-[#22d3ee]">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                      Bandeja de Entrada Cifrada
                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-950/30 text-[10px] font-mono tracking-widest">
                        {documents.length} PENDIENTE{documents.length === 1 ? "" : "S"}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-400 mt-0.5">
                      Documentos protegidos con ML-KEM-768 esperando tu firma digital con Dilithium (ML-DSA).
                    </DialogDescription>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadDocuments}
                  disabled={loading}
                  className="h-8 text-xs gap-1.5 text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Actualizar</span>
                </Button>
              </div>
            </div>

            {/* Contenido de la Lista */}
            <div className="p-6 pt-4">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0e7490]" />
                  <p className="text-xs font-mono">Buscando documentos en el buzón seguro...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="py-14 px-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01] space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                    <FileCheck2 className="w-6 h-6 opacity-60" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">Bandeja al día</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      No tienes documentos pendientes ni de firma en este momento.
                    </p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="max-h-[360px] pr-3">
                  <div className="space-y-3">
                    {documents.map((doc) => {
                      const isDecrypting = decryptingId === doc.id;
                      const senderDisplay = doc.sender_name || doc.sender_email || "Remitente Anónimo";
                      const dateDisplay = new Date(doc.created_at).toLocaleString();

                      return (
                        <div
                          key={doc.id}
                          className="group p-4 rounded-xl border border-white/5 bg-black/40 hover:bg-white/[0.03] hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-cyan-400 shrink-0 mt-0.5">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-white truncate max-w-[280px]">
                                  {doc.file_name}
                                </p>
                                <Badge className="bg-cyan-950/40 text-cyan-400 border-cyan-500/30 text-[9px] font-mono py-0.5 gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  ML-KEM-768
                                </Badge>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                                <span className="flex items-center gap-1 truncate max-w-[200px]">
                                  <User className="w-3 h-3 text-[#0e7490]" />
                                  {senderDisplay}
                                </span>
                                <span className="flex items-center gap-1 shrink-0">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  {dateDisplay}
                                </span>
                              </div>

                              <p className="text-[10px] font-mono text-slate-600 truncate max-w-md">
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
                              className="h-9 px-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all border border-white/5 hover:border-red-500/30 gap-1"
                              title="Eliminar / Descartar Solicitud"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span className="hidden sm:inline text-xs">Descartar</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDecryptAndReview(doc)}
                              disabled={isDecrypting || (decryptingId !== null && !isDecrypting)}
                              className="bg-[#0e7490] hover:bg-cyan-500 text-white font-semibold text-xs h-9 px-4 rounded-lg gap-2 shadow-[0_0_15px_rgba(14,116,144,0.3)] transition-all"
                            >
                              {isDecrypting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Descifrando KEM...</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4" />
                                  <span>Descifrar y Revisar</span>
                                  <ArrowRight className="w-3 h-3" />
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
            </div>

            {/* Pie */}
            <div className="p-4 px-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Desencapsulación KEM: FIPS 203 + FIPS 204</span>
              </div>
              <span>Q-PROOF RECEIVE HUB</span>
            </div>
          </>
        )}
      </DialogContent>

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
    </Dialog>
  );
}

export default PendingDocumentsDialog;
