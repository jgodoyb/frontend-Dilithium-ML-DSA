import { Shield, FileText } from "lucide-react";

const TermsPage = () => (
  <div className="min-h-screen bg-background pt-20 pb-16">
    <article className="max-w-3xl mx-auto px-4 space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <FileText className="w-5 h-5" />
          <span className="text-xs font-mono uppercase tracking-widest">Legal</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Términos de Servicio</h1>
        <p className="text-sm text-muted-foreground">Última actualización: 8 de marzo de 2026</p>
      </header>

      <div className="prose-custom space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Naturaleza de la Plataforma</h2>
          <p>
            <strong className="text-foreground">Dilithium ML-DSA</strong> es un prototipo de investigación
            criptográfica desarrollado con fines académicos y de demostración tecnológica. La plataforma
            implementa el algoritmo de firma digital ML-DSA (Module-Lattice-Based Digital Signature Algorithm)
            conforme a la especificación <strong className="text-foreground">FIPS 204</strong> publicada por el
            National Institute of Standards and Technology (NIST).
          </p>
          <p>
            Este sistema no constituye un producto comercial certificado y no debe utilizarse como único
            mecanismo de seguridad en entornos de producción sin las auditorías y certificaciones
            correspondientes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Uso Aceptable</h2>
          <p>
            El usuario se compromete a utilizar la plataforma exclusivamente para fines de investigación,
            aprendizaje y evaluación de tecnologías de criptografía post-cuántica. Queda expresamente
            prohibido el uso de la plataforma para actividades ilícitas, ingeniería inversa no autorizada
            o cualquier forma de explotación malintencionada.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Propiedad Intelectual</h2>
          <p>
            El diseño, arquitectura y código fuente de la plataforma son propiedad de su autor,
            Jorge Godoy Beltrán, bajo el marco del proyecto académico <em>Vanguard Code Orbit</em>.
            Los algoritmos criptográficos implementados son de dominio público según la especificación
            del NIST.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Limitación de Responsabilidad</h2>
          <p>
            El autor no garantiza la disponibilidad ininterrumpida del servicio ni la idoneidad de la
            plataforma para ningún propósito específico más allá de la demostración académica. El uso
            de la plataforma se realiza bajo la exclusiva responsabilidad del usuario.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Modificaciones</h2>
          <p>
            Estos términos pueden ser actualizados en cualquier momento. Se recomienda revisar esta
            página periódicamente. El uso continuado de la plataforma tras cualquier modificación
            implica la aceptación de los nuevos términos.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-border">
        <div className="flex items-center gap-2 text-muted-foreground/50">
          <Shield className="w-4 h-4" />
          <span className="text-[11px] font-mono">Dilithium ML-DSA · FIPS 204 · Vanguard Code Orbit</span>
        </div>
      </div>
    </article>
  </div>
);

export default TermsPage;
