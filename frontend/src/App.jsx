import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "./lib/api.js";
import AdminDashboard from "./views/AdminDashboard.jsx";
import LoginView from "./views/LoginView.jsx";
import HomeView from "./views/neighbor/HomeView.jsx";
import MapView from "./views/neighbor/MapView.jsx";
import SosView from "./views/neighbor/SosView.jsx";
import CommunityView from "./views/neighbor/CommunityView.jsx";
import ProfileView from "./views/neighbor/ProfileView.jsx";
import ProtectedWomanDashboard from "./views/neighbor/ProtectedWomanDashboard.jsx";
import BottomNav from "./components/BottomNav.jsx";
import StatusBadge from "./components/StatusBadge.jsx";
import useGeolocation from "./hooks/useGeolocation.js";

const ADMIN_ROLES = new Set(["admin", "funcionario", "municipal"]);
const PROTECTED_WOMAN_ROLES = new Set(["mujer", "mujer_protegida"]);

const emptyAlert = {
  tipo: "amarilla",
  mensaje: "",
};

const navItems = [
  { id: "inicio", label: "Inicio" },
  { id: "mapa", label: "Mapa" },
  { id: "sos", label: "SOS" },
  { id: "comunidad", label: "Comunidad" },
  { id: "perfil", label: "Perfil" },
];

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
  const [activeTab, setActiveTab] = useState("inicio");
  const [lastSos, setLastSos] = useState(null);
  const neighborLocation = useGeolocation();

  const isAdmin = useMemo(() => ADMIN_ROLES.has(session?.role), [session]);
  const isProtectedWoman = useMemo(() => PROTECTED_WOMAN_ROLES.has(session?.role), [session]);
  const activeAlerts = alerts.filter((alert) => (alert.status || "activa") === "activa").length;

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
    if (PROTECTED_WOMAN_ROLES.has(session.role)) return;
    refreshAlerts(session);
    if (!ADMIN_ROLES.has(session.role)) {
      refreshChat(session);
    }
  }, [session]);

  function updateLoginForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function fillDemo(account) {
    setForm({ email: account.email, password: account.password });
    setMessage("");
  }

  function updateAlertForm(event) {
    setAlertForm((current) => ({ ...current, [event.target.name]: event.target.value }));
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

      const loggedAsAdmin = ADMIN_ROLES.has(data.role);
      setSession(data);
      setActiveTab(loggedAsAdmin ? "admin" : "inicio");
      setMessage("");

      if (!loggedAsAdmin) {
        neighborLocation.requestLocation().catch((geoError) => {
          console.info("[login-location]", geoError.message);
        });
      }
    } catch (error) {
      setMessage(error.message || "No se pudo iniciar sesion.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAlerts(currentSession = session) {
    if (!currentSession) return;
    setLoading(true);

    try {
      if (ADMIN_ROLES.has(currentSession.role)) {
        const [vecinalResult, proteccionResult] = await Promise.allSettled([
          apiRequest("/admin/alertas/", { token: currentSession.access_token }),
          apiRequest("/proteccion-mujer/alertas/?scope=municipal", { token: currentSession.access_token }),
        ]);

        const vecinalAlerts = vecinalResult.status === "fulfilled" && Array.isArray(vecinalResult.value) ? vecinalResult.value : [];
        const protectionAlerts =
          proteccionResult.status === "fulfilled" && Array.isArray(proteccionResult.value) ? proteccionResult.value : [];

        if (vecinalResult.status === "rejected") {
          console.error("[admin-alerts:vecinal]", vecinalResult.reason);
        }
        if (proteccionResult.status === "rejected") {
          console.error("[admin-alerts:protection]", proteccionResult.reason);
        }

        setAlerts(sortAlerts([...vecinalAlerts, ...protectionAlerts]));
        return;
      }

      const path = `/alertas/?sector=${encodeURIComponent(currentSession.sector || "General")}`;
      const data = await apiRequest(path, { token: currentSession.access_token });
      setAlerts(sortAlerts(Array.isArray(data) ? data : []));
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

  async function sendCommunityAlert(event) {
    event.preventDefault();
    if (!session || !alertForm.mensaje.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      let alertLocation = neighborLocation.location;

      if (!alertLocation) {
        try {
          alertLocation = await neighborLocation.requestLocation();
        } catch (locationError) {
          console.info("[community-alert-location]", locationError.message);
        }
      }

      await apiRequest("/alertas/", {
        method: "POST",
        token: session.access_token,
        body: JSON.stringify({
          tipo: alertForm.tipo,
          mensaje: alertForm.mensaje.trim(),
          lat: alertLocation?.latitude ?? null,
          lng: alertLocation?.longitude ?? null,
        }),
      });
      setAlertForm(emptyAlert);
      setMessage("Alerta enviada a la comunidad.");
      await refreshAlerts();
    } catch (error) {
      setMessage(error.message || "No se pudo enviar la alerta.");
    } finally {
      setLoading(false);
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

  async function updateAlert(alert, status) {
    if (!session) return;
    setLoading(true);
    setMessage("");

    try {
      const isProtectionAlert = alert?.source === "proteccion_mujer";
      const alertId = alert?.alert_id ?? alert?.id;
      const path = isProtectionAlert ? `/proteccion-mujer/alertas/${alertId}` : `/admin/alertas/${alertId}`;

      await apiRequest(path, {
        method: "PATCH",
        token: session.access_token,
        body: JSON.stringify(isProtectionAlert ? { estado: status } : { status }),
      });
      await refreshAlerts();
    } catch (error) {
      setMessage(error.message || "No se pudo actualizar la alerta.");
    } finally {
      setLoading(false);
    }
  }

  function registerSimulatedSos(result) {
    const simulatedAlert = {
      id: `sos-${Date.now()}`,
      tipo: "sos_rojo",
      status: "simulada",
      sector: session?.sector || "General",
      nivel: "3",
      mensaje: result.label,
      lat: result.location?.latitude,
      lng: result.location?.longitude,
      created_at: new Date().toISOString(),
    };

    setLastSos(result);
    setAlerts((current) => [simulatedAlert, ...current]);
  }

  function logout() {
    setSession(null);
    setAlerts([]);
    setChatMessages([]);
    setMessage("");
    setForm({ email: "", password: "" });
    setActiveTab("inicio");
  }

  if (!session) {
    return (
      <LoginView
        form={form}
        health={health}
        loading={loading}
        message={message}
        onDemoClick={fillDemo}
        onFieldChange={updateLoginForm}
        onSubmit={login}
      />
    );
  }

  if (isAdmin) {
    return (
      <AdminDashboard
        alerts={alerts}
        health={health}
        loading={loading}
        message={message}
        session={session}
        onLogout={logout}
        onRefresh={() => refreshAlerts()}
        onUpdateAlert={updateAlert}
      />
    );
  }

  if (isProtectedWoman) {
    return (
      <ProtectedWomanDashboard
        geolocation={neighborLocation}
        health={health}
        message={message}
        onLogout={logout}
        session={session}
      />
    );
  }

  return (
    <main className="mobile-app">
      <header className="mobile-header">
        <div>
          <p className="eyebrow">Panel vecino</p>
          <h1>{sectionTitle(activeTab)}</h1>
          <p className="muted">{session.sector}</p>
        </div>
        <StatusBadge health={health} />
      </header>

      {message && <p className="notice mobile-notice">{message}</p>}
      {neighborLocation.locating && activeTab !== "mapa" && (
        <p className="notice mobile-notice">Solicitando permiso de ubicacion...</p>
      )}
      {neighborLocation.error && activeTab !== "mapa" && (
        <p className="notice danger-notice mobile-notice">{neighborLocation.error}</p>
      )}

      <section className="mobile-content">
        {activeTab === "inicio" && (
          <HomeView
            activeAlerts={activeAlerts}
            alerts={alerts}
            chatMessages={chatMessages}
            lastSos={lastSos}
            onGoTo={setActiveTab}
          />
        )}

        {activeTab === "mapa" && <MapView alerts={alerts} geolocation={neighborLocation} sector={session.sector} />}

        {activeTab === "sos" && <SosView loading={loading} onSosSent={registerSimulatedSos} />}

        {activeTab === "comunidad" && (
          <CommunityView
            alertForm={alertForm}
            alerts={alerts}
            chatMessages={chatMessages}
            chatText={chatText}
            loading={loading}
            onAlertFieldChange={updateAlertForm}
            onRefreshChat={() => refreshChat()}
            onSendAlert={sendCommunityAlert}
            onSendChat={sendChat}
            setChatText={setChatText}
          />
        )}

        {activeTab === "perfil" && (
          <ProfileView
            activeAlerts={activeAlerts}
            geolocation={neighborLocation}
            session={session}
            onLogout={logout}
            onRefresh={() => {
              refreshAlerts();
              refreshChat();
            }}
          />
        )}
      </section>

      <BottomNav activeTab={activeTab} items={navItems} onChange={setActiveTab} />
    </main>
  );
}

function sectionTitle(activeTab) {
  const titles = {
    inicio: "Inicio",
    mapa: "Mapa",
    sos: "SOS",
    comunidad: "Comunidad",
    perfil: "Perfil",
  };
  return titles[activeTab] || "Inicio";
}

function sortAlerts(items) {
  return [...items].sort((left, right) => {
    const rightTime = new Date(right.created_at || right.timestamp || 0).getTime();
    const leftTime = new Date(left.created_at || left.timestamp || 0).getTime();
    return rightTime - leftTime;
  });
}
