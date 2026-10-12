"use client";

import { useEffect, useId, useRef, useState } from "react";

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
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeFromOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !navigationRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeFromOutside);
    return () => document.removeEventListener("pointerdown", closeFromOutside);
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    desktop.addEventListener("change", closeAtDesktop);
    return () => desktop.removeEventListener("change", closeAtDesktop);
  }, []);

  return (
    <nav
      ref={navigationRef}
      className="mi-nav-menu"
      aria-label={ariaLabel}
      onBlur={(event) => {
        if (
          open &&
          (!event.relatedTarget ||
            !event.currentTarget.contains(event.relatedTarget))
        ) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          event.currentTarget
            .querySelector<HTMLButtonElement>(".mi-nav-menu__toggle")
            ?.focus();
        }
      }}
    >
      <button
        type="button"
        className={`mi-nav-menu__toggle${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${open ? "Close" : "Open"} primary navigation`}
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
