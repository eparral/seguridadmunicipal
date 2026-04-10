from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class PlacasReporte(Base):
    """Reporte manual de placas sospechosas."""

    __tablename__ = "plates_reports"

    id = Column(Integer, primary_key=True, index=True)
    placa = Column(String, nullable=False, index=True)
    motivo = Column(String)
    sector = Column(String)
    usuario_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Vehiculo(Base):
    """Vehiculos observados por OCR u otras fuentes."""

    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    plate = Column(String, nullable=False, unique=True)
    sector = Column(String)
    sightings = Column(Integer, default=1)
    last_seen = Column(DateTime(timezone=True), server_default=func.now())


class Usuario(Base):
    """Usuarios/vecinos autenticados."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    sector = Column(String)
    telefono = Column(String)
    role = Column(String, default="vecino")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Alerta(Base):
    """Alertas generales para el mapa."""

    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AlertaVecinal(Base):
    """Alertas vecinales con niveles (amarilla, SOS, caminante)."""

    __tablename__ = "alerts_vecinales"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    sector = Column(String, nullable=False)
    tipo = Column(String, nullable=False)  # sos_rojo, amarilla, caminante_stop, etc.
    nivel = Column(String, default="1")  # 1 vecinos, 2 contactos, 3 municipio
    lat = Column(Float)
    lng = Column(Float)
    mensaje = Column(Text)
    ruta = Column(Text)  # JSON string (lista de puntos) cuando aplica
    bateria = Column(Integer)
    status = Column(String, default="activa")
    asignada_a = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ContactoConfianza(Base):
    """Contactos de confianza para alertas de nivel 2."""

    __tablename__ = "trusted_contacts"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    nombre = Column(String, nullable=False)
    telefono = Column(String, nullable=False)
    canal = Column(String, default="whatsapp")  # whatsapp, sms, push
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FcmToken(Base):
    """Tokens de push por usuario (nivel 1 y 2)."""

    __tablename__ = "fcm_tokens"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, nullable=False, unique=True, index=True)
    sector = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AlertaSOS(Base):
    """Alertas del boton de panico."""

    __tablename__ = "sos_alerts"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sector = Column(String, nullable=False)
    lat = Column(Float)
    lng = Column(Float)
    mensaje = Column(String, default="SOS activado")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario")


class ContactoEmergencia(Base):
    """Contactos de emergencia del modulo Proteccion Mujer."""

    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    nombre = Column(String, nullable=False)
    telefono = Column(String, nullable=False)
    relacion = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AlertaProteccionMujer(Base):
    """Alertas prioritarias del modulo Proteccion Mujer."""

    __tablename__ = "protected_alerts"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    nombre_usuario = Column(String, nullable=False)
    sector = Column(String, nullable=False)
    tipo_alerta = Column(String, nullable=False)
    lat = Column(Float)
    lng = Column(Float)
    mensaje = Column(Text)
    estado = Column(String, default="activa")
    prioridad = Column(String, default="alta")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EntregaAlertaProteccion(Base):
    """Registro de derivaciones y simulaciones de contacto para Proteccion Mujer."""

    __tablename__ = "protected_alert_deliveries"

    id = Column(Integer, primary_key=True, index=True)
    alerta_id = Column(Integer, ForeignKey("protected_alerts.id"), nullable=False, index=True)
    destino_tipo = Column(String, nullable=False)  # municipal, contacto
    destinatario_nombre = Column(String, nullable=False)
    destinatario_telefono = Column(String)
    canal = Column(String, nullable=False)  # dashboard, sms, whatsapp
    estado = Column(String, default="simulada")
    detalle = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Mensaje(Base):
    """Mensajes del chat comunitario."""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    sector = Column(String, nullable=False)
    message = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
