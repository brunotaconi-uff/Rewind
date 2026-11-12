"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ApiErrorMessage } from "@/components/ApiErrorMessage/ApiErrorMessage";
import { ProfileFeed } from "@/components/ProfileFeed/ProfileFeed";
import { EmptyState } from "@/components/Section/Section";
import { getErrorCode, type ApiErrorCode } from "@/lib/api/client";
import { getFollowingFeed, type FeedItem } from "@/lib/api/user";
import styles from "./GlobalFeed.module.css";

export function GlobalFeed() {
  const { data: session, status } = useSession();
  const [result, setResult] = useState<{ key: string; items: FeedItem[] } | null>(null);
  const [error, setError] = useState<{ key: string; code: ApiErrorCode } | null>(null);
  const [reload, setReload] = useState(0);
  const key = `${session?.accessToken ?? ""}:${reload}`;
  const items = result?.key === key ? result.items : null;
  const errorCode = error?.key === key ? error.code : null;

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) return;
    let cancelled = false;
    getFollowingFeed(session.accessToken)
      .then((feed) => {
        if (!cancelled) setResult({ key, items: feed });
      })
      .catch((error: unknown) => {
        if (!cancelled) setError({ key, code: getErrorCode(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [status, session?.accessToken, reload, key]);

  if (status === "loading") return <EmptyState>Carregando o feed...</EmptyState>;
  if (status !== "authenticated") {
    return (
      <EmptyState>
        <Link href="/login">Entre na sua conta</Link> para ver as novidades de quem você segue.
      </EmptyState>
    );
  }
  if (errorCode) {
    return (
      <ApiErrorMessage
        code={errorCode}
        title="Não foi possível carregar o feed"
        onRetry={() => setReload((current) => current + 1)}
      />
    );
  }
  if (items === null) return <EmptyState>Carregando o feed...</EmptyState>;
  if (items.length === 0) {
    return (
      <EmptyState>
        Seu feed está vazio. <Link className={styles.searchLink} href="/busca?type=users">Busque pessoas</Link> para
        acompanhar as notas e resenhas delas.
      </EmptyState>
    );
  }

  return <ProfileFeed items={items} />;
}
