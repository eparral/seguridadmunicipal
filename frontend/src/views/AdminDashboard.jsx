import AlertList from "../components/AlertList.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function AdminDashboard({ alerts, health, loading, message, session, onLogout, onRefresh, onUpdateAlert }) {
  const active = alerts.filter((alert) => (alert.status || "activa") === "activa").length;
  const high = alerts.filter((alert) => String(alert.nivel || "1") === "3").length;
  const closed = alerts.filter((alert) => alert.status === "cerrada").length;

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Panel municipal</p>
          <h1>Centro de monitoreo</h1>
          <p className="muted">
            {session.nombre} | {session.role}
          </p>
        </div>
        <div className="admin-actions">
          <StatusBadge health={health} />
          <button className="secondary" onClick={onRefresh} disabled={loading} type="button">
            Actualizar
          </button>
          <button className="secondary danger" onClick={onLogout} type="button">
            Salir
          </button>
        </div>
      </header>

      {message && <p className="notice inline">{message}</p>}

      <section className="summary-grid">
        <MetricCard label="Activas" value={active} tone="red" />
        <MetricCard label="Nivel alto" value={high} tone="blue" />
        <MetricCard label="Cerradas" value={closed} tone="green" />
      </section>

      <section className="panel admin-alerts-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Gestion municipal</p>
            <h2>Alertas registradas</h2>
          </div>
          <span className="counter">{alerts.length}</span>
        </div>
        <AlertList alerts={alerts} admin onUpdateAlert={onUpdateAlert} />
      </section>
    </main>
  );
}

function MetricCard({ label, value, tone }) {
  return (
    <section className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}
