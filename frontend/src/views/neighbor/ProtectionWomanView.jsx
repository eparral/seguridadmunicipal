import { useEffect, useMemo, useState } from "react";
import EmergencyContactsManager from "../../components/EmergencyContactsManager.jsx";
import Modal from "../../components/Modal.jsx";
import ProtectionAlertButton from "../../components/ProtectionAlertButton.jsx";
import {
  createEmergencyContact,
  deleteEmergencyContact,
  listEmergencyContacts,
  sendProtectionAlert,
  updateEmergencyContact,
} from "../../lib/proteccionMujerApi.js";

const alertOptions = [
  { id: "salud", label: "Salud" },
  { id: "incidente", label: "Incidente" },
  { id: "robo_violencia", label: "Robo / Violencia" },
  { id: "emergencia_general", label: "Emergencia general" },
];

const emptyForm = {
  nombre: "",
  telefono: "",
  relacion: "",
};

export default function ProtectionWomanView({ geolocation, session }) {
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [savingContact, setSavingContact] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(alertOptions[0].id);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  const statusMessage = useMemo(() => {
    if (geolocation.location) {
      return `Ubicacion lista: ${geolocation.location.latitude.toFixed(5)}, ${geolocation.location.longitude.toFixed(5)}`;
    }
    if (geolocation.locating) {
      return "Obteniendo ubicacion del dispositivo...";
    }
    return "La ubicacion se confirmara antes de enviar la alerta.";
  }, [geolocation.location, geolocation.locating]);

  useEffect(() => {
    if (!session?.access_token) return;
    loadContacts();
  }, [session?.access_token]);

  async function loadContacts() {
    if (!session?.access_token) return;
    setContactsLoading(true);
    try {
      const data = await listEmergencyContacts(session.access_token);
      setContacts(Array.isArray(data) ? data : []);
    } catch (requestError) {
      console.error("[proteccion-contactos]", requestError);
      setError(requestError.message || "No se pudieron cargar los contactos de emergencia.");
    } finally {
      setContactsLoading(false);
    }
  }

  function handleFieldChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function handleEdit(contact) {
    setEditingId(contact.id);
    setForm({
      nombre: contact.nombre,
      telefono: contact.telefono,
      relacion: contact.relacion,
    });
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleDelete(contactId) {
    if (!session?.access_token) return;
    setError("");

    try {
      await deleteEmergencyContact(session.access_token, contactId);
      setContacts((current) => current.filter((contact) => contact.id !== contactId));
      if (editingId === contactId) {
        resetForm();
      }
    } catch (requestError) {
      setError(requestError.message || "No se pudo eliminar el contacto.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const validationError = validateContact(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSavingContact(true);
    try {
      const payload = sanitizeContact(form);
      const savedContact = editingId
        ? await updateEmergencyContact(session.access_token, editingId, payload)
        : await createEmergencyContact(session.access_token, payload);

      if (editingId) {
        setContacts((current) => current.map((contact) => (contact.id === editingId ? savedContact : contact)));
      } else {
        setContacts((current) => [...current, savedContact]);
      }
      resetForm();
    } catch (requestError) {
      setError(requestError.message || "No se pudo guardar el contacto.");
    } finally {
      setSavingContact(false);
    }
  }

  async function handleConfirmAlert() {
    setSendingAlert(true);
    setError("");
    setConfirmation(null);

    try {
      let location = geolocation.location;

      if (!location) {
        location = await geolocation.requestLocation();
      }

      const selectedOption = alertOptions.find((option) => option.id === selectedType) || alertOptions[0];
      const response = await sendProtectionAlert(session.access_token, {
        tipo_alerta: selectedType,
        lat: location.latitude,
        lng: location.longitude,
        mensaje: `Proteccion Mujer: ${selectedOption.label}`,
      });

      console.info("[proteccion-alerta]", response);
      setConfirmation(response);
      setModalOpen(false);
    } catch (requestError) {
      console.error("[proteccion-alerta]", requestError);
      setError(requestError.message || "No se pudo activar la alerta protegida.");
    } finally {
      setSendingAlert(false);
    }
  }

  return (
    <div className="protection-stack">
      <ProtectionAlertButton
        contactCount={contacts.length}
        loading={sendingAlert}
        locating={geolocation.locating}
        onClick={() => {
          setError("");
          setModalOpen(true);
        }}
      />

      <section className="panel protection-status-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Estado operativo</p>
            <h2>Derivacion protegida</h2>
          </div>
          <span className="counter">{contacts.length}/3</span>
        </div>
        <div className="protection-status-grid">
          <article className="status-card">
            <strong>Ubicacion</strong>
            <span>{statusMessage}</span>
          </article>
          <article className="status-card">
            <strong>Contactos</strong>
            <span>
              {contacts.length === 3
                ? "Cobertura completa configurada."
                : `Faltan ${3 - contacts.length} contacto(s) para completar la red de emergencia.`}
            </span>
          </article>
        </div>
      </section>

      {error && <p className="notice danger-notice">{error}</p>}

      {confirmation && (
        <section className="success-panel protection-success-panel">
          <strong>Alerta protegida enviada</strong>
          <span>
            {formatType(confirmation.tipo_alerta)} | {confirmation.sector}
          </span>
          <small>
            {formatTime(confirmation.timestamp)} | {confirmation.ubicacion}
          </small>
          <div className="delivery-list">
            {confirmation.notificaciones?.map((delivery) => (
              <article className="delivery-card" key={delivery.id || `${delivery.destino_tipo}-${delivery.destinatario_nombre}`}>
                <strong>{delivery.destinatario_nombre}</strong>
                <span>
                  {delivery.destino_tipo === "municipal"
                    ? "Seguridad municipal"
                    : `${delivery.destinatario_telefono || "Sin telefono"} | ${delivery.canal}`}
                </span>
                <small>{delivery.detalle}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      <EmergencyContactsManager
        contacts={contacts}
        editingId={editingId}
        form={form}
        loading={contactsLoading}
        onCancel={resetForm}
        onChange={handleFieldChange}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onSubmit={handleSubmit}
        saving={savingContact}
      />

      {modalOpen && (
        <Modal title="Confirmar alerta protegida" onClose={() => setModalOpen(false)}>
          <div className="protection-modal-content">
            <p className="muted">
              Esta alerta se registrara como prioritaria y se derivara a seguridad municipal y a tus contactos
              configurados.
            </p>

            <div className="protection-option-grid">
              {alertOptions.map((option) => (
                <button
                  className={selectedType === option.id ? "protection-option active" : "protection-option"}
                  key={option.id}
                  onClick={() => setSelectedType(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="protection-confirm-summary">
              <strong>Destino</strong>
              <span>Seguridad municipal</span>
              <span>{contacts.length} contacto(s) de emergencia</span>
            </div>

            <div className="profile-actions">
              <button className="protection-alert-button" disabled={sendingAlert} onClick={handleConfirmAlert} type="button">
                {sendingAlert ? "Enviando..." : "Confirmar alerta"}
              </button>
              <button className="secondary" disabled={sendingAlert} onClick={() => setModalOpen(false)} type="button">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function sanitizeContact(form) {
  return {
    nombre: form.nombre.trim(),
    telefono: form.telefono.trim(),
    relacion: form.relacion.trim(),
  };
}

function validateContact(form) {
  if (!form.nombre.trim() || !form.telefono.trim() || !form.relacion.trim()) {
    return "Completa nombre, telefono y relacion del contacto.";
  }

  const digits = form.telefono.replace(/\D/g, "");
  if (digits.length < 8) {
    return "Ingresa un telefono valido para el contacto de emergencia.";
  }

  return "";
}

function formatType(type) {
  return String(type || "alerta").replaceAll("_", " ");
}

function formatTime(value) {
  if (!value) return "Hora no informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Hora no informada";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
