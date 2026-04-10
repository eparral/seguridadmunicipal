export default function ProtectionAlertButton({
  contactCount,
  locating,
  loading,
  onClick,
}) {
  return (
    <section className="panel protection-hero-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Proteccion Mujer</p>
          <h2>Mujer protegida</h2>
          <p className="muted">Derivacion inmediata a seguridad municipal y a tus contactos configurados.</p>
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
          {loading ? "Enviando alerta..." : locating ? "Ubicando..." : "Activar alerta"}
        </button>
      </div>
    </section>
  );
}
