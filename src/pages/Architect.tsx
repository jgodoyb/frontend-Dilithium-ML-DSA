import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  GraduationCap,
  Briefcase,
  Award,
  ExternalLink,
  Github,
  Linkedin,
  Globe,
  Shield,
  Code2,
  Database,
  Cloud,
  GitBranch,
  Cpu,
  Network,
  ArrowLeft,
  X,
  Hexagon,
} from "lucide-react";
import { Link } from "react-router-dom";

import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import profileImg from "@/assets/profile-jorge.jpg";
import certIntel from "@/assets/cert-intel.jpg";
import certPython from "@/assets/cert-python.jpg";
import certCisco from "@/assets/cert-cisco.jpg";
import certIot from "@/assets/cert-iot.jpg";
import certEnglish from "@/assets/cert-english.jpg";
import torHardSciences from "@/assets/tor-hard-sciences.jpg";
import torDiscern from "@/assets/tor-discern.jpg";

const GITHUB_URL = "https://github.com/jgodoyb";
const LINKEDIN_URL = "https://www.linkedin.com/in/jorge-godoy-beltr%C3%A1n-068622284/";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

const education = [
  {
    period: "Ene 2026 – May 2026",
    title: "Bootcamp de Ciberseguridad - Programa Incibe Emprende",
    institution: "La Mina Startup",
    description:
      "Especialización técnica en ciberseguridad mediante simulación de entornos empresariales reales. Formación avanzada en fortificación de redes y perímetro, auditoría de aplicaciones, gestión de normativas de seguridad de la información corporativa y diseño de capacidades de respuesta ante incidentes (IR).",
    highlights: ["Auditoría", "Perímetro", "IR"],
    cert: "Ver certificado",
  },
  {
    period: "2024 – 2025",
    title: "Programas Intensivos Internacionales (Erasmus+ BIP) | Rumanía",
    institution: "U. Alexandru Ioan Cuza (2025) y U. Româno-Americană (2024)",
    description:
      "• Hard Sciences: New Trends in Physics, Mathematics & CS (2025).\nFormación avanzada en aprendizaje automático, criptografía, optimización y ciencias de la computación.\n\n• Discern – Disinformation in the AI Age (2024).\nMetodologías de evaluación de información frente a la manipulación mediante IA generativa.",
    highlights: ["Machine Learning", "Criptografía", "Evaluación IA"],
    cert: "Ver Transcripts",
    certImage: torHardSciences,
  },
  {
    period: "Sep 2022 – Jul 2023",
    title: "Erasmus+ — Informatica",
    institution: "Università degli Studi di Napoli Parthenope, Italia",
    description:
      "Experiencia internacional en Nápoles. Formación bilingüe, adaptación cultural y networking europeo en el ámbito de la ingeniería informática.",
    highlights: ["Internacional", "Bilingüe", "Networking"],
    cert: "Ver Transcript of Records",
  },
  {
    period: "2020 – 2026",
    title: "Grado en Ingeniería Informática",
    institution: "Universidad de Almería",
    description:
      "Mención en Tecnologías de la Información (IT). Formación sólida en diseño de infraestructuras IT, redes, bases de datos y desarrollo de software.",
    highlights: ["Mención IT", "Infraestructuras", "Redes & BBDD"],
    cert: "Ver expediente académico",
  },
];

const experience = [
  {
    period: "Jul 2024 – Oct 2024",
    title: "Student Trainee — Integración de Plataformas",
    company: "Evolutio",
    description:
      "Integración de Genesys Cloud con Salesforce para la gestión de flujos de comunicación empresarial. Diseño de arquitecturas de datos, automatización de procesos y coordinación con equipos multidisciplinares en entornos cloud.",
    tags: ["Genesys Cloud", "Salesforce", "Cloud Integration", "Automatización"],
  },
];

