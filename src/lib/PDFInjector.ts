/**
 * PDFInjector.ts
 * 
 * Módulo para la generación de Actualizaciones Incrementales Visuales Multi-Objeto en documentos PDF (ISO 32000).
 * Combina en una única revisión atómica:
 *  1. Modificación y reescritura del Objeto de Página (/Type /Page) para absorber el nuevo /Annots.
 *  2. Creación del Objeto de Anotación (/Type /Annot /Subtype /Widget /FT /Sig).
 *  3. Creación del Objeto de Apariencia Form XObject (/Type /XObject /Subtype /Form).
 *  4. Creación del Objeto de Firma Digital (/Type /Sig) con /ContactInfo (UUID) y /ByteRange precalculado.
 *  5. Generación de la tabla XRef delta multi-subsección y tráiler con puntero /Prev, /Root y /ID.
 * 
 * Cero dependencias externas.
 */

import { extractObject, parseXrefTable } from "./PDFParser";

export interface PrepareVisualSignatureOptions {
  /**
   * Número de objeto indirecto asignado a la anotación Widget (por defecto: 997).
   */
  widgetObjNumber?: number;
  /**
   * Número de objeto indirecto asignado al Form XObject de apariencia (por defecto: 998).
   */
  apObjNumber?: number;
  /**
   * Número de objeto indirecto asignado al diccionario /Sig (por defecto: 999).
   */
  sigObjectNumber?: number;
  /**
   * Tamaño en bytes de la firma binaria cruda esperada (por defecto: 8192 bytes = 16384 caracteres hex).
   */
  placeholderBytes?: number;
  /**
   * Fecha de la firma (por defecto: fecha actual).
   */
  signingDate?: Date;
  /**
   * Motivo de la firma (opcional).
   */
  reason?: string;
  /**
   * Ubicación o contexto de la firma (opcional).
   */
  location?: string;
  /**
   * Nombre único del campo de firma en la anotación Widget (por defecto: "FirmaAmador").
   */
  fieldName?: string;
  /**
   * Diccionario de la página original si ya fue previamente extraído (opcional).
   */
  pageDict?: string;
}

export interface PreparedVisualSignatureDocument {
  /**
   * Buffer completo del PDF con la actualización incremental multi-objeto inyectada y lista para hashear.
   */
  preparedPdfBuffer: ArrayBuffer;
  /**
   * Valores exactos del ByteRange [0, offset1, offset2, offset3] según ISO 32000-1 §12.8.1.
   */
  byteRange: [number, number, number, number];
  /**
   * Offset de byte exacto donde comienzan los caracteres hexadecimales del placeholder
   * (inmediatamente después del carácter '<').
   */
  contentsOffset: number;
  /**
   * Longitud en caracteres hexadecimales del placeholder (ej. 16384 caracteres).
   */
  contentsHexLength: number;
  /**
   * Número del objeto indirecto asignado al diccionario /Sig.
   */
  sigObjectNumber: number;
  /**
   * Número del objeto indirecto asignado al Widget de anotación.
   */
  widgetObjNumber: number;
  /**
   * Número del objeto indirecto asignado al Form XObject de apariencia.
   */
  apObjNumber: number;
  /**
   * Número del objeto indirecto de la página modificada.
   */
  pageObjNumber: number;
  /**
   * Offset donde comienza la nueva tabla de referencias cruzadas (XRef delta).
   */
  newXrefOffset: number;
}

/**
 * Formatea una fecha según el estándar PDF (D:YYYYMMDDHHmmSSOHH'mm').
 */
function formatPdfDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  return `D:${year}${month}${day}${hours}${minutes}${seconds}Z`;
}

/**
 * Escapa caracteres especiales en cadenas literales PDF `( ... )`.
 */
