import React, { useState } from "react";
import { motion } from "framer-motion";
import { LightRays } from "@/components/ui/LightRays";
import { TechText } from "@/components/ui/TechText";
import { DitherVeil } from "@/components/ui/DitherVeil";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Github,
  Linkedin,
  Copy,
  Check,
  ArrowUpRight,
} from "lucide-react";

import certIntel from "@/assets/cert-intel.jpg";
import certPython from "@/assets/cert-python.jpg";
import certCisco from "@/assets/cert-cisco.jpg";
import certIot from "@/assets/cert-iot.jpg";
import certEnglish from "@/assets/cert-english.jpg";
import torHardSciences from "@/assets/tor-hard-sciences.jpg";
import torDiscern from "@/assets/tor-discern.jpg";

const GITHUB_URL = "https://github.com/jgodoyb";
const LINKEDIN_URL = "https://www.linkedin.com/in/jorge-godoy-beltr%C3%A1n-068622284/";
const CONTACT_EMAIL = "godoyjorgeb@gmail.com";

interface NarrativeMilestone {
  index: string;
  metadata: string;
  title: string;
  statement: string;
  specs: { label: string; value: string }[];
  artifact?: {
    label: string;
    image: string;
    caption: string;
  };
}

const MILESTONES: NarrativeMilestone[] = [
  {
    index: "01",
    metadata: "NIST FIPS 204 (ML-DSA) · ISO 32000-1 · 2024 — PRESENTE",
    title: "Núcleo Criptográfico PAdES",
    statement:
      "Diseño del motor de firma electrónica post-cuántica PAdES (ISO 32000-1) con algoritmos ML-DSA (NIST FIPS 204). Inyección no destructiva de rangos /ByteRange calculados al byte exacto con ejecución local zero-knowledge.",
    specs: [
      { label: "Algoritmos", value: "ML-DSA-44 / 65 / 87 (FIPS 204)" },
      { label: "Estándar", value: "ISO 32000-1 PAdES-B-B / CMS AdBE" },
      { label: "Ejecución", value: "Client-side Zero-Knowledge Sandbox" },
    ],
  },
  {
    index: "02",
    metadata: "PROGRAMA INCIBE EMPRENDE · LA MINA STARTUP · 2026",
    title: "Fortificación & Perímetro",
    statement:
      "Especialización táctica en el programa INCIBE Emprende. Hardening perimetral de infraestructuras críticas, modelado de amenazas Zero-Trust y diseño de protocolos de respuesta ante incidentes (IR).",
    specs: [
      { label: "Marco", value: "INCIBE Emprende / La Mina Startup" },
      { label: "Disciplinas", value: "Hardening Perimetral, SAST/DAST, IR" },
      { label: "Regulación", value: "Esquema Nacional de Seguridad (ENS)" },
    ],
  },
  {
    index: "03",
    metadata: "ERASMUS+ BIP · NAPOLI & BUCHAREST · 2022 — 2025",
    title: "Ingeniería Global",
    statement:
      "Investigación transfronteriza Erasmus+ BIP en Rumanía (U. Alexandru Ioan Cuza) e Italia (U. Parthenope Napoli). Especialización en criptografía basada en retículos, machine learning y análisis de modelos sintéticos.",
    specs: [
      { label: "Rumanía (2025)", value: "Hard Sciences: Physics, Math & CS" },
      { label: "Rumanía (2024)", value: "Discern: Disinformation & AI" },
      { label: "Italia (2022-23)", value: "Università degli Studi di Napoli Parthenope" },
    ],
    artifact: {
      label: "VER CERTIFICACIÓN BIP",
      image: torHardSciences,
      caption: "Transcript of Records — Hard Sciences BIP 2025 (Alexandru Ioan Cuza)",
    },
  },
  {
    index: "04",
    metadata: "GRADO IT (UAL) · CISCO ACADEMY · INTEL CORPORATION · 2020 — 2026",
    title: "Bases & Acreditación Rigurosa",
    statement:
      "Grado en Ingeniería Informática (Mención IT) por la Universidad de Almería, con acreditaciones oficiales de Intel® Simics® y Cisco Network Technician en conmutación, routing y automatización.",
    specs: [
      { label: "Titulación", value: "Grado en Ingeniería Informática (Mención IT)" },
      { label: "Hardware", value: "Intel® Simics® Simulator Certification" },
      { label: "Redes", value: "Cisco Network Technician Career Path" },
    ],
    artifact: {
      label: "VER CERTIFICACIÓN INTEL® SIMICS®",
      image: certIntel,
      caption: "Intel® Simics® Simulator — Peripheral & Interfaces System Debugging",
    },
  },
];

