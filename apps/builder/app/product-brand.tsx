import styles from "./product-brand.module.css";

export function ProductBrand({
  className,
  label = "Website builder",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      aria-label={label ? `MiCirql ${label}` : "MiCirql"}
      className={[styles.brand, className].filter(Boolean).join(" ")}
    >
      <img
        alt=""
        aria-hidden="true"
        className={styles.mark}
        height="28"
        src="/micirql-mark.svg"
        width="28"
      />
      <strong className={styles.name}>MiCirql</strong>
      {label ? <span className={styles.label}>{label}</span> : null}
    </span>
  );
}
