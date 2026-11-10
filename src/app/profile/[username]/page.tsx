import Link from "next/link";
import { ApiErrorMessage } from "@/components/ApiErrorMessage/ApiErrorMessage";
import { FavoriteAlbums } from "@/components/Favorites/FavoriteAlbums";
import { EmptyState, Section } from "@/components/Section/Section";
import { getErrorCode } from "@/lib/api/client";
import { getUserFavorites } from "@/lib/api/user";
import styles from "./page.module.css";

// Uma linha do grid de álbuns; o resto fica na aba Favoritos.
const HIGHLIGHTED_FAVORITES = 6;

interface RootProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

async function FavoritesHighlight({ username }: { username: string }) {
  let albums;
  try {
    albums = await getUserFavorites(username);
  } catch (error) {
    return <ApiErrorMessage code={getErrorCode(error)} title="Não foi possível carregar os favoritos" />;
  }

  if (albums.length === 0) {
    return <EmptyState>@{username} ainda não escolheu álbuns favoritos.</EmptyState>;
  }

  return (
    <>
      <FavoriteAlbums albums={albums.slice(0, HIGHLIGHTED_FAVORITES)} />
      {albums.length > HIGHLIGHTED_FAVORITES && (
        <Link href={`/profile/${encodeURIComponent(username)}/favorites`} className={styles.seeAll}>
          Ver todos os {albums.length} favoritos
        </Link>
      )}
    </>
  );
}

export default async function RootProfilePage({ params }: RootProfilePageProps) {
  const username = decodeURIComponent((await params).username);

  return (
    <Section title="Favoritos">
      <FavoritesHighlight username={username} />
    </Section>
  );
}
