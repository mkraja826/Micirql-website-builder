import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import { Button, Input, Label, Select, Typography } from "@micirql/primitives";

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return <nav className="mi-breadcrumbs" aria-label="Breadcrumb"><ol>{items.map((item, index) => <li key={`${item.label}-${index}`}>{item.href && index < items.length - 1 ? <a href={item.href}>{item.label}</a> : <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>}</li>)}</ol></nav>;
}

export function DropdownMenu({ label, items }: { label: string; items: Array<{ label: string; href?: string; onSelect?: () => void }> }) {
  return <details className="mi-dropdown"><summary>{label}</summary><div className="mi-dropdown__menu" role="menu">{items.map((item, index) => item.href ? <a role="menuitem" key={`${item.label}-${index}`} href={item.href}>{item.label}</a> : <button role="menuitem" key={`${item.label}-${index}`} type="button" onClick={item.onSelect}>{item.label}</button>)}</div></details>;
}

export function NavigationMenu({ items, ariaLabel = "Primary navigation" }: { items: Array<{ label: string; href: string }>; ariaLabel?: string }) {
  return <nav className="mi-nav-menu" aria-label={ariaLabel}><ul>{items.map((item) => <li key={item.href}><a href={item.href}>{item.label}</a></li>)}</ul></nav>;
}

export function MegaMenu({ label, groups }: { label: string; groups: Array<{ title: string; items: Array<{ label: string; href: string; description?: string }> }> }) {
  return <details className="mi-mega"><summary>{label}</summary><div className="mi-mega__panel">{groups.map((group) => <section key={group.title}><Typography as="h3" variant="h3">{group.title}</Typography><ul>{group.items.map((item) => <li key={item.href}><a href={item.href}><strong>{item.label}</strong>{item.description ? <span>{item.description}</span> : null}</a></li>)}</ul></section>)}</div></details>;
}

export function Popover({ label, children }: { label: string; children: ReactNode }) {
  return <details className="mi-popover"><summary>{label}</summary><div className="mi-popover__panel">{children}</div></details>;
}

export function DateTimeField({ id, label, type = "date", required }: { id: string; label: string; type?: "date" | "time" | "datetime-local"; required?: boolean }) {
  return <div className="mi-form-field"><Label htmlFor={id}>{label}</Label><Input id={id} name={id} type={type} required={required} /></div>;
}

export function FileUpload({ id, label, accept, multiple, onChange }: { id: string; label: string; accept?: string; multiple?: boolean; onChange?: (files: FileList | null) => void }) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) { onChange?.(event.currentTarget.files); }
  return <div className="mi-upload"><Label htmlFor={id}>{label}</Label><input className="mi-upload__input" id={id} name={id} type="file" accept={accept} multiple={multiple} onChange={handleChange} /></div>;
}

export function Rating({ value, max = 5, label }: { value: number; max?: number; label?: string }) {
  const safe = Math.max(0, Math.min(value, max));
  return <div className="mi-rating" role="img" aria-label={label ?? `${safe} out of ${max}`}><span aria-hidden="true">{"★".repeat(Math.round(safe))}{"☆".repeat(Math.max(0, max - Math.round(safe)))}</span><span className="mi-rating__value">{safe.toFixed(1)}</span></div>;
}

export function Stats({ items }: { items: Array<{ value: string; label: string; detail?: string }> }) {
  return <dl className="mi-stats">{items.map((item) => <div key={`${item.label}-${item.value}`} className="mi-stat"><dt>{item.label}</dt><dd><strong>{item.value}</strong>{item.detail ? <span>{item.detail}</span> : null}</dd></div>)}</dl>;
}

export function LogoCloud({ items, label = "Trusted by" }: { items: Array<{ src: string; alt: string; href?: string }>; label?: string }) {
  return <section className="mi-logo-cloud" aria-label={label}>{items.map((item) => { const image = <img src={item.src} alt={item.alt} loading="lazy" />; return item.href ? <a key={item.src} href={item.href}>{image}</a> : <span key={item.src}>{image}</span>; })}</section>;
}

export function BeforeAfter({ before, after, split = 50 }: { before: { src: string; alt: string }; after: { src: string; alt: string }; split?: number }) {
  const safeSplit = Math.max(0, Math.min(split, 100));
  return <figure className="mi-before-after" style={{ "--mi-before-after-split": `${safeSplit}%` } as CSSProperties}><img className="mi-before-after__before" src={before.src} alt={before.alt} loading="lazy" /><div className="mi-before-after__after-wrap"><img className="mi-before-after__after" src={after.src} alt={after.alt} loading="lazy" /></div><span className="mi-before-after__handle" aria-hidden="true" /></figure>;
}

export function VideoFrame({ src, title, poster, controls = true }: { src: string; title: string; poster?: string; controls?: boolean }) {
  return <div className="mi-video"><video src={src} title={title} poster={poster} controls={controls} preload="metadata" playsInline /></div>;
}

export function FilterBar({ searchName = "q", filters = [], sortOptions = [], onApply }: { searchName?: string; filters?: Array<{ name: string; label: string; options: Array<{ value: string; label: string }> }>; sortOptions?: Array<{ value: string; label: string }>; onApply?: (data: FormData) => void }) {
  return <form className="mi-filter-bar" onSubmit={(event) => { event.preventDefault(); onApply?.(new FormData(event.currentTarget)); }}><div className="mi-form-field"><Label htmlFor={`${searchName}-filter`}>Search</Label><Input id={`${searchName}-filter`} name={searchName} type="search" /></div>{filters.map((filter) => <div className="mi-form-field" key={filter.name}><Label htmlFor={`${filter.name}-filter`}>{filter.label}</Label><Select id={`${filter.name}-filter`} name={filter.name}>{filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></div>)}{sortOptions.length ? <div className="mi-form-field"><Label htmlFor="mi-sort">Sort</Label><Select id="mi-sort" name="sort">{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></div> : null}<Button type="submit">Apply</Button></form>;
}

export function DataTable({ caption, columns, rows }: { caption: string; columns: Array<{ key: string; label: string }>; rows: Array<Record<string, ReactNode>> }) {
  return <div className="mi-table-wrap" role="region" aria-label={caption} tabIndex={0}><table className="mi-table"><caption>{caption}</caption><thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column.key}>{row[column.key]}</td>)}</tr>)}</tbody></table></div>;
}
