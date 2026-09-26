import { describe, it, expect } from "vitest";
import { extractSignatures } from "../lib/PDFExtractor";
import { prepareSignatureUpdate } from "../lib/PDFInjector";
import { injectSignatureHex } from "../lib/PDFSigner";
import { findLastXrefOffset, findLastEofPosition } from "../lib/PDFScanner";

describe("PDFExtractor - extractSignatures", () => {
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

  it("devuelve un array vacío si el PDF no contiene firmas", () => {
    const originalBuffer = new TextEncoder().encode(basePdfText).buffer;
    const signatures = extractSignatures(originalBuffer);
    expect(signatures).toEqual([]);
  });

  it("extrae correctamente una firma única de una actualización incremental incluyendo /ContactInfo (UUID)", () => {
    const originalBuffer = new TextEncoder().encode(basePdfText).buffer;
    const lastXref = findLastXrefOffset(originalBuffer);
    const lastEof = findLastEofPosition(originalBuffer);

    const testUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

    // 1. Preparar e inyectar firma con signerId (UUID)
    const prepared = prepareSignatureUpdate(
      originalBuffer,
      lastXref,
      lastEof,
      "Jorge Godoy",
      { signerId: testUuid, placeholderBytes: 512, reason: "Prueba unitaria" }
    );

    const signaturePayloadHex = "abcdef0123456789deadbeefcafebabe";
    const signedPdfBuffer = injectSignatureHex(
      prepared.preparedPdfBuffer,
      prepared.contentsOffset,
      prepared.contentsHexLength,
      signaturePayloadHex
    );

    // 2. Extraer firmas mediante ingeniería inversa
    const signatures = extractSignatures(signedPdfBuffer);
    expect(signatures).toHaveLength(1);

    const sig = signatures[0];
    expect(sig.layer).toBe(1);
    expect(sig.signerId).toBe(testUuid);
    expect(sig.signerName).toBe("Jorge Godoy");
    expect(sig.filter).toBe("QProof");
    expect(sig.subFilter).toBe("MLDSA");
    expect(sig.byteRange).toEqual(prepared.byteRange);
    expect(sig.signatureHex.startsWith(signaturePayloadHex)).toBe(true);
  });

  it("extrae múltiples firmas encadenadas por /Prev en orden cronológico (Layer 1, Layer 2)", () => {
    const originalBuffer = new TextEncoder().encode(basePdfText).buffer;
    
    // --- Firma 1 (Alice) ---
    const lastXref1 = findLastXrefOffset(originalBuffer);
    const lastEof1 = findLastEofPosition(originalBuffer);
    const aliceUuid = "alice-uuid-1111-2222-3333-444455556666";

    const prepared1 = prepareSignatureUpdate(
      originalBuffer,
      lastXref1,
      lastEof1,
      "Alice Quantum",
      { signerId: aliceUuid, sigObjectNumber: 998, placeholderBytes: 256 }
    );

    const sigHex1 = "11112222333344445555666677778888";
    const signedBuffer1 = injectSignatureHex(
      prepared1.preparedPdfBuffer,
      prepared1.contentsOffset,
      prepared1.contentsHexLength,
      sigHex1
    );

    // --- Firma 2 (Bob) sobre el documento ya firmado por Alice ---
    const lastXref2 = findLastXrefOffset(signedBuffer1);
    const lastEof2 = findLastEofPosition(signedBuffer1);
    const bobUuid = "bob-uuid-9999-8888-7777-666655554444";

    expect(lastXref2).toBe(prepared1.newXrefOffset);

    const prepared2 = prepareSignatureUpdate(
      signedBuffer1,
      lastXref2,
      lastEof2,
      "Bob Dilithium",
      { signerId: bobUuid, sigObjectNumber: 999, placeholderBytes: 256 }
    );

    const sigHex2 = "aaaabbbbccccddddeeeeffff00001111";
    const doubleSignedBuffer = injectSignatureHex(
      prepared2.preparedPdfBuffer,
      prepared2.contentsOffset,
      prepared2.contentsHexLength,
      sigHex2
    );

    // --- Extracción de ambas firmas encadenadas ---
    const signatures = extractSignatures(doubleSignedBuffer);
    expect(signatures).toHaveLength(2);

    // Primera firma cronológica (Layer 1)
    const [firstSig, secondSig] = signatures;
    expect(firstSig.layer).toBe(1);
    expect(firstSig.signerId).toBe(aliceUuid);
    expect(firstSig.signerName).toBe("Alice Quantum");
    expect(firstSig.signatureHex.startsWith(sigHex1)).toBe(true);
    expect(firstSig.byteRange).toEqual(prepared1.byteRange);

    // Segunda firma cronológica (Layer 2)
    expect(secondSig.layer).toBe(2);
    expect(secondSig.signerId).toBe(bobUuid);
    expect(secondSig.signerName).toBe("Bob Dilithium");
    expect(secondSig.signatureHex.startsWith(sigHex2)).toBe(true);
    expect(secondSig.byteRange).toEqual(prepared2.byteRange);
  });
});
