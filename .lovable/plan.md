

# Plan de Implementacion: Sistema de Identidades, Gestion de Claves y Firma Digital

## 1. Vision General

Integrar un sistema completo de gestion de usuarios con autenticacion por email/password, generacion de claves ML-DSA-65 al iniciar sesion (via tu motor Python en Render), y modulo de firma/verificacion de documentos PDF. Todo coordinado entre Lovable Cloud (frontend + base de datos + Edge Functions) y tu API FastAPI en Render.

```text
+------------------+       +-------------------+       +------------------+
|   Frontend       | ----> | Edge Function     | ----> | FastAPI (Render) |
|   (React/TS)     |       | (Proxy + Logica)  |       | Motor ML-DSA-65  |
+------------------+       +-------------------+       +------------------+
        |                          |
        v                          v
  +-------------------------------------------+
  |         Lovable Cloud (Supabase)           |
  |  - Auth (email/password)                   |
  |  - DB: profiles, keys, signed_docs         |
  |  - Storage: PDFs originales y firmados     |
  +-------------------------------------------+
```

---

## 2. Fase 1 -- Autenticacion y Perfiles de Usuario

### 2.1 Tablas de base de datos

**Tabla `profiles`** (se crea automaticamente al registrarse):
- `id` (UUID, FK a auth.users)
- `nombre_completo` (text)
- `organizacion` (text, nullable)
- `created_at` (timestamp)

Se creara un trigger `on_auth_user_created` que inserte automaticamente un perfil cuando un usuario se registra.

**Politicas RLS:**
- SELECT: solo el propio usuario puede ver su perfil
- UPDATE: solo el propio usuario puede editarlo

### 2.2 Paginas del frontend

- `/auth` -- Pagina de login/registro con tabs (email + password)
- `/auth/reset-password` -- Formulario para restablecer contrasena
- `/dashboard` -- Panel principal del usuario autenticado (protegido)

### 2.3 Notas de seguridad

- Las contrasenas las gestiona Lovable Cloud de forma nativa (bcrypt + salt, nunca en texto plano)
- No se necesita implementar hash manual: el sistema de autenticacion ya lo hace
- Se implementara ruta protegida: si no hay sesion, redirige a `/auth`

---

## 3. Fase 2 -- Generacion de Claves al Iniciar Sesion

### 3.1 Flujo

```text
Usuario inicia sesion
        |
        v
Frontend detecta sesion activa
        |
        v
Consulta DB: tiene claves generadas?
        |
   +----+----+
   |         |
  SI        NO
   |         |
   v         v
 Continua   Llama Edge Function /generate-keys
            Edge Function llama a FastAPI en Render
            FastAPI genera par (pk, sk) con ML-DSA-65
            Devuelve pk (publica) y sk (privada cifrada)
            Edge Function guarda en DB
```

### 3.2 Tabla `user_keys`

- `id` (UUID)
- `user_id` (UUID, FK a profiles)
- `public_key` (text, base64)
- `private_key_encrypted` (text, cifrada con clave derivada)
- `algorithm` (text, default 'ML-DSA-65')
- `created_at` (timestamp)
- `is_active` (boolean, default true)

**Politicas RLS:**
- SELECT: solo el propio usuario
- INSERT: solo via Edge Function (service_role)
- UPDATE/DELETE: no permitido directamente

### 3.3 Cifrado de la clave privada

La clave privada se cifrara **en el servidor (FastAPI)** antes de devolverla. Opciones:
- Derivar una clave de cifrado a partir de un secreto del usuario (por ejemplo, un PIN o la propia password hasheada) usando PBKDF2/Argon2
- O cifrarla con una clave maestra del servidor que solo FastAPI conoce

Esto depende de como lo tengas implementado en tu motor Python. Cuando vea el codigo, adaptare el enfoque exacto.

### 3.4 Edge Function: `crypto-proxy`