const certifications = [
  {
    title: "Intel® Simics® Simulator",
    issuer: "Intel Corporation",
    icon: Cpu,
    image: certIntel,
    description:
      "Curso de 'Peripheral and Interfaces using Intel Simics'. Formación práctica en simulación de hardware, depuración a nivel de sistema y desarrollo de interfaces usando el simulador Simics de Intel. Julio 2024.",
  },
  {
    title: "Python Essentials 1",
    issuer: "Cisco Networking Academy",
    icon: Code2,
    image: certPython,
    description:
      "Certificación de nivel inicial en Python 3 otorgada por Cisco en colaboración con OpenEDG Python Institute. Cubre diseño, desarrollo, depuración y refactorización de programas en Python. Agosto 2024.",
  },
  {
    title: "Network Technician Career Path",
    issuer: "Cisco Networking Academy",
    icon: Network,
    detail: "4 módulos: Networking Basics, Devices, Security & Automation",
    image: certCisco,
    description:
      "Certificación completa del itinerario Network Technician de Cisco. Incluye 4 módulos: fundamentos de redes, dispositivos, seguridad y automatización. Protocolos IPv4/IPv6, DNS, DHCP, routing y troubleshooting. Julio 2024.",
  },
  {
    title: "IoT Fundamentals",
    issuer: "Universidad de Granada",
    icon: Globe,
    image: certIot,
    description:
      "MOOC 'Internet de las Cosas (IoT): hacia la globalización digital' (3ª edición). 75 horas, 3 créditos ECTS, 6 módulos. Impartido entre marzo y abril de 2024 por abiertaUGR.",
  },
  {
    title: "Cambridge English PET — B1",
    issuer: "Cambridge Assessment",
    icon: Award,
    image: certEnglish,
    description:
      "Preliminary English Test (PET), nivel B1 del Marco Común Europeo. Puntuación global: 141. Reading 152, Writing 132, Listening 137, Speaking 144. Julio 2018, Granada.",
  },
];

const skills = [
  { name: "Java", icon: Code2 },
  { name: "C / C++", icon: Code2 },
  { name: "Python", icon: Code2 },
  { name: "SQL", icon: Database },
  { name: "Ciberseguridad", icon: Shield },
  { name: "Criptografía", icon: Shield },
  { name: "Git", icon: GitBranch },
  { name: "Cloud Computing", icon: Cloud },
  { name: "Redes", icon: Network },
  { name: "React / TS", icon: Code2 },
];

