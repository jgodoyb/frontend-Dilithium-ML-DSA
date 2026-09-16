// Algorithm detail data extracted from NIST FIPS 204 (ML-DSA Standard)

export interface AlgorithmDetail {
  id: string;
  fipsNumber: string;
  summary: string;
  inputs: { name: string; description: string }[];
  outputs: { name: string; description: string }[];
  pseudocode: string;
  parameters: string[]; // parameter keys that link to tooltips
}

// Parameter tooltip definitions
export const parameterTooltips: Record<string, { symbol: string; description: string; values: string }> = {
  q: {
    symbol: "q",
    description: "El primo del módulo del anillo",
    values: "q = 2²³ − 2¹³ + 1 = 8380417",
  },
  k: {
    symbol: "k",
    description: "Número de filas de la matriz A. Determina la dimensión del problema MLWE.",
    values: "ML-DSA-44: 4 | ML-DSA-65: 6 | ML-DSA-87: 8",
  },
  l: {
    symbol: "ℓ",
    description: "Número de columnas de la matriz A. Junto con k, define la complejidad del sistema.",
    values: "ML-DSA-44: 4 | ML-DSA-65: 5 | ML-DSA-87: 7",
  },
  eta: {
    symbol: "η",
    description: "Rango de los coeficientes de la clave privada (s₁, s₂). Coeficientes en [−η, η].",
    values: "ML-DSA-44: 2 | ML-DSA-65: 4 | ML-DSA-87: 2",
  },
  tau: {
    symbol: "τ",
    description: "Número de coeficientes no nulos (±1) en el polinomio de desafío c.",
    values: "ML-DSA-44: 39 | ML-DSA-65: 49 | ML-DSA-87: 60",
  },
  gamma1: {
    symbol: "γ₁",
    description: "Rango de los coeficientes de la máscara y. Coeficientes en [−γ₁+1, γ₁].",
    values: "ML-DSA-44: 2¹⁷ | ML-DSA-65: 2¹⁹ | ML-DSA-87: 2¹⁹",
  },
  gamma2: {
    symbol: "γ₂",
    description: "Factor de escala para los bits bajos. Define el rango de redondeo bajo.",
    values: "ML-DSA-44: (q−1)/88 | ML-DSA-65: (q−1)/32 | ML-DSA-87: (q−1)/32",
  },
  omega: {
    symbol: "ω",
    description: "Número máximo de 1s permitidos en el vector de hint h.",
    values: "ML-DSA-44: 80 | ML-DSA-65: 55 | ML-DSA-87: 75",
  },
  d: {
    symbol: "d",
    description: "Número de bits descartados de t para la compresión de la clave pública.",
    values: "d = 13 (igual para los tres niveles)",
  },
  beta: {
    symbol: "β",
    description: "Producto β = τ·η. Umbral de rechazo para la norma infinita de z.",
    values: "ML-DSA-44: 78 | ML-DSA-65: 196 | ML-DSA-87: 120",
  },
  lambda: {
    symbol: "λ",
    description: "Fuerza de colisión del hash de compromiso c̃.",
    values: "ML-DSA-44: 128 | ML-DSA-65: 192 | ML-DSA-87: 256",
  },
};

