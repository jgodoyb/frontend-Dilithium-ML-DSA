import { describe, it, expect } from "vitest";
import { findLastXrefOffset, findLastEofPosition, SCAN_WINDOW } from "../lib/PDFScanner";

describe("PDFScanner - findLastXrefOffset con SCAN_WINDOW (4096 bytes)", () => {
  it("extrae correctamente el offset con saltos de línea estándar Unix (\\n)", () => {
    const raw = `%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 >>\nstartxref\n45\n%%EOF\n`;
    const buffer = new TextEncoder().encode(raw).buffer;
    const offset = findLastXrefOffset(buffer);
    expect(offset).toBe(45);
  });

  it("extrae correctamente el offset con saltos de línea Windows (\\r\\n)", () => {
    const raw = `%PDF-1.7\r\n1 0 obj\r\n<< /Type /Catalog >>\r\nendobj\r\nxref\r\n0 1\r\n0000000000 65535 f \r\ntrailer\r\n<< /Size 1 >>\r\nstartxref\r\n512\r\n%%EOF\r\n`;
    const buffer = new TextEncoder().encode(raw).buffer;
    const offset = findLastXrefOffset(buffer);
    expect(offset).toBe(512);
  });

  it("extrae correctamente el offset en archivos pequeños (< 4096 bytes) ajustando la ventana a 0", () => {
    const raw = `%PDF-1.4\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 >>\nstartxref\n128\n%%EOF\n`;
    const buffer = new TextEncoder().encode(raw).buffer;
    expect(buffer.byteLength).toBeLessThan(SCAN_WINDOW);
    const offset = findLastXrefOffset(buffer);
    expect(offset).toBe(128);
  });

  it("procesa de forma instantánea un PDF grande (ej. 2 MB) con startxref en el tramo final de 4 KB", () => {
    const headerAndBody = new Uint8Array(2 * 1024 * 1024); // 2 MB de contenido
    headerAndBody.set(new TextEncoder().encode("%PDF-1.7\n"), 0);

    const trailer = new TextEncoder().encode("\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 >>\nstartxref\n1500000\n%%EOF\n");
    const fullFile = new Uint8Array(headerAndBody.length + trailer.length);
    fullFile.set(headerAndBody, 0);
    fullFile.set(trailer, headerAndBody.length);

    const startTime = performance.now();
    const offset = findLastXrefOffset(fullFile.buffer);
    const duration = performance.now() - startTime;

    expect(offset).toBe(1500000);
    expect(duration).toBeLessThan(15); // Debe ejecutarse en sub-milisegundos
  });

  it("lanza un error descriptivo inmediato si se le pasa un archivo plano de texto o binario sin startxref", () => {
    // Archivo de texto/binario grande de 500 KB sin startxref
    const dummyData = new Uint8Array(500 * 1024);
    dummyData.fill(0x41); // 'A' repetido

    const startTime = performance.now();
    expect(() => findLastXrefOffset(dummyData.buffer)).toThrow(
      /No se encontró una palabra clave 'startxref' válida en los últimos 4 KB/
    );
    const duration = performance.now() - startTime;

    // Comprueba que no se congela la CPU escaneando todo el archivo
    expect(duration).toBeLessThan(10);
  });

  it("ignora startxref si se encuentra fuera de la ventana de los últimos 4 KB para evitar falsos positivos", () => {
    // startxref colocado al inicio del archivo (fuera de la ventana final)
    const startSection = new TextEncoder().encode("%PDF-1.7\nstartxref\n999\n%%EOF\n");
    const trailingGarbage = new Uint8Array(8192); // 8 KB de relleno después
    trailingGarbage.fill(0x20);

    const buffer = new Uint8Array(startSection.length + trailingGarbage.length);
    buffer.set(startSection, 0);
    buffer.set(trailingGarbage, startSection.length);

    expect(() => findLastXrefOffset(buffer.buffer)).toThrow(
      /No se encontró una palabra clave 'startxref' válida en los últimos 4 KB/
    );
  });

  it("lanza TypeError ante entradas inválidas que no sean ArrayBuffer o vistas", () => {
    expect(() => findLastXrefOffset(null as any)).toThrow(TypeError);
    expect(() => findLastXrefOffset("archivo-no-binario" as any)).toThrow(TypeError);
  });
});

describe("PDFScanner - findLastEofPosition con SCAN_WINDOW", () => {
  it("encuentra la posición del último %%EOF dentro de los últimos 4 KB", () => {
    const raw = `%PDF-1.7\nstartxref\n45\n%%EOF\n`;
    const encoded = new TextEncoder().encode(raw);
    const eofPos = findLastEofPosition(encoded.buffer);
    expect(eofPos).toBe(encoded.length);
  });

  it("lanza error si %%EOF no está dentro de la ventana de 4 KB", () => {
    const raw = `%PDF-1.7\n%%EOF\n`;
    const encoded = new TextEncoder().encode(raw);
    const padding = new Uint8Array(5000); // Más de 4 KB de basura al final
    const full = new Uint8Array(encoded.length + padding.length);
    full.set(encoded, 0);
    full.set(padding, encoded.length);

    expect(() => findLastEofPosition(full.buffer)).toThrow(
      /No se encontró el marcador de fin de archivo '%%EOF' en los últimos 4 KB/
    );
  });
});
