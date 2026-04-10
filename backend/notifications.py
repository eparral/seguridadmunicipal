"""
Stubs de notificaciones. Sustituye estos metodos por integraciones reales
(Firebase Cloud Messaging, Twilio, WhatsApp Business API).
"""


def send_push(tokens, title, body, data=None):
    if not tokens:
        return
    # TODO: integrar FCM
    print(f"[push] -> {len(tokens)} tokens | {title} | {body} | data={data}")


def send_whatsapp(phones, text):
    if not phones:
        return
    # TODO: integrar WhatsApp Business / Twilio
    print(f"[whatsapp] -> {phones} | {text}")


def send_sms(phones, text):
    if not phones:
        return
    # TODO: integrar SMS (Twilio u operador)
    print(f"[sms] -> {phones} | {text}")
