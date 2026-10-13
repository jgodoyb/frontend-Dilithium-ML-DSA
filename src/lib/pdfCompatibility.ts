/**
 * pdfCompatibility.ts
 * 
 * Módulo de diagnóstico e inspección de compatibilidad para documentos PDF.
 * Detecta de forma anticipada:
 *  1. Firmas previas no compatibles (estándares tradicionales X.509, PKCS#7, Adobe, PAdES, CAdES).
 *  2. Estructuras complejas o no modificables (como billetes de Renfe, formularios interactivos XFA, object streams comprimidos incompatibles).
 *  3. Documentos cifrados o protegidos con contraseña/permisos (/Encrypt).
 *  4. Archivos PDF dañados o fuera de norma ISO 32000.
 * 
 * Transforma errores técnicos crípticos (ej: "Expected instance of PDFDict, but got instance of undefined")
 * en diagnósticos comprensibles y recomendaciones de acción para el usuario.
 */

import { PDFDocument } from "pdf-lib";
import { findLastXrefOffset, findLastEofPosition } from "./PDFScanner";
import { findLastPageObject, parseXrefTable } from "./PDFParser";

export type PdfIncompatibilityType =
  | "INCOMPATIBLE_SIGNATURES"
  | "COMPLEX_OR_UNSUPPORTED"
  | "ENCRYPTED_OR_PROTECTED"
  | "MALFORMED_STRUCTURE"
  | "SERVER_OR_KEY_ERROR";

export interface PdfCompatibilityResult {
  compatible: boolean;
  issueType?: PdfIncompatibilityType;
  title: string;
  message: string;
  details?: string;
  recommendation: string;
  isPostQuantumMultisign?: boolean;
}

/**
 * Decodifica una porción de bytes a cadena usando Latin-1 para preservar la correspondencia binaria 1-a-1.
 */
function decodeLatin1(bytes: Uint8Array, start: number, end: number): string {
  const safeStart = Math.max(0, start);
  const safeEnd = Math.min(bytes.length, end);
  if (safeStart >= safeEnd) return "";

  const slice = bytes.subarray(safeStart, safeEnd);
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder("latin1").decode(slice);
  }

  let str = "";
  for (let i = 0; i < slice.length; i++) {
    str += String.fromCharCode(slice[i]);
  }
  return str;
}

/**
 * Normaliza un buffer PDF utilizando pdf-lib para intentar aplanar XRefs complejas.
 */
async function tryNormalize(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const savedBytes = await doc.save({ useObjectStreams: false });
  return (savedBytes.buffer as ArrayBuffer).slice(
    savedBytes.byteOffset,
    savedBytes.byteOffset + savedBytes.byteLength
  );
}

/**
 * Inspecciona un documento PDF y determina si es compatible con el motor de firma post-cuántica ML-DSA-65.
 */
