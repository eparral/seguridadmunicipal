export const DEFAULT_MAP_CENTER = {
  lat: Number(import.meta.env.VITE_MAP_CENTER_LAT || -32.4524),
  lng: Number(import.meta.env.VITE_MAP_CENTER_LNG || -71.2311),
};

export const DEFAULT_MAP_ZOOM = Number(import.meta.env.VITE_MAP_ZOOM || 13);

export function getMapboxToken() {
  let storedToken = "";

  try {
    storedToken = typeof window !== "undefined" ? window.localStorage.getItem("mapboxToken") || "" : "";
  } catch {
    storedToken = "";
  }

  return (
    import.meta.env.VITE_MAPBOX_TOKEN ||
    storedToken ||
    ""
  ).trim();
}

export function tileLayers() {
  const mapboxToken = getMapboxToken();
  const osm = {
    label: "OSM claro",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      attribution: "OpenStreetMap",
      maxZoom: 19,
    },
  };

  if (!mapboxToken) {
    return [osm];
  }

  return [
    {
      label: "Mapbox claro",
      url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
      options: {
        attribution: "Mapbox | OpenStreetMap",
        maxZoom: 20,
        tileSize: 512,
        zoomOffset: -1,
      },
    },
    {
      label: "Mapbox satelite",
      url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
      options: {
        attribution: "Mapbox | OpenStreetMap",
        maxZoom: 20,
        tileSize: 512,
        zoomOffset: -1,
      },
    },
    osm,
  ];
}
