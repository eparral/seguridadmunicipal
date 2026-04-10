from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .database import get_db
from .models import Usuario
from . import models

router = APIRouter(prefix="/vehiculos", tags=["vehiculos"])

class ReportePlaca(BaseModel):
    placa: str
    motivo: str
    sector: str
    usuario_id: int


@router.post("/reportar")
def reportar_vehiculo(data: ReportePlaca, db: Session = Depends(get_db)):
    reporte = models.PlacasReporte(
        placa=data.placa.upper(),
        motivo=data.motivo,
        sector=data.sector,
        usuario_id=data.usuario_id
    )
    db.add(reporte)
    db.commit()
    db.refresh(reporte)

    return {
        "ok": True,
        "id": reporte.id,
        "mensaje": "Reporte guardado correctamente"
    }
