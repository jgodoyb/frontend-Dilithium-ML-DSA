import { useState, useMemo } from "react";
import { motion } from "framer-motion";

import { Search, ShieldQuestion, FileSignature, CreditCard, BookOpen, Mail, Linkedin, Github } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqCategory {
  title: string;
  icon: React.ReactNode;
  items: FaqItem[];
}

const FAQ_DATA: FaqCategory[] = [
  {
    title: "Criptografía y Estándares NIST",
    icon: <ShieldQuestion className="w-4 h-4 text-primary" />,
    items: [
      {
        q: "¿Qué es la Criptografía Post-Cuántica (PQC)?",
        a: "Es una nueva generación de algoritmos diseñados para ser seguros frente a ataques de ordenadores cuánticos. A diferencia de RSA o ECDSA, que se basan en problemas de factorización, la PQC utiliza estructuras matemáticas llamadas 'retículos' (lattices) que incluso los ordenadores cuánticos no pueden resolver de forma eficiente.",
      },
      {
        q: "¿Qué significa ML-DSA?",
        a: "Es el acrónimo de 'Module-Lattice Digital Signature Algorithm'. Es el estándar oficial FIPS 204 del NIST para firmas digitales resistentes a la computación cuántica.",
      },
      {
        q: "¿Qué diferencia hay entre los niveles 44, 65 y 87?",
        a: "Corresponden a las categorías de seguridad 2, 3 y 5 del NIST. ML-DSA-44 ofrece una seguridad equivalente a AES-128, mientras que ML-DSA-87 proporciona el máximo nivel de seguridad (equivalente a AES-256), ideal para infraestructuras críticas.",
      },
      {
        q: "¿Qué es el algoritmo Dilithium?",
        a: "Es el algoritmo original en el que se basa el estándar ML-DSA. Fue seleccionado por su equilibrio perfecto entre velocidad y tamaño de firma.",
      },
    ],
  },
  {
    title: "Firma y Verificación de Documentos",
    icon: <FileSignature className="w-4 h-4 text-primary" />,
    items: [
      {
        q: "¿Por qué necesito un archivo .sig para verificar un documento?",
        a: "El archivo .sig contiene la firma matemática generada con tu clave privada. Sin este archivo, es imposible demostrar que el PDF original no ha sido alterado después de ser firmado.",
      },
      {
        q: "¿Se almacenan mis documentos en sus servidores?",
        a: "No. Implementamos una arquitectura 'Zero-Knowledge'. El procesamiento de firma y verificación ocurre de forma efímera en la sesión; nunca guardamos el contenido de tus documentos PDF. Solo se registra el metadato necesario para la integridad.",
      },
      {
        q: "¿Qué es la 'Contraseña Maestra' y por qué no pueden recuperarla?",
        a: "La contraseña maestra se utiliza para cifrar localmente tu clave privada. Nosotros no la almacenamos por seguridad. Si la pierdes, el acceso a tu identidad digital será irrecuperable, garantizando que nadie pueda suplantarte.",
      },
    ],
  },
  {
    title: "Planes y Soporte",
    icon: <CreditCard className="w-4 h-4 text-primary" />,
    items: [
      {
        q: "¿Es legalmente vinculante esta firma?",
        a: "La plataforma sigue estrictamente las especificaciones técnicas del FIPS 204. Al ser un prototipo de vanguardia, su validez jurídica depende de la adopción de normativas locales sobre firmas post-cuánticas, pero técnicamente ofrece una seguridad superior a las firmas electrónicas actuales.",
      },
      {
        q: "¿Cómo funciona el límite de firmas del plan gratuito?",
        a: "El plan gratuito permite un número limitado de operaciones diarias para que investigadores y desarrolladores puedan testear la tecnología sin coste.",
      },
      {
        q: "¿Puedo integrar este motor en mi propio software?",
        a: "Sí, el plan 'Vanguard' está diseñado para integraciones vía API. Para despliegues 'On-Premise' o corporativos, contacta directamente con el Arquitecto.",
      },
    ],
  },
];

const FaqPage = () => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return FAQ_DATA;
    return FAQ_DATA.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-[calc(100vh-3.5rem)] px-4 pt-14 pb-16"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-3 mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Centro de Conocimiento Post-Cuántico
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Resuelve tus dudas sobre criptografía basada en retículos, el estándar FIPS 204 y nuestra plataforma.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar en las preguntas frecuentes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/50 border-border font-mono text-sm focus:border-primary/50"
          />
        </div>

        {/* Categories */}
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8 font-mono">
            No se encontraron resultados para "{search}"
          </p>
        ) : (
          <div className="space-y-8">
            {filtered.map((cat) => (
              <div key={cat.title}>
                <div className="flex items-center gap-2 mb-3">
                  {cat.icon}
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {cat.title}
                  </h3>
                </div>
                <Accordion type="single" collapsible className="space-y-1">
                  {cat.items.map((item, i) => (
                    <AccordionItem
                      key={i}
                      value={`${cat.title}-${i}`}
                      className="border border-border/50 rounded-lg px-4 bg-card/40 backdrop-blur-sm"
                    >
                      <AccordionTrigger className="text-sm text-foreground hover:no-underline py-4 text-left">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            ¿Tienes una duda técnica más profunda? Contacta con el equipo de ingeniería:
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="mailto:godoyjorgeb@gmail.com"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline underline-offset-2"
            >
              <Mail className="w-3.5 h-3.5" />
              godoyjorgeb@gmail.com
            </a>
            <a
              href="https://www.linkedin.com/in/jorge-godoy-beltr%C3%A1n-068622284/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline underline-offset-2"
            >
              <Linkedin className="w-3.5 h-3.5" />
              LinkedIn
            </a>
            <a
              href="https://github.com/jgodoyb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline underline-offset-2"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FaqPage;