function escapePdfString(str: string): string {
  if (!str) return "";
  return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Decodifica una sección de bytes a cadena usando codificación Latin-1
 * para mantener un mapeo 1-a-1 estricto con los índices de byte del PDF.
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
 * Construye una tabla de referencias cruzadas XRef delta estándar ISO 32000-1 §7.5.4
 * agrupando entradas en subsecciones contiguas con formato exacto de 20 bytes por entrada.
 */
function buildDeltaXrefTable(entries: Array<{ objNum: number; offset: number }>): string {
  const sorted = [...entries].sort((a, b) => a.objNum - b.objNum);
  const subsections: Array<{ startObj: number; entries: Array<{ objNum: number; offset: number }> }> = [];
  let currentSub: { startObj: number; entries: Array<{ objNum: number; offset: number }> } | null = null;

  for (const entry of sorted) {
    if (!currentSub || entry.objNum !== currentSub.startObj + currentSub.entries.length) {
      currentSub = { startObj: entry.objNum, entries: [entry] };
      subsections.push(currentSub);
    } else {
      currentSub.entries.push(entry);
    }
  }

  let xref = "xref\r\n";
  for (const sub of subsections) {
    xref += `${sub.startObj} ${sub.entries.length}\r\n`;
    for (const item of sub.entries) {
      const paddedOffset = String(item.offset).padStart(10, "0");
      xref += `${paddedOffset} 00000 n \r\n`;
    }
  }

  return xref;
}

/**
 * Reescribe el diccionario de una página (/Type /Page) agregando la nueva anotación Widget
 * al array /Annots y fusionándola limpiamente con cualquier anotación previa existente.
 */
function buildUpdatedPageObject(
  originalPageText: string,
  pageObjNumber: number,
  existingAnnots: string,
  widgetObjNumber: number
): string {
  // Extraer el interior del diccionario << ... >>
  const dictMatch = /<<([\s\S]*?)>>/.exec(originalPageText);
  let dictBody = dictMatch ? dictMatch[1] : originalPageText;

  // Remover cualquier entrada previa de /Annots (directa o indirecta)
  dictBody = dictBody.replace(/\/Annots\s*\[[\s\S]*?\]/g, "");
  dictBody = dictBody.replace(/\/Annots\s+\d+\s+\d+\s+R/g, "");

  const lines = dictBody
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => `  ${l}`);

  const newAnnotRef = `${widgetObjNumber} 0 R`;
  const mergedAnnots = existingAnnots && existingAnnots.trim().length > 0
    ? `${existingAnnots.trim()} ${newAnnotRef}`
    : newAnnotRef;

  lines.push(`  /Annots [ ${mergedAnnots} ]`);

  return `${pageObjNumber} 0 obj\n<<\n${lines.join("\n")}\n>>\nendobj\n`;
}

/**
 * Prepara una Actualización Incremental Visual completa en un documento PDF (ISO 32000).
 * Inyecta atómicamente la página modificada, la anotación Widget, el Form XObject de apariencia
 * y el diccionario de firma digital /Sig con sus rangos de byte precalculados.
 * 
 * @param buffer - ArrayBuffer del PDF original.
 * @param lastXrefOffset - Byte offset de la tabla XRef previa.
 * @param lastEofPos - Posición en bytes del último marcador %%EOF.
 * @param pageObjNumber - Número de objeto de la página a la que se añade la firma.
 * @param existingAnnots - Cadena con referencias de anotaciones previas en la página (ej. "15 0 R 16 0 R" o "").
 * @param appearanceStreamText - Código completo del Form XObject generado por PDFAppearance.
 * @param widgetRect - Coordenadas [llx, lly, urx, ury] del sello en la página.
 * @param signerId - Identificador único / UUID del firmante para /ContactInfo.
 * @param signerName - Nombre legible del firmante para /Name.
 * @param options - Opciones de configuración adicionales (números de objetos, placeholder, etc.).
 * @returns Objeto con el nuevo documento preparado, offsets exactos y rangos de byte.
 */
