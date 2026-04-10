import { useEffect, useMemo, useState } from "react";
import { API_URL, apiRequest } from "./lib/api.js";

const ADMIN_ROLES = new Set(["admin", "funcionario", "municipal"]);

const demoAccounts = [
  { label: "Admin", email: "admin@laligua.cl", password: "123456", role: "Centro municipal" },
  { label: "Funcionario", email: "paz@laligua.cl", password: "123456", role: "Paz ciudadana" },
  { label: "Vecino", email: "vecino@laligua.cl", password: "123456", role: "Comunidad" },
];

const adminTabs = [
  { id: "resumen", label: "Resumen" },
  { id: "alertas", label: "Alertas" },
  { id: "mapa", label: "Mapa" },
  { id: "cuenta", label: "Cuenta" },
];

const neighborTabs = [
  { id: "alertas", label: "Alertas cercanas" },
  { id: "chat", label: "Chat vecinal" },
  { id: "sos", label: "S.O.S" },
];

const sectors = ["Centro", "Valle Hermoso", "Placilla", "Los Molles", "Quinquimo", "La Canela"];

const emptyAlert = {
  tipo: "amarilla",
  mensaje: "",
  lat: "",
  lng: "",
};

export default function App() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [session, setSession] = useState(null);
  const [health, setHealth] = useState("checking");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [alertForm, setAlertForm] = useState(emptyAlert);
  const [activeTab, setActiveTab] = useState("alertas");

  const isAdmin = useMemo(() => ADMIN_ROLES.has(session?.role), [session]);
  const activeAlerts = alerts.filter((alert) => (alert.status || "activa") === "activa").length;
  const closedAlerts = alerts.filter((alert) => alert.status === "cerrada").length;
  const highPriorityAlerts = alerts.filter((alert) => String(alert.nivel || "1") === "3").length;

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
    if (!ADMIN_ROLES.has(session.role)) {
      refreshChat(session);
    }
  }, [session]);

  function updateForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updateAlertForm(event) {
    setAlertForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function fillDemo(account) {
    setForm({ email: account.email, password: account.password });
    setMessage("");
  }

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password.trim(),
        }),
      });

      setSession(data);
      setActiveTab(ADMIN_ROLES.has(data.role) ? "resumen" : "alertas");
      setMessage(`Sesion iniciada como ${data.nombre}`);
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

  async function refreshChat(currentSession = session) {
    if (!currentSession) return;

    try {
      const sector = encodeURIComponent(currentSession.sector || "General");
      const data = await apiRequest(`/chat/?sector=${sector}`);
      setChatMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[chat]", error);
      setMessage(error.message || "No se pudo cargar el chat vecinal.");
    }
  }

  async function sendChat(event) {
    event.preventDefault();
    if (!session || !chatText.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      await apiRequest("/chat/", {
        method: "POST",
        token: session.access_token,
        body: JSON.stringify({ message: chatText.trim() }),
      });
      setChatText("");
      await refreshChat();
    } catch (error) {
      setMessage(error.message || "No se pudo enviar el mensaje.");
    } finally {
      setLoading(false);
    }
  }

  async function createAlert(event, override = {}) {
    event?.preventDefault();
    if (!session) return;

    const payload = {
      tipo: override.tipo || alertForm.tipo,
      mensaje: override.mensaje || alertForm.mensaje,
      lat: alertForm.lat ? Number(alertForm.lat) : null,
      lng: alertForm.lng ? Number(alertForm.lng) : null,
    };

    setLoading(true);
    setMessage("");

    try {
      await apiRequest("/alertas/", {
        method: "POST",
        token: session.access_token,
        body: JSON.stringify(payload),
      });

      setAlertForm(emptyAlert);
      setMessage(payload.tipo === "sos_rojo" ? "S.O.S enviado." : "Alerta enviada correctamente.");
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
    setChatMessages([]);
    setMessage("");
    setForm({ email: "", password: "" });
    setActiveTab("alertas");
  }

  if (!session) {
    return (
      <LoginView
        form={form}
        health={health}
        loading={loading}
        message={message}
        onDemoClick={fillDemo}
        onFieldChange={updateForm}
        onSubmit={login}
      />
    );
  }

  return (
    <AppFrame
      activeAlerts={activeAlerts}
      activeTab={activeTab}
      alertForm={alertForm}
      alerts={alerts}
      chatMessages={chatMessages}
      chatText={chatText}
      closedAlerts={closedAlerts}
      health={health}
      highPriorityAlerts={highPriorityAlerts}
      isAdmin={isAdmin}
      loading={loading}
      message={message}
      session={session}
      setActiveTab={setActiveTab}
      setChatText={setChatText}
      onAlertFieldChange={updateAlertForm}
      onCreateAlert={createAlert}
      onLogout={logout}
      onRefresh={() => {
        refreshAlerts();
        if (!isAdmin) refreshChat();
      }}
      onRefreshChat={() => refreshChat()}
      onSendChat={sendChat}
      onUpdateAlert={updateAlert}
    />
  );
}

