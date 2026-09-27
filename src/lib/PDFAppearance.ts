/**
 * PDFAppearance.ts
 * 
 * Módulo para la generación de Apariencias Visuales de Firma Digital (Appearance Streams)
 * y Anotaciones de Campo de Firma (Widget Annotations) según la especificación ISO 32000.
 * 
 * Genera el código de dibujo vectorial PDF (operadores q, Q, re, f, S, BT, Tf, Tj, T*, ET)
 * para estampar sellos visuales interactivos y de alta calidad estética en documentos PDF.
 * 
 * Cero dependencias externas.
 */

/**
 * Genera el flujo crudo de dibujo vectorial PDF para la cabecera y estructura
 * visual de una Hoja de Firmas (Anexo de Firmas Digitales) según ISO 32000.
 *
 * @param pageWidth - Ancho de la página en puntos PDF (por defecto: 595.28 / A4).
 * @param pageHeight - Alto de la página en puntos PDF (por defecto: 841.89 / A4).
 * @returns Cadena con los operadores vectoriales PDF para el fondo y cabecera de la hoja.
 */
export function generateSignatureSheetDrawingStream(
  pageWidth = 595.28,
  pageHeight = 841.89
): string {
  const w = pageWidth;
  const h = pageHeight;
  const ops: string[] = [];

  ops.push("q");

  // 1. Cabecera superior institucional (Fondo azul pizarra oscuro)
  ops.push("0.08 0.14 0.22 rg");
  ops.push(`0 ${(h - 85).toFixed(2)} ${w.toFixed(2)} 85 re`);
  ops.push("f");

  // 2. Barra de acento cian bajo la cabecera
  ops.push("0.05 0.45 0.56 rg");
  ops.push(`0 ${(h - 88).toFixed(2)} ${w.toFixed(2)} 3 re`);
  ops.push("f");

  // 3. Título principal en la cabecera
  ops.push("BT");
  ops.push("/F1B 14 Tf");
  ops.push("1 1 1 rg");
  ops.push(`40 ${(h - 38).toFixed(2)} Td`);
  ops.push("(HOJA DE FIRMAS Y CERTIFICACION DIGITAL) Tj");
  ops.push("ET");

  // 4. Subtítulo en la cabecera
  ops.push("BT");
  ops.push("/F1 8.5 Tf");
  ops.push("0.85 0.92 0.98 rg");
  ops.push(`40 ${(h - 56).toFixed(2)} Td`);
  ops.push("(Criptografia Post-Cuantica NIST FIPS-204 ML-DSA-65 / ISO 32000 PAdES) Tj");
  ops.push("ET");

  // 5. Texto explicativo de certificación
  ops.push("BT");
  ops.push("/F1 7.5 Tf");
  ops.push("0.65 0.75 0.88 rg");
  ops.push(`40 ${(h - 72).toFixed(2)} Td`);
  ops.push("(Las siguientes firmas electronicas certifican la integridad del documento y la identidad de los firmantes.) Tj");
  ops.push("ET");

  // 6. Línea separadora y pie de página institucional
  ops.push("0.82 0.85 0.90 RG");
  ops.push("0.5 w");
  ops.push(`40 40 m ${(w - 40).toFixed(2)} 40 l`);
  ops.push("S");

  ops.push("BT");
  ops.push("/F1 7 Tf");
  ops.push("0.45 0.50 0.58 rg");
  ops.push("40 28 Td");
  ops.push("(Q-Proof Systems | Plataforma de Firma Electronica Cuantica | Hoja de Firmas Generada Oficialmente) Tj");
  ops.push("ET");

  ops.push("Q\n");

  return ops.join("\n");
}

/**
 * Opciones para la configuración del stream de apariencia visual (Form XObject).
 */
