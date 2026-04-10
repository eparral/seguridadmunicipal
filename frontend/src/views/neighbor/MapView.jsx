const sectors = ["Centro", "Valle Hermoso", "Placilla", "Los Molles", "Quinquimo"];

export default function MapView({ alerts }) {
  return (
    <section className="panel map-panel mobile-section">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Mapa</p>
          <h2>Alertas cercanas</h2>
        </div>
        <span className="counter">{alerts.length}</span>
      </div>

      <div className="map-board" aria-label="Mapa referencial de vecinos cercanos">
        {sectors.map((sector, index) => (
          <div className={`sector sector-${index + 1}`} key={sector}>
            <span>{sector}</span>
          </div>
        ))}
        {alerts.slice(0, 8).map((alert, index) => (
          <span
            className={`map-pin level-${alert.nivel || "1"}`}
            key={alert.id || index}
            style={{ left: `${18 + ((index * 13) % 64)}%`, top: `${24 + ((index * 17) % 54)}%` }}
            title={alert.tipo}
          />
        ))}
      </div>
    </section>
  );
}
