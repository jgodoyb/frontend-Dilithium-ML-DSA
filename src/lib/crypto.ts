/**
 * Utility functions for cryptographic operations using Web Crypto API
 */

/**
 * Calculates the SHA-256 hash of a Uint8Array
 * @param {Uint8Array | ArrayBuffer} bytes - The bytes of the file or data
 * @returns {Promise<string>} Hexadecimal string of 64 characters
 */
export async function calculateHashFromBytes(bytes: Uint8Array | ArrayBuffer): Promise<string> {
  // 1. Calculate SHA-256 using the browser's native API
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);

  // 2. Convert to Hexadecimal representation (64 characters)
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}