export interface AppearanceStreamOptions {
  /**
   * Número de objeto indirecto asignado al Form XObject (por defecto: 1000).
   */
  apObjNumber?: number;
  /**
   * Tamaño de fuente base en puntos (calculado automáticamente si no se especifica).
   */
  fontSize?: number;
  /**
   * Nombre del recurso de fuente en el diccionario /Resources (por defecto: "F1").
   */
  fontResourceName?: string;
  /**
   * Nombre de la fuente base estándar PDF (por defecto: "Helvetica").
   */
  baseFont?: string;
  /**
   * Indica si se dibuja el fondo del sello (por defecto: true).
   */
  drawBackground?: boolean;
  /**
   * Indica si se dibuja el borde perimetral del sello (por defecto: true).
   */
  drawBorder?: boolean;
  /**
   * Indica si se dibuja una barra de acento vertical en el margen izquierdo (por defecto: true).
   */
  drawAccentBar?: boolean;
  /**
   * Color primario/acento en formato RGB normalizado [0..1, 0..1, 0..1]. Por defecto: Azul [0.15, 0.45, 0.85].
   */
  primaryColor?: [number, number, number];
  /**
   * Color de fondo en formato RGB normalizado [0..1, 0..1, 0..1]. Por defecto: Azul muy claro [0.96, 0.97, 1.0].
   */
  backgroundColor?: [number, number, number];
  /**
   * Color del texto en formato RGB normalizado [0..1, 0..1, 0..1]. Por defecto: Gris oscuro [0.1, 0.1, 0.1].
   */
  textColor?: [number, number, number];
  /**
   * Color del borde en formato RGB normalizado [0..1, 0..1, 0..1]. Por defecto: Azul suave [0.2, 0.45, 0.85].
   */
  borderColor?: [number, number, number];
}

/**
 * Opciones para la generación de la anotación visual (Widget Annotation).
 */
export interface WidgetAnnotOptions {
  /**
   * Número de objeto indirecto del Form XObject de apariencia (/AP << /N X 0 R >>).
   */
  apObjNumber?: number;
  /**
   * Nombre único del campo de firma (por defecto: "FirmaAmador").
   */
  fieldName?: string;
}

/**
 * Escapa caracteres reservados en cadenas literales PDF `( ... )`
 * respetando el mapeo de caracteres Latin-1 / WinAnsiEncoding.
 */
