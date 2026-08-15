import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  ImgHTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ControlSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ControlSize;
  fullWidth?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  leadingIcon,
  trailingIcon,
  className,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "mi-button",
        `mi-button--${variant}`,
        `mi-control--${size}`,
        fullWidth && "mi-button--full",
        className,
      )}
    >
      {loading ? <Spinner size="sm" aria-label="Loading" /> : leadingIcon}
      <span>{children}</span>
      {!loading && trailingIcon}
    </button>
  );
}

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: "default" | "muted" | "button";
}

export function Link({ variant = "default", className, children, ...props }: LinkProps) {
  return (
    <a {...props} className={cx("mi-link", `mi-link--${variant}`, className)}>
      {children}
    </a>
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cx("mi-label", className)} />;
}

export interface FieldMessageProps extends HTMLAttributes<HTMLParagraphElement> {
  tone?: "muted" | "error" | "success";
}

export function FieldMessage({ tone = "muted", className, ...props }: FieldMessageProps) {
  return <p {...props} className={cx("mi-field-message", `mi-field-message--${tone}`, className)} />;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  controlSize?: ControlSize;
}

export function Input({ invalid = false, controlSize = "md", className, ...props }: InputProps) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cx("mi-input", `mi-control--${controlSize}`, invalid && "mi-control--invalid", className)}
    />
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ invalid = false, className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={cx("mi-textarea", invalid && "mi-control--invalid", className)}
    />
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  controlSize?: ControlSize;
}

export function Select({ invalid = false, controlSize = "md", className, ...props }: SelectProps) {
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      className={cx("mi-select", `mi-control--${controlSize}`, invalid && "mi-control--invalid", className)}
    />
  );
}

export interface ChoiceProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
}

export function Checkbox({ label, className, ...props }: ChoiceProps) {
  return (
    <label className={cx("mi-choice", className)}>
      <input {...props} type="checkbox" className="mi-choice__input" />
      <span className="mi-choice__control" aria-hidden="true" />
      <span className="mi-choice__label">{label}</span>
    </label>
  );
}

export function Radio({ label, className, ...props }: ChoiceProps) {
  return (
    <label className={cx("mi-choice", className)}>
      <input {...props} type="radio" className="mi-choice__input" />
      <span className="mi-choice__control mi-choice__control--radio" aria-hidden="true" />
      <span className="mi-choice__label">{label}</span>
    </label>
  );
}

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

export function Toggle({ label, className, ...props }: ToggleProps) {
  return (
    <label className={cx("mi-toggle", className)}>
      <input {...props} type="checkbox" role="switch" className="mi-toggle__input" />
      <span className="mi-toggle__track" aria-hidden="true">
        <span className="mi-toggle__thumb" />
      </span>
      <span className="mi-toggle__label">{label}</span>
    </label>
  );
}

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
  variant?: "display" | "h1" | "h2" | "h3" | "body" | "body-sm" | "eyebrow" | "caption";
}

export function Typography({ as = "p", variant = "body", className, ...props }: TypographyProps) {
  const Tag = as;
  return <Tag {...props} className={cx("mi-type", `mi-type--${variant}`, className)} />;
}

export interface ResponsiveImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  aspectRatio?: string;
  priority?: boolean;
}

export function ResponsiveImage({
  aspectRatio,
  priority = false,
  className,
  loading,
  decoding = "async",
  style,
  ...props
}: ResponsiveImageProps) {
  return (
    <img
      {...props}
      loading={loading ?? (priority ? "eager" : "lazy")}
      decoding={decoding}
      className={cx("mi-image", className)}
      style={{ ...style, aspectRatio }}
    />
  );
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return <span {...props} className={cx("mi-badge", `mi-badge--${tone}`, className)} />;
}

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  src?: string;
  alt: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ src, alt, fallback, size = "md", className, ...props }: AvatarProps) {
  return (
    <span {...props} className={cx("mi-avatar", `mi-avatar--${size}`, className)}>
      {src ? <img src={src} alt={alt} loading="lazy" decoding="async" /> : <span aria-label={alt}>{fallback ?? alt.slice(0, 1)}</span>}
    </span>
  );
}

export function Divider({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr {...props} className={cx("mi-divider", className)} />;
}

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
}

export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
  return <span {...props} role="status" className={cx("mi-spinner", `mi-spinner--${size}`, className)} />;
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
}

export function Skeleton({ width = "100%", height = "1rem", className, style, ...props }: SkeletonProps) {
  return <div {...props} aria-hidden="true" className={cx("mi-skeleton", className)} style={{ ...style, width, height }} />;
}

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export function Container({ size = "lg", className, ...props }: ContainerProps) {
  return <div {...props} className={cx("mi-container", `mi-container--${size}`, className)} />;
}

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
  align?: "start" | "center" | "end" | "stretch";
}

export function Stack({ gap = "md", align = "stretch", className, ...props }: StackProps) {
  return <div {...props} className={cx("mi-stack", `mi-gap--${gap}`, `mi-align--${align}`, className)} />;
}

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  minColumnWidth?: string;
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
}

export function Grid({ minColumnWidth = "16rem", gap = "md", className, style, ...props }: GridProps) {
  return (
    <div
      {...props}
      className={cx("mi-grid", `mi-gap--${gap}`, className)}
      style={{ ...style, gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minColumnWidth}), 1fr))` }}
    />
  );
}
