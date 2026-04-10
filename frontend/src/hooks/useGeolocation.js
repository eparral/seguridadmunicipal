import { useCallback, useState } from "react";

export default function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);

  const requestLocation = useCallback(() => {
    setError("");

    if (!navigator.geolocation) {
      const message = "Tu navegador no permite geolocalizacion.";
      setError(message);
      return Promise.reject(new Error(message));
    }

    setLocating(true);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(coords);
          setLocating(false);
          resolve(coords);
        },
        (geoError) => {
          const message = geolocationMessage(geoError);
          setError(message);
          setLocating(false);
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 12000,
        },
      );
    });
  }, []);

  return { error, locating, location, requestLocation };
}

function geolocationMessage(error) {
  if (error?.code === 1) {
    return "Permiso de ubicacion denegado. Activalo en el navegador para ver tu posicion y enviar alertas con coordenadas.";
  }

  if (error?.code === 2) {
    return "No se pudo detectar tu ubicacion actual. Revisa GPS, Wi-Fi o datos moviles.";
  }

  if (error?.code === 3) {
    return "La solicitud de ubicacion tardo demasiado. Intenta nuevamente.";
  }

  return error?.message || "No se pudo obtener tu ubicacion.";
}
