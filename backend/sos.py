# backend/sos.py
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import jwt
import os

from .database import get_db
from .models import Usuario, AlertaSOS

router = APIRouter(prefix="/sos", tags=["sos"])

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALG = "HS256"


class SOSRequest(BaseModel):
    lat: float | None = None
    lng: float | None = None
    mensaje: str | None = "SOS activado"


def get_current_user(
    token: str, db: Session
) -> Usuario:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

    usuario = db.query(Usuario).filter(Usuario.id == int(user_id)).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return usuario


@router.post("/")
def activar_sos(
    data: SOSRequest,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    """
    Espera header: Authorization: Bearer <token>
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")

    token = authorization.split(" ")[1]
    usuario = get_current_user(token, db)

    alerta = AlertaSOS(
        usuario_id=usuario.id,
        sector=usuario.sector,
        lat=data.lat,
        lng=data.lng,
        mensaje=data.mensaje,
    )
    db.add(alerta)
    db.commit()
    db.refresh(alerta)

    return {"ok": True, "alerta_id": alerta.id, "sector": alerta.sector}
