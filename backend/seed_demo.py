import os
from pathlib import Path
import sys

from passlib.context import CryptContext

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import Base, SessionLocal, engine
from backend.models import Usuario

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
]


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
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_users()
    print("Demo users ready")
