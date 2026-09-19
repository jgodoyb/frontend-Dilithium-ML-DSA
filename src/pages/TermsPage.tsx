import { motion } from "framer-motion";
import { Shield, FileText, AlertOctagon, Scale, Mail } from "lucide-react";

const TermsPage = () => (
  <motion.div 
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    className="min-h-screen bg-background pt-24 pb-20"
  >
    <article className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
      {/* Header */}
      <header className="space-y-4 border-b border-border/60 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
          <Scale className="w-4 h-4" />
          <span className="text-xs font-mono uppercase tracking-widest font-semibold">LSSI-CE & Marco Legal B2B</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Aviso Legal y Condiciones Generales de Uso
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
          <span>Última actualización: 19 de septiembre de 2026</span>
          <span>•</span>
          <span>Dominio: www.qproofsystems.es</span>
        </div>
      </header>

      <div className="prose-custom space-y-8 text-sm text-muted-foreground leading-relaxed">
        {/* Sección 1: Datos Identificativos */}
        <section className="space-y-4 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">01.</span> Información Identificativa del Titular (Art. 10 LSSI-CE)
          </h2>
          <div className="space-y-2 text-xs sm:text-sm">
            <p><strong className="text-foreground">Titular del Proyecto:</strong> Jorge Godoy Beltrán</p>
            <p><strong className="text-foreground">Nombre Comercial:</strong> Q-Proof Systems</p>
            <p><strong className="text-foreground">Correo Electrónico Corporativo:</strong> <a href="mailto:godoyjorgeb@gmail.com" className="text-primary hover:underline font-mono">godoyjorgeb@gmail.com</a></p>
            <p><strong className="text-foreground">Dominio Oficial:</strong> www.qproofsystems.es</p>
          </div>

          {/* Cláusula de privacidad sobre NIF y dirección física */}
          <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/60 text-xs space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Shield className="w-4 h-4 text-primary" />
              <span>Transparencia y Protección de Datos Identificativos</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              En cumplimiento del marco normativo aplicable y por motivos de seguridad, prevención contra la suplantación de identidad y protección de la privacidad del titular persona física, el <strong>Número de Identificación Fiscal (NIF)</strong> y el <strong>domicilio fiscal completo</strong> se facilitarán previa solicitud formal motivada por correo electrónico a cualquier interesado legítimo, cliente o autoridad competente a través del canal oficial: <span className="font-mono text-primary font-medium">godoyjorgeb@gmail.com</span>.
            </p>
          </div>
        </section>

        {/* Sección 2: Naturaleza del Proyecto */}
        <section className="space-y-3 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">02.</span> Objeto y Naturaleza Tecnológica de la Plataforma
          </h2>
          <p>
            <strong className="text-foreground">Q-Proof Systems</strong> es una plataforma y prototipo avanzado de investigación, desarrollo e innovación (*Deep Tech / PoC*) enfocado en la transición y evaluación de esquemas de firma digital con criptografía post-cuántica (*Module-Lattice-Based Digital Signature Algorithm - ML-DSA / FIPS 204*), en el marco de iniciativas respaldadas para el Instituto Nacional de Ciberseguridad (INCIBE).
          </p>
          <p>
            El acceso al portal atribuye la condición de usuario e implica la aceptación plena de las presentes condiciones de uso.
          </p>
        </section>

        {/* Sección 3: Condiciones de Uso Aceptable */}
        <section className="space-y-3 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">03.</span> Condiciones de Uso Aceptable
          </h2>
          <p>El usuario se compromete a hacer un uso diligente y lícito de la plataforma, quedando expresamente prohibido:</p>
          <ul className="list-disc list-inside space-y-2 pl-2 text-xs sm:text-sm">
            <li>Utilizar la plataforma para fines ilícitos, lesivos de derechos de terceros o contrarios al orden público.</li>
            <li>Realizar ataques de denegación de servicio (DoS/DDoS), inyección de código malicioso o alteración indebida de los flujos de firma.</li>
            <li>Intentar eludir las medidas de autenticación o vulnerar la integridad de las sesiones de usuario.</li>
            <li>Emplear el prototipo de validación para la firma de contratos críticos o transacciones jurídicas vinculantes de producción sin contar con la preceptiva auditoría y homologación de su infraestructura.</li>
          </ul>
        </section>

        {/* Sección 4: Propiedad Intelectual */}
        <section className="space-y-3 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">04.</span> Propiedad Intelectual e Industrial
          </h2>
          <p>
            <strong className="text-foreground">Algoritmos Criptográficos:</strong> Los algoritmos matemáticos y esquemas de firma ML-DSA (Crystals-Dilithium) implementados corresponden a especificaciones de estándar abierto y de dominio público publicadas por el <em>National Institute of Standards and Technology</em> (NIST - FIPS 204).
          </p>
          <p>
            <strong className="text-foreground">Código, Arquitectura y Marca:</strong> El diseño de la interfaz, componentes de software, arquitectura de cliente Zero-Knowledge, código fuente y elementos gráficos de <strong className="text-foreground">Q-Proof Systems</strong> son titularidad exclusiva de Jorge Godoy Beltrán. Queda prohibida su reproducción o explotación comercial no autorizada.
          </p>
        </section>

        {/* Sección 5: Limitación Estricta de Responsabilidad */}
        <section className="space-y-3 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">05.</span> Exclusión de Garantías y Limitación Estricta de Responsabilidad
          </h2>
          <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-200/90 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>Entorno de Demostración y Validación Tecnológica</span>
            </div>
            <p>
              La plataforma se suministra <strong>«TAL CUAL» (*AS IS*)</strong> sin garantías de ningún tipo, expresas ni implícitas, sobre idoneidad para un fin comercial específico, disponibilidad ininterrumpida o ausencia de errores. El titular no responderá de eventuales daños directos o indirectos, pérdidas de datos o lucro cesante derivados del uso o imposibilidad de uso del servicio.
            </p>
          </div>
        </section>

        {/* Sección 6: Legislación y Jurisdicción */}
        <section className="space-y-3 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">06.</span> Legislación Aplicable y Fuero
          </h2>
          <p>
            El presente Aviso Legal y las relaciones entre el usuario y Q-Proof Systems se regirán por la legislación común española. Salvo disposición legal imperativa en contrario, las partes se someten a los juzgados y tribunales competentes en España.
          </p>
        </section>
      </div>

      {/* Footer del documento */}
      <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-muted-foreground/60 text-xs">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="font-mono">Q-Proof Systems · Aviso Legal LSSI-CE</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          <span>godoyjorgeb@gmail.com</span>
        </div>
      </div>
    </article>
  </motion.div>
);

export default TermsPage;
