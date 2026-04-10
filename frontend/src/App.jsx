import { useEffect, useMemo, useState } from "react";
import { API_URL, apiRequest } from "./lib/api.js";

const ADMIN_ROLES = new Set(["admin", "funcionario", "municipal"]);

const initialForm = {
  email: "",
  password: "",
};

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [session, setSession] = useState(null);
  const [health, setHealth] = useState("checking");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [alertForm, setAlertForm] = useState({
    tipo: "amarilla",
    mensaje: "",
    lat: "",
    lng: "",
  });

  const isAdmin = useMemo(() => ADMIN_ROLES.has(session?.role), [session]);

  useEffect(() => {
    let active = true;

    async function checkHealth() {
      try {
        await apiRequest("/health");
        if (active) setHealth("online");
      } catch (error) {
        console.error("[health]", error);
        if (active) setHealth("offline");
      }
    }

    checkHealth();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    refreshAlerts(session);
  }, [session]);

  function onFieldChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function onAlertFieldChange(event) {
    setAlertForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password.trim(),
        }),
      });

      setSession(data);
      setMessage(`Sesion iniciada: ${data.nombre}`);
    } catch (error) {
      setMessage(error.message || "No se pudo iniciar sesion.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAlerts(currentSession = session) {
    if (!currentSession) return;
    setLoading(true);
    setMessage("");

    try {
      const path = ADMIN_ROLES.has(currentSession.role)
        ? "/admin/alertas/"
        : `/alertas/?sector=${encodeURIComponent(currentSession.sector || "General")}`;
      const data = await apiRequest(path, { token: currentSession.access_token });
      setAlerts(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error.message || "No se pudieron cargar las alertas.");
    } finally {
      setLoading(false);
    }
  }

  async function createAlert(event) {
    event.preventDefault();
    if (!session) return;

    setLoading(true);
    setMessage("");

    try {
      await apiRequest("/alertas/", {
        method: "POST",
        token: session.access_token,
        body: JSON.stringify({
          tipo: alertForm.tipo,
          mensaje: alertForm.mensaje,
          lat: alertForm.lat ? Number(alertForm.lat) : null,
          lng: alertForm.lng ? Number(alertForm.lng) : null,
        }),
      });

      setAlertForm({
        tipo: "amarilla",
        mensaje: "",
        lat: "",
        lng: "",
      });
      setMessage("Alerta enviada.");
      await refreshAlerts();
    } catch (error) {
      setMessage(error.message || "No se pudo enviar la alerta.");
    } finally {
      setLoading(false);
    }
  }

  async function updateAlert(id, status) {
    if (!session) return;
    setLoading(true);
    setMessage("");

    try {
      await apiRequest(`/admin/alertas/${id}`, {
        method: "PATCH",
        token: session.access_token,
        body: JSON.stringify({ status }),
      });
      setMessage("Alerta actualizada.");
      await refreshAlerts();
    } catch (error) {
      setMessage(error.message || "No se pudo actualizar la alerta.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setSession(null);
    setAlerts([]);
    setMessage("");
    setForm(initialForm);
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="Encabezado">
        <img
          className="municipal-logo"
          src="/logo-municipalidad-la-ligua.jpg"
          alt="Ilustre Municipalidad Comuna de La Ligua"
        />
        <div>
          <p className="eyebrow">SeguriRural</p>
          <h1>Central vecinal La Ligua</h1>
          <p className="api-status" data-state={health}>
            API {health === "online" ? "operativa" : health === "offline" ? "sin conexion" : "verificando"}
          </p>
        </div>
      </section>

      <section className="layout">
        {!session ? (
          <LoginPanel
            form={form}
            loading={loading}
            message={message}
            onFieldChange={onFieldChange}
            onSubmit={login}
          />
        ) : (
          <Dashboard
            alerts={alerts}
            alertForm={alertForm}
            isAdmin={isAdmin}
            loading={loading}
            message={message}
            session={session}
            onAlertFieldChange={onAlertFieldChange}
            onCreateAlert={createAlert}
            onLogout={logout}
            onRefresh={() => refreshAlerts()}
            onUpdateAlert={updateAlert}
          />
        )}
      </section>

      <footer>
        <span>Backend configurado:</span>
        <strong>{API_URL || "sin VITE_API_URL"}</strong>
      </footer>
    </main>
  );
}

function LoginPanel({ form, loading, message, onFieldChange, onSubmit }) {
  return (
    <div className="panel login-panel">
      <div>
        <p className="eyebrow">Acceso seguro</p>
        <h2>Ingresa con tu cuenta</h2>
      </div>

      <form onSubmit={onSubmit} className="form">
        <label>
          Correo
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onFieldChange}
            placeholder="correo@municipalidad.cl"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Contrasena
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onFieldChange}
            placeholder="********"
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Entrar"}
        </button>
      </form>

      {message && <p className="notice">{message}</p>}
    </div>
  );
}

