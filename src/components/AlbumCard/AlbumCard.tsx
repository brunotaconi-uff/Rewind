"use client";

import Link from "next/link";
import { AlbumCover } from "@/components/AlbumCover/AlbumCover";
import { HeartIcon, ListenedIcon, ReviewIcon } from "@/components/icons/icons";
import { StarRating } from "@/components/StarRating/StarRating";
import type { AlbumSummary } from "@/lib/api/music";
import styles from "./AlbumCard.module.css";

interface AlbumCardProps {
  album: AlbumSummary;
  /** Média das avaliações do Rewind; null = sem avaliações. */
  averageRating?: number | null;
  /** Se o álbum está nos favoritos do usuário logado. */
  favorite?: boolean;
  onToggleFavorite?: (album: AlbumSummary) => void;
  onReview: (album: AlbumSummary) => void;
}

export function AlbumCard({ album, averageRating = null, favorite = false, onToggleFavorite, onReview }: AlbumCardProps) {
  const artists = album.artists.map((artist) => artist.name).join(", ");

  return (
    <article className={styles.card}>
      <Link href={`/album/${album.externalId}`} className={styles.link}>
        <AlbumCover src={album.coverUrl} alt={`Capa de ${album.title}`} className={styles.cover} />
        <span className={styles.title} title={album.title}>
          {album.title}
        </span>
        <span className={styles.artist}>{artists}</span>
        <span className={styles.footer}>
          <StarRating value={averageRating} />
          {album.releaseYear !== null && <span className={styles.year}>{album.releaseYear}</span>}
        </span>
      </Link>

      {/* Ouvido ganha ação quando existir a rota no backend. */}
      <div className={styles.actions}>
        <button type="button" className={styles.action} title="Marcar como ouvido" aria-label={`Marcar ${album.title} como ouvido`}>
          <ListenedIcon size={18} />
        </button>
        <button
          type="button"
          className={`${styles.action} ${styles.favorite} ${favorite ? styles.favoriteActive : ""}`}
          title={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          aria-label={favorite ? `Remover ${album.title} dos favoritos` : `Adicionar ${album.title} aos favoritos`}
          aria-pressed={favorite}
          onClick={() => onToggleFavorite?.(album)}
        >
          <HeartIcon size={18} />
        </button>
        <button
          type="button"
          className={styles.action}
          title="Fazer review"
          aria-label={`Fazer review de ${album.title}`}
          onClick={() => onReview(album)}
        >
          <ReviewIcon size={18} />
        </button>
      </div>
    </article>
  );
}

export function AlbumCardSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.skeletonCover} />
      <div className={styles.skeletonLine} />
      <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
    </div>
  );
}
