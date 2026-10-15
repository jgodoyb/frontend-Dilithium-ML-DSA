/**
 * PDFParser.ts
 * 
 * Módulo para el análisis del Árbol de Objetos y Estructura de Páginas de un PDF (ISO 32000).
 * Permite la resolución de tablas XRef y la navegación recursiva del árbol de páginas (/Pages -> /Kids -> /Page)
 * para la inyección visual de sellos y firmas en actualizaciones incrementales.
 * 
 * Cero dependencias externas (utiliza TypedArrays y expresiones regulares sobre Latin-1).
 */

/**
 * Normaliza la entrada binaria a una vista Uint8Array.
 */
function toUint8Array(input: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (!input || typeof input !== "object") {
    throw new TypeError("PDFParser: El parámetro de entrada debe ser un ArrayBuffer válido.");
  }

  if (input instanceof Uint8Array) {
    return input;
  }

  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }

  if (input instanceof ArrayBuffer || "byteLength" in input) {
    return new Uint8Array(input as ArrayBuffer);
  }

  throw new TypeError("PDFParser: El parámetro de entrada debe ser un ArrayBuffer válido.");
}

/**
 * Decodifica una sección de bytes a cadena usando codificación Latin-1
 * para mantener un mapeo 1-a-1 estricto con los índices de byte del PDF.
 */
