import { motion } from "framer-motion";
import { Lock, Shield, ServerOff, KeyRound, UserCheck, AlertTriangle } from "lucide-react";

const PrivacyPage = () => (
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
          <Lock className="w-4 h-4" />
          <span className="text-xs font-mono uppercase tracking-widest font-semibold">RGPD UE 2016/679 & LOPDGDD</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Política de Privacidad y Protección de Datos
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
          <span>Última actualización: 19 de septiembre de 2026</span>
          <span>•</span>
          <span>Dominio: www.qproofsystems.es</span>
        </div>
      </header>

      {/* Zero Knowledge Callout */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-950/30 to-blue-950/20 border border-cyan-500/30 space-y-3">
        <div className="flex items-center gap-3 text-cyan-400 font-semibold text-base">
          <ServerOff className="w-5 h-5 shrink-0" />
          <span>Compromiso Criptográfico de Conocimiento Cero (Zero-Knowledge)</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Los documentos PDF procesados para firma o validación <strong className="text-white">NUNCA se envían a nuestros servidores ni se almacenan en la nube</strong>. Toda la lectura del documento y el cálculo del hash criptográfico se realizan exclusivamente en el navegador de su dispositivo mediante APIs nativas de WebCrypto. El servidor solo procesa el hash (resumen alfanumérico unidireccional) para estampar la firma post-cuántica ML-DSA.
        </p>
      </div>

      <div className="prose-custom space-y-8 text-sm text-muted-foreground leading-relaxed">
        {/* Sección 1 */}
        <section className="space-y-3 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">01.</span> Responsable del Tratamiento
          </h2>
          <div className="space-y-1 text-xs sm:text-sm">
            <p><strong className="text-foreground">Titular:</strong> Jorge Godoy Beltrán (Q-Proof Systems)</p>
            <p><strong className="text-foreground">Identificación y Domicilio:</strong> Datos identificativos (NIF y dirección fiscal) accesibles previa solicitud formal motivada por razones de privacidad y seguridad.</p>
            <p><strong className="text-foreground">Canal de Contacto de Privacidad:</strong> <a href="mailto:godoyjorgeb@gmail.com" className="text-primary hover:underline font-mono">godoyjorgeb@gmail.com</a></p>
            <p><strong className="text-foreground">Proyecto:</strong> Demostración de Ciberseguridad y Criptografía Post-Cuántica (PQC / INCIBE).</p>
          </div>
        </section>

        {/* Sección 2 */}
        <section className="space-y-4 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">02.</span> Mecánica Técnica Zero-Knowledge sobre Documentos
          </h2>
          <p>
            En estricto cumplimiento de los principios de <em>privacidad desde el diseño y por defecto</em> (Art. 25 RGPD) y <em>minimización de datos</em> (Art. 5.1.c RGPD):
          </p>
          <ul className="space-y-3 text-xs sm:text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">a)</span>
              <span><strong className="text-foreground">Procesamiento local en cliente:</strong> La visualización y parsing del archivo PDF se efectúa enteramente en la memoria RAM del navegador del usuario.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">b)</span>
              <span><strong className="text-foreground">Generación del Digest Criptográfico:</strong> El cliente extrae el hash del documento (SHA-256 o Shake-256 según el esquema). Este digest es una función matemática no invertible.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">c)</span>
              <span><strong className="text-foreground">Estampación Post-Cuántica ML-DSA:</strong> El backend recibe única y exclusivamente el valor del hash para generar la firma criptográfica post-cuántica (FIPS 204). El backend es ciego al contenido, contexto, partes o metadatos del documento.</span>
            </li>
          </ul>
        </section>

        {/* Sección 3 */}
        <section className="space-y-4 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">03.</span> Datos Personales Recabados, Finalidad y Base Jurídica
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/60 text-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Datos</th>
                  <th className="p-3">Finalidad</th>
                  <th className="p-3">Base Legitimadora (RGPD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-muted-foreground">
                <tr>
                  <td className="p-3 font-mono text-foreground font-medium">Correo Electrónico y Nombre</td>
                  <td className="p-3">Registro de cuenta, control de autenticación, acceso a la consola de firma y soporte técnico.</td>
                  <td className="p-3"><strong className="text-foreground">Art. 6.1.b RGPD:</strong> Ejecución de la relación de servicio y acceso solicitada por el usuario.</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-foreground font-medium">IP y registros técnicos de conexión</td>
                  <td className="p-3">Control de seguridad perimetral, prevención de ataques de fuerza bruta y limitación de tasa (rate-limiting).</td>
                  <td className="p-3"><strong className="text-foreground">Art. 6.1.f RGPD:</strong> Interés legítimo en asegurar la integridad y disponibilidad de la infraestructura tecnológica.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Sección 4 */}
        <section className="space-y-3 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">04.</span> Encargados de Tratamiento y Proveedores
          </h2>
          <p>
            Para la autenticación y persistencia de usuarios, Q-Proof Systems emplea la infraestructura de <strong className="text-foreground">Supabase Inc.</strong> como encargado de tratamiento, bajo acuerdos conformes con las Cláusulas Contractuales Tipo (SCC) aprobadas por la Comisión Europea y estándares de cifrado en reposo y en tránsito.
          </p>
          <p>
            No se ceden datos personales a terceros con fines comerciales ni se realizan transferencias internacionales fuera del marco de garantías de la UE.
          </p>
        </section>

        {/* Sección 5 */}
        <section className="space-y-3 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">05.</span> Período de Retención
          </h2>
          <p>
            Los datos de cuenta (correo electrónico y nombre) se conservarán mientras el usuario mantenga su cuenta activa. Si el usuario solicita la supresión de su cuenta, los datos serán eliminados de los sistemas activos o bloqueados conforme a los plazos legales de prescripción de responsabilidades.
          </p>
        </section>

        {/* Sección 6 */}
        <section className="space-y-3 bg-card/40 border border-border/40 p-6 rounded-xl">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary font-mono text-xs">06.</span> Ejercicio de Derechos (ARCO-POL)
          </h2>
          <p>
            El usuario puede ejercer en cualquier momento sus derechos de <strong className="text-foreground">Acceso, Rectificación, Supresión, Limitación del Tratamiento, Portabilidad y Oposición</strong> enviando una comunicación escrita por correo electrónico:
          </p>
          <div className="p-4 rounded-lg bg-muted/30 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-foreground font-semibold">Correo de atención de derechos:</p>
              <p className="text-xs font-mono text-primary">godoyjorgeb@gmail.com</p>
              <p className="text-[11px] text-muted-foreground mt-1">Asunto: "Ejercicio Derechos RGPD - [Nombre/Email de cuenta]"</p>
            </div>
            <a
              href="mailto:godoyjorgeb@gmail.com?subject=Ejercicio%20Derechos%20RGPD"
              className="px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-medium transition-colors"
            >
              Contactar por Email
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Asimismo, tiene derecho a recabar la tutela de la <strong className="text-foreground">Agencia Española de Protección de Datos (AEPD)</strong> en <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.aepd.es</a> en caso de considerar vulnerados sus derechos.
          </p>
        </section>
      </div>

      {/* Footer del documento */}
      <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-muted-foreground/60 text-xs">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <span className="font-mono">Zero-Knowledge · FIPS 204 ML-DSA</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>RGPD & LOPDGDD Compliant</span>
        </div>
      </div>
    </article>
  </motion.div>
);

export default PrivacyPage;