function Dashboard({
  alerts,
  alertForm,
  isAdmin,
  loading,
  message,
  session,
  onAlertFieldChange,
  onCreateAlert,
  onLogout,
  onRefresh,
  onUpdateAlert,
}) {
  return (
    <>
      <div className="panel account-panel">
        <p className="eyebrow">{isAdmin ? "Panel municipal" : "Panel vecino"}</p>
        <h2>{session.nombre}</h2>
        <p>{session.sector}</p>
        <span className="role-pill">{session.role}</span>

        <div className="actions-row">
          <button type="button" className="secondary" onClick={onRefresh} disabled={loading}>
            Actualizar
          </button>
          <button type="button" className="secondary danger" onClick={onLogout}>
            Salir
          </button>
        </div>

        {message && <p className="notice">{message}</p>}
      </div>

      {!isAdmin && (
        <div className="panel">
          <p className="eyebrow">Alerta vecinal</p>
          <h2>Reportar situacion</h2>
          <form className="form" onSubmit={onCreateAlert}>
            <label>
              Tipo
              <select name="tipo" value={alertForm.tipo} onChange={onAlertFieldChange}>
                <option value="amarilla">Amarilla</option>
                <option value="sos_rojo">SOS rojo</option>
                <option value="sospechoso">Sospechoso</option>
              </select>
            </label>

            <label>
              Mensaje
              <textarea
                name="mensaje"
                value={alertForm.mensaje}
                onChange={onAlertFieldChange}
                placeholder="Describe lo ocurrido"
                rows="4"
                required
              />
            </label>

            <div className="two-cols">
              <label>
                Latitud
                <input name="lat" value={alertForm.lat} onChange={onAlertFieldChange} placeholder="-32.45" />
              </label>
              <label>
                Longitud
                <input name="lng" value={alertForm.lng} onChange={onAlertFieldChange} placeholder="-71.23" />
              </label>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar alerta"}
            </button>
          </form>
        </div>
      )}

      <div className="panel alerts-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{isAdmin ? "Operacion" : "Mi sector"}</p>
            <h2>Alertas</h2>
          </div>
          <span className="counter">{alerts.length}</span>
        </div>

        <div className="alerts-list">
          {alerts.length === 0 ? (
            <p className="empty">Sin alertas registradas.</p>
          ) : (
            alerts.map((alert) => (
              <article className="alert-item" key={alert.id}>
                <div>
                  <strong>{alert.tipo}</strong>
                  <span>{alert.sector}</span>
                </div>
                <p>{alert.mensaje || "Sin mensaje"}</p>
                <small>
                  Estado: {alert.status || "activa"} | Nivel: {alert.nivel || "1"}
                </small>
                {isAdmin && (
                  <div className="actions-row compact">
                    <button type="button" className="secondary" onClick={() => onUpdateAlert(alert.id, "en_proceso")}>
                      En proceso
                    </button>
                    <button type="button" className="secondary" onClick={() => onUpdateAlert(alert.id, "cerrada")}>
                      Cerrar
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </>
  );
}
