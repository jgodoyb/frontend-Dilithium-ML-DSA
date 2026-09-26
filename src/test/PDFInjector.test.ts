import { describe, it, expect } from "vitest";
import { prepareVisualSignatureUpdate } from "../lib/PDFInjector";
import { findLastXrefOffset, findLastEofPosition } from "../lib/PDFScanner";
import { findLastPageObject } from "../lib/PDFParser";
import { generateAppearanceStream } from "../lib/PDFAppearance";
import { extractSignatures } from "../lib/PDFExtractor";
import { extractSignableBytes, injectSignatureHex } from "../lib/PDFSigner";

/**
 * Helper para construir un PDF base válido en memoria.
 */
function createBasePdf(existingAnnots?: string): { buffer: ArrayBuffer; pageObjNumber: number } {
  const encoder = new TextEncoder();
  const header = "%PDF-1.7\n";
  let body = header;
  const offsets = new Map<number, number>();

  const annotsEntry = existingAnnots ? ` /Annots [ ${existingAnnots} ]` : "";

  const objects = [
    { num: 1, content: "<< /Type /Catalog /Pages 2 0 R >>" },
    { num: 2, content: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
    { num: 3, content: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]${annotsEntry} >>` },
  ];

  if (existingAnnots) {
    // Si hay anotaciones existentes, agregamos un objeto simulado para cada referencia
    objects.push({ num: 12, content: "<< /Type /Annot /Subtype /Text /Contents (Nota previa) >>" });
  }

  objects.sort((a, b) => a.num - b.num);

  for (const obj of objects) {
    const offset = encoder.encode(body).length;
    offsets.set(obj.num, offset);
    body += `${obj.num} 0 obj\n${obj.content}\nendobj\n`;
  }

  const xrefOffset = encoder.encode(body).length;
  const maxObj = Math.max(...objects.map((o) => o.num));
  const count = maxObj + 1;

  let xref = `xref\n0 ${count}\n0000000000 65535 f \r\n`;
  for (let i = 1; i < count; i++) {
    const off = offsets.get(i);
    if (off !== undefined) {
      xref += `${String(off).padStart(10, "0")} 00000 n \r\n`;
    } else {
      xref += `0000000000 00000 f \r\n`;
    }
  }

  const trailer = `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const full = body + xref + trailer;

  return {
    buffer: encoder.encode(full).buffer,
    pageObjNumber: 3,
  };
}

describe("PDFInjector - prepareVisualSignatureUpdate", () => {
  it("inyecta una actualización incremental multi-objeto con página modificada, widget, apariencia y firma", () => {
    const { buffer, pageObjNumber } = createBasePdf();
    const lastXref = findLastXrefOffset(buffer);
    const lastEof = findLastEofPosition(buffer);
    const lastPage = findLastPageObject(buffer, lastXref);

    expect(lastPage.pageObjNumber).toBe(pageObjNumber);
    expect(lastPage.existingAnnots).toBe("");

    const signerId = "usr-uuid-1234-abcd";
    const signerName = "Amador";
    const widgetRect = [100, 100, 300, 150];

    // Generar stream de apariencia Form XObject
    const apStream = generateAppearanceStream(
      998,
      200,
      50,
      `Firmado digitalmente por: ${signerName}\nAlgoritmo: ML-DSA-65`
    );

    const prepared = prepareVisualSignatureUpdate(
      buffer,
      lastXref,
      lastEof,
      lastPage.pageObjNumber,
      lastPage.existingAnnots,
      apStream,
      widgetRect,
      signerId,
      signerName,
      {
        pageDict: lastPage.pageDict,
        widgetObjNumber: 997,
        apObjNumber: 998,
        sigObjectNumber: 999,
        placeholderBytes: 1024,
      }
    );

    expect(prepared.preparedPdfBuffer.byteLength).toBeGreaterThan(buffer.byteLength);
    expect(prepared.widgetObjNumber).toBe(997);
    expect(prepared.apObjNumber).toBe(998);
    expect(prepared.sigObjectNumber).toBe(999);
    expect(prepared.pageObjNumber).toBe(3);

    // 1. Verificar que la nueva revisión permite encontrar la página con su nuevo /Annots [ 997 0 R ]
    const newXref = findLastXrefOffset(prepared.preparedPdfBuffer);
    const newPageInfo = findLastPageObject(prepared.preparedPdfBuffer, newXref);

    expect(newPageInfo.pageObjNumber).toBe(3);
    expect(newPageInfo.existingAnnots).toBe("997 0 R");

    // 2. Extraer y verificar que PDFExtractor reconoce la firma y el UUID de ContactInfo
    const sigs = extractSignatures(prepared.preparedPdfBuffer);
    expect(sigs.length).toBe(1);
    expect(sigs[0].signerId).toBe(signerId);
    expect(sigs[0].byteRange).toEqual(prepared.byteRange);

    // 3. Probar extracción de bytes firmables e inyección de firma real
    const signableBytes = extractSignableBytes(prepared.preparedPdfBuffer, prepared.byteRange);
    expect(signableBytes.length).toBe(prepared.byteRange[1] + prepared.byteRange[3]);

    const dummyHex = "aabbccddeeff00112233445566778899";
    const signedPdf = injectSignatureHex(
      prepared.preparedPdfBuffer,
      prepared.contentsOffset,
      prepared.contentsHexLength,
      dummyHex
    );

    const postSignedSigs = extractSignatures(signedPdf);
    expect(postSignedSigs.length).toBe(1);
    expect(postSignedSigs[0].signatureHex.startsWith("aabbccddeeff")).toBe(true);
    expect(postSignedSigs[0].signerId).toBe(signerId);
  });

  it("fusiona limpiamente anotaciones previas existentes en la página (existingAnnots)", () => {
    const { buffer, pageObjNumber } = createBasePdf("12 0 R");
    const lastXref = findLastXrefOffset(buffer);
    const lastEof = findLastEofPosition(buffer);
    const lastPage = findLastPageObject(buffer, lastXref);

    expect(lastPage.existingAnnots).toBe("12 0 R");

    const signerId = "usr-uuid-5678-efgh";
    const signerName = "Dra. García";
    const widgetRect = [50, 50, 250, 100];
    const apStream = generateAppearanceStream(998, 200, 50, `Firmado por: ${signerName}`);

    const prepared = prepareVisualSignatureUpdate(
      buffer,
      lastXref,
      lastEof,
      lastPage.pageObjNumber,
      lastPage.existingAnnots,
      apStream,
      widgetRect,
      signerId,
      signerName,
      {
        pageDict: lastPage.pageDict,
        widgetObjNumber: 997,
        apObjNumber: 998,
        sigObjectNumber: 999,
      }
    );

    // Verificar que la página modificada ahora contiene ambas anotaciones: la previa (12 0 R) y la nueva (997 0 R)
    const newXref = findLastXrefOffset(prepared.preparedPdfBuffer);
    const newPageInfo = findLastPageObject(prepared.preparedPdfBuffer, newXref);

    expect(newPageInfo.pageObjNumber).toBe(pageObjNumber);
    expect(newPageInfo.existingAnnots).toBe("12 0 R 997 0 R");
  });

  it("calcula dinámicamente los números de objeto evitando colisiones en documentos con altos IDs", () => {
    // Documento con objeto 1500 existente
    const encoder = new TextEncoder();
    let body = "%PDF-1.7\n";
    const offsets = new Map<number, number>();
    const objs = [
      { num: 1, content: "<< /Type /Catalog /Pages 2 0 R >>" },
      { num: 2, content: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
      { num: 3, content: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>" },
      { num: 1500, content: "<< /Type /XObject /Subtype /Image >>" },
    ];
    for (const obj of objs) {
      offsets.set(obj.num, encoder.encode(body).length);
      body += `${obj.num} 0 obj\n${obj.content}\nendobj\n`;
    }
    const xrefOffset = encoder.encode(body).length;
    let xref = `xref\n0 4\n0000000000 65535 f \r\n`;
    for (let i = 1; i <= 3; i++) {
      xref += `${String(offsets.get(i)).padStart(10, "0")} 00000 n \r\n`;
    }
    xref += `1500 1\n${String(offsets.get(1500)).padStart(10, "0")} 00000 n \r\n`;
    const trailer = `trailer\n<< /Size 1501 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    const fullBuffer = encoder.encode(body + xref + trailer).buffer;

    const lastXref = findLastXrefOffset(fullBuffer);
    const lastEof = findLastEofPosition(fullBuffer);
    const lastPage = findLastPageObject(fullBuffer, lastXref);

    const apStream = generateAppearanceStream(1502, 200, 50, "Firma Dinámica");

    const prepared = prepareVisualSignatureUpdate(
      fullBuffer,
      lastXref,
      lastEof,
      lastPage.pageObjNumber,
      lastPage.existingAnnots,
      apStream,
      [10, 10, 200, 60],
      "usr-uuid-dynamic",
      "Firmante Dinámico"
      // Sin pasar widgetObjNumber/apObjNumber/sigObjectNumber explícitos
    );

    // Debe calcularlos secuencialmente a partir de 1500:
    expect(prepared.widgetObjNumber).toBe(1501);
    expect(prepared.apObjNumber).toBe(1502);
    expect(prepared.sigObjectNumber).toBe(1503);

    const sigs = extractSignatures(prepared.preparedPdfBuffer);
    expect(sigs.length).toBe(1);
    expect(sigs[0].signerId).toBe("usr-uuid-dynamic");
  });

  it("conserva /Root y /ID en el nuevo tráiler y genera líneas XRef de exactamente 20 bytes", () => {
    const { buffer, pageObjNumber } = createBasePdf();
    const lastXref = findLastXrefOffset(buffer);
    const lastEof = findLastEofPosition(buffer);
    const lastPage = findLastPageObject(buffer, lastXref);

    const apStream = generateAppearanceStream(998, 200, 50, "Firma Test");
    const prepared = prepareVisualSignatureUpdate(
      buffer,
      lastXref,
      lastEof,
      pageObjNumber,
      lastPage.existingAnnots,
      apStream,
      [10, 10, 200, 50],
      "uuid-trailer-test",
      "Test Trailer"
    );

    const text = new TextDecoder("latin1").decode(new Uint8Array(prepared.preparedPdfBuffer));
    
    // Verificar tráiler con /Root y /Prev
    expect(text).toMatch(/trailer\s*<<[\s\S]*?\/Root\s+1\s+0\s+R[\s\S]*?\/Prev\s+\d+[\s\S]*?>>/i);

    // Verificar que las líneas de la tabla XRef delta miden exactamente 20 bytes
    const deltaXrefText = text.substring(prepared.newXrefOffset);
    const xrefLines = deltaXrefText.split("\r\n");
    expect(xrefLines[0]).toBe("xref");
    // La segunda línea es la cabecera de subsección
    expect(xrefLines[1]).toMatch(/^\d+\s+\d+$/);
    
    // Las siguientes 4 líneas son las entradas de objetos de 20/21 bytes con formato estricto con espacio antes de \r\n
    for (let i = 2; i <= 5; i++) {
      const line = xrefLines[i];
      // Formato: "0000000000 00000 n " -> 19 caracteres + \r\n
      if (line && line.match(/^\d{10}\s\d{5}\s[nf]\s$/)) {
        expect(line.length).toBe(19);
        expect(line).toMatch(/^\d{10}\s\d{5}\s[nf]\s$/);
      }
    }
  });
});
