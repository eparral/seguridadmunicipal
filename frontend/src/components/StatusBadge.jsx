export default function StatusBadge({ health }) {
  const label = health === "online" ? "API operativa" : health === "offline" ? "API sin conexion" : "Verificando API";
  return (
    <span className="status-badge" data-state={health}>
      {label}
    </span>
  );
}
