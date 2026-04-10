export default function AlertList({ alerts, emptyTitle = "Sin alertas cercanas", admin = false, onUpdateAlert }) {
  if (!alerts.length) {
    return (
      <div className="empty-state">
        <strong>{emptyTitle}</strong>
        <span>Cuando exista actividad relevante, aparecera aqui.</span>
      </div>
    );
  }

  return (
    <div className="alerts-list">
      {alerts.map((alert) => (
        <article className="alert-item" key={alert.id}>
          <div className="alert-topline">
            <strong>{formatType(alert.tipo)}</strong>
            <span>{alert.status || alert.estado || "activa"}</span>
          </div>
          {alert.nombre && <strong className="alert-user">{alert.nombre}</strong>}
          <p>{alert.mensaje || "Sin mensaje"}</p>
          <small>{buildMeta(alert, admin)}</small>
          {alert.prioritaria && <span className="alert-priority">Prioritaria</span>}
          {alert.captura_tomada && <span className="alert-priority alert-evidence">Captura frontal</span>}
          {admin && (
            <div className="actions-row compact">
              <button className="secondary" onClick={() => onUpdateAlert(alert, "en_proceso")} type="button">
                En proceso
              </button>
              <button className="secondary" onClick={() => onUpdateAlert(alert, "cerrada")} type="button">
                Cerrar
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function formatType(type) {
  return String(type || "alerta").replaceAll("_", " ");
}

function buildMeta(alert, admin) {
  const parts = [];

  if (alert.sector) {
    parts.push(`Sector ${alert.sector}`);
  }

  if (!admin && alert.nivel) {
    parts.push(`Nivel ${alert.nivel}`);
  }

  if (admin && alert.ubicacion) {
    parts.push(`Ubicacion ${alert.ubicacion}`);
  } else if (admin && hasCoordinates(alert)) {
    parts.push(`Ubicacion ${Number(alert.lat).toFixed(5)}, ${Number(alert.lng).toFixed(5)}`);
  }

  const time = formatTime(alert.created_at || alert.timestamp);
  if (time) {
    parts.push(time);
  }

  return parts.join(" | ");
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function hasCoordinates(alert) {
  return Number.isFinite(Number(alert.lat)) && Number.isFinite(Number(alert.lng));
}