export const algorithmDetails: Record<string, AlgorithmDetail> = {
  // ─── Level 0: Bit/Byte Conversion ─────────────────────────────
  itb: {
    id: "itb",
    fipsNumber: "Alg 9",
    summary:
      "Convierte un entero no negativo x en su representación binaria de α bits en orden little-endian. Es la primitiva fundamental para traducir datos numéricos a cadenas de bits manipulables por el resto del sistema.",
    inputs: [
      { name: "x", description: "Entero no negativo" },
      { name: "\\alpha", description: "Número de bits de salida" },
    ],
    outputs: [{ name: "y", description: "Cadena de bits de longitud α" }],
    pseudocode: `function IntegerToBits(x, α):
    x' ← x
    for i from 0 to α − 1 do
        y[i] ← x' mod 2
        x' ← ⌊x' / 2⌋
    end for
    return y`,
    parameters: [],
  },

  bti: {
    id: "bti",
    fipsNumber: "Alg 10",
    summary:
      "Operación inversa de IntegerToBits: reconstruye un entero a partir de su representación en bits little-endian. Esencial para decodificar coeficientes polinómicos desde su forma empaquetada.",
    inputs: [
      { name: "y", description: "Cadena de bits de longitud α" },
      { name: "\\alpha", description: "Longitud de la cadena de bits" },
    ],
    outputs: [{ name: "x", description: "Entero no negativo" }],
    pseudocode: `function BitsToInteger(y, α):
    x ← 0
    for i from 1 to α do
        x ← 2·x + y[α − i]
    end for
    return x`,
    parameters: [],
  },

  ity: {
    id: "ity",
    fipsNumber: "Alg 11",
    summary:
      "Convierte un entero x en una cadena de bytes de longitud α usando orden little-endian (base 256). Utilizado para serializar semillas, contadores y otros valores numéricos en el formato de byte string del estándar.",
    inputs: [
      { name: "x", description: "Entero no negativo" },
      { name: "\\alpha", description: "Número de bytes de salida" },
    ],
    outputs: [{ name: "y", description: "Cadena de bytes de longitud α" }],
    pseudocode: `function IntegerToBytes(x, α):
    x' ← x
    for i from 0 to α − 1 do
        y[i] ← x' mod 256
        x' ← ⌊x' / 256⌋
    end for
    return y`,
    parameters: [],
  },

  bty: {
    id: "bty",
    fipsNumber: "Alg 12",
    summary:
      "Convierte una cadena de bits en una cadena de bytes agrupando cada 8 bits consecutivos en un byte en orden little-endian. Es la operación complementaria a BytesToBits y se usa al final de las rutinas de empaquetado.",
    inputs: [{ name: "y", description: "Cadena de bits de longitud 8α" }],
    outputs: [{ name: "z", description: "Cadena de bytes de longitud α" }],
    pseudocode: `function BitsToBytes(y):
    for i from 0 to α − 1 do
        z[i] ← 0
        for j from 0 to 7 do
            z[i] ← z[i] + y[8i + j] · 2^j
        end for
    end for
    return z`,
    parameters: [],
  },

  yti: {
    id: "yti",
    fipsNumber: "Alg 13",
    summary:
      "Convierte una cadena de bytes en su representación en bits usando orden little-endian. Cada byte se expande a 8 bits. Usado internamente por las funciones de hashing (SHAKE) cuando se necesita operar a nivel de bit.",
    inputs: [{ name: "z", description: "Cadena de bytes de longitud α" }],
    outputs: [{ name: "y", description: "Cadena de bits de longitud 8α" }],
    pseudocode: `function BytesToBits(z):
    z' ← z
    for i from 0 to α − 1 do
        for j from 0 to 7 do
            y[8i + j] ← z'[i] mod 2
            z'[i] ← ⌊z'[i] / 2⌋
        end for
    end for
    return y`,
    parameters: [],
  },

  // ─── Level 1: Coeff Sampling ──────────────────────────────────
  c3b: {
    id: "c3b",
    fipsNumber: "Alg 14",
    summary:
      "Genera un coeficiente del anillo Zq a partir de 3 bytes mediante rejection sampling. Si el valor resultante es ≥ q, devuelve ⊥ y se descarta. Es el bloque básico de RejNTTPoly para muestrear la matriz A.",
    inputs: [
      { name: "b_0, b_1, b_2", description: "Tres bytes de entrada" },
    ],
    outputs: [{ name: "z", description: "Entero en [0, q−1] o ⊥" }],
    pseudocode: `function CoeffFromThreeBytes(b₀, b₁, b₂):
    b' ← b₂
    if b₂ > 127 then
        b' ← b' − 128          ▷ clear top bit
    end if
    z ← 2¹⁶·b' + 2⁸·b₁ + b₀   ▷ 0 ≤ z ≤ 2²³ − 1
    if z < q then return z       ▷ rejection sampling
    else return ⊥
    end if`,
    parameters: ["q"],
  },

  chb: {
    id: "chb",
    fipsNumber: "Alg 15",
    summary:
      "Genera un coeficiente en el rango [−η, η] a partir de un nibble (4 bits) mediante rejection sampling. Usado por RejBoundedPoly para muestrear los vectores secretos s₁ y s₂.",
    inputs: [{ name: "b", description: "Entero en {0, 1, …, 15}" }],
    outputs: [{ name: "coeff", description: "Entero en [−η, η] o ⊥" }],
    pseudocode: `function CoeffFromHalfByte(b):
    if η = 2 and b < 15 then
        return 2 − (b mod 5)     ▷ sampling from {−2,…,2}
    else if η = 4 and b < 9 then
        return 4 − b             ▷ sampling from {−4,…,4}
    else
        return ⊥
    end if`,
    parameters: ["eta"],
  },

  // ─── Level 2: Packing ─────────────────────────────────────────
  sbp: {
    id: "sbp",
    fipsNumber: "Alg 16",
    summary:
      "Empaqueta un polinomio w ∈ R cuyos coeficientes están en [0, b] en una cadena de bytes compacta. Se usa para codificar t₁ en la clave pública y w₁ en el compromiso del firmante.",
    inputs: [
      { name: "w", description: "Polinomio con coeficientes en [0, b]" },
      { name: "b", description: "Cota superior de los coeficientes" },
    ],
    outputs: [{ name: "bytes", description: "Cadena de bytes de longitud 32·bitlen(b)" }],
    pseudocode: `function SimpleBitPack(w, b):
    z ← ()                         ▷ empty bit string
    for i from 0 to 255 do
        z ← z ∥ IntegerToBits(wᵢ, bitlen(b))
    end for
    return BitsToBytes(z)`,
    parameters: [],
  },

  bp: {
    id: "bp",
    fipsNumber: "Alg 17",
    summary:
      "Empaqueta un polinomio w ∈ R con coeficientes en [−a, b] en una cadena de bytes. Generaliza SimpleBitPack para rangos con signo. Se usa para codificar s₁, s₂ (con η) y z (con γ₁) en las firmas.",
    inputs: [
      { name: "w", description: "Polinomio con coeficientes en [−a, b]" },
      { name: "a, b", description: "Cotas del rango de coeficientes" },
    ],
    outputs: [{ name: "bytes", description: "Cadena de bytes de longitud 32·bitlen(a+b)" }],
    pseudocode: `function BitPack(w, a, b):
    z ← ()                         ▷ empty bit string
    for i from 0 to 255 do
        z ← z ∥ IntegerToBits(b − wᵢ, bitlen(a + b))
    end for
    return BitsToBytes(z)`,
    parameters: ["eta", "gamma1"],
  },

  sbu: {
    id: "sbu",
    fipsNumber: "Alg 18",
    summary:
      "Invierte SimpleBitPack: decodifica una cadena de bytes en un polinomio con coeficientes en [0, 2^c − 1]. Usado por pkDecode para recuperar t₁ de la clave pública.",
    inputs: [
      { name: "v", description: "Cadena de bytes de longitud 32·bitlen(b)" },
      { name: "b", description: "Cota superior original" },
    ],
    outputs: [{ name: "w", description: "Polinomio con coeficientes en [0, 2^c − 1]" }],
    pseudocode: `function SimpleBitUnpack(v, b):
    c ← bitlen(b)
    z ← BytesToBits(v)
    for i from 0 to 255 do
        wᵢ ← BitsToInteger(z[ic..ic+c−1], c)
    end for
    return w`,
    parameters: [],
  },

  bu: {
    id: "bu",
    fipsNumber: "Alg 19",
    summary:
      "Invierte BitPack: decodifica una cadena de bytes en un polinomio con coeficientes con signo en [b − 2^c + 1, b]. Usado por skDecode y sigDecode para recuperar s₁, s₂, t₀ y z.",
    inputs: [
      { name: "v", description: "Cadena de bytes de longitud 32·bitlen(a+b)" },
      { name: "a, b", description: "Cotas originales del rango" },
    ],
    outputs: [{ name: "w", description: "Polinomio con coeficientes con signo" }],
    pseudocode: `function BitUnpack(v, a, b):
    c ← bitlen(a + b)
    z ← BytesToBits(v)
    for i from 0 to 255 do
        wᵢ ← b − BitsToInteger(z[ic..ic+c−1], c)
    end for
    return w`,
    parameters: ["eta", "gamma1", "d"],
  },

  hbp: {
    id: "hbp",
    fipsNumber: "Alg 20",
    summary:
      "Empaqueta el vector de hints h ∈ {0,1}^(k×256) en una cadena de bytes compacta de tamaño ω + k. Los hints indican las posiciones donde HighBits cambia al sumar la perturbación, permitiendo al verificador reconstruir w₁.",
    inputs: [{ name: "h", description: "Vector de hints h ∈ {0,1}^(k×256)" }],
    outputs: [{ name: "y", description: "Cadena de bytes de longitud ω + k" }],
    pseudocode: `function HintBitPack(h):
    y ← 0^(ω+k)                    ▷ ω+k zero bytes
    idx ← 0
    for i from 0 to k−1 do
        for j from 0 to 255 do
            if h[i][j] ≠ 0 then
                y[idx] ← j
                idx ← idx + 1
            end if
        end for
        y[ω + i] ← idx
    end for
    return y`,
    parameters: ["omega", "k"],
  },

  hbu: {
    id: "hbu",
    fipsNumber: "Alg 21",
    summary:
      "Desempaqueta una cadena de bytes en el vector de hints h. Verifica la integridad del formato: si los índices no son estrictamente crecientes o el conteo excede ω, devuelve ⊥ (firma inválida).",
    inputs: [{ name: "y", description: "Cadena de bytes de longitud ω + k" }],
    outputs: [{ name: "h", description: "Vector de hints o ⊥ si malformado" }],
    pseudocode: `function HintBitUnpack(y):
    idx ← 0
    for i from 0 to k−1 do
        if y[ω+i] < idx or y[ω+i] > ω then
            return ⊥
        end if
        first ← idx
        while idx < y[ω+i] do
            if idx > first then
                if y[idx−1] ≥ y[idx] then return ⊥
                end if
            end if
            h[i][y[idx]] ← 1
            idx ← idx + 1
        end while
    end for
    return h`,
    parameters: ["omega", "k"],
  },

  // ─── Level 3: NTT Engine ──────────────────────────────────────
  ntt: {
    id: "ntt",
    fipsNumber: "Alg 41",
    summary:
      "Aplica la Transformada Teórica de Números (NTT) a un polinomio, convirtiéndolo al dominio de frecuencias. Esto permite realizar multiplicaciones de polinomios en O(n log n) en lugar de O(n²), siendo crucial para la eficiencia de ML-DSA.",
    inputs: [{ name: "w", description: "Polinomio w ∈ R con 256 coeficientes" }],
    outputs: [{ name: "\\hat{w}", description: "Polinomio en representación NTT ∈ Tq" }],
    pseudocode: `function NTT(w):
    ŵ ← w
    k ← 1
    for len from 128 downto 1 (halving) do
        for start from 0 to 255 step 2·len do
            ζ ← ζ^BitRev8(k) mod q
            k ← k + 1
            for j from start to start+len−1 do
                t ← ζ · ŵ[j + len]
                ŵ[j + len] ← ŵ[j] − t
                ŵ[j] ← ŵ[j] + t
            end for
        end for
    end for
    return ŵ`,
    parameters: ["q"],
  },

  intt: {
    id: "intt",
    fipsNumber: "Alg 42",
    summary:
      "Aplica la Transformada Inversa (NTT⁻¹) para convertir un polinomio del dominio NTT de vuelta al dominio estándar. Necesario después de multiplicar polinomios en el dominio NTT para obtener el resultado en la representación original.",
    inputs: [{ name: "\\hat{w}", description: "Polinomio en representación NTT ∈ Tq" }],
    outputs: [{ name: "w", description: "Polinomio w ∈ R con 256 coeficientes" }],
    pseudocode: `function NTT⁻¹(ŵ):
    w ← ŵ
    k ← 255
    for len from 1 to 128 (doubling) do
        for start from 0 to 255 step 2·len do
            ζ ← −ζ^BitRev8(k) mod q
            k ← k − 1
            for j from start to start+len−1 do
                t ← w[j]
                w[j] ← t + w[j + len]
                w[j + len] ← ζ · (t − w[j + len])
            end for
        end for
    end for
    w ← w · 256⁻¹ mod q    ▷ scale by n⁻¹
    return w`,
    parameters: ["q"],
  },

  br8: {
    id: "br8",
    fipsNumber: "Alg 43",
    summary:
      "Invierte el orden de los 8 bits de un entero de 8 bits. Es una función auxiliar usada por NTT y NTT⁻¹ para calcular las raíces primitivas de la unidad (twiddle factors) en el orden bit-reversal requerido por la estructura butterfly.",
    inputs: [{ name: "m", description: "Entero de 8 bits, m ∈ {0, …, 255}" }],
    outputs: [{ name: "r", description: "Entero con bits invertidos" }],
    pseudocode: `function BitRev8(m):
    r ← 0
    for i from 0 to 7 do
        r ← 2·r + (m mod 2)
        m ← ⌊m / 2⌋
    end for
    return r`,
    parameters: [],
  },

  // ─── Level 4: Vector Arithmetic ───────────────────────────────
  addntt: {
    id: "addntt",
    fipsNumber: "Alg 44",
    summary:
      "Suma coeficiente a coeficiente de dos polinomios en representación NTT. Cada par de coeficientes se suma módulo q. Es la operación más básica sobre polinomios en el dominio NTT.",
    inputs: [
      { name: "\\hat{a}", description: "Polinomio en NTT" },
      { name: "\\hat{b}", description: "Polinomio en NTT" },
    ],
    outputs: [{ name: "\\hat{c}", description: "Polinomio suma â + b̂ en NTT" }],
    pseudocode: `function AddNTT(â, b̂):
    for i from 0 to 255 do
        ĉ[i] ← (â[i] + b̂[i]) mod q
    end for
    return ĉ`,
    parameters: ["q"],
  },

  mulntt: {
    id: "mulntt",
    fipsNumber: "Alg 45",
    summary:
      "Multiplicación pointwise (coeficiente a coeficiente) de dos polinomios en representación NTT. Cada par de coeficientes se multiplica módulo q. En el dominio NTT, esta operación equivale a la multiplicación polinómica en el dominio estándar.",
    inputs: [
      { name: "\\hat{a}", description: "Polinomio en NTT" },
      { name: "\\hat{b}", description: "Polinomio en NTT" },
    ],
    outputs: [{ name: "\\hat{c}", description: "Producto pointwise â ∘ b̂ en NTT" }],
    pseudocode: `function MultiplyNTT(â, b̂):
    for i from 0 to 255 do
        ĉ[i] ← (â[i] · b̂[i]) mod q
    end for
    return ĉ`,
    parameters: ["q"],
  },

  addv: {
    id: "addv",
    fipsNumber: "Alg 46",
    summary:
      "Suma componente a componente de dos vectores de polinomios en representación NTT. Operación básica usada en el cómputo de t = As₁ + s₂ durante la generación de claves.",
    inputs: [
      { name: "\\hat{v}", description: "Vector de polinomios en NTT" },
      { name: "\\hat{w}", description: "Vector de polinomios en NTT" },
    ],
    outputs: [{ name: "\\hat{u}", description: "Vector suma v̂ + ŵ en NTT" }],
    pseudocode: `function AddVectorNTT(v̂, ŵ):
    for i from 0 to k−1 do
        û[i] ← AddNTT(v̂[i], ŵ[i])
    end for
    return û`,
    parameters: ["k", "q"],
  },

  smul: {
    id: "smul",
    fipsNumber: "Alg 47",
    summary:
      "Multiplica un escalar (polinomio) ĉ por cada componente de un vector v̂, todo en dominio NTT. Usado para calcular c·s₁ y c·s₂ durante la firma, donde c es el desafío del verificador.",
    inputs: [
      { name: "\\hat{c}", description: "Polinomio escalar en NTT" },
      { name: "\\hat{v}", description: "Vector de polinomios en NTT" },
    ],
    outputs: [{ name: "\\hat{w}", description: "Vector ĉ ∘ v̂ en NTT" }],
    pseudocode: `function ScalarVectorNTT(ĉ, v̂):
    for i from 0 to ℓ−1 do
        ŵ[i] ← MultiplyNTT(ĉ, v̂[i])
    end for
    return ŵ`,
    parameters: ["l"],
  },

  mvn: {
    id: "mvn",
    fipsNumber: "Alg 48",
    summary:
      "Multiplica la matriz Â (k×ℓ) por un vector v̂ (ℓ×1), todo en representación NTT. Es la operación central de ML-DSA: calcula Ay en la firma y Az − ct₁·2^d en la verificación.",
    inputs: [
      { name: "\\hat{M}", description: "Matriz k×ℓ de polinomios en NTT" },
      { name: "\\hat{v}", description: "Vector de ℓ polinomios en NTT" },
    ],
    outputs: [{ name: "\\hat{w}", description: "Vector de k polinomios en NTT" }],
    pseudocode: `function MatrixVectorNTT(M̂, v̂):
    for i from 0 to k−1 do
        ŵ[i] ← 0
        for j from 0 to ℓ−1 do
            ŵ[i] ← AddNTT(ŵ[i], MultiplyNTT(M̂[i,j], v̂[j]))
        end for
    end for
    return ŵ`,
    parameters: ["k", "l"],
  },

  // ─── Level 5: Expansion & Sampling ────────────────────────────
  rejntt: {
    id: "rejntt",
    fipsNumber: "Alg 30",
    summary:
      "Muestrea un polinomio completo en representación NTT usando rejection sampling con SHAKE-128 y CoeffFromThreeBytes. Genera flujos de 3 bytes, extrae coeficientes válidos (< q) y descarta el resto hasta llenar los 256 coeficientes.",
    inputs: [{ name: "\\rho'", description: "Semilla extendida ρ' (34 bytes)" }],
    outputs: [{ name: "\\hat{a}", description: "Polinomio en NTT con coeficientes en [0, q−1]" }],
    pseudocode: `function RejNTTPoly(ρ'):
    j ← 0
    c ← 0
    ctx ← G.Init()                  ▷ SHAKE-128
    ctx ← G.Absorb(ctx, ρ')
    while j < 256 do
        (ctx, s) ← G.Squeeze(ctx, 3)
        coeff ← CoeffFromThreeBytes(s[0], s[1], s[2])
        if coeff ≠ ⊥ then
            â[j] ← coeff
            j ← j + 1
        end if
        c ← c + 1
    end while
    return â`,
    parameters: ["q"],
  },

  rejbnd: {
    id: "rejbnd",
    fipsNumber: "Alg 31",
    summary:
      "Muestrea un polinomio con coeficientes en [−η, η] usando rejection sampling con SHAKE-256 y CoeffFromHalfByte. Cada byte proporciona dos nibbles, cada uno potencialmente un coeficiente válido.",
    inputs: [{ name: "\\rho'", description: "Semilla extendida ρ' (66 bytes)" }],
    outputs: [{ name: "a", description: "Polinomio con coeficientes en [−η, η]" }],
    pseudocode: `function RejBoundedPoly(ρ'):
    j ← 0
    ctx ← H.Init()                  ▷ SHAKE-256
    ctx ← H.Absorb(ctx, ρ')
    while j < 256 do
        (ctx, s) ← H.Squeeze(ctx, 1)
        z₀ ← CoeffFromHalfByte(s[0] mod 16)
        z₁ ← CoeffFromHalfByte(⌊s[0] / 16⌋)
        if z₀ ≠ ⊥ then a[j] ← z₀; j ← j+1
        if z₁ ≠ ⊥ and j < 256 then a[j] ← z₁; j ← j+1
    end while
    return a`,
    parameters: ["eta"],
  },

  expa: {
    id: "expa",
    fipsNumber: "Alg 32",
    summary:
      "Expande una semilla pública ρ en la matriz A ∈ Tq^(k×ℓ) usando RejNTTPoly (que internamente usa SHAKE-128). A es la parte pública del problema MLWE que fundamenta la seguridad de ML-DSA.",
    inputs: [{ name: "\\rho", description: "Semilla pública ρ ∈ B³²" }],
    outputs: [{ name: "\\hat{A}", description: "Matriz k×ℓ en representación NTT" }],
    pseudocode: `function ExpandA(ρ):
    for r from 0 to k−1 do
        for s from 0 to ℓ−1 do
            ρ' ← ρ ∥ IntegerToBytes(s,1) ∥ IntegerToBytes(r,1)
            Â[r,s] ← RejNTTPoly(ρ')
        end for
    end for
    return Â`,
    parameters: ["k", "l", "q"],
  },

  exps: {
    id: "exps",
    fipsNumber: "Alg 33",
    summary:
      "Expande una semilla privada ρ' en los vectores secretos s₁ ∈ Rℓ y s₂ ∈ Rk, cuyos coeficientes están en [−η, η]. Estos vectores son la clave privada del esquema.",
    inputs: [{ name: "\\rho'", description: "Semilla privada ρ' ∈ B⁶⁴" }],
    outputs: [
      { name: "s_1", description: "Vector secreto s₁ ∈ Rℓ" },
      { name: "s_2", description: "Vector secreto s₂ ∈ Rk" },
    ],
    pseudocode: `function ExpandS(ρ'):
    for r from 0 to ℓ−1 do
        s₁[r] ← RejBoundedPoly(ρ' ∥ IntegerToBytes(r, 2))
    end for
    for r from 0 to k−1 do
        s₂[r] ← RejBoundedPoly(ρ' ∥ IntegerToBytes(r+ℓ, 2))
    end for
    return (s₁, s₂)`,
    parameters: ["k", "l", "eta"],
  },

  // ─── Level 6: Advanced Sampling ───────────────────────────────
  sib: {
    id: "sib",
    fipsNumber: "Alg 29",
    summary:
      "Muestrea un polinomio c ∈ R con exactamente τ coeficientes no nulos (±1) y el resto cero, usando el algoritmo de Fisher-Yates con SHAKE-256. Este polinomio c es el 'desafío' criptográfico del verificador.",
    inputs: [{ name: "\\rho", description: "Semilla ρ ∈ B^(λ/4) (hash del compromiso)" }],
    outputs: [{ name: "c", description: "Polinomio disperso con τ coeficientes ±1" }],
    pseudocode: `function SampleInBall(ρ):
    c ← 0
    ctx ← H.Init()
    ctx ← H.Absorb(ctx, ρ)
    (ctx, s) ← H.Squeeze(ctx, 8)
    h ← BytesToBits(s)       ▷ 64 sign bits
    for i from 256−τ to 255 do
        (ctx, j) ← H.Squeeze(ctx, 1)
        while j > i do        ▷ rejection in {0,…,i}
            (ctx, j) ← H.Squeeze(ctx, 1)
        end while
        cᵢ ← cⱼ
        cⱼ ← (−1)^h[i+τ−256]
    end for
    return c`,
    parameters: ["tau", "lambda"],
  },

  expm: {
    id: "expm",
    fipsNumber: "Alg 34",
    summary:
      "Expande una semilla ρ'' y un contador μ en un vector de máscara y ∈ Rℓ con coeficientes en [−γ₁+1, γ₁]. La máscara y oculta la clave privada durante la firma y se regenera en cada intento del bucle de rechazo.",
    inputs: [
      { name: "\\rho''", description: "Semilla privada ρ'' ∈ B⁶⁴" },
      { name: "\\mu", description: "Contador entero no negativo" },
    ],
    outputs: [{ name: "y", description: "Vector máscara y ∈ Rℓ" }],
    pseudocode: `function ExpandMask(ρ'', μ):
    c ← 1 + bitlen(γ₁ − 1)
    for r from 0 to ℓ−1 do
        ρ' ← ρ'' ∥ IntegerToBytes(μ + r, 2)
        v ← H(ρ', 32c)
        y[r] ← BitUnpack(v, γ₁−1, γ₁)
    end for
    return y`,
    parameters: ["gamma1", "l"],
  },

  // ─── Level 7: Decomposition ───────────────────────────────────
  p2r: {
    id: "p2r",
    fipsNumber: "Alg 35",
    summary:
      "Descompone r ∈ Zq en bits altos (r₁) y bajos (r₀) tal que r ≡ r₁·2^d + r₀ mod q. Se usa en KeyGen para separar t en t₁ (clave pública comprimida) y t₀ (almacenado en la clave secreta).",
    inputs: [{ name: "r", description: "Entero r ∈ ℤq" }],
    outputs: [
      { name: "r_1", description: "Bits altos: (r mod q − r₀) / 2^d" },
      { name: "r_0", description: "Bits bajos: r mod q mod±2^d" },
    ],
    pseudocode: `function Power2Round(r):
    r⁺ ← r mod q
    r₀ ← r⁺ mod± 2^d
    return ((r⁺ − r₀) / 2^d, r₀)`,
    parameters: ["q", "d"],
  },

  dec: {
    id: "dec",
    fipsNumber: "Alg 36",
    summary:
      "Descompone r ∈ Zq en bits altos y bajos usando el factor 2γ₂ en lugar de 2^d. A diferencia de Power2Round, maneja correctamente el caso borde r⁺ − r₀ = q − 1, evitando saltos grandes en r₁ por errores de redondeo.",
    inputs: [{ name: "r", description: "Entero r ∈ ℤq" }],
    outputs: [
      { name: "r_1", description: "Componente alto" },
      { name: "r_0", description: "Componente bajo, r₀ ∈ [−γ₂, γ₂]" },
    ],
    pseudocode: `function Decompose(r):
    r⁺ ← r mod q
    r₀ ← r⁺ mod± (2γ₂)
    if r⁺ − r₀ = q − 1 then
        r₁ ← 0
        r₀ ← r₀ − 1
    else
        r₁ ← (r⁺ − r₀) / (2γ₂)
    end if
    return (r₁, r₀)`,
    parameters: ["q", "gamma2"],
  },

  // ─── Level 8: Hints & Bits ────────────────────────────────────
  hb: {
    id: "hb",
    fipsNumber: "Alg 37",
    summary:
      "Devuelve solo la componente alta r₁ de Decompose(r). El firmante usa HighBits para calcular w₁ = HighBits(w), que es el compromiso que se hashea para producir el desafío c̃.",
    inputs: [{ name: "r", description: "Entero r ∈ ℤq" }],
    outputs: [{ name: "r_1", description: "Componente alta de Decompose(r)" }],
    pseudocode: `function HighBits(r):
    (r₁, r₀) ← Decompose(r)
    return r₁`,
    parameters: ["gamma2"],
  },

  lb: {
    id: "lb",
    fipsNumber: "Alg 38",
    summary:
      "Devuelve solo la componente baja r₀ de Decompose(r). Se usa durante la firma para verificar que ||r₀||∞ < γ₂ − β, condición necesaria para que la firma sea válida (rejection sampling).",
    inputs: [{ name: "r", description: "Entero r ∈ ℤq" }],
    outputs: [{ name: "r_0", description: "Componente baja de Decompose(r)" }],
    pseudocode: `function LowBits(r):
    (r₁, r₀) ← Decompose(r)
    return r₀`,
    parameters: ["gamma2", "beta"],
  },

  mkh: {
    id: "mkh",
    fipsNumber: "Alg 39",
    summary:
      "Genera el 'hint' h que indica si añadir z a r cambia los bits altos (HighBits). El firmante incluye h en la firma para que el verificador pueda reconstruir w₁ sin conocer los bits bajos exactos.",
    inputs: [
      { name: "z", description: "Entero z ∈ ℤq" },
      { name: "r", description: "Entero r ∈ ℤq" },
    ],
    outputs: [{ name: "h", description: "Booleano: 1 si HighBits(r) ≠ HighBits(r + z)" }],
    pseudocode: `function MakeHint(z, r):
    r₁ ← HighBits(r)
    v₁ ← HighBits(r + z)
    if r₁ ≠ v₁ then return 1
    else return 0
    end if`,
    parameters: ["omega", "gamma2"],
  },

  ush: {
    id: "ush",
    fipsNumber: "Alg 40",
    summary:
      "Usa el hint h para ajustar el resultado de Decompose y recuperar la componente alta correcta. El verificador aplica UseHint para reconstruir w'₁ a partir de w'_approx y el hint proporcionado en la firma.",
    inputs: [
      { name: "h", description: "Hint booleano (0 o 1)" },
      { name: "r", description: "Entero r ∈ ℤq" },
    ],
    outputs: [{ name: "r_1", description: "Componente alta corregida" }],
    pseudocode: `function UseHint(h, r):
    m ← (q − 1) / (2γ₂)
    (r₁, r₀) ← Decompose(r)
    if h = 1 then
        if r₀ > 0 then return (r₁ + 1) mod m
        else return (r₁ − 1) mod m
        end if
    end if
    return r₁`,
    parameters: ["gamma2", "q"],
  },

  // ─── Level 9: Key/Sig Encoding ────────────────────────────────
  pke: {
    id: "pke",
    fipsNumber: "Alg 22",
    summary:
      "Codifica la clave pública (ρ, t₁) como una cadena de bytes concatenando la semilla ρ con el empaquetado SimpleBitPack de cada polinomio de t₁. El resultado es la clave pública pk transmisible.",
    inputs: [
      { name: "\\rho", description: "Semilla pública ρ ∈ B³²" },
      { name: "t_1", description: "Vector comprimido t₁ ∈ Rk" },
    ],
    outputs: [{ name: "pk", description: "Clave pública codificada en bytes" }],
    pseudocode: `function pkEncode(ρ, t₁):
    pk ← ρ
    for i from 0 to k−1 do
        pk ← pk ∥ SimpleBitPack(t₁[i], 2^(bitlen(q−1)−d) − 1)
    end for
    return pk`,
    parameters: ["k", "q", "d"],
  },

  pkd: {
    id: "pkd",
    fipsNumber: "Alg 23",
    summary:
      "Decodifica una clave pública pk desde su representación en bytes, recuperando la semilla ρ y el vector t₁. Usado por el verificador para reconstruir la matriz A y verificar la firma.",
    inputs: [{ name: "pk", description: "Clave pública codificada en bytes" }],
    outputs: [
      { name: "\\rho", description: "Semilla pública ρ ∈ B³²" },
      { name: "t_1", description: "Vector comprimido t₁ ∈ Rk" },
    ],
    pseudocode: `function pkDecode(pk):
    (ρ, z₀, …, z_{k−1}) ← pk   ▷ split into 32B seed + k chunks
    for i from 0 to k−1 do
        t₁[i] ← SimpleBitUnpack(zᵢ, 2^(bitlen(q−1)−d) − 1)
    end for
    return (ρ, t₁)`,
    parameters: ["k", "q", "d"],
  },

  ske: {
    id: "ske",
    fipsNumber: "Alg 24",
    summary:
      "Codifica la clave secreta completa (ρ, K, tr, s₁, s₂, t₀) como una cadena de bytes. Concatena las semillas con el empaquetado BitPack de los vectores secretos, produciendo la sk almacenable.",
    inputs: [
      { name: "\\rho, K, tr", description: "Semillas ρ ∈ B³², K ∈ B³², tr ∈ B⁶⁴" },
      { name: "s_1, s_2", description: "Vectores secretos con coeficientes en [−η, η]" },
      { name: "t_0", description: "Bits bajos de t" },
    ],
    outputs: [{ name: "sk", description: "Clave secreta codificada en bytes" }],
    pseudocode: `function skEncode(ρ, K, tr, s₁, s₂, t₀):
    sk ← ρ ∥ K ∥ tr
    for i from 0 to ℓ−1 do
        sk ← sk ∥ BitPack(s₁[i], η, η)
    end for
    for i from 0 to k−1 do
        sk ← sk ∥ BitPack(s₂[i], η, η)
    end for
    for i from 0 to k−1 do
        sk ← sk ∥ BitPack(t₀[i], 2^(d−1)−1, 2^(d−1))
    end for
    return sk`,
    parameters: ["k", "l", "eta", "d"],
  },

  skd: {
    id: "skd",
    fipsNumber: "Alg 25",
    summary:
      "Decodifica la clave secreta sk desde bytes, recuperando ρ, K, tr, s₁, s₂ y t₀. Solo debe ejecutarse sobre entradas de fuentes confiables, ya que entradas malformadas pueden producir valores fuera de rango.",
    inputs: [{ name: "sk", description: "Clave secreta codificada en bytes" }],
    outputs: [
      { name: "\\rho, K, tr", description: "Semillas" },
      { name: "s_1, s_2, t_0", description: "Vectores secretos y bits bajos" },
    ],
    pseudocode: `function skDecode(sk):
    (ρ, K, tr, y₀…y_{ℓ−1}, z₀…z_{k−1}, w₀…w_{k−1}) ← sk
    for i from 0 to ℓ−1 do
        s₁[i] ← BitUnpack(yᵢ, η, η)
    end for
    for i from 0 to k−1 do
        s₂[i] ← BitUnpack(zᵢ, η, η)
    end for
    for i from 0 to k−1 do
        t₀[i] ← BitUnpack(wᵢ, 2^(d−1)−1, 2^(d−1))
    end for
    return (ρ, K, tr, s₁, s₂, t₀)`,
    parameters: ["k", "l", "eta", "d"],
  },

  sge: {
    id: "sge",
    fipsNumber: "Alg 26",
    summary:
      "Codifica una firma (c̃, z, h) como cadena de bytes. Concatena el hash de compromiso, el empaquetado de z con BitPack, y el hint h con HintBitPack, produciendo la firma σ transmisible.",
    inputs: [
      { name: "\\tilde{c}", description: "Hash del compromiso c̃ ∈ B^(λ/4)" },
      { name: "z", description: "Respuesta z ∈ Rℓ con coeficientes en [−γ₁+1, γ₁]" },
      { name: "h", description: "Vector de hints h ∈ Rk" },
    ],
    outputs: [{ name: "\\sigma", description: "Firma codificada en bytes" }],
    pseudocode: `function sigEncode(c̃, z, h):
    σ ← c̃
    for i from 0 to ℓ−1 do
        σ ← σ ∥ BitPack(z[i], γ₁−1, γ₁)
    end for
    σ ← σ ∥ HintBitPack(h)
    return σ`,
    parameters: ["gamma1", "omega", "lambda", "l"],
  },

  sgd: {
    id: "sgd",
    fipsNumber: "Alg 27",
    summary:
      "Decodifica una firma σ desde bytes, recuperando c̃, z y h. Si HintBitUnpack devuelve ⊥ (hint malformado), la firma es inválida. Se usa al inicio de la verificación.",
    inputs: [{ name: "\\sigma", description: "Firma codificada en bytes" }],
    outputs: [
      { name: "\\tilde{c}", description: "Hash del compromiso" },
      { name: "z", description: "Respuesta del firmante" },
      { name: "h", description: "Vector de hints (o ⊥)" },
    ],
    pseudocode: `function sigDecode(σ):
    (c̃, x₀…x_{ℓ−1}, y) ← σ
    for i from 0 to ℓ−1 do
        z[i] ← BitUnpack(xᵢ, γ₁−1, γ₁)
    end for
    h ← HintBitUnpack(y)
    return (c̃, z, h)`,
    parameters: ["gamma1", "omega", "lambda", "l"],
  },

  w1e: {
    id: "w1e",
    fipsNumber: "Alg 28",
    summary:
      "Codifica el vector de compromiso w₁ ∈ Rk como una cadena de bytes usando SimpleBitPack. El resultado se hashea junto con μ para producir el desafío c̃ durante la firma y la verificación.",
    inputs: [{ name: "w_1", description: "Vector de compromiso w₁ ∈ Rk" }],
    outputs: [{ name: "bytes", description: "Cadena de bytes codificada" }],
    pseudocode: `function w1Encode(w₁):
    w̃ ← ()
    for i from 0 to k−1 do
        w̃ ← w̃ ∥ SimpleBitPack(w₁[i], (q−1)/(2γ₂) − 1)
    end for
    return w̃`,
    parameters: ["k", "q", "gamma2"],
  },

  // ─── Level 10: Internal Core ──────────────────────────────────
  kgi: {
    id: "kgi",
    fipsNumber: "Alg 6",
    summary:
      "Algoritmo interno de generación de claves. A partir de una semilla ξ, expande A, muestrea s₁ y s₂, calcula t = As₁ + s₂, y separa t en t₁ (público) y t₀ (secreto). Produce el par (pk, sk).",
    inputs: [{ name: "\\xi", description: "Semilla aleatoria ξ ∈ B³²" }],
    outputs: [
      { name: "pk", description: "Clave pública codificada" },
      { name: "sk", description: "Clave secreta codificada" },
    ],
    pseudocode: `function KeyGen_internal(ξ):
    (ρ, ρ', K) ← H(ξ ∥ k ∥ ℓ, 128)    ▷ expand seed
    Â ← ExpandA(ρ)                       ▷ matrix in NTT
    (s₁, s₂) ← ExpandS(ρ')
    t ← NTT⁻¹(Â ∘ NTT(s₁)) + s₂        ▷ t = As₁ + s₂
    (t₁, t₀) ← Power2Round(t)           ▷ compress t
    pk ← pkEncode(ρ, t₁)
    tr ← H(pk, 64)
    sk ← skEncode(ρ, K, tr, s₁, s₂, t₀)
    return (pk, sk)`,
    parameters: ["k", "l", "eta", "d", "q"],
  },

  sgi: {
    id: "sgi",
    fipsNumber: "Alg 7",
    summary:
      "Algoritmo interno de firma. Implementa el bucle de rejection sampling: genera máscara y, calcula w = Ay, obtiene el desafío c, y comprueba que z = y + cs₁ cumple las normas. Repite hasta encontrar una firma válida.",
    inputs: [
      { name: "sk", description: "Clave secreta codificada" },
      { name: "M'", description: "Mensaje formateado M' ∈ {0,1}*" },
      { name: "rnd", description: "Aleatoriedad rnd ∈ B³² (o ceros para determinista)" },
    ],
    outputs: [{ name: "\\sigma", description: "Firma codificada en bytes" }],
    pseudocode: `function Sign_internal(sk, M', rnd):
    (ρ, K, tr, s₁, s₂, t₀) ← skDecode(sk)
    ŝ₁ ← NTT(s₁);  ŝ₂ ← NTT(s₂);  t̂₀ ← NTT(t₀)
    Â ← ExpandA(ρ)
    μ ← H(tr ∥ M', 64)              ▷ message representative
    ρ'' ← H(K ∥ rnd ∥ μ, 64)        ▷ private random seed
    κ ← 0;  (z, h) ← ⊥
    while (z, h) = ⊥ do              ▷ rejection loop
        y ← ExpandMask(ρ'', κ)
        w ← NTT⁻¹(Â ∘ NTT(y))
        w₁ ← HighBits(w)
        c̃ ← H(μ ∥ w1Encode(w₁), λ/4)
        c ← SampleInBall(c̃)
        z ← y + NTT⁻¹(NTT(c) ∘ ŝ₁)
        r₀ ← LowBits(w − NTT⁻¹(NTT(c) ∘ ŝ₂))
        if ‖z‖∞ ≥ γ₁−β or ‖r₀‖∞ ≥ γ₂−β then
            (z, h) ← ⊥
        else
            ct₀ ← NTT⁻¹(NTT(c) ∘ t̂₀)
            h ← MakeHint(−ct₀, w − cs₂ + ct₀)
            if ‖ct₀‖∞ ≥ γ₂ or #1s(h) > ω then
                (z, h) ← ⊥
            end if
        end if
        κ ← κ + ℓ
    end while
    σ ← sigEncode(c̃, z mod±q, h)
    return σ`,
    parameters: ["k", "l", "eta", "gamma1", "gamma2", "tau", "beta", "omega", "lambda"],
  },

  vfi: {
    id: "vfi",
    fipsNumber: "Alg 8",
    summary:
      "Algoritmo interno de verificación. Reconstruye w'_approx = Az − ct₁·2^d, aplica UseHint para obtener w'₁, y verifica que el hash de w'₁ coincide con c̃ y que ||z||∞ < γ₁ − β.",
    inputs: [
      { name: "pk", description: "Clave pública codificada" },
      { name: "M'", description: "Mensaje formateado M' ∈ {0,1}*" },
      { name: "\\sigma", description: "Firma codificada en bytes" },
    ],
    outputs: [{ name: "bool", description: "true si la firma es válida, false si no" }],
    pseudocode: `function Verify_internal(pk, M', σ):
    (ρ, t₁) ← pkDecode(pk)
    (c̃, z, h) ← sigDecode(σ)
    if h = ⊥ then return false
    Â ← ExpandA(ρ)
    tr ← H(pk, 64)
    μ ← H(tr ∥ M', 64)
    c ← SampleInBall(c̃)
    w'_approx ← NTT⁻¹(Â∘NTT(z) − NTT(c)∘NTT(t₁·2^d))
    w'₁ ← UseHint(h, w'_approx)
    c̃' ← H(μ ∥ w1Encode(w'₁), λ/4)
    return ‖z‖∞ < γ₁−β  and  c̃ = c̃'`,
    parameters: ["k", "l", "gamma1", "gamma2", "beta", "d", "lambda"],
  },

  // ─── Level 11: Public API ─────────────────────────────────────
  kg: {
    id: "kg",
    fipsNumber: "Alg 1",
    summary:
      "Punto de entrada público para la generación de claves ML-DSA. Genera una semilla aleatoria de 32 bytes usando un RBG aprobado y la pasa a KeyGen_internal, que produce el par (pk, sk).",
    inputs: [],
    outputs: [
      { name: "pk", description: "Clave pública ML-DSA" },
      { name: "sk", description: "Clave privada ML-DSA" },
    ],
    pseudocode: `function ML-DSA.KeyGen():
    ξ ←$ B³²                       ▷ random 32-byte seed
    if ξ = NULL then return ⊥      ▷ RBG failure
    return KeyGen_internal(ξ)`,
    parameters: [],
  },

  sg: {
    id: "sg",
    fipsNumber: "Alg 2",
    summary:
      "Punto de entrada público para firmar un mensaje M con la clave privada sk y un contexto ctx. Genera aleatoriedad rnd, formatea el mensaje con separación de dominio, y delega a Sign_internal.",
    inputs: [
      { name: "sk", description: "Clave privada ML-DSA" },
      { name: "M", description: "Mensaje a firmar M ∈ {0,1}*" },
      { name: "ctx", description: "Cadena de contexto (≤ 255 bytes)" },
    ],
    outputs: [{ name: "\\sigma", description: "Firma ML-DSA" }],
    pseudocode: `function ML-DSA.Sign(sk, M, ctx):
    if |ctx| > 255 then return ⊥
    rnd ←$ B³²                    ▷ hedged variant
    if rnd = NULL then return ⊥
    M' ← BytesToBits(0x00 ∥ |ctx| ∥ ctx) ∥ M
    σ ← Sign_internal(sk, M', rnd)
    return σ`,
    parameters: [],
  },

  vf: {
    id: "vf",
    fipsNumber: "Alg 3",
    summary:
      "Punto de entrada público para verificar una firma σ sobre un mensaje M con la clave pública pk. Formatea el mensaje con la misma separación de dominio que Sign y delega a Verify_internal.",
    inputs: [
      { name: "pk", description: "Clave pública ML-DSA" },
      { name: "M", description: "Mensaje original M ∈ {0,1}*" },
      { name: "\\sigma", description: "Firma a verificar" },
      { name: "ctx", description: "Cadena de contexto (≤ 255 bytes)" },
    ],
    outputs: [{ name: "bool", description: "true si la firma es válida" }],
    pseudocode: `function ML-DSA.Verify(pk, M, σ, ctx):
    if |ctx| > 255 then return ⊥
    M' ← BytesToBits(0x00 ∥ |ctx| ∥ ctx) ∥ M
    return Verify_internal(pk, M', σ)`,
    parameters: [],
  },

  hsg: {
    id: "hsg",
    fipsNumber: "Alg 4",
    summary:
      "Variante de firma que opera sobre el hash del mensaje en lugar del mensaje directo. Primero aplica una función de pre-hash aprobada (como SHA-256 o SHA-512) al mensaje M, luego formatea el resultado con un OID identificador y delega a Sign_internal. Permite firmar mensajes de longitud arbitraria de forma más eficiente.",
    inputs: [
      { name: "sk", description: "Clave privada ML-DSA" },
      { name: "M", description: "Mensaje a firmar M ∈ {0,1}*" },
      { name: "ctx", description: "Cadena de contexto (≤ 255 bytes)" },
      { name: "PH", description: "Función de pre-hash aprobada" },
    ],
    outputs: [{ name: "\\sigma", description: "Firma HashML-DSA" }],
    pseudocode: `function HashML-DSA.Sign(sk, M, ctx, PH):
    if |ctx| > 255 then return ⊥
    OID ← PH.oid
    PHM ← PH(M)                   ▷ pre-hash message
    rnd ←$ B³²
    if rnd = NULL then return ⊥
    M' ← BytesToBits(0x01 ∥ |ctx| ∥ ctx ∥ OID ∥ PHM)
    σ ← Sign_internal(sk, M', rnd)
    return σ`,
    parameters: [],
  },

  hvf: {
    id: "hvf",
    fipsNumber: "Alg 5",
    summary:
      "Variante de verificación para firmas HashML-DSA. Aplica la misma función de pre-hash al mensaje, construye M' con el OID correspondiente, y delega a Verify_internal. El verificador debe usar la misma función PH que el firmante.",
    inputs: [
      { name: "pk", description: "Clave pública ML-DSA" },
      { name: "M", description: "Mensaje original M ∈ {0,1}*" },
      { name: "\\sigma", description: "Firma HashML-DSA a verificar" },
      { name: "ctx", description: "Cadena de contexto (≤ 255 bytes)" },
      { name: "PH", description: "Función de pre-hash aprobada" },
    ],
    outputs: [{ name: "bool", description: "true si la firma es válida" }],
    pseudocode: `function HashML-DSA.Verify(pk, M, σ, ctx, PH):
    if |ctx| > 255 then return ⊥
    OID ← PH.oid
    PHM ← PH(M)                   ▷ pre-hash message
    M' ← BytesToBits(0x01 ∥ |ctx| ∥ ctx ∥ OID ∥ PHM)
    return Verify_internal(pk, M', σ)`,
    parameters: [],
  },
};
