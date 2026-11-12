"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar/Avatar";
import { ApiErrorMessage } from "@/components/ApiErrorMessage/ApiErrorMessage";
import { EmptyState } from "@/components/Section/Section";
import { getErrorCode, type ApiErrorCode } from "@/lib/api/client";
import { searchUsers, type UserSearchResult } from "@/lib/api/user";
import styles from "./UserSearchResults.module.css";

export function UserSearchResults({ query }: { query: string }) {
  const { data: session, status } = useSession();
  const [result, setResult] = useState<{ key: string; users: UserSearchResult[] } | null>(null);
  const [error, setError] = useState<{ key: string; code: ApiErrorCode } | null>(null);
  const [reload, setReload] = useState(0);
  const key = `${session?.accessToken ?? ""}:${query}:${reload}`;
  const users = result?.key === key ? result.users : null;
  const errorCode = error?.key === key ? error.code : null;

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) return;
    let cancelled = false;
    searchUsers(session.accessToken, query)
      .then((result) => {
        if (!cancelled) setResult({ key, users: result });
      })
      .catch((error: unknown) => {
        if (!cancelled) setError({ key, code: getErrorCode(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [status, session?.accessToken, query, reload, key]);

  if (status === "loading") return <EmptyState>Carregando...</EmptyState>;
  if (status !== "authenticated") {
    return <EmptyState><Link href="/login">Entre na sua conta</Link> para buscar pessoas.</EmptyState>;
  }
  if (errorCode) {
    return (
      <ApiErrorMessage
        code={errorCode}
        title="Não foi possível buscar pessoas"
        onRetry={() => setReload((current) => current + 1)}
      />
    );
  }
  if (users === null) return <EmptyState>Buscando pessoas...</EmptyState>;
  if (users.length === 0) return <EmptyState>Nenhuma pessoa encontrada para “{query}”.</EmptyState>;

  return (
    <ul className={styles.list}>
      {users.map((user) => (
        <li key={user.id} className={styles.item}>
          <Avatar src={user.avatarUrl} name={user.name} size={48} />
          <div className={styles.info}>
            <Link href={`/profile/${encodeURIComponent(user.username)}`} className={styles.name}>
              {user.name}
            </Link>
            <span className={styles.username}>@{user.username}</span>
          </div>
          <Link href={`/profile/${encodeURIComponent(user.username)}`} className={styles.profileLink}>
            Ver perfil
          </Link>
        </li>
      ))}
    </ul>
  );
}