export function prepareVisualSignatureUpdate(
  buffer: ArrayBuffer,
  lastXrefOffset: number,
  lastEofPos: number,
  pageObjNumber: number,
  existingAnnots: string,
  appearanceStreamText: string,
  widgetRect: number[],
  signerId: string,
  signerName: string,
  options: PrepareVisualSignatureOptions = {}
): PreparedVisualSignatureDocument {
  if (!buffer || !(buffer instanceof ArrayBuffer || "byteLength" in (buffer as any))) {
    throw new TypeError("PDFInjector: buffer debe ser un ArrayBuffer válido.");
  }
  if (!Array.isArray(widgetRect) || widgetRect.length !== 4) {
    throw new TypeError("PDFInjector: widgetRect debe ser un array de 4 números [llx, lly, urx, ury].");
  }

  let widgetObjNumber = options.widgetObjNumber;
  let apObjNumber = options.apObjNumber;
  let sigObjectNumber = options.sigObjectNumber;

  if (widgetObjNumber === undefined || apObjNumber === undefined || sigObjectNumber === undefined) {
    try {
      const xrefMap = parseXrefTable(buffer, lastXrefOffset);
      const maxInDoc = xrefMap.size > 0 ? Math.max(...xrefMap.keys()) : 900;
      widgetObjNumber = widgetObjNumber ?? maxInDoc + 1;
      apObjNumber = apObjNumber ?? maxInDoc + 2;
      sigObjectNumber = sigObjectNumber ?? maxInDoc + 3;
    } catch {
      widgetObjNumber = widgetObjNumber ?? 997;
      apObjNumber = apObjNumber ?? 998;
      sigObjectNumber = sigObjectNumber ?? 999;
    }
  }

  const placeholderBytes = options.placeholderBytes ?? 8192;
  const hexLength = placeholderBytes * 2; // 8192 bytes = 16384 caracteres hex
  const signingDate = options.signingDate ?? new Date();
  const dateStr = formatPdfDate(signingDate);
  const safeName = escapePdfString(signerName);
  const safeSignerId = escapePdfString(signerId);
  const safeFieldName = escapePdfString(options.fieldName ?? "FirmaAmador");

  const encoder = new TextEncoder();

  // 1. Extraer el slice base del archivo original hasta el último %%EOF
  const rawBytes = new Uint8Array(buffer);
  const baseSlice = rawBytes.subarray(0, lastEofPos);

  const lastChar = baseSlice[baseSlice.length - 1];
  const needsNewline = lastChar !== 0x0a && lastChar !== 0x0d;
  const baseOffset = baseSlice.length + (needsNewline ? 1 : 0);

  // 2. Modificación del Objeto de Página
  const originalPageText = options.pageDict
    ? `${pageObjNumber} 0 obj\n${options.pageDict}\nendobj`
    : extractObject(buffer, 0); // Si no se pasa pageDict, usa fallback o dict mínimo

  const updatedPageObjText = buildUpdatedPageObject(
    options.pageDict ? `${pageObjNumber} 0 obj\n${options.pageDict}\nendobj` : originalPageText,
    pageObjNumber,
    existingAnnots,
    widgetObjNumber
  );
  const pageObjBytes = encoder.encode(updatedPageObjText);

  // 3. Objeto Widget Annotation (/Type /Annot /Subtype /Widget)
  const [x1, y1, x2, y2] = widgetRect;
  const widgetObjText = `${widgetObjNumber} 0 obj\n<<\n  /Type /Annot\n  /Subtype /Widget\n  /FT /Sig\n  /V ${sigObjectNumber} 0 R\n  /T (${safeFieldName})\n  /Rect [${x1} ${y1} ${x2} ${y2}]\n  /F 132\n  /P ${pageObjNumber} 0 R\n  /AP <<\n    /N ${apObjNumber} 0 R\n  >>\n>>\nendobj\n`;
  const widgetObjBytes = encoder.encode(widgetObjText);

  // 4. Objeto Form XObject de Apariencia
  let normalizedApText = appearanceStreamText.trim();
  if (!/^\d+\s+\d+\s+obj/i.test(normalizedApText)) {
    normalizedApText = `${apObjNumber} 0 obj\n${normalizedApText}\nendobj\n`;
  } else {
    normalizedApText = normalizedApText.replace(/^\s*\d+\s+\d+\s+obj/i, `${apObjNumber} 0 obj`);
    if (!normalizedApText.endsWith("\n")) {
      normalizedApText += "\n";
    }
  }
  const apObjBytes = encoder.encode(normalizedApText);

  // 5. Objeto de Firma (/Type /Sig) con plantilla de ByteRange fijo
  const DUMMY_DIGITS = "0000000000";
  const byteRangePlaceholder = `[ ${DUMMY_DIGITS} ${DUMMY_DIGITS} ${DUMMY_DIGITS} ${DUMMY_DIGITS} ]`;

  const sigObjHeader = `${sigObjectNumber} 0 obj\n<<\n  /Type /Sig\n  /Filter /QProof\n  /SubFilter /MLDSA\n  /Name (${safeName})\n  /M (${dateStr})\n  /ContactInfo (${safeSignerId})\n`;
  const optionalFields = [
    options.reason ? `  /Reason (${escapePdfString(options.reason)})\n` : "",
    options.location ? `  /Location (${escapePdfString(options.location)})\n` : "",
  ].join("");

  const byteRangeKey = `  /ByteRange `;
  const contentsKeyAndOpen = `\n  /Contents <`;
  const textBeforeContents = sigObjHeader + optionalFields + byteRangeKey + byteRangePlaceholder + contentsKeyAndOpen;
  const textBeforeContentsBytes = encoder.encode(textBeforeContents);

  // 6. Cálculo de Offsets para cada uno de los 4 objetos
  const pageObjOffset = baseOffset;
  const widgetObjOffset = pageObjOffset + pageObjBytes.length;
  const apObjOffset = widgetObjOffset + widgetObjBytes.length;
  const sigObjOffset = apObjOffset + apObjBytes.length;

  // Offset 1: Posición exacta del carácter '<' de /Contents
  const offset1 = sigObjOffset + textBeforeContentsBytes.length - 1;

  // Offset 2: Posición inmediatamente posterior al carácter '>' de /Contents
  const offset2 = offset1 + 1 + hexLength + 1;

  // Resto del objeto /Sig tras el placeholder de Contents
  const restOfSigObj = `\n>>\nendobj\n`;
  const restOfSigObjBytes = encoder.encode(restOfSigObj);
  const sigFooter = `>` + restOfSigObj;
  const sigFooterBytes = encoder.encode(sigFooter);

  // La nueva tabla XRef delta comienza inmediatamente tras el cierre de /Sig
  const newXrefOffset = offset2 + restOfSigObjBytes.length;

  // 7. Construcción de la tabla XRef delta para los 4 objetos
  const xrefEntries = [
    { objNum: pageObjNumber, offset: pageObjOffset },
    { objNum: widgetObjNumber, offset: widgetObjOffset },
    { objNum: apObjNumber, offset: apObjOffset },
    { objNum: sigObjectNumber, offset: sigObjOffset },
  ];

  const xrefTable = buildDeltaXrefTable(xrefEntries);
  const xrefTableBytes = encoder.encode(xrefTable);

  // 8. Extracción del Tráiler Original y Construcción del Nuevo Tráiler (ISO 32000)
  const trailerScanArea = decodeLatin1(
    rawBytes,
    Math.max(0, lastXrefOffset - 512),
    Math.min(rawBytes.length, lastXrefOffset + 8192)
  );

  let rootRef = "";
  let idArray = "";

  const rootMatch = /\/Root\s+\d+\s+\d+\s+R/i.exec(trailerScanArea);
  if (rootMatch) {
    rootRef = rootMatch[0].trim();
  }

  const idMatch = /\/ID\s*\[[\s\S]*?\]/i.exec(trailerScanArea);
  if (idMatch) {
    idArray = idMatch[0].trim().replace(/\s+/g, " ");
  }

  const maxObjNum = Math.max(...xrefEntries.map((e) => e.objNum));
  const trailerSize = Math.max(1000, maxObjNum + 1);

  const rootRefLine = rootRef ? `  ${rootRef}\n` : "";
  const idArrayLine = idArray ? `  ${idArray}\n` : "";

  const trailer = `trailer\n<<\n  /Size ${trailerSize}\n  /Prev ${lastXrefOffset}\n${rootRefLine}${idArrayLine}>>\nstartxref\n${newXrefOffset}\n%%EOF\n`;
  const trailerBytes = encoder.encode(trailer);

  // 9. Cálculo de Offset 3: Longitud desde offset2 hasta el final del archivo
  const totalLength = newXrefOffset + xrefTableBytes.length + trailerBytes.length;
  const offset3 = totalLength - offset2;

  // 10. Ensamblaje del ByteRange final con padding exacto de 10 dígitos
  const p0 = "0".padStart(10, "0");
  const p1 = String(offset1).padStart(10, "0");
  const p2 = String(offset2).padStart(10, "0");
  const p3 = String(offset3).padStart(10, "0");
  const finalByteRangeStr = `[ ${p0} ${p1} ${p2} ${p3} ]`;

  const finalPreContentsText = sigObjHeader + optionalFields + byteRangeKey + finalByteRangeStr + contentsKeyAndOpen;
  const finalPreContentsBytes = encoder.encode(finalPreContentsText);

  // 11. Escritura binaria en el nuevo buffer
  const finalBuffer = new Uint8Array(totalLength);
  let writePtr = 0;

  // a) PDF base original
  finalBuffer.set(baseSlice, 0);
  writePtr += baseSlice.length;

  if (needsNewline) {
    finalBuffer[writePtr++] = 0x0a;
  }

  // b) Objeto de Página Modificado
  finalBuffer.set(pageObjBytes, writePtr);
  writePtr += pageObjBytes.length;

  // c) Objeto Widget Annotation
  finalBuffer.set(widgetObjBytes, writePtr);
  writePtr += widgetObjBytes.length;

  // d) Objeto Form XObject de Apariencia
  finalBuffer.set(apObjBytes, writePtr);
  writePtr += apObjBytes.length;

  // e) Cabecera de /Sig y ByteRange
  finalBuffer.set(finalPreContentsBytes, writePtr);
  writePtr += finalPreContentsBytes.length;

  // f) Relleno del placeholder de /Contents con ceros ASCII ('0' = 0x30)
  const contentsStartOffset = writePtr;
  finalBuffer.fill(0x30, writePtr, writePtr + hexLength);
  writePtr += hexLength;

  // g) Cierre '>' y footer del objeto /Sig
  finalBuffer.set(sigFooterBytes, writePtr);
  writePtr += sigFooterBytes.length;

  // h) Tabla XRef delta
  finalBuffer.set(xrefTableBytes, writePtr);
  writePtr += xrefTableBytes.length;

  // i) Tráiler y %%EOF final
  finalBuffer.set(trailerBytes, writePtr);
  writePtr += trailerBytes.length;

  if (writePtr !== totalLength) {
    throw new Error(`PDFInjector: Desfase en el ensamblaje binario (${writePtr} !== ${totalLength}).`);
  }

  return {
    preparedPdfBuffer: finalBuffer.buffer,
    byteRange: [0, offset1, offset2, offset3],
    contentsOffset: contentsStartOffset,
    contentsHexLength: hexLength,
    sigObjectNumber,
    widgetObjNumber,
    apObjNumber,
    pageObjNumber,
    newXrefOffset,
  };
}

