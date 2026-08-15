import type { FormEvent, HTMLAttributes, ReactNode } from "react";
import { Button, Input, Label, Stack, Textarea, Typography } from "@micirql/primitives";

type CommonProps = { className?: string; children?: ReactNode };

export function Card({ className = "", children, ...props }: CommonProps & HTMLAttributes<HTMLElement>) {
  return <article className={`mi-card ${className}`.trim()} {...props}>{children}</article>;
}

export function Accordion({ items }: { items: Array<{ id: string; title: string; content: ReactNode }> }) {
  return <div className="mi-accordion">{items.map((item) => <details className="mi-accordion__item" key={item.id}><summary>{item.title}</summary><div className="mi-accordion__content">{item.content}</div></details>)}</div>;
}

export function Tabs({ tabs }: { tabs: Array<{ id: string; label: string; content: ReactNode }> }) {
  return <div className="mi-tabs">{tabs.map((tab) => <section className="mi-tabs__panel" key={tab.id} aria-labelledby={`${tab.id}-label`}><Typography as="h3" variant="h3" id={`${tab.id}-label`}>{tab.label}</Typography>{tab.content}</section>)}</div>;
}

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return <div className="mi-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="mi-modal" role="dialog" aria-modal="true" aria-labelledby="mi-modal-title"><div className="mi-modal__header"><Typography as="h2" variant="h2" id="mi-modal-title">{title}</Typography><Button variant="ghost" aria-label="Close dialog" onClick={onClose}>×</Button></div>{children}</section></div>;
}

export function Drawer({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return <div className="mi-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><aside className="mi-drawer" role="dialog" aria-modal="true" aria-label={title}><div className="mi-modal__header"><Typography as="h2" variant="h3">{title}</Typography><Button variant="ghost" aria-label="Close drawer" onClick={onClose}>×</Button></div>{children}</aside></div>;
}

export function SearchBox({ label = "Search", placeholder = "Search", onSubmit }: { label?: string; placeholder?: string; onSubmit?: (query: string) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); onSubmit?.(String(data.get("q") ?? "")); }
  return <form className="mi-search" role="search" onSubmit={submit}><Label htmlFor="mi-search-input" className="mi-sr-only">{label}</Label><Input id="mi-search-input" name="q" type="search" placeholder={placeholder} /><Button type="submit">Search</Button></form>;
}

export function Carousel({ items, label = "Content carousel" }: { items: ReactNode[]; label?: string }) {
  return <div className="mi-carousel" role="region" aria-label={label} tabIndex={0}>{items.map((item, index) => <div className="mi-carousel__item" key={index}>{item}</div>)}</div>;
}

export function Gallery({ items }: { items: Array<{ src: string; alt: string }> }) {
  return <div className="mi-gallery">{items.map((item) => <figure key={item.src} className="mi-gallery__item"><img src={item.src} alt={item.alt} loading="lazy" /></figure>)}</div>;
}

export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange?: (page: number) => void }) {
  return <nav className="mi-pagination" aria-label="Pagination"><Button variant="outline" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>Previous</Button><span aria-live="polite">Page {page} of {totalPages}</span><Button variant="outline" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>Next</Button></nav>;
}

export function Toast({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warning" | "danger"; children: ReactNode }) {
  return <div className={`mi-toast mi-toast--${tone}`} role={tone === "danger" ? "alert" : "status"}>{children}</div>;
}

export function FormField({ id, label, required, error, textarea = false, name = id }: { id: string; label: string; required?: boolean; error?: string; textarea?: boolean; name?: string }) {
  return <div className="mi-form-field"><Label htmlFor={id}>{label}{required ? " *" : ""}</Label>{textarea ? <Textarea id={id} name={name} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} /> : <Input id={id} name={name} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />}{error ? <p id={`${id}-error`} className="mi-form-field__error">{error}</p> : null}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <Stack className="mi-empty" gap="md" align="center"><Typography as="h3" variant="h3">{title}</Typography>{description ? <Typography variant="body">{description}</Typography> : null}{action}</Stack>;
}
