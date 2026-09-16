import { Shield, Lock } from "lucide-react";

const PrivacyPage = () => (
  <div className="min-h-screen bg-background pt-20 pb-16">
    <article className="max-w-3xl mx-auto px-4 space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Lock className="w-5 h-5" />
          <span className="text-xs font-mono uppercase tracking-widest">Privacidad</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Política de Privacidad</h1>
        <p className="text-sm text-muted-foreground">Última actualización: 8 de marzo de 2026</p>
      </header>

      <div className="prose-custom space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Procesamiento Efímero de Documentos</h2>
          <p>
            Los documentos PDF subidos a la plataforma se procesan de forma <strong className="text-foreground">completamente efímera</strong>.
            Esto significa que los archivos se mantienen en memoria exclusivamente durante el tiempo
            necesario para realizar la operación criptográfica solicitada (firma o verificación) y
            se eliminan inmediatamente después.
          </p>
          <p>
            <strong className="text-foreground">Ningún documento se almacena en el servidor</strong> sin el
            consentimiento expreso del usuario. La plataforma opera bajo un principio de
            <em> Zero-Knowledge</em>: el servidor no retiene ni tiene acceso al contenido de los
            documentos procesados una vez finalizada la operación.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Datos de Registro</h2>
          <p>
            Al crear una cuenta, se recopilan únicamente los datos mínimos necesarios para la
            autenticación: dirección de correo electrónico y nombre completo. Estos datos se
            almacenan de forma segura y cifrada, y no se comparten con terceros bajo ninguna
            circunstancia.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Claves Criptográficas</h2>
          <p>
            Las claves públicas generadas durante el proceso de firma se asocian al perfil del
            usuario para permitir la verificación posterior. Las claves privadas nunca se transmiten
            ni se almacenan en el servidor; su gestión es responsabilidad exclusiva del usuario.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Cookies y Analítica</h2>
          <p>
            La plataforma utiliza únicamente cookies técnicas esenciales para el funcionamiento
            de la sesión de usuario. No se emplean cookies de rastreo, publicidad ni analítica
            de terceros.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Derechos del Usuario</h2>
          <p>
            El usuario puede solicitar en cualquier momento la eliminación completa de su cuenta
            y todos los datos asociados. Para ejercer este derecho, puede contactar al administrador
            de la plataforma a través de los canales indicados en la sección de contacto.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Marco Legal</h2>
          <p>
            Esta política se rige por la legislación española y europea vigente en materia de
            protección de datos, incluyendo el Reglamento General de Protección de Datos (RGPD)
            de la Unión Europea.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-border">
        <div className="flex items-center gap-2 text-muted-foreground/50">
          <Shield className="w-4 h-4" />
          <span className="text-[11px] font-mono">Dilithium ML-DSA · Zero-Knowledge · RGPD Compliant</span>
        </div>
      </div>
    </article>
  </div>
);

export default PrivacyPage;
