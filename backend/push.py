import os

import jwt
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import get_db
from .models import FcmToken, Usuario

router = APIRouter(prefix="/push", tags=["push"])

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALG = "HS256"


class PushRegister(BaseModel):
    token: str


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


@router.post("/register")
def register_push(
    data: PushRegister,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    token = authorization.split(" ")[1]
    usuario = get_current_user(token, db)

    exists = db.query(FcmToken).filter(FcmToken.token == data.token).first()
    if exists:
        exists.usuario_id = usuario.id
        exists.sector = usuario.sector
        db.commit()
        return {"ok": True}

    entry = FcmToken(usuario_id=usuario.id, token=data.token, sector=usuario.sector)
    db.add(entry)
    db.commit()
    return {"ok": True}
