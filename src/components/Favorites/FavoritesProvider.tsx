"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import type { AlbumSummary } from "@/lib/api/music";
import { addFavorite, getUserFavorites, removeFavorite } from "@/lib/api/user";

interface FavoritesContextValue {
  isFavorite: (externalId: string) => boolean;
  /** Favorita ou desfavorita. Devolve true se salvou; sem login, leva para /login. */
  toggleFavorite: (album: AlbumSummary) => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * Guarda os favoritos do usuário logado para todos os cards do app mostrarem
 * o coração preenchido sem cada um buscar a lista de novo.
 */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session } = useSession();
  const username = session?.user.username;
  const token = session?.accessToken;

  // Guarda de quem é a lista para não mostrar os favoritos de outra conta após trocar de login.
  const [favorites, setFavorites] = useState<{ owner: string; ids: Set<string> } | null>(null);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    getUserFavorites(username)
      .then((albums) => {
        if (!cancelled) setFavorites({ owner: username, ids: new Set(albums.map((album) => album.externalId)) });
      })
      // Sem a lista, os corações só aparecem vazios; favoritar continua funcionando.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [username]);

  const isFavorite = useCallback(
    (externalId: string) => favorites !== null && favorites.owner === username && favorites.ids.has(externalId),
    [favorites, username],
  );

  const setFavorite = useCallback(
    (externalId: string, value: boolean) => {
      if (!username) return;
      setFavorites((current) => {
        const ids = new Set(current?.owner === username ? current.ids : []);
        if (value) ids.add(externalId);
        else ids.delete(externalId);
        return { owner: username, ids };
      });
    },
    [username],
  );

  const toggleFavorite = useCallback(
    async (album: AlbumSummary) => {
      if (!token) {
        router.push("/login");
        return false;
      }

      const wasFavorite = isFavorite(album.externalId);
      // Atualiza na hora e desfaz se o backend recusar.
      setFavorite(album.externalId, !wasFavorite);
      try {
        if (wasFavorite) await removeFavorite(token, album.externalId);
        else await addFavorite(token, album.externalId);
        return true;
      } catch (error) {
        setFavorite(album.externalId, wasFavorite);
        if (error instanceof ApiError && error.code === "UNAUTHORIZED") router.push("/login");
        return false;
      }
    },
    [token, router, isFavorite, setFavorite],
  );

  const value = useMemo(() => ({ isFavorite, toggleFavorite }), [isFavorite, toggleFavorite]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites precisa estar dentro de <FavoritesProvider>.");
  return context;
}
