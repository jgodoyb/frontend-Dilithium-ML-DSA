/**
 * Servicio de Transferencia y Cifrado de Documentos (ML-KEM-768 + AES-256-GCM)
 * Encapsula documentos con la clave pública Kyber del destinatario,
 * almacena el ciphertext en Supabase Storage y registra en pending_documents.
 */

import { supabase } from "@/integrations/supabase/client";
import { encryptDocumentPayload } from "./cryptoApi";
import { ContactIdentity } from "./contactService";

export interface SendDocumentParams {
  senderId: string;
  recipient: ContactIdentity;
  file: File;
}

/**
 * Convierte un archivo a cadena base64 de forma eficiente y segura para memoria.
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Calcula el hash SHA-256 en hexadecimal del archivo original.
 */
async function computeSha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Convierte una cadena base64 a un Blob binario.
 */
function base64ToBlob(base64: string, mimeType = "application/octet-stream"): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([byteNumbers], { type: mimeType });
}

/**
 * Orquesta el flujo completo de envío cifrado post-cuántico:
 * 1. Calcula hash SHA-256 del documento original.
 * 2. Codifica el archivo a base64 (plaintext).
 * 3. Llama al motor FastAPI POST /encrypt con la clave ML-KEM-768 del destinatario.
 * 4. Sube el ciphertext binario al bucket 'encrypted_documents' en Supabase Storage.
 * 5. Registra el payload en la tabla 'pending_documents'.
 * 
 * @returns UUID del registro en pending_documents
 */
export async function sendEncryptedDocument({
  senderId,
  recipient,
  file,
}: SendDocumentParams): Promise<string> {
  if (!senderId || senderId.trim() === "") {
    throw new Error("El ID del remitente es requerido.");
  }
  if (!recipient || !recipient.user_id || !recipient.kem_public_key) {
    throw new Error("El destinatario no posee una clave pública ML-KEM válida.");
  }
  if (!file) {
    throw new Error("No se ha proporcionado ningún archivo para cifrar.");
  }

  // 1. Calcular hash SHA-256 del archivo original
  const documentHash = await computeSha256Hex(file);

  // 2. Convertir el archivo a base64 (plaintext)
  const plaintext = await fileToBase64(file);

  // 3. Cifrado híbrido ML-KEM-768 vía FastAPI
  const encryptResult = await encryptDocumentPayload({
    ek_b64: recipient.kem_public_key,
    plaintext,
    security_level: 768,
  });

  // 4. Subir ciphertext a Supabase Storage
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${senderId}/${Date.now()}_${safeFileName}.enc`;
  const cipherBlob = base64ToBlob(encryptResult.ciphertext_b64);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("encrypted_documents")
    .upload(storagePath, cipherBlob, {
      contentType: "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `Error al subir documento cifrado al almacenamiento seguro: ${uploadError.message}`
    );
  }

  const finalStoragePath = uploadData?.path || storagePath;

  // 5. Insertar en pending_documents
  const { data: docRecord, error: docError } = await (supabase as any)
    .from("pending_documents")
    .insert({
      sender_id: senderId,
      recipient_id: recipient.user_id,
      file_name: file.name,
      document_hash: documentHash,
      capsule_b64: encryptResult.capsule_b64,
      nonce_b64: encryptResult.nonce_b64,
      storage_path: finalStoragePath,
      kem_security_level: 768,
      status: "pending",
    })
    .select("id")
    .single();

  if (docError) {
    throw new Error(
      `Error al registrar documento pendiente en base de datos: ${docError.message}`
    );
  }

  return docRecord.id;
}
