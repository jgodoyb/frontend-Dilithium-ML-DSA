/**
 * pdfDiagnostic.ts
 * 
 * Herramienta de auditoría de bajo nivel y diagnóstico estructural para documentos PDF (ISO 32000-1).
 * Permite inspeccionar la integridad de cabeceras (%PDF-1.x), objetos de firma (/Type /Sig),
 * delimitadores /ByteRange [offset1 len1 offset2 len2], placeholder /Contents <...>,
 * y cola del documento (xref, trailer, startxref, %%EOF).
 * 
 * Proporciona comparación binaria exhaustiva (Hex Dump) entre firmas generadas en distintos
 * entornos (Windows vs macOS) para detectar desajustes a nivel de byte.
 */

export interface PdfStructureValidation {
  valid: boolean;
  fileSize: number;
  header: {
    valid: boolean;
    version: string;
    rawHex: string;
    rawAscii: string;
  };
  tail: {
    valid: boolean;
    lastEofOffset: number;
    startXrefOffset: number;
    rawTailHex: string;
    rawTailAscii: string;
  };
  signature?: {
    valid: boolean;
    sigObjectOffset?: number;
    byteRange?: [number, number, number, number];
    byteRangeSumMatchesTotal: boolean;
    contentsOffset?: number;
    contentsLength?: number;
    bracketOpenValid: boolean;
    bracketCloseValid: boolean;
    hexCharsValid: boolean;
  };
  objectCollisions: string[];
  errors: string[];
}

export interface PdfBinaryDiffReport {
  identical: boolean;
  lengthA: number;
  lengthB: number;
  lengthDelta: number;
  firstDiffOffset: number | null;
  firstDiffContextHexA?: string;
  firstDiffContextHexB?: string;
  firstDiffContextAsciiA?: string;
  firstDiffContextAsciiB?: string;
  headerComparison: {
    match: boolean;
    headA: string;
    headB: string;
  };
  tailComparison: {
    match: boolean;
    tailA: string;
    tailB: string;
  };
  contentsComparison?: {
    match: boolean;
    offsetA?: number;
    offsetB?: number;
    byteRangeA?: [number, number, number, number];
    byteRangeB?: [number, number, number, number];
  };
}

/**
 * Normaliza un buffer o vista a Uint8Array.
 */
function toUint8Array(input: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (input instanceof Uint8Array) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  throw new TypeError("pdfDiagnostic: Entrada no válida, se esperaba ArrayBuffer o TypedArray.");
}

/**
 * Genera una visualización Hex Dump tradicional (16 bytes por línea con offset, hex y ascii).
 */
export function formatHexDump(bytes: Uint8Array, offset = 0, length = bytes.length): string {
  const start = Math.max(0, offset);
  const end = Math.min(bytes.length, start + length);
  const lines: string[] = [];

  for (let i = start; i < end; i += 16) {
    const chunkEnd = Math.min(end, i + 16);
    const chunk = bytes.subarray(i, chunkEnd);
    
    const hexPart = Array.from(chunk)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ")
      .padEnd(48, " ");

    const asciiPart = Array.from(chunk)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
      .join("");

    const offsetPart = i.toString(16).padStart(8, "0").toUpperCase();
    lines.push(`${offsetPart}  ${hexPart}  |${asciiPart}|`);
  }

  return lines.join("\n");
}

/**
 * Valida la estructura binaria completa de un PDF firmado según la especificación ISO 32000-1.
 */
