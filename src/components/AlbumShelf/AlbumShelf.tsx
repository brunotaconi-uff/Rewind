"use client";

import { useState } from "react";
import { AlbumCard, AlbumCardSkeleton } from "@/components/AlbumCard/AlbumCard";
import { useFavorites } from "@/components/Favorites/FavoritesProvider";
import { ReviewModal } from "@/components/ReviewModal/ReviewModal";
import type { AlbumSummary } from "@/lib/api/music";
import styles from "./AlbumShelf.module.css";

interface AlbumShelfProps {
  albums: AlbumSummary[];
  /** Chamado depois que um favorito é salvo (ex.: para recarregar a lista de favoritos). */
  onFavoriteChange?: () => void;
}

/** Grid de álbuns que abre o modal de review e favorita pelos botões do card. */
export function AlbumShelf({ albums, onFavoriteChange }: AlbumShelfProps) {
  const [reviewing, setReviewing] = useState<AlbumSummary | null>(null);
  const { isFavorite, toggleFavorite } = useFavorites();

  const handleToggleFavorite = async (album: AlbumSummary) => {
    if (await toggleFavorite(album)) onFavoriteChange?.();
  };

  return (
    <>
      <ul className={styles.grid}>
        {albums.map((album) => (
          <li key={album.externalId}>
            <AlbumCard
              album={album}
              favorite={isFavorite(album.externalId)}
              onToggleFavorite={handleToggleFavorite}
              onReview={setReviewing}
            />
          </li>
        ))}
      </ul>
      <ReviewModal album={reviewing} onClose={() => setReviewing(null)} />
    </>
  );
}

export function AlbumShelfSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className={styles.grid} aria-label="Carregando álbuns">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <AlbumCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