export interface PrepareSignatureOptions {
  /**
   * Número de objeto indirecto asignado al diccionario /Sig (por defecto: 999).
   */
  sigObjectNumber?: number;
  /**
   * Tamaño en bytes del placeholder de firma (por defecto: 8192 bytes = 16384 caracteres hex).
   */
  placeholderBytes?: number;
  /**
   * Fecha de la firma (por defecto: fecha actual).
   */
  signingDate?: Date;
  /**
   * Motivo de la firma (opcional).
   */
  reason?: string;
  /**
   * Ubicación o contexto de la firma (opcional).
   */
  location?: string;
  /**
   * Información de contacto o identificador del firmante (opcional).
   */
  contactInfo?: string;
  /**
   * Identificador único (UUID) del firmante (opcional).
   */
  signerId?: string;
}

export interface PreparedSignatureDocument {
  /**
   * Buffer completo del PDF con la actualización incremental inyectada.
   */
  preparedPdfBuffer: ArrayBuffer;
  /**
   * Valores del ByteRange [0, offset1, offset2, offset3].
   */
  byteRange: [number, number, number, number];
  /**
   * Offset donde comienza el placeholder de /Contents.
   */
  contentsOffset: number;
  /**
   * Longitud en caracteres hexadecimales del placeholder.
   */
  contentsHexLength: number;
  /**
   * Número de objeto asignado a la firma.
   */
  sigObjectNumber: number;
  /**
   * Offset de la nueva tabla XRef delta.
   */
  newXrefOffset: number;
}

