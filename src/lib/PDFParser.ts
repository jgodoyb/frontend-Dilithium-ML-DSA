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
 * Parsea la tabla de referencias cruzadas (XRef) de texto plano a partir del offset indicado.
 * Si el tráiler incluye la propiedad /Prev, navega recursivamente hacia las revisiones anteriores
 * para construir el mapa acumulativo completo de todos los objetos activos en el documento.
 *
 * @param buffer - ArrayBuffer del documento PDF.
 * @param xrefOffset - Byte offset donde comienza la tabla XRef.
 * @returns Map asociando número de objeto -> byte offset en el archivo.
 */
export function parseXrefTable(buffer: ArrayBuffer, xrefOffset: number): Map<number, number> {
  const bytes = toUint8Array(buffer);
  const totalLength = bytes.length;
  const xrefMap = new Map<number, number>();
  const visitedOffsets = new Set<number>();

  let curOffset: number | null = xrefOffset;

  while (curOffset !== null && curOffset >= 0 && curOffset < totalLength) {
    if (visitedOffsets.has(curOffset)) break;
    visitedOffsets.add(curOffset);

    // Búsqueda flexible de 'xref' en una pequeña ventana alrededor del offset
    const searchStart = Math.max(0, curOffset - 64);
    const searchEnd = Math.min(totalLength, curOffset + 65536);
    const chunk = decodeLatin1(bytes, searchStart, searchEnd);

    const xrefIdxInChunk = chunk.indexOf("xref");
    if (xrefIdxInChunk === -1) {
      break;
    }

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
  }

  return xrefMap;
}

/**
 * Localiza el byte offset de un objeto indirecto ('<objNum> 0 obj') dentro del buffer binario.
 */
