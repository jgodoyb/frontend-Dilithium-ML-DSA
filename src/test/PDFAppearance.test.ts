import { describe, it, expect } from "vitest";
import {
  generateWidgetAnnot,
  generateAppearanceStream,
  generateAppearanceDrawingStream,
  escapePdfString,
} from "../lib/PDFAppearance";

describe("PDFAppearance - escapePdfString", () => {
  it("escapa caracteres especiales requeridos por la especificación PDF", () => {
    expect(escapePdfString("Hola Mundo")).toBe("Hola Mundo");
    expect(escapePdfString("Doc (v1.0)")).toBe("Doc \\(v1.0\\)");
    expect(escapePdfString("C:\\Archivos\\PDF")).toBe("C:\\\\Archivos\\\\PDF");
    expect(escapePdfString("Test (con \\ barras y (paréntesis))")).toBe(
      "Test \\(con \\\\ barras y \\(paréntesis\\)\\)"
    );
  });
});

describe("PDFAppearance - generateWidgetAnnot", () => {
  it("genera un objeto de anotación Widget estándar ISO 32000 con parámetros por defecto", () => {
    const annotText = generateWidgetAnnot(998, 999, [100, 100, 300, 150]);

    expect(annotText).toContain("998 0 obj");
    expect(annotText).toContain("/Type /Annot");
    expect(annotText).toContain("/Subtype /Widget");
    expect(annotText).toContain("/FT /Sig");
    expect(annotText).toContain("/V 999 0 R");
    expect(annotText).toContain("/T (FirmaAmador)");
    expect(annotText).toContain("/Rect [100 100 300 150]");
    expect(annotText).toContain("/F 132"); // Print (4) + Locked (128)
    expect(annotText).toContain("/AP <<\n    /N 999 0 R\n  >>");
    expect(annotText).toContain("endobj");
  });

  it("permite personalizar apObjNumber y fieldName mediante argumentos opcionales o diccionario", () => {
    const annotText = generateWidgetAnnot(998, 999, [50, 50, 250, 120], 1000, "FirmaDirector");

    expect(annotText).toContain("998 0 obj");
    expect(annotText).toContain("/V 999 0 R");
    expect(annotText).toContain("/T (FirmaDirector)");
    expect(annotText).toContain("/Rect [50 50 250 120]");
    expect(annotText).toContain("/AP <<\n    /N 1000 0 R\n  >>");
  });

  it("permite pasar configuración mediante objeto de opciones", () => {
    const annotText = generateWidgetAnnot(998, 999, [0, 0, 200, 60], {
      apObjNumber: 1050,
      fieldName: "CustomSigField",
    });

    expect(annotText).toContain("/T (CustomSigField)");
    expect(annotText).toContain("/AP <<\n    /N 1050 0 R\n  >>");
  });

  it("lanza error si las coordenadas del rectángulo son inválidas", () => {
    expect(() => generateWidgetAnnot(998, 999, [100, 200] as any)).toThrow(
      /rect.*array de 4 números/
    );
  });
});

describe("PDFAppearance - generateAppearanceStream", () => {
  it("genera un objeto Form XObject con stream de dibujo crudo y texto formateado (firma 3 argumentos)", () => {
    const streamObj = generateAppearanceStream(
      200,
      60,
      "Firmado por: Juan Pérez\nAlgoritmo: ML-DSA-65"
    );

    expect(streamObj).toContain("1000 0 obj");
    expect(streamObj).toContain("/Type /XObject");
    expect(streamObj).toContain("/Subtype /Form");
    expect(streamObj).toContain("/FormType 1");
    expect(streamObj).toContain("/BBox [0 0 200 60]");
    expect(streamObj).toContain("/Matrix [1 0 0 1 0 0]");
    expect(streamObj).toContain("/Font");
    expect(streamObj).toContain("/BaseFont /Helvetica");
    expect(streamObj).toContain("/Length ");
    expect(streamObj).toContain("stream\n");
    expect(streamObj).toContain("endstream\nendobj");

    // Operadores PDF crudos dentro del stream
    expect(streamObj).toContain("q\n");
    expect(streamObj).toContain("re\n");
    expect(streamObj).toContain("BT\n");
    expect(streamObj).toContain("Tf\n");
    expect(streamObj).toContain("(Firmado por: Juan Pérez) Tj");
    expect(streamObj).toContain("T*\n");
    expect(streamObj).toContain("(Algoritmo: ML-DSA-65) Tj");
    expect(streamObj).toContain("ET\n");
    expect(streamObj).toContain("Q\n");
  });

  it("soporta firma con apObjNumber explícito como primer parámetro", () => {
    const streamObj = generateAppearanceStream(
      1002,
      250,
      70,
      "Firmado por: Amador\nEstado: Válido"
    );

    expect(streamObj).toContain("1002 0 obj");
    expect(streamObj).toContain("/BBox [0 0 250 70]");
    expect(streamObj).toContain("(Firmado por: Amador) Tj");
  });

  it("calcula la longitud exacta del stream en bytes (/Length)", () => {
    const streamObj = generateAppearanceStream(150, 40, "Firmado por: Test");

    const matchLength = /\/Length\s+(\d+)/.exec(streamObj);
    expect(matchLength).not.toBeNull();
    const declaredLength = parseInt(matchLength![1], 10);

    const streamBodyMatch = /stream\r?\n([\s\S]*?)\r?\nendstream/.exec(streamObj);
    expect(streamBodyMatch).not.toBeNull();
    const actualBytesLength = new TextEncoder().encode(streamBodyMatch![1]).length;

    expect(declaredLength).toBe(actualBytesLength);
  });

  it("genera operadores puros en generateAppearanceDrawingStream con opciones personalizadas", () => {
    const rawOps = generateAppearanceDrawingStream(200, 50, "Línea 1\nLínea 2", {
      drawBackground: false,
      drawBorder: true,
      drawAccentBar: false,
      fontSize: 12,
    });

    expect(rawOps).toContain("q");
    expect(rawOps).toContain("1 w");
    expect(rawOps).toContain("/F1 12.00 Tf");
    expect(rawOps).toContain("(Línea 1) Tj");
    expect(rawOps).toContain("(Línea 2) Tj");
    expect(rawOps).toContain("ET");
    expect(rawOps).toContain("Q");
  });
});
