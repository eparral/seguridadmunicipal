import AlertList from "../../components/AlertList.jsx";

export default function HomeView({ activeAlerts, alerts, chatMessages, lastSos, onGoTo }) {
  return (
    <div className="home-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Prioridad</p>
          <h2>Respuesta rapida para tu sector</h2>
          <p>Accede a emergencia, reportes comunitarios y chat vecinal desde el menu inferior.</p>
        </div>
        <button className="hero-sos-button" onClick={() => onGoTo("sos")} type="button">
          🚨 EMERGENCIA
        </button>
      </section>

      <section className="home-actions-grid">
        <button className="action-tile critical" onClick={() => onGoTo("sos")} type="button">
          <strong>SOS</strong>
          <span>Enviar emergencia</span>
        </button>
        <button className="action-tile" onClick={() => onGoTo("comunidad")} type="button">
          <strong>Alertar comunidad</strong>
          <span>Informar al sector</span>
        </button>
        <button className="action-tile" onClick={() => onGoTo("comunidad")} type="button">
          <strong>Chat vecinal</strong>
          <span>{chatMessages.length} mensajes</span>
        </button>
      </section>

      {lastSos && (
        <section className="confirmation-card">
          <strong>Ultimo S.O.S simulado</strong>
          <span>
            {lastSos.label} | {lastSos.location.latitude.toFixed(5)}, {lastSos.location.longitude.toFixed(5)}
          </span>
        </section>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Alertas cercanas</p>
            <h2>Actividad del sector</h2>
          </div>
          <span className="counter">{activeAlerts}</span>
        </div>
        <AlertList alerts={alerts.slice(0, 4)} />
      </section>
    </div>
  );
}
