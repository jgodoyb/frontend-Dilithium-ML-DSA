/**
 * Servicio de Gestión de Contactos y Códigos de Conexión OTP
 * Adaptado estrictamente al esquema DDL de Supabase:
 * - connection_codes: id, creator_id, code, status, claimed_by, created_at, expires_at
 * - user_contacts: id, user_a, user_b, status, created_at
 * - crypto_identities: user_id, email, kem_public_key, public_key
 * - profiles: id, full_name, first_name, last_name, avatar_url
 */

import { supabase } from "@/integrations/supabase/client";

export interface ContactIdentity {
  user_id: string;
  email: string;
  kem_public_key: string;
  full_name?: string;
  avatar_url?: string | null;
}

export interface ConnectionCodeResult {
  code: string;
  expires_at: string;
}

/**
 * Caracteres alfanuméricos en mayúsculas sin ambigüedad visual (omite 0, O, 1, I).
 */
const UNAMBIGUOUS_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Genera un código OTP de 6 caracteres alfanuméricos usando Web Crypto API.
 */
function generateSecureOtp(length = 6): string {
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += UNAMBIGUOUS_CHARSET[randomValues[i] % UNAMBIGUOUS_CHARSET.length];
  }
  return result;
}

/**
 * Genera un nuevo código OTP de conexión con validez de 10 minutos.
 * Invalida/cancela códigos previos activos del mismo creador.
 */
export async function generateConnectionCode(
  userId: string
): Promise<ConnectionCodeResult> {
  if (!userId || userId.trim() === "") {
    throw new Error("El ID de usuario es obligatorio para generar un código.");
  }

  // 1. Cancelar o purgar códigos previos que sigan 'active' para este creator_id
  try {
    await (supabase as any)
      .from("connection_codes")
      .update({ status: "cancelled" })
      .eq("creator_id", userId)
      .eq("status", "active");
  } catch (cancelErr) {
    console.warn("Advertencia al cancelar códigos activos previos:", cancelErr);
  }

  // 2. Generación del código OTP y cálculo de expiración (+10 minutos)
  const code = generateSecureOtp(6);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // 3. Inserción con columnas del DDL: creator_id, code, status, expires_at
  const { error: insertError } = await (supabase as any)
    .from("connection_codes")
    .insert({
      creator_id: userId,
      code,
      status: "active",
      expires_at: expiresAt,
    });

  if (insertError) {
    throw new Error(
      `Error al registrar código de conexión: ${insertError.message}`
    );
  }

  return {
    code,
    expires_at: expiresAt,
  };
}

/**
 * Canjea un código OTP de conexión:
 * - Valida vigencia y estado 'active' en connection_codes.
 * - Impide auto-canje (creator_id !== currentUserId).
 * - Crea relación bidireccional en user_contacts con status 'accepted'.
 * - Actualiza connection_codes a status 'accepted' y claimed_by = currentUserId.
 */
function sanitizeRlsError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes("row-level security") ||
    lower.includes("rls") ||
    lower.includes("violates") ||
    lower.includes("policy") ||
    lower.includes("pgrst") ||
    lower.includes("42501") ||
    lower.includes("permission denied")
  ) {
    return new Error("El código ingresado es inválido, ya fue utilizado por otro usuario o ha expirado.");
  }
  return err instanceof Error ? err : new Error(msg);
}

export async function redeemConnectionCode(
  currentUserId: string,
  codeInput: string
): Promise<{ success: boolean; contactId: string }> {
  if (!currentUserId || currentUserId.trim() === "") {
    throw new Error("El usuario actual no está autenticado.");
  }

  const sanitizedCode = codeInput ? codeInput.trim().toUpperCase() : "";
  if (!sanitizedCode) {
    throw new Error("El código de conexión no puede estar vacío.");
  }

  const nowIso = new Date().toISOString();

  try {
    // 1. Consulta sin filtros y consulta con filtros para validación robusta
    const rawCodeQuery = await (supabase as any)
      .from("connection_codes")
      .select("id, creator_id, code, status, expires_at, created_at")
      .eq("code", sanitizedCode);

    const filteredQuery = await (supabase as any)
      .from("connection_codes")
      .select("id, creator_id, code, status, expires_at")
      .eq("code", sanitizedCode)
      .eq("status", "active")
      .gt("expires_at", nowIso)
      .maybeSingle();

    let record = filteredQuery.data;

    // Si la consulta filtrada no devolvió nada pero la consulta sin filtros sí encontró el registro:
    if (!record && rawCodeQuery.data && rawCodeQuery.data.length > 0) {
      const rawMatch = rawCodeQuery.data[0];

      if (rawMatch.status !== "active") {
        throw new Error("El código ingresado es inválido, ya fue utilizado por otro usuario o ha expirado.");
      }

      const expTime = new Date(rawMatch.expires_at).getTime();
      if (isNaN(expTime) || expTime <= Date.now()) {
        throw new Error("El código ingresado es inválido, ya fue utilizado por otro usuario o ha expirado.");
      }

      record = rawMatch;
    }

    if (filteredQuery.error) {
      throw filteredQuery.error;
    }

    if (!record) {
      throw new Error(
        "El código ingresado es inválido, ya fue utilizado por otro usuario o ha expirado."
      );
    }

    const creatorId: string = record.creator_id;

    // 2. Prevenir auto-enlace
    if (creatorId === currentUserId) {
      throw new Error("No puedes canjear un código generado por tu propia cuenta.");
    }

    // 3. Comprobar si ya existe relación en user_contacts entre user_a y user_b
    const { data: existingContact, error: checkError } = await (supabase as any)
      .from("user_contacts")
      .select("id, status")
      .or(
        `and(user_a.eq.${currentUserId},user_b.eq.${creatorId}),and(user_a.eq.${creatorId},user_b.eq.${currentUserId})`
      )
      .maybeSingle();

    if (checkError) {
      console.warn("Advertencia al verificar contactos existentes:", checkError);
    }

    // 4. Si no existe, insertar la relación con status 'accepted'
    if (!existingContact) {
      const { error: insertContactError } = await (supabase as any)
        .from("user_contacts")
        .insert({
          user_a: currentUserId,
          user_b: creatorId,
          status: "accepted",
        });

      if (insertContactError) {
        throw insertContactError;
      }
    } else if (existingContact.status !== "accepted") {
      // Si existía con otro estado (ej. blocked), reactivar a accepted
      await (supabase as any)
        .from("user_contacts")
        .update({ status: "accepted" })
        .eq("id", existingContact.id);
    }

    // 5. Marcar el código como consumido: status 'accepted' y claimed_by currentUserId
    const { error: updateCodeError } = await (supabase as any)
      .from("connection_codes")
      .update({
        status: "accepted",
        claimed_by: currentUserId,
      })
      .eq("id", record.id);

    if (updateCodeError) {
      console.warn("Advertencia al actualizar estado del código en connection_codes:", updateCodeError);
    }

    return {
      success: true,
      contactId: creatorId,
    };
  } catch (err: unknown) {
    throw sanitizeRlsError(err);
  }
}

