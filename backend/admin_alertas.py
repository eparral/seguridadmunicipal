import os
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import get_db
from .models import AlertaVecinal, Usuario

router = APIRouter(prefix="/admin/alertas", tags=["admin-alertas"])

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALG = "HS256"


class AlertaUpdate(BaseModel):
    status: Optional[str] = None
    asignada_a: Optional[str] = None


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


def require_municipal(authorization: str, db: Session) -> Usuario:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    token = authorization.split(" ")[1]
    usuario = get_current_user(token, db)
    if usuario.role not in {"funcionario", "municipal", "admin"}:
        raise HTTPException(status_code=403, detail="Solo municipal")
    return usuario


@router.get("/")
def listar_alertas_admin(
    status: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    require_municipal(authorization, db)
    q = db.query(AlertaVecinal).order_by(AlertaVecinal.created_at.desc())
    if status:
        q = q.filter(AlertaVecinal.status == status)
    rows = q.limit(limit).all()
    return [serialize_alerta(a) for a in rows]


@router.patch("/{alerta_id}")
def actualizar_alerta(
    alerta_id: int,
    data: AlertaUpdate,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    usuario = require_municipal(authorization, db)
    alerta = db.query(AlertaVecinal).filter(AlertaVecinal.id == alerta_id).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    if data.status:
        alerta.status = data.status
    if data.asignada_a:
        alerta.asignada_a = data.asignada_a
    db.commit()
    db.refresh(alerta)
    return serialize_alerta(alerta)


def serialize_alerta(a: AlertaVecinal):
    return {
        "id": a.id,
        "sector": a.sector,
        "tipo": a.tipo,
        "nivel": a.nivel,
        "lat": a.lat,
        "lng": a.lng,
        "mensaje": a.mensaje,
        "ruta": a.ruta,
        "bateria": a.bateria,
        "status": a.status,
        "asignada_a": a.asignada_a,
        "created_at": a.created_at,
        "user_id": a.user_id,
    }
