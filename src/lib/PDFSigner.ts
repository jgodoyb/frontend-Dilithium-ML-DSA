/**
 * PDFSigner.ts
 * 
 * Módulo para la extracción de bytes firmables y la inyección binaria de firmas
 * criptográficas post-cuánticas en documentos PDF (ISO 32000).
 * 
 * Cero dependencias externas (utiliza TypedArrays y memoria directa).
 */

/**
 * Normaliza la entrada binaria a una vista Uint8Array.
 */
function toUint8Array(input: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (!input || typeof input !== "object") {
    throw new TypeError("PDFSigner: El parámetro de entrada debe ser un ArrayBuffer o TypedArray válido.");
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

  throw new TypeError("PDFSigner: El parámetro de entrada debe ser un ArrayBuffer válido.");
}

/**
 * Extrae y concatena exclusivamente los segmentos de bytes del documento PDF definidos
 * por el /ByteRange [offsetA, lenA, offsetB, lenB], aislando el hueco del placeholder /Contents.
 * 
 * El resultado es el binario limpio y determinista sobre el que debe calcularse el hash criptográfico (SHA-256).
 * 
 * @param preparedBuffer - Buffer del documento PDF preparado con la actualización incremental.
 * @param byteRange - Tupla de 4 enteros [offsetA, lenA, offsetB, lenB] según ISO 32000-1 §12.8.1.
 * @returns Uint8Array con la concatenación exacta del Bloque A y Bloque B.
 * @throws {TypeError | RangeError} Si los rangos están fuera de los límites del buffer.
 */
export function extractSignableBytes(
  preparedBuffer: ArrayBuffer,
  byteRange: [number, number, number, number]
): Uint8Array {
  const bytes = toUint8Array(preparedBuffer);
  const totalLength = bytes.length;

  if (!Array.isArray(byteRange) || byteRange.length !== 4) {
    throw new TypeError("PDFSigner: byteRange debe ser una tupla de 4 números [offsetA, lenA, offsetB, lenB].");
  }

  const [offsetA, lenA, offsetB, lenB] = byteRange;

  // Validaciones de integridad de rangos
  if (
    offsetA < 0 ||
    lenA < 0 ||
    offsetB < 0 ||
    lenB < 0 ||
    !Number.isSafeInteger(offsetA) ||
    !Number.isSafeInteger(lenA) ||
    !Number.isSafeInteger(offsetB) ||
    !Number.isSafeInteger(lenB)
  ) {
    throw new RangeError("PDFSigner: Todos los elementos de byteRange deben ser enteros no negativos.");
  }

  if (offsetA + lenA > offsetB) {
    throw new RangeError(
      `PDFSigner: El Bloque A (${offsetA} + ${lenA} = ${offsetA + lenA}) solapa o supera el inicio del Bloque B (${offsetB}).`
    );
  }

  if (offsetB + lenB > totalLength) {
    throw new RangeError(
      `PDFSigner: El Bloque B (${offsetB} + ${lenB} = ${offsetB + lenB}) excede el tamaño total del buffer (${totalLength}).`
    );
  }

  // Extraer Bloque A y Bloque B
  const blockA = bytes.subarray(offsetA, offsetA + lenA);
  const blockB = bytes.subarray(offsetB, offsetB + lenB);

  // Concatenar en un único Uint8Array contiguo
  const signableBytes = new Uint8Array(lenA + lenB);
  signableBytes.set(blockA, 0);
  signableBytes.set(blockB, lenA);

  return signableBytes;
}

/**
 * Inyecta la firma criptográfica en formato hexadecimal en el placeholder de /Contents del PDF preparado.
 * 
 * - Escribe los caracteres de la firma en ASCII a partir de `contentsOffset`.
 * - Rellena el espacio sobrante con caracteres '0' (0x30) hasta `maxHexLength`.
 * - Garantiza matemáticamente que la longitud del documento y los offsets de la tabla XRef no varíen.
 * 
 * @param preparedBuffer - Buffer original del documento preparado.
 * @param contentsOffset - Posición de byte exacta donde inicia el contenido hexadecimal (tras el '<').
 * @param maxHexLength - Capacidad máxima en caracteres hexadecimales reservada en el placeholder.
 * @param signatureHex - Firma en formato hexadecimal (cadena de caracteres 0-9, a-f, A-F).
 * @returns Un nuevo ArrayBuffer con el documento final completamente firmado.
 * @throws {RangeError | Error} Si la firma excede la capacidad o los offsets son inválidos.
 */
export function injectSignatureHex(
  preparedBuffer: ArrayBuffer,
  contentsOffset: number,
  maxHexLength: number,
  signatureHex: string
): ArrayBuffer {
  const bytes = toUint8Array(preparedBuffer);
  const totalLength = bytes.length;

  if (contentsOffset < 0 || contentsOffset >= totalLength) {
    throw new RangeError(`PDFSigner: contentsOffset (${contentsOffset}) fuera de los límites del archivo.`);
  }

  if (contentsOffset + maxHexLength > totalLength) {
    throw new RangeError(
      `PDFSigner: La ventana del placeholder (${contentsOffset} + ${maxHexLength} = ${contentsOffset + maxHexLength}) excede el archivo (${totalLength}).`
    );
  }

  // Limpiar posibles espacios en blanco o saltos de línea de la firma hex
  const cleanHex = signatureHex.replace(/\s+/g, "");

  if (cleanHex.length > maxHexLength) {
    throw new RangeError(
      `PDFSigner: La longitud de signatureHex (${cleanHex.length}) supera la capacidad máxima reservada en el placeholder (${maxHexLength}).`
    );
  }

  // Crear una copia del buffer para mantener inmutabilidad y evitar efectos colaterales
  const outputBytes = new Uint8Array(bytes.slice(0));

  // 1. Inyectar caracteres hexadecimales de la firma codificados como ASCII (0-9, a-f)
  for (let i = 0; i < cleanHex.length; i++) {
    outputBytes[contentsOffset + i] = cleanHex.charCodeAt(i);
  }

  // 2. Rellenar con ceros ASCII ('0' = 0x30) el espacio sobrante hasta completar maxHexLength
  for (let i = cleanHex.length; i < maxHexLength; i++) {
    outputBytes[contentsOffset + i] = 0x30; // '0'
  }

  return outputBytes.buffer;
}

/**
 * Utilidad: Convierte una cadena Base64 (ej. la firma devuelta por la API) a su representación en cadena Hexadecimal.
 * 
 * @param b64 - Cadena en formato Base64.
 * @returns Cadena en formato hexadecimal en minúsculas.
 */
export function base64ToHex(b64: string): string {
  const binary = atob(b64);
  let hex = "";
  for (let i = 0; i < binary.length; i++) {
    hex += binary.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Utilidad: Convierte un Uint8Array a cadena hexadecimal.
 * 
 * @param bytes - Array de bytes.
 * @returns Cadena hexadecimal.
 */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}