function findObjectOffset(bytes: Uint8Array, objNum: number): number | null {
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

  // 3. Verificar si el objeto contiene un stream binario
  // Según ISO 32000, la palabra clave 'stream' sigue inmediatamente al diccionario
  const streamMatch = /\bstream(\r\n|\n|\r)/.exec(dictChunk);

  if (streamMatch) {
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
  const endObjIdx = dictChunk.indexOf("endobj");
  if (endObjIdx !== -1) {
    return dictChunk.substring(0, endObjIdx + "endobj".length).trim();
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
 * resolviendo tanto arrays literales [/Annots [ 15 0 R ... ]] como referencias indirectas [/Annots 25 0 R].
 */
function extractExistingAnnots(
  pageDict: string,
  buffer: ArrayBuffer,
  xrefMap: Map<number, number>
): string {
  // 1. Array directo: /Annots [ 15 0 R 16 0 R ]
  const directMatch = /\/Annots\s*\[([\s\S]*?)\]/.exec(pageDict);
  if (directMatch) {
    return directMatch[1].trim().replace(/\s+/g, " ");
  }

  // 2. Referencia indirecta: /Annots 25 0 R
  const indirectMatch = /\/Annots\s+(\d+)\s+\d+\s+R/.exec(pageDict);
  if (indirectMatch) {
    const annotsObjNum = parseInt(indirectMatch[1], 10);
    const offset = xrefMap.get(annotsObjNum);
    if (offset !== undefined) {
      try {
        const objText = extractObject(buffer, offset);
        const arrayMatch = /\[([\s\S]*?)\]/.exec(objText);
        if (arrayMatch) {
          return arrayMatch[1].trim().replace(/\s+/g, " ");
        }
      } catch {
        // En caso de error al resolver la referencia indirecta, continuar con string vacío
      }
    }
  }

  return "";
}

/**
 * Localiza la última página del documento (/Type /Page) navegando el catálogo (/Root),
 * el árbol de páginas (/Pages) y sus hijos (/Kids) de forma recursiva.
 * Extrae además cualquier lista de anotaciones previa (/Annots) en esa página.
 *
 * @param buffer - ArrayBuffer del documento PDF.
 * @param xrefOffset - Byte offset de la última tabla XRef activa.
 * @returns Objeto con el número del objeto de la última página, su diccionario y anotaciones existentes.
 * @throws {Error} Si la estructura del catálogo o árbol de páginas es inválida.
 */
export function findLastPageObject(
  buffer: ArrayBuffer,
  xrefOffset: number
): { pageObjNumber: number; pageDict: string; existingAnnots: string } {
  const bytes = toUint8Array(buffer);
  const xrefMap = parseXrefTable(buffer, xrefOffset);

  if (xrefMap.size === 0) {
    throw new Error("PDFParser: La tabla XRef está vacía o no contiene objetos válidos.");
  }

  // 1. Localizar el catálogo (/Root) en los trailers
  let rootObjNumber: number | null = null;
  let curOffset: number | null = xrefOffset;
  const visited = new Set<number>();

  while (curOffset !== null && curOffset >= 0 && curOffset < bytes.length) {
    if (visited.has(curOffset)) break;
    visited.add(curOffset);

    const chunk = decodeLatin1(bytes, Math.max(0, curOffset - 64), Math.min(bytes.length, curOffset + 8192));
    const trailerMatch = /trailer\s*<<([\s\S]*?)>>/i.exec(chunk);
    if (trailerMatch) {
      const rootMatch = /\/Root\s+(\d+)\s+\d+\s+R/i.exec(trailerMatch[1]);
      if (rootMatch) {
        rootObjNumber = parseInt(rootMatch[1], 10);
        break;
      }
      const prevMatch = /\/Prev\s+(\d+)/.exec(trailerMatch[1]);
      curOffset = prevMatch ? parseInt(prevMatch[1], 10) : null;
    } else {
      break;
    }
  }

  if (rootObjNumber === null) {
    throw new Error("PDFParser: No se encontró la referencia /Root en ningún tráiler del documento.");
  }

  // 2. Extraer el Catálogo y encontrar la referencia al árbol /Pages
  const rootOffset = xrefMap.get(rootObjNumber);
  if (rootOffset === undefined) {
    throw new Error(`PDFParser: Offset no encontrado para el objeto Catálogo /Root (${rootObjNumber}).`);
  }

  const catalogObj = extractObject(buffer, rootOffset);
  const pagesRefMatch = /\/Pages\s+(\d+)\s+\d+\s+R/i.exec(catalogObj);
  if (!pagesRefMatch) {
    throw new Error("PDFParser: El objeto Catálogo no contiene la referencia obligatoria /Pages.");
  }

  const pagesRootObjNum = parseInt(pagesRefMatch[1], 10);

  // 3. Función recursiva para navegar el árbol /Pages -> /Kids -> /Page
  function resolveLastPage(objNum: number): { pageObjNumber: number; pageDict: string; existingAnnots: string } {
    const offset = xrefMap.get(objNum);
    if (offset === undefined) {
      throw new Error(`PDFParser: Offset no encontrado para el nodo del árbol de páginas (${objNum}).`);
    }

    const objText = extractObject(buffer, offset);

    // Extraer el diccionario principal << ... >>
    const dictMatch = /<<([\s\S]*?)>>/.exec(objText);
    const dictContent = dictMatch ? dictMatch[1] : objText;

    // Si es un nodo de página hoja (/Type /Page) y no un contenedor /Pages
    const isPagesNode = /\/Type\s*\/Pages\b/i.test(dictContent);
    const isPageNode = /\/Type\s*\/Page\b/i.test(dictContent) && !isPagesNode;

    if (isPageNode) {
      const pageDict = dictMatch ? dictMatch[0] : objText;
      const existingAnnots = extractExistingAnnots(pageDict, buffer, xrefMap);
      return {
        pageObjNumber: objNum,
        pageDict,
        existingAnnots,
      };
    }

    // Si es un nodo intermedio /Pages, extraer sus /Kids
    const kidsMatch = /\/Kids\s*\[([\s\S]*?)\]/i.exec(dictContent);
    if (!kidsMatch) {
      // Si no tiene /Kids pero es página implícita
      if (!isPagesNode) {
        const pageDict = dictMatch ? dictMatch[0] : objText;
        const existingAnnots = extractExistingAnnots(pageDict, buffer, xrefMap);
        return {
          pageObjNumber: objNum,
          pageDict,
          existingAnnots,
        };
      }
      throw new Error(`PDFParser: El nodo /Pages (${objNum}) no contiene el array /Kids.`);
    }

    // Extraer todas las referencias "X Y R"
    const kidRefs = [...kidsMatch[1].matchAll(/(\d+)\s+\d+\s+R/g)].map((m) => parseInt(m[1], 10));
    if (kidRefs.length === 0) {
      throw new Error(`PDFParser: El array /Kids del nodo /Pages (${objNum}) está vacío.`);
    }

    // Tomar el último hijo para navegar a la última página del documento
    const lastKid = kidRefs[kidRefs.length - 1];
    return resolveLastPage(lastKid);
  }

  return resolveLastPage(pagesRootObjNum);
}
