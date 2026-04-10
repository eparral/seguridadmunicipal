import { useMemo, useState } from "react";
import Modal from "../../components/Modal.jsx";
import useGeolocation from "../../hooks/useGeolocation.js";

const emergencyOptions = [
  "Emergencia de Salud",
  "Robo / Asalto",
  "Incidente / Sospechoso",
  "Incendio",
];

export default function SosView({ loading, onSosSent }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const { error, locating, requestLocation } = useGeolocation();

  const busy = useMemo(() => loading || locating || sending, [loading, locating, sending]);

  async function selectEmergency(label) {
    setSending(true);
    setConfirmation(null);

    try {
      const location = await requestLocation();
      await new Promise((resolve) => setTimeout(resolve, 900));
      const result = { label, location, sentAt: new Date().toISOString() };
      setConfirmation(result);
      onSosSent(result);
      setModalOpen(false);
    } catch (geoError) {
      console.error("[sos]", geoError);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="sos-view mobile-section">
      <div className="sos-hero-card">
        <p className="eyebrow">S.O.S</p>
        <h2>Emergencia inmediata</h2>
        <p>El sistema solicitara tu ubicacion y simulara el envio de la alerta al equipo municipal.</p>
        <button className="emergency-button" disabled={busy} onClick={() => setModalOpen(true)} type="button">
          {busy ? "Enviando..." : "🚨 EMERGENCIA"}
        </button>
      </div>

      {error && <p className="notice danger-notice">{error}</p>}

      {confirmation && (
        <div className="success-panel">
          <strong>Alerta simulada enviada</strong>
          <span>{confirmation.label}</span>
          <small>
            Ubicacion: {confirmation.location.latitude.toFixed(5)}, {confirmation.location.longitude.toFixed(5)}
          </small>
        </div>
      )}

      {modalOpen && (
        <Modal title="Selecciona el tipo de emergencia" onClose={() => setModalOpen(false)}>
          <div className="emergency-options">
            {emergencyOptions.map((option) => (
              <button disabled={busy} key={option} onClick={() => selectEmergency(option)} type="button">
                {option}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </section>
  );
}
