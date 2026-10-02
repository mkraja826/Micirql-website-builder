"use client";

import { useId, useState } from "react";

type NavigationItem = { label: string; href: string };

export function NavigationMenu({
  items,
  ariaLabel = "Primary navigation",
}: {
  items: NavigationItem[];
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  return (
    <nav className="mi-nav-menu" aria-label={ariaLabel}>
      <button
        type="button"
        className="mi-nav-menu__toggle"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Toggle primary navigation"
        onClick={() => setOpen((value) => !value)}
      >
        <span>Menu</span>
        <span className="mi-nav-menu__icon" aria-hidden="true" />
      </button>
      <ul id={menuId} className={open ? "is-open" : undefined}>
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
