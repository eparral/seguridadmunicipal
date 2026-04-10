export default function BottomNav({ activeTab, items, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Navegacion principal">
      {items.map((item) => (
        <button
          className={activeTab === item.id ? "bottom-nav-item active" : "bottom-nav-item"}
          key={item.id}
          onClick={() => onChange(item.id)}
          type="button"
        >
          <span className="nav-dot" />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
