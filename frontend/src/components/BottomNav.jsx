const navIcons = {
  inicio: HomeIcon,
  mapa: MapIcon,
  sos: ShieldAlertIcon,
  comunidad: CommunityIcon,
  perfil: ProfileIcon,
};

export default function BottomNav({ activeTab, items, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Navegacion principal">
      {items.map((item) => {
        const isActive = activeTab === item.id;
        const isSos = item.id === "sos";
        const Icon = navIcons[item.id] || HomeIcon;

        return (
          <button
            aria-current={isActive ? "page" : undefined}
            className={buildClassName(isActive, isSos)}
            data-tab={item.id}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            <span className="bottom-nav-icon-shell" aria-hidden="true">
              <Icon />
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function buildClassName(isActive, isSos) {
  const classes = ["bottom-nav-item"];
  if (isActive) classes.push("active");
  if (isSos) classes.push("sos-tab");
  return classes.join(" ");
}

function HomeIcon() {
  return (
    <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24">
      <path
        d="M4.5 10.5 12 4l7.5 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-3.75V13.5h-4.5V20H6a1.5 1.5 0 0 1-1.5-1.5v-8Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24">
      <path
        d="M9 5.25 3.75 7.5v11.25L9 16.5l6 2.25 5.25-2.25V5.25L15 7.5 9 5.25Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path d="M9 5.25v11.25M15 7.5v11.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
    </svg>
  );
}

function ShieldAlertIcon() {
  return (
    <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3.75 5.25 6v5.82c0 4.36 2.72 6.94 6.75 8.43 4.03-1.49 6.75-4.07 6.75-8.43V6L12 3.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path d="M12 8.25v4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
      <circle cx="12" cy="15.9" fill="currentColor" r="1.05" />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24">
      <path
        d="M8.25 11.25a2.63 2.63 0 1 0 0-5.25 2.63 2.63 0 0 0 0 5.25ZM15.75 10.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path
        d="M4.5 18c.73-2.2 2.42-3.38 5.07-3.38 2.65 0 4.34 1.18 5.07 3.38M13.5 18c.54-1.64 1.8-2.62 3.78-2.62 1.13 0 2.05.33 2.72.99"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8.25" r="3.25" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M5.25 19.5c1.35-2.4 3.6-3.6 6.75-3.6s5.4 1.2 6.75 3.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
      <path d="M12 2.75a9.25 9.25 0 1 1 0 18.5 9.25 9.25 0 0 1 0-18.5Z" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}
