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
            <span>{alert.status || "activa"}</span>
          </div>
          <p>{alert.mensaje || "Sin mensaje"}</p>
          <small>
            Sector {alert.sector || "General"} | Nivel {alert.nivel || "1"}
          </small>
          {admin && (
            <div className="actions-row compact">
              <button className="secondary" onClick={() => onUpdateAlert(alert.id, "en_proceso")} type="button">
                En proceso
              </button>
              <button className="secondary" onClick={() => onUpdateAlert(alert.id, "cerrada")} type="button">
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
