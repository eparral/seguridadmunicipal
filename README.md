# SeguriRural La Ligua

Proyecto listo para produccion con:

- `frontend/`: React + Vite para Vercel.
- `backend/`: FastAPI para Render.

## Estructura

```text
/project
  /frontend
  /backend
  render.yaml
  .env.example
```

## Backend

Archivo principal:

```text
backend/main.py
```

App FastAPI:

```text
app = FastAPI(...)
```

Comando Render:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Healthcheck:

```text
GET /health
```

Respuesta:

```json
{ "status": "ok" }
```

Variables Render:

```text
ENV=production
AUTO_SEED_DEMO=true
FRONTEND_URL=https://TU-FRONTEND.vercel.app
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME
JWT_SECRET=un-secreto-largo-y-seguro
```

## Frontend

Variables Vercel:

```text
VITE_API_URL=https://TU-BACKEND.onrender.com
VITE_MAPBOX_TOKEN=opcional-si-usas-mapbox
VITE_MAP_CENTER_LAT=-32.4524
VITE_MAP_CENTER_LNG=-71.2311
VITE_MAP_ZOOM=13
```

Build:

```bash
cd frontend
npm install
npm run build
```

## Subir A GitHub

```bash
git add .
git commit -m "prepare production deploy"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

## Deploy Backend En Render

1. Crear repositorio en GitHub y subir el proyecto.
2. Entrar a Render.
3. New > Blueprint.
4. Seleccionar el repositorio.
5. Render detecta `render.yaml`.
6. Configurar variables:

```text
FRONTEND_URL=https://TU-FRONTEND.vercel.app
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME
JWT_SECRET=un-secreto-largo-y-seguro
AUTO_SEED_DEMO=true
```

7. Deploy.
8. Validar:

```text
https://TU-BACKEND.onrender.com/health
```

## Deploy Frontend En Vercel

1. Entrar a Vercel.
2. Add New > Project.
3. Seleccionar el repositorio.
4. Root Directory:

```text
frontend
```

5. Framework Preset:

```text
Vite
```

6. Build Command:

```text
npm run build
```

7. Output Directory:

```text
dist
```

8. Environment Variables:

```text
VITE_API_URL=https://TU-BACKEND.onrender.com
VITE_MAPBOX_TOKEN=opcional-si-usas-mapbox
VITE_MAP_CENTER_LAT=-32.4524
VITE_MAP_CENTER_LNG=-71.2311
VITE_MAP_ZOOM=13
```

9. Deploy.
10. Copiar URL final de Vercel.
11. En Render, actualizar:

```text
FRONTEND_URL=https://TU-FRONTEND.vercel.app
```

12. Redeploy backend.

## Demo Users

Local actual:

```text
vecino@pirque.cl / 123456
paz@pirque.cl / 123456
admin@pirque.cl / 123456
```

Produccion con `AUTO_SEED_DEMO=true`:

```text
vecino@laligua.cl / 123456
paz@laligua.cl / 123456
admin@laligua.cl / 123456
vecino@pirque.cl / 123456
paz@pirque.cl / 123456
admin@pirque.cl / 123456
```

Seed manual opcional:

```bash
cd backend
python seed_demo.py
```

Para cambiar la clave:

```bash
DEMO_PASSWORD=otra-clave-segura python seed_demo.py
```