/**
 * Prepara una actualización incremental básica mono-objeto (/Type /Sig) sin widget visual.
 */
export function prepareSignatureUpdate(
  buffer: ArrayBuffer,
  lastXrefOffset: number,
  lastEofPos: number,
  signerName: string,
  options: PrepareSignatureOptions = {}
): PreparedSignatureDocument {
  if (!buffer || !(buffer instanceof ArrayBuffer || "byteLength" in (buffer as any))) {
    throw new TypeError("PDFInjector: buffer debe ser un ArrayBuffer válido.");
  }

  const sigObjectNumber = options.sigObjectNumber ?? 999;
  const placeholderBytes = options.placeholderBytes ?? 8192;
  const hexLength = placeholderBytes * 2;
  const signingDate = options.signingDate ?? new Date();
  const dateStr = formatPdfDate(signingDate);
  const safeName = escapePdfString(signerName);
  const contactInfo = options.signerId ?? options.contactInfo;
  const safeContactInfo = contactInfo ? escapePdfString(contactInfo) : undefined;

  const encoder = new TextEncoder();

  const rawBytes = new Uint8Array(buffer);
  const baseSlice = rawBytes.subarray(0, lastEofPos);

  const lastChar = baseSlice[baseSlice.length - 1];
  const needsNewline = lastChar !== 0x0a && lastChar !== 0x0d;
  const baseOffset = baseSlice.length + (needsNewline ? 1 : 0);

  const DUMMY_DIGITS = "0000000000";
  const byteRangePlaceholder = `[ ${DUMMY_DIGITS} ${DUMMY_DIGITS} ${DUMMY_DIGITS} ${DUMMY_DIGITS} ]`;

  let sigObjHeader = `${sigObjectNumber} 0 obj\n<<\n  /Type /Sig\n  /Filter /QProof\n  /SubFilter /MLDSA\n  /Name (${safeName})\n  /M (${dateStr})\n`;
  if (safeContactInfo) {
    sigObjHeader += `  /ContactInfo (${safeContactInfo})\n`;
  }
  const optionalFields = [
    options.reason ? `  /Reason (${escapePdfString(options.reason)})\n` : "",
    options.location ? `  /Location (${escapePdfString(options.location)})\n` : "",
  ].join("");

  const byteRangeKey = `  /ByteRange `;
  const contentsKeyAndOpen = `\n  /Contents <`;
  const textBeforeContents = sigObjHeader + optionalFields + byteRangeKey + byteRangePlaceholder + contentsKeyAndOpen;
  const textBeforeContentsBytes = encoder.encode(textBeforeContents);

  const sigObjOffset = baseOffset;
  const offset1 = sigObjOffset + textBeforeContentsBytes.length - 1;
  const offset2 = offset1 + 1 + hexLength + 1;

  const restOfSigObj = `\n>>\nendobj\n`;
  const restOfSigObjBytes = encoder.encode(restOfSigObj);
  const sigFooter = `>` + restOfSigObj;
  const sigFooterBytes = encoder.encode(sigFooter);

  const newXrefOffset = offset2 + restOfSigObjBytes.length;

  const xrefEntries = [{ objNum: sigObjectNumber, offset: sigObjOffset }];
  const xrefTable = buildDeltaXrefTable(xrefEntries);
  const xrefTableBytes = encoder.encode(xrefTable);

  const trailerScanArea = decodeLatin1(
    rawBytes,
    Math.max(0, lastXrefOffset - 512),
    Math.min(rawBytes.length, lastXrefOffset + 8192)
  );

  let rootRef = "";
  let idArray = "";

  const rootMatch = /\/Root\s+\d+\s+\d+\s+R/i.exec(trailerScanArea);
  if (rootMatch) {
    rootRef = rootMatch[0].trim();
  }

  const idMatch = /\/ID\s*\[[\s\S]*?\]/i.exec(trailerScanArea);
  if (idMatch) {
    idArray = idMatch[0].trim().replace(/\s+/g, " ");
  }

  const trailerSize = Math.max(1000, sigObjectNumber + 1);
  const rootRefLine = rootRef ? `  ${rootRef}\n` : "";
  const idArrayLine = idArray ? `  ${idArray}\n` : "";

  const trailer = `trailer\n<<\n  /Size ${trailerSize}\n  /Prev ${lastXrefOffset}\n${rootRefLine}${idArrayLine}>>\nstartxref\n${newXrefOffset}\n%%EOF\n`;
  const trailerBytes = encoder.encode(trailer);

  const totalLength = newXrefOffset + xrefTableBytes.length + trailerBytes.length;
  const offset3 = totalLength - offset2;

  const p0 = "0".padStart(10, "0");
  const p1 = String(offset1).padStart(10, "0");
  const p2 = String(offset2).padStart(10, "0");
  const p3 = String(offset3).padStart(10, "0");
  const finalByteRangeStr = `[ ${p0} ${p1} ${p2} ${p3} ]`;

  const finalPreContentsText = sigObjHeader + optionalFields + byteRangeKey + finalByteRangeStr + contentsKeyAndOpen;
  const finalPreContentsBytes = encoder.encode(finalPreContentsText);

  const finalBuffer = new Uint8Array(totalLength);
  let writePtr = 0;

  finalBuffer.set(baseSlice, 0);
  writePtr += baseSlice.length;

  if (needsNewline) {
    finalBuffer[writePtr++] = 0x0a;
  }

  finalBuffer.set(finalPreContentsBytes, writePtr);
  writePtr += finalPreContentsBytes.length;

  const contentsStartOffset = writePtr;
  finalBuffer.fill(0x30, writePtr, writePtr + hexLength);
  writePtr += hexLength;

  finalBuffer.set(sigFooterBytes, writePtr);
  writePtr += sigFooterBytes.length;

  finalBuffer.set(xrefTableBytes, writePtr);
  writePtr += xrefTableBytes.length;

  finalBuffer.set(trailerBytes, writePtr);
  writePtr += trailerBytes.length;

  if (writePtr !== totalLength) {
    throw new Error(`PDFInjector: Desfase en el ensamblaje binario (${writePtr} !== ${totalLength}).`);
  }

  return {
    preparedPdfBuffer: finalBuffer.buffer,
    byteRange: [0, offset1, offset2, offset3],
    contentsOffset: contentsStartOffset,
    contentsHexLength: hexLength,
    sigObjectNumber,
    newXrefOffset,
  };
}
