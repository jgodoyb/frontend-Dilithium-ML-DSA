import { describe, it, expect } from "vitest";
import { extractSignableBytes, injectSignatureHex, base64ToHex, bytesToHex } from "../lib/PDFSigner";
import { prepareVisualSignatureUpdate } from "../lib/PDFInjector";
import { generateAppearanceStream } from "../lib/PDFAppearance";
import { findLastXrefOffset, findLastEofPosition } from "../lib/PDFScanner";

describe("PDFSigner - extractSignableBytes & injectSignatureHex", () => {
  const basePdfText = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
187
%%EOF
`;

  it("extrae con precisión los bloques firmables excluyendo el placeholder de /Contents", () => {
    const originalBuffer = new TextEncoder().encode(basePdfText).buffer;
    const lastXref = findLastXrefOffset(originalBuffer);
    const lastEof = findLastEofPosition(originalBuffer);

    const apStream = generateAppearanceStream(998, 200, 50, "Firmado por: Jorge Godoy");
    const prepared = prepareVisualSignatureUpdate(
      originalBuffer,
      lastXref,
      lastEof,
      3,
      "",
      apStream,
      [50, 50, 250, 100],
      "user-uuid",
      "Jorge Godoy",
      { placeholderBytes: 1024, fieldName: "Signature_1" }
    );

    const signable = extractSignableBytes(prepared.preparedPdfBuffer, prepared.byteRange);
    const [, lenA, offsetB, lenB] = prepared.byteRange;

    expect(signable.length).toBe(lenA + lenB);

    // Comparar los primeros bytes de Bloque A
    const originalPreparedBytes = new Uint8Array(prepared.preparedPdfBuffer);
    expect(signable[0]).toBe(originalPreparedBytes[0]); // '%'
    expect(signable[lenA - 1]).toBe(originalPreparedBytes[lenA - 1]); // Carácter justo antes de '<'

    // Comparar los primeros bytes de Bloque B
    expect(signable[lenA]).toBe(originalPreparedBytes[offsetB]); // Carácter justo tras '>'
  });

  it("inyecta la firma hexadecimal en el placeholder sin alterar la longitud total del ArrayBuffer", () => {
    const originalBuffer = new TextEncoder().encode(basePdfText).buffer;
    const lastXref = findLastXrefOffset(originalBuffer);
    const lastEof = findLastEofPosition(originalBuffer);

    const apStream = generateAppearanceStream(998, 200, 50, "Firmado por: Jorge Godoy");
    const prepared = prepareVisualSignatureUpdate(
      originalBuffer,
      lastXref,
      lastEof,
      3,
      "",
      apStream,
      [50, 50, 250, 100],
      "user-uuid",
      "Jorge Godoy",
      { placeholderBytes: 1024, fieldName: "Signature_2" }
    );

    const fakeSignatureHex = "deadbeefcafebabe0123456789abcdef"; // 32 caracteres hex
    const signedBuffer = injectSignatureHex(
      prepared.preparedPdfBuffer,
      prepared.contentsOffset,
      prepared.contentsHexLength,
      fakeSignatureHex
    );

    // 1. La longitud total del buffer firmado debe ser IDÉNTICA al byte
    expect(signedBuffer.byteLength).toBe(prepared.preparedPdfBuffer.byteLength);

    const signedBytes = new Uint8Array(signedBuffer);

    // 2. Verificar que los caracteres hexadecimales se escribieron en ASCII
    for (let i = 0; i < fakeSignatureHex.length; i++) {
      expect(signedBytes[prepared.contentsOffset + i]).toBe(fakeSignatureHex.charCodeAt(i));
    }

    // 3. Verificar que el resto del placeholder se rellenó con '0' (0x30)
    for (let i = fakeSignatureHex.length; i < prepared.contentsHexLength; i++) {
      expect(signedBytes[prepared.contentsOffset + i]).toBe(0x30); // '0'
    }

    // 4. Verificar que los delimitadores '<' y '>' se conservaron intactos
    expect(signedBytes[prepared.contentsOffset - 1]).toBe(0x3c); // '<'
    expect(signedBytes[prepared.contentsOffset + prepared.contentsHexLength]).toBe(0x3e); // '>'

    // 5. Verificar que PDFScanner sigue pudiendo localizar el startxref sin desalineación
    const finalXrefOffset = findLastXrefOffset(signedBuffer);
    expect(finalXrefOffset).toBe(prepared.newXrefOffset);
  });

  it("lanza un error crítico si la firma excede la capacidad máxima del placeholder", () => {
    const buffer = new ArrayBuffer(500);
    const maxCapacity = 16;
    const oversizedSignature = "0123456789abcdef0123456789abcdef"; // 32 caracteres > 16

    expect(() => injectSignatureHex(buffer, 50, maxCapacity, oversizedSignature)).toThrow(
      /supera la capacidad máxima reservada en el placeholder/
    );
  });

  it("valida y lanza errores ante rangos de byteRange inválidos o fuera de límites", () => {
    const buffer = new ArrayBuffer(100);
    
    // Rango fuera de límites
    expect(() => extractSignableBytes(buffer, [0, 50, 60, 50])).toThrow(/excede el tamaño total del buffer/);
    
    // Solapamiento de bloques
    expect(() => extractSignableBytes(buffer, [0, 60, 50, 20])).toThrow(/solapa o supera el inicio del Bloque B/);
  });

  it("convierte correctamente cadenas Base64 a Hexadecimal", () => {
    const b64 = "q83v"; // bytes [171, 205, 239] -> hex "abcdef"
    const hex = base64ToHex(b64);
    expect(hex).toBe("abcdef");
  });

  it("ejecuta el ciclo completo de firma (End-to-End)", async () => {
    const originalBuffer = new TextEncoder().encode(basePdfText).buffer;
    const lastXref = findLastXrefOffset(originalBuffer);
    const lastEof = findLastEofPosition(originalBuffer);

    // 1. Preparar documento incremental con objeto /Sig y /ByteRange
    const apStream = generateAppearanceStream(998, 200, 50, "Firmado por: Quantum Signer");
    const prepared = prepareVisualSignatureUpdate(
      originalBuffer,
      lastXref,
      lastEof,
      3,
      "",
      apStream,
      [50, 50, 250, 100],
      "quantum-uuid",
      "Quantum Signer",
      { placeholderBytes: 8192, fieldName: "Signature_E2E" }
    );

    // 2. Extraer bytes firmables aislados
    const signableBytes = extractSignableBytes(prepared.preparedPdfBuffer, prepared.byteRange);

    // 3. Hasheo criptográfico SHA-256
    const hashBuffer = await crypto.subtle.digest("SHA-256", signableBytes as BufferSource);
    const hashHex = bytesToHex(new Uint8Array(hashBuffer));
    expect(hashHex).toHaveLength(64);

    // 4. Inyección de la firma simulada
    const simulatedSignatureHex = hashHex.repeat(10); // 640 caracteres hex
    const finalSignedPdf = injectSignatureHex(
      prepared.preparedPdfBuffer,
      prepared.contentsOffset,
      prepared.contentsHexLength,
      simulatedSignatureHex
    );

    expect(finalSignedPdf.byteLength).toBe(prepared.preparedPdfBuffer.byteLength);

    // 5. Validar que la posición final de EOF coincide con la calculada
    const finalEof = findLastEofPosition(finalSignedPdf);
    expect(finalEof).toBe(finalSignedPdf.byteLength);
  });
});