export function decodeLatin1(bytes: Uint8Array, start: number, end: number): string {
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
 * Codifica una cadena a Uint8Array mapeando cada carácter a su byte Latin-1 (0x00 - 0xFF).
 * Preserva de forma determinista la correspondencia binaria 1-a-1 sin distorsión ni expansión UTF-8.
 */
export function encodeLatin1(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/**
 * Extrae con balanceo estricto el primer diccionario << ... >> de una cadena,
 * evitando absorber diccionarios o contenidos de objetos subsiguientes.
 */
export function extractRootDictionary(text: string): string {
  const start = text.indexOf("<<");
  if (start === -1) return text;

  let depth = 0;
  let inString = false;
  let inHex = false;
  let i = start;

  while (i < text.length) {
    if (inString) {
      if (text[i] === "\\") {
        i += 2;
        continue;
      }
      if (text[i] === ")") inString = false;
      i++;
      continue;
    }
    if (inHex) {
      if (text[i] === ">") inHex = false;
      i++;
      continue;
    }
    if (text[i] === "(") {
      inString = true;
      i++;
      continue;
    }
    if (text[i] === "<" && text[i + 1] === "<") {
      depth++;
      i += 2;
      continue;
    }
    if (text[i] === ">" && text[i + 1] === ">") {
      depth--;
      if (depth === 0) {
        return text.substring(start, i + 2);
      }
      i += 2;
      continue;
    }
    i++;
  }

  return text.substring(start);
}

/**
 * Escanea el buffer en busca de definiciones de objetos indirectos de nivel superior ('X Y obj').
 * Permite poblar el mapa de objetos en documentos que utilizan Streams de Referencias Cruzadas (/Type /XRef)
 * o tablas XRef parciales, sin requerir descompresión externa ni alterar la memoria.
 *
 * @param bytes - Vista Uint8Array de los datos binarios del PDF.
 * @param maxOffset - Límite superior opcional para el escaneo.
 * @returns Map asociando número de objeto -> byte offset exacto en el archivo.
 */
export function scanTopLevelObjects(bytes: Uint8Array, maxOffset?: number): Map<number, number> {
  const map = new Map<number, number>();
  const limit = Math.min(bytes.length, maxOffset ?? bytes.length);
  const CHUNK_SIZE = 65536;
  const OVERLAP = 64;

  let pos = 0;
  while (pos < limit) {
    const chunkEnd = Math.min(limit, pos + CHUNK_SIZE);
    const chunk = decodeLatin1(bytes, pos, chunkEnd);
    const objRegex = /(?:^|[\r\n\s])(\d+)\s+(\d+)\s+obj\b/g;
    let match: RegExpExecArray | null;

    while ((match = objRegex.exec(chunk)) !== null) {
      const fullMatch = match[0];
      const objNum = parseInt(match[1], 10);
      const numOffsetInMatch = fullMatch.indexOf(match[1]);
      const exactOffset = pos + match.index + numOffsetInMatch;

      if (exactOffset < limit) {
        // En PDF, la última definición de un objeto prevalece (revisiones incrementales)
        map.set(objNum, exactOffset);
      }
    }

    if (chunkEnd >= limit) break;
    pos = chunkEnd - OVERLAP;
  }

  return map;
}

export interface PdfTrailerInfo {
  /**
   * Indica si la sección corresponde a un objeto Stream (/Type /XRef) o a un trailer clásico.
   */
  isXRefStream: boolean;
  /**
   * Referencia indirecta al catálogo extraída (/Root X Y R).
   */
  rootRef: string;
  /**
   * Número de objeto indirecto del catálogo (/Root).
   */
  rootObjNumber: number;
  /**
   * Tamaño del documento (/Size).
   */
  size: number;
  /**
   * Array identificador del documento (/ID [ ... ]) si está presente.
   */
  idArray: string;
  /**
   * Byte offset de la revisión previa (/Prev) si existe.
   */
  prevOffset: number | null;
  /**
   * Contenido textual del diccionario entre << y >>.
   */
  dictText: string;
  /**
   * Número del objeto XRef Stream si corresponde a dicho formato.
   */
  xrefObjNumber?: number;
}

/**
 * Analizador universal de diccionarios Trailer (ISO 32000-1 §7.5.5 y §7.5.8).
 * Soporta de forma transparente tanto el formato clásico (palabra clave 'trailer << ... >>')
 * como el formato moderno (/Type /XRef stream 'X 0 obj << ... >> stream').
 *
 * Mantiene el escaneo acotado a la ventana segura para prevenir falsos positivos con flujos comprimidos binarios.
 *
 * @param buffer - ArrayBuffer o Uint8Array con los datos binarios del PDF.
 * @param xrefOffset - Byte offset donde comienza la tabla o stream XRef.
 * @param lastEofPos - Posición en bytes del marcador %%EOF (opcional).
 * @returns Objeto PdfTrailerInfo con los metadatos esenciales del trailer.
 */
export function extractTrailerInfo(
  buffer: ArrayBuffer | Uint8Array,
  xrefOffset: number,
  lastEofPos?: number
): PdfTrailerInfo {
  const bytes = toUint8Array(buffer);
  const totalLength = bytes.length;
  const eof = lastEofPos ?? totalLength;

  // 1. Camino Clásico: Comprobar si en o tras xrefOffset existe la palabra clave 'trailer'
  const scanStart = Math.max(0, xrefOffset - 64);
  const scanEnd = Math.min(totalLength, Math.max(scanStart + 4096, Math.min(scanStart + 65536, eof)));
  const chunk = decodeLatin1(bytes, scanStart, scanEnd);

  // Buscar bloque trailer clásico: trailer << ... >>
  const trailerMatch = /trailer\s*<<([\s\S]*?)>>/i.exec(chunk);

  if (trailerMatch) {
    const dictContent = trailerMatch[1];
    let rootRef = "";
    let rootObjNumber = -1;

    const rootMatch = /\/Root\s+(\d+)\s+\d+\s+R/i.exec(dictContent);
    if (rootMatch) {
      rootObjNumber = parseInt(rootMatch[1], 10);
      rootRef = rootMatch[0].trim();
    }

    let size = 0;
    const sizeMatch = /\/Size\s+(\d+)/.exec(dictContent);
    if (sizeMatch) {
      size = parseInt(sizeMatch[1], 10);
    }

    let idArray = "";
    const idMatch = /\/ID\s*\[[\s\S]*?\]/i.exec(dictContent);
    if (idMatch) {
      idArray = idMatch[0].trim().replace(/\s+/g, " ");
    }

    let prevOffset: number | null = null;
    const prevMatch = /\/Prev\s+(\d+)/.exec(dictContent);
    if (prevMatch) {
      prevOffset = parseInt(prevMatch[1], 10);
    }

    // Fallback acotado a la cola del archivo (últimos 64KB) para /Root y /ID si faltaran en dictContent
    if (!rootRef || !idArray) {
      const backStart = Math.max(0, eof - 65536);
      const backChunk = decodeLatin1(bytes, backStart, eof);
      if (!rootRef) {
        const fbRoot = /\/Root\s+(\d+)\s+\d+\s+R/i.exec(backChunk);
        if (fbRoot) {
          rootObjNumber = parseInt(fbRoot[1], 10);
          rootRef = fbRoot[0].trim();
        }
      }
      if (!idArray) {
        const fbId = /\/ID\s*\[[\s\S]*?\]/i.exec(backChunk);
        if (fbId) {
          idArray = fbId[0].trim().replace(/\s+/g, " ");
        }
      }
    }

    return {
      isXRefStream: false,
      rootRef,
      rootObjNumber,
      size,
      idArray,
      prevOffset,
      dictText: dictContent,
    };
  }

  // 2. Camino XRef Stream Moderno (ISO 32000-1 §7.5.8):
  // Si xrefOffset apunta a un objeto indirecto 'X 0 obj' con '/Type /XRef'
  const objHeaderWindow = decodeLatin1(bytes, Math.max(0, xrefOffset - 64), Math.min(totalLength, xrefOffset + 2048));
  const objMatch = /\b(\d+)\s+\d+\s+obj\b/i.exec(objHeaderWindow);

  if (objMatch) {
    const xrefObjNumber = parseInt(objMatch[1], 10);
    const objOffsetInWindow = objHeaderWindow.indexOf(objMatch[0]);
    const objStart = Math.max(0, xrefOffset - 64) + objOffsetInWindow;

    // Leer el diccionario del objeto (estrictamente delimitado por << y >> antes de la palabra clave 'stream')
    const dictWindow = decodeLatin1(bytes, objStart, Math.min(totalLength, objStart + 8192));
    const streamIdx = dictWindow.indexOf("stream");
    const searchScope = streamIdx !== -1 ? dictWindow.substring(0, streamIdx) : dictWindow;

    const dictOpen = searchScope.indexOf("<<");
    const dictClose = searchScope.lastIndexOf(">>");

    if (dictOpen !== -1 && dictClose > dictOpen) {
      const dictContent = searchScope.substring(dictOpen + 2, dictClose);

      // Verificar que es un stream de tipo XRef
      if (/\/Type\s*\/XRef\b/i.test(dictContent) || /\/Type\s*\/XRef\b/i.test(searchScope)) {
        let rootRef = "";
        let rootObjNumber = -1;

        const rootMatch = /\/Root\s+(\d+)\s+\d+\s+R/i.exec(dictContent);
        if (rootMatch) {
          rootObjNumber = parseInt(rootMatch[1], 10);
          rootRef = rootMatch[0].trim();
        }

        let size = 0;
        const sizeMatch = /\/Size\s+(\d+)/.exec(dictContent);
        if (sizeMatch) {
          size = parseInt(sizeMatch[1], 10);
        }

        let idArray = "";
        const idMatch = /\/ID\s*\[[\s\S]*?\]/i.exec(dictContent);
        if (idMatch) {
          idArray = idMatch[0].trim().replace(/\s+/g, " ");
        }

        let prevOffset: number | null = null;
        const prevMatch = /\/Prev\s+(\d+)/.exec(dictContent);
        if (prevMatch) {
          prevOffset = parseInt(prevMatch[1], 10);
        }

        // Fallback acotado a la cola si fuera necesario
        if (!rootRef || !idArray) {
          const backStart = Math.max(0, eof - 65536);
          const backChunk = decodeLatin1(bytes, backStart, eof);
          if (!rootRef) {
            const fbRoot = /\/Root\s+(\d+)\s+\d+\s+R/i.exec(backChunk);
            if (fbRoot) {
              rootObjNumber = parseInt(fbRoot[1], 10);
              rootRef = fbRoot[0].trim();
            }
          }
          if (!idArray) {
            const fbId = /\/ID\s*\[[\s\S]*?\]/i.exec(backChunk);
            if (fbId) {
              idArray = fbId[0].trim().replace(/\s+/g, " ");
            }
          }
        }

        return {
          isXRefStream: true,
          rootRef,
          rootObjNumber,
          size,
          idArray,
          prevOffset,
          dictText: dictContent,
          xrefObjNumber,
        };
      }
    }
  }

  // 3. Fallback genérico de búsqueda segura en ventana acotada (últimos 64KB)
  const fallbackStart = Math.max(0, eof - 65536);
  const fallbackChunk = decodeLatin1(bytes, fallbackStart, eof);

  let rootRef = "";
  let rootObjNumber = -1;
  const rootMatch = /\/Root\s+(\d+)\s+\d+\s+R/i.exec(fallbackChunk);
  if (rootMatch) {
    rootObjNumber = parseInt(rootMatch[1], 10);
    rootRef = rootMatch[0].trim();
  }

  let idArray = "";
  const idMatch = /\/ID\s*\[[\s\S]*?\]/i.exec(fallbackChunk);
  if (idMatch) {
    idArray = idMatch[0].trim().replace(/\s+/g, " ");
  }

  let prevOffset: number | null = null;
  const prevMatch = /\/Prev\s+(\d+)/.exec(fallbackChunk);
  if (prevMatch) {
    prevOffset = parseInt(prevMatch[1], 10);
  }

  let size = 0;
  const sizeMatch = /\/Size\s+(\d+)/.exec(fallbackChunk);
  if (sizeMatch) {
    size = parseInt(sizeMatch[1], 10);
  }

  return {
    isXRefStream: false,
    rootRef,
    rootObjNumber,
    size,
    idArray,
    prevOffset,
    dictText: "",
  };
}

/**
 * Parsea la tabla de referencias cruzadas (XRef) a partir del offset indicado.
 * Soporta de forma transparente tanto tablas XRef clásicas en texto plano como Streams /Type /XRef (ISO 32000-1 §7.5.8).
 * Si el tráiler incluye la propiedad /Prev, navega recursivamente hacia las revisiones anteriores
 * para construir el mapa acumulativo completo de todos los objetos activos en el documento.
 *
 * @param buffer - ArrayBuffer del documento PDF.
 * @param xrefOffset - Byte offset donde comienza la tabla o stream XRef.
 * @returns Map asociando número de objeto -> byte offset en el archivo.
 */
export function parseXrefTable(buffer: ArrayBuffer, xrefOffset: number): Map<number, number> {
  const bytes = toUint8Array(buffer);
  const totalLength = bytes.length;
  const xrefMap = new Map<number, number>();
  const visitedOffsets = new Set<number>();

  let curOffset: number | null = xrefOffset;
  let encounteredXRefStream = false;

  while (curOffset !== null && curOffset >= 0 && curOffset < totalLength) {
    if (visitedOffsets.has(curOffset)) break;
    visitedOffsets.add(curOffset);

    // Búsqueda flexible en una ventana alrededor del offset
    const searchStart = Math.max(0, curOffset - 64);
    const searchEnd = Math.min(totalLength, curOffset + 65536);
    const chunk = decodeLatin1(bytes, searchStart, searchEnd);

    // Verificar si en curOffset hay una tabla xref clásica
    const xrefIdxInChunk = chunk.indexOf("xref");
    const hasClassicTrailer = /trailer\s*<<[\s\S]*?>>/i.test(chunk);

    if (xrefIdxInChunk !== -1 && hasClassicTrailer) {
      // ── Camino Clásico ──────────────────────────────────────────
      const afterXref = chunk.substring(xrefIdxInChunk + 4);
      const lines = afterXref.split(/\r\n|\n|\r/);

      let lineIdx = 0;
      let prevOffset: number | null = null;

      // Procesar subsecciones de la tabla XRef
      while (lineIdx < lines.length) {
        const line = lines[lineIdx].trim();

        // Si alcanzamos la sección del trailer, terminamos las subsecciones
        if (line.startsWith("trailer")) {
          break;
        }

        if (line === "") {
          lineIdx++;
          continue;
        }

        // Cabecera de subsección: <startObjectNumber> <count>
        const headerMatch = /^(\d+)\s+(\d+)$/.exec(line);
        if (headerMatch) {
          const startObj = parseInt(headerMatch[1], 10);
          const count = parseInt(headerMatch[2], 10);
          lineIdx++;

          // Leer cada una de las entradas de la subsección
          for (let i = 0; i < count && lineIdx < lines.length; i++) {
            const entryLine = lines[lineIdx].trim();
            const entryMatch = /^(\d{10})\s+(\d{5})\s+([nf])/i.exec(entryLine);
            if (entryMatch) {
              const offset = parseInt(entryMatch[1], 10);
              const flag = entryMatch[3].toLowerCase();
              const objNum = startObj + i;

              // En actualizaciones incrementales, las revisiones más recientes tienen prioridad
              if (flag === "n" && !xrefMap.has(objNum)) {
                xrefMap.set(objNum, offset);
              }
            }
            lineIdx++;
          }
        } else {
          lineIdx++;
        }
      }

      // Buscar /Prev en el trailer para enlazar revisiones anteriores
      const trailerMatch = /trailer\s*<<([\s\S]*?)>>/i.exec(chunk);
      if (trailerMatch) {
        const prevMatch = /\/Prev\s+(\d+)/.exec(trailerMatch[1]);
        if (prevMatch) {
          prevOffset = parseInt(prevMatch[1], 10);
        }
      }

      curOffset = prevOffset !== null && prevOffset >= 0 && prevOffset < curOffset ? prevOffset : null;
    } else {
      // ── Camino XRef Stream Moderno (ISO 32000-1 §7.5.8) ────────
      const trailerInfo = extractTrailerInfo(bytes, curOffset);
      if (trailerInfo.isXRefStream) {
        encounteredXRefStream = true;
        if (trailerInfo.xrefObjNumber !== undefined && !xrefMap.has(trailerInfo.xrefObjNumber)) {
          xrefMap.set(trailerInfo.xrefObjNumber, curOffset);
        }
        // Seguir /Prev si apunta a una revisión anterior
        const prevOffset = trailerInfo.prevOffset;
        curOffset = prevOffset !== null && prevOffset >= 0 && prevOffset < curOffset ? prevOffset : null;
      } else {
        break;
      }
    }
  }

  // Si encontramos un XRef Stream (o la tabla XRef estaba vacía),
  // escaneamos los objetos de nivel superior para garantizar resolución completa
  if (encounteredXRefStream || xrefMap.size === 0) {
    const scanned = scanTopLevelObjects(bytes);
    for (const [objNum, offset] of scanned.entries()) {
      if (!xrefMap.has(objNum)) {
        xrefMap.set(objNum, offset);
      }
    }
  }

  return xrefMap;
}

/**
 * Localiza el byte offset de un objeto indirecto ('<objNum> 0 obj') dentro del buffer binario.
 */
export function findObjectOffset(bytes: Uint8Array, objNum: number): number | null {
  const target = new TextEncoder().encode(`${objNum} 0 obj`);
  const targetLen = target.length;
  const maxIdx = bytes.length - targetLen;

  for (let i = 0; i <= maxIdx; i++) {
    if (bytes[i] === target[0]) {
      let match = true;
      for (let j = 1; j < targetLen; j++) {
        if (bytes[i + j] !== target[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        // Validar delimitador anterior para evitar falsos positivos (ej. 115 0 obj al buscar 15 0 obj)
        const prevByte = i > 0 ? bytes[i - 1] : 0x0a;
        const isDelimiter = prevByte <= 0x20 || prevByte === 0x2f || prevByte === 0x3c || prevByte === 0x3e;
        if (isDelimiter) {
          return i;
        }
      }
    }
  }

  return null;
}

/**
 * Resuelve la longitud en bytes de un stream, soportando tanto enteros directos
 * (/Length 12345) como referencias indirectas (/Length 15 0 R) según ISO 32000.
 */
function resolveStreamLength(
  headerAndDict: string,
  buffer: ArrayBuffer,
  bytes: Uint8Array,
  xrefMap?: Map<number, number>
): number | null {
  // 1. Comprobar primero si /Length es una referencia indirecta: /Length 15 0 R
  const indirectMatch = /\/Length\s+(\d+)\s+\d+\s+R\b/.exec(headerAndDict);
  if (indirectMatch) {
    const targetObjNum = parseInt(indirectMatch[1], 10);
    const targetOffset = xrefMap?.get(targetObjNum) ?? findObjectOffset(bytes, targetObjNum);

    if (targetOffset !== null && targetOffset !== undefined && targetOffset >= 0) {
      try {
        const objText = extractObject(buffer, targetOffset);
        // Extraer el número contenido entre 'X Y obj' y 'endobj'
        const cleanContent = objText
          .replace(/^\d+\s+\d+\s+obj/i, "")
          .replace(/endobj$/i, "")
          .trim();
        const parsed = parseInt(cleanContent, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      } catch {
        // Continuar si falla la resolución del objeto indirecto
      }
    }
  }

  // 2. Si no es indirecto, comprobar si es un número directo: /Length 12345
  const directMatch = /\/Length\s+(\d+)\b/.exec(headerAndDict);
  if (directMatch) {
    const parsed = parseInt(directMatch[1], 10);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
}

/**
 * Extrae el contenido en texto plano de un objeto indirecto PDF dado su offset en bytes.
 * Lee desde la etiqueta 'X Y obj' hasta 'endobj'.
 *
 * Blindaje de seguridad ISO 32000:
 * Si el objeto contiene un stream binario ('stream'), extrae únicamente el diccionario
 * inicial y resuelve el /Length (tanto directo como referencia indirecta ej. /Length 15 0 R)
 * para saltar en el buffer crudo la cantidad exacta de bytes antes de localizar 'endstream'/'endobj'.
 * Esto evita decodificaciones masivas en memoria (TextDecoder) y previene falsos positivos
 * de 'endobj' dentro del payload binario.
 *
 * @param buffer - ArrayBuffer del documento PDF.
 * @param offset - Byte offset donde comienza el objeto.
 * @param xrefMap - Mapa opcional de tabla XRef para resolución acelerada de referencias indirectas.
 * @returns Cadena con el contenido del objeto (cabecera, diccionario y endobj).
 * @throws {RangeError | Error} Si el offset es inválido o no se encuentra la definición del objeto.
 */
export function extractObject(
  buffer: ArrayBuffer,
  offset: number,
  xrefMap?: Map<number, number>
): string {
  const bytes = toUint8Array(buffer);
  if (offset < 0 || offset >= bytes.length) {
    throw new RangeError(`PDFParser: Offset ${offset} fuera de los límites del buffer (${bytes.length}).`);
  }

  // 1. Localizar la cabecera 'X Y obj' en una ventana inicial acotada
  const searchStart = Math.max(0, offset - 32);
  const headerReadLimit = Math.min(bytes.length, offset + 4096);
  const initialChunk = decodeLatin1(bytes, searchStart, headerReadLimit);

  const objMatch = /\b(\d+\s+\d+\s+obj)\b/i.exec(initialChunk);
  if (!objMatch) {
    throw new Error(`PDFParser: No se encontró la cabecera 'obj' en el offset ${offset}.`);
  }

  const objStartOffset = searchStart + objMatch.index;

  // 2. Leer un fragmento suficiente para extraer el diccionario << ... >> del objeto
  const dictReadLimit = Math.min(bytes.length, objStartOffset + 8192);
  const dictChunk = decodeLatin1(bytes, objStartOffset, dictReadLimit);

  // 3. Verificar si el objeto contiene un stream binario o es un objeto regular
  // Un objeto contiene stream SI Y SOLO SI la palabra clave 'stream' aparece ANTES de 'endobj'
  const endObjMatch = /\bendobj\b/i.exec(dictChunk);
  const streamMatch = /\bstream(\r\n|\n|\r)/.exec(dictChunk);

  const hasStream = !!streamMatch && (!endObjMatch || streamMatch.index < endObjMatch.index);

  if (hasStream && streamMatch) {
    // Objeto con stream binario: extraer únicamente la cabecera y el diccionario
    const streamKeywordIdx = streamMatch.index;
    const headerAndDict = dictChunk.substring(0, streamKeywordIdx).trim();

    // Resolver /Length ya sea directo (/Length 100) o indirecto (/Length 15 0 R)
    const streamLength = resolveStreamLength(headerAndDict, buffer, bytes, xrefMap);

    if (streamLength !== null && streamLength >= 0) {
      const eolLength = streamMatch[1].length;
      const streamDataStart = objStartOffset + streamKeywordIdx + 6 + eolLength; // 6 = 'stream'.length
      const postStreamOffset = streamDataStart + streamLength;

      if (postStreamOffset < bytes.length) {
        // Leer una pequeña ventana tras el stream para validar endstream / endobj
        const postChunk = decodeLatin1(bytes, postStreamOffset, Math.min(bytes.length, postStreamOffset + 512));
        if (/endobj/i.test(postChunk)) {
          return `${headerAndDict}\nendobj`;
        }
      }
    }

    // Si no se pudo resolver /Length o falla la validación del salto, devolver el diccionario cerrado
    return `${headerAndDict}\nendobj`;
  }

  // 4. Objeto regular sin stream: buscar 'endobj' directamente
  if (endObjMatch) {
    return dictChunk.substring(0, endObjMatch.index + endObjMatch[0].length).trim();
  }

  // Si el objeto supera 8KB (ej. arrays masivos), buscar 'endobj' en ventanas sucesivas
  let scanOffset = objStartOffset + 8192;
  while (scanOffset < bytes.length) {
    const nextLimit = Math.min(bytes.length, scanOffset + 8192);
    const windowChunk = decodeLatin1(bytes, scanOffset, nextLimit);
    const winEndIdx = windowChunk.indexOf("endobj");
    if (winEndIdx !== -1) {
      const fullText = decodeLatin1(bytes, objStartOffset, scanOffset + winEndIdx + "endobj".length);
      return fullText.trim();
    }
    scanOffset = nextLimit;
  }

  throw new Error(`PDFParser: No se encontró la etiqueta 'endobj' para el objeto en el offset ${offset}.`);
}

/**
 * Extrae el contenido del array /Annots existente en el diccionario de una página,
 * resolviendo de manera exhaustiva tanto arrays literales [/Annots [ 15 0 R ... ]]
 * como referencias indirectas [/Annots 25 0 R] (típicas de LaTeX hyperref).
 * Deduplica referencias y devuelve una lista de referencias indirectas normalizada.
 */
export function extractExistingAnnots(
  pageDict: string,
  buffer: ArrayBuffer,
  xrefMap: Map<number, number>
): string {
  const refs: string[] = [];

  // 1. Array directo: /Annots [ 15 0 R 16 0 R ... ]
  const directMatches = pageDict.matchAll(/\/Annots\s*\[([\s\S]*?)\]/gi);
  for (const m of directMatches) {
    const found = m[1].matchAll(/(\d+\s+\d+\s+R)/g);
    for (const f of found) {
      const clean = f[1].trim().replace(/\s+/g, " ");
      if (!refs.includes(clean)) refs.push(clean);
    }
  }

  // 2. Referencia indirecta: /Annots 25 0 R (o múltiples)
  const indirectMatches = pageDict.matchAll(/\/Annots\s+(\d+)\s+\d+\s+R/gi);
  for (const im of indirectMatches) {
    const annotsObjNum = parseInt(im[1], 10);
    const offset = xrefMap.get(annotsObjNum) ?? findObjectOffset(toUint8Array(buffer), annotsObjNum);
    if (offset !== undefined && offset !== null) {
      try {
        const objText = extractObject(buffer, offset, xrefMap);
        const arrayMatch = /\[([\s\S]*?)\]/.exec(objText);
        if (arrayMatch) {
          const found = arrayMatch[1].matchAll(/(\d+\s+\d+\s+R)/g);
          for (const f of found) {
            const clean = f[1].trim().replace(/\s+/g, " ");
            if (!refs.includes(clean)) refs.push(clean);
          }
        }
      } catch {
        // En caso de error al resolver la referencia indirecta, continuar
      }
    }
  }

  return refs.join(" ");
}

export interface LastPageInfo {
  pageObjNumber: number;
  pageDict: string;
  existingAnnots: string;
  isSignatureSheet: boolean;
  pagesRootObjNum: number;
  pagesRootDict: string;
  pagesCount: number;
  kids: number[];
  signatureCountOnSheet: number;
  pageMediaBox: [number, number, number, number];
}

/**
 * Localiza la página indicada (o la última por defecto) en el árbol de páginas (/Pages -> /Kids -> /Page).
 * Desciende recursivamente a través de todos los nodos intermedios /Pages hasta alcanzar
 * estrictamente el nodo hoja con /Type /Page, previniendo inyecciones en nodos intermedios.
 *
 * @param buffer - ArrayBuffer del documento PDF.
 * @param xrefOffset - Byte offset de la última tabla o stream XRef activo.
 * @param pageIndex - Índice opcional de la página objetivo (0-indexed). Si no se define o es negativo, selecciona la última página.
 * @returns Objeto LastPageInfo con el número de página, diccionarios, conteo de firmas y metadatos.
 */
export function findPageObject(
  buffer: ArrayBuffer,
  xrefOffset: number,
  pageIndex?: number
): LastPageInfo {
  const bytes = toUint8Array(buffer);
  const xrefMap = parseXrefTable(buffer, xrefOffset);

  if (xrefMap.size === 0) {
    throw new Error("PDFParser: La tabla XRef está vacía o no contiene objetos válidos.");
  }

  // 1. Localizar el catálogo (/Root) en los trailers o streams XRef
  const initialTrailer = extractTrailerInfo(bytes, xrefOffset);
  let rootObjNumber: number | null = initialTrailer.rootObjNumber > 0 ? initialTrailer.rootObjNumber : null;

  if (rootObjNumber === null) {
    let curOffset: number | null = initialTrailer.prevOffset;
    const visited = new Set<number>();

    while (curOffset !== null && curOffset >= 0 && curOffset < bytes.length) {
      if (visited.has(curOffset)) break;
      visited.add(curOffset);

      const prevTrailer = extractTrailerInfo(bytes, curOffset);
      if (prevTrailer.rootObjNumber > 0) {
        rootObjNumber = prevTrailer.rootObjNumber;
        break;
      }
      curOffset = prevTrailer.prevOffset;
    }
  }

  if (rootObjNumber === null || rootObjNumber <= 0) {
    throw new Error("PDFParser: No se encontró la referencia /Root en ningún tráiler del documento.");
  }

  // 2. Extraer el Catálogo y encontrar la referencia al árbol /Pages
  const rootOffset = xrefMap.get(rootObjNumber) ?? findObjectOffset(bytes, rootObjNumber);
  if (rootOffset === undefined || rootOffset === null) {
    throw new Error(`PDFParser: Offset no encontrado para el objeto Catálogo /Root (${rootObjNumber}).`);
  }

  const catalogObj = extractObject(buffer, rootOffset, xrefMap);
  const pagesRefMatch = /\/Pages\s+(\d+)\s+\d+\s+R/i.exec(catalogObj);
  if (!pagesRefMatch) {
    throw new Error("PDFParser: El objeto Catálogo no contiene la referencia obligatoria /Pages.");
  }

  const pagesRootObjNum = parseInt(pagesRefMatch[1], 10);
  const pagesRootOffset = xrefMap.get(pagesRootObjNum) ?? findObjectOffset(bytes, pagesRootObjNum);
  if (pagesRootOffset === undefined || pagesRootOffset === null) {
    throw new Error(`PDFParser: Offset no encontrado para el objeto raíz /Pages (${pagesRootObjNum}).`);
  }

  const pagesRootText = extractObject(buffer, pagesRootOffset, xrefMap);

  // Extraer /Count del árbol de páginas raíz
  const countMatch = /\/Count\s+(\d+)/.exec(pagesRootText);
  let pagesCount = countMatch ? parseInt(countMatch[1], 10) : 1;

  // Extraer /Kids del objeto /Pages raíz
  const rootKidsMatch = /\/Kids\s*\[([\s\S]*?)\]/i.exec(pagesRootText);
  const rootKids = rootKidsMatch
    ? [...rootKidsMatch[1].matchAll(/(\d+)\s+\d+\s+R/g)].map((m) => parseInt(m[1], 10))
    : [];

  // Extraer MediaBox heredable del nodo raíz si existe
  let fallbackMediaBox: [number, number, number, number] = [0, 0, 595.28, 841.89];
  const rootMediaMatch = /\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/.exec(
    pagesRootText
  );
  if (rootMediaMatch) {
    fallbackMediaBox = [
      parseFloat(rootMediaMatch[1]),
      parseFloat(rootMediaMatch[2]),
      parseFloat(rootMediaMatch[3]),
      parseFloat(rootMediaMatch[4]),
    ];
  }

  interface ResolvedLeafPage {
    pageObjNumber: number;
    pageDict: string;
    existingAnnots: string;
    isSignatureSheet: boolean;
    pageMediaBox: [number, number, number, number];
  }

  // 3. Navegación recursiva del árbol de páginas (/Pages -> /Kids -> /Page)
  function collectLeafPages(
    nodeObjNum: number,
    inheritedMediaBox: [number, number, number, number],
    visited = new Set<number>()
  ): ResolvedLeafPage[] {
    if (visited.has(nodeObjNum)) return [];
    visited.add(nodeObjNum);

    const offset = xrefMap.get(nodeObjNum) ?? findObjectOffset(bytes, nodeObjNum);
    if (offset === undefined || offset === null) {
      throw new Error(`PDFParser: Offset no encontrado para el nodo del árbol de páginas (${nodeObjNum}).`);
    }

    const objText = extractObject(buffer, offset, xrefMap);
    const isPagesNode = /\/Type\s*\/Pages\b/i.test(objText);
    const isPageNode = /\/Type\s*\/Page\b/i.test(objText) && !isPagesNode;

    let currentMediaBox = inheritedMediaBox;
    const mediaMatch = /\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/.exec(objText);
    if (mediaMatch) {
      currentMediaBox = [
        parseFloat(mediaMatch[1]),
        parseFloat(mediaMatch[2]),
        parseFloat(mediaMatch[3]),
        parseFloat(mediaMatch[4]),
      ];
    }

    const kidsMatch = /\/Kids\s*\[([\s\S]*?)\]/i.exec(objText);

    // Si es un nodo hoja (/Type /Page y sin /Kids):
    if (isPageNode || (!isPagesNode && !kidsMatch)) {
      const existingAnnots = extractExistingAnnots(objText, buffer, xrefMap);

      const isSignatureSheet =
        /\/QProofSheet\b/i.test(objText) ||
        /\/PieceInfo[\s\S]*?\/QProof/i.test(objText) ||
        /\(HOJA DE FIRMAS Y CERTIFICACION DIGITAL\)/i.test(objText);

      const pageDict = extractRootDictionary(objText);

      return [
        {
          pageObjNumber: nodeObjNum,
          pageDict,
          existingAnnots,
          isSignatureSheet,
          pageMediaBox: currentMediaBox,
        },
      ];
    }

    // Nodo intermedio /Pages: descender recursivamente por cada uno de sus /Kids
    if (!kidsMatch) {
      throw new Error(`PDFParser: El nodo /Pages (${nodeObjNum}) no contiene el array /Kids ni es una página hoja.`);
    }

    const kidRefs = [...kidsMatch[1].matchAll(/(\d+)\s+\d+\s+R/g)].map((m) => parseInt(m[1], 10));
    if (kidRefs.length === 0) {
      throw new Error(`PDFParser: El array /Kids del nodo /Pages (${nodeObjNum}) está vacío.`);
    }

    const leaves: ResolvedLeafPage[] = [];
    for (const kid of kidRefs) {
      const childLeaves = collectLeafPages(kid, currentMediaBox, visited);
      leaves.push(...childLeaves);
    }

    return leaves;
  }

  const allLeafPages = collectLeafPages(pagesRootObjNum, fallbackMediaBox);
  if (allLeafPages.length === 0) {
    throw new Error("PDFParser: No se encontraron páginas válidas (/Type /Page) en el documento.");
  }

  pagesCount = Math.max(pagesCount, allLeafPages.length);

  // Seleccionar la página solicitada: si pageIndex está definido y en rango [0, allLeafPages.length - 1], usarlo.
  // En caso contrario (por defecto o si pageIndex no es válido), seleccionar la última página.
  let targetIndex = allLeafPages.length - 1;
  if (pageIndex !== undefined && Number.isInteger(pageIndex) && pageIndex >= 0 && pageIndex < allLeafPages.length) {
    targetIndex = pageIndex;
  }

  const resolved = allLeafPages[targetIndex];

  // Calcular conteo de firmas en las anotaciones existentes
  const annotsRefs = resolved.existingAnnots
    ? resolved.existingAnnots.trim().split(/\s+/).filter(Boolean).length / 3
    : 0;
  const signatureCountOnSheet = Math.floor(annotsRefs);

  // Extraer el diccionario exterior de /Pages raíz con balanceo estricto
  const pagesRootDict = extractRootDictionary(pagesRootText);

  return {
    pageObjNumber: resolved.pageObjNumber,
    pageDict: resolved.pageDict,
    existingAnnots: resolved.existingAnnots,
    isSignatureSheet: resolved.isSignatureSheet,
    pagesRootObjNum,
    pagesRootDict,
    pagesCount,
    kids: rootKids,
    signatureCountOnSheet,
    pageMediaBox: resolved.pageMediaBox,
  };
}

export const findLastPageObject = findPageObject;
export const findDocumentPagesStructure = findLastPageObject;
