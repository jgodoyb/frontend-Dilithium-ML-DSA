import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6 text-slate-200 selection:bg-[#0e7490] selection:text-white">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Ilustración / Elemento creativo simpático (Servidor / Cono en cortocircuito) */}
        <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
          {/* Resplandor discreto de fondo */}
          <div className="absolute inset-0 bg-[#0e7490]/15 blur-2xl rounded-full pointer-events-none" />
          
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full text-slate-300 relative z-10 drop-shadow-[0_10px_25px_rgba(14,116,144,0.2)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Cuerpo del servidor desenchufado / roto */}
            <rect x="25" y="35" width="70" height="46" rx="10" className="fill-[#0c0c0c] stroke-slate-700" strokeWidth="3" />
            <line x1="35" y1="58" x2="85" y2="58" className="stroke-slate-800" strokeWidth="2" strokeDasharray="3 3" />
            
            {/* Ojos X X simpáticos */}
            <path d="M42 45L48 51M48 45L42 51" className="stroke-cyan-400" strokeWidth="3" strokeLinecap="round" />
            <path d="M72 45L78 51M78 45L72 51" className="stroke-cyan-400" strokeWidth="3" strokeLinecap="round" />
            
            {/* Boca triste / apenada */}
            <path d="M54 68 Q 60 63 66 68" className="stroke-slate-400" strokeWidth="3" strokeLinecap="round" fill="none" />
            
            {/* Luces del servidor apagadas */}
            <circle cx="34" cy="71" r="2" className="fill-slate-700" />
            <circle cx="40" cy="71" r="2" className="fill-slate-700" />

            {/* Cable de red desenchufado flotando al lado */}
            <path d="M60 81 L 60 96 C 60 102 45 102 45 95 L 45 88" className="stroke-slate-600" strokeWidth="3" strokeLinecap="round" fill="none" />
            <rect x="40" y="83" width="10" height="8" rx="2" className="fill-[#0e7490]" />

            {/* Chispita o zzz diminuta */}
            <path d="M90 32 L94 28 M94 34 L98 30" className="stroke-cyan-400/70" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Mensaje directo y sencillo al estilo Instagram */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Página no disponible
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto font-normal">
            Es posible que el enlace no funcione o que la página se haya trasladado a otro sitio.
          </p>
        </div>

        {/* ÚNICO botón de retorno a la página principal */}
        <div className="pt-2">
          <Button
            asChild
            className="bg-[#0e7490] hover:bg-[#0e7490]/90 text-white font-medium px-7 py-6 rounded-full shadow-[0_4px_20px_rgba(14,116,144,0.3)] hover:shadow-[0_6px_25px_rgba(14,116,144,0.4)] transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2 text-sm"
          >
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a la página principal</span>
            </Link>
          </Button>
        </div>

      </div>
    </div>
  );
};

export default NotFound;