export function validatePdfStructure(input: ArrayBuffer | ArrayBufferView): PdfStructureValidation {
  const bytes = toUint8Array(input);
  const fileSize = bytes.length;
  const errors: string[] = [];
  const objectCollisions: string[] = [];

  // 1. Cabecera (primeros 50 bytes)
  const headBytes = bytes.subarray(0, Math.min(50, fileSize));
  const headAscii = Array.from(headBytes).map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : ".")).join("");
  const headHex = Array.from(headBytes).map((b) => b.toString(16).padStart(2, "0")).join(" ");

  const headerValid = headBytes[0] === 0x25 && headBytes[1] === 0x50 && headBytes[2] === 0x44 && headBytes[3] === 0x46; // %PDF
  let version = "Unknown";
  if (headerValid) {
    const versionMatch = /%PDF-(\d+\.\d+)/.exec(headAscii);
    if (versionMatch) version = versionMatch[1];
  } else {
    errors.push("Cabecera no válida: no comienza con '%PDF-'");
  }

  // 2. Detección de colisiones de fin de objeto (endobj seguido de dígito sin espacio)
  const fullText = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
  const collisionRegex = /endobj(\d+)/gi;
  let collMatch: RegExpExecArray | null;
  while ((collMatch = collisionRegex.exec(fullText)) !== null) {
    const snippet = collMatch[0];
    objectCollisions.push(`Colisión detectada en posición ${collMatch.index}: '${snippet}' (falta espacio/salto de línea tras endobj)`);
    errors.push(`Sintaxis inválida: '${snippet}' rompe delimitación de token según ISO 32000`);
  }

  // 3. Cola del documento (startxref, %%EOF)
  const tailScanLen = Math.min(4096, fileSize);
  const tailBytes = bytes.subarray(Math.max(0, fileSize - tailScanLen));
  const tailAscii = Array.from(tailBytes).map((b) => String.fromCharCode(b)).join("");
  const tailHex = Array.from(tailBytes.subarray(Math.max(0, tailBytes.length - 100))).map((b) => b.toString(16).padStart(2, "0")).join(" ");

  const eofIdx = tailAscii.lastIndexOf("%%EOF");
  let lastEofOffset = -1;
  let startXrefOffset = -1;
  let tailValid = false;

  if (eofIdx !== -1) {
    lastEofOffset = (fileSize - tailScanLen) + eofIdx;
    const preEof = tailAscii.substring(0, eofIdx);
    const startXrefMatch = /startxref\s+(\d+)\s*$/i.exec(preEof.trim());
    if (startXrefMatch) {
      startXrefOffset = parseInt(startXrefMatch[1], 10);
      tailValid = true;
    } else {
      // Búsqueda más flexible
      const matches = [...tailAscii.matchAll(/startxref\s*(\r\n|\n|\r)\s*(\d+)/gi)];
      if (matches.length > 0) {
        startXrefOffset = parseInt(matches[matches.length - 1][2], 10);
        tailValid = true;
      } else {
        errors.push("No se encontró 'startxref <offset>' previo a %%EOF");
      }
    }
  } else {
    errors.push("No se encontró marcador '%%EOF' al final del documento");
  }

  // 4. Diccionario de firma /Type /Sig y /ByteRange
  let signatureInfo: PdfStructureValidation["signature"];
  const byteRangeMatch = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/.exec(fullText);

  if (byteRangeMatch) {
    const b0 = parseInt(byteRangeMatch[1], 10);
    const b1 = parseInt(byteRangeMatch[2], 10);
    const b2 = parseInt(byteRangeMatch[3], 10);
    const b3 = parseInt(byteRangeMatch[4], 10);
    const byteRange: [number, number, number, number] = [b0, b1, b2, b3];

    // Validar suma de rangos: b1 + placeholder + b3 === fileSize
    const placeholderLength = b2 - b1;
    const sumMatches = b1 + placeholderLength + b3 === fileSize;
    if (!sumMatches) {
      errors.push(`Desfase en ByteRange: b1(${b1}) + gap(${placeholderLength}) + b3(${b3}) = ${b1 + placeholderLength + b3} !== fileSize(${fileSize})`);
    }

    // El byte en b1 debe ser exactamente '<' (0x3C)
    const bracketOpenValid = b1 < fileSize && bytes[b1] === 0x3c;
    if (!bracketOpenValid) {
      errors.push(`ByteRange offset1 (${b1}) no apunta al delimitador '<' (byte encontrado: 0x${bytes[b1]?.toString(16) || "??"})`);
    }

    // El byte en b2 - 1 debe ser exactamente '>' (0x3E)
    const bracketCloseValid = b2 - 1 < fileSize && bytes[b2 - 1] === 0x3e;
    if (!bracketCloseValid) {
      errors.push(`ByteRange offset2 - 1 (${b2 - 1}) no apunta al delimitador '>' (byte encontrado: 0x${bytes[b2 - 1]?.toString(16) || "??"})`);
    }

    // Validar caracteres hexadecimales dentro del placeholder (de b1 + 1 hasta b2 - 1)
    let hexCharsValid = true;
    for (let i = b1 + 1; i < b2 - 1; i++) {
      const c = bytes[i];
      const isHex = (c >= 0x30 && c <= 0x39) || (c >= 0x61 && c <= 0x66) || (c >= 0x41 && c <= 0x46);
      if (!isHex) {
        hexCharsValid = false;
        errors.push(`Carácter no hexadecimal (0x${c.toString(16)}) detectado dentro del placeholder en offset ${i}`);
        break;
      }
    }

    signatureInfo = {
      valid: sumMatches && bracketOpenValid && bracketCloseValid && hexCharsValid,
      byteRange,
      byteRangeSumMatchesTotal: sumMatches,
      contentsOffset: b1 + 1,
      contentsLength: placeholderLength - 2,
      bracketOpenValid,
      bracketCloseValid,
      hexCharsValid,
    };
  }

  return {
    valid: errors.length === 0 && headerValid && tailValid,
    fileSize,
    header: {
      valid: headerValid,
      version,
      rawHex: headHex,
      rawAscii: headAscii,
    },
    tail: {
      valid: tailValid,
      lastEofOffset,
      startXrefOffset,
      rawTailHex: tailHex,
      rawTailAscii: tailAscii.substring(Math.max(0, tailAscii.length - 100)),
    },
    signature: signatureInfo,
    objectCollisions,
    errors,
  };
}

