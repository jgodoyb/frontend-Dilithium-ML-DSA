/**
 * Servicio de Bandeja de Entrada y Descifrado de Documentos Recibidos (ML-KEM-768)
 * Permite al destinatario consultar documentos pendientes, descargarlos de Supabase Storage,
 * descifrarlos con su clave privada Kyber y marcarlos como firmados.
 */

import { supabase } from "@/integrations/supabase/client";
import { decryptDocumentPayload } from "./cryptoApi";

export interface PendingDocumentItem {
  id: string;
  sender_id: string;
  sender_name?: string;
  sender_email?: string;
  file_name: string;
  document_hash: string;
  capsule_b64: string;
  nonce_b64: string;
  storage_path: string;
  created_at: string;
}

/**
 * Convierte un Blob descargado a cadena base64.
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

/**
 * Convierte una cadena base64 a un Blob binario.
 */
function base64ToBlob(base64: string, mimeType = "application/pdf"): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([byteNumbers], { type: mimeType });
}

/**
 * Obtiene la lista de documentos pendientes dirigidos al usuario actual.
 * Realiza cruce con profiles y crypto_identities para enriquecer información del remitente.
 */
export async function getPendingDocuments(
  userId: string
): Promise<PendingDocumentItem[]> {
  if (!userId || userId.trim() === "") {
    return [];
  }

  // 1. Consultar registros en pending_documents con status 'pending'
  const { data: rows, error } = await (supabase as any)
    .from("pending_documents")
    .select("id, sender_id, file_name, document_hash, capsule_b64, nonce_b64, storage_path, created_at")
    .eq("recipient_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Error al consultar documentos pendientes: ${error.message}`
    );
  }

  if (!rows || rows.length === 0) {
    return [];
  }

  // 2. Extraer remitentes únicos
  const rawSenderIds: string[] = rows
    .map((r: { sender_id: string }) => r.sender_id)
    .filter((id: string | null | undefined): id is string => Boolean(id && id.trim().length > 0));

  const senderIds = Array.from(new Set(rawSenderIds));

  // 3. Consultar perfiles y correos de los remitentes
  const senderNamesMap = new Map<string, string>();
  const senderEmailsMap = new Map<string, string>();

  if (senderIds.length > 0) {
    try {
      const [profilesRes, cryptoRes] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("id, full_name, first_name, last_name")
          .in("id", senderIds),
        (supabase as any)
          .from("crypto_identities")
          .select("user_id, email")
          .in("user_id", senderIds),
      ]);

      if (profilesRes?.data) {
        for (const p of profilesRes.data) {
          const name = (p.full_name || `${p.first_name || ""} ${p.last_name || ""}`).trim();
          if (name) senderNamesMap.set(p.id, name);
        }
      }

      if (cryptoRes?.data) {
        for (const c of cryptoRes.data) {
          if (c.email) senderEmailsMap.set(c.user_id, c.email);
        }
      }
    } catch (enrichErr) {
      console.warn("Advertencia al enriquecer datos de remitentes:", enrichErr);
    }
  }

  // 4. Mapear a lista tipada
  return rows.map((r: any) => ({
    id: r.id,
    sender_id: r.sender_id,
    sender_name: senderNamesMap.get(r.sender_id),
    sender_email: senderEmailsMap.get(r.sender_id),
    file_name: r.file_name,
    document_hash: r.document_hash,
    capsule_b64: r.capsule_b64,
    nonce_b64: r.nonce_b64,
    storage_path: r.storage_path,
    created_at: r.created_at,
  }));
}

/**
 * Caché en memoria a nivel de sesión para evitar descifrados redundantes (FastAPI POST /decrypt).
 * Clave: doc.id
 */
export interface CachedDecryptedItem {
  file: File;
  objectUrl: string;
}

const decryptedCache = new Map<string, CachedDecryptedItem>();

export function getCachedDecryptedDocument(docId: string): CachedDecryptedItem | undefined {
  return decryptedCache.get(docId);
}

export function clearDecryptedCache(): void {
  for (const item of decryptedCache.values()) {
    try {
      URL.revokeObjectURL(item.objectUrl);
    } catch {}
  }
  decryptedCache.clear();
}

/**
 * Descarga y descifra un documento recibido utilizando la clave privada Kyber del receptor.
 * Reutiliza la instancia en memoria si ya fue descifrado en esta sesión.
 */