const PILLARS = [
  {
    title: "ISO 32000-1 (PAdES)",
    spec: "Inyección incremental byte-exacta. Compatibilidad nativa con Adobe Acrobat sin invalidación MDP.",
  },
  {
    title: "NIST FIPS 204 (ML-DSA-65)",
    spec: "Criptografía de reticulados post-cuántica para no repudio estricto.",
  },
  {
    title: "Zero-Footprint Execution",
    spec: "Procesamiento en el cliente / edge sin retención de datos documentales.",
  },
];

const CERTIFICATIONS_ARCHIVE = [
  {
    id: "intel",
    name: "Intel® Simics® Simulator",
    issuer: "Intel Corporation",
    year: "2024",
    field: "Hardware Simulation & Bus Interfaces",
    image: certIntel,
  },
  {
    id: "cisco-net",
    name: "Network Technician Career Path",
    issuer: "Cisco Networking Academy",
    year: "2024",
    field: "Routing, Switching, IPv6 & Troubleshooting",
    image: certCisco,
  },
  {
    id: "cisco-py",
    name: "Python Essentials 1",
    issuer: "Cisco / OpenEDG Python Institute",
    year: "2024",
    field: "Algoritmia, Estructuras & Debugging",
    image: certPython,
  },
  {
    id: "tor-hard",
    name: "Hard Sciences: Math & CS",
    issuer: "U. Alexandru Ioan Cuza (Rumanía)",
    year: "2025",
    field: "Erasmus+ BIP // Machine Learning & Cryptography",
    image: torHardSciences,
  },
  {
    id: "tor-discern",
    name: "Discern: Disinformation & AI",
    issuer: "U. Româno-Americană (Rumanía)",
    year: "2024",
    field: "Erasmus+ BIP // Synthetic Media Analysis",
    image: torDiscern,
  },
  {
    id: "iot",
    name: "IoT Fundamentals",
    issuer: "Universidad de Granada",
    year: "2024",
    field: "Internet de las Cosas & Digitalización",
    image: certIot,
  },
  {
    id: "english",
    name: "Cambridge English PET",
    issuer: "Cambridge Assessment English",
    year: "2018",
    field: "Certificación B1 Internacional",
    image: certEnglish,
  },
];

