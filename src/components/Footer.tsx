import { Link } from "react-router-dom";
import { Github, Linkedin, Shield } from "lucide-react";

const GITHUB_URL = "https://github.com/jgodoyb";
const LINKEDIN_URL = "https://www.linkedin.com/in/jorge-godoy-beltr%C3%A1n-068622284/";

const Footer = ({ className }: { className?: string }) => {
  return (
    <footer className={`bg-[#030303] border-t border-white/5 text-slate-300 ${className || ""}`}>
      <div className="max-w-7xl mx-auto px-4 py-16 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-[#0e7490]/5 blur-[120px] rounded-[100%] pointer-events-none mix-blend-screen" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
          {/* Brand */}
          <div className="space-y-4">
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
            <p className="text-xs text-slate-400 font-light leading-relaxed max-w-[220px]">
              Plataforma de firma digital post-cuántica basada en el estándar FIPS 204 del NIST.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Navegación</h4>
            <ul className="space-y-2">
              {[
                { label: "Tecnología", path: "/tecnologia" },
                { label: "Portal de Firmas", path: "/dashboard/sign" },
                { label: "Centro de Verificación", path: "/dashboard/verify" },
                { label: "Planes", path: "/dashboard/plans" },
              ].map((l) => (
                <li key={l.path}>
                  <Link to={l.path} className="text-xs text-slate-400 hover:text-[#0e7490] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/legal" className="text-xs text-slate-400 hover:text-[#0e7490] transition-colors">
                  Aviso Legal
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-xs text-slate-400 hover:text-[#0e7490] transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-xs text-slate-400 hover:text-[#0e7490] transition-colors">
                  Política de Cookies
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-xs text-slate-400 hover:text-[#0e7490] transition-colors">
                  Preguntas Frecuentes
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Social</h4>
            <div className="flex gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-black border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-[#0e7490]/50 hover:bg-[#0e7490]/10 transition-colors shadow-[0_0_15px_rgba(0,0,0,0.5)]"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-black border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-[#0e7490]/50 hover:bg-[#0e7490]/10 transition-colors shadow-[0_0_15px_rgba(0,0,0,0.5)]"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-16 pt-8 border-t border-white/5 relative z-10 flex flex-col items-center gap-2">
          <div className="w-6 h-1 bg-[#0e7490]/30 rounded-full" />
          <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase text-center mt-2">
            © 2026 Q-Proof Systems — Desarrollado por Jorge Godoy Beltrán
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
