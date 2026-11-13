"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./status.module.css";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Erro inesperado em qualquer página: mostra uma saída em vez da tela branca do Next. */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.wrapper} role="alert">
      <h1 className={styles.title}>Algo deu errado</h1>
      <p className={styles.message}>
        Não conseguimos mostrar esta página agora. Tente de novo em instantes.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={reset}>
          Tentar novamente
        </button>
        <Link href="/" className={styles.secondary}>
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