const Architect = () => {
  const [selectedCert, setSelectedCert] = useState<(typeof certifications)[number] | null>(null);
  const [selectedEdu, setSelectedEdu] = useState<(typeof education)[number] | null>(null);
  return (
    <div className="min-h-screen bg-[#030303] text-slate-300 overflow-hidden relative">
      {/* Background FX: Blueprint Grid & Ambient Lights */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(14,116,144,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(14,116,144,0.1)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#0e7490]/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-20%] w-[50%] h-[50%] bg-[#0e7490]/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-40 pb-24 space-y-32 relative z-10">
        {/* ── Hero / Bio: Editorial Split Layout ── */}
        <section className="relative grid lg:grid-cols-[1fr_450px] items-center gap-16 xl:gap-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-10"
          >
            <motion.div custom={0} variants={fadeUp} className="space-y-6">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#0e7490]/10 border border-[#0e7490]/20 rounded-full">
                 <Shield className="w-4 h-4 text-[#0e7490]" />
                 <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[#0e7490]">Arquitecto Junior · ID: JG-24-BETA</span>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white leading-[0.9]">
                  JORGE <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">GODOY</span>
                </h1>
                <div className="h-1.5 w-24 bg-[#0e7490] rounded-full shadow-[0_0_20px_#0e7490]" />
              </div>

              <div className="space-y-4 max-w-2xl">
                <p className="text-xl md:text-2xl font-light text-slate-200 tracking-tight leading-relaxed">
                  Ingeniero Informático & Arquitecto de <span className="font-bold text-[#0e7490]">Ciberseguridad Post-Cuántica</span>.
                </p>
                <p className="text-sm md:text-base text-slate-500 leading-relaxed font-light">
                   Construyendo perímetros inexpugnables en la intersección de la criptografía avanzada y la infraestructura crítica. Diseño arquitecturas donde la seguridad no es una capa, sino el cimiento fundamental de la resiliencia digital.
                </p>
              </div>
            </motion.div>

            <motion.div custom={1} variants={fadeUp} className="flex flex-wrap items-center gap-8 pt-4">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#0e7490]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ubicación</p>
                    <p className="text-sm font-medium text-white">España, UE</p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-[#0e7490]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Disponibilidad</p>
                    <p className="text-sm font-medium text-white">Proyectos Estratégicos</p>
                  </div>
               </div>
            </motion.div>
          </motion.div>

          {/* Cinematic 3D Visual Section */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: 50 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative hidden lg:block"
          >
            {/* The Procedural Architect Visual: 100% Neural Engineering */}
            <div className="relative z-10 w-full aspect-square rounded-[3rem] overflow-hidden border border-white/10 bg-black shadow-2xl flex items-center justify-center group">
               <div className="absolute inset-0 bg-gradient-to-tr from-[#0e7490]/10 to-transparent z-10" />
               
               {/* Procedural SVG Engine */}
               <motion.svg 
                 viewBox="0 0 400 400" 
                 className="w-full h-full opacity-60"
                 initial="hidden"
                 animate="visible"
               >
                 {/* Background technical circles */}
                 <motion.circle 
                   cx="200" cy="200" r="150" 
                   stroke="rgba(14, 116, 144, 0.2)" 
                   strokeWidth="0.5" 
                   fill="none" 
                   strokeDasharray="10 5"
                   animate={{ rotate: 360 }}
                   transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                 />
                 <motion.circle 
                   cx="200" cy="200" r="100" 
                   stroke="rgba(14, 116, 144, 0.3)" 
                   strokeWidth="1" 
                   fill="none" 
                   strokeDasharray="5 10"
                   animate={{ rotate: -360 }}
                   transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                 />

                 {/* Central Geo Core */}
                 <motion.path 
                   d="M200 130 L270 200 L200 270 L130 200 Z" 
                   stroke="#0e7490" 
                   strokeWidth="2" 
                   fill="rgba(14, 116, 144, 0.1)"
                   animate={{ 
                     scale: [1, 1.05, 1],
                     opacity: [0.5, 0.8, 0.5]
                   }}
                   transition={{ duration: 4, repeat: Infinity }}
                 />

                 {/* Connecting Tech Lines */}
                 <line x1="200" y1="50" x2="200" y2="130" stroke="rgba(14, 116, 144, 0.4)" strokeWidth="1" />
                 <line x1="200" y1="270" x2="200" y2="350" stroke="rgba(14, 116, 144, 0.4)" strokeWidth="1" />
                 <line x1="50" y1="200" x2="130" y2="200" stroke="rgba(14, 116, 144, 0.4)" strokeWidth="1" />
                 <line x1="270" y1="200" x2="350" y2="200" stroke="rgba(14, 116, 144, 0.4)" strokeWidth="1" />

                 {/* Pulsing Nodes */}
                 {[
                   { cx: 200, cy: 50 }, { cx: 200, cy: 350 }, 
                   { cx: 50, cy: 200 }, { cx: 350, cy: 200 }
                 ].map((pt, i) => (
                   <motion.circle 
                     key={i}
                     cx={pt.cx} cy={pt.cy} r="4" 
                     fill="#0e7490" 
                     animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                     transition={{ duration: 2, delay: i * 0.5, repeat: Infinity }}
                   />
                 ))}
                 
                 {/* Decorative Outer HUD */}
                 <motion.path 
                    d="M100 50 A 150 150 0 0 1 300 50" 
                    fill="none" stroke="rgba(14, 116, 144, 0.1)" 
                    strokeWidth="10" strokeDasharray="1 20"
                 />
                 <motion.path 
                    d="M100 350 A 150 150 0 0 0 300 350" 
                    fill="none" stroke="rgba(14, 116, 144, 0.1)" 
                    strokeWidth="10" strokeDasharray="1 20"
                 />
               </motion.svg>

               <div className="absolute inset-0 border-[0.5px] border-white/5 rounded-[3rem] m-2 pointer-events-none" />
            </div>

            {/* Profile Pic Overlay (High-end feel) */}
            <div className="absolute -bottom-10 -left-10 z-20 w-48 h-48 rounded-[2.5rem] overflow-hidden border-8 border-[#030303] bg-black shadow-2xl">
               <img src={profileImg} alt="Jorge Godoy" className="w-full h-full object-cover transition-all duration-700" />
            </div>

            {/* Floating Technical Elements */}
            <motion.div 
              animate={{ y: [0, 20, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute -top-12 -right-8 z-20 p-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
            >
               <Hexagon className="w-6 h-6 text-[#0e7490] animate-pulse" />
               <div className="mt-2 space-y-1">
                  <div className="h-1 w-12 bg-white/20 rounded-full" />
                  <div className="h-1 w-8 bg-white/10 rounded-full" />
               </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Educación: Architectural Nodes ── */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-12">
          <motion.div custom={0} variants={fadeUp} className="space-y-2">
            <h2 className="text-sm font-black uppercase tracking-[0.4em] text-[#0e7490]">Resumen Académico</h2>
            <div className="flex items-center gap-4">
               <h3 className="text-4xl font-bold text-white tracking-tight">Formación <span className="text-[#0e7490]">Estratégica</span></h3>
               <div className="h-px flex-1 bg-white/10" />
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {education.map((item, i) => (
              <motion.div 
                key={i} 
                custom={i + 1} 
                variants={fadeUp} 
                className="relative group p-8 rounded-[2rem] border border-white/10 bg-[#0a0a0a] hover:bg-white/[0.03] hover:border-[#0e7490]/30 transition-all duration-500 overflow-hidden"
              >
                {/* Technical Overlay */}
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <GraduationCap className="w-16 h-16 text-white" />
                </div>
                
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-[#0e7490] bg-[#0e7490]/10 px-3 py-1 rounded-full border border-[#0e7490]/20 uppercase tracking-widest">{item.period}</span>
                    <div className="w-2 h-2 rounded-full bg-[#0e7490] shadow-[0_0_10px_#0e7490]" />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-[#0e7490] transition-colors">{item.title}</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{item.institution}</p>
                  </div>
                  
                  <p className="text-sm text-slate-400 leading-relaxed font-light line-clamp-3 group-hover:line-clamp-none transition-all duration-700">{item.description}</p>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    {item.highlights.map((h) => (
                      <Badge key={h} variant="outline" className="text-[9px] font-bold border-white/5 bg-white/5 text-slate-400 uppercase tracking-tighter">{h}</Badge>
                    ))}
                  </div>

                  <button 
                    onClick={() => item.certImage ? setSelectedEdu(item) : null} 
                    className="pt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#0e7490] hover:text-white transition-colors group/btn"
                  >
                    <ExternalLink className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                    Protocolo de Certificación
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Experiencia: Project Modules ── */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-12">
          <motion.div custom={0} variants={fadeUp} className="space-y-2">
            <h2 className="text-sm font-black uppercase tracking-[0.4em] text-[#0e7490]">Proyectos & Despliegues</h2>
            <div className="flex items-center gap-4">
               <h3 className="text-4xl font-bold text-white tracking-tight">Trayectoria <span className="text-[#0e7490]">Ejecutiva</span></h3>
               <div className="h-px flex-1 bg-white/10" />
            </div>
          </motion.div>

          <div className="space-y-6">
            {experience.map((exp, i) => (
              <motion.div 
                key={i} 
                custom={i + 1} 
                variants={fadeUp} 
                className="relative rounded-[2.5rem] p-10 border border-white/10 bg-[#0a0a0a] hover:bg-[#0e7490]/5 transition-all duration-500 group overflow-hidden"
              >
                {/* Background ID */}
                <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Briefcase className="w-64 h-64 text-white" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-10">
                  <div className="md:w-64 shrink-0 space-y-2">
                    <span className="text-[10px] font-black text-[#0e7490] uppercase tracking-[0.3em]">{exp.period}</span>
                    <h3 className="text-2xl font-bold text-white tracking-tight leading-tight">{exp.company}</h3>
                  </div>
                  
                  <div className="h-px md:h-12 w-12 md:w-px bg-white/10" />

                  <div className="flex-1 space-y-4">
                    <h4 className="text-lg font-bold text-white/90 uppercase tracking-widest">{exp.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed font-light max-w-3xl">{exp.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {exp.tags.map((t) => (
                        <Badge key={t} variant="outline" className="text-[9px] font-mono border-white/5 bg-black text-slate-500 uppercase tracking-widest border border-white/10">{t}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Acreditaciones: Engineering Modules ── */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-12">
          <motion.div custom={0} variants={fadeUp} className="space-y-2">
            <h2 className="text-sm font-black uppercase tracking-[0.4em] text-[#0e7490]">Verificación de Competencias</h2>
            <div className="flex items-center gap-4">
               <h3 className="text-4xl font-bold text-white tracking-tight">Certificaciones <span className="text-[#0e7490]">Validadas</span></h3>
               <div className="h-px flex-1 bg-white/10" />
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certifications.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={i}
                  custom={i + 1}
                  variants={fadeUp}
                  onClick={() => setSelectedCert(c)}
                  className="group relative h-48 rounded-[2rem] border border-white/5 bg-[#0a0a0a] hover:border-[#0e7490]/50 transition-all duration-500 cursor-pointer overflow-hidden p-6 flex flex-col justify-between"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0e7490]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#0e7490]/20 transition-colors">
                      <Icon className="w-5 h-5 text-[#0e7490]" />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                      <ExternalLink className="w-4 h-4 text-[#0e7490]" />
                    </div>
                  </div>

                  <div className="relative z-10">
                    <h4 className="text-sm font-black text-white/90 uppercase tracking-widest leading-snug group-hover:text-[#0e7490] transition-colors">{c.title}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">{c.issuer}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ── Dialogs ── */}
        <Dialog open={!!selectedCert} onOpenChange={(open) => !open && setSelectedCert(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-white/10 text-white shadow-[0_0_50px_rgba(14,116,144,0.15)] flex flex-col items-start text-left p-8">
            {selectedCert && (
              <>
                <DialogHeader className="text-left w-full">
                  <DialogTitle className="flex items-center gap-3 text-xl font-light tracking-wide text-white">
                    <selectedCert.icon className="w-6 h-6 text-[#0e7490]" />
                    {selectedCert.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#0e7490] font-mono uppercase tracking-widest mt-2">
                    {selectedCert.issuer}
                  </DialogDescription>
                </DialogHeader>
                <p className="text-sm text-slate-400 leading-relaxed mt-4 font-light">
                  {selectedCert.description}
                </p>
                <div className="mt-6 rounded-xl overflow-hidden border border-white/10 relative w-full">
                  <img src={selectedCert.image} alt={`Certificado ${selectedCert.title}`} className="w-full h-auto" />
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedEdu} onOpenChange={(open) => !open && setSelectedEdu(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-white/10 text-white shadow-[0_0_50px_rgba(14,116,144,0.15)] flex flex-col items-start text-left p-8">
            {selectedEdu && (
              <>
                <DialogHeader className="text-left w-full">
                  <DialogTitle className="flex items-center gap-3 text-xl font-light tracking-wide text-white">
                    <GraduationCap className="w-6 h-6 text-[#0e7490]" />
                    {selectedEdu.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#0e7490] font-mono uppercase tracking-widest mt-2">
                    {selectedEdu.institution}
                  </DialogDescription>
                </DialogHeader>
                <p className="text-sm text-slate-400 leading-relaxed mt-4 font-light whitespace-pre-line">
                  {selectedEdu.description}
                </p>
                {selectedEdu.certImage && (
                  <div className="mt-6 rounded-xl overflow-hidden border border-white/10 relative w-full">
                    <img src={selectedEdu.certImage} alt={`Transcript ${selectedEdu.title}`} className="w-full h-auto" />
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Aptitudes: Technical Core Visual ── */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-12">
           <div className="grid lg:grid-cols-2 gap-16 items-center">
             <motion.div custom={0} variants={fadeUp} className="space-y-10">
               <div className="space-y-4">
                 <h2 className="text-sm font-black uppercase tracking-[0.4em] text-[#0e7490]">Ingeniería de Sistemas</h2>
                 <h3 className="text-5xl font-black text-white tracking-tighter">EL CORE <br/><span className="text-[#0e7490]">TECNOLÓGICO</span></h3>
                 <p className="text-slate-400 font-light leading-relaxed max-w-sm">
                   Dominio de infraestructuras críticas y lenguajes de alto rendimiento. Mi stack está optimizado para la resiliencia y la seguridad post-cuántica.
                 </p>
               </div>

               <div className="flex flex-wrap gap-4">
                 {skills.map((s, i) => {
                   const Icon = s.icon;
                   return (
                     <Tooltip key={s.name}>
                       <TooltipTrigger asChild>
                         <motion.div 
                           initial={{ opacity: 0, scale: 0.9 }}
                           whileInView={{ opacity: 1, scale: 1 }}
                           transition={{ delay: i * 0.05 }}
                           className="px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-[#0e7490]/40 hover:bg-[#0e7490]/5 transition-all cursor-default flex items-center gap-3 backdrop-blur-xl"
                         >
                           <Icon className="w-4 h-4 text-[#0e7490]" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{s.name}</span>
                         </motion.div>
                       </TooltipTrigger>
                       <TooltipContent side="top" className="bg-[#0e7490] text-white border-none text-[10px] font-black tracking-widest uppercase">
                         {s.name}
                       </TooltipContent>
                     </Tooltip>
                   );
                 })}
               </div>
             </motion.div>

             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               whileInView={{ opacity: 1, x: 0 }}
               className="relative lg:h-[400px] flex items-center justify-center p-8"
             >
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-[0.5px] border-dashed border-[#0e7490]/10 rounded-full"
                />
                
                {/* Procedural Network Matrix */}
                <div className="relative z-10 w-full h-full max-w-[300px] max-h-[300px] aspect-square rounded-full overflow-hidden border border-white/5 bg-black/40 backdrop-blur-sm shadow-[0_0_50px_rgba(14,116,144,0.1)] flex items-center justify-center">
                   <svg viewBox="0 0 200 200" className="w-full h-full opacity-40">
                      <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(14,116,144,0.3)" strokeWidth="0.5"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                      
                      {/* Random Connection Lines */}
                      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2 }}>
                        <line x1="40" y1="40" x2="160" y2="160" stroke="#0e7490" strokeWidth="0.5" strokeDasharray="4 4" />
                        <line x1="160" y1="40" x2="40" y2="160" stroke="#0e7490" strokeWidth="0.5" strokeDasharray="4 4" />
                        <line x1="100" y1="20" x2="100" y2="180" stroke="#0e7490" strokeWidth="0.5" strokeDasharray="2 2" />
                      </motion.g>

                      {/* Floating Nodes */}
                      {[
                        { x: 40, y: 40 }, { x: 160, y: 40 }, 
                        { x: 40, y: 160 }, { x: 160, y: 160 },
                        { x: 100, y: 100 }, { x: 100, y: 30 },
                        { x: 170, y: 100 }, { x: 30, y: 100 }
                      ].map((node, idx) => (
                        <motion.circle 
                          key={idx}
                          cx={node.x} cy={node.y} r="2"
                          fill="#0e7490"
                          animate={{ 
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 0.8, 0.3]
                          }}
                          transition={{ 
                            duration: 3 + Math.random() * 2, 
                            delay: Math.random() * 2,
                            repeat: Infinity 
                          }}
                        />
                      ))}
                   </svg>
                </div>
             </motion.div>
           </div>
        </motion.section>
      </main>

      {/* ── Floating social ── */}
      <div className="fixed bottom-6 right-6 flex-col gap-3 z-40 hidden md:flex">
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-[#0e7490] transition-colors shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <Github className="w-5 h-5 text-white" />
        </a>
        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-[#0e7490] transition-colors shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <Linkedin className="w-5 h-5 text-white" />
        </a>
      </div>

    </div>
  );
};

export default Architect;
