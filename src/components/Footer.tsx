import { Link } from "react-router-dom";
import { Github, Linkedin } from "lucide-react";
import { useMockAuth } from "@/contexts/MockAuthContext";

const GITHUB_URL = "https://github.com/jgodoyb";
const LINKEDIN_URL = "https://www.linkedin.com/in/jorge-godoy-beltr%C3%A1n-068622284/";

const LEGAL_LINKS = [
  { label: "Aviso Legal", path: "/legal" },
  { label: "Política de Privacidad", path: "/privacy" },
  { label: "Política de Cookies", path: "/cookies" },
  { label: "Preguntas Frecuentes", path: "/faq" },
];

const Footer = ({ className }: { className?: string }) => {
  const { isAuthenticated } = useMockAuth();

  const navLinks = [
    { label: "Tecnología", path: "/technology" },
    { label: "Autor", path: "/architect" },
    { label: "Verificar", path: "/dashboard/verify" },
    { label: "Planes", path: "/dashboard/plans" },
    ...(isAuthenticated
      ? [
          { label: "Firmar", path: "/signatures" },
          { label: "Buzón", path: "/transfers" },
          { label: "Identidad", path: "/identity" },
        ]
      : []),
  ];

  return (
    <footer className={`relative z-10 bg-[#030303] border-t border-neutral-900 text-neutral-300 ${className || ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="relative flex items-center justify-center w-6 h-6">
                <svg viewBox="0 0 100 100" className="w-full h-full text-[#155e75] fill-current">
                  <polygon points="50 5, 95 25, 95 75, 50 95, 5 75, 5 25" opacity="0.2" />
                  <path d="M50 20 A 30 30 0 1 0 75 66 L 85 76 L 90 71 L 80 61 A 30 30 0 0 0 50 20 Z" />
                  <circle cx="50" cy="50" r="12" fill="none" stroke="currentColor" strokeWidth="8" />
                </svg>
              </div>
              <div className="flex flex-col -gap-1">
                <span className="font-extrabold text-sm leading-none text-white tracking-tight">
                  Q-PROOF
                </span>
                <span className="text-[#0e7490] font-medium text-[7px] leading-tight tracking-[0.2em]">
                  SYSTEMS
                </span>
              </div>
            </Link>
            <p className="text-xs text-neutral-400 font-light leading-relaxed max-w-[240px]">
              Plataforma de firma digital post-cuántica basada en el estándar FIPS 204 del NIST.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Navegación</h4>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {navLinks.map((l) => (
                <li key={l.path}>
                  <Link to={l.path} className="text-xs text-neutral-400 hover:text-white transition-colors whitespace-nowrap">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Legal</h4>
            <ul className="space-y-1.5">
              {LEGAL_LINKS.map((l) => (
                <li key={l.path}>
                  <Link to={l.path} className="text-xs text-neutral-400 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Social</h4>
            <div className="flex gap-2.5">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-700 hover:bg-neutral-800 transition-colors"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-700 hover:bg-neutral-800 transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-4 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 font-mono">
          <p>© 2026 Q-Proof Systems — Desarrollado por Jorge Godoy Beltrán</p>
          <p className="text-neutral-600 mt-2 sm:mt-0">ML-DSA-65 & ML-KEM-768 FIPS Compliant</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
