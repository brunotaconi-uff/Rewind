"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { loginHref } from "@/lib/callbackUrl";
import { useEffect, useState } from "react";
import { ApiError, getErrorCode, type ApiErrorCode } from "@/lib/api/client";
import { followUser, getFollowStatus, unfollowUser, type UserProfile } from "@/lib/api/user";
import { ApiErrorMessage } from "@/components/ApiErrorMessage/ApiErrorMessage";
import styles from "./FollowButton.module.css";

export function FollowButton({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [followResult, setFollowResult] = useState<{ key: string; following: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ key: string; code: ApiErrorCode } | null>(null);
  const [reload, setReload] = useState(0);
  const token = session?.accessToken;
  const isSelf = session?.user.id === profile.id;
  const key = `${profile.id}:${token ?? ""}:${reload}`;
  const following = followResult?.key === key ? followResult.following : null;
  const errorCode = error?.key === key ? error.code : null;

  useEffect(() => {
    if (status !== "authenticated" || !token || isSelf) return;
    let cancelled = false;
    getFollowStatus(token, profile.id)
      .then((value) => {
        if (!cancelled) setFollowResult({ key, following: value });
      })
      .catch((error: unknown) => {
        if (!cancelled) setError({ key, code: getErrorCode(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [status, token, isSelf, profile.id, key]);

  if (isSelf) return null;

  const handleClick = async () => {
    if (!token) {
      router.push(loginHref(pathname));
      return;
    }
    if (following === null || pending) return;

    setPending(true);
    try {
      if (following) await unfollowUser(token, profile.id);
      else await followUser(token, profile.id);
      setFollowResult({ key, following: !following });
      router.refresh();
    } catch (error) {
      setError({ key, code: getErrorCode(error) });
      if (error instanceof ApiError && error.code === "UNAUTHORIZED") router.push(loginHref(pathname));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={following ? `${styles.button} ${styles.following}` : styles.button}
        onClick={handleClick}
        disabled={status === "loading" || (status === "authenticated" && following === null) || pending}
      >
        {pending ? "Salvando..." : following ? "Deixar de seguir" : "Seguir"}
      </button>
      {errorCode && (
        <ApiErrorMessage
          code={errorCode}
          title="Não foi possível atualizar o seguimento"
          onRetry={() => setReload((current) => current + 1)}
        />
      )}
    </div>
  );
}