/**
 * Obtiene la lista unificada y tipada de contactos del usuario actual
 * a partir de user_contacts (user_a / user_b con status 'accepted'),
 * cruzando con crypto_identities y profiles.
 */
export async function getUserContacts(
  currentUserId: string
): Promise<ContactIdentity[]> {
  if (!currentUserId || currentUserId.trim() === "") {
    return [];
  }

  // 1. Consultar en user_contacts donde status == 'accepted' y (user_a == currentUserId OR user_b == currentUserId)
  const { data: contactRows, error: contactsError } = await (supabase as any)
    .from("user_contacts")
    .select("id, user_a, user_b, status")
    .eq("status", "accepted")
    .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`);

  if (contactsError) {
    throw new Error(
      `Error al recuperar la lista de contactos: ${contactsError.message}`
    );
  }

  if (!contactRows || contactRows.length === 0) {
    return [];
  }

  // 2. Extraer los IDs únicos de la contraparte:
  // Si row.user_a === currentUserId -> contacto es row.user_b
  // Si row.user_b === currentUserId -> contacto es row.user_a
  const rawContactIds: string[] = contactRows
    .map((r: { user_a: string; user_b: string }) =>
      r.user_a === currentUserId ? r.user_b : r.user_a
    )
    .filter((id: string | null | undefined): id is string => Boolean(id && id.trim().length > 0));

  const contactUserIds = Array.from(new Set(rawContactIds));
  if (contactUserIds.length === 0) {
    return [];
  }

  // 3. Consultar crypto_identities (user_id, email, kem_public_key)
  const { data: cryptoRows, error: cryptoError } = await (supabase as any)
    .from("crypto_identities")
    .select("user_id, email, kem_public_key")
    .in("user_id", contactUserIds);

  if (cryptoError) {
    throw new Error(
      `Error al recuperar identidades criptográficas de contactos: ${cryptoError.message}`
    );
  }

  // 4. Consultar profiles (id, full_name, first_name, last_name, avatar_url)
  const profilesMap = new Map<string, { full_name?: string; avatar_url?: string | null }>();
  try {
    const { data: profileRows, error: profilesError } = await (supabase as any)
      .from("profiles")
      .select("id, full_name, first_name, last_name, avatar_url")
      .in("id", contactUserIds);

    if (!profilesError && profileRows) {
      for (const p of profileRows) {
        const nameCandidates = [
          p.full_name,
          `${p.first_name || ""} ${p.last_name || ""}`.trim(),
        ].filter(Boolean);

        const chosenName = nameCandidates.length > 0 && nameCandidates[0].trim().length > 0
          ? nameCandidates[0].trim()
          : undefined;

        profilesMap.set(p.id, {
          full_name: chosenName,
          avatar_url: p.avatar_url || null,
        });
      }
    }
  } catch (profErr) {
    console.warn("Advertencia al cargar perfiles asociados:", profErr);
  }

  // 5. Ensamblar lista tipada con claves públicas KEM válidas
  const contactsList: ContactIdentity[] = [];

  if (cryptoRows && Array.isArray(cryptoRows)) {
    for (const row of cryptoRows) {
      if (!row.kem_public_key || typeof row.kem_public_key !== "string") {
        continue;
      }

      const prof = profilesMap.get(row.user_id);

      contactsList.push({
        user_id: row.user_id,
        email: row.email || "",
        kem_public_key: row.kem_public_key,
        full_name: prof?.full_name,
        avatar_url: prof?.avatar_url,
      });
    }
  }

  return contactsList;
}