Endpoint unico que enruta peticiones a tu FastAPI:
- `POST /generate-keys` -- genera claves para un usuario
- `POST /sign-document` -- firma un PDF
- `POST /verify-signature` -- verifica una firma

La URL de Render se almacenara como secreto (`RENDER_API_URL`).

---

## 4. Fase 3 -- Firma y Verificacion de Documentos

### 4.1 Tabla `signed_documents`

- `id` (UUID)
- `user_id` (UUID, FK a profiles)
- `original_filename` (text)
- `original_file_path` (text, ruta en Storage)
- `signature` (text, base64)
- `signed_at` (timestamp)
- `verified` (boolean, nullable)

### 4.2 Storage Buckets

- `documents` -- PDFs originales subidos por el usuario (privado, RLS por user_id)

### 4.3 Flujo de firma

```text
Usuario sube PDF
        |
        v
Frontend sube a Storage bucket "documents"
        |
        v
Llama Edge Function /sign-document
   con: file_path, user_id
        |
        v
Edge Function:
  1. Descarga PDF de Storage
  2. Obtiene private_key_encrypted de DB
  3. Envia PDF + private_key al FastAPI en Render
  4. FastAPI firma y devuelve signature
  5. Edge Function guarda signature en signed_documents
  6. Devuelve resultado al frontend
```

### 4.4 Flujo de verificacion

```text
Usuario solicita verificar documento
        |
        v
Edge Function /verify-signature
  1. Obtiene public_key del firmante desde DB
  2. Envia PDF + signature + public_key al FastAPI
  3. FastAPI verifica y devuelve true/false
  4. Actualiza campo verified en signed_documents
```

---

## 5. Fase 4 -- Interfaz de Usuario (Dashboard)

### 5.1 Paginas nuevas

- `/dashboard` -- Vista principal con estado de claves y documentos recientes
- `/dashboard/sign` -- Interfaz para subir y firmar PDFs
- `/dashboard/documents` -- Historial de documentos firmados
- `/dashboard/verify` -- Verificar firma de un documento

### 5.2 Componentes clave

- `AuthGuard` -- HOC/wrapper que protege rutas
- `KeyStatus` -- Muestra si el usuario tiene claves generadas
- `DocumentUploader` -- Drag & drop para subir PDFs
- `SignatureResult` -- Muestra resultado de firma/verificacion

---

## 6. Endpoints que tu API FastAPI necesitara

| Endpoint | Metodo | Input | Output |
|---|---|---|---|
| `/generate-keys` | POST | `{user_id}` | `{public_key, private_key_encrypted}` |
| `/sign` | POST | `{pdf_bytes, private_key_encrypted}` | `{signature}` |
| `/verify` | POST | `{pdf_bytes, signature, public_key}` | `{valid: bool}` |
| `/health` | GET | -- | `{status: "ok"}` |

---

## 7. Secretos necesarios

| Secreto | Proposito |
|---|---|
| `RENDER_API_URL` | URL base de tu FastAPI en Render |
| `RENDER_API_KEY` (opcional) | Token de autenticacion para proteger tu API |

---

## 8. Orden de implementacion sugerido

1. **Autenticacion**: tablas, paginas auth, rutas protegidas
2. **Edge Function proxy**: crear `crypto-proxy` con estructura base
3. **Generacion de claves**: tabla `user_keys`, flujo post-login
4. **Firma de documentos**: Storage bucket, tabla `signed_documents`, UI de firma
5. **Verificacion**: UI y logica de verificacion
6. **Pulido**: feedback visual, estados de carga, manejo de errores

---

## 9. Dependencia externa

Todo lo anterior esta listo para implementarse **excepto** la conexion real al FastAPI, que requiere:
1. Que despliegues tu motor Python en Render
2. Que me pases la URL del servicio
3. (Opcional) Un API key si quieres proteger los endpoints

Mientras tanto, puedo construir toda la infraestructura con mocks que simulen las respuestas del motor, para que cuando conectes Render, solo haya que cambiar la URL.

