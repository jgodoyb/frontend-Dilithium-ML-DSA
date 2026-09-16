import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight, CheckCircle2 } from "lucide-react";

// Variants para las animaciones tipo Consultora (pesadas, sin rebotes exagerados)
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
};

// Hexagon Mask clip-path para darle identidad a Q-Proof. Se diferencia del Chevron de Accenture.
const clipHexSlash = "polygon(0 0, 100% 0, 85% 100%, 0% 100%)";
const clipHexSlashReverse = "polygon(15% 0, 100% 0, 100% 100%, 0% 100%)";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen font-sans selection:bg-[#0e7490] selection:text-white bg-black text-white">
      
      {/* 🔴 SECCIÓN 1: HERO INMERSIVO FULL SCREEN */}
      <section className="relative w-full h-[100svh] min-h-[700px] overflow-hidden bg-black flex items-center">
        
        {/* El Video de Fondo Absoluto */}
        <video 
          src="/hero-showcase.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen"
        />
        
        {/* Capa de recorte/mascara poligonal que añade dramatismo (Negro puro) */}
        <div 
          className="absolute inset-0 bg-black/80 md:w-[65%]"
          style={{ clipPath: clipHexSlash }}
        >
          {/* Un toque sutil del cian corporativo Q-Proof brillando bajo la máscara */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0e7490]/20 to-transparent"></div>
        </div>

        {/* Contenido sobre el vídeo y máscaras */}
        <div className="relative z-10 w-full max-w-[1500px] mx-auto px-6 md:px-12 xl:px-20 pt-20">
          <motion.div 
            className="max-w-4xl"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={fadeUp} className="mb-6">
              <span className="inline-block border-l-4 border-[#0e7490] pl-4 text-[#0e7490] font-bold tracking-[0.2em] uppercase text-sm">
                Next-Gen Infrastructure
              </span>
            </motion.div>

            <motion.h1 
              variants={fadeUp}
              className="text-white text-5xl md:text-7xl lg:text-[90px] font-bold tracking-tighter leading-[1.05] mb-8"
              dangerouslySetInnerHTML={{ __html: "Forjando confianza <br/> en un mundo post-cuántico." }}
            />

            <motion.p 
              variants={fadeUp}
              className="text-slate-300 text-lg md:text-2xl font-light leading-snug max-w-2xl mb-12"
            >
              Implementación inquebrantable del marco criptográfico ML-DSA-65. Seguridad matemática profunda para infraestructuras corporativas y gubernamentales.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => navigate('/tecnologia')}
                className="relative group inline-flex items-center justify-center gap-3 h-14 px-10 mt-4 bg-[#0a0a0a] border border-white/10 hover:border-[#0e7490]/50 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#0e7490]/0 via-[#0e7490]/20 to-[#0e7490]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                <span className="relative z-10 text-white font-mono text-xs tracking-[0.2em] uppercase">Explorar Funciones</span>
                <ArrowRight className="w-4 h-4 text-[#0e7490] group-hover:translate-x-1 transition-transform relative z-10" />
              </button>
            </motion.div>

          </motion.div>
        </div>

        {/* Diagonal Line decorative */}
        <div className="hidden md:block absolute right-[35%] top-0 w-px h-full bg-gradient-to-b from-transparent via-[#0e7490]/50 to-transparent transform -skew-x-[15deg]"></div>

      </section>

      {/* 🔴 TRANSICIÓN CONECTIVA: CORPORATE MARQUEE */}
      <div className="relative w-full py-16 bg-black overflow-hidden flex items-center border-b border-white/5">
        {/* Fade edges */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black via-transparent to-black pointer-events-none w-full"></div>
        
        <motion.div 
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 35 }}
          className="flex whitespace-nowrap text-white/20 font-mono text-[11px] uppercase tracking-[0.6em] font-bold"
        >
          {Array(8).fill("ML-DSA-65 TIER 3 · FIPS 204 STANDARD · LWE LATTICE PROTOCOL · ZERO KNOWLEDGE EXECUTIONS · QUANTUM-RESISTANT · ").map((text, i) => (
             <span key={i}>{text}</span>
          ))}
        </motion.div>
      </div>

      {/* 🔴 SECCIÓN 2: TRANSFORMACIÓN CORPORATIVA */}
      <section className="py-24 md:py-32 bg-black relative z-10">
        <div className="max-w-[1500px] mx-auto px-6 md:px-12 xl:px-20 grid lg:grid-cols-[1fr_1.5fr] gap-16 lg:gap-24">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 1 }}
          >
            <h2 
              className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight mb-6"
              dangerouslySetInnerHTML={{ __html: "El algoritmo de Shor no es una teoría. <br/> Es una línea de tiempo." }}
            />
            <p className="text-lg text-slate-400 font-light leading-relaxed mb-8">
              En la carrera por supremacía computacional, la ventana de seguridad del RSA clásico se cierra rápidamente. Proporcionamos resistencia matemática probada para un mañana incierto.
            </p>
            <div className="w-24 h-1 bg-[#0e7490]"></div>
          </motion.div>

          {/* Grid asimétrico de valores (Offset Layout) */}
          <motion.div 
            variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}
            className="grid sm:grid-cols-2 gap-x-8 gap-y-16"
          >
            <motion.div variants={fadeUp}>
              <h3 className="text-7xl font-bold text-white mb-2 font-mono">01</h3>
              <h4 className="text-2xl font-bold mb-3 border-l-2 border-[#0e7490] pl-4 text-white">Cero Conocimiento</h4>
              <p className="text-slate-400">Su arquitectura se apoya en LWE matemáticos impidiendo falsificaciones algorítmicas, sin compartir datos sensibles.</p>
            </motion.div>
            
            <motion.div variants={fadeUp} className="sm:mt-12">
              <h3 className="text-7xl font-bold text-white mb-2 font-mono">02</h3>
              <h4 className="text-2xl font-bold mb-3 border-l-2 border-white/20 pl-4 text-white">Despliegue Nativo</h4>
              <p className="text-slate-400">Integración invisible en flujos documentales preexistentes, sin sobrecargar la infraestructura del cliente.</p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <h3 className="text-7xl font-bold text-white mb-2 font-mono">03</h3>
              <h4 className="text-2xl font-bold mb-3 border-l-2 border-white/20 pl-4 text-white">Auditable</h4>
              <p className="text-slate-400">Protocolos expuestos transparentemente bajo normativas FIPS 204. No pedimos fe, entregamos evidencia criptográfica.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 🔴 SECCIÓN 3: SHOWCASE DE SOLUCIÓN ASIMÉTRICO */}
      <section className="bg-black py-24 border-y border-white/10 overflow-hidden">
        <div className="max-w-[1500px] mx-auto px-6 md:px-12 xl:px-20">
          
          <div className="grid lg:grid-cols-2 gap-0 relative items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.2 }}
              className="bg-[#0a0a0a] border border-white/10 shadow-2xl text-white p-12 md:p-20 relative z-10 lg:w-[110%]"
              style={{ clipPath: "polygon(0 0, 100% 0, 95% 100%, 0% 100%)" }}
            >
              <h3 className="text-[#0e7490] uppercase tracking-widest text-sm font-bold mb-6">Plataforma Operativa</h3>
              <h2 
                className="text-4xl md:text-5xl font-bold tracking-tight mb-8"
                dangerouslySetInnerHTML={{ __html: "Despliega Firmas <br/> Inquebrantables Hoy." }}
              />
              <p className="text-slate-400 text-lg mb-8 font-light">
                Pasa de la teoría a la práctica. Accede a nuestra infraestructura de firma documental, genera claves blindadas y firma tus archivos localmente en segundos.
              </p>
              <ul className="space-y-4 mb-12">
                {[
                  "Firmado criptográfico 100% local en tu navegador.",
                  "Incrustación de algoritmos ML-DSA (Dilithium).",
                  "Verificación de integridad por servidor seguro."
                ].map((text, i) => (
                  <li key={i} className="flex gap-4 items-center bg-white/5 p-4 rounded-md border border-white/5 hover:border-[#0e7490]/30 transition-colors">
                    <CheckCircle2 className="w-5 h-5 text-[#0e7490] shrink-0" />
                    <span className="text-slate-300 font-light px-1">{text}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={() => navigate('/dashboard/sign')}
                className="group inline-flex items-center gap-3 text-white border-b-2 border-[#0e7490] pb-1 hover:text-[#0e7490] transition-colors"
               >
                <span className="font-semibold text-lg">Acceder al Signature Hub</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1 }}
              className="hidden lg:block relative -left-10 h-full min-h-[500px] w-[110%] bg-black overflow-hidden border border-white/10"
              style={{ clipPath: "polygon(7% 0, 100% 0, 100% 100%, 0% 100%)" }}
            >
              {/* Imagen/Gráfico Abstracto Cuántico de Fondo */}
              <div className="absolute inset-0 bg-black">
                 <div className="w-full h-full bg-[url('/quantum-core.png')] bg-cover bg-center opacity-30 mix-blend-lighten"></div>
                 <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
              </div>

              {/* Consola Dinámica Superpuesta */}
              <div className="absolute inset-0 p-16 pl-24 flex flex-col justify-center pointer-events-none">
                 <div className="bg-[#050505]/80 backdrop-blur-md border border-white/10 rounded-lg p-6 font-mono text-xs text-[#0e7490] overflow-hidden relative shadow-[0_0_30px_rgba(14,116,144,0.15)] h-[320px]">
                    {/* Botones estilo macOS para dar look de ventana */}
                    <div className="flex gap-2 mb-4 pb-4 border-b border-white/10">
                       <div className="w-2.5 h-2.5 rounded-full bg-white/20"></div>
                       <div className="w-2.5 h-2.5 rounded-full bg-white/20"></div>
                       <div className="w-2.5 h-2.5 rounded-full bg-white/20"></div>
                    </div>
                    
                    <motion.div 
                      animate={{ y: [0, -150] }} 
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="space-y-4 opacity-90"
                    >
                       <p className="text-slate-500">{">"} Initializing ML-DSA-65 parameter set...</p>
                       <p>{">"} Status: <span className="text-emerald-400">READY</span></p>
                       <p className="text-slate-500">{">"} Generating lattice polynomials...</p>
                       <p className="text-slate-500">{">"} Expanding seed using SHAKE-256...</p>
                       <p>{">"} Keys generated: <span className="text-amber-400">NTT domain mapped</span></p>
                       <p className="text-slate-500">{">"} Awaiting payload for signing...</p>
                       <p className="text-slate-500">{">"} Processing document hash SHA-384...</p>
                       <p>{">"} Validating signature vector norm...</p>
                       <p>{">"} Signature attached successfully.</p>
                       <p className="text-slate-500">{">"} Connection closed.</p>
                       <br/>
                       {/* Duplicado para efecto seamless loop */}
                       <p className="text-slate-500">{">"} Initializing ML-DSA-65 parameter set...</p>
                       <p>{">"} Status: <span className="text-emerald-400">READY</span></p>
                       <p className="text-slate-500">{">"} Generating lattice polynomials...</p>
                       <p className="text-slate-500">{">"} Expanding seed using SHAKE-256...</p>
                    </motion.div>
                    
                    {/* Vaneishing gradient abajo y arriba para que el texto aparezca/desaparezca suavemente */}
                    <div className="absolute top-[52px] left-0 right-0 h-10 bg-gradient-to-b from-[#050505] to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#050505] to-transparent"></div>
                 </div>
              </div>

            </motion.div>
          </div>

        </div>
      </section>

      {/* 🔴 SECCIÓN 4: VIDEO IMPACTO INFRAESTRUCTURA (NUEVA) */}
      <section className="relative w-full h-[80vh] min-h-[600px] bg-black border-y border-white/10 flex items-center justify-center overflow-hidden">
        {/* Vídeo de fondo */}
        <video 
          src="/quantum-shield.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen"
        />
        
        {/* Degradados de fundido para fusionar los bordes superior/inferior con las demás secciones */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black via-transparent to-black pointer-events-none w-full"></div>
        {/* Oscurecedor central para que resalte el texto */}
        <div className="absolute inset-0 z-10 bg-black/30 pointer-events-none w-full"></div>

        {/* Contenido flotante */}
        <div className="relative z-20 max-w-[1200px] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-white text-xs font-mono font-bold tracking-[0.2em] uppercase mb-8 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
               Nivel de Infraestructura Global
            </span>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight mb-8 drop-shadow-2xl">
              Asegura tus documentos <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#0e7490]">para el próximo milenio.</span>
            </h2>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mt-12">
               <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-xl min-w-[200px]">
                  <div className="text-[#0e7490] font-mono text-2xl lg:text-3xl font-bold mb-2">{'< 1ms'}</div>
                  <div className="text-slate-400 text-xs font-light tracking-widest uppercase">Validación</div>
               </div>
               <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-xl min-w-[200px]">
                  <div className="text-white font-mono text-2xl lg:text-3xl font-bold mb-2">{'Zero'}</div>
                  <div className="text-slate-400 text-xs font-light tracking-widest uppercase">Carga Servidor</div>
               </div>
               <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-xl min-w-[200px]">
                  <div className="text-[#0e7490] font-mono text-2xl lg:text-3xl font-bold mb-2">{'Global'}</div>
                  <div className="text-slate-400 text-xs font-light tracking-widest uppercase">Integración On-Premise</div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 🔴 SECCIÓN 5: EXPLICACIÓN ALGORITMO (ESTILO ACCENTURE) */}
      <section className="relative py-32 bg-black overflow-hidden border-t border-white/5">
        {/* Decoración de fondo al estilo Accenture (Cortes en diagonal) */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[#0e7490]/5 transform skew-x-[-15deg] translate-x-20"></div>
        
        <div className="max-w-[1500px] mx-auto px-6 md:px-12 xl:px-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            >
              <h3 className="text-[#0e7490] uppercase tracking-[0.3em] text-sm font-bold mb-6">Deep Dive: El Núcleo de Q-Proof</h3>
              <h2 className="text-5xl md:text-7xl font-bold tracking-tighter leading-none mb-10">
                La Ciencia Detrás <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0e7490] to-cyan-200">Del Cristal.</span>
              </h2>
              
              <div className="space-y-8">
                <div className="group border-l-2 border-white/10 hover:border-[#0e7490] transition-all duration-500 pl-8 py-4">
                  <h4 className="text-xl font-bold text-white mb-2 group-hover:text-[#0e7490] transition-colors">Criptografía Basada en Retículos (Lattice-Based)</h4>
                  <p className="text-slate-400 font-light leading-relaxed">
                    A diferencia de RSA (basado en números primos), Dilithium basa su seguridad en la complejidad matemática de encontrar el vector más corto en redes multicapa de alta dimensión. Un problema que ni siquiera los ordenadores cuánticos pueden resolver eficientemente.
                  </p>
                </div>
                
                <div className="group border-l-2 border-white/10 hover:border-[#0e7490] transition-all duration-500 pl-8 py-4">
                  <h4 className="text-xl font-bold text-white mb-2 group-hover:text-[#0e7490] transition-colors">Fiat-Shamir con Abortos</h4>
                  <p className="text-slate-400 font-light leading-relaxed">
                    Utiliza una técnica de "rechazo" para asegurar que la firma no revele ninguna información sobre la clave privada. Si un intento de firma es potencialmente inseguro, el algoritmo "aborta" y lo intenta de nuevo en milisegundos hasta lograr una integridad matemática total.
                  </p>
                </div>

                <div className="group border-l-2 border-white/10 hover:border-[#0e7490] transition-all duration-500 pl-8 py-4">
                  <h4 className="text-xl font-bold text-white mb-2 group-hover:text-[#0e7490] transition-colors">Standard ML-DSA (FIPS 204)</h4>
                  <p className="text-slate-400 font-light leading-relaxed">
                    No es una implementación experimental. Es el estándar de oro seleccionado por el NIST para proteger las comunicaciones globales en la era post-cuántica, ofreciendo un equilibrio óptimo entre el tamaño de la firma y la velocidad de procesamiento.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2 }}
              className="relative"
            >
              {/* Gráfico visual abstracto que represente un "Retículo" o "Lattice" */}
              <div className="relative aspect-square w-full max-w-[500px] mx-auto bg-gradient-to-br from-[#0a0a0a] to-[#111] border border-white/10 rounded-2xl p-8 flex items-center justify-center overflow-hidden shadow-2xl">
                {/* Red de puntos animada (Lattice simulation) */}
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-20">
                  {Array(36).fill(0).map((_, i) => (
                    <div key={i} className="border-[0.5px] border-white/20 flex items-center justify-center">
                      <div className="w-1 h-1 bg-[#0e7490] rounded-full"></div>
                    </div>
                  ))}
                </div>
                
                {/* Elemento central "Crystalls" */}
                <div className="relative z-10 w-48 h-48 bg-[#0e7490]/10 border border-[#0e7490]/40 rotate-45 flex items-center justify-center backdrop-blur-3xl transition-transform hover:rotate-[225deg] duration-1000">
                   <div className="w-32 h-32 bg-[#0e7490]/20 border border-[#0e7490]/60 flex items-center justify-center">
                      <div className="w-16 h-16 bg-[#0e7490] blur-[40px] animate-pulse"></div>
                   </div>
                </div>
                
                {/* Textos técnicos flotantes */}
                <div className="absolute top-10 left-10 font-mono text-[10px] text-[#0e7490] opacity-50">V = Σ aᵢbᵢ</div>
                <div className="absolute bottom-10 right-10 font-mono text-[10px] text-[#0e7490] opacity-50">Lattices SIS Problem</div>
              </div>
              
              {/* Elementos decorativos estilo Accent */}
              <div className="absolute -top-10 -right-10 w-40 h-40 border-t-2 border-r-2 border-[#0e7490]/30 -z-10"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 border-b-2 border-l-2 border-[#0e7490]/30 -z-10"></div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 🔴 SECCIÓN 6: SOCIAL PROOF CONSULTING STYLE */}
      <section className="py-24 bg-black border-t border-white/10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
          className="max-w-[1000px] mx-auto px-6 text-center"
        >
           <h3 className="uppercase tracking-[0.2em] text-[#0e7490] text-xs font-bold mb-12">
            ESTÁNDARES Y MARCOS DE SEGURIDAD INTERNACIONAL
          </h3>

          <div className="flex flex-wrap justify-center items-center gap-16 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
             <div className="flex flex-col items-center">
                <span className="text-5xl font-black font-serif tracking-tighter text-white">NIST</span>
             </div>
             
             <div className="flex flex-col items-center">
                <span className="text-3xl font-light tracking-widest text-slate-200 border-2 border-white/20 px-4 py-1">
                  ML-DSA
                </span>
             </div>

             <div className="flex flex-col items-center">
                <span className="text-4xl font-bold font-sans tracking-tight text-white">
                  ISO<span className="font-light">27001</span>
                </span>
             </div>
          </div>
        </motion.div>
      </section>

    </div>
  );
};

export default Index;
