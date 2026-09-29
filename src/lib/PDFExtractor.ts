/**
 * PDFExtractor.ts
 * 
 * Módulo para la inspección e ingeniería inversa de documentos PDF con firmas digitales (ISO 32000).
 * Extrae todas las firmas criptográficas aplicadas mediante actualizaciones incrementales,
 * navegando la cadena de trailers y punteros /Prev hasta la versión original del archivo.
 * 
 * Cero dependencias externas (utiliza exclusivamente APIs estándar de JavaScript y TypedArrays).
 */

import { findLastXrefOffset } from "./PDFScanner";

export interface ExtractedSignature {
  /**
   * Rango de exclusión [offsetA, lenA, offsetB, lenB] sobre el que se calculó el hash.
   */
  byteRange: [number, number, number, number];
  /**
   * Firma criptográfica en formato hexadecimal extraída del diccionario /Contents.
   */
  signatureHex: string;
  /**
   * Capa o número de revisión cronológica de la firma (1 = primera firma, 2 = segunda firma, etc.).
   */
  layer: number;
  /**
   * UUID del firmante extraído del campo estándar /ContactInfo.
   */
  signerId?: string;
  /**
   * Nombre legible del firmante (/Name) si está disponible.
   */
  signerName?: string;
  /**
   * Fecha de la firma (/M) si está disponible.
   */
  signingDate?: string;
  /**
   * Filtro del motor de firma (/Filter) ej. QProof.
   */
  filter?: string;
  /**
   * Algoritmo de firma (/SubFilter) ej. MLDSA.
   */
  subFilter?: string;
}

/**
 * Decodifica de forma segura un fragmento de bytes a cadena usando codificación Latin-1
 * para garantizar un mapeo 1-a-1 exacto entre valores de byte y caracteres ASCII/binarios.
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
 * Extrae todas las firmas digitales (/Type /Sig) presentes en un documento PDF,
 * recorriendo la cadena histórica de revisiones y trailers (/Prev) según la norma ISO 32000.
 * 
 * @param buffer - ArrayBuffer con los datos binarios del documento PDF.
 * @returns Array de objetos con las firmas detectadas ordenadas cronológicamente por capa.
 * @throws {TypeError} Si el buffer de entrada es inválido.
 */
export function extractSignatures(buffer: ArrayBuffer): ExtractedSignature[] {
  if (!buffer || !(buffer instanceof ArrayBuffer || (typeof buffer === "object" && "byteLength" in (buffer as { byteLength: unknown })))) {
    throw new TypeError("PDFExtractor: buffer debe ser un ArrayBuffer válido.");
  }

  let currentXrefOffset: number;
  try {
    currentXrefOffset = findLastXrefOffset(buffer);
  } catch {
    // Si no contiene startxref o no es un PDF válido, no contiene firmas detectables
    return [];
  }

  const bytes = new Uint8Array(buffer);
  const totalLength = bytes.length;
  const rawSignatures: Omit<ExtractedSignature, "layer">[] = [];
  const visitedOffsets = new Set<number>();

  let iterOffset: number | null = currentXrefOffset;
  let nextBoundEnd = totalLength;

  // Bucle de navegación inversa a través de los trailers de revisiones
  while (iterOffset !== null && iterOffset > 0 && iterOffset < totalLength) {
    if (visitedOffsets.has(iterOffset)) {
      // Prevención de ciclos infinitos en PDFs maliciosos o corruptos
      break;
    }
    visitedOffsets.add(iterOffset);

    // 1. Decodificar la sección del trailer y tabla XRef de la revisión actual
    const trailerChunk = decodeLatin1(bytes, iterOffset, Math.min(totalLength, iterOffset + 4096));

    // Buscar el puntero /Prev dentro del diccionario trailer << ... >>
    let prevOffset: number | null = null;
    const trailerDictMatch = /trailer\s*<<([\s\S]*?)>>/i.exec(trailerChunk);
    if (trailerDictMatch) {
      const prevMatch = /\/Prev\s+(\d+)/.exec(trailerDictMatch[1]);
      if (prevMatch) {
        prevOffset = parseInt(prevMatch[1], 10);
      }
    } else {
      const directPrevMatch = /\/Prev\s+(\d+)/.exec(trailerChunk);
      if (directPrevMatch) {
        prevOffset = parseInt(directPrevMatch[1], 10);
      }
    }

    // 2. Determinar la ventana de bytes perteneciente a ESTA revisión exclusiva
    const revisionStart = prevOffset !== null && prevOffset < iterOffset ? prevOffset : 0;
    const revisionChunk = decodeLatin1(bytes, revisionStart, nextBoundEnd);

    // 3. Buscar diccionarios /Type /Sig dentro de esta revisión
    const sigDictRegex = /<<\s*(?:(?!<<)[\s\S])*?\/Type\s*\/Sig[\s\S]*?>>/gi;
    let match: RegExpExecArray | null;

    while ((match = sigDictRegex.exec(revisionChunk)) !== null) {
      const dictText = match[0];

      // Extraer /ByteRange [ 0 1500 4000 500 ]
      const byteRangeMatch = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/.exec(dictText);
      if (!byteRangeMatch) continue;

      const byteRange: [number, number, number, number] = [
        parseInt(byteRangeMatch[1], 10),
        parseInt(byteRangeMatch[2], 10),
        parseInt(byteRangeMatch[3], 10),
        parseInt(byteRangeMatch[4], 10),
      ];

      // Extraer contenido de /Contents <0000...a1b2...>
      const contentsMatch = /\/Contents\s*<([0-9a-fA-F\s]+)>/i.exec(dictText);
      const rawHex = contentsMatch ? contentsMatch[1].replace(/\s+/g, "") : "";

      // Extraer UUID del firmante desde /ContactInfo
      const contactMatch = /\/ContactInfo\s*\(([^)]*)\)/.exec(dictText);
      const signerId = contactMatch ? contactMatch[1].replace(/\\([()\\])/g, "$1") : undefined;

      // Extraer metadatos complementarios opcionales
      const nameMatch = /\/Name\s*\(([^)]*)\)/.exec(dictText);
      const signerName = nameMatch ? nameMatch[1].replace(/\\([()\\])/g, "$1") : undefined;

      const dateMatch = /\/M\s*\(([^)]*)\)/.exec(dictText);
      const signingDate = dateMatch ? dateMatch[1] : undefined;

      const filterMatch = /\/Filter\s*\/([a-zA-Z0-9_]+)/.exec(dictText);
      const filter = filterMatch ? filterMatch[1] : undefined;

      const subFilterMatch = /\/SubFilter\s*\/([a-zA-Z0-9_]+)/.exec(dictText);
      const subFilter = subFilterMatch ? subFilterMatch[1] : undefined;

      rawSignatures.push({
        byteRange,
        signatureHex: rawHex,
        signerId,
        signerName,
        signingDate,
        filter,
        subFilter,
      });
    }

    nextBoundEnd = revisionStart;

    if (prevOffset !== null && prevOffset > 0 && prevOffset < iterOffset) {
      iterOffset = prevOffset;
    } else {
      break;
    }
  }

  // Invertir el array para que las capas queden en orden cronológico (Layer 1 = primera firma)
  const ordered = rawSignatures.reverse();

  return ordered.map((sig, index) => ({
    ...sig,
    layer: index + 1,
  }));
}
