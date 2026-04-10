import AlertList from "../../components/AlertList.jsx";

export default function CommunityView({
  alertForm,
  alerts,
  chatMessages,
  chatText,
  loading,
  onAlertFieldChange,
  onRefreshChat,
  onSendAlert,
  onSendChat,
  setChatText,
}) {
  return (
    <div className="community-stack mobile-section">
      <section className="panel">
        <p className="eyebrow">Alertar comunidad</p>
        <h2>Informar al sector</h2>
        <form className="form" onSubmit={onSendAlert}>
          <label>
            Tipo
            <select name="tipo" value={alertForm.tipo} onChange={onAlertFieldChange}>
              <option value="amarilla">Alerta amarilla</option>
              <option value="sospechoso">Incidente / Sospechoso</option>
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

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Alertas cercanas</p>
            <h2>Vecinos cercanos</h2>
          </div>
          <span className="counter">{alerts.length}</span>
        </div>
        <AlertList alerts={alerts} />
      </section>

      <section className="panel chat-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Chat vecinal</p>
            <h2>Comunicacion del sector</h2>
          </div>
          <button className="secondary" onClick={onRefreshChat} type="button">
            Actualizar
          </button>
        </div>

        <div className="chat-list">
          {chatMessages.length === 0 ? (
            <div className="empty-state">
              <strong>Sin mensajes</strong>
              <span>Escribe el primer mensaje del sector.</span>
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
    </div>
  );
}
