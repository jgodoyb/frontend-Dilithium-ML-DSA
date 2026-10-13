import { describe, it, expect } from 'vitest';
import { validatePdfStructure, comparePdfBinaries, formatHexDump } from '../lib/pdfDiagnostic';
import { prepareVisualSignatureUpdate } from '../lib/PDFInjector';
import { generateAppearanceStream } from '../lib/PDFAppearance';
import { findLastXrefOffset, findLastEofPosition } from '../lib/PDFScanner';
import { findLastPageObject } from '../lib/PDFParser';
import { injectSignatureHex } from '../lib/PDFSigner';
import { extractSignatures } from '../lib/PDFExtractor';
import fs from 'fs';
import path from 'path';

describe('pdfDiagnostic - Low-Level Audit and Diff Suite', () => {
  it('correctly validates a prepared and signed PDF document', () => {
    const filePath = path.resolve('public/docs/TOR_Almeria_Hard_Sciences.pdf');
    const nodeBuf = fs.readFileSync(filePath);
    const buffer = nodeBuf.buffer.slice(nodeBuf.byteOffset, nodeBuf.byteOffset + nodeBuf.byteLength);

    const lastXref = findLastXrefOffset(buffer);
    const lastEof = findLastEofPosition(buffer);
    const lastPageInfo = findLastPageObject(buffer, lastXref);

    const apStream = generateAppearanceStream(998, 200, 50, "Firmado por: Lead Systems Engineer\nAlgoritmo: ML-DSA-65");

    const prepared = prepareVisualSignatureUpdate(
      buffer,
      lastXref,
      lastEof,
      lastPageInfo.pageObjNumber,
      lastPageInfo.existingAnnots,
      apStream,
      [100, 100, 300, 150],
      "uuid-systems-engineer",
      "Lead Systems Engineer",
      {
        pageDict: lastPageInfo.pageDict,
        placeholderBytes: 8192
      }
    );

    const fakeSigHex = "cafebabe".repeat(827) + "00".repeat(2);
    const signedBuffer = injectSignatureHex(
      prepared.preparedPdfBuffer,
      prepared.contentsOffset,
      prepared.contentsHexLength,
      fakeSigHex
    );

    const result = validatePdfStructure(signedBuffer);
    expect(result.valid).toBe(true);
    expect(result.header.valid).toBe(true);
    expect(result.tail.valid).toBe(true);
    expect(result.objectCollisions.length).toBe(0);
    expect(result.signature?.valid).toBe(true);
    expect(result.signature?.bracketOpenValid).toBe(true);
    expect(result.signature?.bracketCloseValid).toBe(true);
    expect(result.signature?.byteRangeSumMatchesTotal).toBe(true);
    expect(result.signature?.hexCharsValid).toBe(true);
  });

  it('detects byte-level diffs and generates formatted hex dumps when comparing documents', () => {
    const rawA = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
    const rawB = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);

    const report = comparePdfBinaries(rawA, rawB);
    expect(report.identical).toBe(false);
    expect(report.firstDiffOffset).toBe(7); // '7' vs '4'

    const hexDump = formatHexDump(rawA);
    expect(hexDump).toContain("25 50 44 46 2D 31 2E 37 0A");
  });

  it('validates multi-signature Mode B and guarantees no endobj syntax collisions', () => {
    const filePath = path.resolve('public/docs/TOR_Almeria_Hard_Sciences.pdf');
    const nodeBuf = fs.readFileSync(filePath);
    const buffer = nodeBuf.buffer.slice(nodeBuf.byteOffset, nodeBuf.byteOffset + nodeBuf.byteLength);

    const lastXref = findLastXrefOffset(buffer);
    const lastEof = findLastEofPosition(buffer);
    const lastPageInfo = findLastPageObject(buffer, lastXref);

    const apStream = generateAppearanceStream(998, 200, 50, "Firma Multi-Capa");

    const prepared = prepareVisualSignatureUpdate(
      buffer,
      lastXref,
      lastEof,
      lastPageInfo.pageObjNumber,
      lastPageInfo.existingAnnots,
      apStream,
      [100, 100, 300, 150],
      "uuid-multi-1234",
      "Firmante 2",
      {
        createNewSignatureSheet: false,
        pageDict: lastPageInfo.pageDict,
        placeholderBytes: 8192
      }
    );

    const result = validatePdfStructure(prepared.preparedPdfBuffer);
    expect(result.objectCollisions.length).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('correctly processes and validates a modern PDF with /Type /XRef Stream and executes sequential multi-signature', () => {
    // Helper para construir un PDF 1.5 con Cross-Reference Stream (/Type /XRef)
    const encoder = new TextEncoder();
    const header = "%PDF-1.5\n%\xE2\xE3\xCF\xD3\n";
    let body = header;

    const objects = [
      { num: 1, content: "<< /Type /Catalog /Pages 2 0 R >>" },
      { num: 2, content: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
      { num: 3, content: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] >>" },
    ];

    for (const obj of objects) {
      body += `${obj.num} 0 obj\n${obj.content}\nendobj\n`;
    }

    const xrefOffset = encoder.encode(body).length;
    const dummyStreamBytes = new Uint8Array([0x78, 0x9c, 0x63, 0x60, 0x60, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01]);
    const dummyStreamStr = new TextDecoder("latin1").decode(dummyStreamBytes);

    const xrefObj = `4 0 obj\n<<\n  /Type /XRef\n  /Size 5\n  /Root 1 0 R\n  /ID [ <A1B2C3D4E5F678901234567890ABCDEF> <A1B2C3D4E5F678901234567890ABCDEF> ]\n  /W [ 1 2 2 ]\n  /Index [ 0 5 ]\n  /Filter /FlateDecode\n  /Length ${dummyStreamBytes.length}\n>>\nstream\n${dummyStreamStr}\nendstream\nendobj\n`;
    const tail = `startxref\n${xrefOffset}\n%%EOF\n`;
    const fullPdf = body + xrefObj + tail;
    const buffer = encoder.encode(fullPdf).buffer;

    // 1. Inspección y resolución de la última página en el PDF moderno
    const lastXref = findLastXrefOffset(buffer);
    const lastEof = findLastEofPosition(buffer);
    const lastPageInfo = findLastPageObject(buffer, lastXref);

    expect(lastXref).toBe(xrefOffset);
    expect(lastPageInfo.pageObjNumber).toBe(3);

    // 2. Primera Firma Visual (Capa 1)
    const apStream1 = generateAppearanceStream(998, 200, 50, "Firmante Cuantico 1\nAlgoritmo: ML-DSA-65");
    const prepared1 = prepareVisualSignatureUpdate(
      buffer,
      lastXref,
      lastEof,
      lastPageInfo.pageObjNumber,
      lastPageInfo.existingAnnots,
      apStream1,
      [50, 100, 250, 150],
      "uuid-signer-layer-1",
      "Firmante Cuantico 1",
      {
        pageDict: lastPageInfo.pageDict,
        placeholderBytes: 8192,
      }
    );

    const sigHex1 = "11".repeat(8192);
    const signedBuffer1 = injectSignatureHex(
      prepared1.preparedPdfBuffer,
      prepared1.contentsOffset,
      prepared1.contentsHexLength,
      sigHex1
    );

    // Validación estructural estricta de la primera firma híbrida (ISO 32000-1 §7.5.8)
    const validation1 = validatePdfStructure(signedBuffer1);
    expect(validation1.valid).toBe(true);
    expect(validation1.header.valid).toBe(true);
    expect(validation1.header.version).toBe("1.5");
    expect(validation1.tail.valid).toBe(true);
    expect(validation1.objectCollisions.length).toBe(0);
    expect(validation1.signature?.valid).toBe(true);
    expect(validation1.signature?.byteRangeSumMatchesTotal).toBe(true);
    expect(validation1.signature?.bracketOpenValid).toBe(true);
    expect(validation1.signature?.bracketCloseValid).toBe(true);

    // 3. Segunda Firma Visual Secuencial (Capa 2 - Multifirma sobre actualización híbrida previa)
    const lastXref2 = findLastXrefOffset(signedBuffer1);
    const lastEof2 = findLastEofPosition(signedBuffer1);
    const lastPageInfo2 = findLastPageObject(signedBuffer1, lastXref2);

    expect(lastXref2).toBe(prepared1.newXrefOffset);

    const apStream2 = generateAppearanceStream(995, 200, 50, "Firmante Cuantico 2\nAlgoritmo: ML-DSA-87");
    const prepared2 = prepareVisualSignatureUpdate(
      signedBuffer1,
      lastXref2,
      lastEof2,
      lastPageInfo2.pageObjNumber,
      lastPageInfo2.existingAnnots,
      apStream2,
      [300, 100, 500, 150],
      "uuid-signer-layer-2",
      "Firmante Cuantico 2",
      {
        pageDict: lastPageInfo2.pageDict,
        placeholderBytes: 8192,
      }
    );

    const sigHex2 = "22".repeat(8192);
    const signedBuffer2 = injectSignatureHex(
      prepared2.preparedPdfBuffer,
      prepared2.contentsOffset,
      prepared2.contentsHexLength,
      sigHex2
    );

    // Validación estructural de la multifirma completa
    const validation2 = validatePdfStructure(signedBuffer2);
    expect(validation2.valid).toBe(true);
    expect(validation2.tail.valid).toBe(true);
    expect(validation2.objectCollisions.length).toBe(0);
    expect(validation2.signature?.valid).toBe(true);
    expect(validation2.signature?.byteRangeSumMatchesTotal).toBe(true);

    // Verificar extracción de firmas secuenciales y preservación de capas
    const extracted = extractSignatures(signedBuffer2);
    expect(extracted.length).toBe(2);
    expect(extracted[0].layer).toBe(1);
    expect(extracted[0].signerId).toBe("uuid-signer-layer-1");
    expect(extracted[1].layer).toBe(2);
    expect(extracted[1].signerId).toBe("uuid-signer-layer-2");
  });
});