function LoginView({ form, health, loading, message, onDemoClick, onFieldChange, onSubmit }) {
  return (
    <main className="login-screen">
      <section className="login-brand">
        <img className="brand-logo" src="/logo-municipalidad-la-ligua.jpg" alt="Municipalidad de La Ligua" />
        <div>
          <p className="eyebrow">SeguriRural</p>
          <h1>Central municipal y vecinal</h1>
          <p className="lead">Acceso operativo para vecinos, funcionarios y administradores.</p>
        </div>
      </section>

      <section className="login-grid">
        <div className="panel login-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Acceso seguro</p>
              <h2>Ingresar al sistema</h2>
            </div>
            <StatusBadge health={health} />
          </div>

          <form className="form" onSubmit={onSubmit}>
            <label>
              Correo
              <input
                autoComplete="email"
                name="email"
                onChange={onFieldChange}
                placeholder="admin@laligua.cl"
                required
                type="email"
                value={form.email}
              />
            </label>

            <label>
              Contrasena
              <input
                autoComplete="current-password"
                name="password"
                onChange={onFieldChange}
                placeholder="123456"
                required
                type="password"
                value={form.password}
              />
            </label>

            <button type="submit" disabled={loading}>
              {loading ? "Validando..." : "Entrar"}
            </button>
          </form>

          {message && <p className="notice">{message}</p>}
        </div>

        <div className="panel demo-card">
          <p className="eyebrow">Credenciales demo</p>
          <h2>Accesos disponibles</h2>
          <div className="demo-list">
            {demoAccounts.map((account) => (
              <button className="demo-account" key={account.email} onClick={() => onDemoClick(account)} type="button">
                <span>{account.label}</span>
                <strong>{account.email}</strong>
                <small>{account.role} | clave 123456</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="public-footer">
        <span>Backend configurado:</span>
        <strong>{API_URL || "sin VITE_API_URL"}</strong>
      </footer>
    </main>
  );
}

function AppFrame({
  activeAlerts,
  activeTab,
  alertForm,
  alerts,
  chatMessages,
  chatText,
  closedAlerts,
  health,
  highPriorityAlerts,
  isAdmin,
  loading,
  message,
  session,
  setActiveTab,
  setChatText,
  onAlertFieldChange,
  onCreateAlert,
  onLogout,
  onRefresh,
  onRefreshChat,
  onSendChat,
  onUpdateAlert,
}) {
  const tabs = isAdmin ? adminTabs : neighborTabs;

  return (
    <main className={isAdmin ? "dashboard-shell" : "dashboard-shell neighbor-shell"}>
      <aside className="sidebar">
        <img className="sidebar-logo" src="/logo-municipalidad-la-ligua.jpg" alt="Municipalidad de La Ligua" />
        <div>
          <p className="eyebrow">SeguriRural</p>
          <h1>La Ligua</h1>
        </div>

        <nav className="nav-list" aria-label="Secciones">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? "nav-link active" : "nav-link"}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <StatusBadge health={health} />
          <button className="logout-button" onClick={onLogout} type="button">
            Cerrar sesion
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{isAdmin ? "Panel municipal" : "Panel vecino"}</p>
            <h2>{isAdmin ? "Centro de monitoreo" : "Alertas de vecinos cercanos"}</h2>
            <p className="muted">
              {session.nombre} | {session.sector} | {session.role}
            </p>
          </div>
          <button className="secondary" onClick={onRefresh} disabled={loading} type="button">
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </header>

        {message && <p className="notice inline">{message}</p>}

        {isAdmin && activeTab === "resumen" && (
          <AdminSummary
            activeAlerts={activeAlerts}
            alerts={alerts}
            closedAlerts={closedAlerts}
            highPriorityAlerts={highPriorityAlerts}
            onUpdateAlert={onUpdateAlert}
          />
        )}

        {activeTab === "alertas" && (
          <AlertsView
            alertForm={alertForm}
            alerts={alerts}
            isAdmin={isAdmin}
            loading={loading}
            onAlertFieldChange={onAlertFieldChange}
            onCreateAlert={onCreateAlert}
            onUpdateAlert={onUpdateAlert}
          />
        )}

        {!isAdmin && activeTab === "chat" && (
          <NeighborChat
            chatMessages={chatMessages}
            chatText={chatText}
            loading={loading}
            sector={session.sector}
            setChatText={setChatText}
            onRefreshChat={onRefreshChat}
            onSendChat={onSendChat}
          />
        )}

        {!isAdmin && activeTab === "sos" && <SosView loading={loading} onCreateAlert={onCreateAlert} />}

        {isAdmin && activeTab === "mapa" && <MapView alerts={alerts} />}
        {isAdmin && activeTab === "cuenta" && <AccountView session={session} />}
      </section>
    </main>
  );
}

function AdminSummary({ activeAlerts, alerts, closedAlerts, highPriorityAlerts, onUpdateAlert }) {
  return (
    <div className="summary-grid">
      <MetricCard label="Alertas activas" value={activeAlerts} tone="red" />
      <MetricCard label="Alta prioridad" value={highPriorityAlerts} tone="blue" />
      <MetricCard label="Cerradas" value={closedAlerts} tone="green" />

      <section className="panel activity-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Actividad reciente</p>
            <h2>Ultimos movimientos</h2>
          </div>
          <span className="counter">{alerts.length}</span>
        </div>
        <AlertList alerts={alerts.slice(0, 5)} isAdmin={true} onUpdateAlert={onUpdateAlert} />
      </section>
    </div>
  );
}

function AlertsView({ alertForm, alerts, isAdmin, loading, onAlertFieldChange, onCreateAlert, onUpdateAlert }) {
  if (!isAdmin) {
    return (
      <div className="neighbor-alerts-layout">
        <section className="panel nearby-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Primero</p>
              <h2>Alertas de vecinos cercanos</h2>
            </div>
            <span className="counter">{alerts.length}</span>
          </div>
          <AlertList alerts={alerts} isAdmin={false} onUpdateAlert={onUpdateAlert} />
        </section>

        <section className="panel compact-report-panel">
          <p className="eyebrow">Avisar al sector</p>
          <h2>Nueva alerta</h2>
          <form className="form" onSubmit={onCreateAlert}>
            <label>
              Tipo
              <select name="tipo" value={alertForm.tipo} onChange={onAlertFieldChange}>
                <option value="amarilla">Alerta amarilla</option>
                <option value="sospechoso">Persona o vehiculo sospechoso</option>
              </select>
            </label>

            <label>
              Mensaje
              <textarea
                name="mensaje"
                onChange={onAlertFieldChange}
                placeholder="Describe lo que esta pasando"
                required
                rows="4"
                value={alertForm.mensaje}
              />
            </label>

            <button disabled={loading} type="submit">
              {loading ? "Enviando..." : "Enviar alerta vecinal"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <section className="panel full-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Gestion municipal</p>
          <h2>Alertas registradas</h2>
        </div>
        <span className="counter">{alerts.length}</span>
      </div>
      <AlertList alerts={alerts} isAdmin={true} onUpdateAlert={onUpdateAlert} />
    </section>
  );
}

function NeighborChat({ chatMessages, chatText, loading, sector, setChatText, onRefreshChat, onSendChat }) {
  return (
    <section className="panel chat-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Despues</p>
          <h2>Chat vecinal</h2>
          <p className="muted">Mensajes del sector {sector || "General"}</p>
        </div>
        <button className="secondary" onClick={onRefreshChat} type="button">
          Actualizar chat
        </button>
      </div>

      <div className="chat-list">
        {chatMessages.length === 0 ? (
          <div className="empty-state">
            <strong>Sin mensajes en el sector</strong>
            <span>Escribe el primer aviso para tus vecinos.</span>
          </div>
        ) : (
          chatMessages.map((item) => (
            <article className="chat-message" key={item.id}>
              <strong>{item.nombre || "Vecino"}</strong>
              <p>{item.message}</p>
            </article>
          ))
        )}
      </div>

      <form className="chat-compose" onSubmit={onSendChat}>
        <input
          onChange={(event) => setChatText(event.target.value)}
          placeholder="Escribe un mensaje al sector"
          value={chatText}
        />
        <button disabled={loading || !chatText.trim()} type="submit">
          Enviar
        </button>
      </form>
    </section>
  );
}

function SosView({ loading, onCreateAlert }) {
  return (
    <section className="panel sos-panel">
      <p className="eyebrow">Emergencia</p>
      <h2>S.O.S comunitario</h2>
      <p>
        Usa este boton solo si necesitas avisar inmediatamente a vecinos cercanos y al equipo municipal.
      </p>
      <button
        className="sos-button"
        disabled={loading}
        onClick={(event) =>
          onCreateAlert(event, {
            tipo: "sos_rojo",
            mensaje: "S.O.S activado desde panel vecino",
          })
        }
        type="button"
      >
        {loading ? "Enviando S.O.S..." : "Activar S.O.S"}
      </button>
    </section>
  );
}

function MapView({ alerts }) {
  return (
    <div className="content-grid">
      <section className="panel map-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Mapa operativo</p>
            <h2>Sectorizacion comunal</h2>
          </div>
          <span className="counter">{alerts.length}</span>
        </div>
        <div className="map-board" aria-label="Mapa referencial de sectores">
          {sectors.map((sector, index) => (
            <div className={`sector sector-${index + 1}`} key={sector}>
              <span>{sector}</span>
            </div>
          ))}
          {alerts.slice(0, 6).map((alert, index) => (
            <span
              className={`map-pin level-${alert.nivel || "1"}`}
              key={alert.id || index}
              style={{ left: `${18 + ((index * 13) % 64)}%`, top: `${24 + ((index * 17) % 54)}%` }}
              title={alert.tipo}
            />
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Zonas</p>
        <h2>Priorizacion</h2>
        <div className="sector-list">
          {sectors.map((sector, index) => (
            <div className="sector-row" key={sector}>
              <span>{sector}</span>
              <strong>{index % 3 === 0 ? "Patrullaje" : index % 3 === 1 ? "Normal" : "Observacion"}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AccountView({ session }) {
  return (
    <div className="content-grid">
      <section className="panel account-detail">
        <p className="eyebrow">Cuenta activa</p>
        <h2>{session.nombre}</h2>
        <dl>
          <div>
            <dt>Rol</dt>
            <dd>{session.role}</dd>
          </div>
          <div>
            <dt>Sector</dt>
            <dd>{session.sector}</dd>
          </div>
          <div>
            <dt>ID usuario</dt>
            <dd>{session.usuario_id}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <p className="eyebrow">Backend</p>
        <h2>Conexion</h2>
        <p className="endpoint">{API_URL || "sin VITE_API_URL"}</p>
      </section>
    </div>
  );
}

function AlertList({ alerts, isAdmin, onUpdateAlert }) {
  if (!alerts.length) {
    return (
      <div className="empty-state">
        <strong>Sin alertas cercanas</strong>
        <span>Cuando un vecino reporte algo en tu sector, aparecera aqui.</span>
      </div>
    );
  }

  return (
    <div className="alerts-list">
      {alerts.map((alert) => (
        <article className="alert-item" key={alert.id}>
          <div className="alert-topline">
            <strong>{alert.tipo}</strong>
            <span>{alert.status || "activa"}</span>
          </div>
          <p>{alert.mensaje || "Sin mensaje"}</p>
          <small>
            Sector {alert.sector || "General"} | Nivel {alert.nivel || "1"} | ID {alert.id}
          </small>
          {isAdmin && (
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

function MetricCard({ label, value, tone }) {
  return (
    <section className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function StatusBadge({ health }) {
  const label = health === "online" ? "API operativa" : health === "offline" ? "API sin conexion" : "Verificando API";
  return (
    <span className="status-badge" data-state={health}>
      {label}
    </span>
  );
}