export function escapePdfString(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/**
 * Genera el diccionario y objeto indirecto de la anotación visual (Widget Annotation)
 * según ISO 32000-1 §12.5.6.19 y §12.8.
 *
 * Estructura generada:
 * << /Type /Annot /Subtype /Widget /FT /Sig /V {sigObjNumber} 0 R /T (FirmaAmador) /Rect [{rect[0]} {rect[1]} {rect[2]} {rect[3]}] /F 132 /AP << /N {apObjNumber} 0 R >> >>
 *
 * @param annotObjNumber - Número de objeto indirecto para la anotación Widget.
 * @param sigObjNumber - Número de objeto indirecto del diccionario de firma (/Type /Sig).
 * @param rect - Coordenadas [llx, lly, urx, ury] del rectángulo de la firma en la página (puntos PDF).
 * @param apObjNumberOrOptions - Número de objeto del Form XObject de apariencia o configuración opcional.
 * @param maybeFieldName - Nombre del campo de firma si se pasa como 5º argumento.
 * @returns Cadena con el objeto indirecto completo de la anotación Widget.
 */
export function generateWidgetAnnot(
  annotObjNumber: number,
  sigObjNumber: number,
  rect: number[],
  apObjNumberOrOptions?: number | WidgetAnnotOptions,
  maybeFieldName?: string
): string {
  if (!Array.isArray(rect) || rect.length !== 4) {
    throw new TypeError("generateWidgetAnnot: 'rect' debe ser un array de 4 números [llx, lly, urx, ury].");
  }

  let apObjNumber = annotObjNumber + 1;
  let fieldName = "FirmaAmador";

  if (typeof apObjNumberOrOptions === "number") {
    apObjNumber = apObjNumberOrOptions;
    if (typeof maybeFieldName === "string") {
      fieldName = maybeFieldName;
    }
  } else if (apObjNumberOrOptions && typeof apObjNumberOrOptions === "object") {
    if (apObjNumberOrOptions.apObjNumber !== undefined) {
      apObjNumber = apObjNumberOrOptions.apObjNumber;
    }
    if (apObjNumberOrOptions.fieldName !== undefined) {
      fieldName = apObjNumberOrOptions.fieldName;
    }
  }

  const [llx, lly, urx, ury] = rect;
  const safeFieldName = escapePdfString(fieldName);

  return `${annotObjNumber} 0 obj\n<<\n  /Type /Annot\n  /Subtype /Widget\n  /FT /Sig\n  /V ${sigObjNumber} 0 R\n  /T (${safeFieldName})\n  /Rect [${llx} ${lly} ${urx} ${ury}]\n  /F 132\n  /AP <<\n    /N ${apObjNumber} 0 R\n  >>\n>>\nendobj\n`;
}

/**
 * Genera el flujo crudo de dibujo PDF (operadores gráficos vectoriales y texto)
 * para un sello institucional estructurado con cabecera, líneas y textos.
 *
 * @param width - Ancho del área de dibujo en puntos PDF.
 * @param height - Alto del área de dibujo en puntos PDF.
 * @param text - Texto a renderizar (soporta múltiples líneas con \n).
 * @param options - Opciones de personalización de estilo y colores.
 * @returns Cadena con la secuencia de operadores de dibujo PDF.
 */
export function generateAppearanceDrawingStream(
  width: number,
  height: number,
  text: string,
  options: AppearanceStreamOptions = {}
): string {
  const w = Math.max(20, width);
  const h = Math.max(20, height);

  const drawBg = options.drawBackground !== false;
  const drawBorder = options.drawBorder !== false;
  const drawAccent = options.drawAccentBar !== false;

  const fontResource = options.fontResourceName ?? "F1";
  const bg = options.backgroundColor ?? [0.97, 0.98, 1.0];
  const border = options.borderColor ?? [0.2, 0.35, 0.55];
  const accent = options.primaryColor ?? [0.1, 0.45, 0.85];
  const textCol = options.textColor ?? [0.1, 0.12, 0.18];

  const headerH = Math.min(16, h * 0.28);
  const ops: string[] = [];

  // Guardar estado gráfico
  ops.push("q");

  // 1. Dibujar fondo general si está habilitado
  if (drawBg) {
    ops.push(`${bg[0]} ${bg[1]} ${bg[2]} rg`);
    ops.push(`0 0 ${w.toFixed(2)} ${h.toFixed(2)} re`);
    ops.push("f");
  }

  // 2. Dibujar fondo de la barra de cabecera institucional
  ops.push("0.12 0.22 0.38 rg");
  ops.push(`0 ${(h - headerH).toFixed(2)} ${w.toFixed(2)} ${headerH.toFixed(2)} re`);
  ops.push("f");

  // 3. Dibujar barra de acento vertical en el margen izquierdo
  if (drawAccent) {
    ops.push(`${accent[0]} ${accent[1]} ${accent[2]} rg`);
    ops.push(`0 0 3.5 ${h.toFixed(2)} re`);
    ops.push("f");
  }

  // 4. Dibujar borde exterior perimetral (operador re y S)
  if (drawBorder) {
    ops.push(`${border[0]} ${border[1]} ${border[2]} RG`);
    ops.push("1 w");
    ops.push(`0.5 0.5 ${(w - 1).toFixed(2)} ${(h - 1).toFixed(2)} re`);
    ops.push("S");
  }

  // 5. Dibujar línea horizontal separadora bajo la cabecera (operadores m, l, S)
  ops.push(`${border[0]} ${border[1]} ${border[2]} RG`);
  ops.push("0.75 w");
  ops.push(`0 ${(h - headerH).toFixed(2)} m ${w.toFixed(2)} ${(h - headerH).toFixed(2)} l`);
  ops.push("S");

  // 6. Renderizar texto de cabecera institucional (color blanco)
  ops.push("BT");
  ops.push(`/${fontResource} 6.5 Tf`);
  ops.push("1 1 1 rg");
  ops.push(`8.00 ${(h - headerH + 4.5).toFixed(2)} Td`);
  ops.push("(SELLO DE CERTIFICACION DIGITAL | NIST FIPS-204 ML-DSA) Tj");
  ops.push("ET");

  // 7. Renderizar cuerpo del texto estructurado ("Firmado por", "Fecha", "Algoritmo")
  const rawLines = text.split(/\r\n|\n|\r/);
  const lines = rawLines.filter((l) => l.trim().length > 0);

  if (lines.length > 0) {
    const bodyH = h - headerH;
    const calculatedFontSize = Math.min(
      8,
      Math.max(6, Math.floor((bodyH - 6) / (lines.length * 1.3)))
    );
    const fontSize = options.fontSize ?? calculatedFontSize;
    const leading = fontSize * 1.3;
    const startY = h - headerH - fontSize - 3.5;

    ops.push("BT");
    ops.push(`/${fontResource} ${fontSize.toFixed(2)} Tf`);
    ops.push(`${textCol[0]} ${textCol[1]} ${textCol[2]} rg`);
    ops.push(`10.00 ${startY.toFixed(2)} Td`);
    ops.push(`${leading.toFixed(2)} TL`);

    for (let i = 0; i < lines.length; i++) {
      const lineStr = escapePdfString(lines[i]);
      if (i === 0) {
        ops.push(`(${lineStr}) Tj`);
      } else {
        ops.push("T*");
        ops.push(`(${lineStr}) Tj`);
      }
    }

    ops.push("ET");
  }

  // Restaurar estado gráfico
  ops.push("Q\n");

  return ops.join("\n");
}

/**
 * Genera un objeto Form XObject (/Type /XObject /Subtype /Form) completo que contiene
 * un stream de dibujo y texto básico usando operadores PDF crudos (BT, Tf, Tj, ET).
 * 
 * Soporta firmas tanto con 3 argumentos (width, height, text) como con 4 argumentos
 * (apObjNumber, width, height, text).
 *
 * @param arg1 - Ancho en puntos PDF O número de objeto indirecto del Form XObject.
 * @param arg2 - Alto en puntos PDF O ancho en puntos PDF.
 * @param arg3 - Texto a renderizar O alto en puntos PDF.
 * @param arg4 - Opciones de configuración O texto a renderizar.
 * @param arg5 - Opciones de configuración si se usó la firma de 4 argumentos principales.
 * @returns Cadena con la definición completa del objeto Form XObject indirecto.
 */
export function generateAppearanceStream(
  arg1: number,
  arg2: number,
  arg3: string | number,
  arg4?: AppearanceStreamOptions | string,
  arg5?: AppearanceStreamOptions
): string {
  let apObjNumber = 1000;
  let width = 200;
  let height = 50;
  let text = "";
  let options: AppearanceStreamOptions = {};

  if (typeof arg3 === "number") {
    // Firma: generateAppearanceStream(apObjNumber, width, height, text, options)
    apObjNumber = arg1;
    width = arg2;
    height = arg3;
    text = typeof arg4 === "string" ? arg4 : "";
    options = arg5 ?? {};
  } else {
    // Firma: generateAppearanceStream(width, height, text, options)
    width = arg1;
    height = arg2;
    text = typeof arg3 === "string" ? arg3 : "";
    options = (typeof arg4 === "object" ? arg4 : {}) ?? {};
    if (options.apObjNumber !== undefined) {
      apObjNumber = options.apObjNumber;
    }
  }

  const baseFont = options.baseFont ?? "Helvetica";
  const fontResource = options.fontResourceName ?? "F1";

  // Generar el contenido crudo del stream de dibujo
  const streamContent = generateAppearanceDrawingStream(width, height, text, options);
  const encoder = new TextEncoder();
  const streamBytes = encoder.encode(streamContent);

  return `${apObjNumber} 0 obj\n<<\n  /Type /XObject\n  /Subtype /Form\n  /FormType 1\n  /BBox [0 0 ${width} ${height}]\n  /Matrix [1 0 0 1 0 0]\n  /Resources <<\n    /Font <<\n      /${fontResource} <<\n        /Type /Font\n        /Subtype /Type1\n        /BaseFont /${baseFont}\n        /Encoding /WinAnsiEncoding\n      >>\n    >>\n    /ProcSet [/PDF /Text]\n  >>\n  /Length ${streamBytes.length}\n>>\nstream\n${streamContent}\nendstream\nendobj\n`;
}
