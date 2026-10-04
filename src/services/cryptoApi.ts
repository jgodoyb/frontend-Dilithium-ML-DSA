/**
 * Servicio Criptográfico Híbrido (ML-KEM / Kyber + AES-256-GCM)
 * Conecta con el backend FastAPI para cifrado y descifrado de documentos.
 */

export interface HybridEncryptPayload {
  ek_b64: string;
  plaintext: string;
  security_level?: 512 | 768 | 1024;
}

export interface HybridEncryptResponse {
  capsule_b64: string;
  nonce_b64: string;
  ciphertext_b64: string;
}

export interface HybridDecryptPayload {
  dk_b64: string;
  capsule_b64: string;
  nonce_b64: string;
  ciphertext_b64: string;
  security_level?: 512 | 768 | 1024;
}

export interface HybridDecryptResponse {
  plaintext: string;
}

/**
 * Obtiene la URL base de la API FastAPI asegurando ausencia de slash final.
 */
function getApiUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  return (envUrl && typeof envUrl === 'string' && envUrl.trim() !== ''
    ? envUrl.trim()
    : 'http://127.0.0.1:8000'
  ).replace(/\/+$/, '');
}

/**
 * Cifra el contenido plano de un documento utilizando la clave pública KEM (ek_b64) del destinatario.
 * Invoca POST /encrypt en el backend FastAPI.
 */
export async function encryptDocumentPayload(
  payload: HybridEncryptPayload
): Promise<HybridEncryptResponse> {
  const apiUrl = getApiUrl();
  const endpoint = `${apiUrl}/encrypt`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ek_b64: payload.ek_b64,
      plaintext: payload.plaintext,
      security_level: payload.security_level ?? 768,
    }),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || '';
    } catch {
      errorDetail = await response.text().catch(() => '');
    }

    throw new Error(
      `Error en el cifrado híbrido (${response.status} ${response.statusText}): ${errorDetail || 'Fallo desconocido en el servidor de cifrado'}`
    );
  }

  const data: HybridEncryptResponse = await response.json();
  return data;
}

/**
 * Descifra un documento encapsulado utilizando la clave secreta KEM (dk_b64) del receptor.
 * Invoca POST /decrypt en el backend FastAPI.
 * Captura y detalla errores HTTP 400 (por ejemplo, integridad comprometida o manipulación).
 */
export async function decryptDocumentPayload(
  payload: HybridDecryptPayload
): Promise<string> {
  const apiUrl = getApiUrl();
  const endpoint = `${apiUrl}/decrypt`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dk_b64: payload.dk_b64,
      capsule_b64: payload.capsule_b64,
      nonce_b64: payload.nonce_b64,
      ciphertext_b64: payload.ciphertext_b64,
      security_level: payload.security_level ?? 768,
    }),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || '';
    } catch {
      errorDetail = await response.text().catch(() => '');
    }

    if (response.status === 400) {
      throw new Error(
        `Fallo de integridad o manipulación en el descifrado: ${errorDetail || 'Los datos cifrados o la cápsula KEM no corresponden con la clave privada.'}`
      );
    }

    throw new Error(
      `Error al descifrar documento (${response.status} ${response.statusText}): ${errorDetail || 'Error desconocido'}`
    );
  }

  const data: HybridDecryptResponse = await response.json();
  return data.plaintext;
}
