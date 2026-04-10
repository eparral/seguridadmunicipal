import { apiRequest } from "./api.js";

export function listEmergencyContacts(token) {
  return apiRequest("/proteccion-mujer/contactos/", { token });
}

export function createEmergencyContact(token, payload) {
  return apiRequest("/proteccion-mujer/contactos/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function updateEmergencyContact(token, contactId, payload) {
  return apiRequest(`/proteccion-mujer/contactos/${contactId}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export function deleteEmergencyContact(token, contactId) {
  return apiRequest(`/proteccion-mujer/contactos/${contactId}`, {
    method: "DELETE",
    token,
  });
}

export function sendProtectionAlert(token, payload) {
  return apiRequest("/proteccion-mujer/alertas/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}
