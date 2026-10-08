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
import { generateSignatureSheetDrawingStream } from "./PDFAppearance";

export interface PrepareVisualSignatureOptions {
  /**
   * Número de objeto indirecto asignado a la anotación Widget (por defecto: calculado dinámicamente).
   */
  widgetObjNumber?: number;
  /**
   * Número de objeto indirecto asignado al Form XObject de apariencia (por defecto: calculado dinámicamente).
   */
  apObjNumber?: number;
  /**
   * Número de objeto indirecto asignado al diccionario /Sig (por defecto: calculado dinámicamente).
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

  // --- OPCIONES PARA HOJA DE FIRMAS (SIGNATURE SHEET) ---
  /**
   * Indica si se debe crear una nueva Hoja de Firmas en lugar de firmar sobre una página existente.
   */
  createNewSignatureSheet?: boolean;
  /**
   * Número del objeto raíz de páginas (/Pages). Necesario si createNewSignatureSheet es true.
   */
  pagesRootObjNumber?: number;
  /**
   * Diccionario del objeto raíz de páginas original si ya fue extraído.
   */
  pagesRootDict?: string;
  /**
   * Conteo actual de páginas en el documento (/Count).
   */
  pagesCount?: number;
  /**
   * Array con los números de objeto de los hijos (/Kids) del objeto /Pages raíz.
   */
  kids?: number[];
  /**
   * Número de objeto indirecto asignado a la nueva página de anexo (si se crea).
   */
  newPageObjNumber?: number;
  /**
   * Número de objeto indirecto asignado al stream de contenido de la nueva página (si se crea).
   */
  sheetContentObjNumber?: number;
  /**
   * Dimensiones [llx, lly, urx, ury] del MediaBox para la nueva página de anexo (por defecto: [0, 0, 595.28, 841.89]).
   */
  mediaBox?: [number, number, number, number];
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
   * Número del objeto indirecto de la página a la que pertenece la firma.
   */
  pageObjNumber: number;
  /**
   * Offset donde comienza la nueva tabla de referencias cruzadas (XRef delta).
   */
  newXrefOffset: number;
  /**
   * Indica si se creó una nueva Hoja de Firmas en esta actualización.
   */
  isNewSignatureSheetCreated?: boolean;
  /**
   * Número del objeto raíz de páginas actualizado (/Pages) si se creó una nueva hoja.
   */
  pagesRootObjNumber?: number;
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
  const normalized = str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-");
  return normalized
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
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
      xref += `${paddedOffset} 00000 n\r\n`;
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
  // Expresión regular segura para capturar el array de Annots
  const annotsRegex = /\/Annots\s*\[([\s\S]*?)\]/i;
  const match = annotsRegex.exec(originalPageText);

  const newAnnotRef = `${widgetObjNumber} 0 R`;
  let updatedText = originalPageText;

  if (match) {
    // Extracción y limpieza quirúrgica solo del interior del array
    const oldInner = match[1].replace(/[[\]]/g, "").trim().replace(/\s+/g, " ");
    const merged = oldInner.length > 0 ? `${oldInner} ${newAnnotRef}` : newAnnotRef;
    
    // Reemplazo exacto que no altera el resto del diccionario (evita trigger de Adobe MDP)
    updatedText = originalPageText.replace(annotsRegex, `/Annots [ ${merged} ]`);
  } else {
    // Si no existe directamente un array inline, verificar si había un /Annots de referencia indirecta previa
    const indirectAnnotsRegex = /\/Annots\s+\d+\s+\d+\s+R/i;
    const cleanExisting = (existingAnnots || "").replace(/[[\]]/g, "").trim().replace(/\s+/g, " ");
    const combinedAnnots = cleanExisting.length > 0 ? `${cleanExisting} ${newAnnotRef}` : newAnnotRef;

    if (indirectAnnotsRegex.test(originalPageText)) {
      updatedText = originalPageText.replace(indirectAnnotsRegex, `/Annots [ ${combinedAnnots} ]`);
    } else {
      // Si no existe, se inyecta de forma segura antes del cierre principal
      const insertPos = originalPageText.lastIndexOf(">>");
      if (insertPos !== -1) {
        const before = originalPageText.substring(0, insertPos);
        const after = originalPageText.substring(insertPos);
        updatedText = `${before}  /Annots [ ${combinedAnnots} ]\n${after}`;
      }
    }
  }

