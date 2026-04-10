import os
from pathlib import Path
import sys

from passlib.context import CryptContext

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import Base, SessionLocal, engine
from backend.models import ContactoEmergencia, Usuario

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_USERS = [
    {
        "nombre": "Vecino Demo",
        "email": "vecino@laligua.cl",
        "sector": "Valle Hermoso",
        "telefono": "+56911111111",
        "role": "vecino",
    },
    {
        "nombre": "Paz Ciudadana Demo",
        "email": "paz@laligua.cl",
        "sector": "Municipalidad de La Ligua",
        "telefono": "+56922222222",
        "role": "funcionario",
    },
    {
        "nombre": "Administrador Demo",
        "email": "admin@laligua.cl",
        "sector": "Municipalidad de La Ligua",
        "telefono": "+56933333333",
        "role": "admin",
    },
    {
        "nombre": "Vecino Demo Pirque",
        "email": "vecino@pirque.cl",
        "sector": "El Principal",
        "telefono": "+56944444444",
        "role": "vecino",
    },
    {
        "nombre": "Paz Ciudadana Demo Pirque",
        "email": "paz@pirque.cl",
        "sector": "Municipalidad de Pirque",
        "telefono": "+56955555555",
        "role": "funcionario",
    },
    {
        "nombre": "Administrador Demo Pirque",
        "email": "admin@pirque.cl",
        "sector": "Municipalidad de Pirque",
        "telefono": "+56966666666",
        "role": "admin",
    },
]

DEMO_EMERGENCY_CONTACTS = {
    "vecino@laligua.cl": [
        {"nombre": "Ana Perez", "telefono": "+56970000001", "relacion": "Madre"},
        {"nombre": "Carla Soto", "telefono": "+56970000002", "relacion": "Hermana"},
        {"nombre": "Patricia Rojas", "telefono": "+56970000003", "relacion": "Amiga"},
    ],
    "vecino@pirque.cl": [
        {"nombre": "Maria Torres", "telefono": "+56970000004", "relacion": "Madre"},
        {"nombre": "Daniela Ruiz", "telefono": "+56970000005", "relacion": "Hermana"},
        {"nombre": "Camila Diaz", "telefono": "+56970000006", "relacion": "Amiga"},
    ],
}


def seed_demo_users() -> None:
    password = os.getenv("DEMO_PASSWORD", "123456")
    password_hash = pwd_context.hash(password)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for data in DEMO_USERS:
            user = db.query(Usuario).filter(Usuario.email == data["email"]).first()
            if user:
                user.nombre = data["nombre"]
                user.password_hash = password_hash
                user.sector = data["sector"]
                user.telefono = data["telefono"]
                user.role = data["role"]
            else:
                db.add(Usuario(password_hash=password_hash, **data))
        db.commit()

        for email, contacts in DEMO_EMERGENCY_CONTACTS.items():
            user = db.query(Usuario).filter(Usuario.email == email).first()
            if not user:
                continue

            existing = db.query(ContactoEmergencia).filter(ContactoEmergencia.usuario_id == user.id).count()
            if existing:
                continue

            for contact in contacts:
                db.add(ContactoEmergencia(usuario_id=user.id, **contact))

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_users()
    print("Demo users ready")
