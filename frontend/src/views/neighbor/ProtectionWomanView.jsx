import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export default function ProtectionWomanView({ ctaLabel = "Activar alerta", geolocation, session, standalone = false }) {
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
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturedPreview, setCapturedPreview] = useState("");
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const statusMessage = useMemo(() => {
    if (geolocation.location) {
      return `Ubicacion lista: ${geolocation.location.latitude.toFixed(5)}, ${geolocation.location.longitude.toFixed(5)}`;
    }
    if (geolocation.locating) {
      return "Obteniendo ubicacion del dispositivo...";
    }
    return "La ubicacion se confirmara antes de enviar la alerta.";
  }, [geolocation.location, geolocation.locating]);

  const cameraStatus = useMemo(() => {
    if (cameraReady) {
      return "Camara frontal lista para captura.";
    }
    if (cameraLoading) {
      return "Activando camara frontal...";
    }
    return "La captura frontal se tomara al confirmar el S.O.S.";
  }, [cameraLoading, cameraReady]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause?.();
      videoRef.current.srcObject = null;
    }

    setCameraLoading(false);
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setCameraLoading(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Tu dispositivo no permite activar la camara frontal.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
    } catch (cameraRequestError) {
      console.error("[front-camera]", cameraRequestError);
      setCameraError(cameraRequestError.message || "No se pudo activar la camara frontal.");
      stopCamera();
    } finally {
      setCameraLoading(false);
    }
  }, [stopCamera]);

  const captureFrontImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      throw new Error("La camara frontal aun no esta lista.");
    }

    const video = videoRef.current;
    if (video.readyState < 2) {
      throw new Error("La camara frontal aun no entrega imagen.");
    }

    const sourceWidth = video.videoWidth || 720;
    const sourceHeight = video.videoHeight || 1280;
    const targetWidth = Math.min(sourceWidth, 720);
    const scale = targetWidth / sourceWidth;
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = canvasRef.current;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("No se pudo preparar la captura de imagen.");
    }

    context.drawImage(video, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL("image/jpeg", 0.78);
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    loadContacts();
  }, [session?.access_token]);

  useEffect(() => {
    if (modalOpen) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [modalOpen, startCamera, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

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

  function openAlertModal() {
    setError("");
    setCameraError("");
    setModalOpen(true);
  }

  function closeAlertModal() {
    setModalOpen(false);
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
      const capturedImage = captureFrontImage();
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
        captura_frontal: capturedImage,
      });

      console.info("[proteccion-alerta]", response);
      setCapturedPreview(capturedImage);
      setConfirmation({ ...response, capturedImage });
      closeAlertModal();
    } catch (requestError) {
      console.error("[proteccion-alerta]", requestError);
      setError(requestError.message || "No se pudo activar la alerta protegida.");
    } finally {
      setSendingAlert(false);
    }
  }

  return (
    <div className={standalone ? "protection-stack protection-stack-standalone" : "protection-stack"}>
      <ProtectionAlertButton
        badgeLabel={standalone ? "Mujer Protegida" : "Proteccion Mujer"}
        contactCount={contacts.length}
        ctaLabel={ctaLabel}
        loading={sendingAlert}
        locating={geolocation.locating}
        onClick={openAlertModal}
        standalone={standalone}
        subtitle={
          standalone
            ? "Acceso directo de emergencia con geolocalizacion, captura frontal y derivacion inmediata."
            : "Derivacion inmediata a seguridad municipal y a tus contactos configurados."
        }
        title={standalone ? "S.O.S protegido" : "Mujer protegida"}
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
            <strong>Camara frontal</strong>
            <span>{cameraError || cameraStatus}</span>
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
          {capturedPreview && (
            <div className="camera-proof-card">
              <img alt="Captura frontal registrada" className="camera-proof-image" src={capturedPreview} />
            </div>
          )}
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
        <Modal title="Confirmar S.O.S protegido" onClose={closeAlertModal}>
          <div className="protection-modal-content">
            <p className="muted">
              Se activara la camara frontal, se registrara la ubicacion actual y la alerta se derivara a seguridad
              municipal junto con tus contactos configurados.
            </p>

            <div className="camera-preview-card">
              <div className="camera-preview-frame">
                {cameraLoading && <span className="camera-preview-placeholder">Activando camara frontal...</span>}
                {!cameraLoading && !cameraError && <video autoPlay className="camera-preview-video" muted playsInline ref={videoRef} />}
                {cameraError && <span className="camera-preview-placeholder">{cameraError}</span>}
              </div>
              <small className="camera-preview-note">La captura se toma automaticamente al confirmar.</small>
              <canvas className="camera-canvas-hidden" ref={canvasRef} />
            </div>

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
              <button
                className="protection-alert-button"
                disabled={sendingAlert || cameraLoading || Boolean(cameraError)}
                onClick={handleConfirmAlert}
                type="button"
              >
                {sendingAlert ? "Enviando..." : "Confirmar S.O.S"}
              </button>
              <button className="secondary" disabled={sendingAlert} onClick={closeAlertModal} type="button">
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
