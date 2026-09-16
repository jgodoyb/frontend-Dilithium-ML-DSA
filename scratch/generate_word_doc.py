# -*- coding: utf-8 -*-
from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

def create_plan():
    doc = Document()
    
    # Estilos
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Arial'
    font.size = Pt(11)

    # Título de la sección
    title = doc.add_heading('05 PRODUCTO O SERVICIO', 0)
    title.alignment = WD_ALIGN_PARAGRAPH.LEFT

    # --- 05.01 ---
    doc.add_heading('05.01 - Descripción técnica - Características y funcionalidades', 1)
    
    p1 = doc.add_paragraph()
    p1.add_run('Q-Proof Systems ').bold = True
    p1.add_run('es una plataforma de seguridad documental de vanguardia diseñada para neutralizar la amenaza inminente de la computación cuántica sobre la criptografía convencional (RSA/ECC). Nuestra arquitectura se fundamenta en el estándar ')
    p1.add_run('NIST FIPS 204').bold = True
    p1.add_run(', implementando el algoritmo de firmas basado en retículos (Lattices) ')
    p1.add_run('ML-DSA (Module-Lattice Digital Signature Algorithm)').bold = True
    p1.add_run(', anteriormente conocido como Dilithium.')

    doc.add_heading('Pilares de la Infraestructura:', 2)
    
    bullets = [
        ('Motor Criptográfico ML-DSA-65:', 'Implementamos el conjunto de parámetros de nivel 3 (equivalente a la seguridad de AES-192), garantizando que las firmas generadas hoy sean resistentes a los ataques del Algoritmo de Shor en un futuro post-cuántico.'),
        ('Arquitectura Zero-Knowledge:', "Priorizamos la privacidad del activo más crítico del cliente: su información. Nuestra plataforma utiliza un enfoque de procesamiento local donde la 'frecuencia matemática' (hash) del documento se calcula en el entorno del cliente. Esto garantiza que el contenido sensible nunca abandone la infraestructura del usuario en formato inteligible."),
        ('Inyección de Metadatos "EOF Seal":', 'Utilizamos una técnica propietaria de inyección de sobres criptográficos al final del archivo (EOF), lo que permite que el PDF sea totalmente compatible con cualquier visor estándar mientras transporta de forma invisible su prueba de integridad cuántica.'),
        ('Cumplimiento Normativo eIDAS 2:', 'Q-Proof ha sido diseñado bajo los preceptos del nuevo reglamento europeo eIDAS 2, permitiendo la trazabilidad absoluta de la identidad digital y garantizando la no repudiación de los documentos firmados.')
    ]
    
    for title_bullet, content in bullets:
        p = doc.add_paragraph(style='List Bullet')
        p.add_run(f'{title_bullet} ').bold = True
        p.add_run(content)

    # --- 05.02 ---
    doc.add_heading('05.02 - MVP y Prototipado (El User Journey)', 1)
    
    doc.add_paragraph('Hemos eliminado la fricción técnica del "Deep Tech". Lo que para el sistema es una operación de álgebra lineal sobre retículos de alta dimensión, para el usuario es una experiencia fluida, visual y minimalista.')

    # Paso 1
    doc.add_heading('Paso 1: Autenticación y Generación Invisible de Claves', 2)
    doc.add_paragraph('El usuario accede a su panel de gestión donde el sistema sincroniza su identidad corporativa con una identidad criptográfica única. En este punto, se generan de forma transparente las claves pública y privada del estándar ML-DSA.')
    doc.add_paragraph('[Insertar Pantallazo de la sección "Identity Panel", mostrando el estado de las claves y la información del usuario]')

    # Paso 2
    doc.add_heading('Paso 2: Subida del documento y procesamiento local', 2)
    doc.add_paragraph('A través de nuestra interfaz "Signature Hub", el usuario arrastra el documento PDF. El sistema valida instantáneamente la integridad del archivo y prepara el entorno local para el sellado matemático.')
    doc.add_paragraph('[Insertar Pantallazo del "Signature Hub" en estado IDLE, con el área de Dropzone y el visual de "Quantum Hub" a la izquierda]')

    # Paso 3
    doc.add_heading('Paso 3: Firma Cuántica', 2)
    doc.add_paragraph('Al ejecutar la acción de firma, el motor Q-Proof aplica el algoritmo sobre el "Lattice" del documento. El usuario visualiza una respuesta inmediata mientras el sistema incrusta el sello digital y genera el documento protegido.')
    doc.add_paragraph('[Insertar Pantallazo del proceso de firma en curso o de éxito, donde se ve el botón "Descargar Archivo Firmado" y el check de éxito en color esmeralda]')

    # Paso 4
    doc.add_heading('Paso 4: Portal de Auditoría y Verificación Pública', 2)
    doc.add_paragraph('Cualquier receptor del documento puede validar su autenticidad en nuestro "Verification Center". El sistema extrae el sobre criptográfico invisible, consulta la clave pública del autor en nuestro nodo institucional y confirma si el documento ha sido alterado.')
    doc.add_paragraph('[Insertar Pantallazo del "Verification Center" mostrando un resultado de "Integridad Criptográfica Verificada" con el check verde y el ID del firmante]')

    # --- 05.03 ---
    doc.add_heading('05.03 - Hoja de Ruta de Desarrollo (Roadmap)', 1)
    
    roadmap = [
        ('Fase 1: MVP Operativo (Finalizada):', 'Despliegue del motor ML-DSA funcional, interfaz de usuario reactiva y portal de verificación pública.'),
        ('Fase 2: Blindaje y Zero-Knowledge Total (Q3 2026):', 'Migración total del procesamiento de hashing a WebWorkers locales y blindaje de claves privadas mediante integración con módulos de seguridad de hardware (HSM) en nube.'),
        ('Fase 3: Pentesting y Beta Cerrada (Q4 2026):', 'Auditoría externa por expertos en criptografía y despliegue para los primeros 5 clientes gubernamentales "Early Adopters".'),
        ('Fase 4: Ecosistema B2B API (Q1 2027):', 'Lanzamiento de la API REST y SDK para que empresas externas integren el sellado cuántico directamente en sus flujos internos (ERP/CRM).')
    ]

    for stage, desc in roadmap:
        p = doc.add_paragraph(style='List Number')
        p.add_run(f'{stage} ').bold = True
        p.add_run(desc)

    # Pie de página CTO
    p_footer = doc.add_paragraph('\n\nDocumento redactado por la Dirección Técnica de Q-Proof Systems.')
    p_footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT

    file_path = "Plan_de_Empresa_QProof_Seccion05.docx"
    doc.save(file_path)
    return file_path

if __name__ == "__main__":
    path = create_plan()
    print(f"Documento generado en: {path}")
