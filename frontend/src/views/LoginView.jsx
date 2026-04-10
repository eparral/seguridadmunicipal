import { API_URL } from "../lib/api.js";
import StatusBadge from "../components/StatusBadge.jsx";

const demoAccounts = [
  { label: "Admin", email: "admin@laligua.cl", password: "123456", role: "Centro municipal" },
  { label: "Funcionario", email: "paz@laligua.cl", password: "123456", role: "Paz ciudadana" },
  { label: "Vecino", email: "vecino@laligua.cl", password: "123456", role: "Comunidad" },
  { label: "Mujer", email: "mujer@laligua.cl", password: "123456", role: "Acceso protegido" },
];

export default function LoginView({ form, health, loading, message, onDemoClick, onFieldChange, onSubmit }) {
  return (
    <main className="login-screen">
      <section className="login-brand">
        <img className="brand-logo" src="/logo-municipalidad-la-ligua.jpg" alt="Municipalidad de La Ligua" />
        <div>
          <p className="eyebrow">SeguriRural</p>
          <h1>Central municipal y vecinal</h1>
          <p className="lead">Acceso operativo para vecinos, funcionarias, administradores y mujer protegida.</p>
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
                placeholder="vecino@laligua.cl"
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
