import { useEffect, useMemo, useRef } from "react";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, tileLayers } from "../lib/mapConfig.js";

const fallbackAlerts = [
  {
    id: "demo-salud",
    tipo: "salud",
    sector: "Valle Hermoso",
    lat: -32.4418,
    lng: -71.2207,
    mensaje: "Emergencia de salud reportada",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-robo",
    tipo: "robo",
    sector: "Valle Hermoso",
    lat: -32.4589,
    lng: -71.2383,
    mensaje: "Robo / asalto informado por vecino",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-incidente",
    tipo: "incidente",
    sector: "Valle Hermoso",
    lat: -32.4491,
    lng: -71.2474,
    mensaje: "Movimiento sospechoso en el sector",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-incendio",
    tipo: "incendio",
    sector: "Valle Hermoso",
    lat: -32.4642,
    lng: -71.2201,
    mensaje: "Posible foco de incendio",
    created_at: new Date().toISOString(),
  },
];

export default function LeafletMap({ alerts = [], center = DEFAULT_MAP_CENTER, userLocation, onSelectAlert }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const userLayerRef = useRef(null);
  const initialCenterRef = useRef(center);

  const mappedAlerts = useMemo(() => {
    const withCoordinates = alerts.filter((alert) => isValidCoordinate(alert.lat, alert.lng));
    return withCoordinates.length ? withCoordinates : fallbackAlerts;
  }, [alerts]);

  useEffect(() => {
    const L = window.L;
    if (!mapEl.current || !L || mapRef.current) return;

    const map = L.map(mapEl.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([initialCenterRef.current.lat, initialCenterRef.current.lng], DEFAULT_MAP_ZOOM);

    const layers = tileLayers();
    const baseLayers = {};
    layers.forEach((layerConfig, index) => {
      const layer = L.tileLayer(layerConfig.url, layerConfig.options);
      baseLayers[layerConfig.label] = layer;
      if (index === 0) layer.addTo(map);
    });

    if (layers.length > 1) {
      L.control.layers(baseLayers, null, { position: "topright" }).addTo(map);
    }

    markerLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 250);

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      userLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = window.L;
    if (!L || !mapRef.current || !markerLayerRef.current) return;

    markerLayerRef.current.clearLayers();
    const bounds = [];

    mappedAlerts.forEach((alert) => {
      const marker = L.marker([Number(alert.lat), Number(alert.lng)], {
        icon: alertIcon(L, alert.tipo),
      });

      marker.bindPopup(alertPopup(alert));
      marker.on("click", () => onSelectAlert?.(alert));
      markerLayerRef.current.addLayer(marker);
      bounds.push([Number(alert.lat), Number(alert.lng)]);
    });

    if (bounds.length > 1) {
      mapRef.current.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
    } else if (bounds.length === 1) {
      mapRef.current.setView(bounds[0], 14);
    }

    mapRef.current.invalidateSize();
  }, [mappedAlerts, onSelectAlert]);

  useEffect(() => {
    const L = window.L;
    if (!L || !mapRef.current || !userLayerRef.current) return;

    userLayerRef.current.clearLayers();

    if (!userLocation) return;

    const latlng = [userLocation.latitude, userLocation.longitude];
    L.circle(latlng, {
      radius: userLocation.accuracy || 60,
      color: "#1f2e86",
      fillColor: "#1f2e86",
      fillOpacity: 0.1,
      weight: 1,
    }).addTo(userLayerRef.current);

    L.marker(latlng, {
      icon: userIcon(L),
    })
      .bindPopup("<b>Tu ubicacion actual</b>")
      .addTo(userLayerRef.current);

    mapRef.current.setView(latlng, Math.max(mapRef.current.getZoom(), 14), { animate: true });
  }, [userLocation]);

  return <div className="leaflet-map" ref={mapEl} aria-label="Mapa interactivo de alertas cercanas" />;
}

function isValidCoordinate(lat, lng) {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

function alertCategory(type = "") {
  const normalized = type.toLowerCase();
  if (normalized.includes("salud")) return "salud";
  if (normalized.includes("robo") || normalized.includes("asalto")) return "robo";
  if (normalized.includes("incendio")) return "incendio";
  if (normalized.includes("sos")) return "sos";
  return "incidente";
}

function alertIcon(L, type) {
  const category = alertCategory(type);
  const label = {
    salud: "+",
    robo: "!",
    incidente: "i",
    incendio: "F",
    sos: "SOS",
  }[category];

  return L.divIcon({
    className: "leaflet-alert-marker",
    html: `<span class="alert-pin ${category}"><span class="alert-pin-label">${label}</span></span>`,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -34],
  });
}

function userIcon(L) {
  return L.divIcon({
    className: "leaflet-user-marker",
    html: '<span class="user-pin"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function alertPopup(alert) {
  return `
    <div class="map-popup">
      <strong>${escapeHtml(formatType(alert.tipo))}</strong>
      <span>${escapeHtml(alert.sector || "Sector no informado")}</span>
      <small>${escapeHtml(formatTime(alert.created_at))}</small>
      <p>${escapeHtml(alert.mensaje || "Sin descripcion")}</p>
    </div>
  `;
}

function formatType(type) {
  return String(type || "alerta").replaceAll("_", " ");
}

function formatTime(value) {
  if (!value) return "Hora no informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Hora no informada";
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