export const Architect = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<{
    title: string;
    image: string;
    caption?: string;
  } | null>(null);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(CONTACT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="min-h-screen bg-black text-zinc-100 selection:bg-white selection:text-black font-sans antialiased overflow-x-hidden"
    >
      {/* ────────────────────────────────────────────────────────────────
          HERO SECTION: 5-LAYER WEBGL & BRUTALIST ORCHESTRATION
      ──────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[95vh] sm:min-h-screen w-full bg-black flex flex-col justify-between overflow-hidden px-6 sm:px-12 lg:px-20 pt-24 pb-10">

        {/* CAPA 0 (Fondo Profundo): LightRays */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <LightRays
            raysOrigin="top-center"
            raysColor="#ffffff"
            raysSpeed={0.35}
            lightSpread={2.2}
            rayLength={2.6}
            pulsating={false}
            fadeDistance={1.4}
            saturation={0}
            noiseAmount={0.03}
            followMouse={false}
            mouseInfluence={0}
            className="w-full h-full opacity-65"
          />
        </div>

        {/* CAPA 1 (El Activo Visual / DitherVeil WebGL - Centrado en el espacio negativo) */}
        <div
          className="absolute top-0 right-[5%] md:right-[15%] w-full md:w-[40%] max-w-lg h-full z-20 pointer-events-auto flex items-center justify-center"
          style={{
            mixBlendMode: 'screen',
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%), linear-gradient(to top, transparent 0%, black 15%, black 100%)",
            WebkitMaskComposite: "source-in",
            maskImage:
              "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%), linear-gradient(to top, transparent 0%, black 15%, black 100%)",
            maskComposite: "intersect",
          }}
        >
          <DitherVeil
            src="/assets/dither-sculpture.png"
            inkColor="#000000"
            paperColor="#18181b"
            rimColor="#fafafa"
            rim={0.12}
            pattern="floyd"
            palette="duotone"
            fit="contain"
            pixelSize={2.5}
            revealRadius={75}
            softness={0.6}
            clickBurst={true}
            className="w-full h-full"
          />
        </div>

        {/* CAPA 4 (Micro-copy Perimetral Superior): z-40 */}
        <div className="relative z-40 w-full pt-2 pointer-events-none">
          <div className="font-mono text-[10px] text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-zinc-400 inline-block" />
            <span>[ CORE IDENTITY // SYSTEM ARCHITECT ]</span>
          </div>
        </div>

        {/* CAPA 3 (UI y Tipografía Principal): z-30 relative */}
        <div className="relative z-30 max-w-2xl my-auto py-8 md:pr-12 lg:pr-16">
          {/* La Cita: Protagonismo Total que Inicia la Lectura */}
          <div className="mb-11">
            <p className="text-zinc-300 text-xl md:text-2xl font-light italic leading-relaxed">
              «La simplicidad es un prerrequisito para la fiabilidad.»
            </p>
            <p className="font-mono text-xs text-zinc-500 mt-2 uppercase tracking-widest">
              — Edsger W. Dijkstra
            </p>
          </div>

          {/* El Nombre: TechText */}
          <div className="w-full max-w-3xl h-24 sm:h-32 md:h-40 relative -ml-1 sm:-ml-3 select-none">
            <TechText
              text="JORGE GODOY"
              color="#ffffff"
              accentColor="#ffffff"
              fontSize={120}
              letterSpacing={-0.04}
              reach={190}
              softness={0.7}
              strokeWidth={1.5}
              speed={0.9}
            />
          </div>

          {/* El Manifiesto Actualizado */}
          <p className="text-zinc-400 font-light max-w-xl text-base md:text-lg leading-relaxed mt-4">
            Enfocado en dominar la intersección entre la ingeniería de software y la criptografía post-cuántica. Mi meta es aprender, diseñar y construir sistemas donde la seguridad matemática y la precisión visual converjan para proteger la identidad digital del mañana.
          </p>

          {/* CTA: Botón "Hablemos ↗" */}
          <div className="pt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={() => setContactOpen(true)}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-transparent border border-zinc-700 text-white text-xs sm:text-sm font-mono tracking-widest uppercase hover:bg-white hover:text-black hover:border-white transition-none duration-0 shadow-none cursor-pointer select-none"
            >
              <span>Hablemos</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>

            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-transparent border border-zinc-900 text-zinc-400 text-xs font-mono tracking-widest uppercase hover:text-white hover:border-zinc-700 transition-none duration-0 select-none"
            >
              <Linkedin className="w-3.5 h-3.5" />
              <span>LinkedIn</span>
            </a>

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-transparent border border-zinc-900 text-zinc-400 text-xs font-mono tracking-widest uppercase hover:text-white hover:border-zinc-700 transition-none duration-0 select-none"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>

        {/* CAPA 4 (Micro-copy Perimetral Inferior): z-40 */}
        <div className="relative z-40 w-full pt-8 border-t border-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pointer-events-none">
          <div className="font-mono text-[10px] text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/90 animate-pulse" />
            <span>SPEC: PAdES ISO 32000-1 // ML-DSA-65</span>
          </div>

          <div className="font-mono text-[10px] text-zinc-400 uppercase tracking-[0.2em] sm:text-right">
            QUANTUM-SAFE ARCHITECTURES // SPAIN [EU]
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────
          2. TRAYECTORIA NARRATIVA: LIMPIA Y PUNCHY (1-2 LÍNEAS POR HITO)
      ──────────────────────────────────────────────────────────────── */}
      <section className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-24 sm:py-32">
        <div className="border-b border-zinc-900 pb-8 mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-white">
              Trayectoria Narrativa
            </h2>
          </div>
          <p className="font-mono text-xs text-zinc-500 max-w-md uppercase tracking-wider leading-relaxed">
            Hitos clave resueltos con rigor matemático y arquitectura de bajo nivel.
          </p>
        </div>

        {/* Lista Asimétrica Editorial */}
        <div className="divide-y divide-zinc-900 border-b border-zinc-900">
          {MILESTONES.map((item) => (
            <article
              key={item.index}
              className="py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 group"
            >
              {/* Columna Izquierda: Índice y Metadatos */}
              <div className="lg:col-span-4 space-y-4">
                <span className="font-mono text-3xl sm:text-4xl font-light text-zinc-600 group-hover:text-white transition-none duration-0 block">
                  {item.index}
                </span>

                <p className="font-mono text-xs text-zinc-600 uppercase tracking-widest leading-relaxed">
                  {item.metadata}
                </p>

                {/* Especificaciones Técnicas */}
                <div className="pt-3 border-t border-zinc-900/80 space-y-1.5">
                  {item.specs.map((spec, sIdx) => (
                    <div
                      key={sIdx}
                      className="flex items-center justify-between text-[11px] font-mono"
                    >
                      <span className="text-zinc-600">{spec.label}</span>
                      <span className="text-zinc-400 text-right">{spec.value}</span>
                    </div>
                  ))}
                </div>

                {/* Enlace al artefacto de verificación */}
                {item.artifact && (
                  <div className="pt-2">
                    <button
                      onClick={() =>
                        setSelectedPreview({
                          title: item.title,
                          image: item.artifact!.image,
                          caption: item.artifact!.caption,
                        })
                      }
                      className="inline-flex items-center gap-2 text-xs font-mono tracking-wider text-zinc-400 hover:text-white border-b border-zinc-800 hover:border-white pb-1 transition-none duration-0 uppercase cursor-pointer"
                    >
                      <span>{item.artifact.label}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Columna Derecha: Título y Declaración Directa (1-2 líneas) */}
              <div className="lg:col-span-8 space-y-4 my-auto">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-medium text-white tracking-tight leading-tight">
                  {item.title}
                </h3>

                <p className="text-base sm:text-lg font-light text-zinc-300 tracking-tight leading-relaxed">
                  {item.statement}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────
          3. PILARES DE INGENIERÍA: SINTETIZADOS CON ESPECIFICACIONES EXACTAS
      ──────────────────────────────────────────────────────────────── */}
      <section className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-20 border-t border-zinc-900">
        <div className="mb-14 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
            Pilares de Arquitectura
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-zinc-900 pt-10">
          {PILLARS.map((pillar, idx) => (
            <div key={idx} className="space-y-3 border-l border-zinc-800 pl-6">
              <span className="font-mono text-xs text-zinc-600 uppercase tracking-widest">
                0{idx + 1}
              </span>
              <h4 className="text-lg font-medium text-white tracking-tight">
                {pillar.title}
              </h4>
              <p className="text-sm text-zinc-400 font-light leading-relaxed">
                {pillar.spec}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────
          4. ARCHIVO DE CERTIFICACIONES
      ──────────────────────────────────────────────────────────────── */}
      <section className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-20 border-t border-zinc-900">
        <div className="border-b border-zinc-900 pb-6 mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-white">
            Archivo de Certificaciones
          </h2>
          <span className="font-mono text-xs text-zinc-500">
            07 REGISTROS VERIFICADOS
          </span>
        </div>

        <div className="divide-y divide-zinc-900 border-b border-zinc-900">
          {CERTIFICATIONS_ARCHIVE.map((cert, index) => (
            <div
              key={cert.id}
              className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-zinc-950/40 px-3 -mx-3 transition-none duration-0"
            >
              <div className="flex items-baseline gap-4 sm:gap-6">
                <span className="font-mono text-xs text-zinc-600">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h4 className="text-base font-medium text-white group-hover:text-zinc-200">
                    {cert.name}
                  </h4>
                  <p className="font-mono text-xs text-zinc-500">
                    {cert.issuer} · {cert.field}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 self-start sm:self-auto">
                <span className="font-mono text-xs text-zinc-600">
                  {cert.year}
                </span>
                <button
                  onClick={() =>
                    setSelectedPreview({
                      title: cert.name,
                      image: cert.image,
                      caption: `${cert.issuer} — ${cert.field}`,
                    })
                  }
                  className="font-mono text-xs uppercase tracking-wider text-zinc-400 hover:text-white border border-zinc-800 hover:border-white px-3 py-1.5 rounded-full transition-none duration-0 cursor-pointer"
                >
                  Inspeccionar ↗
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────
          5. FOOTER MINIMALISTA
      ──────────────────────────────────────────────────────────────── */}
      <footer className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-12 border-t border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
        <span>© {new Date().getFullYear()} JORGE GODOY BELTRÁN.</span>
        <span>SYSTEM ARCHITECT & POST-QUANTUM CRYPTOGRAPHY</span>
      </footer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: CONTACTO DIRECTO
      ──────────────────────────────────────────────────────────────── */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="bg-black border border-zinc-800 text-zinc-100 rounded-none max-w-lg p-8 sm:p-10 font-sans shadow-2xl">
          <DialogHeader className="space-y-3 text-left">
            <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
              CANAL DE COMUNICACIÓN // DIRECTO
            </span>
            <DialogTitle className="text-2xl font-medium text-white tracking-tight">
              Jorge Godoy Beltrán
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm font-light leading-relaxed">
              Disponible para proyectos estratégicos de transición criptográfica post-cuántica y auditoría de código de misión crítica.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-6 border-t border-zinc-900">
            <div className="space-y-2">
              <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">
                CORREO ELECTRÓNICO
              </span>
              <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800">
                <span className="font-mono text-xs sm:text-sm text-zinc-200 select-all">
                  {CONTACT_EMAIL}
                </span>
                <button
                  onClick={handleCopyEmail}
                  className="font-mono text-xs uppercase tracking-wider text-zinc-400 hover:text-white flex items-center gap-1.5 transition-none duration-0 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 border border-zinc-800 hover:border-white font-mono text-xs uppercase tracking-wider text-zinc-300 hover:text-white transition-none duration-0"
              >
                <Linkedin className="w-4 h-4" />
                <span>LinkedIn ↗</span>
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 border border-zinc-800 hover:border-white font-mono text-xs uppercase tracking-wider text-zinc-300 hover:text-white transition-none duration-0"
              >
                <Github className="w-4 h-4" />
                <span>GitHub ↗</span>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: INSPECCIÓN DE DOCUMENTOS & CERTIFICADOS
      ──────────────────────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(selectedPreview)}
        onOpenChange={(open) => !open && setSelectedPreview(null)}
      >
        <DialogContent className="bg-black border border-zinc-800 text-zinc-100 rounded-none max-w-4xl p-6 sm:p-8 font-sans max-h-[90vh] overflow-y-auto">
          {selectedPreview && (
            <div className="space-y-6">
              <DialogHeader className="text-left space-y-2">
                <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
                  DOCUMENTO OFICIAL // VERIFICACIÓN
                </span>
                <DialogTitle className="text-xl sm:text-2xl font-medium text-white tracking-tight">
                  {selectedPreview.title}
                </DialogTitle>
                {selectedPreview.caption && (
                  <DialogDescription className="font-mono text-xs text-zinc-400">
                    {selectedPreview.caption}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="border border-zinc-800 bg-zinc-950 p-2 sm:p-4 flex items-center justify-center">
                <img
                  src={selectedPreview.image}
                  alt={selectedPreview.title}
                  className="max-h-[65vh] w-auto object-contain filter contrast-105"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default Architect;
