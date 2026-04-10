import os
from typing import Literal, Optional

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .database import get_db
from .models import AlertaProteccionMujer, ContactoEmergencia, EntregaAlertaProteccion, Usuario
from .proteccion_dispatcher import registrar_entregas_proteccion

try:
    from pydantic import field_validator
except ImportError:  # pydantic v1 compatibility
    from pydantic import validator as field_validator

router = APIRouter(prefix="/proteccion-mujer", tags=["proteccion-mujer"])

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALG = "HS256"
PROTECTION_ALERT_TYPES = {
    "salud": "Salud",
    "incidente": "Incidente",
    "robo_violencia": "Violencia",
    "emergencia_general": "Emergencia general",
}


class ContactoEmergenciaPayload(BaseModel):
    nombre: str = Field(min_length=2, max_length=80)
    telefono: str = Field(min_length=8, max_length=24)
    relacion: str = Field(min_length=2, max_length=60)

    @field_validator("nombre", "telefono", "relacion")
    def clean_value(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Campo requerido")
        return cleaned


class AlertaProteccionCreate(BaseModel):
    tipo_alerta: Literal["salud", "incidente", "robo_violencia", "emergencia_general"]
    lat: float
    lng: float
    mensaje: Optional[str] = None
    captura_frontal: Optional[str] = None


class AlertaProteccionUpdate(BaseModel):
    estado: Optional[str] = None


def get_current_user(token: str, db: Session) -> Usuario:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token invalido")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token invalido")

    usuario = db.query(Usuario).filter(Usuario.id == int(user_id)).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return usuario


def require_user(authorization: str, db: Session) -> Usuario:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    return get_current_user(authorization.split(" ")[1], db)


def require_municipal(authorization: str, db: Session) -> Usuario:
    usuario = require_user(authorization, db)
    if usuario.role not in {"funcionario", "municipal", "admin"}:
        raise HTTPException(status_code=403, detail="Solo municipal")
    return usuario