  // Blindaje de cabeceras de objeto PDF
  if (!/^\s*\d+\s+\d+\s+obj/i.test(updatedText)) {
    updatedText = `${pageObjNumber} 0 obj\n` + updatedText;
  }
  if (!/endobj\s*$/i.test(updatedText)) {
    updatedText = updatedText.trimEnd() + "\nendobj\n";
  } else if (!updatedText.endsWith("\n")) {
    updatedText += "\n";
  }

  return updatedText;
}

/**
 * Reescribe el objeto raíz del árbol de páginas (/Type /Pages) en una actualización incremental,
 * añadiendo el nuevo número de página al array /Kids e incrementando /Count en una unidad.
 */
function buildUpdatedPagesRootObject(
  originalPagesText: string,
  pagesObjNumber: number,
  newPageObjNumber: number,
  existingKids: number[] = [],
  oldCount = 1
): string {
  const startIdx = originalPagesText.indexOf("<<");
  const endIdx = originalPagesText.lastIndexOf(">>");
  let dictBody =
    startIdx !== -1 && endIdx > startIdx
      ? originalPagesText.substring(startIdx + 2, endIdx)
      : originalPagesText;

  // Remover /Kids y /Count previos
  dictBody = dictBody.replace(/\/Kids\s*\[[\s\S]*?\]/g, "");
  dictBody = dictBody.replace(/\/Count\s+\d+/g, "");

  const lines = dictBody
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => `  ${l}`);

  // Si no se pasaron kids, intentar parsear los antiguos
  let kidsList = existingKids;
  if (!kidsList || kidsList.length === 0) {
    const oldKidsMatch = /\/Kids\s*\[([\s\S]*?)\]/i.exec(originalPagesText);
    if (oldKidsMatch) {
      kidsList = [...oldKidsMatch[1].matchAll(/(\d+)\s+\d+\s+R/g)].map((m) => parseInt(m[1], 10));
    }
  }

  const updatedKids = [...kidsList, newPageObjNumber];
  const kidsStr = updatedKids.map((k) => `${k} 0 R`).join(" ");

  let calculatedCount = oldCount;
  if (calculatedCount <= 0) {
    const oldCountMatch = /\/Count\s+(\d+)/.exec(originalPagesText);
    calculatedCount = oldCountMatch ? parseInt(oldCountMatch[1], 10) : kidsList.length;
  }
  const newCount = Math.max(kidsList.length + 1, calculatedCount + 1);

  if (!lines.some((l) => /\/Type\s*\/Pages\b/.test(l))) {
    lines.unshift("  /Type /Pages");
  }

  lines.push(`  /Kids [ ${kidsStr} ]`);
  lines.push(`  /Count ${newCount}`);

  return `${pagesObjNumber} 0 obj\n<<\n${lines.join("\n")}\n>>\nendobj\n`;
}

/**
 * Construye el objeto indirecto de una nueva Hoja de Firmas (/Type /Page) según ISO 32000.
 */
function buildNewSignatureSheetPageObject(
  pageObjNumber: number,
  pagesRootObjNumber: number,
  sheetContentObjNumber: number,
  widgetObjNumber: number,
  mediaBox: [number, number, number, number] = [0, 0, 595.28, 841.89]
): string {
  const boxStr = `${mediaBox[0]} ${mediaBox[1]} ${mediaBox[2]} ${mediaBox[3]}`;
  return `${pageObjNumber} 0 obj
<<
  /Type /Page
  /Parent ${pagesRootObjNumber} 0 R
  /MediaBox [${boxStr}]
  /Resources <<
    /Font <<
      /F1 <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica
        /Encoding /WinAnsiEncoding
      >>
      /F1B <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica-Bold
        /Encoding /WinAnsiEncoding
      >>
    >>
    /ProcSet [/PDF /Text]
  >>
  /Contents ${sheetContentObjNumber} 0 R
  /Annots [ ${widgetObjNumber} 0 R ]
  /QProofSheet true
  /PieceInfo <<
    /QProof <<
      /Private (SignatureSheet)
    >>
  >>
>>
endobj
`;
}

