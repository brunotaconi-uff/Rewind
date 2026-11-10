import Link from "next/link";
import { AlbumCover } from "@/components/AlbumCover/AlbumCover";
import { StarRating } from "@/components/StarRating/StarRating";
import type { FeedItem } from "@/lib/api/user";
import { formatRelativeDate } from "@/lib/format";
import styles from "./ProfileFeed.module.css";

interface ProfileFeedProps {
  items: FeedItem[];
}

/** Notas e resenhas do usuário, uma por cartão, com o álbum avaliado. */
export function ProfileFeed({ items }: ProfileFeedProps) {
  return (
    <ul className={styles.list}>
      {items.map(({ id, rating, content, createdAt, album }) => {
        const albumHref = `/album/${album.externalId}`;
        const artists = album.artists.map((artist) => artist.name).join(", ");

        return (
          <li key={id} className={styles.card}>
            <Link href={albumHref} className={styles.cover} tabIndex={-1} aria-hidden="true">
              <AlbumCover src={album.coverUrl} alt="" />
            </Link>

            <div className={styles.body}>
              <div className={styles.header}>
                <div className={styles.album}>
                  <Link href={albumHref} className={styles.title}>
                    {album.title}
                  </Link>
                  <span className={styles.details}>
                    {artists}
                    {album.releaseYear !== null && <> · {album.releaseYear}</>}
                  </span>
                </div>
                <time dateTime={createdAt} className={styles.date}>
                  {formatRelativeDate(createdAt)}
                </time>
              </div>

              <StarRating value={rating} />
              {content && <p className={styles.content}>{content}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
