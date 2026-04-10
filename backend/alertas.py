import json
import os
from typing import List, Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import get_db
from .models import AlertaVecinal, ContactoConfianza, FcmToken, Usuario
from .notifications import send_push, send_sms, send_whatsapp

router = APIRouter(prefix="/alertas", tags=["alertas"])

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALG = "HS256"


class AlertaCreate(BaseModel):
    tipo: str  # sos_rojo, amarilla, caminante_stop, sospechoso, etc.
    nivel: Optional[str] = None  # 1,2,3 si se quiere forzar
    lat: Optional[float] = None
    lng: Optional[float] = None
    mensaje: Optional[str] = None
    ruta: Optional[List[dict]] = None  # lista de puntos {lat,lng,ts}
    bateria: Optional[int] = None


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


@router.post("/")
def crear_alerta(
    data: AlertaCreate,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    token = authorization.split(" ")[1]
    usuario = get_current_user(token, db)

    nivel_resuelto = data.nivel or ("3" if data.tipo.startswith("sos") else "1")
    ruta_json = json.dumps(data.ruta) if data.ruta else None

    alerta = AlertaVecinal(
        user_id=usuario.id,
        sector=usuario.sector or "General",
        tipo=data.tipo,
        nivel=nivel_resuelto,
        lat=data.lat,
        lng=data.lng,
        mensaje=data.mensaje,
        ruta=ruta_json,
        bateria=data.bateria,
    )
    db.add(alerta)
    db.commit()
    db.refresh(alerta)

    payload = serialize_alerta(alerta, usuario.nombre)
    notificar(alerta, usuario, db, payload)
    return payload


def notificar(alerta: AlertaVecinal, usuario: Usuario, db: Session, payload: dict):
    # Nivel 1: vecinos del sector (push)
    if alerta.nivel == "1":
        tokens = (
            db.query(FcmToken.token)
            .filter(FcmToken.sector == alerta.sector)
            .all()
        )
        token_list = [t[0] for t in tokens]
        send_push(
            token_list,
            title=f"Alerta en {alerta.sector}",
            body=alerta.mensaje or alerta.tipo,
            data=payload,
        )

    # Nivel 2: contactos de confianza del usuario
    if alerta.nivel == "2":
        contactos = (
            db.query(ContactoConfianza)
            .filter(ContactoConfianza.usuario_id == usuario.id)
            .all()
        )
        phones = [c.telefono for c in contactos]
        text = (
            f"ALERTA {alerta.tipo.upper()} - {usuario.nombre} - "
            f"Ubicacion: {alerta.lat},{alerta.lng} - {alerta.mensaje or ''}"
        )
        send_whatsapp(phones, text)
        send_sms(phones, text)


@router.get("/")
def listar_alertas(
    sector: str,
    tipo: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    authorization: str = Header(default=None),
):
    if not sector:
        raise HTTPException(status_code=400, detail="Sector requerido")

    query = (
        db.query(AlertaVecinal, Usuario)
        .join(Usuario, AlertaVecinal.user_id == Usuario.id)
        .filter(AlertaVecinal.sector == sector)
        .order_by(AlertaVecinal.created_at.desc())
    )
    if tipo:
        query = query.filter(AlertaVecinal.tipo == tipo)

    rows = query.limit(limit).all()
    result = []
    for alerta, usuario in rows:
        result.append(serialize_alerta(alerta, usuario.nombre))
    return result


def serialize_alerta(alerta: AlertaVecinal, nombre_usuario: str):
    return {
        "id": alerta.id,
        "user_id": alerta.user_id,
        "nombre": nombre_usuario,
        "sector": alerta.sector,
        "tipo": alerta.tipo,
        "nivel": alerta.nivel,
        "lat": alerta.lat,
        "lng": alerta.lng,
        "mensaje": alerta.mensaje,
        "ruta": json.loads(alerta.ruta) if alerta.ruta else None,
        "bateria": alerta.bateria,
        "status": alerta.status,
        "created_at": alerta.created_at,
    }
