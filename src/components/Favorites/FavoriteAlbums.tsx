"use client";

import { useRouter } from "next/navigation";
import { AlbumShelf } from "@/components/AlbumShelf/AlbumShelf";
import type { AlbumSummary } from "@/lib/api/music";

interface FavoriteAlbumsProps {
  albums: AlbumSummary[];
}

/** Favoritos do perfil: ao desfavoritar, a lista e os dados do perfil recarregam na hora. */
export function FavoriteAlbums({ albums }: FavoriteAlbumsProps) {
  const router = useRouter();
  return <AlbumShelf albums={albums} onFavoriteChange={() => router.refresh()} />;
}
