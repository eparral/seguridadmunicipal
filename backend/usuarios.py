# backend/usuarios.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import jwt
import os
from datetime import datetime, timedelta

from .database import get_db
from .models import Usuario

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALG = "HS256"
JWT_EXPIRES_MIN = 60 * 24  # 1 día


class UsuarioRegistro(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    sector: str


class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    nombre: str
    sector: str
    usuario_id: int
    role: str


def create_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_access_token(data: dict, expires_minutes: int = JWT_EXPIRES_MIN):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)


@router.post("/register", response_model=TokenResponse)
def register(user: UsuarioRegistro, db: Session = Depends(get_db)):
    existing = db.query(Usuario).filter(Usuario.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    usuario = Usuario(
        nombre=user.nombre,
        email=user.email,
        password_hash=create_password_hash(user.password),
        sector=user.sector,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    token = create_access_token({"sub": str(usuario.id)})
    return TokenResponse(
        access_token=token,
        nombre=usuario.nombre,
        sector=usuario.sector,
        usuario_id=usuario.id,
        role=usuario.role,
    )


@router.post("/login", response_model=TokenResponse)
def login(user: UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == user.email).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if not verify_password(user.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    token = create_access_token({"sub": str(usuario.id)})
    return TokenResponse(
        access_token=token,
        nombre=usuario.nombre,
        sector=usuario.sector,
        usuario_id=usuario.id,
        role=usuario.role,
    )
