import type { Metadata } from "next";
import Link from "next/link";
import styles from "./status.module.css";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <div className={styles.wrapper}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Essa faixa não está no disco</h1>
      <p className={styles.message}>A página que você procurou não existe ou foi removida.</p>
      <div className={styles.actions}>
        <Link href="/" className={styles.primary}>
          Voltar ao início
        </Link>
        <Link href="/busca" className={styles.secondary}>
          Buscar álbuns
        </Link>
      </div>
    </div>
  );
}
