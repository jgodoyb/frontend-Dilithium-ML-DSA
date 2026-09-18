/**
 * validatePdf.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * SECURITY: Magic-bytes PDF validation (OWASP File Upload Cheat Sheet).
 *
 * Attack surface: an attacker can rename any file to ".pdf" to bypass extension
 * checks. The only reliable way to detect a real PDF is to inspect the first 4
 * bytes of the file content, which must be the ASCII sequence "%PDF" (hex
 * 25 50 44 46). This is the PDF magic number defined in ISO 32000-1.
 *
 * We intentionally do NOT trust:
 *   - File.type  → user-agent controlled, easily spoofed
 *   - File.name  → trivially renamed by the attacker
 *
 * Usage:
 *   const result = await validatePdf(file);
 *   if (!result.valid) toast({ description: result.reason });
 */

export interface PdfValidationResult {
  valid: boolean;
  reason?: string;
}

/** PDF magic bytes: %PDF */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export async function validatePdf(file: File): Promise<PdfValidationResult> {
  // ── 1. Size guard ──────────────────────────────────────────────────────────
  if (file.size === 0) {
    return { valid: false, reason: "El archivo está vacío." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, reason: "El tamaño máximo permitido es 100 MB." };
  }

  // ── 2. Magic-bytes check ───────────────────────────────────────────────────
  // Read only the first 4 bytes — no need to load the full file into memory.
  const slice = file.slice(0, 4);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const isPdf = PDF_MAGIC.every((b, i) => bytes[i] === b);

  if (!isPdf) {
    return {
      valid: false,
      reason:
        "El archivo no es un PDF válido. Cabecera de archivo incorrecta (magic bytes).",
    };
  }

  return { valid: true };
}
