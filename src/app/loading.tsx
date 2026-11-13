import styles from "./status.module.css";

export default function Loading() {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <p className={styles.message}>Carregando…</p>
    </div>
  );
}
