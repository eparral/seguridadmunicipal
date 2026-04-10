import StatusBadge from "../../components/StatusBadge.jsx";
import ProtectionWomanView from "./ProtectionWomanView.jsx";

export default function ProtectedWomanDashboard({ geolocation, health, message, onLogout, session }) {
  return (
    <main className="protected-dashboard">
      <header className="protected-dashboard-header">
        <div>
          <p className="eyebrow">Acceso protegido</p>
          <h1>Mujer protegida</h1>
          <p className="muted">
            {session.nombre} | {session.sector}
          </p>
        </div>
        <div className="protected-dashboard-actions">
          <StatusBadge health={health} />
          <button className="secondary danger" onClick={onLogout} type="button">
            Cerrar sesion
          </button>
        </div>
      </header>

      {message && <p className="notice inline">{message}</p>}
      {geolocation.error && <p className="notice danger-notice">{geolocation.error}</p>}

      <ProtectionWomanView ctaLabel="S.O.S" geolocation={geolocation} session={session} standalone />
    </main>
  );
}
