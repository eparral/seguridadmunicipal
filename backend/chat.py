import os

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import get_db
from .models import Mensaje, Usuario

router = APIRouter(prefix="/chat", tags=["chat"])

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALG = "HS256"


class MessageCreate(BaseModel):
    """Mensaje nuevo para el chat vecinal."""

    message: str


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


@router.get("/")
def listar_mensajes(sector: str, db: Session = Depends(get_db)):
    """Obtiene ultimos mensajes del sector (max 50)."""
    if not sector:
        raise HTTPException(status_code=400, detail="Sector requerido")

    rows = (
        db.query(Mensaje, Usuario)
        .join(Usuario, Mensaje.user_id == Usuario.id)
        .filter(Mensaje.sector == sector)
        .order_by(Mensaje.created_at.desc())
        .limit(50)
        .all()
    )

    # Se devuelven en orden cronologico ascendente.
    formatted = []
    for mensaje, usuario in reversed(rows):
        formatted.append(
            {
                "id": mensaje.id,
                "user_id": mensaje.user_id,
                "nombre": usuario.nombre,
                "sector": mensaje.sector,
                "message": mensaje.message,
                "created_at": mensaje.created_at,
            }
        )
    return formatted


@router.post("/")
def enviar_mensaje(
    data: MessageCreate,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    """Envio de mensaje al chat del sector del usuario autenticado."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")

    token = authorization.split(" ")[1]
    usuario = get_current_user(token, db)

    contenido = (data.message or "").strip()
    if not contenido:
        raise HTTPException(status_code=400, detail="El mensaje no puede ir vacio")

    mensaje = Mensaje(
        user_id=usuario.id,
        sector=usuario.sector or "General",
        message=contenido,
    )
    db.add(mensaje)
    db.commit()
    db.refresh(mensaje)

    return {
        "id": mensaje.id,
        "user_id": mensaje.user_id,
        "nombre": usuario.nombre,
        "sector": mensaje.sector,
        "message": mensaje.message,
        "created_at": mensaje.created_at,
    }
