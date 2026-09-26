import { describe, it, expect } from "vitest";
import { parseXrefTable, extractObject, findLastPageObject } from "../lib/PDFParser";

/**
 * Helper para construir un PDF binario determinista en memoria
 * calculando los offsets exactos de cada objeto indirecto en la tabla XRef.
 */
function buildMockPdf(
  objects: Array<{ num: number; content: string }>,
  rootObjNum: number,
  prevOffset?: number
): { buffer: ArrayBuffer; xrefOffset: number; objOffsets: Map<number, number> } {
  const encoder = new TextEncoder();
  const header = "%PDF-1.7\n";
  let body = header;
  const objOffsets = new Map<number, number>();

  // Ordenar objetos por número
  objects.sort((a, b) => a.num - b.num);

  for (const obj of objects) {
    const offset = encoder.encode(body).length;
    objOffsets.set(obj.num, offset);
    body += `${obj.num} 0 obj\n${obj.content}\nendobj\n`;
  }

  const xrefOffset = encoder.encode(body).length;
  const maxObjNum = Math.max(...objects.map((o) => o.num));
  const count = maxObjNum + 1;

  let xref = `xref\n0 ${count}\n0000000000 65535 f \r\n`;

  for (let i = 1; i < count; i++) {
    const offset = objOffsets.get(i);
    if (offset !== undefined) {
      xref += `${String(offset).padStart(10, "0")} 00000 n \r\n`;
    } else {
      xref += `0000000000 00000 f \r\n`;
    }
  }

  const prevField = prevOffset !== undefined ? ` /Prev ${prevOffset}` : "";
  const trailer = `trailer\n<< /Size ${count} /Root ${rootObjNum} 0 R${prevField} >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const fullPdf = body + xref + trailer;
  return {
    buffer: encoder.encode(fullPdf).buffer,
    xrefOffset,
    objOffsets,
  };
}

describe("PDFParser - parseXrefTable & extractObject", () => {
  it("parsea correctamente la tabla XRef y mapea cada objeto a su byte offset", () => {
    const { buffer, xrefOffset, objOffsets } = buildMockPdf(
      [
        { num: 1, content: "<< /Type /Catalog /Pages 2 0 R >>" },
        { num: 2, content: "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>" },
        { num: 3, content: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>" },
        { num: 4, content: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>" },
      ],
      1
    );

    const xrefMap = parseXrefTable(buffer, xrefOffset);

    expect(xrefMap.size).toBe(4);
    expect(xrefMap.get(1)).toBe(objOffsets.get(1));
    expect(xrefMap.get(2)).toBe(objOffsets.get(2));
    expect(xrefMap.get(3)).toBe(objOffsets.get(3));
    expect(xrefMap.get(4)).toBe(objOffsets.get(4));
  });

  it("extrae el contenido íntegro de un objeto indirecto dado su offset", () => {
    const { buffer, objOffsets } = buildMockPdf(
      [
        { num: 1, content: "<< /Type /Catalog /Pages 2 0 R >>" },
        { num: 2, content: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
        { num: 3, content: "<< /Type /Page /Parent 2 0 R /Label (TestPage) >>" },
      ],
      1
    );

    const obj1Text = extractObject(buffer, objOffsets.get(1)!);
    expect(obj1Text).toContain("1 0 obj");
    expect(obj1Text).toContain("/Type /Catalog");
    expect(obj1Text).toContain("/Pages 2 0 R");
    expect(obj1Text).toContain("endobj");

    const obj3Text = extractObject(buffer, objOffsets.get(3)!);
    expect(obj3Text).toContain("3 0 obj");
    expect(obj3Text).toContain("/Type /Page");
    expect(obj3Text).toContain("/Label (TestPage)");
    expect(obj3Text).toContain("endobj");
  });

  it("salta con seguridad los bytes de un stream según /Length sin decodificar el payload binario", () => {
    // Creamos un stream binario que contiene intencionalmente la palabra 'endobj' dentro del payload
    const fakeBinaryPayload = "BINARY_DATA_WITH_FAKE_endobj_INSIDE_STREAM";
    const payloadLength = fakeBinaryPayload.length;
    const streamContent = `<< /Type /XObject /Subtype /Form /Length ${payloadLength} >>\nstream\r\n${fakeBinaryPayload}\r\nendstream`;

    const { buffer, objOffsets } = buildMockPdf(
      [
        { num: 1, content: "<< /Type /Catalog /Pages 2 0 R >>" },
        { num: 2, content: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
        { num: 3, content: "<< /Type /Page /Parent 2 0 R >>" },
        { num: 10, content: streamContent },
      ],
      1
    );

    const obj10Text = extractObject(buffer, objOffsets.get(10)!);
    expect(obj10Text).toContain("10 0 obj");
    expect(obj10Text).toContain("/Type /XObject");
    expect(obj10Text).toContain(`/Length ${payloadLength}`);
    expect(obj10Text).toContain("endobj");
    // Verifica que no se corrompe ni se incluye todo el payload binario en la extracción del diccionario
    expect(obj10Text).not.toContain(fakeBinaryPayload);
  });

  it("resuelve correctamente un /Length indirecto (/Length 12 0 R) y salta el stream de forma segura", () => {
    const fakeBinaryPayload = "STREAM_DATA_WITH_INDIRECT_LENGTH_endobj_INSIDE";
    const payloadLength = fakeBinaryPayload.length;
    // El objeto 10 tiene /Length referenciando al objeto 12 (12 0 R)
    const streamContent = `<< /Type /XObject /Subtype /Form /Length 12 0 R >>\nstream\r\n${fakeBinaryPayload}\r\nendstream`;
    const lengthObjContent = `${payloadLength}`;

    const { buffer, objOffsets } = buildMockPdf(
      [
        { num: 1, content: "<< /Type /Catalog /Pages 2 0 R >>" },
        { num: 2, content: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
        { num: 3, content: "<< /Type /Page /Parent 2 0 R >>" },
        { num: 10, content: streamContent },
        { num: 12, content: lengthObjContent },
      ],
      1
    );

    const obj10Text = extractObject(buffer, objOffsets.get(10)!);
    expect(obj10Text).toContain("10 0 obj");
    expect(obj10Text).toContain("/Type /XObject");
    expect(obj10Text).toContain("/Length 12 0 R");
    expect(obj10Text).toContain("endobj");
    // Verifica que el payload binario fue saltado y no se incluyó en la extracción
    expect(obj10Text).not.toContain(fakeBinaryPayload);

    // Verificar además que el objeto de longitud se puede extraer independientemente
    const obj12Text = extractObject(buffer, objOffsets.get(12)!);
    expect(obj12Text).toContain("12 0 obj");
    expect(obj12Text).toContain(String(payloadLength));
    expect(obj12Text).toContain("endobj");
  });
});

describe("PDFParser - findLastPageObject", () => {
  it("encuentra la última página y devuelve existingAnnots vacío si la página no contiene /Annots", () => {
    const { buffer, xrefOffset } = buildMockPdf(
      [
        { num: 1, content: "<< /Type /Catalog /Pages 2 0 R >>" },
        { num: 2, content: "<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>" },
        { num: 3, content: "<< /Type /Page /Parent 2 0 R /PageNum (1) >>" },
        { num: 4, content: "<< /Type /Page /Parent 2 0 R /PageNum (2) >>" },
        { num: 5, content: "<< /Type /Page /Parent 2 0 R /PageNum (3-Last) >>" },
      ],
      1
    );

    const lastPage = findLastPageObject(buffer, xrefOffset);

    expect(lastPage.pageObjNumber).toBe(5);
    expect(lastPage.pageDict).toContain("/Type /Page");
    expect(lastPage.pageDict).toContain("(3-Last)");
    expect(lastPage.existingAnnots).toBe("");
  });

  it("extrae existingAnnots correctamente cuando la página ya contiene un array /Annots", () => {
    const { buffer, xrefOffset } = buildMockPdf(
      [
        { num: 1, content: "<< /Type /Catalog /Pages 2 0 R >>" },
        { num: 2, content: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
        { num: 3, content: "<< /Type /Page /Parent 2 0 R /Annots [ 15 0 R 16 0 R ] >>" },
      ],
      1
    );

    const lastPage = findLastPageObject(buffer, xrefOffset);

    expect(lastPage.pageObjNumber).toBe(3);
    expect(lastPage.pageDict).toContain("/Type /Page");
    expect(lastPage.existingAnnots).toBe("15 0 R 16 0 R");
  });

  it("navega recursivamente un árbol jerárquico de páginas anidadas (/Pages -> /Pages -> /Page)", () => {
    const { buffer, xrefOffset } = buildMockPdf(
      [
        { num: 1, content: "<< /Type /Catalog /Pages 2 0 R >>" },
        { num: 2, content: "<< /Type /Pages /Kids [10 0 R 20 0 R] /Count 4 >>" },
        { num: 10, content: "<< /Type /Pages /Parent 2 0 R /Kids [3 0 R 4 0 R] /Count 2 >>" },
        { num: 20, content: "<< /Type /Pages /Parent 2 0 R /Kids [5 0 R 6 0 R] /Count 2 >>" },
        { num: 3, content: "<< /Type /Page /Parent 10 0 R /PageNum (1) >>" },
        { num: 4, content: "<< /Type /Page /Parent 10 0 R /PageNum (2) >>" },
        { num: 5, content: "<< /Type /Page /Parent 20 0 R /PageNum (3) >>" },
        { num: 6, content: "<< /Type /Page /Parent 20 0 R /PageNum (4-LastNested) /Annots [ 99 0 R ] >>" },
      ],
      1
    );

    const lastPage = findLastPageObject(buffer, xrefOffset);

    expect(lastPage.pageObjNumber).toBe(6);
    expect(lastPage.pageDict).toContain("/Type /Page");
    expect(lastPage.pageDict).toContain("(4-LastNested)");
    expect(lastPage.existingAnnots).toBe("99 0 R");
  });

  it("recupera /Root y el árbol de páginas a través de trailers encadenados por /Prev", () => {
    // 1. Revisión base
    const base = buildMockPdf(
      [
        { num: 1, content: "<< /Type /Catalog /Pages 2 0 R >>" },
        { num: 2, content: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
        { num: 3, content: "<< /Type /Page /Parent 2 0 R /Label (BaseRevisionPage) >>" },
      ],
      1
    );

    // 2. Revisión incremental añadiendo un objeto
    const baseBytes = new Uint8Array(base.buffer);
    const rev1Obj = `999 0 obj\n<< /Type /Sig /Filter /QProof >>\nendobj\n`;
    const rev1ObjBytes = new TextEncoder().encode(rev1Obj);
    const rev1ObjOffset = baseBytes.length;

    const rev1XrefOffset = rev1ObjOffset + rev1ObjBytes.length;
    const rev1Xref = `xref\n999 1\n${String(rev1ObjOffset).padStart(10, "0")} 00000 n \r\n`;
    const rev1Trailer = `trailer\n<< /Size 1000 /Prev ${base.xrefOffset} >>\nstartxref\n${rev1XrefOffset}\n%%EOF\n`;

    const rev1TailBytes = new TextEncoder().encode(rev1Xref + rev1Trailer);
    const fullBuffer = new Uint8Array(baseBytes.length + rev1ObjBytes.length + rev1TailBytes.length);
    fullBuffer.set(baseBytes, 0);
    fullBuffer.set(rev1ObjBytes, baseBytes.length);
    fullBuffer.set(rev1TailBytes, baseBytes.length + rev1ObjBytes.length);

    const lastPage = findLastPageObject(fullBuffer.buffer, rev1XrefOffset);
    expect(lastPage.pageObjNumber).toBe(3);
    expect(lastPage.pageDict).toContain("/Label (BaseRevisionPage)");
    expect(lastPage.existingAnnots).toBe("");
  });
});
