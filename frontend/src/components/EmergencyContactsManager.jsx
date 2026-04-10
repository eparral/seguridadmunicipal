const emptyStateTitle = "Sin contactos configurados";

export default function EmergencyContactsManager({
  contacts,
  form,
  editingId,
  loading,
  saving,
  onCancel,
  onChange,
  onDelete,
  onEdit,
  onSubmit,
}) {
  return (
    <section className="panel emergency-contacts-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Contactos de emergencia</p>
          <h2>Hasta 3 contactos</h2>
        </div>
        <span className="counter">{contacts.length}/3</span>
      </div>

      <form className="form" onSubmit={onSubmit}>
        <label>
          Nombre
          <input name="nombre" onChange={onChange} placeholder="Nombre completo" value={form.nombre} />
        </label>

        <label>
          Telefono
          <input name="telefono" onChange={onChange} placeholder="+56912345678" value={form.telefono} />
        </label>

        <label>
          Relacion
          <input name="relacion" onChange={onChange} placeholder="Madre, amiga, hermana..." value={form.relacion} />
        </label>

        <div className="profile-actions">
          <button disabled={saving} type="submit">
            {saving ? "Guardando..." : editingId ? "Actualizar contacto" : "Agregar contacto"}
          </button>
          {editingId && (
            <button className="secondary" onClick={onCancel} type="button">
              Cancelar edicion
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="empty-state">
          <strong>Cargando contactos</strong>
          <span>Consultando configuracion de emergencia.</span>
        </div>
      ) : contacts.length === 0 ? (
        <div className="empty-state">
          <strong>{emptyStateTitle}</strong>
          <span>Configura personas de confianza para derivar tus alertas.</span>
        </div>
      ) : (
        <div className="contact-grid">
          {contacts.map((contact) => (
            <article className="contact-card" key={contact.id}>
              <strong>{contact.nombre}</strong>
              <span>{contact.relacion}</span>
              <small>{contact.telefono}</small>
              <div className="actions-row compact">
                <button className="secondary" onClick={() => onEdit(contact)} type="button">
                  Editar
                </button>
                <button className="secondary danger" onClick={() => onDelete(contact.id)} type="button">
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
