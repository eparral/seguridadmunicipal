import logging

from .models import EntregaAlertaProteccion
from .notifications import send_sms, send_whatsapp

logger = logging.getLogger("segurural.proteccion")


def registrar_entregas_proteccion(db, alerta, contactos):
    """Prepara la derivacion municipal y deja lista la integracion SMS/WhatsApp."""
    deliveries = [
        EntregaAlertaProteccion(
            alerta_id=alerta.id,
            destino_tipo="municipal",
            destinatario_nombre="Seguridad municipal",
            canal="dashboard",
            estado="registrada",
            detalle="Alerta prioritaria visible en el panel municipal.",
        )
    ]

    phones = []
    contact_names = []
    message = (
        f"ALERTA PROTECCION MUJER | {alerta.nombre_usuario} | {alerta.tipo_alerta} | "
        f"Sector {alerta.sector} | Ubicacion {alerta.lat},{alerta.lng}"
    )

    for contacto in contactos[:3]:
        deliveries.append(
            EntregaAlertaProteccion(
                alerta_id=alerta.id,
                destino_tipo="contacto",
                destinatario_nombre=contacto.nombre,
                destinatario_telefono=contacto.telefono,
                canal="sms_whatsapp_simulado",
                estado="simulada",
                detalle=(
                    f"Simulacion preparada para SMS/WhatsApp con relacion {contacto.relacion}. "
                    "Sustituir por proveedor real cuando se integre."
                ),
            )
        )
        phones.append(contacto.telefono)
        contact_names.append(contacto.nombre)

    db.add_all(deliveries)

    if phones:
        logger.info("Simulando envio Proteccion Mujer a contactos %s", ", ".join(contact_names))
        send_whatsapp(phones, message)
        send_sms(phones, message)

    return deliveries
