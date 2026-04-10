# Seguridad Pirque - Backend

API basada en FastAPI para autenticacion, reporte de eventos delictivos, boton SOS y gestion de placas sospechosas. Los modulos estan desacoplados para iterar cada servicio de forma independiente.

- `main.py`: arranque del servidor y rutas principales.
- `ocr_service.py`: integracion de OCR/IA para leer patentes.
- `placas.py`: logica de placas sospechosas.
- `sos.py`: flujo de boton de panico.
- `mapa.py`: eventos delictivos para el mapa.
- `usuarios.py`: registro/login y gestion de usuarios.
- `database.py`: conexion a Supabase.
- `models.py`: modelos de datos compartidos.

Configura variables de entorno (`DATABASE_URL`, `TESSERACT_CMD`) en `.env` (puedes partir de `.env.example`) y crea un entorno virtual antes de iniciar.

### Levantar servidor local
Desde la raiz del proyecto (abre la API hacia tu red local para que Expo Go pueda verla):
```
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## OCR (Tesseract)
- Instala Tesseract en Windows: `winget install --id UB-Mannheim.TesseractOCR -e --accept-package-agreements --accept-source-agreements --silent`.
- Define la ruta en `.env`: `TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe` (por defecto ya esta apuntando ahi).