@router.get("/contactos/")
def listar_contactos(
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    usuario = require_user(authorization, db)
    rows = (
        db.query(ContactoEmergencia)
        .filter(ContactoEmergencia.usuario_id == usuario.id)
        .order_by(ContactoEmergencia.created_at.asc())
        .all()
    )
    return [serialize_contacto(contacto) for contacto in rows]


@router.post("/contactos/")
def crear_contacto(
    data: ContactoEmergenciaPayload,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    usuario = require_user(authorization, db)
    total = db.query(ContactoEmergencia).filter(ContactoEmergencia.usuario_id == usuario.id).count()
    if total >= 3:
        raise HTTPException(status_code=400, detail="Maximo 3 contactos de emergencia")

    contacto = ContactoEmergencia(usuario_id=usuario.id, **payload_to_dict(data))
    db.add(contacto)
    db.commit()
    db.refresh(contacto)
    return serialize_contacto(contacto)


@router.put("/contactos/{contacto_id}")
def actualizar_contacto(
    contacto_id: int,
    data: ContactoEmergenciaPayload,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    usuario = require_user(authorization, db)
    contacto = (
        db.query(ContactoEmergencia)
        .filter(ContactoEmergencia.id == contacto_id, ContactoEmergencia.usuario_id == usuario.id)
        .first()
    )
    if not contacto:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    contacto.nombre = data.nombre
    contacto.telefono = data.telefono
    contacto.relacion = data.relacion
    db.commit()
    db.refresh(contacto)
    return serialize_contacto(contacto)


@router.delete("/contactos/{contacto_id}")
def eliminar_contacto(
    contacto_id: int,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    usuario = require_user(authorization, db)
    contacto = (
        db.query(ContactoEmergencia)
        .filter(ContactoEmergencia.id == contacto_id, ContactoEmergencia.usuario_id == usuario.id)
        .first()
    )
    if not contacto:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    db.delete(contacto)
    db.commit()
    return {"ok": True}


@router.post("/alertas/")
def crear_alerta_proteccion(
    data: AlertaProteccionCreate,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    usuario = require_user(authorization, db)
    captura_tomada = bool(data.captura_frontal)
    mensaje = (data.mensaje or f"Alerta {PROTECTION_ALERT_TYPES[data.tipo_alerta]} activada").strip()
    if captura_tomada and "captura frontal" not in mensaje.lower():
        mensaje = f"{mensaje} | captura frontal registrada"
    contactos = (
        db.query(ContactoEmergencia)
        .filter(ContactoEmergencia.usuario_id == usuario.id)
        .order_by(ContactoEmergencia.created_at.asc())
        .all()
    )

    alerta = AlertaProteccionMujer(
        usuario_id=usuario.id,
        nombre_usuario=usuario.nombre,
        sector=usuario.sector or "General",
        tipo_alerta=data.tipo_alerta,
        lat=data.lat,
        lng=data.lng,
        mensaje=mensaje,
        estado="activa",
        prioridad="alta",
    )
    db.add(alerta)
    db.flush()

    deliveries = registrar_entregas_proteccion(db, alerta, contactos, captura_tomada=captura_tomada)
    db.commit()
    db.refresh(alerta)

    return serialize_alerta(alerta, deliveries, captura_tomada=captura_tomada)


@router.get("/alertas/")
def listar_alertas_proteccion(
    scope: Literal["user", "municipal"] = "user",
    limit: int = 100,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    usuario = require_user(authorization, db)

    query = db.query(AlertaProteccionMujer).order_by(AlertaProteccionMujer.created_at.desc())
    if scope == "municipal":
        if usuario.role not in {"funcionario", "municipal", "admin"}:
            raise HTTPException(status_code=403, detail="Solo municipal")
    else:
        query = query.filter(AlertaProteccionMujer.usuario_id == usuario.id)

    rows = query.limit(limit).all()
    return [serialize_alerta(alerta, load_deliveries(db, alerta.id)) for alerta in rows]


@router.patch("/alertas/{alerta_id}")
def actualizar_alerta_proteccion(
    alerta_id: int,
    data: AlertaProteccionUpdate,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    require_municipal(authorization, db)
    alerta = db.query(AlertaProteccionMujer).filter(AlertaProteccionMujer.id == alerta_id).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    if data.estado:
        alerta.estado = data.estado
    db.commit()
    db.refresh(alerta)
    return serialize_alerta(alerta, load_deliveries(db, alerta.id))


def serialize_contacto(contacto: ContactoEmergencia):
    return {
        "id": contacto.id,
        "nombre": contacto.nombre,
        "telefono": contacto.telefono,
        "relacion": contacto.relacion,
        "created_at": contacto.created_at,
        "updated_at": contacto.updated_at,
    }


def serialize_alerta(
    alerta: AlertaProteccionMujer,
    deliveries: list[EntregaAlertaProteccion] | None = None,
    captura_tomada: bool | None = None,
):
    alert_deliveries = deliveries or []
    contact_deliveries = [delivery for delivery in alert_deliveries if delivery.destino_tipo == "contacto"]
    has_capture = captura_tomada
    if has_capture is None:
        has_capture = "captura frontal" in (alerta.mensaje or "").lower()

    return {
        "id": f"proteccion-{alerta.id}",
        "alert_id": alerta.id,
        "source": "proteccion_mujer",
        "user_id": alerta.usuario_id,
        "nombre": alerta.nombre_usuario,
        "sector": alerta.sector,
        "tipo": alerta.tipo_alerta,
        "tipo_alerta": alerta.tipo_alerta,
        "nivel": "3",
        "lat": alerta.lat,
        "lng": alerta.lng,
        "mensaje": alerta.mensaje,
        "status": alerta.estado,
        "estado": alerta.estado,
        "prioridad": alerta.prioridad,
        "prioritaria": True,
        "created_at": alerta.created_at,
        "timestamp": alerta.created_at,
        "ubicacion": format_location(alerta.lat, alerta.lng),
        "contactos_notificados": len(contact_deliveries),
        "captura_tomada": has_capture,
        "notificaciones": [serialize_delivery(delivery) for delivery in alert_deliveries],
    }


def serialize_delivery(delivery: EntregaAlertaProteccion):
    return {
        "id": delivery.id,
        "destino_tipo": delivery.destino_tipo,
        "destinatario_nombre": delivery.destinatario_nombre,
        "destinatario_telefono": delivery.destinatario_telefono,
        "canal": delivery.canal,
        "estado": delivery.estado,
        "detalle": delivery.detalle,
        "created_at": delivery.created_at,
    }


def format_location(lat: float | None, lng: float | None) -> str:
    if lat is None or lng is None:
        return "Ubicacion no disponible"
    return f"{lat:.5f}, {lng:.5f}"


def load_deliveries(db: Session, alert_id: int):
    return (
        db.query(EntregaAlertaProteccion)
        .filter(EntregaAlertaProteccion.alerta_id == alert_id)
        .order_by(EntregaAlertaProteccion.created_at.asc())
        .all()
    )


def payload_to_dict(model: BaseModel):
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()
