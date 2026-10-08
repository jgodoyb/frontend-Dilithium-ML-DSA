import { describe, it, expect } from 'vitest';
import { validatePdfStructure, comparePdfBinaries, formatHexDump } from '../lib/pdfDiagnostic';
import { prepareVisualSignatureUpdate } from '../lib/PDFInjector';
import { generateAppearanceStream } from '../lib/PDFAppearance';
import { findLastXrefOffset, findLastEofPosition } from '../lib/PDFScanner';
import { findLastPageObject } from '../lib/PDFParser';
import { injectSignatureHex } from '../lib/PDFSigner';
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
});
