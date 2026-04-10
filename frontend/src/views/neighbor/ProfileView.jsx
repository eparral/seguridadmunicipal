import { API_URL } from "../../lib/api.js";
import ProtectionWomanView from "./ProtectionWomanView.jsx";

export default function ProfileView({ activeAlerts, geolocation, session, onLogout, onRefresh }) {
  return (
    <div className="profile-stack mobile-section">
      <section className="panel profile-card">
        <img className="profile-logo" src="/logo-municipalidad-la-ligua.jpg" alt="Municipalidad de La Ligua" />
        <div>
          <p className="eyebrow">Perfil</p>
          <h2>{session.nombre}</h2>
          <p className="muted">{session.sector}</p>
        </div>
      </section>

      <section className="panel profile-details">
        <dl>
          <div>
            <dt>Rol</dt>
            <dd>{session.role}</dd>
          </div>
          <div>
            <dt>Alertas activas</dt>
            <dd>{activeAlerts}</dd>
          </div>
          <div>
            <dt>Backend</dt>
            <dd>{API_URL || "sin configurar"}</dd>
          </div>
        </dl>
      </section>

      <div className="profile-actions">
        <button className="secondary" onClick={onRefresh} type="button">
          Actualizar datos
        </button>
        <button className="secondary danger" onClick={onLogout} type="button">
          Cerrar sesion
        </button>
      </div>

      <ProtectionWomanView geolocation={geolocation} session={session} />
    </div>
  );
}