/**
 * Construye el objeto indirecto de contenido stream para la cabecera y estructura de la Hoja de Firmas.
 */
function buildSignatureSheetContentStreamObject(
  sheetContentObjNumber: number,
  pageWidth = 595.28,
  pageHeight = 841.89
): string {
  const streamContent = generateSignatureSheetDrawingStream(pageWidth, pageHeight);
  const encoder = new TextEncoder();
  const streamBytes = encoder.encode(streamContent);
  return `${sheetContentObjNumber} 0 obj\n<<\n  /Length ${streamBytes.length}\n>>\nstream\n${streamContent}\nendstream\nendobj\n`;
}

/**
 * Prepara una Actualización Incremental Visual completa en un documento PDF (ISO 32000).
 * Soporta tanto la firma en páginas existentes como la creación atómica de una nueva Hoja de Firmas
 * (Anexo de Firmas) al final del documento con actualización incremental de /Pages y /Kids.
 * 
 * @param buffer - ArrayBuffer del PDF original.
 * @param lastXrefOffset - Byte offset de la tabla XRef previa.
 * @param lastEofPos - Posición en bytes del último marcador %%EOF.
 * @param pageObjNumber - Número de objeto de la página a la que se añade la firma (o número de la nueva página).
 * @param existingAnnots - Cadena con referencias de anotaciones previas en la página (ej. "15 0 R 16 0 R" o "").
 * @param appearanceStreamText - Código completo del Form XObject generado por PDFAppearance.
 * @param widgetRect - Coordenadas [llx, lly, urx, ury] del sello en la página.
 * @param signerId - Identificador único / UUID del firmante para /ContactInfo.
 * @param signerName - Nombre legible del firmante para /Name.
 * @param options - Opciones de configuración adicionales (números de objetos, hoja de firmas, etc.).
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
  if (!buffer || !(buffer instanceof ArrayBuffer || (typeof buffer === "object" && "byteLength" in (buffer as { byteLength: unknown })))) {
    throw new TypeError("PDFInjector: buffer debe ser un ArrayBuffer válido.");
  }
  if (!Array.isArray(widgetRect) || widgetRect.length !== 4) {
    throw new TypeError("PDFInjector: widgetRect debe ser un array de 4 números [llx, lly, urx, ury].");
  }

  const createNewSignatureSheet = options.createNewSignatureSheet ?? false;

  let widgetObjNumber = options.widgetObjNumber;
  let apObjNumber = options.apObjNumber;
  let sigObjectNumber = options.sigObjectNumber;
  let newPageObjNumber = options.newPageObjNumber;
  let sheetContentObjNumber = options.sheetContentObjNumber;
  const pagesRootObjNumber = options.pagesRootObjNumber ?? 2;

  // Resolución y asignación dinámica de IDs para blindaje de colisiones
  try {
    const xrefMap = parseXrefTable(buffer, lastXrefOffset);
    const maxInDoc = xrefMap.size > 0 ? Math.max(...xrefMap.keys()) : 900;
    let nextId = maxInDoc + 1;

    if (createNewSignatureSheet) {
      sheetContentObjNumber = sheetContentObjNumber ?? nextId++;
      newPageObjNumber = newPageObjNumber ?? nextId++;
    }
    widgetObjNumber = widgetObjNumber ?? nextId++;
    apObjNumber = apObjNumber ?? nextId++;
    sigObjectNumber = sigObjectNumber ?? nextId++;
  } catch {
    if (createNewSignatureSheet) {
      sheetContentObjNumber = sheetContentObjNumber ?? 995;
      newPageObjNumber = newPageObjNumber ?? 996;
    }
    widgetObjNumber = widgetObjNumber ?? 997;
    apObjNumber = apObjNumber ?? 998;
    sigObjectNumber = sigObjectNumber ?? 999;
  }

  const targetPageObjNumber = createNewSignatureSheet
    ? (newPageObjNumber as number)
    : pageObjNumber;

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

  // 2. Preparar objetos dependientes del modo (Crear nueva hoja vs Modificar página existente)
  let pagesRootBytes: Uint8Array | null = null;
  let sheetContentBytes: Uint8Array | null = null;
  let pageObjBytes: Uint8Array;

  const mediaBox = options.mediaBox ?? [0, 0, 595.28, 841.89];
  const pageWidth = mediaBox[2] - mediaBox[0];
  const pageHeight = mediaBox[3] - mediaBox[1];

  if (createNewSignatureSheet) {
    // Modo A: Nueva Hoja de Firmas
    // a) Actualización del objeto raíz /Pages
    const originalPagesRootText = options.pagesRootDict
      ? `${pagesRootObjNumber} 0 obj\n${options.pagesRootDict}\nendobj`
      : extractObject(buffer, 0);

    const updatedPagesRootText = buildUpdatedPagesRootObject(
      originalPagesRootText,
      pagesRootObjNumber,
      targetPageObjNumber,
      options.kids ?? [],
      options.pagesCount ?? 1
    );
    pagesRootBytes = encoder.encode(updatedPagesRootText);

    // b) Stream de Contenido de la Hoja de Firmas
    const sheetContentText = buildSignatureSheetContentStreamObject(
      sheetContentObjNumber as number,
      pageWidth,
      pageHeight
    );
    sheetContentBytes = encoder.encode(sheetContentText);

    // c) Objeto de la Nueva Página (/Type /Page)
    const newPageObjText = buildNewSignatureSheetPageObject(
      targetPageObjNumber,
      pagesRootObjNumber,
      sheetContentObjNumber as number,
      widgetObjNumber as number,
      mediaBox
    );
    pageObjBytes = encoder.encode(newPageObjText);
  } else {
    // Modo B: Reutilizar / Modificar página existente
    const originalPageText = options.pageDict
      ? `${pageObjNumber} 0 obj\n${options.pageDict}\nendobj`
      : extractObject(buffer, 0);

    const updatedPageObjText = buildUpdatedPageObject(
      originalPageText,
      pageObjNumber,
      existingAnnots,
      widgetObjNumber as number
    );
    const safePageObjText = updatedPageObjText.endsWith("\n") ? updatedPageObjText : updatedPageObjText + "\n";
    pageObjBytes = encoder.encode(safePageObjText);
  }

  // 3. Objeto Widget Annotation (/Type /Annot /Subtype /Widget)
  const [x1, y1, x2, y2] = widgetRect;
  const widgetObjText = `${widgetObjNumber} 0 obj\n<<\n  /Type /Annot\n  /Subtype /Widget\n  /FT /Sig\n  /V ${sigObjectNumber} 0 R\n  /T (${safeFieldName})\n  /Rect [${x1} ${y1} ${x2} ${y2}]\n  /F 132\n  /P ${targetPageObjNumber} 0 R\n  /AP <<\n    /N ${apObjNumber} 0 R\n  >>\n>>\nendobj\n`;
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

  // 6. Cálculo secuencial de Offsets para cada uno de los objetos del delta
  let currentOffset = baseOffset;
  const xrefEntries: Array<{ objNum: number; offset: number }> = [];

  let pagesRootOffset = 0;
  let sheetContentOffset = 0;

  if (createNewSignatureSheet && pagesRootBytes && sheetContentBytes) {
    // 1. Objeto /Pages actualizado
    pagesRootOffset = currentOffset;
    xrefEntries.push({ objNum: pagesRootObjNumber, offset: pagesRootOffset });
    currentOffset += pagesRootBytes.length;

    // 2. Stream de Contenido de la Hoja
    sheetContentOffset = currentOffset;
    xrefEntries.push({ objNum: sheetContentObjNumber as number, offset: sheetContentOffset });
    currentOffset += sheetContentBytes.length;
  }

  // 3. Objeto de Página (nueva o modificada)
  const pageObjOffset = currentOffset;
  xrefEntries.push({ objNum: targetPageObjNumber, offset: pageObjOffset });
  currentOffset += pageObjBytes.length;

  // 4. Objeto Widget Annotation
  const widgetObjOffset = currentOffset;
  xrefEntries.push({ objNum: widgetObjNumber as number, offset: widgetObjOffset });
  currentOffset += widgetObjBytes.length;

  // 5. Objeto Form XObject de Apariencia
  const apObjOffset = currentOffset;
  xrefEntries.push({ objNum: apObjNumber as number, offset: apObjOffset });
  currentOffset += apObjBytes.length;

  // 6. Objeto de Firma (/Type /Sig)
  const sigObjOffset = currentOffset;
  xrefEntries.push({ objNum: sigObjectNumber as number, offset: sigObjOffset });

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

  // 7. Construcción de la tabla XRef delta
  const xrefTable = buildDeltaXrefTable(xrefEntries);
  const xrefTableBytes = encoder.encode(xrefTable);

  // 8. Extracción del Tráiler Original y Construcción del Nuevo Tráiler (ISO 32000)
  // Escaneo acotado a la ventana del trailer previo para evitar falsos positivos y decodificaciones masivas
  const trailerScanStart = Math.max(0, Math.min(lastXrefOffset - 64, lastEofPos - 16384));
  const trailerChunk = decodeLatin1(rawBytes, trailerScanStart, lastEofPos);

  let rootRef = "";
  let idArray = "";

  const rootMatch = /\/Root\s+\d+\s+\d+\s+R/i.exec(trailerChunk);
  if (rootMatch) {
    rootRef = rootMatch[0].trim();
  } else {
    const backStart = Math.max(0, lastEofPos - 65536);
    const backChunk = decodeLatin1(rawBytes, backStart, lastEofPos);
    const fbRoot = /\/Root\s+\d+\s+\d+\s+R/i.exec(backChunk);
    if (fbRoot) rootRef = fbRoot[0].trim();
  }

  const idMatch = /\/ID\s*\[[\s\S]*?\]/i.exec(trailerChunk);
  if (idMatch) {
    idArray = idMatch[0].trim().replace(/\s+/g, " ");
  } else {
    const backStart = Math.max(0, lastEofPos - 65536);
    const backChunk = decodeLatin1(rawBytes, backStart, lastEofPos);
    const fbId = /\/ID\s*\[[\s\S]*?\]/i.exec(backChunk);
    if (fbId) idArray = fbId[0].trim().replace(/\s+/g, " ");
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

  // b) Objetos adicionales si se creó una nueva Hoja de Firmas
  if (createNewSignatureSheet && pagesRootBytes && sheetContentBytes) {
    // Objeto /Pages actualizado
    finalBuffer.set(pagesRootBytes, writePtr);
    writePtr += pagesRootBytes.length;

    // Objeto /Contents de la hoja
    finalBuffer.set(sheetContentBytes, writePtr);
    writePtr += sheetContentBytes.length;
  }

  // c) Objeto de Página (nueva o modificada)
  finalBuffer.set(pageObjBytes, writePtr);
  writePtr += pageObjBytes.length;

  // d) Objeto Widget Annotation
  finalBuffer.set(widgetObjBytes, writePtr);
  writePtr += widgetObjBytes.length;

  // e) Objeto Form XObject de Apariencia
  finalBuffer.set(apObjBytes, writePtr);
  writePtr += apObjBytes.length;

  // f) Cabecera de /Sig y ByteRange
  finalBuffer.set(finalPreContentsBytes, writePtr);
  writePtr += finalPreContentsBytes.length;

  // g) Relleno del placeholder de /Contents con ceros ASCII ('0' = 0x30)
  const contentsStartOffset = writePtr;
  finalBuffer.fill(0x30, writePtr, writePtr + hexLength);
  writePtr += hexLength;

  // h) Cierre '>' y footer del objeto /Sig
  finalBuffer.set(sigFooterBytes, writePtr);
  writePtr += sigFooterBytes.length;

  // i) Tabla XRef delta
  finalBuffer.set(xrefTableBytes, writePtr);
  writePtr += xrefTableBytes.length;

  // j) Tráiler y %%EOF final
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
    sigObjectNumber: sigObjectNumber as number,
    widgetObjNumber: widgetObjNumber as number,
    apObjNumber: apObjNumber as number,
    pageObjNumber: targetPageObjNumber,
    newXrefOffset,
    isNewSignatureSheetCreated: createNewSignatureSheet,
    pagesRootObjNumber: createNewSignatureSheet ? pagesRootObjNumber : undefined,
  };
}
