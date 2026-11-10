import { AlbumCover } from "@/components/AlbumCover/AlbumCover";
import { FavoriteButton } from "@/components/Favorites/FavoriteButton";
import { ReviewButton } from "@/components/ReviewButton/ReviewButton";
import { StarRating } from "@/components/StarRating/StarRating";
import type { Album } from "@/lib/api/music";
import type { AlbumRating } from "@/lib/api/review";
import styles from "./RatingCard.module.css";

interface RatingCardProps {
  album: Album;
  /** null quando não foi possível carregar a média. */
  rating: AlbumRating | null;
}

function formatRating(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function RatingCard({ album, rating }: RatingCardProps) {
  const average = rating?.averageRating ?? null;
  const count = rating?.ratingsCount ?? 0;

  return (
    <section className={styles.card}>
      <div className={styles.album}>
        <div className={styles.cover}>
          <AlbumCover src={album.coverUrl} alt={`Capa do álbum ${album.title}`} />
        </div>
        <div className={styles.albumInfo}>
          <p className={styles.label}>Álbum</p>
          <p className={styles.albumTitle} title={album.title}>
            {album.title}
          </p>
        </div>
      </div>

      <div className={styles.rating}>
        <p className={styles.ratingLabel}>Média da comunidade</p>

        {rating === null ? (
          <p className={styles.unavailable}>Média indisponível no momento</p>
        ) : (
          <>
            {/* Sem média, o StarRating mostra "Sem avaliações". */}
            <StarRating value={average} size={22} />
            {average !== null && (
              <p className={styles.summary}>
                <strong>{formatRating(average)}</strong> · {count} {count === 1 ? "avaliação" : "avaliações"}
              </p>
            )}
          </>
        )}
      </div>

      <div className={styles.actions}>
        <ReviewButton album={album} />
        <FavoriteButton album={album} />
      </div>
    </section>
  );
}