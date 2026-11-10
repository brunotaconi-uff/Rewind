"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/icons/icons";
import type { AlbumSummary } from "@/lib/api/music";
import { useFavorites } from "./FavoritesProvider";
import styles from "./FavoriteButton.module.css";

interface FavoriteButtonProps {
  album: AlbumSummary;
}

/** Botão "Favoritar" da tela do álbum (o mesmo favorito do coração dos cards). */
export function FavoriteButton({ album }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [saving, setSaving] = useState(false);
  const favorite = isFavorite(album.externalId);

  const handleClick = async () => {
    setSaving(true);
    await toggleFavorite(album);
    setSaving(false);
  };

  return (
    <button
      type="button"
      className={favorite ? `${styles.button} ${styles.active}` : styles.button}
      aria-pressed={favorite}
      onClick={handleClick}
      disabled={saving}
    >
      <HeartIcon size={16} />
      {favorite ? "Nos favoritos" : "Favoritar"}
    </button>
  );
}
