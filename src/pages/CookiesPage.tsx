import { motion } from "framer-motion";
import { Cookie, Shield, CheckCircle2, Lock, ExternalLink } from "lucide-react";

const CookiesPage = () => (
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
          <Cookie className="w-4 h-4" />
          <span className="text-xs font-mono uppercase tracking-widest font-semibold">Cumplimiento LSSI-CE & ePrivacy</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Aviso y Política de Cookies
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
          <span>Última actualización: 19 de septiembre de 2026</span>
          <span>•</span>
          <span>Dominio: www.qproofsystems.es</span>
        </div>
      </header>

      {/* Banner de Exención */}
      <div className="p-5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-200/90 text-sm leading-relaxed flex items-start gap-4">
        <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block font-semibold mb-1">Exención Legal de Consentimiento Previo</strong>
          Esta plataforma utiliza <strong>única y exclusivamente cookies y almacenamiento técnico imprescindible</strong> para gestionar la autenticación y la seguridad de la sesión. Conforme al artículo 22.2 de la LSSI-CE y las directrices de la Agencia Española de Protección de Datos (AEPD), no se requiere banner intrusivo de consentimiento ni panel de configuración al carecer totalmente de rastreo publicitario o analítico.
        </div>
      </div>

      <div className="prose-custom space-y-8 text-sm text-muted-foreground leading-relaxed">
        {/* Sección 1 */}
        <section className="space-y-3 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">01.</span> ¿Qué son las Cookies y Tecnologías Similares?
          </h2>
          <p>
            Una cookie o mecanismo de almacenamiento web (como <em>LocalStorage</em>) es un pequeño fichero de datos que un sitio web almacena en el navegador del usuario para recordar el estado de la sesión, proteger el intercambio de credenciales o habilitar funciones técnicas esenciales de la aplicación.
          </p>
        </section>

        {/* Sección 2 */}
        <section className="space-y-3 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">02.</span> Política Estricta de Cero Rastreo y Cero Analítica
          </h2>
          <p>
            En coherencia con los principios de privacidad desde el diseño de <strong className="text-foreground">Q-Proof Systems</strong>:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><strong className="text-foreground">NO</strong> utilizamos herramientas analíticas de terceros (como Google Analytics, Mixpanel o similares).</li>
            <li><strong className="text-foreground">NO</strong> empleamos píxeles de seguimiento, cookies publicitarias ni tecnologías de retargeting.</li>
            <li><strong className="text-foreground">NO</strong> realizamos elaboración de perfiles comerciales ni vendemos o transferimos telemetría a redes publicitarias.</li>
          </ul>
        </section>

        {/* Sección 3 - Tabla */}
        <section className="space-y-4 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">03.</span> Tecnologías Técnicas Utilizadas en la Plataforma
          </h2>
          <p>
            Las únicas tecnologías de almacenamiento activas son gestionadas por la capa de autenticación y seguridad (<strong className="text-foreground">Supabase</strong>):
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/60 text-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Identificador / Clave</th>
                  <th className="p-3">Proveedor</th>
                  <th className="p-3">Finalidad Técnica</th>
                  <th className="p-3">Caducidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-muted-foreground font-mono">
                <tr>
                  <td className="p-3 font-medium text-foreground">sb-[ref]-auth-token</td>
                  <td className="p-3 font-sans">Supabase (Propia)</td>
                  <td className="p-3 font-sans">Mantenimiento del token JWT de sesión autenticada para validar operaciones seguras de firma.</td>
                  <td className="p-3">Sesión / Persistente hasta logout</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-foreground">sb-refresh-token</td>
                  <td className="p-3 font-sans">Supabase (Propia)</td>
                  <td className="p-3 font-sans">Renovación criptográfica segura de la sesión sin requerir la reintroducción constante de credenciales.</td>
                  <td className="p-3">Persistente hasta revocación</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Sección 4 */}
        <section className="space-y-3 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">04.</span> Gestión y Bloqueo en el Navegador
          </h2>
          <p>
            El usuario tiene la potestad de eliminar o bloquear el almacenamiento local y las cookies mediante la configuración de su navegador web. No obstante, al tratarse de componentes estrictamente necesarios para la autenticación, su bloqueo impedirá el acceso a las funciones privadas de firma y verificación de la plataforma:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              { name: "Google Chrome", url: "https://support.google.com/chrome/answer/95647" },
              { name: "Mozilla Firefox", url: "https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" },
              { name: "Microsoft Edge", url: "https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" },
              { name: "Apple Safari", url: "https://support.apple.com/es-es/guide/safari/sfri11471/mac" },
            ].map((b) => (
              <a
                key={b.name}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-colors text-xs text-foreground group"
              >
                <span>Configurar en {b.name}</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            ))}
          </div>
        </section>
      </div>

      {/* Footer del documento */}
      <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-muted-foreground/60 text-xs">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <span className="font-mono">Q-Proof Systems · Exención Art. 22.2 LSSI-CE</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Cumplimiento ePrivacy & AEPD</span>
        </div>
      </div>
    </article>
  </motion.div>
);

export default CookiesPage;
