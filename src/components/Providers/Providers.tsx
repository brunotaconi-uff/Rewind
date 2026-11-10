"use client";

import { useEffect } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { FavoritesProvider } from "@/components/Favorites/FavoritesProvider";


/** Encerra a sessão quando o token do backend vence (ver callback jwt no route.ts do NextAuth). */
function SessionWatcher() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === "SessionExpired") {
      signOut({ callbackUrl: "/login" });
    }
  }, [session?.error]);

  return null;
}

/** Contextos de cliente usados no app inteiro: sessão do NextAuth e favoritos do usuário logado. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionWatcher />
      <FavoritesProvider>{children}</FavoritesProvider>
    </SessionProvider>
  );
}

