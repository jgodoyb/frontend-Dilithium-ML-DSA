# 🛡️ Front-end Dilithium ML-DSA (Post-Quantum Cryptography)

Plataforma web profesional para la generación de claves, firma digital y verificación de documentos basada en el estándar de criptografía poscuántica **CRYSTALS-Dilithium (ML-DSA)**.

---

## 🚀 Tecnologías Utilizadas

- **Framework**: React 18 + TypeScript + Vite
- **Estilos**: Tailwind CSS + Shadcn UI + Lucide Icons
- **Backend / Auth / BD**: Supabase (`@supabase/supabase-js`)
- **Procesamiento de Documentos**: `pdf-lib` + `katex` + `qrcode`
- **Testing**: Vitest + React Testing Library

---

## 🛠️ Instalación y Desarrollo Local

### 1. Requisitos Previos
- Node.js (v18+)
- npm o bun

### 2. Clonar el proyecto e instalar dependencias
```bash
git clone https://github.com/jgodoyb/front-Dilithium-ML-DSA.git
cd front-Dilithium-ML-DSA
npm install
```

### 3. Configurar Variables de Entorno
Copia el archivo `.env.example` a `.env` y configura los valores requeridos:

```bash
cp .env.example .env
```

Configura en tu `.env`:
```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_PROJECT_ID=mszqkxkaonuoemyjjhff
VITE_SUPABASE_URL=https://mszqkxkaonuoemyjjhff.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_anon_key_de_supabase
```

### 4. Ejecutar el servidor de desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:8080` (o el puerto configurado en Vite).

---

## 📦 Despliegue en Producción (Vercel)

1. Conecta este repositorio en Vercel.
2. Añade las siguientes Variables de Entorno en el panel de Vercel:
   - `VITE_API_URL`: URL pública de tu API Backend.
   - `VITE_SUPABASE_URL`: `https://mszqkxkaonuoemyjjhff.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Tu clave pública `anon`.
   - `VITE_SUPABASE_PROJECT_ID`: `mszqkxkaonuoemyjjhff`
3. Ejecutar comando de build: `npm run build`.

---

## 📄 Licencia

Este proyecto está desarrollado bajo licencia MIT.