/**
 * Compara dos archivos PDF a nivel de byte (ej. firmado en Windows vs firmado en macOS)
 * identificando el primer byte de discrepancia y analizando diferencias estructurales.
 */
export function comparePdfBinaries(
  inputA: ArrayBuffer | ArrayBufferView,
  inputB: ArrayBuffer | ArrayBufferView
): PdfBinaryDiffReport {
  const bytesA = toUint8Array(inputA);
  const bytesB = toUint8Array(inputB);

  const lengthA = bytesA.length;
  const lengthB = bytesB.length;
  const lengthDelta = lengthB - lengthA;

  let firstDiffOffset: number | null = null;
  const minLen = Math.min(lengthA, lengthB);

  for (let i = 0; i < minLen; i++) {
    if (bytesA[i] !== bytesB[i]) {
      firstDiffOffset = i;
      break;
    }
  }

  if (firstDiffOffset === null && lengthA !== lengthB) {
    firstDiffOffset = minLen;
  }

  const identical = firstDiffOffset === null && lengthA === lengthB;

  // Contexto de discrepancia
  let firstDiffContextHexA: string | undefined;
  let firstDiffContextHexB: string | undefined;
  let firstDiffContextAsciiA: string | undefined;
  let firstDiffContextAsciiB: string | undefined;

  if (firstDiffOffset !== null) {
    const ctxStart = Math.max(0, firstDiffOffset - 16);
    const ctxLen = 48;

    firstDiffContextHexA = formatHexDump(bytesA, ctxStart, ctxLen);
    firstDiffContextHexB = formatHexDump(bytesB, ctxStart, ctxLen);

    const subA = bytesA.subarray(ctxStart, Math.min(lengthA, ctxStart + ctxLen));
    const subB = bytesB.subarray(ctxStart, Math.min(lengthB, ctxStart + ctxLen));
    firstDiffContextAsciiA = Array.from(subA).map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : ".")).join("");
    firstDiffContextAsciiB = Array.from(subB).map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : ".")).join("");
  }

  // Comparación de cabeceras
  const headA = Array.from(bytesA.subarray(0, Math.min(50, lengthA))).map((b) => String.fromCharCode(b)).join("");
  const headB = Array.from(bytesB.subarray(0, Math.min(50, lengthB))).map((b) => String.fromCharCode(b)).join("");

  // Comparación de colas (últimos 100 bytes)
  const tailA = Array.from(bytesA.subarray(Math.max(0, lengthA - 100))).map((b) => String.fromCharCode(b)).join("");
  const tailB = Array.from(bytesB.subarray(Math.max(0, lengthB - 100))).map((b) => String.fromCharCode(b)).join("");

  // Comparación de /Contents y /ByteRange
  const valA = validatePdfStructure(bytesA);
  const valB = validatePdfStructure(bytesB);

  let contentsComparison: PdfBinaryDiffReport["contentsComparison"];
  if (valA.signature || valB.signature) {
    const match = JSON.stringify(valA.signature?.byteRange) === JSON.stringify(valB.signature?.byteRange) &&
                  valA.signature?.contentsLength === valB.signature?.contentsLength;
    contentsComparison = {
      match,
      offsetA: valA.signature?.contentsOffset,
      offsetB: valB.signature?.contentsOffset,
      byteRangeA: valA.signature?.byteRange,
      byteRangeB: valB.signature?.byteRange,
    };
  }

  return {
    identical,
    lengthA,
    lengthB,
    lengthDelta,
    firstDiffOffset,
    firstDiffContextHexA,
    firstDiffContextHexB,
    firstDiffContextAsciiA,
    firstDiffContextAsciiB,
    headerComparison: {
      match: headA === headB,
      headA,
      headB,
    },
    tailComparison: {
      match: tailA === tailB,
      tailA,
      tailB,
    },
    contentsComparison,
  };
}
