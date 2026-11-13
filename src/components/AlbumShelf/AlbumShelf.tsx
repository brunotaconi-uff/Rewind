"use client";

import { useEffect, useState } from "react";
import { AlbumCard, AlbumCardSkeleton } from "@/components/AlbumCard/AlbumCard";
import { useFavorites } from "@/components/Favorites/FavoritesProvider";
import { ReviewModal } from "@/components/ReviewModal/ReviewModal";
import type { AlbumSummary } from "@/lib/api/music";
import { getAlbumRatings, type AlbumRating, type AlbumRatingsMap } from "@/lib/api/review";
import styles from "./AlbumShelf.module.css";

interface AlbumShelfProps {
  albums: AlbumSummary[];
  /** Médias já conhecidas (ex.: populares). Sem isso, a estante busca as médias sozinha. */
  ratings?: AlbumRatingsMap;
  /** Chamado depois que um favorito é salvo (ex.: para recarregar a lista de favoritos). */
  onFavoriteChange?: () => void;
}

/** Grid de álbuns que abre o modal de avaliação e favorita pelos botões do card. */
export function AlbumShelf({ albums, ratings: initialRatings, onFavoriteChange }: AlbumShelfProps) {
  const [reviewing, setReviewing] = useState<AlbumSummary | null>(null);
  const [ratings, setRatings] = useState<AlbumRatingsMap>(initialRatings ?? {});
  const { isFavorite, toggleFavorite } = useFavorites();
  const idsKey = albums.map((album) => album.externalId).join(",");

  // Médias do Rewind para os cards. Se falhar, os cards só ficam "Sem avaliações".
  useEffect(() => {
    if (initialRatings || !idsKey) return;
    let cancelled = false;
    getAlbumRatings(idsKey.split(","))
      .then((loaded) => {
        if (!cancelled) setRatings(loaded);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [idsKey, initialRatings]);

  const handleToggleFavorite = async (album: AlbumSummary) => {
    if (await toggleFavorite(album)) onFavoriteChange?.();
  };

  // Depois de salvar ou apagar uma avaliação, o card já mostra a média nova.
  const handleRatingChange = (rating: AlbumRating) => {
    setRatings((current) => ({
      ...current,
      [rating.albumId]: { averageRating: rating.averageRating, ratingsCount: rating.ratingsCount },
    }));
  };

  return (
    <>
      <ul className={styles.grid}>
        {albums.map((album) => (
          <li key={album.externalId}>
            <AlbumCard
              album={album}
              averageRating={ratings[album.externalId]?.averageRating ?? null}
              ratingsCount={ratings[album.externalId]?.ratingsCount ?? 0}
              favorite={isFavorite(album.externalId)}
              onToggleFavorite={handleToggleFavorite}
              onReview={setReviewing}
            />
          </li>
        ))}
      </ul>
      <ReviewModal album={reviewing} onClose={() => setReviewing(null)} onRatingChange={handleRatingChange} />
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