export async function downloadAndDecryptDocument(
  doc: PendingDocumentItem,
  recipientUserId: string
): Promise<File> {
  const result = await getDecryptedDocumentWithUrl(doc, recipientUserId);
  return result.file;
}

/**
 * Obtiene o descifra un documento retornando tanto el objeto File como su Blob URL asociado.
 */
export async function getDecryptedDocumentWithUrl(
  doc: PendingDocumentItem,
  recipientUserId: string
): Promise<CachedDecryptedItem> {
  if (!recipientUserId || recipientUserId.trim() === "") {
    throw new Error("El ID del destinatario es requerido.");
  }

  // 1. Comprobar si ya existe en la caché en memoria de la sesión
  const cached = decryptedCache.get(doc.id);
  if (cached) {
    return cached;
  }

  // 2. Obtener clave privada KEM (kem_private_key)
  const { data: cryptoData, error: keyError } = await (supabase as any)
    .from("crypto_identities")
    .select("kem_private_key")
    .eq("user_id", recipientUserId)
    .maybeSingle();

  if (keyError) {
    throw new Error(`Error al recuperar identidad criptográfica: ${keyError.message}`);
  }

  if (!cryptoData?.kem_private_key) {
    throw new Error(
      "No se encontró la clave privada Kyber (ML-KEM) requerida para descifrar este documento."
    );
  }

  const dk_b64: string = cryptoData.kem_private_key;

  // 3. Descargar el archivo cifrado desde Supabase Storage
  const { data: cipherBlob, error: downloadError } = await supabase.storage
    .from("encrypted_documents")
    .download(doc.storage_path);

  if (downloadError || !cipherBlob) {
    throw new Error(
      `Error al descargar documento de Storage: ${downloadError?.message || "Archivo no encontrado"}`
    );
  }

  // 4. Convertir el Blob cifrado a base64
  const ciphertext_b64 = await blobToBase64(cipherBlob);

  // 5. Invocar backend FastAPI para desencapsulación y descifrado
  const plaintext = await decryptDocumentPayload({
    dk_b64,
    capsule_b64: doc.capsule_b64,
    nonce_b64: doc.nonce_b64,
    ciphertext_b64,
    security_level: 768,
  });

  // 6. Convertir el plaintext base64 resultante en un File PDF
  const pdfBlob = base64ToBlob(plaintext, "application/pdf");
  const file = new File([pdfBlob], doc.file_name, { type: "application/pdf" });
  const objectUrl = URL.createObjectURL(file);

  const cacheEntry: CachedDecryptedItem = { file, objectUrl };
  decryptedCache.set(doc.id, cacheEntry);

  return cacheEntry;
}

/**
 * Marca un documento como completado/firmado tras la firma exitosa.
 * 1. Intenta actualizar pending_documents a status = 'signed'.
 * 2. Si RLS impide la actualización, elimina la fila pendiente para no duplicarla en la bandeja.
 * 3. Purga el archivo cifrado huérfano de Supabase Storage.
 */
