"use client";

import { SessionProvider } from "next-auth/react";
import { FavoritesProvider } from "@/components/Favorites/FavoritesProvider";

/** Contextos de cliente usados no app inteiro: sessão do NextAuth e favoritos do usuário logado. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FavoritesProvider>{children}</FavoritesProvider>
    </SessionProvider>
  );
}