export async function checkPdfCompatibility(buffer: ArrayBuffer): Promise<PdfCompatibilityResult> {
  if (!buffer || buffer.byteLength === 0) {
    return {
      compatible: false,
      issueType: "MALFORMED_STRUCTURE",
      title: "Archivo vacío o no válido",
      message: "El archivo proporcionado no contiene datos.",
      recommendation: "Por favor, selecciona un archivo PDF válido.",
    };
  }

  const bytes = new Uint8Array(buffer);
  const scanLimit = Math.min(bytes.length, 6 * 1024 * 1024); // hasta 6 MB de escaneo
  const rawString = decodeLatin1(bytes, 0, scanLimit);

  // 1. Verificación de cabecera mágica
  if (!rawString.startsWith("%PDF-")) {
    return {
      compatible: false,
      issueType: "MALFORMED_STRUCTURE",
      title: "Formato no válido",
      message: "El archivo no contiene una cabecera PDF estándar (%PDF).",
      recommendation: "Asegúrate de que el documento no esté dañado y sea un PDF estándar.",
    };
  }

  // 2. Detección de firmas previas e incompatibilidad de formatos
  // Un documento con firmas digitales contiene /ByteRange o /Type /Sig
  const hasByteRange = /\/ByteRange\s*\[/i.test(rawString);
  const hasSigDict = /\/Type\s*\/Sig\b/i.test(rawString);

  if (hasByteRange || hasSigDict) {
    // Comprobar si las firmas existentes son del sistema post-cuántico (QProof / MLDSA)
    const isQProofSignature =
      /\/Filter\s*\/QProof\b/i.test(rawString) && /\/SubFilter\s*\/MLDSA\b/i.test(rawString);

    // Detección de filtros y algoritmos tradicionales incompatibles (Adobe, PKCS7, CAdES, etc.)
    const hasTraditionalFilters =
      /\/Filter\s*\/(Adobe\.PPKLite|Adobe\.PPKMS|Entrust|VeriSign)/i.test(rawString) ||
      /\/SubFilter\s*\/(adbe\.pkcs7|ETSI\.CAdES|adbe\.x509|pkcs)/i.test(rawString);

    // Si tiene firmas pero NO son de QProof, o contiene explícitamente firmas tradicionales:
    if (!isQProofSignature || hasTraditionalFilters) {
      return {
        compatible: false,
        issueType: "INCOMPATIBLE_SIGNATURES",
        title: "Documento con firmas no compatibles",
        message:
          "El documento ya contiene una o más firmas digitales previas en un formato estándar tradicional (como certificados X.509, Adobe Sign, AutoFirma o PAdES).",
        details:
          "Este sistema opera con criptografía post-cuántica ML-DSA-65 (NIST FIPS 204). Añadir firmas cuánticas sobre firmas tradicionales no está permitido porque invalidaría la cadena de certificación preexistente.",
        recommendation:
          "Utiliza la versión original del documento sin firmar o un documento generado previamente en esta plataforma.",
      };
    }
  }

  // 3. Detección de cifrado y contraseñas (/Encrypt)
  const isEncrypted = /\/Encrypt\s+\d+\s+\d+\s+R/i.test(rawString) || /\/Encrypt\s*<</i.test(rawString);
  if (isEncrypted) {
    return {
      compatible: false,
      issueType: "ENCRYPTED_OR_PROTECTED",
      title: "Documento protegido o cifrado",
      message: "El archivo PDF está protegido con contraseña o cuenta con restricciones de edición.",

      recommendation: "Elimina la protección o contraseña del documento antes de subirlo para poder firmarlo.",
    };
  }

  // 4. Detección de formularios dinámicos interactivos Adobe XFA
  const hasXfa = /\/XFA\s*[\[<]/i.test(rawString);
  if (hasXfa) {
    return {
      compatible: false,
      issueType: "COMPLEX_OR_UNSUPPORTED",
      title: "Formulario dinámico XFA no compatible",
      message:
        "El documento es un formulario dinámico XML de Adobe (XFA) que no admite inserción de páginas adicionales.",
      recommendation:
        "Abre el documento en tu visor de PDF o navegador y selecciona 'Imprimir' > 'Guardar como PDF' para generar una versión aplanada compatible.",
    };
  }

  // 5. Verificación de procesabilidad estructural (Simulación de parseo)
  let nativeSuccess = false;
  try {
    const lastXrefOffset = findLastXrefOffset(buffer);
    findLastEofPosition(buffer);
    findLastPageObject(buffer, lastXrefOffset);
    parseXrefTable(buffer, lastXrefOffset);
    nativeSuccess = true;
  } catch {
    nativeSuccess = false;
  }

  if (nativeSuccess) {
    return {
      compatible: true,
      title: "Documento compatible",
      message: "El documento está listo para ser firmado.",
      recommendation: "",
      isPostQuantumMultisign: hasByteRange,
    };
  }

  // Si el parseo nativo falló, probamos normalización (típico de PDFs con XRef comprimida 1.5+)
  try {
    const normalizedBuffer = await tryNormalize(buffer);
    const normXref = findLastXrefOffset(normalizedBuffer);
    findLastEofPosition(normalizedBuffer);
    findLastPageObject(normalizedBuffer, normXref);
    parseXrefTable(normalizedBuffer, normXref);

    return {
      compatible: true,
      title: "Documento compatible",
      message: "El documento es compatible mediante normalización automática.",
      recommendation: "",
      isPostQuantumMultisign: false,
    };
  } catch (normErr: any) {
    // Si la normalización falla (caso típico del billete de Renfe o PDFs protegidos con PDFDict undefined):
    const rawError = normErr?.message || String(normErr);
    const isDictError = /PDFDict|instance of undefined/i.test(rawError);

    return {
      compatible: false,
      issueType: "COMPLEX_OR_UNSUPPORTED",
      title: "Estructura del documento incompatible",
      message: isDictError
        ? "El documento presenta una estructura interna compleja o no estándar (frecuente en billetes oficiales de transporte como Renfe, facturas automatizadas o formularios bancarios)."
        : "La estructura interna del PDF (árbol de páginas o tabla de referencias) no admite la inserción segura de firmas.",
      details: isDictError
        ? "El archivo contiene objetos o flujos de referencias incompatibles con la reconstrucción de páginas."
        : `Detalle: ${rawError}`,
      recommendation:
        "Abre el documento en tu navegador (Chrome, Edge) o visor de PDF y selecciona 'Imprimir' > 'Guardar como PDF' para crear una copia limpia y 100% compatible.",
    };
  }
}

/**
 * Convierte cualquier error capturado durante el proceso de firma en un diagnóstico claro y amigable.
 */
export function translateSigningError(error: unknown): PdfCompatibilityResult {
  const errMsg = error instanceof Error ? error.message : String(error || "");

  if (/PDFDict|instance of undefined/i.test(errMsg)) {
    return {
      compatible: false,
      issueType: "COMPLEX_OR_UNSUPPORTED",
      title: "Estructura de documento incompatible",
      message:
        "El documento presenta una estructura interna compleja (frecuente en billetes oficiales como Renfe o billetes emitidos por sistemas automatizados) que no permite la modificación de páginas.",
      details:
        "El documento no superó la normalización interna de objetos debido a referencias incompatibles.",
      recommendation:
        "Abre el archivo en tu navegador o visor de PDF y selecciona 'Imprimir' > 'Guardar como PDF' para generar una versión limpia y firmable.",
    };
  }

  if (/multifirmado|firma previa|ByteRange|no compatible/i.test(errMsg)) {
    return {
      compatible: false,
      issueType: "INCOMPATIBLE_SIGNATURES",
      title: "Documento con firmas no compatibles",
      message:
        "El documento ya cuenta con firmas digitales en un formato previo que no es compatible con el estándar post-cuántico ML-DSA-65.",
      details:
        "Para preservar la validez legal y criptográfica, no se permite añadir firmas cuánticas sobre firmas tradicionales incompatibles.",
      recommendation: "Utiliza el documento original sin firmar o un archivo emitido por esta plataforma.",
    };
  }

  if (/password|encrypt|cifrado|protegido/i.test(errMsg)) {
    return {
      compatible: false,
      issueType: "ENCRYPTED_OR_PROTECTED",
      title: "Documento protegido o cifrado",
      message: "El archivo PDF cuenta con protección de seguridad activa o permisos bloqueados.",
      recommendation: "Elimina la contraseña o restricciones del documento antes de intentar firmarlo.",
    };
  }

  if (/clave privada|generado tus claves|404/i.test(errMsg)) {
    return {
      compatible: false,
      issueType: "SERVER_OR_KEY_ERROR",
      title: "Clave privada no encontrada",
      message: "No se encontró tu clave privada criptográfica.",
      recommendation: "Dirígete a la sección de Generación de Claves para crear tus claves post-cuánticas.",
    };
  }

  // Fallback genérico legible
  return {
    compatible: false,
    issueType: "COMPLEX_OR_UNSUPPORTED",
    title: "No se pudo procesar el documento",
    message: errMsg || "Ocurrió un problema al leer la estructura del documento.",
    recommendation: "Intenta volver a guardar el PDF con 'Imprimir en PDF' o prueba con otro archivo.",
  };
}