export async function markDocumentAsSigned(
  documentId: string,
  storagePath?: string
): Promise<void> {
  if (!documentId) return;

  try {
    let pathToPurge = storagePath;
    if (!pathToPurge) {
      try {
        const { data } = await (supabase as any)
          .from("pending_documents")
          .select("storage_path")
          .eq("id", documentId)
          .maybeSingle();
        pathToPurge = data?.storage_path;
      } catch {}
    }

    // 1. Purgar de Supabase Storage tras completar la firma (Cero Basura)
    if (pathToPurge) {
      try {
        await supabase.storage
          .from("encrypted_documents")
          .remove([pathToPurge]);
      } catch (storageEx) {
        console.warn("Excepción al purgar archivo en Storage tras firma:", storageEx);
      }
    }

    // 2. Limpiar de la caché de sesión
    const cached = decryptedCache.get(documentId);
    if (cached) {
      try {
        URL.revokeObjectURL(cached.objectUrl);
      } catch {}
      decryptedCache.delete(documentId);
    }

    // 3. Intentar actualizar a status = 'signed' (con updated_at)
    let affected = false;
    try {
      const { data: updateData, error: updateError } = await (supabase as any)
        .from("pending_documents")
        .update({
          status: "signed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .select("id");

      if (!updateError && updateData && updateData.length > 0) {
        affected = true;
      }
    } catch (updEx) {
      console.warn("Advertencia al actualizar status a 'signed':", updEx);
    }

    // 4. Si la actualización no afectó filas (por políticas RLS), eliminar el registro
    if (!affected) {
      try {
        await (supabase as any)
          .from("pending_documents")
          .delete()
          .eq("id", documentId);
      } catch {}
    }
  } catch (err) {
    console.warn("Error en markDocumentAsSigned:", err);
  }
}

/**
 * Rechaza un documento pendiente recibido.
 * 1. Intenta actualizar pending_documents estableciendo status = 'rejected' y updated_at = now().
 * 2. Si las políticas RLS impiden la actualización o no se modifica la fila, intenta eliminar el registro directamente.
 * 3. Purga de inmediato el binario cifrado de Supabase Storage y limpia la caché.
 */
export async function rejectPendingDocument(
  documentId: string,
  storagePath?: string
): Promise<void> {
  if (!documentId) return;

  try {
    // 1. Limpiar de la caché de sesión
    const cached = decryptedCache.get(documentId);
    if (cached) {
      try {
        URL.revokeObjectURL(cached.objectUrl);
      } catch {}
      decryptedCache.delete(documentId);
    }

    // 2. Obtener la ruta de almacenamiento si no se proporcionó
    let pathToPurge = storagePath;
    if (!pathToPurge) {
      try {
        const { data } = await (supabase as any)
          .from("pending_documents")
          .select("storage_path")
          .eq("id", documentId)
          .maybeSingle();
        pathToPurge = data?.storage_path;
      } catch (pathErr) {
        console.warn("No se pudo consultar storage_path previo a rechazar:", pathErr);
      }
    }

    // 3. Purgar archivo de Supabase Storage de inmediato (Cero Basura)
    if (pathToPurge) {
      try {
        const { error: storageErr } = await supabase.storage
          .from("encrypted_documents")
          .remove([pathToPurge]);
        if (storageErr) {
          console.warn("Aviso al purgar binario de Storage tras rechazo:", storageErr);
        }
      } catch (storageEx) {
        console.warn("Excepción al purgar archivo en Storage tras rechazo:", storageEx);
      }
    }

    // 4. Intentar actualizar status a 'rejected' en pending_documents (con updated_at)
    let affected = false;
    try {
      const { data: updateData, error: updateError } = await (supabase as any)
        .from("pending_documents")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .select("id");

      if (!updateError && updateData && updateData.length > 0) {
        affected = true;
      } else if (updateError) {
        console.warn("Fallo al actualizar status a 'rejected' en pending_documents:", updateError);
      }
    } catch (e) {
      console.warn("Excepción al intentar actualizar status a 'rejected':", e);
    }

    // 5. Si no se pudo actualizar el estado (ej. RLS impide UPDATE por receptor o 0 filas afectadas),
    // eliminar directamente el registro para garantizar que desaparezca
    if (!affected) {
      try {
        const { data: deleteData, error: deleteError } = await (supabase as any)
          .from("pending_documents")
          .delete()
          .eq("id", documentId)
          .select("id");

        if (!deleteError && deleteData && deleteData.length > 0) {
          affected = true;
        } else if (deleteError) {
          console.warn("Aviso al eliminar documento en fallback de rechazo:", deleteError);
        }
      } catch (delEx) {
        console.warn("Excepción al eliminar en fallback:", delEx);
      }
    }

    if (!affected) {
      console.warn(
        `[inboxService] Advertencia RLS: No se pudo actualizar ni borrar el registro ${documentId} en Supabase. ` +
        `Revisa las políticas RLS en la tabla 'pending_documents' para permitir UPDATE y DELETE al 'recipient_id'.`
      );
    }
  } catch (err) {
    console.error("Error en rejectPendingDocument:", err);
    throw err;
  }
}

/**
 * Elimina o descarta permanentemente una solicitud de documento pendiente.
 * Intenta eliminar el archivo cifrado de Supabase Storage y la fila de pending_documents.
 * Si las políticas RLS impiden la eliminación física, actualiza el estado a 'rejected'.
 */
export async function deletePendingDocument(
  documentId: string,
  storagePath?: string
): Promise<void> {
  if (!documentId) return;

  // 1. Limpiar de la caché en memoria de la sesión
  const cached = decryptedCache.get(documentId);
  if (cached) {
    try {
      URL.revokeObjectURL(cached.objectUrl);
    } catch {}
    decryptedCache.delete(documentId);
  }

  // 2. Eliminar archivo de Supabase Storage
  let pathToPurge = storagePath;
  if (!pathToPurge) {
    try {
      const { data } = await (supabase as any)
        .from("pending_documents")
        .select("storage_path")
        .eq("id", documentId)
        .maybeSingle();
      pathToPurge = data?.storage_path;
    } catch (fetchErr) {
      console.warn("No se pudo obtener storage_path previo a eliminación:", fetchErr);
    }
  }

  if (pathToPurge) {
    try {
      const { error: storageErr } = await supabase.storage
        .from("encrypted_documents")
        .remove([pathToPurge]);
      if (storageErr) {
        console.warn("Aviso al eliminar binario de Supabase Storage:", storageErr);
      }
    } catch (storageEx) {
      console.warn("Excepción al eliminar archivo en Storage:", storageEx);
    }
  }

  // 3. Eliminar registro en base de datos
  let affected = false;
  try {
    const { data: deleteData, error: deleteError } = await (supabase as any)
      .from("pending_documents")
      .delete()
      .eq("id", documentId)
      .select("id");

    if (!deleteError && deleteData && deleteData.length > 0) {
      affected = true;
    } else if (deleteError) {
      console.warn("DELETE restringido por RLS en pending_documents:", deleteError);
    }
  } catch (delEx) {
    console.warn("Excepción al ejecutar DELETE en pending_documents:", delEx);
  }

  // 4. Si el DELETE físico no afectó filas (ej. RLS de Supabase restringe DELETE), actualizar a 'rejected'
  if (!affected) {
    try {
      const { data: updateData, error: updateError } = await (supabase as any)
        .from("pending_documents")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .select("id");

      if (!updateError && updateData && updateData.length > 0) {
        affected = true;
      } else if (updateError) {
        console.warn("Error al actualizar a 'rejected' como fallback:", updateError);
      }
    } catch (updEx) {
      console.warn("Excepción al actualizar a 'rejected' en fallback:", updEx);
    }
  }

  if (!affected) {
    console.warn(
      `[inboxService] Advertencia RLS: No se pudo eliminar ni marcar como 'rejected' el documento ${documentId}. ` +
      `Es necesario configurar la política RLS de DELETE / UPDATE para 'recipient_id' en Supabase.`
    );
  }
}

export interface SentDocumentItem {
  id: string;
  recipient_id: string;
  recipient_name?: string;
  recipient_email?: string;
  file_name: string;
  document_hash: string;
  status: string;
  created_at: string;
}

/**
 * Obtiene el historial de documentos enviados por el usuario actual.
 */
export async function getSentDocuments(userId: string): Promise<SentDocumentItem[]> {
  if (!userId || userId.trim() === "") return [];

  const { data: rows, error } = await (supabase as any)
    .from("pending_documents")
    .select("id, recipient_id, file_name, document_hash, status, created_at")
    .eq("sender_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error al consultar documentos enviados: ${error.message}`);
  }

  if (!rows || rows.length === 0) return [];

  const rawRecipientIds: string[] = rows
    .map((r: { recipient_id: string }) => r.recipient_id)
    .filter((id: string | null | undefined): id is string => Boolean(id && id.trim().length > 0));

  const recipientIds = Array.from(new Set(rawRecipientIds));
  const namesMap = new Map<string, string>();
  const emailsMap = new Map<string, string>();

  if (recipientIds.length > 0) {
    try {
      const [profilesRes, cryptoRes] = await Promise.all([
        (supabase as any).from("profiles").select("id, full_name, first_name, last_name").in("id", recipientIds),
        (supabase as any).from("crypto_identities").select("user_id, email").in("user_id", recipientIds),
      ]);

      if (profilesRes?.data) {
        for (const p of profilesRes.data) {
          const name = (p.full_name || `${p.first_name || ""} ${p.last_name || ""}`).trim();
          if (name) namesMap.set(p.id, name);
        }
      }
      if (cryptoRes?.data) {
        for (const c of cryptoRes.data) {
          if (c.email) emailsMap.set(c.user_id, c.email);
        }
      }
    } catch (e) {
      console.warn("Advertencia al enriquecer datos de destinatarios:", e);
    }
  }

  return rows.map((r: any) => ({
    id: r.id,
    recipient_id: r.recipient_id,
    recipient_name: namesMap.get(r.recipient_id),
    recipient_email: emailsMap.get(r.recipient_id),
    file_name: r.file_name,
    document_hash: r.document_hash,
    status: r.status,
    created_at: r.created_at,
  }));
}
