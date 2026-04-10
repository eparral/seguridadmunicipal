import os

import jwt
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import get_db
from .models import ContactoConfianza, Usuario

router = APIRouter(prefix="/contactos", tags=["contactos"])

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALG = "HS256"


class ContactoCreate(BaseModel):
    nombre: str
    telefono: str
    canal: str = "whatsapp"  # whatsapp, sms, push


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
def listar_contactos(
    db: Session = Depends(get_db), authorization: str = Header(default="")
):
    usuario = require_token(authorization, db)
    rows = db.query(ContactoConfianza).filter(ContactoConfianza.usuario_id == usuario.id).all()
    return [serialize_contacto(c) for c in rows]


@router.post("/")
def crear_contacto(
    data: ContactoCreate,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    usuario = require_token(authorization, db)
    existentes = db.query(ContactoConfianza).filter(ContactoConfianza.usuario_id == usuario.id).count()
    if existentes >= 3:
        raise HTTPException(status_code=400, detail="Maximo 3 contactos")

    contacto = ContactoConfianza(
        usuario_id=usuario.id,
        nombre=data.nombre.strip(),
        telefono=data.telefono.strip(),
        canal=data.canal.strip() if data.canal else "whatsapp",
    )
    db.add(contacto)
    db.commit()
    db.refresh(contacto)
    return serialize_contacto(contacto)


@router.delete("/{contacto_id}")
def eliminar_contacto(
    contacto_id: int,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    usuario = require_token(authorization, db)
    contacto = (
        db.query(ContactoConfianza)
        .filter(ContactoConfianza.id == contacto_id, ContactoConfianza.usuario_id == usuario.id)
        .first()
    )
    if not contacto:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    db.delete(contacto)
    db.commit()
    return {"ok": True}


def require_token(authorization: str, db: Session) -> Usuario:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    token = authorization.split(" ")[1]
    return get_current_user(token, db)


def serialize_contacto(contacto: ContactoConfianza):
    return {
        "id": contacto.id,
        "nombre": contacto.nombre,
        "telefono": contacto.telefono,
        "canal": contacto.canal,
        "created_at": contacto.created_at,
    }
