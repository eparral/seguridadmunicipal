import { useCallback, useMemo, useState } from "react";
import LeafletMap from "../../components/LeafletMap.jsx";
import { DEFAULT_MAP_CENTER } from "../../lib/mapConfig.js";

export default function MapView({ alerts, geolocation, sector }) {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const { error, locating, location, requestLocation } = geolocation;

  const visibleAlerts = useMemo(
    () => alerts.filter((alert) => Number.isFinite(Number(alert.lat)) && Number.isFinite(Number(alert.lng))),
    [alerts],
  );

  const center = useMemo(() => {
    if (location) {
      return {
        lat: location.latitude,
        lng: location.longitude,
      };
    }
    if (visibleAlerts[0]) {
      return {
        lat: Number(visibleAlerts[0].lat),
        lng: Number(visibleAlerts[0].lng),
      };
    }
    return DEFAULT_MAP_CENTER;
  }, [location, visibleAlerts]);

  const locateUser = useCallback(() => {
    requestLocation().catch((geoError) => console.info("[map-location]", geoError.message));
  }, [requestLocation]);

  return (
    <section className="panel real-map-panel mobile-section">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Mapa</p>
          <h2>Alertas cercanas</h2>
          <p className="muted">{sector || "Valle Hermoso"}</p>
        </div>
        <button className="secondary locate-button" disabled={locating} onClick={locateUser} type="button">
          {locating ? "Ubicando..." : "Mi ubicacion"}
        </button>
      </div>

      {locating && <p className="notice">Solicitando permiso de ubicacion...</p>}
      {error && <p className="notice danger-notice">{error}</p>}

      <LeafletMap alerts={alerts} center={center} userLocation={location} onSelectAlert={setSelectedAlert} />

      <div className="map-legend">
        <LegendItem label="Salud" tone="salud" />
        <LegendItem label="Robo" tone="robo" />
        <LegendItem label="Incidente" tone="incidente" />
        <LegendItem label="Incendio" tone="incendio" />
      </div>

      {selectedAlert && (
        <article className="map-bottom-sheet">
          <div>
            <strong>{formatType(selectedAlert.tipo)}</strong>
            <span>{selectedAlert.sector || "Sector no informado"}</span>
          </div>
          <p>{selectedAlert.mensaje || "Sin descripcion"}</p>
          <small>{formatTime(selectedAlert.created_at)}</small>
          <button className="secondary" onClick={() => setSelectedAlert(null)} type="button">
            Cerrar
          </button>
        </article>
      )}

      {!visibleAlerts.length && (
        <p className="map-helper">
          Aun no hay alertas recientes con coordenadas. Se muestran puntos de referencia del sector.
        </p>
      )}
    </section>
  );
}

function LegendItem({ label, tone }) {
  return (
    <span className="legend-item">
      <i className={`legend-dot ${tone}`} />
      {label}
    </span>
  );
}

function formatType(type) {
  return String(type || "alerta").replaceAll("_", " ");
}

function formatTime(value) {
  if (!value) return "Hora no informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Hora no informada";
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}
