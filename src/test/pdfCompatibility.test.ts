import { describe, it, expect } from "vitest";
import { checkPdfCompatibility, translateSigningError } from "../lib/pdfCompatibility";

describe("pdfCompatibility - checkPdfCompatibility", () => {
  it("detecta archivo vacío", async () => {
    const res = await checkPdfCompatibility(new ArrayBuffer(0));
    expect(res.compatible).toBe(false);
    expect(res.issueType).toBe("MALFORMED_STRUCTURE");
  });

  it("detecta cabecera no PDF", async () => {
    const text = "Esto no es un archivo PDF";
    const buf = new TextEncoder().encode(text).buffer;
    const res = await checkPdfCompatibility(buf);
    expect(res.compatible).toBe(false);
    expect(res.issueType).toBe("MALFORMED_STRUCTURE");
  });

  it("detecta firmas tradicionales incompatibles (Adobe.PPKLite / adbe.pkcs7.detached)", async () => {
    const fakeAdobePdf = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R >>
endobj
4 0 obj
<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached /ByteRange [ 0 100 200 50 ] >>
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000160 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
280
%%EOF
`;
    const buf = new TextEncoder().encode(fakeAdobePdf).buffer;
    const res = await checkPdfCompatibility(buf);
    expect(res.compatible).toBe(false);
    expect(res.issueType).toBe("INCOMPATIBLE_SIGNATURES");
    expect(res.title).toContain("firmas no compatibles");
  });

  it("detecta PDFs cifrados (/Encrypt)", async () => {
    const fakeEncryptedPdf = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [] /Count 0 >>
endobj
trailer
<< /Size 3 /Root 1 0 R /Encrypt 5 0 R >>
startxref
100
%%EOF
`;
    const buf = new TextEncoder().encode(fakeEncryptedPdf).buffer;
    const res = await checkPdfCompatibility(buf);
    expect(res.compatible).toBe(false);
    expect(res.issueType).toBe("ENCRYPTED_OR_PROTECTED");
  });

  it("detecta formularios dinámicos XFA", async () => {
    const fakeXfaPdf = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R /AcroForm << /XFA [ (template) 4 0 R ] >> >>
endobj
trailer
<< /Size 2 /Root 1 0 R >>
startxref
120
%%EOF
`;
    const buf = new TextEncoder().encode(fakeXfaPdf).buffer;
    const res = await checkPdfCompatibility(buf);
    expect(res.compatible).toBe(false);
    expect(res.issueType).toBe("COMPLEX_OR_UNSUPPORTED");
    expect(res.title).toContain("XFA");
  });

  it("acepta un PDF limpio estándar", async () => {
    const cleanPdf = `%PDF-1.7
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
    const buf = new TextEncoder().encode(cleanPdf).buffer;
    const res = await checkPdfCompatibility(buf);
    expect(res.compatible).toBe(true);
  });
});

describe("pdfCompatibility - translateSigningError", () => {
  it("traduce error de PDFDict undefined a diagnóstico amigable para el usuario", () => {
    const err = new Error("Expected instance of PDFDict, but got instance of undefined");
    const diag = translateSigningError(err);
    expect(diag.compatible).toBe(false);
    expect(diag.issueType).toBe("COMPLEX_OR_UNSUPPORTED");
    expect(diag.title).toContain("Estructura de documento incompatible");
    expect(diag.message).toContain("Renfe");
    expect(diag.recommendation).toContain("Imprimir");
  });

  it("traduce error de documento multifirmado incompatible", () => {
    const err = new Error("No se pudo leer la estructura del PDF multifirmado");
    const diag = translateSigningError(err);
    expect(diag.compatible).toBe(false);
    expect(diag.issueType).toBe("INCOMPATIBLE_SIGNATURES");
  });
});
