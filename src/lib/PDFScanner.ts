/**
 * PDFScanner.ts
 * 
 * Módulo de bajo nivel para análisis e inspección binaria de documentos PDF (ISO 32000).
 * Diseñado para operar con cero dependencias externas y máxima eficiencia en memoria ($O(1)$ ventana fija).
 */

// Tamaño máximo en bytes de la ventana de búsqueda al final del archivo (ISO 32000 sección 7.5.5)
export const SCAN_WINDOW = 4096;

// Conjunto de caracteres considerados espacio en blanco según ISO 32000-1 (Tabla 1)
// 0x00: NUL, 0x09: TAB, 0x0A: LF, 0x0C: FF, 0x0D: CR, 0x20: SPACE
const isPdfWhitespace = (byte: number): boolean => {
  return (
    byte === 0x00 || // Null (NUL)
    byte === 0x09 || // Horizontal Tab (HT)
    byte === 0x0a || // Line Feed (LF)
    byte === 0x0c || // Form Feed (FF)
    byte === 0x0d || // Carriage Return (CR)
    byte === 0x20    // Space (SP)
  );
};

// Comprueba si un byte corresponde a un dígito ASCII ('0' - '9')
const isDigit = (byte: number): boolean => {
  return byte >= 0x30 && byte <= 0x39;
};

// Secuencia de bytes de la palabra clave 'startxref' en ASCII
// 's'=115, 't'=116, 'a'=97, 'r'=114, 't'=116, 'x'=120, 'r'=114, 'e'=101, 'f'=102
const STARTXREF_BYTES = new Uint8Array([115, 116, 97, 114, 116, 120, 114, 101, 102]);

// Secuencia de bytes del marcador de fin de archivo '%%EOF' en ASCII
// '%' = 37, '%' = 37, 'E' = 69, 'O' = 79, 'F' = 70
const EOF_BYTES = new Uint8Array([37, 37, 69, 79, 70]);

/**
 * Normaliza la entrada binaria a una vista Uint8Array válida.
 */
function toUint8Array(input: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (!input || typeof input !== "object") {
    throw new TypeError("PDFScanner: El parámetro de entrada debe ser un ArrayBuffer válido.");
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

  throw new TypeError("PDFScanner: El parámetro de entrada debe ser un ArrayBuffer válido.");
}

/**
 * Escanea los últimos bytes de un ArrayBuffer (hasta un máximo de SCAN_WINDOW = 4096 bytes)
 * en sentido inverso para localizar la última sección 'startxref' válida y extraer el byte offset
 * de la tabla/stream de referencias cruzadas (XRef).
 *
 * @param buffer - ArrayBuffer con los datos binarios del documento PDF.
 * @returns El byte offset (número entero positivo) donde comienza la última tabla o stream XRef.
 * @throws {TypeError} Si el buffer no es una instancia válida de ArrayBuffer.
 * @throws {Error} Si el archivo es demasiado pequeño, no contiene 'startxref' en su ventana final o está corrupto.
 */
export function findLastXrefOffset(buffer: ArrayBuffer): number {
  const bytes = toUint8Array(buffer);
  const length = bytes.length;

  // Un PDF válido mínimo (%PDF-1.x ... startxref ... %%EOF) requiere al menos una estructura básica
  if (length < 32) {
    throw new Error("PDFScanner: El buffer es demasiado pequeño para ser un archivo PDF válido.");
  }

  const keywordLen = STARTXREF_BYTES.length;
  // Límite de parada: solo se analizan como máximo los últimos SCAN_WINDOW bytes (4 KB)
  const stopIndex = Math.max(0, length - SCAN_WINDOW);

  /**
   * Puntero de lectura inverso acotado a [length - keywordLen, stopIndex].
   * Esto previene el bloqueo del hilo principal (UI freeze) en archivos grandes o maliciosos.
   */
  for (let i = length - keywordLen; i >= stopIndex; i--) {
    // Comprobación rápida del primer carácter ('s' = 115)
    if (bytes[i] !== 115) continue;

    let match = true;
    for (let k = 1; k < keywordLen; k++) {
      if (bytes[i + k] !== STARTXREF_BYTES[k]) {
        match = false;
        break;
      }
    }

    if (!match) continue;

    // --- Hemos localizado 'startxref' en el índice `i` ---
    let ptr = i + keywordLen;

    // 1. Avanzar puntero ignorando saltos de línea o espacios en blanco iniciales
    while (ptr < length && isPdfWhitespace(bytes[ptr])) {
      ptr++;
    }

    // 2. Extraer los dígitos numéricos que representan el offset
    const digitStart = ptr;
    while (ptr < length && isDigit(bytes[ptr])) {
      ptr++;
    }

    // Si no encontramos dígitos tras los espacios en blanco, descartamos falso positivo
    if (ptr === digitStart) {
      continue;
    }

    // 3. Convertir la secuencia de dígitos a número entero en base 10
    let offset = 0;
    for (let d = digitStart; d < ptr; d++) {
      offset = offset * 10 + (bytes[d] - 0x30);
    }

    // 4. Retornar el offset si es un entero seguro no negativo
    if (Number.isSafeInteger(offset) && offset >= 0) {
      return offset;
    }
  }

  throw new Error(
    "PDFScanner: No se encontró una palabra clave 'startxref' válida en los últimos 4 KB del documento PDF o el archivo está corrupto."
  );
}

/**
 * Localiza la posición de byte final del último marcador '%%EOF' en la ventana final del archivo.
 *
 * @param buffer - ArrayBuffer del documento PDF.
 * @returns El índice de byte inmediatamente posterior al último '%%EOF' (o tras su salto de línea).
 */
export function findLastEofPosition(buffer: ArrayBuffer): number {
  const bytes = toUint8Array(buffer);
  const length = bytes.length;
  const eofLen = EOF_BYTES.length;
  const stopIndex = Math.max(0, length - SCAN_WINDOW);

  for (let i = length - eofLen; i >= stopIndex; i--) {
    if (bytes[i] !== 37) continue; // '%' = 37

    let match = true;
    for (let k = 1; k < eofLen; k++) {
      if (bytes[i + k] !== EOF_BYTES[k]) {
        match = false;
        break;
      }
    }

    if (match) {
      let endPtr = i + eofLen;
      // Incluir salto de línea contiguo si existe (\r\n o \n o \r)
      if (endPtr < length && bytes[endPtr] === 0x0d) endPtr++; // \r
      if (endPtr < length && bytes[endPtr] === 0x0a) endPtr++; // \n
      return endPtr;
    }
  }

  throw new Error("PDFScanner: No se encontró el marcador de fin de archivo '%%EOF' en los últimos 4 KB del documento.");
}
