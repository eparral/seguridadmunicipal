export default function ProtectionAlertButton({
  badgeLabel,
  contactCount,
  ctaLabel = "Activar alerta",
  locating,
  loading,
  onClick,
  standalone = false,
  subtitle = "Derivacion inmediata a seguridad municipal y a tus contactos configurados.",
  title = "Mujer protegida",
}) {
  return (
    <section className={standalone ? "panel protection-hero-panel protection-hero-panel-standalone" : "panel protection-hero-panel"}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{badgeLabel || "Proteccion Mujer"}</p>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
        </div>
        <span className="counter">{contactCount}/3</span>
      </div>

      <div className="protection-hero-body">
        <div className="protection-summary">
          <strong>Destino simultaneo</strong>
          <span>Seguridad municipal</span>
          <span>{contactCount ? `${contactCount} contacto(s) de emergencia` : "Sin contactos configurados"}</span>
        </div>

        <button className="protection-alert-button" disabled={loading || locating} onClick={onClick} type="button">
          {loading ? "Enviando alerta..." : locating ? "Ubicando..." : ctaLabel}
        </button>
      </div>
    </section>
  );
}
