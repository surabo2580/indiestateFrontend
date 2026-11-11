import { useState } from "react";
import type { CatalogKind } from "./api";
import { CatalogPage } from "./CatalogPage";

const sections: { kind: CatalogKind; label: string; hint: string }[] = [
  { kind: "categories", label: "Sell categories", hint: "Ads" },
  { kind: "services", label: "Services", hint: "Bookings" },
];

export function App() {
  const [kind, setKind] = useState<CatalogKind>("categories");

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <span className="brand-mark">Indieestate</span>
          <span className="brand-role">Admin portal</span>
        </div>
        <nav className="rail-nav" aria-label="Catalog">
          {sections.map((section) => (
            <button
              key={section.kind}
              type="button"
              className={section.kind === kind ? "nav-item active" : "nav-item"}
              onClick={() => setKind(section.kind)}
            >
              <span>{section.label}</span>
              <small>{section.hint}</small>
            </button>
          ))}
        </nav>
      </aside>
      <CatalogPage key={kind} kind={kind} />
    </div>
  );
}
