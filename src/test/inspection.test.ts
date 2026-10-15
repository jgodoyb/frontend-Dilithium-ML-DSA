import { describe, it } from 'vitest';
import * as fs from 'fs';
import { findLastXrefOffset, findLastEofPosition } from '../lib/PDFScanner';
import { findPageObject } from '../lib/PDFParser';
import { generateAppearanceStream } from '../lib/PDFAppearance';
import { prepareVisualSignatureUpdate } from '../lib/PDFInjector';
import { injectSignatureHex } from '../lib/PDFSigner';
import { validatePdfStructure } from '../lib/pdfDiagnostic';
import { PDFDocument } from 'pdf-lib';

describe('Real documents diagnostic', () => {
  const curriculumPath = 'C:/Users/jorja/OneDrive/Escritorio/Documentos Pruebas/Mi_curriculum.pdf';
  const folletosPath = 'C:/Users/jorja/OneDrive/Escritorio/Documentos Pruebas/folletos-CICLOS-WEB-APGI.pdf';

  it('inspects Mi_curriculum.pdf and signs it', async () => {
    if (!fs.existsSync(curriculumPath)) {
      console.log('Skipping: curriculum not found');
      return;
    }
    const buf = fs.readFileSync(curriculumPath);
    console.log('=== Mi_curriculum.pdf ===');
    const lastXref = findLastXrefOffset(buf.buffer);
    const lastEof = findLastEofPosition(buf.buffer);
    console.log('lastXref:', lastXref, 'lastEof:', lastEof);
    const page = findPageObject(buf.buffer, lastXref, 0);
    console.log('Page 0 objNum:', page?.pageObjNumber, 'existingAnnots:', page?.existingAnnots);
    console.log('pageDict length:', page?.pageDict?.length);
    console.log('pageDict snippet:', page?.pageDict?.slice(0, 150));

    const apStream = generateAppearanceStream(
      200,
      50,
      'Firmado digitalmente por Juan Perez\nAlgoritmo: ML-DSA-65\nFecha: 2026-10-15'
    );

    try {
      const prepared = prepareVisualSignatureUpdate(
        buf.buffer,
        lastXref,
        lastEof,
        page.pageObjNumber,
        page.existingAnnots,
        apStream,
        [50, 50, 250, 100],
        'signer-123',
        'Juan Perez',
        {
          pageDict: page.pageDict,
          placeholderBytes: 1024,
        }
      );

      const signed = injectSignatureHex(
        prepared.preparedPdfBuffer,
        prepared.contentsOffset,
        prepared.contentsHexLength,
        '0123456789abcdef'
      );

      const signedStr = new TextDecoder('latin1').decode(new Uint8Array(signed));
      console.log('Snippet around 217442:', JSON.stringify(signedStr.slice(217350, 217550)));
      const diag = validatePdfStructure(signed);
      console.log('Diagnostic result Mi_curriculum:', diag);

      try {
        const doc = await PDFDocument.load(signed);
        console.log('SUCCESS: pdf-lib loaded signed Mi_curriculum! Pages:', doc.getPageCount());
      } catch (e: any) {
        console.error('ERROR: pdf-lib failed loading signed Mi_curriculum:', e.message);
      }
    } catch (err: any) {
      console.error('ERROR during preparation of Mi_curriculum:', err.message, err.stack);
    }
  });

  it('inspects folletos-CICLOS-WEB-APGI.pdf and signs it', async () => {
    if (!fs.existsSync(folletosPath)) {
      console.log('Skipping: folletos not found');
      return;
    }
    const buf = fs.readFileSync(folletosPath);
    console.log('=== folletos-CICLOS-WEB-APGI.pdf ===');
    const lastXref = findLastXrefOffset(buf.buffer);
    const lastEof = findLastEofPosition(buf.buffer);
    console.log('lastXref:', lastXref, 'lastEof:', lastEof);
    const page = findPageObject(buf.buffer, lastXref, 0);
    console.log('Page 0 objNum:', page?.pageObjNumber, 'existingAnnots:', page?.existingAnnots);
    console.log('pageDict snippet:', page?.pageDict?.slice(0, 150));

    const apStream = generateAppearanceStream(
      200,
      50,
      'Firmado digitalmente por Juan Perez\nAlgoritmo: ML-DSA-65\nFecha: 2026-10-15'
    );

    try {
      const prepared = prepareVisualSignatureUpdate(
        buf.buffer,
        lastXref,
        lastEof,
        page.pageObjNumber,
        page.existingAnnots,
        apStream,
        [50, 50, 250, 100],
        'signer-123',
        'Juan Perez',
        {
          pageDict: page.pageDict,
          placeholderBytes: 1024,
        }
      );

      const signed = injectSignatureHex(
        prepared.preparedPdfBuffer,
        prepared.contentsOffset,
        prepared.contentsHexLength,
        '0123456789abcdef'
      );

      const diag = validatePdfStructure(signed);
      console.log('Diagnostic result folletos:', diag);

      try {
        const doc = await PDFDocument.load(signed);
        console.log('SUCCESS: pdf-lib loaded signed folletos! Pages:', doc.getPageCount());
      } catch (e: any) {
        console.error('ERROR: pdf-lib failed loading signed folletos:', e.message);
      }
    } catch (err: any) {
      console.error('ERROR during preparation of folletos:', err.message, err.stack);
    }
  });

  it('signs Mi_curriculum.pdf with createNewSignatureSheet (Hub workflow)', async () => {
    if (!fs.existsSync(curriculumPath)) return;
    const buf = fs.readFileSync(curriculumPath);
    const lastXref = findLastXrefOffset(buf.buffer);
    const lastEof = findLastEofPosition(buf.buffer);
    const page = findPageObject(buf.buffer, lastXref, 0);

    const apStream = generateAppearanceStream(
      450,
      65,
      'Firmado por: Jorge Godoy\nAlgoritmo: ML-DSA-65\nQ-Proof Systems'
    );

    const prepared = prepareVisualSignatureUpdate(
      buf.buffer,
      lastXref,
      lastEof,
      page.pageObjNumber,
      "",
      apStream,
      [50, 700, 500, 765],
      'user-1234',
      'Jorge Godoy Beltrán',
      {
        createNewSignatureSheet: true,
        pagesRootObjNumber: page.pagesRootObjNum,
        pagesRootDict: page.pagesRootDict,
        pagesCount: page.pagesCount,
        kids: page.kids,
        placeholderBytes: 1024,
      }
    );

    const signed = injectSignatureHex(
      prepared.preparedPdfBuffer,
      prepared.contentsOffset,
      prepared.contentsHexLength,
      '0123456789abcdef'
    );

    const diag = validatePdfStructure(signed);
    expect(diag.valid).toBe(true);
    expect(diag.errors.length).toBe(0);

    const doc = await PDFDocument.load(signed);
    console.log('SUCCESS: pdf-lib loaded Mi_curriculum with signature sheet! Total pages:', doc.getPageCount());
    expect(doc.getPageCount()).toBe(page.pagesCount + 1);
  });

  it('signs folletos-CICLOS-WEB-APGI.pdf with createNewSignatureSheet (Hub workflow)', async () => {
    if (!fs.existsSync(folletosPath)) return;
    const buf = fs.readFileSync(folletosPath);
    const lastXref = findLastXrefOffset(buf.buffer);
    const lastEof = findLastEofPosition(buf.buffer);
    const page = findPageObject(buf.buffer, lastXref, 0);

    const apStream = generateAppearanceStream(
      450,
      65,
      'Firmado por: Jorge Godoy\nAlgoritmo: ML-DSA-65\nQ-Proof Systems'
    );

    const prepared = prepareVisualSignatureUpdate(
      buf.buffer,
      lastXref,
      lastEof,
      page.pageObjNumber,
      "",
      apStream,
      [50, 700, 500, 765],
      'user-1234',
      'Jorge Godoy Beltrán',
      {
        createNewSignatureSheet: true,
        pagesRootObjNumber: page.pagesRootObjNum,
        pagesRootDict: page.pagesRootDict,
        pagesCount: page.pagesCount,
        kids: page.kids,
        placeholderBytes: 1024,
      }
    );

    const signed = injectSignatureHex(
      prepared.preparedPdfBuffer,
      prepared.contentsOffset,
      prepared.contentsHexLength,
      '0123456789abcdef'
    );

    const diag = validatePdfStructure(signed);
    expect(diag.valid).toBe(true);
    expect(diag.errors.length).toBe(0);

    const doc = await PDFDocument.load(signed);
    console.log('SUCCESS: pdf-lib loaded folletos with signature sheet! Total pages:', doc.getPageCount());
    expect(doc.getPageCount()).toBe(page.pagesCount + 1);
  });

  it('signs Trabajo Fin de Grado.pdf (Complex multi-page LaTeX thesis)', async () => {
    const tfgPath = 'C:/Users/jorja/OneDrive/Escritorio/Documentos Pruebas/Trabajo Fin de Grado.pdf';
    if (!fs.existsSync(tfgPath)) return;
    const buf = fs.readFileSync(tfgPath);
    const lastXref = findLastXrefOffset(buf.buffer);
    const lastEof = findLastEofPosition(buf.buffer);
    const page = findPageObject(buf.buffer, lastXref, 0);

    const apStream = generateAppearanceStream(
      450,
      65,
      'Firmado por: Jorge Godoy\nAlgoritmo: ML-DSA-65\nQ-Proof Systems'
    );

    const prepared = prepareVisualSignatureUpdate(
      buf.buffer,
      lastXref,
      lastEof,
      page.pageObjNumber,
      "",
      apStream,
      [50, 700, 500, 765],
      'user-1234',
      'Jorge Godoy Beltrán',
      {
        createNewSignatureSheet: true,
        pagesRootObjNumber: page.pagesRootObjNum,
        pagesRootDict: page.pagesRootDict,
        pagesCount: page.pagesCount,
        kids: page.kids,
        placeholderBytes: 1024,
      }
    );

    const signed = injectSignatureHex(
      prepared.preparedPdfBuffer,
      prepared.contentsOffset,
      prepared.contentsHexLength,
      '0123456789abcdef'
    );

    const diag = validatePdfStructure(signed);
    expect(diag.valid).toBe(true);
    expect(diag.errors.length).toBe(0);

    const doc = await PDFDocument.load(signed);
    console.log('SUCCESS: pdf-lib loaded Trabajo Fin de Grado! Total pages:', doc.getPageCount());
    expect(doc.getPageCount()).toBe(page.pagesCount + 1);
  });

  it('signs DNI.pdf (1-page official document)', async () => {
    const dniPath = 'C:/Users/jorja/OneDrive/Escritorio/Documentos Pruebas/DNI.pdf';
    if (!fs.existsSync(dniPath)) return;
    const buf = fs.readFileSync(dniPath);
    const lastXref = findLastXrefOffset(buf.buffer);
    const lastEof = findLastEofPosition(buf.buffer);
    const page = findPageObject(buf.buffer, lastXref, 0);

    const apStream = generateAppearanceStream(
      450,
      65,
      'Firmado por: Jorge Godoy\nAlgoritmo: ML-DSA-65\nQ-Proof Systems'
    );

    const prepared = prepareVisualSignatureUpdate(
      buf.buffer,
      lastXref,
      lastEof,
      page.pageObjNumber,
      "",
      apStream,
      [50, 700, 500, 765],
      'user-1234',
      'Jorge Godoy Beltrán',
      {
        createNewSignatureSheet: true,
        pagesRootObjNumber: page.pagesRootObjNum,
        pagesRootDict: page.pagesRootDict,
        pagesCount: page.pagesCount,
        kids: page.kids,
        placeholderBytes: 1024,
      }
    );

    const signed = injectSignatureHex(
      prepared.preparedPdfBuffer,
      prepared.contentsOffset,
      prepared.contentsHexLength,
      '0123456789abcdef'
    );

    const diag = validatePdfStructure(signed);
    expect(diag.valid).toBe(true);
    expect(diag.errors.length).toBe(0);

    const doc = await PDFDocument.load(signed);
    console.log('SUCCESS: pdf-lib loaded DNI.pdf with signature sheet! Total pages:', doc.getPageCount());
    expect(doc.getPageCount()).toBe(page.pagesCount + 1);
  });
});

